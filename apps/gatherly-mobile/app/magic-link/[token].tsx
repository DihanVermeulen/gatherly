import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { CheckCircle, AlertTriangle } from "lucide-react-native";
import { authApi } from "../api/auth";
import { useSession } from "../contexts/AuthContext";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VStack } from "@/components/ui/vstack";

type RedeemState = "loading" | "success" | "invalid" | "error";

export default function MagicLinkScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  console.log('[magic-link screen] token from params:', token);
  const router = useRouter();
  const { signIn } = useSession();

  const [state, setState] = useState<RedeemState>("loading");
  const [eventId, setEventId] = useState<number | null>(null);
  const [eventName, setEventName] = useState<string | null>(null);

  // redeemMagicLink returns user-scoped (existing account) or participant-scoped (no account) response
  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }

    authApi
      .redeemMagicLink(token)
      .then(async (response) => {
        await signIn(response.accessToken, response.user);
        setEventId(response.user.eventId ?? null);
        setEventName(response.user.eventName ?? null);
        setState("success");
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

  // Navigate to event details 2 seconds after successful sign-in
  useEffect(() => {
    if (state === "success" && eventId !== null) {
      const timer = setTimeout(() => {
        router.replace(`/event-details?id=${eventId}` as never);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, eventId]);

  return (
    <View className="flex-1 bg-background-0">
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      {state === "loading" && (
        <View className="flex-1 items-center justify-center gap-4">
          <Spinner size="large" />
          <Text className="text-typography-500 text-base">
            Signing you in...
          </Text>
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
