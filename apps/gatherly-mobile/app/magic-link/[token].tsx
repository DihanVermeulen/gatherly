import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { CheckCircle, AlertTriangle } from "lucide-react-native";
import { authApi } from "../api/auth";
import { useSession } from "../contexts/AuthContext";
import { useEvents } from "../contexts/EventsContext";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VStack } from "@/components/ui/vstack";
import { Input, InputField } from "@/components/ui/input";

type RedeemState = "loading" | "name-prompt" | "success" | "invalid" | "error";

export default function MagicLinkScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  console.log('[magic-link screen] token from params:', token);
  const router = useRouter();
  const { signIn, user } = useSession();
  const { refreshEvents } = useEvents();

  const [state, setState] = useState<RedeemState>("loading");
  const [eventId, setEventId] = useState<number | null>(null);
  const [eventName, setEventName] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState("");
  const [isSubmittingName, setIsSubmittingName] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  // redeemMagicLink returns user-scoped (existing account) or participant-scoped (no account) response
  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }

    authApi
      .redeemMagicLink(token, user?.email)
      .then(async (response) => {
        const isUserScoped = "id" in response.user && !("participantId" in response.user);
        setEventId(response.user.eventId ?? null);
        setEventName(response.user.eventName ?? null);
        if (isUserScoped) {
          await signIn(response.accessToken, response.user);
          await refreshEvents();
          setState("success");
        } else {
          // Participant-scoped: need name before completing sign-in
          setPendingToken(token);
          setState("name-prompt");
        }
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        if (status === 401 || status === 400) {
          setState("invalid");
        } else {
          setState("error");
        }
      });
  }, [token]);

  async function handleNameSubmit() {
    if (!participantName.trim() || !pendingToken) return;
    setIsSubmittingName(true);
    try {
      const response = await authApi.redeemMagicLink(pendingToken, undefined, participantName.trim());
      await signIn(response.accessToken, response.user);
      await refreshEvents();
      setEventId(response.user.eventId ?? null);
      setEventName(response.user.eventName ?? null);
      setState("success");
    } catch {
      setState("error");
    } finally {
      setIsSubmittingName(false);
    }
  }

  // Navigate to event details 2 seconds after successful sign-in
  useEffect(() => {
    if (state === "success" && eventId !== null) {
      const timer = setTimeout(() => {
        router.push(`/event-details?id=${eventId}` as never);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, eventId]);

  return (
    <View className="flex-1 bg-background-0">
      <Stack.Screen options={{ headerShown: false }} />

      {state === "loading" && (
        <View className="flex-1 items-center justify-center gap-4">
          <Spinner size="large" />
          <Text className="text-typography-500 text-base">
            Signing you in...
          </Text>
        </View>
      )}

      {state === "name-prompt" && (
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
              <Spinner size="small" />
            ) : (
              <ButtonText className="font-semibold">Join Event</ButtonText>
            )}
          </Button>
        </View>
      )}

      {state === "success" && (
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
      )}

      {state === "invalid" && (
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <AlertTriangle size={64} color="#f59e0b" />
          <VStack className="items-center gap-2">
            <Heading size="xl" className="text-typography-900 font-bold text-center">
              This link is no longer valid
            </Heading>
            <Text className="text-typography-500 text-center">
              The magic link may have expired. Ask the organizer to resend your
              invite.
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
      )}

      {state === "error" && (
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
            onPress={() => router.replace("/sign-in" as never)}
          >
            <ButtonText className="font-semibold">Sign In Instead</ButtonText>
          </Button>
        </View>
      )}
    </View>
  );
}
