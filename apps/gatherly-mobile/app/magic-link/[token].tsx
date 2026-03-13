import { useEffect, useState } from "react";
import { View, TextInput, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { CheckCircle, AlertTriangle } from "lucide-react-native";
import { authApi } from "../api/auth";
import { useSession } from "../contexts/AuthContext";
import { useEvents } from "../contexts/EventsContext";
import { setPendingMagicToken } from "../utils/pendingInvite";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VStack } from "@/components/ui/vstack";
import { Input, InputField } from "@/components/ui/input";

type MagicLinkState =
  | "loading"         // calling /lookup
  | "preview"         // show event info + choice
  | "name-prompt"     // without-account path: full-screen name input
  | "joining"         // calling /redeem
  | "success"         // auto-dismiss 1.5s then event-details
  | "already-joined"  // user already a participant
  | "invalid"         // token expired/not-found
  | "error";          // network or unexpected error

const HERO_COLORS = [
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
  "#f43f5e", // rose-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
];

export default function MagicLinkScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { signIn, session, user } = useSession();
  const { state: eventsState } = useEvents();
  const events = eventsState.events;

  const [state, setState] = useState<MagicLinkState>("loading");
  const [eventId, setEventId] = useState<number | null>(null);
  const [eventName, setEventName] = useState<string | null>(null);
  const [organizerName, setOrganizerName] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState("");
  const [isSubmittingName, setIsSubmittingName] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const heroColor = eventId
    ? HERO_COLORS[eventId % HERO_COLORS.length]
    : HERO_COLORS[0];

  // On mount (or retry): call /lookup to get event preview without creating any participant record
  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    setState("loading");

    authApi
      .lookupMagicLink(token)
      .then((preview) => {
        setEventId(preview.eventId);
        setEventName(preview.eventName);
        setOrganizerName(preview.organizerName);
        setParticipantCount(preview.participantCount);
        setEventDate(preview.eventDate);

        // Already-joined check: if user is logged in, see if they're already in this event
        if (session && user) {
          const existingEvent = events.find(
            (e) => e.id === String(preview.eventId)
          );
          if (existingEvent && existingEvent.people?.includes(user.name)) {
            setState("already-joined");
            return;
          }
        }

        setState("preview");
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 400 || status === 404) {
          setState("invalid");
        } else {
          setState("error");
        }
      });
  }, [token, retryCount]);

  // Auto-join when session becomes truthy after redirect from sign-in
  // (user went through "Join with account" flow and returned here)
  useEffect(() => {
    if (session && state === "preview") {
      handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Navigate to event details 1.5 seconds after success
  useEffect(() => {
    if (state === "success" && eventId !== null) {
      const timer = setTimeout(() => {
        router.push(`/event-details?id=${eventId}` as never);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state, eventId]);

  // Handle join for logged-in users
  async function handleJoin() {
    if (state === "joining") return; // double-call guard
    setState("joining");
    try {
      const response = await authApi.redeemMagicLink(token, user?.email);
      await signIn(response.accessToken, response.user);
      const resolvedEventId = response.user.eventId ?? eventId;
      if (resolvedEventId) setEventId(resolvedEventId);
      if (response.user.eventName) setEventName(response.user.eventName);
      setState("success");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 400) {
        setState("invalid");
      } else {
        setState("error");
      }
    }
  }

  // Handle "Join with account" — store magic token and navigate to sign-in
  function handleJoinWithAccount() {
    setPendingMagicToken(token);
    router.push("/sign-in" as never);
  }

  // Handle name submission for "Continue without account" path
  async function handleNameSubmit() {
    if (!participantName.trim()) return;
    setIsSubmittingName(true);
    try {
      const response = await authApi.redeemMagicLink(token, undefined, participantName.trim());
      await signIn(response.accessToken, response.user);
      const resolvedEventId = response.user.eventId ?? eventId;
      if (resolvedEventId) setEventId(resolvedEventId);
      if (response.user.eventName) setEventName(response.user.eventName);
      setState("success");
    } catch {
      setState("error");
    } finally {
      setIsSubmittingName(false);
    }
  }

  const renderContent = () => {
    switch (state) {
      case "loading":
        return (
          <View className="flex-1 items-center justify-center gap-4">
            <Spinner size="large" />
            <Text className="text-typography-500 text-base">
              Loading event...
            </Text>
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
                {eventName}
              </Text>
            </View>
            {/* Details */}
            <View className="px-4 mt-6">
              <Heading size="2xl" className="text-typography-900 font-bold mb-2">
                {eventName}
              </Heading>
              {organizerName && (
                <Text className="text-typography-500 mb-1">
                  Hosted by {organizerName}
                </Text>
              )}
              {participantCount > 0 && (
                <Text className="text-typography-500 mb-1">
                  {participantCount} participants
                </Text>
              )}
              {eventDate && (
                <Text className="text-typography-500 mb-4">
                  {new Date(eventDate).toLocaleDateString()}
                </Text>
              )}

              {/* Logged-in: single Join button */}
              {session ? (
                <Button
                  size="xl"
                  action="primary"
                  className="w-full rounded-2xl mt-2"
                  onPress={handleJoin}
                >
                  <ButtonText className="font-semibold">Join Event</ButtonText>
                </Button>
              ) : (
                /* Logged-out: two options */
                <VStack className="gap-3 mt-2">
                  <Button
                    size="xl"
                    action="primary"
                    className="w-full rounded-2xl"
                    onPress={handleJoinWithAccount}
                  >
                    <ButtonText className="font-semibold">
                      Join with account
                    </ButtonText>
                  </Button>
                  <Button
                    size="xl"
                    variant="outline"
                    className="w-full rounded-2xl"
                    onPress={() => setState("name-prompt")}
                  >
                    <ButtonText>Continue without account</ButtonText>
                  </Button>
                </VStack>
              )}
            </View>
          </View>
        );

      case "joining":
        return (
          <View className="flex-1">
            {/* Hero stays visible underneath */}
            <View
              className="h-48 mx-4 mt-16 rounded-2xl items-center justify-center"
              style={{ backgroundColor: heroColor }}
            >
              <Text className="text-white text-3xl font-bold text-center px-4">
                {eventName}
              </Text>
            </View>
            <View className="flex-1 items-center justify-center gap-4">
              <Spinner size="large" />
              <Text className="text-typography-500 text-base">
                Joining event...
              </Text>
            </View>
          </View>
        );

      case "name-prompt":
        return (
          <View className="flex-1 items-center justify-center px-8 gap-6">
            <Heading size="2xl" className="text-typography-900 font-bold text-center">
              What's your name?
            </Heading>
            <Text className="text-typography-500 text-center">
              {eventName
                ? `You're joining ${eventName}. How should we introduce you?`
                : "How should we introduce you to the group?"}
            </Text>
            <Input size="xl" className="w-full">
              <InputField
                placeholder="Your name"
                value={participantName}
                onChangeText={setParticipantName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleNameSubmit}
              />
            </Input>
            <Button
              size="xl"
              action="primary"
              className="w-full rounded-2xl"
              onPress={handleNameSubmit}
              isDisabled={!participantName.trim() || isSubmittingName}
            >
              {isSubmittingName ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <ButtonText className="font-semibold">Join Event</ButtonText>
              )}
            </Button>
          </View>
        );

      case "success":
        return (
          <View className="flex-1 items-center justify-center px-8 gap-4">
            <CheckCircle size={64} color="#10b981" />
            <Heading size="2xl" className="text-typography-900 font-bold text-center">
              Welcome!
            </Heading>
            <Text className="text-typography-500 text-center">
              {eventName
                ? `Taking you to ${eventName}...`
                : "Taking you to your event..."}
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
                {eventName}
              </Text>
            </View>
            <View className="px-4 mt-6 items-center">
              <Heading size="xl" className="text-typography-900 font-bold text-center mb-2">
                You're already a member
              </Heading>
              <Text className="text-typography-500 text-center mb-6">
                You've already joined {eventName}
              </Text>
              <Button
                size="xl"
                action="primary"
                className="w-full rounded-2xl"
                onPress={() =>
                  router.push(`/event-details?id=${eventId}` as never)
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
            <VStack className="items-center gap-2">
              <Heading size="xl" className="text-typography-900 font-bold text-center">
                This link is no longer valid
              </Heading>
              <Text className="text-typography-500 text-center">
                The magic link may have expired. Ask the organizer to resend
                your invite.
              </Text>
            </VStack>
            <Button
              size="xl"
              action="primary"
              className="w-full rounded-2xl mt-4"
              onPress={() => router.replace("/sign-in" as never)}
            >
              <ButtonText className="font-semibold">Sign In</ButtonText>
            </Button>
          </View>
        );

      case "error":
        return (
          <View className="flex-1 items-center justify-center px-8 gap-4">
            <AlertTriangle size={64} color="#ef4444" />
            <VStack className="items-center gap-2">
              <Heading size="xl" className="text-typography-900 font-bold text-center">
                Something went wrong
              </Heading>
              <Text className="text-typography-500 text-center">
                Please check your connection and try opening the link again.
              </Text>
            </VStack>
            <Button
              size="xl"
              action="primary"
              className="w-full rounded-2xl mt-4"
              onPress={() => {
                setState("loading");
                setRetryCount((c) => c + 1);
              }}
            >
              <ButtonText className="font-semibold">Try Again</ButtonText>
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="w-full rounded-2xl"
              onPress={() => router.replace("/sign-in" as never)}
            >
              <ButtonText>Sign In Instead</ButtonText>
            </Button>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-background-0">
      <Stack.Screen options={{ headerShown: false }} />
      {renderContent()}
    </View>
  );
}
