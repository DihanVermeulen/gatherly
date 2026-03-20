import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  BookOpen,
  Briefcase,
  Check,
  ChevronLeft,
  Clapperboard,
  Cpu,
  Dumbbell,
  FlaskConical,
  Leaf,
  Music,
  Palette,
  PartyPopper,
  Search,
  Trees,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react-native";
import { usersApi } from "@/app/api/users";
import { useSession } from "@/app/contexts/AuthContext";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import {
  Input,
  InputField,
  InputSlot,
  InputIcon,
} from "@/components/ui/input";
import { SafeAreaView } from "@/components/ui/safe-area-view";

// ──────────────────────────────────────────────────────────────────────────────
// Interest categories
// ──────────────────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  label: string;
  icon: LucideIcon;
};

const INTEREST_CATEGORIES: Category[] = [
  { id: "music", label: "Music & Concerts", icon: Music },
  { id: "tech", label: "Tech & AI", icon: Cpu },
  { id: "social", label: "Social Mixers", icon: Users },
  { id: "art", label: "Art & Gallery", icon: Palette },
  { id: "health", label: "Health & Wellness", icon: Leaf },
  { id: "food", label: "Food & Drink", icon: Utensils },
  { id: "business", label: "Business & Networking", icon: Briefcase },
  { id: "sports", label: "Sports & Fitness", icon: Dumbbell },
  { id: "cinema", label: "Cinema & Film", icon: Clapperboard },
  { id: "outdoor", label: "Outdoor & Nature", icon: Trees },
  { id: "science", label: "Science", icon: FlaskConical },
  { id: "parties", label: "Parties", icon: PartyPopper },
  { id: "literature", label: "Literature", icon: BookOpen },
];

const MIN_SELECTIONS = 3;

// ──────────────────────────────────────────────────────────────────────────────
// Screen
// ──────────────────────────────────────────────────────────────────────────────

export default function PreferencesScreen() {
  const { updateUser } = useSession();

  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredCategories = INTEREST_CATEGORIES.filter((c) =>
    c.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleCategory = async (id: string) => {
    await Haptics.selectionAsync();
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await usersApi.updateMe({ interests: selected, onboardingComplete: true });
      await updateUser({ onboardingComplete: true });
    } catch (err) {
      // Non-fatal: still complete onboarding locally
      console.error("Failed to save preferences:", err);
      await updateUser({ onboardingComplete: true });
    } finally {
      setLoading(false);
      router.replace("/(tabs)" as never);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await usersApi.updateMe({ onboardingComplete: true });
      await updateUser({ onboardingComplete: true });
    } catch {
      await updateUser({ onboardingComplete: true });
    } finally {
      setLoading(false);
      router.replace("/(tabs)" as never);
    }
  };

  const remaining = Math.max(0, MIN_SELECTIONS - selected.length);
  const canProceed = selected.length >= MIN_SELECTIONS;

  return (
    <SafeAreaView className="flex-1 bg-background-0">
      <View className="flex-1">
        {/* Header */}
        <HStack className="items-center px-6 pt-4 pb-2">
          <Pressable onPress={() => router.back()} className="mr-4">
            <ChevronLeft size={24} color="#0f172a" />
          </Pressable>
          <Text className="text-xl font-bold text-typography-900 flex-1 text-center">
            Personalize Your Feed
          </Text>
          <Pressable onPress={handleSkip} disabled={loading} className="ml-4">
            <Text className="text-sm font-semibold" style={{ color: "#0d9488" }}>
              Skip
            </Text>
          </Pressable>
        </HStack>

        {/* Step indicator row */}
        <HStack className="justify-between px-6 pb-3">
          <Text className="text-xs uppercase tracking-widest text-typography-400 font-medium">
            Discovery &amp; Preferences
          </Text>
          <Text className="text-xs uppercase tracking-widest text-typography-400 font-medium">
            Step 2 of 2
          </Text>
        </HStack>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        >
          {/* Main heading */}
          <VStack className="mb-5 gap-1">
            <Heading size="2xl" className="text-typography-900 font-bold">
              What are you into?
            </Heading>
            <Text className="text-typography-500 text-sm">
              Select 3 or more interests to help us find events you'll love.
            </Text>
          </VStack>

          {/* Search bar */}
          <Input variant="outline" size="lg" className="rounded-2xl mb-5">
            <InputSlot className="pl-3">
              <InputIcon as={Search} className="text-typography-400" />
            </InputSlot>
            <InputField
              placeholder="Search interests..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Input>

          {/* Interest chips — wrapped rows */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {filteredCategories.map((category) => {
              const isSelected = selected.includes(category.id);
              const IconComponent = category.icon;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => toggleCategory(category.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: isSelected ? "#0d9488" : "#cbd5e1",
                    backgroundColor: isSelected ? "#0d9488" : "transparent",
                    gap: 6,
                  }}
                >
                  {isSelected ? (
                    <Check size={14} color="#ffffff" strokeWidth={3} />
                  ) : (
                    <IconComponent size={14} color="#64748b" />
                  )}
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: isSelected ? "#ffffff" : "#374151",
                    }}
                  >
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom section — fixed above keyboard */}
        <View
          className="px-6 pb-6 pt-4 bg-background-0"
          style={{
            borderTopWidth: 1,
            borderTopColor: "#f1f5f9",
          }}
        >
          {/* Counter */}
          {remaining > 0 && (
            <Text className="text-typography-400 text-sm text-center mb-3">
              Select {remaining} more to continue
            </Text>
          )}

          {/* Start Exploring button */}
          <Button
            size="xl"
            className="w-full rounded-2xl"
            style={{
              backgroundColor: "#0d9488",
              opacity: canProceed ? 1 : 0.5,
            }}
            onPress={handleComplete}
            disabled={!canProceed || loading}
          >
            {loading && <ButtonSpinner className="mr-2" />}
            <ButtonText className="font-semibold text-white">
              Start Exploring
            </ButtonText>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
