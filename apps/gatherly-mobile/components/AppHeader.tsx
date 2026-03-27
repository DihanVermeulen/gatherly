import React from "react";
import { View, ActivityIndicator } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Button } from "./ui/button";

type RightAction = {
  icon?: React.ReactNode;
  label?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: { backgroundColor?: string };
};

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: RightAction;
  rightElement?: React.ReactNode;
};

export function AppHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  rightElement,
}: Props) {
  // Determine right side content
  let rightContent: React.ReactNode;

  if (rightElement !== undefined) {
    rightContent = rightElement;
  } else if (rightAction) {
    if (rightAction.label) {
      // Pill button with label
      rightContent = (
        <Pressable
          onPress={rightAction.onPress}
          disabled={rightAction.disabled}
          style={{
            backgroundColor: rightAction.style?.backgroundColor ?? "#43A398",
            borderRadius: 20,
            paddingHorizontal: 16,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {rightAction.loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 14 }}>
              {rightAction.label}
            </Text>
          )}
        </Pressable>
      );
    } else if (rightAction.icon) {
      // Icon-only button
      rightContent = (
        <Pressable
          onPress={rightAction.onPress}
          disabled={rightAction.disabled}
          style={{
            height: 40,
            width: 40,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {rightAction.icon}
        </Pressable>
      );
    } else {
      // Spacer
      rightContent = <View style={{ width: 40, flexShrink: 0 }} />;
    }
  } else {
    // Spacer to keep title centered when there's a back button
    rightContent = <View style={{ width: 40, flexShrink: 0 }} />;
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 56,
      }}
    >
      {/* Back button */}
      {onBack ? (
        <Button
          onPress={onBack}
          variant="ghost"
          style={{
            height: 36,
            width: 36,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            borderRadius: 18,
          }}
        >
          <ArrowLeft size={18} className="text-neutral-500" />
        </Button>
      ) : null}

      {/* Title + subtitle */}
      <View style={{ flex: 1, marginHorizontal: 8 }}>
        <Text
          style={{ fontSize: 17, fontWeight: "700", color: "#0f172a" }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right side */}
      {rightContent}
    </View>
  );
}
