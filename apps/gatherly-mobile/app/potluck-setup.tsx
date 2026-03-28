import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Minus, Plus, Trash2, Utensils, X } from "lucide-react-native";

import { modulesApi, TPotluckCategory } from "./api/modules";
import { useEvents } from "./contexts/EventsContext";
import { useSession } from "./contexts/AuthContext";
import { isSafeImageUri } from "./utils/imageUri";

import { PaywallModal } from "@/components/PaywallModal";

import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/AppHeader";

// ─── Local type alias supporting temp IDs ─────────────────────────────────────

type LocalCategory = Omit<TPotluckCategory, "id"> & { id: number | string };

// ─── showToast helper ────────────────────────────────────────────────────────

function showToast(message: string) {
  if (Platform.OS === "android") {
    const { ToastAndroid } = require("react-native");
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert("", message);
  }
}

// ─── Suggestion chip input ────────────────────────────────────────────────────

type ChipInputProps = {
  chips: string[];
  onAddChip: (chip: string) => void;
  onRemoveChip: (chip: string) => void;
};

function ChipInput({ chips, onAddChip, onRemoveChip }: ChipInputProps) {
  const [inputValue, setInputValue] = useState("");

  const submitChip = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !chips.includes(trimmed)) {
      onAddChip(trimmed);
      setInputValue("");
    }
  };

  return (
    <View>
      {/* Existing chips */}
      {chips.length > 0 ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 8,
          }}
        >
          {chips.map((chip) => (
            <View
              key={chip}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#ccfbf1",
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 4,
                gap: 4,
              }}
            >
              <Text
                style={{ fontSize: 12, color: "#0f766e", fontWeight: "600" }}
              >
                {chip}
              </Text>
              <Pressable
                onPress={() => onRemoveChip(chip)}
                style={{ padding: 1 }}
              >
                <X size={12} color="#0f766e" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {/* Add chip input */}
      <View
        style={{
          borderWidth: 1,
          borderColor: "#e2e8f0",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: "#f8fafc",
        }}
      >
        <TextInput
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={submitChip}
          onBlur={submitChip}
          placeholder="Add suggestion (e.g. Lasagne)"
          placeholderTextColor="#94a3b8"
          style={{ fontSize: 13, color: "#0f172a" }}
          returnKeyType="done"
          blurOnSubmit={false}
        />
      </View>
    </View>
  );
}

// ─── Category card ────────────────────────────────────────────────────────────

type CategoryCardProps = {
  cat: LocalCategory;
  eventId: string;
  onUpdate: (updated: TPotluckCategory) => void;
  onDelete: (catId: number | string) => void;
  onReplace: (tempId: number | string, serverCat: TPotluckCategory) => void;
};

