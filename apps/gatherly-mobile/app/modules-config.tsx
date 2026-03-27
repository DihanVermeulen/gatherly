import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BarChart2,
  Camera,
  DollarSign,
  Gift,
  Info,
  Lock,
  Users,
  Utensils,
} from "lucide-react-native";

import { modulesApi } from "./api/modules";
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
import { AppHeader } from "@/components/AppHeader";

type ModuleCategory = "ACTIVITY" | "COLLABORATION" | "MEMORIES";

type ModuleDef = {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: ModuleCategory;
  premium: boolean;
  comingSoon?: boolean;
};

const MODULE_DEFS: ModuleDef[] = [
  // ACTIVITY
  {
    type: "gift_exchange",
    label: "Gift Exchange",
    description: "Organize Secret Santa and manage participant wishlists",
    icon: <Gift size={24} color="#0d9488" />,
    category: "ACTIVITY",
    premium: false,
  },
  {
    type: "white_elephant",
    label: "White Elephant",
    description: "Run a gift swap game with your group",
    icon: <Gift size={24} color="#0d9488" />,
    category: "ACTIVITY",
    premium: true,
    comingSoon: true,
  },
  // COLLABORATION
  {
    type: "potluck",
    label: "Potluck",
    description: "Coordinate food and drink signups with ease",
    icon: <Utensils size={24} color="#0d9488" />,
    category: "COLLABORATION",
    premium: true,
  },
  {
    type: "expense_splitter",
    label: "Expense Splitter",
    description: "Track shared costs and settle up with guests",
    icon: <DollarSign size={24} color="#0d9488" />,
    category: "COLLABORATION",
    premium: true,
    comingSoon: true,
  },
  {
    type: "polls",
    label: "Polls",
    description: "Let guests vote on event details like time and location",
    icon: <BarChart2 size={24} color="#0d9488" />,
    category: "COLLABORATION",
    premium: true,
  },
  {
    type: "rsvp",
    label: "RSVP",
    description: "Collect attendance confirmations and headcounts from guests",
    icon: <Users size={24} color="#0d9488" />,
    category: "COLLABORATION",
    premium: true,
  },
  // MEMORIES
  {
    type: "photo_gallery",
    label: "Photo Gallery",
    description: "A shared space for everyone to upload event photos",
    icon: <Camera size={24} color="#0d9488" />,
    category: "MEMORIES",
    premium: true,
    comingSoon: true,
  },
];

