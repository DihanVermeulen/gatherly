import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Camera } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useEvents } from "./contexts/EventsContext";
import { eventsApi } from "./api/events";

import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";

export default function EditEventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    state: { events },
    refreshEvents,
  } = useEvents();

  const event = events.find((e) => e.id === id) ?? null;

  // ── Form state ────────────────────────────────────────────────────
  const [name, setName] = useState(event?.name ?? "");
  const [eventDate, setEventDate] = useState(
    event?.eventDate
      ? new Date(event.eventDate).toISOString().slice(0, 16)
      : "",
  );
  const [location, setLocation] = useState(event?.location ?? "");
  const [coverPhotoBase64, setCoverPhotoBase64] = useState<string | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(
    event?.coverPhotoUrl ?? null,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when event loads from context
  useEffect(() => {
    if (event) {
      setName(event.name ?? "");
      setEventDate(
        event.eventDate
          ? new Date(event.eventDate).toISOString().slice(0, 16)
          : "",
      );
      setLocation(event.location ?? "");
      setCoverPhotoPreview(event.coverPhotoUrl ?? null);
    }
  }, [event?.id]);

  const handlePickPhoto = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      setError("Permission to access photo library is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setCoverPhotoPreview(asset.uri);

    try {
      const file = new File(asset.uri);
      const base64 = await file.base64();
      setCoverPhotoBase64(`data:image/jpeg;base64,${base64}`);
    } catch (err) {
      console.error("Failed to read image:", err);
      setError("Failed to read the selected image.");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Event name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const patch: Record<string, any> = {
        name: name.trim(),
        location: location.trim() || null,
      };

      if (eventDate) {
        patch.eventDate = new Date(eventDate).toISOString();
      }

      if (coverPhotoBase64) {
        patch.coverPhoto = coverPhotoBase64;
      }

      await eventsApi.update(id, patch as any);
      await refreshEvents();
      router.back();
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Failed to save. Please try again.",
      );
    } finally {
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

  return (
    <SafeAreaView
      className="h-full w-full max-w-7xl mx-auto bg-background-0"
      edges={["bottom"]}
    >
      <View className="flex-1 bg-background-0">
        {/* ── Header ───────────────────────────────────────────── */}
        <AppHeader title="Edit Event" onBack={() => router.back()} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 40,
            paddingTop: 16,
            paddingHorizontal: 16,
          }}
        >
          {/* ── Cover Photo ────────────────────────────────────── */}
          <Text className="text-sm font-semibold text-typography-700 mb-1.5">
            Cover Photo
          </Text>
          <Pressable
            onPress={handlePickPhoto}
            className="rounded-2xl overflow-hidden mb-5 active:opacity-80"
            style={{ height: 180 }}
          >
            {coverPhotoPreview ? (
              <View style={{ width: "100%", height: 180 }}>
                <Image
                  source={{ uri: coverPhotoPreview }}
                  style={{ width: "100%", height: 180, borderRadius: 16 }}
                  resizeMode="cover"
                />
                <View
                  className="absolute bottom-3 right-3 flex-row items-center gap-1.5 rounded-xl px-3 py-1.5"
                  style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                >
                  <Camera size={14} color="#ffffff" />
                  <Text className="text-white text-xs font-semibold">
                    Change
                  </Text>
                </View>
              </View>
            ) : (
              <View
                className="w-full h-full rounded-2xl border-2 border-dashed border-outline-200 items-center justify-center"
                style={{ backgroundColor: "#f8fafc" }}
              >
                <Camera size={28} color="#94a3b8" />
                <Text className="text-sm text-typography-400 mt-2">
                  Tap to add a cover photo
                </Text>
                <Text className="text-xs text-typography-300 mt-0.5">
                  16:9 recommended
                </Text>
              </View>
            )}
          </Pressable>

          {/* ── Event Name ────────────────────────────────────── */}
          <Text className="text-sm font-semibold text-typography-700 mb-1.5">
            Event Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Annual Family Reunion"
            placeholderTextColor="#94a3b8"
            className="rounded-xl border border-outline-200 bg-white px-4 py-3 text-sm text-typography-900 mb-4"
            style={{
              fontSize: 14,
              color: "#0f172a",
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderRadius: 12,
              backgroundColor: "#fff",
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 16,
            }}
          />

          {/* ── Date & Time ───────────────────────────────────── */}
          <Text className="text-sm font-semibold text-typography-700 mb-1.5">
            Date & Time
          </Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={{
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderRadius: 12,
              backgroundColor: "#fff",
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 16,
              justifyContent: "center",
            }}
          >
            <Text
              style={{ fontSize: 14, color: eventDate ? "#0f172a" : "#94a3b8" }}
            >
              {eventDate
                ? new Date(eventDate).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Select date & time"}
            </Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={eventDate ? new Date(eventDate) : new Date()}
              mode="datetime"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={(_event: any, selectedDate?: Date) => {
                setShowDatePicker(Platform.OS === "ios");
                if (selectedDate) {
                  setEventDate(selectedDate.toISOString());
                }
              }}
            />
          )}

          {/* ── Location ─────────────────────────────────────── */}
          <Text className="text-sm font-semibold text-typography-700 mb-1.5">
            Location
          </Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Enter location"
            placeholderTextColor="#94a3b8"
            style={{
              fontSize: 14,
              color: "#0f172a",
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderRadius: 12,
              backgroundColor: "#fff",
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 24,
            }}
          />

          {/* ── Error ────────────────────────────────────────── */}
          {error && (
            <View
              className="rounded-xl px-4 py-3 mb-4"
              style={{ backgroundColor: "#fef2f2" }}
            >
              <Text
                className="text-sm text-center"
                style={{ color: "#dc2626" }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* ── Save button ───────────────────────────────────── */}
          <Button
            onPress={handleSave}
            disabled={saving}
            className="rounded-2xl py-4"
            style={{
              backgroundColor: saving ? "#0f766e" : "#0d9488",
              width: "100%",
            }}
          >
            {saving && <ButtonSpinner color="white" />}
            <ButtonText className="text-white font-bold text-base ml-1">
              {saving ? "Saving..." : "Save Changes"}
            </ButtonText>
          </Button>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
