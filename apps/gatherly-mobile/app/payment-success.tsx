import React, { useState, useEffect } from "react";
import {
  Alert,
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View,
  Text as RNText,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle, ChevronLeft, CreditCard } from "lucide-react-native";
import { eventsApi, TEvent } from "@/app/api/events";
import { useEvents } from "@/app/contexts/EventsContext";
import { PREMIUM_PRICE_DISPLAY } from "@/constants/upgrades";

export default function PaymentSuccessScreen() {
  const {
    eventId = "",
    last4 = "1234",
    txId = "#TH-0000-00",
  } = useLocalSearchParams<{ eventId: string; last4: string; txId: string }>();

  const router = useRouter();
  const { refreshEvents } = useEvents();

  const [event, setEvent] = useState<TEvent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (eventId) {
      eventsApi.getById(eventId).then(setEvent).catch(() => null);
    }
  }, [eventId]);

  const eventName = event?.name ?? "your event";

  async function handleGoToDashboard() {
    setLoading(true);
    try {
      await refreshEvents();
      router.replace(`/event-details?id=${eventId}` as never);
    } catch {
      router.replace(`/event-details?id=${eventId}` as never);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      edges={["top", "bottom"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{ padding: 4 }}
            hitSlop={8}
          >
            <ChevronLeft size={22} color="#111827" />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <RNText
              style={{
                fontSize: 13,
                fontWeight: "700",
                letterSpacing: 3,
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              GATHERLY
            </RNText>
          </View>
          {/* Spacer to balance back arrow */}
          <View style={{ width: 30 }} />
        </View>

        {/* ── Hero section ─────────────────────────────────────────────── */}
        <View style={{ alignItems: "center", paddingHorizontal: 24, paddingTop: 32 }}>
          {/* Green circle with checkmark */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#0d9488",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle size={44} color="#ffffff" />
          </View>

          <RNText
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#111827",
              marginTop: 20,
              textAlign: "center",
            }}
          >
            Payment Successful!
          </RNText>

          <RNText
            style={{
              fontSize: 14,
              color: "#6b7280",
              textAlign: "center",
              marginTop: 8,
              lineHeight: 20,
            }}
          >
            {"Your Standard Plan for the "}
            <RNText style={{ fontWeight: "700", color: "#111827" }}>
              {eventName}
            </RNText>
            {" is now active."}
          </RNText>
        </View>

        {/* ── Active Plan card ─────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 16,
            padding: 20,
            marginTop: 24,
            marginHorizontal: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          {/* Card header row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              {/* ACTIVE PLAN badge */}
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "#dcfce7",
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  marginBottom: 8,
                }}
              >
                <RNText
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: "#16a34a",
                    textTransform: "uppercase",
                  }}
                >
                  ACTIVE PLAN
                </RNText>
              </View>
              <RNText
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#111827",
                  marginBottom: 2,
                }}
              >
                {eventName}
              </RNText>
              <RNText style={{ fontSize: 13, color: "#6b7280" }}>
                Standard Plan
              </RNText>
            </View>

            {/* Cover photo thumbnail or teal placeholder */}
            {event?.coverPhotoUrl ? (
              <Image
                source={{ uri: event.coverPhotoUrl }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                }}
              />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: "#0d9488",
                }}
              />
            )}
          </View>

          {/* Detail rows with separators */}
          {/* Amount Paid */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: "#f3f4f6",
            }}
          >
            <RNText style={{ fontSize: 14, color: "#6b7280" }}>Amount Paid</RNText>
            <RNText style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>
              {PREMIUM_PRICE_DISPLAY}
            </RNText>
          </View>

          {/* Payment Method */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: "#f3f4f6",
            }}
          >
            <RNText style={{ fontSize: 14, color: "#6b7280" }}>Payment Method</RNText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <CreditCard size={14} color="#6b7280" />
              <RNText style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>
                {` Visa .... ${last4}`}
              </RNText>
            </View>
          </View>

          {/* Transaction ID */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: "#f3f4f6",
            }}
          >
            <RNText style={{ fontSize: 14, color: "#6b7280" }}>Transaction ID</RNText>
            <RNText style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>
              {txId}
            </RNText>
          </View>
        </View>

        {/* ── Footer section ───────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, alignItems: "center", marginTop: 20 }}>
          <RNText
            style={{
              fontSize: 12,
              color: "#9ca3af",
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            A confirmation email has been sent to your registered address.
          </RNText>
        </View>

        {/* ── Go to Event Dashboard button ──────────────────────────────── */}
        <Pressable
          onPress={handleGoToDashboard}
          disabled={loading}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#0f766e" : "#0d9488",
            borderRadius: 12,
            paddingVertical: 16,
            marginTop: 24,
            marginHorizontal: 16,
            alignItems: "center",
            opacity: loading ? 0.7 : 1,
          })}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <RNText style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}>
              Go to Event Dashboard
            </RNText>
          )}
        </Pressable>

        {/* ── View Receipt link ─────────────────────────────────────────── */}
        <Pressable
          onPress={() =>
            Alert.alert("Coming Soon", "Receipt downloads will be available soon.")
          }
          style={{ marginTop: 12 }}
        >
          <RNText
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            View Receipt
          </RNText>
        </Pressable>

        {/* ── Help text ─────────────────────────────────────────────────── */}
        <RNText
          style={{
            fontSize: 12,
            color: "#9ca3af",
            textAlign: "center",
            marginTop: 16,
            marginBottom: 20,
          }}
        >
          Need help with your plan?
        </RNText>
      </ScrollView>
    </SafeAreaView>
  );
}
