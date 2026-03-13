import { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { CheckCircle, AlertTriangle, WifiOff } from "lucide-react-native";
import { useSession } from "./contexts/AuthContext";
import { useEvents } from "./contexts/EventsContext";
import { invitesApi, InvitePreview } from "./api/invites";
import { setPendingInviteCode } from "./utils/pendingInvite";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { VStack } from "@/components/ui/vstack";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

type JoinState =
  | "loading"
  | "preview"
  | "joining"
  | "success"
  | "already-joined"
  | "invalid"
  | "error";

const HERO_COLORS = [
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
  "#f43f5e", // rose-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
];

export default function JoinScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { session, user } = useSession();
  const { state: eventsState, refreshEvents } = useEvents();
  const events = eventsState.events;

  const [joinState, setJoinState] = useState<JoinState>("loading");
  const [previewData, setPreviewData] = useState<InvitePreview | null>(null);
  const [joinedEventId, setJoinedEventId] = useState<number | null>(null);
  const [networkAttempts, setNetworkAttempts] = useState(0);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const heroColor = previewData
    ? HERO_COLORS[previewData.eventId % HERO_COLORS.length]
    : HERO_COLORS[0];

  // On mount (or retry): validate the invite token
  useEffect(() => {
    if (!token) {
      setJoinState("invalid");
      return;
    }
    setJoinState("loading");
    invitesApi
      .validate(token)
      .then((data) => {
        setPreviewData(data);
        setJoinState("preview");
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setJoinState("invalid");
        } else {
          setJoinState("error");
        }
      });
  }, [token, retryCount]);

  // Already-joined check: runs when previewData + auth state are both available
  useEffect(() => {
    if (previewData && session && user) {
      const existingEvent = events.find(
        (e) => e.id === String(previewData.eventId)
      );
      if (existingEvent && existingEvent.people?.includes(user.name)) {
        setJoinState("already-joined");
      }
    }
  }, [previewData, session, user, events]);

  // Auto-join when session becomes truthy after redirect from sign-in
  useEffect(() => {
    if (session && previewData && joinState === "preview") {
      handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, previewData]);

  // Navigate to event details 2 seconds after successful join
  useEffect(() => {
    if (joinState === "success" && joinedEventId !== null) {
      const timer = setTimeout(() => {
        router.push(`/event-details?id=${joinedEventId}` as never);
      }, 2000);
      return () => clearTimeout(timer); // cleanup prevents memory leak
    }
  }, [joinState, joinedEventId]);

  const handleJoin = async () => {
    if (joinState === "joining") return; // guard against double-call
    if (!session || !user) {
      setPendingInviteCode(token);
      router.push("/sign-in" as never);
      return;
    }
    setJoinState("joining");
    setInlineError(null);
    try {
      const result = await invitesApi.accept(
        token,
        user.name,
        user.email ?? undefined
      );
      setJoinedEventId(result.eventId);
      setJoinState("success");
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr?.response?.status === 404) {
        setJoinState("invalid");
      } else {
        const newAttempts = networkAttempts + 1;
        setNetworkAttempts(newAttempts);
        setInlineError("Failed to join event. Please try again.");
        setJoinState("preview");
      }
    }
  };

  const renderContent = () => {
    switch (joinState) {
      case "loading":
        return (
          <View className="flex-1 p-4 pt-16">
            <Skeleton className="h-48 rounded-2xl mb-6" />
            <SkeletonText _lines={1} className="h-8 w-3/4 mb-3" />
            <SkeletonText _lines={2} className="h-4 mb-6" />
            <Skeleton className="h-14 rounded-2xl" />
          </View>
        );

      case "preview":
        return (
          <View className="flex-1">
            {/* Hero */}
            <View
              className="h-48 mx-4 mt-16 rounded-2xl items-center justify-center"
              style={{ backgroundColor: heroColor }}
            >
              <Text className="text-white text-3xl font-bold text-center px-4">
                {previewData?.eventName}
              </Text>
            </View>
            {/* Details */}
            <View className="px-4 mt-6">
              <Heading size="2xl" className="text-typography-900 font-bold mb-2">
                {previewData?.eventName}
              </Heading>
              {previewData?.organizerName && (
                <Text className="text-typography-500 mb-1">
                  Hosted by {previewData.organizerName}
                </Text>
              )}
              {previewData?.participantCount != null &&
                previewData.participantCount > 0 && (
                  <Text className="text-typography-500 mb-1">
                    {previewData.participantCount} participants
                  </Text>
                )}
              {previewData?.eventDate && (
                <Text className="text-typography-500 mb-4">
                  {new Date(previewData.eventDate).toLocaleDateString()}
                </Text>
              )}
              {/* Join button area */}
              {networkAttempts < 3 ? (
                <>
                  <Button
                    size="xl"
                    action="primary"
                    className="w-full rounded-2xl mt-2"
                    onPress={handleJoin}
                  >
                    <ButtonText className="font-semibold">
                      {session ? "Join Event" : "Log in to Join"}
                    </ButtonText>
                  </Button>
                  {inlineError && (
                    <Text className="text-error-500 text-sm mt-2 text-center">
                      {inlineError}
                    </Text>
                  )}
                </>
              ) : (
                <VStack className="items-center mt-6 gap-3">
                  <WifiOff size={64} color="#9ca3af" />
                  <Heading size="lg" className="text-typography-900 text-center">
                    Something went wrong
                  </Heading>
                  <Text className="text-typography-500 text-center">
                    Please try again later
                  </Text>
                </VStack>
              )}
            </View>
          </View>
        );

      case "joining":
        return (
          <View className="flex-1">
            {/* Preview content underneath */}
            <View
              className="h-48 mx-4 mt-16 rounded-2xl items-center justify-center"
              style={{ backgroundColor: heroColor }}
            >
              <Text className="text-white text-3xl font-bold text-center px-4">
                {previewData?.eventName}
              </Text>
            </View>
            {/* Full-screen overlay */}
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: "rgba(0,0,0,0.5)",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 50,
                },
              ]}
            >
              <Spinner size="large" className="text-white" />
              <Text className="text-white mt-4 text-lg">Joining event...</Text>
            </View>
          </View>
        );

      case "success":
        return (
          <View className="flex-1 items-center justify-center px-8 gap-4">
            <CheckCircle size={64} color="#10b981" />
            <Heading size="2xl" className="text-typography-900 font-bold text-center">
              You're in!
            </Heading>
            <Text className="text-typography-500 text-center">
              Taking you to {previewData?.eventName}...
            </Text>
          </View>
        );

      case "already-joined":
        return (
          <View className="flex-1">
            <View
              className="h-48 mx-4 mt-16 rounded-2xl items-center justify-center"
              style={{ backgroundColor: heroColor }}
            >
              <Text className="text-white text-3xl font-bold text-center px-4">
                {previewData?.eventName}
              </Text>
            </View>
            <View className="px-4 mt-6 items-center">
              <Heading
                size="xl"
                className="text-typography-900 font-bold text-center mb-2"
              >
                You're already a member
              </Heading>
              <Text className="text-typography-500 text-center mb-6">
                You've already joined {previewData?.eventName}
              </Text>
              <Button
                size="xl"
                action="primary"
                className="w-full rounded-2xl"
                onPress={() =>
                  router.replace(
                    `/event-details?id=${previewData?.eventId}` as never
                  )
                }
              >
                <ButtonText className="font-semibold">View Event</ButtonText>
              </Button>
            </View>
          </View>
        );

      case "invalid":
        return (
          <View className="flex-1 items-center justify-center px-8 gap-4">
            <AlertTriangle size={64} color="#f59e0b" />
            <Heading size="xl" className="text-typography-900 font-bold text-center">
              This invite is no longer valid
            </Heading>
            <Text className="text-typography-500 text-center">
              The invite link may have expired or already been used.
            </Text>
            <Button
              size="xl"
              action="primary"
              className="w-full rounded-2xl mt-4"
              onPress={() => router.replace("/(tabs)" as never)}
            >
              <ButtonText className="font-semibold">Go Home</ButtonText>
            </Button>
          </View>
        );

      case "error":
        return (
          <View className="flex-1 items-center justify-center px-8 gap-4">
            <AlertTriangle size={64} color="#ef4444" />
            <Heading size="xl" className="text-typography-900 font-bold text-center">
              Something went wrong
            </Heading>
            <Text className="text-typography-500 text-center">
              We couldn't load this invite. Please check your connection and try
              again.
            </Text>
            <Button
              size="xl"
              action="primary"
              className="w-full rounded-2xl mt-4"
              onPress={() => {
                setJoinState("loading");
                setPreviewData(null);
                setRetryCount((c) => c + 1);
              }}
            >
              <ButtonText className="font-semibold">Try Again</ButtonText>
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="w-full rounded-2xl"
              onPress={() => router.replace("/(tabs)" as never)}
            >
              <ButtonText>Go Home</ButtonText>
            </Button>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-background-0">
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      {renderContent()}
    </View>
  );
}
