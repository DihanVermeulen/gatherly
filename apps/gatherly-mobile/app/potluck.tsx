import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Settings, Utensils } from "lucide-react-native";
import axios from "axios";

import { modulesApi, TPotluckCategory, TPotluckSignup } from "./api/modules";
import { useEvents } from "./contexts/EventsContext";
import { useSession } from "./contexts/AuthContext";

import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
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

// ─── showToast helper ─────────────────────────────────────────────────────────

function showToast(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert("", msg);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SelectedSlot = {
  category: TPotluckCategory;
  slotIndex: number;
  suggestionText: string;
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PotluckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    state: { events },
  } = useEvents();
  const { user } = useSession();

  const isOrganizer = user?.participantId === undefined;

  // Data
  const [categories, setCategories] = useState<TPotluckCategory[]>([]);
  const [signups, setSignups] = useState<TPotluckSignup[]>([]);
  const [loading, setLoading] = useState(true);

  // Signup modal state
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Event name from context
  const event = events.find((e) => e.id === id);
  const eventName = event?.name ?? "this event";

  // ─── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, sups] = await Promise.all([
        modulesApi.getPotluckCategories(id as string),
        modulesApi.getPotluckSignups(id as string),
      ]);
      setCategories(cats.filter((c) => c.status === "active"));
      setSignups(sups);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ─── Derived: progress bar calculations ───────────────────────────────────

  const totalQuantity = categories.reduce((sum, c) => sum + c.quantity, 0);
  const totalSignups = signups.length;
  const percentage =
    totalQuantity > 0 ? Math.round((totalSignups / totalQuantity) * 100) : 0;
  const remaining = Math.max(0, totalQuantity - totalSignups);

  // ─── Signup actions ───────────────────────────────────────────────────────

  const handleSignUpPress = (category: TPotluckCategory, slotIndex: number) => {
    const suggestionText =
      category.suggestionChips[slotIndex] ?? category.name;
    setSelectedSlot({ category, slotIndex, suggestionText });
    setNote("");
  };

  const handleConfirmSignup = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      await modulesApi.createPotluckSignup(id as string, {
        categoryId: selectedSlot.category.id,
        participantName: user?.name ?? "Guest",
        note: note.trim() || undefined,
      });
      setSelectedSlot(null);
      setNote("");
      await loadData();
      showToast("You're signed up!");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setSelectedSlot(null);
        showToast("This slot was just taken by someone else");
        await loadData();
      } else {
        showToast("Failed to sign up. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveSignup = (signup: TPotluckSignup, categoryName: string) => {
    Alert.alert(
      "Remove Signup",
      `Remove your signup for ${categoryName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await modulesApi.deletePotluckSignup(id as string, signup.id);
              await loadData();
              showToast("Signup removed");
            } catch {
              showToast("Failed to remove signup.");
            }
          },
        },
      ]
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }} edges={["top", "bottom"]}>
      {/* Header */}
      <AppHeader
        title="Potluck List"
        onBack={() => router.back()}
        rightAction={
          isOrganizer
            ? {
                icon: <Settings size={20} color="#0d9488" />,
                onPress: () => router.push(`/potluck-setup?id=${id}` as any),
              }
            : undefined
        }
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#0d9488" size="large" />
        </View>
      ) : categories.length === 0 ? (
        /* ── Empty state ─────────────────────────────────────────────────── */
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🍽️</Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#0f172a",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            No potluck items yet
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#64748b",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            The organizer hasn't set up the potluck yet.
          </Text>
          {isOrganizer ? (
            <Pressable
              onPress={() => router.push(`/potluck-setup?id=${id}` as any)}
              style={{
                backgroundColor: "#0d9488",
                borderRadius: 12,
                paddingHorizontal: 24,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 15 }}>
                Set Up Potluck
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 12 }}
        >
          {/* ── Event Readiness Progress Bar Card ───────────────────────── */}
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              marginHorizontal: 16,
              marginBottom: 16,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: "#94a3b8",
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Event Readiness
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "800",
                  color: "#0f172a",
                  marginRight: 4,
                }}
              >
                {totalSignups}/{totalQuantity}
              </Text>
              <Text style={{ fontSize: 13, color: "#64748b" }}>Items Claimed</Text>
            </View>
            {/* Progress bar */}
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: "#e5e7eb",
                overflow: "hidden",
                marginBottom: 6,
              }}
            >
              <View
                style={{
                  height: "100%",
                  borderRadius: 4,
                  backgroundColor: "#0d9488",
                  width: `${percentage}%`,
                }}
              />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text
                style={{ fontSize: 12, fontWeight: "700", color: "#0d9488" }}
              >
                {percentage}% Complete
              </Text>
              <Text style={{ fontSize: 12, color: "#94a3b8" }}>
                {remaining} item{remaining !== 1 ? "s" : ""} still needed
              </Text>
            </View>
          </View>

          {/* ── Categories ────────────────────────────────────────────────── */}
          {categories.map((category) => {
            const categorySignups = signups
              .filter((s) => s.categoryId === category.id)
              .sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );

            return (
              <View key={category.id} style={{ marginBottom: 8 }}>
                {/* Category header row */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Utensils size={14} color="#94a3b8" />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: "#94a3b8",
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      }}
                    >
                      {category.name}
                    </Text>
                  </View>
                  {category.foodImageUrl ? (
                    <Image
                      source={{ uri: category.foodImageUrl }}
                      style={{ width: 50, height: 50, borderRadius: 8 }}
                      resizeMode="cover"
                    />
                  ) : null}
                </View>

                {/* Slots */}
                {Array.from({ length: category.quantity }).map((_, slotIndex) => {
                  const signup = categorySignups[slotIndex] ?? null;
                  const suggestionText =
                    category.suggestionChips[slotIndex] ?? category.name;
                  const isMySignup =
                    signup !== null && signup.participantName === (user?.name ?? "Guest");

                  return (
                    <View
                      key={slotIndex}
                      style={{
                        backgroundColor: "#ffffff",
                        marginHorizontal: 16,
                        marginBottom: 8,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.04,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                    >
                      {signup ? (
                        /* Claimed slot */
                        <>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "700",
                                color: "#0f172a",
                                marginBottom: 2,
                              }}
                            >
                              {signup.participantName}
                            </Text>
                            <Text style={{ fontSize: 12, color: "#64748b" }}>
                              {suggestionText}
                            </Text>
                            {signup.note ? (
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: "#94a3b8",
                                  marginTop: 2,
                                  fontStyle: "italic",
                                }}
                              >
                                {signup.note}
                              </Text>
                            ) : null}
                          </View>
                          {isMySignup ? (
                            <Pressable
                              onPress={() =>
                                handleRemoveSignup(signup, category.name)
                              }
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: "#fca5a5",
                                backgroundColor: "#fff1f2",
                                flexShrink: 0,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: "600",
                                  color: "#ef4444",
                                }}
                              >
                                Remove
                              </Text>
                            </Pressable>
                          ) : null}
                        </>
                      ) : (
                        /* Unclaimed slot */
                        <>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 13,
                                color: "#94a3b8",
                                fontStyle: "italic",
                              }}
                            >
                              {suggestionText}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => handleSignUpPress(category, slotIndex)}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 7,
                              borderRadius: 8,
                              backgroundColor: "#0d9488",
                              flexShrink: 0,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color: "#ffffff",
                              }}
                            >
                              Sign Up
                            </Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Signup Confirmation Modal ────────────────────────────────────── */}
      <Modal
        isOpen={selectedSlot !== null}
        onClose={() => {
          setSelectedSlot(null);
          setNote("");
        }}
        size="lg"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#0f172a" }}>
              Sign Up for Item
            </Text>
            <ModalCloseButton
              onPress={() => {
                setSelectedSlot(null);
                setNote("");
              }}
            />
          </ModalHeader>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ModalBody>
              {/* Food image or placeholder */}
              {selectedSlot?.category.foodImageUrl ? (
                <Image
                  source={{ uri: selectedSlot.category.foodImageUrl }}
                  style={{
                    width: "100%",
                    height: 200,
                    borderRadius: 12,
                    marginBottom: 16,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: 120,
                    borderRadius: 12,
                    backgroundColor: "#f1f5f9",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Utensils size={36} color="#cbd5e1" />
                </View>
              )}

              {/* SELECTED ITEM label */}
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: "#0d9488",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Selected Item
              </Text>

              {/* Item name */}
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#0f172a",
                  marginBottom: 4,
                }}
              >
                {selectedSlot?.suggestionText ?? selectedSlot?.category.name}
              </Text>

              {/* Requested for */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 13, color: "#64748b" }}>
                  Requested for {eventName}
                </Text>
              </View>

              {/* Description */}
              <Text
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  lineHeight: 19,
                  marginBottom: 16,
                }}
              >
                Confirm you're bringing this item and let others know about any
                specific details like ingredients or if it's store-bought.
              </Text>

              {/* Optional Note */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 6,
                }}
              >
                Optional Note
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g., Homemade, contains dairy, gluten-free..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                style={{
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: "#0f172a",
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
              />
            </ModalBody>
            <ModalFooter style={{ flexDirection: "column", gap: 8 }}>
              <Button
                style={{
                  backgroundColor: "#0d9488",
                  borderRadius: 12,
                  width: "100%",
                }}
                onPress={handleConfirmSignup}
                disabled={submitting}
              >
                <ButtonText
                  style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}
                >
                  {submitting ? "Confirming..." : "Confirm"}
                </ButtonText>
              </Button>
              <Pressable
                onPress={() => {
                  setSelectedSlot(null);
                  setNote("");
                }}
                style={{ alignItems: "center", paddingVertical: 8 }}
              >
                <Text style={{ fontSize: 14, color: "#64748b" }}>Cancel</Text>
              </Pressable>
            </ModalFooter>
          </KeyboardAvoidingView>
        </ModalContent>
      </Modal>
    </SafeAreaView>
  );
}
