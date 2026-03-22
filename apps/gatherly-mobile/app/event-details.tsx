import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Image,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Gift,
  ChevronRight,
  BarChart2,
  CheckSquare,
  Utensils,
  Lock,
  Camera,
  DollarSign,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { modulesApi } from "./api/modules";
import { eventsApi, TEventModule } from "./api/events";

import { useEvents } from "./contexts/EventsContext";
import { useSession } from "./contexts/AuthContext";

import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast, Toast, ToastTitle } from "@/components/ui/toast";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = 260;

// ─── Module catalog ────────────────────────────────────────────────────────────

type ModuleCategory = "ACTIVITY" | "COLLABORATION" | "MEMORIES";

type ModuleCatalogEntry = {
  type: string;
  label: string;
  description: string;
  icon: (color: string) => React.ReactNode;
  category: ModuleCategory;
  comingSoon?: boolean;
};

const MODULE_CATALOG: ModuleCatalogEntry[] = [
  // ACTIVITY
  {
    type: "gift_exchange",
    label: "Gift Exchange",
    description: "Join the secret santa pool",
    icon: (color) => <Gift size={18} color={color} />,
    category: "ACTIVITY",
  },
  {
    type: "white_elephant",
    label: "White Elephant",
    description: "Fun group gift exchange game",
    icon: (color) => <Gift size={18} color={color} />,
    category: "ACTIVITY",
    comingSoon: true,
  },
  // COLLABORATION
  {
    type: "potluck",
    label: "Potluck",
    description: "Coordinate food and drink signups",
    icon: (color) => <Utensils size={18} color={color} />,
    category: "COLLABORATION",
  },
  {
    type: "polls",
    label: "Polls",
    description: "Let guests vote on event details",
    icon: (color) => <BarChart2 size={18} color={color} />,
    category: "COLLABORATION",
  },
  {
    type: "rsvp",
    label: "RSVP",
    description: "Collect attendance confirmations",
    icon: (color) => <CheckSquare size={18} color={color} />,
    category: "COLLABORATION",
  },
  {
    type: "expense_splitter",
    label: "Expense Splitter",
    description: "Split costs among guests",
    icon: (color) => <DollarSign size={18} color={color} />,
    category: "COLLABORATION",
    comingSoon: true,
  },
  // MEMORIES
  {
    type: "photo_gallery",
    label: "Photo Gallery",
    description: "Share event photos",
    icon: (color) => <Camera size={18} color={color} />,
    category: "MEMORIES",
    comingSoon: true,
  },
];

const CATEGORY_ORDER: ModuleCategory[] = ["ACTIVITY", "COLLABORATION", "MEMORIES"];

// ─── Date badge helpers ────────────────────────────────────────────────────────

function getDateBadge(eventDate: string | null | undefined): {
  label: string;
  bg: string;
  text: string;
} | null {
  if (!eventDate) return null;
  const now = new Date();
  const date = new Date(eventDate);
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = eventDay.getTime() - nowDay.getTime();
  if (diff === 0) return { label: "TODAY", bg: "#f59e0b", text: "#ffffff" };
  if (diff > 0) return { label: "UPCOMING", bg: "#14b8a6", text: "#ffffff" };
  return { label: "PAST", bg: "#64748b", text: "#ffffff" };
}

