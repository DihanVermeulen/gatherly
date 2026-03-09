import React, { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, X, ImagePlus } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";

import { useEvents } from "./contexts/EventsContext";
import { wishlistsApi } from "./api/wishlists";
import { TWishlistItem } from "./api/events";

import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";

type Priority = "low" | "medium" | "high";
const PRIORITIES: Priority[] = ["low", "medium", "high"];

export default function EditWishlistItemScreen() {
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const router = useRouter();

  const {
    state: { events },
    dispatch,
  } = useEvents();

  // Find event and item from context
  const event = events.find((e) => e.id === eventId) ?? null;
  const item = event?.wishlists?.find((w) => w.id === Number(id)) ?? null;

  // Local form state — initialised from item
  const [itemName, setItemName] = useState<string>(item?.itemName ?? "");
  const [description, setDescription] = useState<string>(item?.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(item?.imageUrl ?? null);
  const [priority, setPriority] = useState<Priority>(item?.priority ?? "low");
  const [priceInput, setPriceInput] = useState<string>(
    item?.pricePence ? (item.pricePence / 100).toFixed(2) : ""
  );

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Image picker ─────────────────────────────────────────────────────────

  const pickImage = useCallback(async () => {
    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant access to your photo library to add an image.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        const asset = result.assets[0];
        setImageUrl(`data:image/jpeg;base64,${asset.base64}`);
      }
    } catch (err) {
      console.error("Image picker error:", err);
    }
  }, []);

  // ── Save handler ─────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    // Validate
    if (!itemName.trim()) {
      setNameError("Item name is required.");
      return;
    }
    setNameError(null);
    setSaveError(null);

    if (!item) return;

    setIsSaving(true);
    try {
      const pricePence = priceInput.trim()
        ? Math.round(parseFloat(priceInput.replace(/[^0-9.]/g, "")) * 100) || null
        : null;
      const updatedItem = await wishlistsApi.update(eventId, Number(id), {
        participantId: item.participantId,
        itemName: itemName.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl || undefined,
        priority,
        pricePence,
      });

      dispatch({
        type: "UPDATE_WISHLIST_ITEM",
        payload: { eventId, item: updatedItem },
      });

      router.back();
    } catch (err: any) {
      console.error("Failed to update wishlist item:", err);
      setSaveError(
        err?.response?.data?.error || "Failed to save changes. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [eventId, id, item, itemName, description, imageUrl, priority, priceInput, dispatch, router]);

  // ── Item not found guard ─────────────────────────────────────────────────

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-background-0 px-8">
        <Text className="text-typography-500 text-base text-center">
          Item not found.
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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      className="h-full w-full max-w-7xl mx-auto bg-background-0"
      edges={["bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <View className="flex-1 bg-background-0">
          {/* ── Header bar ─────────────────────────────────────────── */}
          <View className="flex-row items-center justify-between px-4 pt-3 pb-3 border-b border-outline-100">
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 rounded-full bg-background-100 items-center justify-center active:opacity-70"
            >
              <ArrowLeft size={20} color="#0f172a" />
            </Pressable>

            <Text className="text-lg font-bold text-typography-900">
              Edit Item
            </Text>

            {/* Save button */}
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className="h-10 px-4 rounded-full items-center justify-center active:opacity-70"
              style={{ backgroundColor: isSaving ? "#0f766e" : "#0d9488" }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-bold text-sm">Save</Text>
              )}
            </Pressable>
          </View>

          {/* ── Form ───────────────────────────────────────────────── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Item Name */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-typography-700 mb-2">
                Item Name <Text className="text-error-500">*</Text>
              </Text>
              <View
                className={`border rounded-xl px-4 py-3 bg-background-50 ${
                  nameError ? "border-error-500" : "border-outline-200"
                }`}
              >
                <TextInput
                  value={itemName}
                  onChangeText={(text) => {
                    setItemName(text);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="e.g. Kindle Paperwhite"
                  placeholderTextColor="#94a3b8"
                  style={{ fontSize: 15, color: "#0f172a" }}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
              {nameError ? (
                <Text className="text-error-500 text-xs mt-1">{nameError}</Text>
              ) : null}
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-typography-700 mb-2">
                Description{" "}
                <Text className="text-typography-400 font-normal">(optional)</Text>
              </Text>
              <View className="border border-outline-200 rounded-xl px-4 py-3 bg-background-50">
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add a note, link, or size..."
                  placeholderTextColor="#94a3b8"
                  style={{
                    fontSize: 15,
                    color: "#0f172a",
                    minHeight: 88,
                    textAlignVertical: "top",
                  }}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Image */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-typography-700 mb-2">
                Image{" "}
                <Text className="text-typography-400 font-normal">(optional)</Text>
              </Text>

              {imageUrl ? (
                <View className="rounded-xl overflow-hidden border border-outline-200">
                  <Image
                    source={{ uri: imageUrl }}
                    style={{ width: "100%", height: 192 }}
                    resizeMode="cover"
                  />
                  {/* Remove image overlay button */}
                  <Pressable
                    onPress={() => setImageUrl(null)}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 items-center justify-center"
                  >
                    <X size={14} color="white" />
                  </Pressable>
                  {/* Change image button below */}
                  <Pressable
                    onPress={pickImage}
                    className="mt-2 flex-row items-center justify-center py-2.5 rounded-xl border border-outline-200 active:opacity-70"
                  >
                    <ImagePlus size={16} color="#0d9488" />
                    <Text
                      className="ml-2 text-sm font-semibold"
                      style={{ color: "#0d9488" }}
                    >
                      Change Image
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={pickImage}
                  className="h-32 rounded-xl border-2 border-dashed border-outline-300 bg-background-50 items-center justify-center active:bg-background-100"
                >
                  <ImagePlus size={28} color="#94a3b8" />
                  <Text className="text-sm text-typography-400 mt-2">
                    Tap to add photo
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Price */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-typography-700 mb-2">
                Price{" "}
                <Text className="text-typography-400 font-normal">(optional)</Text>
              </Text>
              <View className="flex-row items-center border border-outline-200 rounded-xl px-4 py-3 bg-background-50">
                <Text className="text-typography-500 mr-2 text-base">£</Text>
                <TextInput
                  value={priceInput}
                  onChangeText={setPriceInput}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  style={{ fontSize: 15, color: "#0f172a", flex: 1 }}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Priority segmented control */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-typography-700 mb-2">
                Priority
              </Text>
              <View className="flex-row rounded-xl border border-outline-200 overflow-hidden">
                {PRIORITIES.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setPriority(p)}
                    className={`flex-1 py-3 items-center ${
                      priority === p ? "bg-teal-500" : "bg-background-0"
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        priority === p ? "text-white" : "text-typography-600"
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Save error */}
            {saveError ? (
              <View
                className="mb-4 rounded-xl px-4 py-3"
                style={{ backgroundColor: "#fef2f2" }}
              >
                <Text className="text-sm text-center" style={{ color: "#dc2626" }}>
                  {saveError}
                </Text>
              </View>
            ) : null}

            {/* Save button (bottom) */}
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className="rounded-xl py-4 items-center justify-center flex-row gap-2 active:opacity-80"
              style={{ backgroundColor: isSaving ? "#0f766e" : "#0d9488" }}
            >
              {isSaving ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white font-bold text-base ml-2">
                    Saving...
                  </Text>
                </>
              ) : (
                <Text className="text-white font-bold text-base">
                  Save Changes
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
