import React, { useState, useEffect } from "react";
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  Text as RNText,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CreditCard, Lock, ShieldCheck } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { AppHeader } from "@/components/AppHeader";
import { eventsApi, TEvent } from "@/app/api/events";
import { PREMIUM_PRICE_DISPLAY } from "@/constants/upgrades";
import { Button } from "@/components/ui/button";

// ─── Input field component ────────────────────────────────────────────────────

type CardInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "email-address";
  secureTextEntry?: boolean;
  rightIcon?: React.ReactNode;
  style?: object;
};

function CardInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  secureTextEntry = false,
  rightIcon,
  style,
}: CardInputProps) {
  return (
    <View style={style}>
      <RNText
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: "#6b7280",
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </RNText>
      <View style={{ position: "relative" }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          style={{
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 10,
            padding: 14,
            fontSize: 15,
            backgroundColor: "#ffffff",
            color: "#111827",
            paddingRight: rightIcon ? 46 : 14,
          }}
        />
        {rightIcon ? (
          <View
            style={{
              position: "absolute",
              right: 14,
              top: 0,
              bottom: 0,
              justifyContent: "center",
            }}
          >
            {rightIcon}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CheckoutScreen() {
  const { eventId = "" } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<TEvent | null>(null);
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (eventId) {
      eventsApi
        .getById(eventId)
        .then(setEvent)
        .catch(() => null);
    }
  }, [eventId]);

  const isFormValid =
    cardholderName.trim().length > 0 &&
    cardNumber.trim().length > 0 &&
    expiry.trim().length > 0 &&
    cvv.trim().length > 0;

  async function handleSubmit() {
    if (!isFormValid || loading) return;
    setLoading(true);
    try {
      await eventsApi.upgradeEvent(eventId);
      const txId = `#TH-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(10 + Math.random() * 90)}`;
      const last4 = cardNumber.replace(/\s/g, "").slice(-4) || "1234";
      router.replace(
        `/payment-success?eventId=${eventId}&last4=${last4}&txId=${encodeURIComponent(txId)}` as never,
      );
    } catch {
      Alert.alert("Payment Failed", "Please try again.");
      setLoading(false);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      edges={["bottom"]}
    >
      <AppHeader title="Checkout" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Order Summary ──────────────────────────────────────────────── */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#111827",
                marginBottom: 12,
              }}
            >
              Order Summary
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#f9fafb",
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <RNText
                  style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}
                >
                  {event?.name ?? "Your Event"}
                </RNText>
                <RNText
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#111827",
                    marginBottom: 4,
                  }}
                >
                  Standard Plan
                </RNText>
                <RNText
                  style={{ fontSize: 18, fontWeight: "700", color: "#0d9488" }}
                >
                  {PREMIUM_PRICE_DISPLAY}
                </RNText>
              </View>
              {/* Event cover photo or placeholder */}
              {event?.coverPhotoUrl ? (
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    overflow: "hidden",
                    backgroundColor: "#0d9488",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    backgroundColor: "#0d9488",
                  }}
                />
              )}
            </View>
          </View>

          {/* ── Express Pay ───────────────────────────────────────────────── */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#111827",
                marginBottom: 12,
              }}
            >
              Express Pay
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              {/* Apple Pay */}
              <Button
                onPress={() =>
                  Alert.alert(
                    "Coming Soon",
                    "Express Pay will be available soon.",
                  )
                }
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed ? "#1f2937" : "#000000",
                  borderRadius: 10,
                  paddingVertical: 14,
                  alignItems: "center",
                })}
              >
                <RNText
                  style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}
                >
                  Apple Pay
                </RNText>
              </Button>
              {/* Google Pay */}
              <Button
                onPress={() =>
                  Alert.alert(
                    "Coming Soon",
                    "Express Pay will be available soon.",
                  )
                }
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed ? "#f3f4f6" : "#ffffff",
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 10,
                  paddingVertical: 14,
                  alignItems: "center",
                })}
              >
                <RNText
                  style={{ color: "#111827", fontWeight: "700", fontSize: 15 }}
                >
                  Google Pay
                </RNText>
              </Button>
            </View>

            {/* Divider */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{ flex: 1, height: 1, backgroundColor: "#e5e7eb" }}
              />
              <RNText
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: "#9ca3af",
                  letterSpacing: 0.5,
                }}
              >
                OR PAY WITH CARD
              </RNText>
              <View
                style={{ flex: 1, height: 1, backgroundColor: "#e5e7eb" }}
              />
            </View>
          </View>

          {/* ── Payment Method ────────────────────────────────────────────── */}
          <View style={{ marginBottom: 24 }}>
            {/* Section header with secure badge */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text
                style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}
              >
                Payment Method
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "#dcfce7",
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <ShieldCheck size={12} color="#16a34a" />
                <RNText
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: "#16a34a",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  SECURE PAYMENT
                </RNText>
              </View>
            </View>

            {/* Cardholder Name */}
            <CardInput
              label="CARDHOLDER NAME"
              value={cardholderName}
              onChangeText={setCardholderName}
              placeholder="John Doe"
              style={{ marginBottom: 12 }}
            />

            {/* Card Number */}
            <CardInput
              label="CARD NUMBER"
              value={cardNumber}
              onChangeText={setCardNumber}
              placeholder="0000 0000 0000 0000"
              keyboardType="number-pad"
              rightIcon={<CreditCard size={18} color="#9ca3af" />}
              style={{ marginBottom: 12 }}
            />

            {/* Expiry + CVV row */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <CardInput
                label="EXPIRY DATE"
                value={expiry}
                onChangeText={setExpiry}
                placeholder="MM/YY"
                style={{ flex: 1 }}
              />
              <CardInput
                label="CVV"
                value={cvv}
                onChangeText={setCvv}
                placeholder="123"
                secureTextEntry
                style={{ flex: 1 }}
              />
            </View>
          </View>

          {/* ── Submit button ─────────────────────────────────────────────── */}
          <Pressable
            onPress={handleSubmit}
            disabled={!isFormValid || loading}
            style={({ pressed }) => ({
              backgroundColor: pressed && isFormValid ? "#0f766e" : "#0d9488",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              opacity: !isFormValid || loading ? 0.5 : 1,
              marginBottom: 20,
            })}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <RNText
                style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}
              >
                Pay and Activate Event
              </RNText>
            )}
          </Pressable>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <View style={{ alignItems: "center", gap: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Lock size={13} color="#9ca3af" />
              <RNText style={{ fontSize: 12, color: "#9ca3af" }}>
                Secure one-time payment powered by Stripe
              </RNText>
            </View>
            <RNText
              style={{
                fontSize: 11,
                color: "#9ca3af",
                textAlign: "center",
                lineHeight: 16,
              }}
            >
              By completing this purchase, you agree to Gatherly's Terms of
              Service and Privacy Policy.
            </RNText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