function formatEventDate(eventDate: string | null | undefined, location: string | null | undefined): string {
  const parts: string[] = [];
  if (eventDate) {
    parts.push(
      new Date(eventDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
  }
  if (location) parts.push(location);
  return parts.join(" • ");
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    state: { events },
  } = useEvents();
  const { user } = useSession();
  const toast = useToast();

  const [assignmentRevealed, setAssignmentRevealed] = useState(false);
  const [activeModules, setActiveModules] = useState<TEventModule[]>([]);
  const [detailCoverPhotoUrl, setDetailCoverPhotoUrl] = useState<string | null>(null);
  const [detailOrganizerName, setDetailOrganizerName] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      modulesApi.getModules(id).then(setActiveModules).catch(() => {});
    }, [id])
  );

  useEffect(() => {
    eventsApi.getById(id).then((detail) => {
      setDetailCoverPhotoUrl(detail.coverPhotoUrl ?? null);
      setDetailOrganizerName(detail.organizerName ?? null);
    }).catch(() => {});
  }, [id]);

  // Find the event
  const event = events.find((e) => e.id === id) ?? null;

  // Edge case: event not found
  if (!event) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff", paddingHorizontal: 32 }}>
        <Text className="text-typography-500 text-base text-center">
          Event not found.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{ marginTop: 16, borderRadius: 12, backgroundColor: "#0d9488", paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "600" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Derived values
  const hasAssignments = event.assignments !== null && event.assignments !== undefined;
  const myAssignment: string[] = event.assignments?.[user?.name ?? ""] ?? [];
  const isOrganizer = user?.participantId === undefined;
  const dateBadge = getDateBadge(event.eventDate);
  const dateLocationLine = formatEventDate(event.eventDate, event.location);

  // Active module types set for fast lookup
  const activeModuleTypes = new Set(
    activeModules.filter((m) => m.status === "active").map((m) => m.moduleType)
  );

  // Module card tap handler
  function handleModuleTap(entry: ModuleCatalogEntry) {
    if (entry.comingSoon) return;
    const isActive = activeModuleTypes.has(entry.type as any);
    if (!isActive) {
      toast.show({
        placement: "bottom",
        duration: 3000,
        render: ({ id: toastId }) => (
          <Toast nativeID={`toast-${toastId}`} action="info" variant="solid">
            <ToastTitle>Enable this module in Module Config to use it</ToastTitle>
          </Toast>
        ),
      });
      return;
    }

    switch (entry.type) {
      case "gift_exchange":
        router.push(`/view-wishlists?id=${id}` as any);
        break;
      case "potluck":
        toast.show({
          placement: "bottom",
          duration: 3000,
          render: ({ id: toastId }) => (
            <Toast nativeID={`toast-${toastId}`} action="info" variant="solid">
              <ToastTitle>Potluck screen coming soon</ToastTitle>
            </Toast>
          ),
        });
        break;
      case "polls":
        router.push(`/polls?id=${id}` as any);
        break;
      case "rsvp":
        router.push(`/rsvp?id=${id}` as any);
        break;
      default:
        break;
    }
  }

  // Gift Exchange status line
  function giftExchangeStatus(): string {
    if (hasAssignments) return "Assignments generated";
    return "Setup needed";
  }

  // Module status line
  function moduleStatusLine(entry: ModuleCatalogEntry): string {
    if (entry.type === "gift_exchange") return giftExchangeStatus();
    return entry.description;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["bottom"]}>
      <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* ── Full-bleed hero ──────────────────────────────────────────── */}
          <View style={{ height: HERO_HEIGHT, width: SCREEN_WIDTH, position: "relative" }}>
            {/* Background: cover photo or teal gradient */}
            {detailCoverPhotoUrl ? (
              <Image
                source={{ uri: detailCoverPhotoUrl }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={["#14b8a6", "#0f766e", "#134e4a"]}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}

            {/* Bottom scrim for text legibility */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.65)"]}
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 140 }}
            />

            {/* Back arrow */}
            <Pressable
              onPress={() => router.back()}
              style={{
                position: "absolute",
                top: Platform.OS === "ios" ? 12 : (StatusBar.currentHeight ?? 0) + 8,
                left: 16,
                height: 40,
                width: 40,
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.3)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowLeft size={20} color="#ffffff" />
            </Pressable>

            {/* Date badge */}
            {dateBadge ? (
              <View
                style={{
                  position: "absolute",
                  top: Platform.OS === "ios" ? 12 : (StatusBar.currentHeight ?? 0) + 8,
                  right: 16,
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  backgroundColor: dateBadge.bg,
                }}
              >
                <Text style={{ color: dateBadge.text, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 }}>
                  {dateBadge.label}
                </Text>
              </View>
            ) : null}

            {/* Event name + date/location overlaid at bottom of hero */}
            <View style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
              <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "800", marginBottom: 4 }} numberOfLines={2}>
                {event.name}
              </Text>
              {dateLocationLine ? (
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
                  {dateLocationLine}
                </Text>
              ) : null}
            </View>
          </View>

          {/* ── Organized by line ──────────────────────────────────────── */}
          {detailOrganizerName ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
              <Text style={{ fontSize: 13, color: "#64748b" }}>
                Organized by {detailOrganizerName}
              </Text>
            </View>
          ) : null}

          {/* ── Create account banner (participant-only sessions) ────── */}
          {user?.participantId !== undefined ? (
            <View
              style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16, backgroundColor: "#f0fdfa" }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0f172a", marginBottom: 4 }}>
                Create an account
              </Text>
              <Text style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>
                Sign up to manage your events and wishlists across devices
              </Text>
              <Button
                size="sm"
                style={{ alignSelf: "flex-start", borderRadius: 8, backgroundColor: "#0d9488" }}
                onPress={() => router.push("/register" as never)}
              >
                <ButtonText style={{ color: "#ffffff", fontWeight: "600" }}>
                  Sign Up
                </ButtonText>
              </Button>
            </View>
          ) : null}

          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            {/* ── Wishlist progress ──────────────────────────────────── */}
            {(event.totalWishlistCount ?? 0) > 0 ? (
              <View style={{ borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#ffffff", padding: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#334155" }}>Wishlists Progress</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#0f766e" }}>
                    {event.claimedCount ?? 0}/{event.totalWishlistCount ?? 0} claimed
                  </Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: "#f1f5f9", overflow: "hidden" }}>
                  <View
                    style={{
                      height: "100%",
                      borderRadius: 4,
                      backgroundColor: "#14b8a6",
                      width: `${Math.round(((event.claimedCount ?? 0) / (event.totalWishlistCount ?? 1)) * 100)}%`,
                    }}
                  />
                </View>
              </View>
            ) : null}

            {/* ── Countdown banner ───────────────────────────────────── */}
            {event.eventDate ? (() => {
              const now = new Date();
              const eventDate = new Date(event.eventDate!);
              const diffMs = eventDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              if (diffDays <= 0) return null;
              return (
                <View style={{ borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fef3c7" }}>
                  <Text style={{ fontSize: 22 }}>🎁</Text>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#92400e" }}>
                    {diffDays === 1 ? "Tomorrow is the day!" : `${diffDays} days to go!`}
                  </Text>
                </View>
              );
            })() : null}

            {/* ── Secret Assignment card ────────────────────────────── */}
            {activeModuleTypes.has('gift_exchange') && (
            <View
              style={{ borderRadius: 16, padding: 16, marginBottom: 24, backgroundColor: "#f0fdfa" }}
            >
              <Text style={{ fontWeight: "700", fontSize: 18, color: "#0f766e", marginBottom: 4 }}>
                Your Secret Assignment
              </Text>

              {!hasAssignments ? (
                <Text style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                  Assignments haven't been generated yet. The event organizer
                  will generate them when everyone is ready.
                </Text>
              ) : myAssignment.length === 0 ? (
                <Text style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                  No assignment found for your account. Make sure your name
                  matches the participant list.
                </Text>
              ) : (
                <>
                  <Text style={{ fontSize: 14, color: "#475569", marginTop: 4, lineHeight: 20 }}>
                    {assignmentRevealed
                      ? `You are buying for: ${myAssignment.join(", ")}`
                      : "Shh! It's a secret. Tap the button to reveal who you are buying for."}
                  </Text>
                  <Button
                    style={{ marginTop: 12, borderRadius: 12, backgroundColor: "#0f766e" }}
                    onPress={() => setAssignmentRevealed((prev) => !prev)}
                  >
                    {assignmentRevealed ? (
                      <EyeOff size={16} color="white" style={{ marginRight: 6 }} />
                    ) : (
                      <Eye size={16} color="white" style={{ marginRight: 6 }} />
                    )}
                    <ButtonText style={{ color: "#ffffff", fontWeight: "600" }}>
                      {assignmentRevealed ? "Hide Assignment" : "View My Assignment"}
                    </ButtonText>
                  </Button>
                </>
              )}
            </View>
            )}

            {/* ── Event Hub section ─────────────────────────────────── */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#0f172a" }}>
                Event Hub
              </Text>
              {isOrganizer ? (
                <Pressable onPress={() => router.push(`/edit-event?id=${id}` as any)}>
                  <Text style={{ fontSize: 14, color: "#0d9488", fontWeight: "600" }}>
                    Manage All
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* ── Module cards grouped by category ─────────────────── */}
            {CATEGORY_ORDER.map((category) => {
              const entries = MODULE_CATALOG.filter((m) => m.category === category);
              return (
                <View key={category} style={{ marginBottom: 20 }}>
                  {/* Category header */}
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: "#94a3b8",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    {category}
                  </Text>

                  {/* Module cards */}
                  <View style={{ borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden", backgroundColor: "#ffffff" }}>
                    {entries.map((entry, idx) => {
                      const isActive = activeModuleTypes.has(entry.type as any);
                      const isComingSoon = entry.comingSoon === true;
                      const isLast = idx === entries.length - 1;
                      const isTappable = isActive && !isComingSoon;
                      const iconColor = isComingSoon || !isActive ? "#94a3b8" : "#0d9488";
                      const iconBg = isComingSoon || !isActive ? "#f8fafc" : "#f0fdfa";

                      // Status line
                      let statusLine: string;
                      if (isComingSoon) {
                        statusLine = "Coming soon";
                      } else if (!isActive) {
                        statusLine = entry.description;
                      } else {
                        statusLine = moduleStatusLine(entry);
                      }

                      return (
                        <Pressable
                          key={entry.type}
                          onPress={() => handleModuleTap(entry)}
                          disabled={isComingSoon}
                          style={({ pressed }: { pressed: boolean }) => ({
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            borderBottomWidth: isLast ? 0 : 1,
                            borderBottomColor: "#e2e8f0",
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          {/* Icon circle */}
                          <View
                            style={{
                              height: 40,
                              width: 40,
                              borderRadius: 12,
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 12,
                              flexShrink: 0,
                              backgroundColor: iconBg,
                            }}
                          >
                            {entry.icon(iconColor)}
                          </View>

                          {/* Text block */}
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 15,
                                fontWeight: "600",
                                color: isComingSoon || !isActive ? "#94a3b8" : "#0f172a",
                                marginBottom: 2,
                              }}
                            >
                              {entry.label}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: isComingSoon || !isActive ? "#cbd5e1" : "#64748b",
                              }}
                            >
                              {statusLine}
                            </Text>
                          </View>

                          {/* Right icon */}
                          {isComingSoon ? (
                            <Lock size={14} color="#cbd5e1" />
                          ) : isTappable ? (
                            <ChevronRight size={16} color="#94a3b8" />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}
