import React from "react";
import { Alert, ScrollView, View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Check, ShieldCheck } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { AppHeader } from "@/components/AppHeader";
import { UPGRADE_REQUEST_URL } from "@/constants/upgrades";

// ─── Feature row helpers ──────────────────────────────────────────────────────

type FeatureRowProps = {
  label: string;
  iconColor: string;
};

function FeatureRow({ label, iconColor }: FeatureRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <Check size={16} color={iconColor} />
      <Text style={{ fontSize: 14, color: "#374151" }}>{label}</Text>
    </View>
  );
}

// ─── CTA handler ─────────────────────────────────────────────────────────────

function handleRequestAccess() {
  Alert.alert(
    "Request Premium Access",
    "You'll be taken to an external form to request Premium access.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Continue",
        onPress: () => {
          WebBrowser.openBrowserAsync(UPGRADE_REQUEST_URL);
        },
      },
    ],
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PricingScreen() {
  const { eventId = "" } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      edges={["bottom"]}
    >
      <AppHeader title="Plans" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* ── Page headline ─────────────────────────────────────────────── */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#111827",
              marginBottom: 6,
            }}
          >
            Elevate your events
          </Text>
          <Text style={{ fontSize: 14, color: "#6b7280" }}>
            Choose the plan that fits your hosting style.
          </Text>
        </View>

        {/* ── Free Tier Card ─────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: "#f9fafb",
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          {/* Card header */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}
            >
              Free
            </Text>
            <Text
              style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}
            >
              Everything you need to get started
            </Text>
          </View>

          {/* Feature rows */}
          <FeatureRow label="Up to 20 guests" iconColor="#6b7280" />
          <FeatureRow label="1 poll" iconColor="#6b7280" />
          <FeatureRow label="3 potluck categories" iconColor="#6b7280" />
          <FeatureRow label="Gift Exchange module" iconColor="#6b7280" />
        </View>

        {/* ── Premium Tier Card ──────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: "#fffbeb",
            borderWidth: 1,
            borderColor: "#f59e0b",
            borderRadius: 16,
            padding: 20,
          }}
        >
          {/* Card header */}
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#92400e",
                }}
              >
                Premium
              </Text>
              <View
                style={{
                  backgroundColor: "#d97706",
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: "#ffffff",
                    textTransform: "uppercase",
                  }}
                >
                  Recommended
                </Text>
              </View>
            </View>
            <Text
              style={{ fontSize: 13, color: "#b45309" }}
            >
              No limits. All modules. Unlimited.
            </Text>
          </View>

          {/* Feature rows */}
          <FeatureRow label="Unlimited guests" iconColor="#d97706" />
          <FeatureRow label="Unlimited polls" iconColor="#d97706" />
          <FeatureRow label="Unlimited potluck categories" iconColor="#d97706" />
          <FeatureRow label="White Elephant module" iconColor="#d97706" />
          <FeatureRow label="Photo Gallery module" iconColor="#d97706" />
          <FeatureRow label="Expense Splitter module" iconColor="#d97706" />

          {/* Request Access CTA */}
          <Pressable
            onPress={handleRequestAccess}
            disabled={!eventId}
            style={({ pressed }) => ({
              marginTop: 20,
              backgroundColor: pressed ? "#b45309" : "#d97706",
              borderRadius: 10,
              paddingVertical: 14,
              alignItems: "center",
              opacity: !eventId ? 0.5 : 1,
            })}
          >
            <Text
              style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}
            >
              Upgrade
            </Text>
          </Pressable>
        </View>

        {/* ── Trust section ─────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginTop: 24,
            backgroundColor: "#f0fdf4",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <ShieldCheck size={22} color="#16a34a" />
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}
            >
              Secure Payments
            </Text>
            <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Your transaction is encrypted and secured by global payment
              standards.
            </Text>
          </View>
        </View>

        {/* ── Help link ─────────────────────────────────────────────────── */}
        <Pressable
          onPress={() =>
            WebBrowser.openBrowserAsync(UPGRADE_REQUEST_URL)
          }
          style={{ alignItems: "center", marginTop: 20 }}
        >
          <Text style={{ fontSize: 13, color: "#6b7280" }}>
            Need help choosing?{" "}
            <Text style={{ color: "#d97706", fontWeight: "600" }}>
              Talk to an event specialist
            </Text>
          </Text>
        </Pressable>

        {/* ── Footer links ──────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 16,
            marginTop: 16,
          }}
        >
          <Text style={{ fontSize: 11, color: "#9ca3af" }}>
            Privacy Policy
          </Text>
          <Text style={{ fontSize: 11, color: "#9ca3af" }}>
            Terms of Service
          </Text>
          <Text style={{ fontSize: 11, color: "#9ca3af" }}>
            Restore Purchases
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