const CATEGORY_ORDER: ModuleCategory[] = [
  "ACTIVITY",
  "COLLABORATION",
  "MEMORIES",
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

  const [activeModules, setActiveModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingModule, setSavingModule] = useState<string | null>(null);
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
        // Default to empty set on error
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleToggle = async (
    type: string,
    isPremium: boolean,
    comingSoon?: boolean,
  ) => {
    if (comingSoon) return;
    if (isPremium && isFree) {
      setShowUpgradeModal(true);
      return;
    }

    // Optimistic update
    const prevModules = new Set(activeModules);
    const newModules = new Set(activeModules);
    if (newModules.has(type)) {
      newModules.delete(type);
    } else {
      newModules.add(type);
    }
    setActiveModules(newModules);
    setSavingModule(type);

    // Auto-save
    try {
      const modulesPayload = Array.from(newModules).map((t) => ({
        type: t,
        status: "active",
        config: {},
      }));
      await modulesApi.setModules(id, modulesPayload);
    } catch (err: any) {
      // Revert on error
      setActiveModules(prevModules);
      if (err?.response?.data?.error === "upgrade_required") {
        setShowUpgradeModal(true);
      }
    } finally {
      setSavingModule(null);
    }
  };

  // Group modules by category
  const modulesByCategory = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = MODULE_DEFS.filter((m) => m.category === cat);
      return acc;
    },
    {} as Record<ModuleCategory, ModuleDef[]>,
  );

  return (
    <SafeAreaView className="flex-1 bg-background-50" edges={["bottom"]}>
      {/* Header */}
      <AppHeader title="Customize Your Event" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
      >
        {/* Section header */}
        <Text className="text-xl font-bold text-typography-900 mt-4 mb-1">
          Available Modules
        </Text>
        <Text className="text-sm text-typography-500 mb-5">
          Select the features you want to enable for your guests. You can change
          these anytime.
        </Text>

        {/* Free-tier upgrade banner */}
        {isFree && (
          <View
            className="rounded-2xl p-4 mb-5"
            style={{ backgroundColor: "#0d9488" }}
          >
            <Text className="text-white font-bold text-base mb-1">
              Unlock Premium Modules
            </Text>
            <Text className="text-white text-sm opacity-90 mb-3">
              Upgrade your event to access all modules and features
            </Text>
            <Pressable
              onPress={() => setShowUpgradeModal(true)}
              className="self-start rounded-xl px-4 py-2 active:opacity-80"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <Text className="text-white font-semibold text-sm">Upgrade</Text>
            </Pressable>
          </View>
        )}

        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#0d9488" />
          </View>
        ) : (
          CATEGORY_ORDER.map((category) => {
            const mods = modulesByCategory[category];
            if (!mods?.length) return null;
            return (
              <View key={category} className="mb-4">
                {/* Category header */}
                <Text
                  className="text-xs font-bold uppercase tracking-widest mb-2 ml-1"
                  style={{ color: "#94a3b8" }}
                >
                  {category}
                </Text>

                {/* Module cards */}
                <View className="rounded-2xl bg-white border border-outline-100 overflow-hidden">
                  {mods.map((mod, idx) => {
                    const isActive = activeModules.has(mod.type);
                    const isLocked = mod.premium && isFree;
                    const isSaving = savingModule === mod.type;

                    return (
                      <View
                        key={mod.type}
                        className={`flex-row items-center px-4 py-4 ${
                          idx < mods.length - 1
                            ? "border-b border-outline-100"
                            : ""
                        }`}
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
                          <View className="flex-row items-center gap-1.5 flex-wrap">
                            <Text className="text-sm font-bold text-typography-900">
                              {mod.label}
                            </Text>
                            {mod.comingSoon && (
                              <View
                                className="rounded-full px-2 py-0.5"
                                style={{ backgroundColor: "#f0fdfa" }}
                              >
                                <Text
                                  className="text-xs font-semibold"
                                  style={{ color: "#0d9488" }}
                                >
                                  Coming soon
                                </Text>
                              </View>
                            )}
                            {isLocked && !mod.comingSoon && (
                              <Lock size={12} color="#94a3b8" />
                            )}
                          </View>
                          <Text className="text-xs text-typography-500 mt-0.5 leading-4">
                            {mod.description}
                          </Text>
                          {isLocked && !mod.comingSoon && (
                            <Text
                              className="text-xs font-semibold mt-1"
                              style={{ color: "#0d9488" }}
                            >
                              Upgrade to enable
                            </Text>
                          )}
                        </View>

                        {/* Toggle */}
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#0d9488" />
                        ) : (
                          <Switch
                            value={isActive}
                            onValueChange={() =>
                              handleToggle(
                                mod.type,
                                mod.premium,
                                mod.comingSoon,
                              )
                            }
                            disabled={isLocked || !!mod.comingSoon}
                            trackColor={{ false: "#cbd5e1", true: "#0d9488" }}
                            thumbColor="#ffffff"
                            style={{
                              opacity: isLocked || mod.comingSoon ? 0.4 : 1,
                            }}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}

        {/* Info note */}
        <View
          className="rounded-2xl flex-row items-start p-4 mt-2"
          style={{ backgroundColor: "#f0fdfa" }}
        >
          <Info
            size={16}
            color="#0d9488"
            style={{ marginTop: 1, flexShrink: 0 }}
          />
          <Text className="text-xs text-typography-600 ml-2 flex-1 leading-4">
            Modules are interactive elements that appear on your event's main
            page for all confirmed guests.
          </Text>
        </View>
      </ScrollView>

      {/* Upgrade modal */}
      <Modal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        size="md"
      >
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
              <ButtonText className="text-typography-700">
                Maybe Later
              </ButtonText>
            </Button>
            <Button
              className="flex-1 rounded-xl"
              style={{ backgroundColor: "#0d9488" }}
              onPress={() => setShowUpgradeModal(false)}
            >
              <ButtonText className="text-white font-semibold">
                Coming Soon
              </ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </SafeAreaView>
  );
}
