import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  MoreVertical,
  Users,
  Gift,
  ChevronRight,
} from "lucide-react-native";

import { useEvents } from "./contexts/EventsContext";
import { useSession } from "./contexts/AuthContext";

import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Avatar, AvatarFallbackText } from "@/components/ui/avatar";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "react-native-safe-area-context";

// Colour palette matching the Events list hero blocks
const HERO_COLORS = [
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
  "#f43f5e", // rose-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
];

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    state: { events },
  } = useEvents();
  const { user } = useSession();

  const [assignmentRevealed, setAssignmentRevealed] = useState(false);

  // Find the event
  const eventIndex = events.findIndex((e) => e.id === id);
  const event = events[eventIndex] ?? null;

  // Edge case: event not found
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

  // Derived values
  const hasAssignments =
    event.assignments !== null && event.assignments !== undefined;
  const isActive = hasAssignments;
  const heroColor = HERO_COLORS[eventIndex % HERO_COLORS.length];
  const memberCount = event.people?.length ?? 0;
  const giftCount = Object.keys(event.gifts ?? {}).length;

  // Current user's assignment
  const myAssignment: string[] = event.assignments?.[user?.name ?? ""] ?? [];

  return (
    <SafeAreaView
      className="h-full w-full max-w-7xl mx-auto bg-background-0"
      edges={["bottom"]}
    >
      <View className="flex-1 bg-background-0">
        {/* ── Header bar ─────────────────────────────────────────── */}
        <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 rounded-full bg-background-100 items-center justify-center active:opacity-70"
          >
            <ArrowLeft size={20} color="#0f172a" />
          </Pressable>
          <Pressable
            className="h-10 w-10 rounded-full bg-background-100 items-center justify-center active:opacity-70"
            onPress={() => {
              // Stub: event options menu (future phase)
              console.log("Event options");
            }}
          >
            <MoreVertical size={20} color="#0f172a" />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* ── Hero block ─────────────────────────────────────────── */}
          <View
            className="mx-4 rounded-2xl h-48 items-center justify-center"
            style={{ backgroundColor: heroColor }}
          >
            <Text
              className="text-white font-bold"
              style={{ fontSize: 72, lineHeight: 80, opacity: 0.9 }}
            >
              {event.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View className="px-4 mt-4">
            {/* ── Status badge ───────────────────────────────────────── */}
            <View className="flex-row mb-2">
              <View
                className={`rounded-full px-3 py-1 ${
                  isActive ? "bg-emerald-100" : "bg-blue-100"
                }`}
              >
                <Text
                  className={`text-xs font-bold uppercase tracking-wide ${
                    isActive ? "text-emerald-700" : "text-blue-700"
                  }`}
                >
                  {isActive ? "Active" : "Planning"}
                </Text>
              </View>
            </View>

            {/* ── Event name ─────────────────────────────────────────── */}
            <Text className="text-3xl font-bold text-typography-900 mb-2">
              {event.name}
            </Text>

            {/* ── Stats row ──────────────────────────────────────────── */}
            <View className="flex-row items-center gap-3 mb-6">
              <View className="flex-row items-center gap-1.5">
                <Users size={14} color="#64748b" />
                <Text className="text-sm text-typography-500">
                  {memberCount} {memberCount === 1 ? "Member" : "Members"}
                </Text>
              </View>
              <Text className="text-typography-300 text-sm">|</Text>
              <View className="flex-row items-center gap-1.5">
                <Gift size={14} color="#64748b" />
                <Text className="text-sm text-typography-500">
                  {giftCount} {giftCount === 1 ? "Gift" : "Gifts"}
                </Text>
              </View>
              {event.eventDate ? (
                <>
                  <Text className="text-typography-300 text-sm">|</Text>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-sm text-typography-500">
                      {new Date(event.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>

            {/* ── Wishlist progress ─────────────────────────── */}
            {(event.totalWishlistCount ?? 0) > 0 ? (
              <View className="rounded-2xl border border-outline-100 bg-white p-4 mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-bold text-typography-700">Wishlists Progress</Text>
                  <Text className="text-sm font-bold text-teal-600">
                    {event.claimedCount ?? 0}/{event.totalWishlistCount ?? 0} claimed
                  </Text>
                </View>
                <View className="h-2 rounded-full bg-background-100 overflow-hidden">
                  <View
                    className="h-full rounded-full bg-teal-500"
                    style={{
                      width: `${Math.round(((event.claimedCount ?? 0) / (event.totalWishlistCount ?? 1)) * 100)}%`,
                    }}
                  />
                </View>
              </View>
            ) : null}

            {/* ── Countdown banner ──────────────────────────── */}
            {event.eventDate ? (() => {
              const now = new Date();
              const eventDate = new Date(event.eventDate);
              const diffMs = eventDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              if (diffDays <= 0) return null;
              return (
                <View className="rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-2" style={{ backgroundColor: "#fef3c7" }}>
                  <Text className="text-2xl">🎁</Text>
                  <Text className="text-sm font-semibold" style={{ color: "#92400e" }}>
                    {diffDays === 1 ? "Tomorrow is the day!" : `${diffDays} days to go!`}
                  </Text>
                </View>
              );
            })() : null}

            {/* ── Secret Assignment card ─────────────────────────────── */}
            <View
              className="rounded-2xl p-4 mb-6"
              style={{ backgroundColor: "#f0fdfa" }}
            >
              <Text
                className="font-bold text-lg mb-1"
                style={{ color: "#0f766e" }}
              >
                Your Secret Assignment
              </Text>

              {!hasAssignments ? (
                /* No assignments generated yet */
                <Text className="text-sm text-typography-500 mt-1">
                  Assignments haven't been generated yet. The event organizer
                  will generate them when everyone is ready.
                </Text>
              ) : myAssignment.length === 0 ? (
                /* User not in assignment map */
                <Text className="text-sm text-typography-500 mt-1">
                  No assignment found for your account. Make sure your name
                  matches the participant list.
                </Text>
              ) : (
                /* Assignment exists */
                <>
                  <Text className="text-sm text-typography-600 mt-1 leading-5">
                    {assignmentRevealed
                      ? `You are buying for: ${myAssignment.join(", ")}`
                      : "Shh! It's a secret. Tap the button to reveal who you are buying for."}
                  </Text>
                  <Button
                    className="mt-3 rounded-xl"
                    style={{ backgroundColor: "#0f766e" }}
                    onPress={() => setAssignmentRevealed((prev) => !prev)}
                  >
                    {assignmentRevealed ? (
                      <EyeOff
                        size={16}
                        color="white"
                        style={{ marginRight: 6 }}
                      />
                    ) : (
                      <Eye size={16} color="white" style={{ marginRight: 6 }} />
                    )}
                    <ButtonText className="text-white font-semibold">
                      {assignmentRevealed
                        ? "Hide Assignment"
                        : "View My Assignment"}
                    </ButtonText>
                  </Button>
                </>
              )}
            </View>

            {/* ── Participants section ───────────────────────────────── */}
            <View>
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-lg font-bold text-typography-900">
                  Participants
                </Text>
                <Text className="text-sm text-typography-400">
                  Invite Members
                </Text>
              </View>

              {memberCount === 0 ? (
                <View className="rounded-xl border border-outline-100 p-6 items-center">
                  <Users size={28} color="#cbd5e1" />
                  <Text className="text-typography-400 text-sm mt-2 text-center">
                    No participants yet.
                  </Text>
                </View>
              ) : (
                <View className="rounded-2xl border border-outline-100 overflow-hidden">
                  {event.people.map((name, idx) => {
                    const isCurrentUser = name === user?.name;
                    const isOrganizer =
                      isCurrentUser && user?.role === "organizer";

                    return (
                      <View
                        key={name}
                        className={`flex-row items-center px-4 py-3 ${
                          idx < event.people.length - 1
                            ? "border-b border-outline-100"
                            : ""
                        }`}
                      >
                        {/* Avatar */}
                        <Avatar
                          size="sm"
                          className={
                            isOrganizer ? "bg-teal-500" : "bg-slate-400"
                          }
                        >
                          <AvatarFallbackText className="text-white">
                            {name}
                          </AvatarFallbackText>
                        </Avatar>

                        {/* Name */}
                        <Text className="flex-1 ml-3 font-semibold text-typography-900">
                          {name}
                          {isCurrentUser ? (
                            <Text className="font-normal text-typography-400">
                              {" (you)"}
                            </Text>
                          ) : null}
                        </Text>

                        {/* Role badge */}
                        <View
                          className={`rounded-full px-2.5 py-0.5 mr-2 ${
                            isOrganizer ? "bg-teal-100" : "bg-slate-100"
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold uppercase tracking-wide ${
                              isOrganizer ? "text-teal-700" : "text-slate-500"
                            }`}
                          >
                            {isOrganizer ? "Organizer" : "Participant"}
                          </Text>
                        </View>

                        {/* Chevron */}
                        <ChevronRight size={16} color="#94a3b8" />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* ── Bottom action bar ──────────────────────────────────────── */}
        <View
          className="absolute bottom-0 left-0 right-0 flex-row gap-3 px-4 py-3 bg-white border-t border-outline-100"
          style={{ paddingBottom: 16 }}
        >
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-outline-300"
            onPress={() => router.push(`/view-wishlists?id=${id}`)}
          >
            <Gift size={16} color="#64748b" style={{ marginRight: 6 }} />
            <ButtonText className="text-typography-700 font-semibold">
              View Wishlists
            </ButtonText>
          </Button>
          <Button
            className="flex-1 rounded-xl"
            style={{ backgroundColor: "#0d9488" }}
            onPress={() => router.push(`/my-wishlist?id=${event.id}`)}
          >
            <ButtonText className="text-white font-semibold">
              + Add My Gifts
            </ButtonText>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
