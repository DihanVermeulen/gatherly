import React, { useState } from "react";
import { ScrollView, View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";

import { useEvents } from "./contexts/EventsContext";
import { eventsApi } from "./api/events";

import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Avatar, AvatarFallbackText } from "@/components/ui/avatar";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Divider } from "@/components/ui/divider";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";

export default function ManageExclusionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    state: { events },
    refreshEvents,
  } = useEvents();

  const event = events.find((e) => e.id === id) ?? null;

  // Deep-copy couples from event on mount to avoid mutating context directly
  const [couples, setCouples] = useState<string[][]>(
    () => (event?.couples ?? []).map((pair) => [...pair]),
  );
  const [firstSelected, setFirstSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Handle tap on a participant chip
  const handleParticipantTap = (name: string) => {
    // Prevent selecting the same person twice
    if (firstSelected === name) {
      setFirstSelected(null);
      return;
    }

    if (firstSelected === null) {
      // First selection — highlight this person
      setFirstSelected(name);
    } else {
      // Second selection — create the exclusion pair
      const newPair = [firstSelected, name];
      // Avoid duplicate pairs (in either order)
      const isDuplicate = couples.some(
        (pair) =>
          (pair[0] === newPair[0] && pair[1] === newPair[1]) ||
          (pair[0] === newPair[1] && pair[1] === newPair[0]),
      );
      if (!isDuplicate) {
        setCouples((prev) => [...prev, newPair]);
      }
      setFirstSelected(null);
    }
  };

  // Remove an exclusion pair by index
  const handleRemoveCouple = (index: number) => {
    setCouples((prev) => prev.filter((_, i) => i !== index));
  };

  // Save couples to API and go back
  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await eventsApi.update(id, { couples });
      await refreshEvents();
      router.back();
    } catch (err) {
      console.error("Failed to save exclusions:", err);
      setSaving(false);
    }
  };

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-background-0 px-8">
        <Text className="text-typography-500 text-base text-center">
          Event not found.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-primary-500 px-6 py-3"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const people: string[] = event.people ?? [];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <View className="flex-1 bg-background-0">
        {/* ── Header ─────────────────────────────────────────────── */}
        <AppHeader title="Manage Exclusions" onBack={handleSave} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
      >
        {/* ── Info text ───────────────────────────────────────────── */}
        <View className="rounded-xl bg-blue-50 px-4 py-3 mb-5 mt-2">
          <Text className="text-sm text-blue-700 leading-5">
            Tap two participants to create an exclusion pair. Excluded pairs
            will not be assigned to buy for each other.
          </Text>
        </View>

        {/* ── Participant chips ────────────────────────────────────── */}
        <Text className="text-base font-semibold text-typography-900 mb-3">
          Participants
        </Text>

        {people.length === 0 ? (
          <View className="rounded-xl border border-outline-100 p-6 items-center mb-5">
            <Text className="text-typography-400 text-sm text-center">
              No participants added to this event yet.
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-2 mb-5">
            {people.map((name) => {
              const isSelected = firstSelected === name;
              return (
                <Pressable
                  key={name}
                  onPress={() => handleParticipantTap(name)}
                  className={`flex-row items-center rounded-full px-3 py-2 gap-2 active:opacity-70 ${
                    isSelected
                      ? "bg-teal-500 border-2 border-teal-600"
                      : "bg-background-100 border-2 border-outline-200"
                  }`}
                >
                  <Avatar
                    size="xs"
                    className={isSelected ? "bg-white" : "bg-teal-500"}
                  >
                    <AvatarFallbackText
                      className={isSelected ? "text-teal-600" : "text-white"}
                    >
                      {name}
                    </AvatarFallbackText>
                  </Avatar>
                  <Text
                    className={`text-sm font-semibold ${
                      isSelected ? "text-white" : "text-typography-800"
                    }`}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ── Existing exclusion pairs ─────────────────────────────── */}
        <Text className="text-base font-semibold text-typography-900 mb-3">
          Exclusion Pairs
          {couples.length > 0 ? (
            <Text className="text-sm font-normal text-typography-400">
              {" "}({couples.length})
            </Text>
          ) : null}
        </Text>

        {couples.length === 0 ? (
          <View className="rounded-xl border border-dashed border-outline-200 p-6 items-center">
            <Text className="text-typography-400 text-sm text-center">
              No exclusion pairs yet. Tap two participants above to create one.
            </Text>
          </View>
        ) : (
          <VStack className="rounded-2xl border border-outline-100 overflow-hidden">
            {couples.map((pair, index) => (
              <React.Fragment key={`${pair[0]}-${pair[1]}-${index}`}>
                {index > 0 && <Divider />}
                <HStack className="items-center px-4 py-3 justify-between">
                  <HStack className="items-center gap-2 flex-1">
                    <Avatar size="xs" className="bg-rose-400">
                      <AvatarFallbackText className="text-white">
                        {pair[0]}
                      </AvatarFallbackText>
                    </Avatar>
                    <Text className="text-sm font-semibold text-typography-900">
                      {pair[0]}
                    </Text>
                    <Text className="text-sm text-typography-400">&</Text>
                    <Avatar size="xs" className="bg-rose-400">
                      <AvatarFallbackText className="text-white">
                        {pair[1]}
                      </AvatarFallbackText>
                    </Avatar>
                    <Text className="text-sm font-semibold text-typography-900">
                      {pair[1]}
                    </Text>
                  </HStack>
                  <Pressable
                    onPress={() => handleRemoveCouple(index)}
                    className="h-8 w-8 rounded-full bg-rose-50 items-center justify-center active:opacity-70"
                  >
                    <Trash2 size={14} color="#f43f5e" />
                  </Pressable>
                </HStack>
              </React.Fragment>
            ))}
          </VStack>
        )}
      </ScrollView>

      {/* ── Bottom save bar ──────────────────────────────────────── */}
      <View
        className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-white border-t border-outline-100"
        style={{ paddingBottom: 16 }}
      >
        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="w-full rounded-xl py-3 items-center justify-center active:opacity-70"
          style={{ backgroundColor: saving ? "#94a3b8" : "#0d9488" }}
        >
          {saving ? (
            <HStack className="items-center gap-2">
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white font-semibold text-base">
                Saving...
              </Text>
            </HStack>
          ) : (
            <Text className="text-white font-semibold text-base">
              Save Exclusions
            </Text>
          )}
        </Pressable>
      </View>
      </View>
    </SafeAreaView>
  );
}
