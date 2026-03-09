import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Gift, BarChart2, Users, Utensils, Lock, Info } from "lucide-react-native";

import { modulesApi } from "./api/modules";
import { TEventModule } from "./api/events";
import { useEvents } from "./contexts/EventsContext";

import { Text } from "@/components/ui/text";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pressable } from "@/components/ui/pressable";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from "@/components/ui/modal";
import { SafeAreaView } from "react-native-safe-area-context";

type ModuleDef = {
  type: TEventModule["moduleType"];
  label: string;
  description: string;
  icon: React.ReactNode;
  premium: boolean;
  alwaysOn?: boolean;
};

const MODULE_DEFS: ModuleDef[] = [
  {
    type: "gift_exchange",
    label: "Gift Exchange",
    description: "Organize Secret Santa and manage participant wishlists",
    icon: <Gift size={24} color="#0d9488" />,
    premium: false,
    alwaysOn: true,
  },
  {
    type: "polls",
    label: "Polls",
    description: "Let guests vote on event details like time and location",
    icon: <BarChart2 size={24} color="#0d9488" />,
    premium: true,
  },
  {
    type: "rsvp",
    label: "RSVP",
    description: "Collect attendance confirmations and headcounts from guests",
    icon: <Users size={24} color="#0d9488" />,
    premium: true,
  },
  {
    type: "potluck",
    label: "Potluck",
    description: "Coordinate food and drink signups with ease",
    icon: <Utensils size={24} color="#0d9488" />,
    premium: true,
  },
  {
    type: "white_elephant",
    label: "White Elephant",
    description: "Run a gift swap game with your group",
    icon: <Gift size={24} color="#0d9488" />,
    premium: true,
  },
];

export default function ModulesConfigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    state: { events },
  } = useEvents();

  const event = events.find((e) => e.id === id) ?? null;
  const planTier = event?.planTier ?? "free";
  const isFree = planTier === "free";

  const [activeModules, setActiveModules] = useState<Set<string>>(
    new Set(["gift_exchange"]),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const modules = await modulesApi.getModules(id);
        setActiveModules(
          new Set(
            modules
              .filter((m) => m.status === "active")
              .map((m) => m.moduleType),
          ),
        );
      } catch {
        // Default to gift_exchange only on error
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleToggle = (type: string, isPremium: boolean, alwaysOn?: boolean) => {
    if (alwaysOn) return; // Gift Exchange cannot be toggled
    if (isPremium && isFree) {
      setShowUpgradeModal(true);
      return;
    }
    setActiveModules((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const modules = Array.from(activeModules).map((type, i) => ({
        type,
        status: "active",
        config: {},
      }));
      await modulesApi.setModules(id, modules);
      router.back();
    } catch (err: any) {
      if (err?.response?.data?.error === "upgrade_required") {
        setShowUpgradeModal(true);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50" edges={["bottom"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-3 pb-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 rounded-full bg-background-100 items-center justify-center active:opacity-70 mr-3"
        >
          <ArrowLeft size={20} color="#0f172a" />
        </Pressable>
        <Text className="text-lg font-bold text-typography-900 flex-1 text-center mr-10">
          Customize Your Event
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
      >
        {/* Section header */}
        <Text className="text-xl font-bold text-typography-900 mt-4 mb-1">
          Available Modules
        </Text>
        <Text className="text-sm text-typography-500 mb-5">
          Select the features you want to enable for your guests. You can change
          these anytime.
        </Text>

        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#0d9488" />
          </View>
        ) : (
          MODULE_DEFS.map((mod) => {
            const isActive = activeModules.has(mod.type);
            const isLocked = mod.premium && isFree;

            return (
              <View
                key={mod.type}
                className="rounded-2xl bg-white border border-outline-100 flex-row items-center px-4 py-4 mb-3"
              >
                {/* Icon */}
                <View
                  className="h-12 w-12 rounded-xl items-center justify-center mr-3 flex-shrink-0"
                  style={{ backgroundColor: "#f0fdfa" }}
                >
                  {mod.icon}
                </View>

                {/* Label + description */}
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-sm font-bold text-typography-900">
                      {mod.label}
                    </Text>
                    {isLocked && (
                      <Lock size={12} color="#94a3b8" />
                    )}
                  </View>
                  <Text className="text-xs text-typography-500 mt-0.5 leading-4">
                    {mod.description}
                  </Text>
                  {isLocked && (
                    <Text className="text-xs font-semibold mt-1" style={{ color: "#0d9488" }}>
                      Upgrade to enable
                    </Text>
                  )}
                </View>

                {/* Toggle */}
                {mod.alwaysOn ? (
                  <Switch
                    value={true}
                    disabled
                    trackColor={{ false: "#cbd5e1", true: "#0d9488" }}
                    thumbColor="#ffffff"
                  />
                ) : (
                  <Pressable onPress={() => handleToggle(mod.type, mod.premium, mod.alwaysOn)}>
                    <Switch
                      value={isActive}
                      onValueChange={() => handleToggle(mod.type, mod.premium, mod.alwaysOn)}
                      disabled={isLocked}
                      trackColor={{ false: "#cbd5e1", true: "#0d9488" }}
                      thumbColor="#ffffff"
                      style={{ opacity: isLocked ? 0.5 : 1 }}
                    />
                  </Pressable>
                )}
              </View>
            );
          })
        )}

        {/* Info note */}
        <View
          className="rounded-2xl flex-row items-start p-4 mt-2"
          style={{ backgroundColor: "#f0fdfa" }}
        >
          <Info size={16} color="#0d9488" style={{ marginTop: 1, flexShrink: 0 }} />
          <Text className="text-xs text-typography-600 ml-2 flex-1 leading-4">
            Modules are interactive elements that appear on your event's main
            page for all confirmed guests.
          </Text>
        </View>
      </ScrollView>

      {/* Save button */}
      <View className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-outline-100">
        <Button
          className="rounded-2xl py-4"
          style={{ backgroundColor: "#0d9488" }}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ButtonSpinner color="white" />
          ) : null}
          <ButtonText className="text-white font-bold text-base ml-1">
            Save Modules
          </ButtonText>
        </Button>
      </View>

      {/* Upgrade modal */}
      <Modal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} size="md">
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text className="text-lg font-bold text-typography-900">
              Upgrade Your Event
            </Text>
            <ModalCloseButton onPress={() => setShowUpgradeModal(false)}>
              <Text className="text-typography-500 text-lg">✕</Text>
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <Text className="text-sm text-typography-600 leading-5">
              Polls, RSVP, Potluck, and White Elephant are premium modules
              available on the Standard plan. Upgrade your event to unlock all
              modules and give your guests the best experience.
            </Text>
            <View
              className="rounded-xl mt-4 px-4 py-3"
              style={{ backgroundColor: "#f0fdfa" }}
            >
              <Text className="text-sm font-bold" style={{ color: "#0d9488" }}>
                Standard Plan
              </Text>
              <Text className="text-xs text-typography-500 mt-1">
                All modules · Unlimited participants · Priority support
              </Text>
            </View>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              className="flex-1 mr-2 rounded-xl border-outline-300"
              onPress={() => setShowUpgradeModal(false)}
            >
              <ButtonText className="text-typography-700">Maybe Later</ButtonText>
            </Button>
            <Button
              className="flex-1 rounded-xl"
              style={{ backgroundColor: "#0d9488" }}
              onPress={() => setShowUpgradeModal(false)}
            >
              <ButtonText className="text-white font-semibold">Coming Soon</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SafeAreaView>
  );
}