function CategoryCard({
  cat,
  eventId,
  onUpdate,
  onDelete,
  onReplace,
}: CategoryCardProps) {
  const [name, setName] = useState(cat.name);
  const [quantity, setQuantity] = useState(cat.quantity);
  const [foodImageUrl, setFoodImageUrl] = useState<string | null>(
    cat.foodImageUrl,
  );
  const [chips, setChips] = useState<string[]>(cat.suggestionChips ?? []);
  const [deleting, setDeleting] = useState(false);

  const isTemp =
    typeof cat.id === "string" && String(cat.id).startsWith("temp-");

  // Save on blur or quantity change (persisted categories only)
  const saveCategory = useCallback(
    async (
      patch: Partial<{
        name: string;
        quantity: number;
        foodImageUrl: string | null;
        suggestionChips: string[];
      }>,
    ) => {
      // Guard: never call update API for temp (unsaved) categories
      if (typeof cat.id === "string" && String(cat.id).startsWith("temp-"))
        return;

      try {
        const updated = await modulesApi.updatePotluckCategory(
          eventId,
          cat.id as number,
          patch,
        );
        onUpdate(updated);
      } catch {
        // Silent — user can retry
      }
    },
    [eventId, cat.id, onUpdate],
  );

  const handleNameBlur = async () => {
    if (isTemp) {
      if (!name.trim()) {
        onDelete(cat.id);
        return;
      }
      try {
        const created = await modulesApi.createPotluckCategory(eventId, {
          name: name.trim(),
          quantity,
          foodImageUrl: foodImageUrl ?? undefined,
          suggestionChips: chips,
        });
        onReplace(cat.id, created);
      } catch {
        showToast("Failed to save category. Please try again.");
      }
    } else {
      saveCategory({ name, quantity, foodImageUrl, suggestionChips: chips });
    }
  };

  const handleQuantityChange = (newQty: number) => {
    const clamped = Math.max(1, Math.min(50, newQty));
    setQuantity(clamped);
    saveCategory({
      name,
      quantity: clamped,
      foodImageUrl,
      suggestionChips: chips,
    });
  };

  const handleAddChip = (chip: string) => {
    const updated = [...chips, chip];
    setChips(updated);
    saveCategory({ name, quantity, foodImageUrl, suggestionChips: updated });
  };

  const handleRemoveChip = (chip: string) => {
    const updated = chips.filter((c) => c !== chip);
    setChips(updated);
    saveCategory({ name, quantity, foodImageUrl, suggestionChips: updated });
  };

  const pickFoodImage = useCallback(async () => {
    try {
      const permResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant access to your photo library to add a food image.",
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
        const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setFoodImageUrl(dataUri);
        saveCategory({
          name,
          quantity,
          foodImageUrl: dataUri,
          suggestionChips: chips,
        });
      }
    } catch {
      // Silent
    }
  }, [name, quantity, chips, saveCategory]);

  const handleDelete = useCallback(async () => {
    // Guard: temp categories are never in the DB — just remove locally
    if (typeof cat.id === "string" && String(cat.id).startsWith("temp-")) {
      onDelete(cat.id);
      return;
    }

    setDeleting(true);
    try {
      await modulesApi.deletePotluckCategory(eventId, cat.id as number);
      onDelete(cat.id);
    } catch {
      setDeleting(false);
      showToast("Failed to delete category. Please try again.");
    }
  }, [eventId, cat.id, onDelete]);

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      }}
    >
      {/* Card header: CATEGORY label + delete */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: "#94a3b8",
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          Category
        </Text>
        <Pressable
          onPress={handleDelete}
          disabled={deleting}
          style={{ padding: 4, opacity: deleting ? 0.4 : 1 }}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Trash2 size={16} color="#ef4444" />
          )}
        </Pressable>
      </View>

      {/* Food image + name row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 14,
        }}
      >
        {/* Food image thumbnail */}
        <Pressable
          onPress={pickFoodImage}
          style={{
            width: 72,
            height: 72,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "#f0fdfa",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#e2e8f0",
            flexShrink: 0,
          }}
        >
          {isSafeImageUri(foodImageUrl) ? (
            <Image
              source={{ uri: foodImageUrl! }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ alignItems: "center", gap: 4 }}>
              <Utensils size={20} color="#0d9488" />
              <Text
                style={{ fontSize: 9, color: "#0d9488", fontWeight: "600" }}
              >
                Add photo
              </Text>
            </View>
          )}
        </Pressable>

        {/* Category name input */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#64748b",
              marginBottom: 6,
            }}
          >
            Name
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: "#f8fafc",
            }}
          >
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={handleNameBlur}
              placeholder="Category name"
              placeholderTextColor="#94a3b8"
              style={{ fontSize: 15, color: "#0f172a" }}
              autoCapitalize="words"
              returnKeyType="done"
              autoFocus={isTemp}
            />
          </View>
        </View>
      </View>

      {/* Quantity stepper */}
      <View style={{ marginBottom: 14 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: "#64748b",
            marginBottom: 8,
          }}
        >
          Quantity needed
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Pressable
            onPress={() => handleQuantityChange(quantity - 1)}
            style={{
              height: 40,
              width: 40,
              borderRadius: 20,
              backgroundColor: "#f1f5f9",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Minus size={18} color="#374151" />
          </Pressable>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#0f172a",
              minWidth: 32,
              textAlign: "center",
            }}
          >
            {quantity}
          </Text>
          <Pressable
            onPress={() => handleQuantityChange(quantity + 1)}
            style={{
              height: 40,
              width: 40,
              borderRadius: 20,
              backgroundColor: "#f1f5f9",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={18} color="#374151" />
          </Pressable>
        </View>
      </View>

      {/* Suggestion chips */}
      <View>
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: "#64748b",
            marginBottom: 8,
          }}
        >
          Suggestions
        </Text>
        <ChipInput
          chips={chips}
          onAddChip={handleAddChip}
          onRemoveChip={handleRemoveChip}
        />
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PotluckSetupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    state: { events },
  } = useEvents();
  const { user } = useSession();

  const scrollRef = useRef<ScrollView>(null);

  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const event = events.find((e) => e.id === id) ?? null;
  const isFree = (event?.planTier ?? "free") === "free";
  const isOrganizer = user?.participantId === undefined;

  // Load categories on mount
  useEffect(() => {
    (async () => {
      try {
        const cats = await modulesApi.getPotluckCategories(id);
        setCategories(cats);
      } catch {
        // Empty state
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Update a category in local state
  const handleCategoryUpdate = useCallback((updated: TPotluckCategory) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
  }, []);

  // Remove a category from local state
  const handleCategoryDelete = useCallback((catId: number | string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  }, []);

  // Replace a temp category with the server-assigned one after creation
  const handleCategoryReplace = useCallback(
    (tempId: number | string, serverCat: TPotluckCategory) => {
      setCategories((prev) =>
        prev.map((c) => (c.id === tempId ? serverCat : c)),
      );
    },
    [],
  );

  // Add new category — local-first, no API call yet
  const handleAddCategory = useCallback(() => {
    if (isFree && categories.length >= 3) {
      setShowPaywall(true);
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const tempCat: LocalCategory = {
      id: tempId,
      eventId: parseInt(id, 10),
      name: "",
      quantity: 1,
      foodImageUrl: null,
      suggestionChips: [],
      status: "draft",
      sortOrder: categories.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, tempCat]);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [id, categories.length]);

  // Publish potluck
  const handlePublish = useCallback(async () => {
    // Guard: block publish if any category hasn't been named yet
    const hasUnsavedTemp = categories.some(
      (c) => typeof c.id === "string" && String(c.id).startsWith("temp-"),
    );
    if (hasUnsavedTemp) {
      showToast("Please name all categories before publishing.");
      return;
    }

    if (categories.length === 0) {
      showToast("Add at least one category before publishing.");
      return;
    }

    setSaving(true);
    try {
      // 1. Update all categories to active status
      await Promise.all(
        categories.map((cat) =>
          modulesApi.updatePotluckCategory(id, cat.id as number, {
            status: "active",
          }),
        ),
      );

      // 2. Load current modules and merge potluck without wiping others
      const currentModules = await modulesApi.getModules(id);
      const otherModules = currentModules
        .filter((m) => m.moduleType !== "potluck" && m.status === "active")
        .map((m) => ({ type: m.moduleType, status: "active", config: {} }));

      const merged = [
        ...otherModules,
        { type: "potluck", status: "active", config: {} },
      ];
      await modulesApi.setModules(id, merged);

      // 3. Refresh local categories to show active status
      const updated = await modulesApi.getPotluckCategories(id);
      setCategories(updated);

      showToast("Potluck published successfully!");
      router.back();
    } catch {
      showToast("Failed to publish. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [id, categories, router]);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#ffffff" }}
        edges={["bottom"]}
      >
        <AppHeader title="Setup Potluck" onBack={() => router.back()} />
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color="#0d9488" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Check if already published ────────────────────────────────────────────

  const allActive =
    categories.length > 0 && categories.every((c) => c.status === "active");
  const publishLabel = allActive ? "Update & Save" : "Save and Publish";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      edges={["bottom"]}
    >
      <AppHeader
        title="Setup Potluck"
        onBack={() => router.back()}
        rightAction={{
          label: "Preview",
          onPress: () => router.push(`/potluck?id=${id}` as any),
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header text */}
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: "#0f172a",
              marginBottom: 4,
            }}
          >
            Configure Items
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#64748b",
              marginBottom: 20,
              lineHeight: 20,
            }}
          >
            Define what guests should bring and how many of each item you need
            for the party.
          </Text>

          {/* Free-tier category counter */}
          {isFree && categories.length >= 2 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#fffbeb",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 13, color: "#92400e", fontWeight: "600" }}>
                {categories.length} of 3 categories
              </Text>
              <Text style={{ fontSize: 13, color: "#92400e", marginLeft: 4 }}>
                · Upgrade for unlimited
              </Text>
            </View>
          )}

          {/* Empty state */}
          {categories.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                padding: 32,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                borderStyle: "dashed",
                backgroundColor: "#f8fafc",
                marginBottom: 16,
              }}
            >
              <Utensils size={32} color="#94a3b8" />
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#64748b",
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                No categories yet
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#94a3b8",
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                Tap below to add your first potluck category!
              </Text>
            </View>
          ) : null}

          {/* Category cards */}
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              eventId={id}
              onUpdate={handleCategoryUpdate}
              onDelete={handleCategoryDelete}
              onReplace={handleCategoryReplace}
            />
          ))}

          {/* Add New Category button */}
          <Pressable
            onPress={handleAddCategory}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#0d9488",
              borderStyle: "dashed",
              paddingVertical: 14,
              marginBottom: 24,
              backgroundColor: "#f0fdfa",
            }}
          >
            <Plus size={18} color="#0d9488" />
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#0d9488" }}>
              Add New Category
            </Text>
          </Pressable>

          {/* Save and Publish button */}
          <Pressable
            onPress={handlePublish}
            disabled={saving}
            style={{
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              backgroundColor: saving ? "#0f766e" : "#0d9488",
            }}
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text
                  style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}
                >
                  Publishing...
                </Text>
              </>
            ) : (
              <Text
                style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}
              >
                {publishLabel}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="potluck_trial"
        eventId={id}
        isParticipant={false}
      />
    </SafeAreaView>
  );
}
