import React, { useState, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import * as ImagePicker from "expo-image-picker";
import { X, ImagePlus } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { wishlistsApi } from "@/app/api/wishlists";
import { TWishlistItem } from "@/app/api/events";

type Priority = "low" | "medium" | "high";
const PRIORITIES: Priority[] = ["low", "medium", "high"];

type AddWishlistItemProps = {
  eventId: string;
  participantId: number;
  onItemAdded: (item: TWishlistItem) => void;
  onClose: () => void;
};

export function AddWishlistItem({
  eventId,
  participantId,
  onItemAdded,
  onClose,
}: AddWishlistItemProps) {
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>("low");
  const [isSaving, setIsSaving] = useState(false);

  const pickImage = useCallback(async () => {
    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant access to your photo library to add an image."
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

  const handleSave = useCallback(async () => {
    if (!itemName.trim()) {
      Alert.alert("Required", "Please enter an item name.");
      return;
    }
    if (participantId === 0) {
      Alert.alert("Error", "Unable to find your participant record for this event.");
      return;
    }

    setIsSaving(true);
    try {
      const created = await wishlistsApi.create(eventId, {
        participantId,
        itemName: itemName.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl || undefined,
        priority,
      });
      onItemAdded(created);
      onClose();
    } catch (err) {
      console.error("Failed to create wishlist item:", err);
      Alert.alert("Error", "Failed to save item. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [eventId, participantId, itemName, description, imageUrl, priority, onItemAdded, onClose]);

  return (
    <BottomSheetScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <Pressable
          onPress={onClose}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-background-100"
        >
          <X size={22} color="#0f172a" />
        </Pressable>
        <Text className="text-lg font-bold text-typography-900 flex-1 text-center pr-10">
          Add Wishlist Item
        </Text>
      </View>

      {/* Item Name */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-typography-700 mb-2">
          Item Name <Text className="text-error-500">*</Text>
        </Text>
        <View className="border border-outline-200 rounded-xl px-4 py-3 bg-background-50">
          <BottomSheetTextInput
            value={itemName}
            onChangeText={setItemName}
            placeholder="e.g. Kindle Paperwhite"
            placeholderTextColor="#94a3b8"
            style={{ fontSize: 15, color: "#0f172a" }}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>
      </View>

      {/* Description */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-typography-700 mb-2">
          Description{" "}
          <Text className="text-typography-400 font-normal">(optional)</Text>
        </Text>
        <View className="border border-outline-200 rounded-xl px-4 py-3 bg-background-50">
          <BottomSheetTextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add a note, link, or size..."
            placeholderTextColor="#94a3b8"
            style={{ fontSize: 15, color: "#0f172a", minHeight: 72, textAlignVertical: "top" }}
            multiline
            numberOfLines={3}
            returnKeyType="next"
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
              style={{ width: "100%", height: 180 }}
              resizeMode="cover"
            />
            <Pressable
              onPress={() => setImageUrl(null)}
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 items-center justify-center"
            >
              <X size={14} color="white" />
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

      {/* Priority */}
      <View className="mb-8">
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

      {/* Save Button */}
      <Button
        className="rounded-xl"
        style={{ backgroundColor: "#0d9488" }}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
        ) : null}
        <ButtonText className="text-white font-bold">
          {isSaving ? "Saving..." : "Add to Wishlist"}
        </ButtonText>
      </Button>
    </BottomSheetScrollView>
  );
}
