import React from "react";
import { Alert, Pressable, View, Text as RNText } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Lock } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { UPGRADE_REQUEST_URL } from "@/constants/upgrades";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaywallFeature =
  | "participant_cap"
  | "potluck_trial"
  | "polls_trial"
  | { type: "module_locked"; moduleName: string };

interface PaywallBannerProps {
  /** Optional — not used in the Phase 35 CTA flow, available for Phase 36 routing. */
  eventId?: string;
  feature: PaywallFeature;
  isParticipant: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHeadline(
  feature: PaywallFeature,
  isParticipant: boolean
): string {
  if (isParticipant) {
    return "Ask your organiser to upgrade this event";
  }
  if (feature === "participant_cap") {
    return "Free events are limited to 20 guests";
  }
  if (feature === "potluck_trial") {
    return "Upgrade for unlimited potluck categories";
  }
  if (feature === "polls_trial") {
    return "Upgrade for unlimited polls";
  }
  if (typeof feature === "object" && feature.type === "module_locked") {
    return `Unlock ${feature.moduleName} with Premium`;
  }
  return "Upgrade to Premium";
}

function handleUpgradeCta() {
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
    ]
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaywallBanner({
  eventId: _eventId,
  feature,
  isParticipant,
}: PaywallBannerProps) {
  const headline = getHeadline(feature, isParticipant);

  return (
    <View
      style={{
        margin: 16,
        marginBottom: 24,
        padding: 16,
        backgroundColor: "#fffbeb",
        borderWidth: 1,
        borderColor: "#f59e0b",
        borderRadius: 16,
      }}
    >
      {/* Icon + headline row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Lock size={18} color="#92400e" />
        <Text
          style={{
            color: "#92400e",
            fontSize: 14,
            fontWeight: "600",
            flex: 1,
          }}
        >
          {headline}
        </Text>
      </View>

      {/* CTA button — organiser only */}
      {!isParticipant && (
        <Pressable
          onPress={handleUpgradeCta}
          style={({ pressed }) => ({
            marginTop: 14,
            backgroundColor: pressed ? "#b45309" : "#d97706",
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 16,
            alignItems: "center",
          })}
        >
          <RNText
            style={{ color: "#ffffff", fontWeight: "700", fontSize: 14 }}
          >
            Upgrade to Premium
          </RNText>
        </Pressable>
      )}
    </View>
  );
}
