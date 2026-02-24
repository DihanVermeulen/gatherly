import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable } from "@/components/ui/pressable";
import { ArrowLeft } from "lucide-react-native";
import { useEvents } from "./contexts/EventsContext";

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    state: { events },
  } = useEvents();

  const event = events.find((e) => e.id === id);

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-background-0">
        <Text className="text-typography-500">Event not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-primary-500 font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-0">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4 pb-4 gap-3">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 rounded-full bg-background-100 items-center justify-center"
        >
          <ArrowLeft size={20} color="#0f172a" />
        </Pressable>
        <Text className="text-xl font-bold text-typography-900 flex-1">
          {event.name}
        </Text>
      </View>

      {/* Placeholder — full details screen implemented in Phase 13-02 */}
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-typography-500 text-center">
          Event details coming soon.
        </Text>
        <Text className="text-typography-400 text-sm text-center mt-2">
          Participants: {event.people?.length ?? 0}
        </Text>
      </View>
    </View>
  );
}
