import React from "react";
import { Pressable, ScrollView, View, Text as RNText } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Check, ShieldCheck, X } from "lucide-react-native";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
} from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { PaywallFeature } from "@/components/PaywallBanner";
import { UPGRADE_REQUEST_URL } from "@/constants/upgrades";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: PaywallFeature;
  eventId?: string;
  isParticipant: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getContextualSubtitle(feature: PaywallFeature): string {
  if (feature === "participant_cap") {
    return "Free events are limited to 20 guests. Upgrade for unlimited capacity.";
  }
  if (feature === "potluck_trial") {
    return "Free events support up to 3 potluck categories. Upgrade for unlimited.";
  }
  if (feature === "polls_trial") {
    return "Free events include 1 poll. Upgrade for unlimited polls.";
  }
  if (typeof feature === "object" && feature.type === "module_locked") {
    return `${feature.moduleName} is a Premium feature. Upgrade to unlock all modules.`;
  }
  return "Choose the plan that fits your hosting style.";
}

function FeatureRow({
  label,
  iconColor,
}: {
  label: string;
  iconColor: string;
}) {
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaywallModal({
  isOpen,
  onClose,
  feature,
  isParticipant,
}: PaywallModalProps) {
  const subtitle = getContextualSubtitle(feature);

  function handleUpgrade() {
    WebBrowser.openBrowserAsync(UPGRADE_REQUEST_URL);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalBackdrop />
      <ModalContent style={{ flex: 1, backgroundColor: "#ffffff" }}>
        {/* Close button */}
        <View
          style={{
            position: "absolute",
            top: 48,
            right: 16,
            zIndex: 10,
          }}
        >
          <Pressable
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(0,0,0,0.08)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} color="#475569" />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 40 }}
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
            <Text style={{ fontSize: 14, color: "#6b7280" }}>{subtitle}</Text>
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
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}
              >
                Free
              </Text>
              <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                Everything you need to get started
              </Text>
            </View>

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
            {/* Header row with RECOMMENDED badge */}
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
                  <RNText
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: "#ffffff",
                      textTransform: "uppercase",
                    }}
                  >
                    Recommended
                  </RNText>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: "#b45309" }}>
                No limits. All modules. Unlimited.
              </Text>
            </View>

            <FeatureRow label="Unlimited guests" iconColor="#d97706" />
            <FeatureRow label="Unlimited polls" iconColor="#d97706" />
            <FeatureRow label="Unlimited potluck categories" iconColor="#d97706" />
            <FeatureRow label="White Elephant module" iconColor="#d97706" />
            <FeatureRow label="Photo Gallery module" iconColor="#d97706" />
            <FeatureRow label="Expense Splitter module" iconColor="#d97706" />

            {/* CTA — organiser only */}
            {!isParticipant && (
              <Pressable
                onPress={handleUpgrade}
                style={({ pressed }) => ({
                  marginTop: 20,
                  backgroundColor: pressed ? "#b45309" : "#d97706",
                  borderRadius: 10,
                  paddingVertical: 14,
                  alignItems: "center",
                })}
              >
                <RNText
                  style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}
                >
                  Upgrade
                </RNText>
              </Pressable>
            )}

            {/* Participant message */}
            {isParticipant && (
              <View
                style={{
                  marginTop: 16,
                  padding: 12,
                  backgroundColor: "#fef3c7",
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#92400e",
                    textAlign: "center",
                  }}
                >
                  Ask your organiser to upgrade this event
                </Text>
              </View>
            )}
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
            onPress={handleUpgrade}
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
      </ModalContent>
    </Modal>
  );
}
