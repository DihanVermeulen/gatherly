import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check, Minus, Plus, Users } from "lucide-react-native";

import { modulesApi, TRsvpResponse, TRsvpSummary } from "./api/modules";
import { useSession } from "./contexts/AuthContext";

import { Text } from "@/components/ui/text";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "react-native-safe-area-context";

type RsvpStatus = "accepted" | "declined" | "maybe";

const STATUS_OPTIONS: { value: RsvpStatus; label: string; emoji: string; color: string; bg: string }[] = [
  { value: "accepted", label: "Accepted", emoji: "✓", color: "#059669", bg: "#d1fae5" },
  { value: "maybe",    label: "Maybe",    emoji: "~", color: "#d97706", bg: "#fef3c7" },
  { value: "declined", label: "Declined", emoji: "✕", color: "#dc2626", bg: "#fee2e2" },
];

export default function RsvpScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const isOrganizer = user?.role === "organizer";

  // Organizer state
  const [summary, setSummary] = useState<TRsvpSummary | null>(null);
  // Participant state
  const [selectedStatus, setSelectedStatus] = useState<RsvpStatus | null>(null);
  const [headcount, setHeadcount] = useState(1);
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (isOrganizer) {
        const data = await modulesApi.getRsvp(id);
        setSummary(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id, isOrganizer]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    if (!selectedStatus) return;
    setSubmitting(true);
    try {
      await modulesApi.submitRsvp(id, {
        status: selectedStatus,
        headcount: selectedStatus === "accepted" ? headcount : 1,
        note: note.trim() || undefined,
      });
      setSubmitted(true);
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s: string) => {
    return STATUS_OPTIONS.find((o) => o.value === s) ?? STATUS_OPTIONS[0];
  };

  // ── Organizer view ────────────────────────────────────────────────
  if (isOrganizer) {
    return (
      <SafeAreaView className="flex-1 bg-background-50" edges={["bottom"]}>
        <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 rounded-full bg-background-100 items-center justify-center active:opacity-70"
          >
            <ArrowLeft size={20} color="#0f172a" />
          </Pressable>
          <Text className="text-lg font-bold text-typography-900">RSVP Responses</Text>
          <View className="w-10" />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0d9488" />
          </View>
        ) : summary ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16, paddingTop: 8 }}
          >
            {/* Summary cards */}
            <View className="flex-row gap-3 mb-5">
              <View className="flex-1 rounded-2xl bg-white border border-outline-100 p-4 items-center">
                <Text className="text-2xl font-bold text-typography-900">
                  {summary.summary.accepted}
                </Text>
                <Text className="text-xs text-typography-500 mt-0.5">Accepted</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-white border border-outline-100 p-4 items-center">
                <Text className="text-2xl font-bold text-typography-900">
                  {summary.summary.maybe}
                </Text>
                <Text className="text-xs text-typography-500 mt-0.5">Maybe</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-white border border-outline-100 p-4 items-center">
                <Text className="text-2xl font-bold text-typography-900">
                  {summary.summary.declined}
                </Text>
                <Text className="text-xs text-typography-500 mt-0.5">Declined</Text>
              </View>
            </View>

            {/* Headcount */}
            <View
              className="rounded-2xl flex-row items-center px-4 py-3 mb-5"
              style={{ backgroundColor: "#f0fdfa" }}
            >
              <Users size={18} color="#0d9488" />
              <Text className="ml-2 text-sm font-semibold" style={{ color: "#0f766e" }}>
                Total confirmed headcount: {summary.summary.totalHeadcount}
              </Text>
            </View>

            {/* Response list */}
            {summary.responses.length === 0 ? (
              <View className="items-center py-10">
                <Text className="text-typography-400 text-sm">No responses yet.</Text>
              </View>
            ) : (
              <>
                <Text className="text-sm font-bold text-typography-700 mb-2">
                  All Responses ({summary.summary.total})
                </Text>
                {summary.responses.map((r) => {
                  const st = statusColor(r.status);
                  return (
                    <View
                      key={r.id}
                      className="rounded-2xl bg-white border border-outline-100 px-4 py-3 mb-2 flex-row items-center"
                    >
                      <View
                        className="h-9 w-9 rounded-full items-center justify-center mr-3 flex-shrink-0"
                        style={{ backgroundColor: st.bg }}
                      >
                        <Text className="text-sm font-bold" style={{ color: st.color }}>
                          {st.emoji}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-typography-900">
                          {r.participantName}
                        </Text>
                        {r.note ? (
                          <Text className="text-xs text-typography-400 mt-0.5">"{r.note}"</Text>
                        ) : null}
                      </View>
                      <View className="items-end">
                        <View
                          className="rounded-full px-2 py-0.5"
                          style={{ backgroundColor: st.bg }}
                        >
                          <Text className="text-xs font-bold capitalize" style={{ color: st.color }}>
                            {r.status}
                          </Text>
                        </View>
                        {r.status === "accepted" && r.headcount > 1 && (
                          <Text className="text-xs text-typography-400 mt-0.5">
                            +{r.headcount - 1} guests
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    );
  }

  // ── Participant view ──────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-background-50" edges={["bottom"]}>
      <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 rounded-full bg-background-100 items-center justify-center active:opacity-70"
        >
          <ArrowLeft size={20} color="#0f172a" />
        </Pressable>
        <Text className="text-lg font-bold text-typography-900">RSVP</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16, paddingTop: 16 }}
      >
        {submitted ? (
          <View className="items-center py-16 px-8">
            <View
              className="h-20 w-20 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: "#d1fae5" }}
            >
              <Check size={36} color="#059669" />
            </View>
            <Text className="text-xl font-bold text-typography-900 text-center">
              RSVP Submitted!
            </Text>
            <Text className="text-sm text-typography-500 text-center mt-2">
              Your response has been recorded. You can update it anytime.
            </Text>
            <Button
              className="mt-6 rounded-xl px-8"
              style={{ backgroundColor: "#0d9488" }}
              onPress={() => setSubmitted(false)}
            >
              <ButtonText className="text-white font-semibold">Update Response</ButtonText>
            </Button>
          </View>
        ) : (
          <>
            <Text className="text-xl font-bold text-typography-900 mb-1">
              Will you attend?
            </Text>
            <Text className="text-sm text-typography-500 mb-6">
              Let the organizer know if you're coming.
            </Text>

            {/* Status buttons */}
            <View className="flex-row gap-3 mb-6">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setSelectedStatus(opt.value)}
                    className="flex-1 rounded-2xl py-4 items-center border-2 active:opacity-80"
                    style={{
                      borderColor: isSelected ? opt.color : "#e2e8f0",
                      backgroundColor: isSelected ? opt.bg : "white",
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{opt.emoji === "✓" ? "✅" : opt.emoji === "~" ? "🤔" : "❌"}</Text>
                    <Text
                      className="text-xs font-bold mt-1"
                      style={{ color: isSelected ? opt.color : "#64748b" }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Guest count (only shown for accepted) */}
            {selectedStatus === "accepted" && (
              <View className="rounded-2xl bg-white border border-outline-100 p-4 mb-4">
                <Text className="text-sm font-bold text-typography-800 mb-3">
                  How many guests (including you)?
                </Text>
                <View className="flex-row items-center justify-between">
                  <Pressable
                    onPress={() => setHeadcount(Math.max(1, headcount - 1))}
                    className="h-10 w-10 rounded-full bg-background-100 items-center justify-center active:opacity-70"
                  >
                    <Minus size={18} color="#374151" />
                  </Pressable>
                  <Text className="text-2xl font-bold text-typography-900">
                    {headcount}
                  </Text>
                  <Pressable
                    onPress={() => setHeadcount(headcount + 1)}
                    className="h-10 w-10 rounded-full bg-background-100 items-center justify-center active:opacity-70"
                  >
                    <Plus size={18} color="#374151" />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Note */}
            <View className="rounded-2xl bg-white border border-outline-100 p-4 mb-6">
              <Text className="text-sm font-bold text-typography-800 mb-2">
                Note (optional)
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Running 10 minutes late!"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                style={{
                  fontSize: 14,
                  color: "#0f172a",
                  minHeight: 60,
                  textAlignVertical: "top",
                }}
              />
            </View>

            {/* Submit */}
            <Button
              className="rounded-2xl py-4"
              style={{
                backgroundColor: selectedStatus ? "#0d9488" : "#cbd5e1",
              }}
              onPress={handleSubmit}
              disabled={!selectedStatus || submitting}
            >
              {submitting ? <ButtonSpinner color="white" /> : null}
              <ButtonText className="text-white font-bold text-base ml-1">
                Submit RSVP
              </ButtonText>
            </Button>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
