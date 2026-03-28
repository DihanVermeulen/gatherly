import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Share,
  ToastAndroid,
  View,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Settings,
  MapPin,
  Pencil,
  Share2,
  UserPlus,
  X,
  Calendar,
} from "lucide-react-native";
import QRCode from "react-qr-code";
import * as Clipboard from "expo-clipboard";

import { useEvents } from "./contexts/EventsContext";
import { useSession } from "./contexts/AuthContext";
import { eventsApi } from "./api/events";
import { modulesApi } from "./api/modules";
import { isSafeImageUri } from "./utils/imageUri";
import { TEventModule } from "./api/events";
import { invitesApi, Invite } from "./api/invites";

import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Avatar, AvatarFallbackText } from "@/components/ui/avatar";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { PaywallModal } from "@/components/PaywallModal";

const PARTICIPANT_CAP = 20;

// Avatar background colours for participant chips
const AVATAR_COLORS = [
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#f43f5e", // rose-500
];

// Module display metadata
const MODULE_META: Record<string, { label: string; icon: string }> = {
  gift_exchange: { label: "Gift Exchange", icon: "🎁" },
  polls: { label: "Polls", icon: "📊" },
  rsvp: { label: "RSVP", icon: "✅" },
  potluck: { label: "Potluck", icon: "🍽️" },
  white_elephant: { label: "White Elephant", icon: "🐘" },
  photo_gallery: { label: "Photo Gallery", icon: "📷" },
  expense_splitter: { label: "Expense Splitter", icon: "💰" },
};

function formatEventDate(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

function showToast(message: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert("", message);
  }
}

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    state: { events },
    refreshEvents,
  } = useEvents();
  const { user } = useSession();

  // ── State ────────────────────────────────────────────────────────
  const [showPaywall, setShowPaywall] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<Invite | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [giftCount, setGiftCount] = useState(1);
  const [coupleCrossing, setCoupleCrossing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<
    Array<{ participant: string; code: string }>
  >([]);
  const [revealedCodes, setRevealedCodes] = useState<Record<string, boolean>>(
    {},
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [inviteList, setInviteList] = useState<Invite[]>([]);
  const [inviteListLoading, setInviteListLoading] = useState(false);
  const [resendingInvite, setResendingInvite] = useState<number | null>(null);
  const [showGuestDetails, setShowGuestDetails] = useState(false);
  const [activeModules, setActiveModules] = useState<TEventModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [allowGuestInvites, setAllowGuestInvites] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [detailCoverPhotoUrl, setDetailCoverPhotoUrl] = useState<string | null>(
    null,
  );

  // ── Derived values ───────────────────────────────────────────────
  const event = events.find((e) => e.id === id) ?? null;
  const participants: string[] = event?.people ?? [];
  const isFree = (event?.planTier ?? "free") === "free";
  const isLocked =
    event?.assignments !== null && event?.assignments !== undefined;

  // ── On mount: initialise state from event ────────────────────────
  useEffect(() => {
    if (!event) return;
    setGiftCount(1);
    setCoupleCrossing(event.coupleCrossing ?? false);
    setAllowGuestInvites(event.allowGuestInvites ?? false);
    setIsPublic(event.isPublic ?? false);
    if (isLocked) {
      eventsApi.getCodes(id).then((codesData) => {
        setGeneratedCodes(
          Object.entries(codesData.codes || {}).map(([participant, code]) => ({
            participant,
            code,
          })),
        );
      });
    }
    loadInvites();
    loadModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  const loadModules = async () => {
    setModulesLoading(true);
    try {
      const modules = await modulesApi.getModules(id);
      setActiveModules(modules.filter((m) => m.status === "active"));
    } catch (err) {
      console.error("Failed to load modules:", err);
    } finally {
      setModulesLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (id) loadModules();
    }, [id]),
  );

  useEffect(() => {
    eventsApi
      .getById(id)
      .then((detail) => {
        const url = detail.coverPhotoUrl ?? null;
        setDetailCoverPhotoUrl(isSafeImageUri(url) ? url : null);
      })
      .catch(() => {});
  }, [id]);

  // ── Handlers ─────────────────────────────────────────────────────

  const loadInvites = async () => {
    setInviteListLoading(true);
    try {
      const data = await invitesApi.list(id);
      setInviteList(data.invites);
    } catch (err) {
      console.error("Failed to load invites:", err);
    } finally {
      setInviteListLoading(false);
    }
  };

  const handleResendInvite = async (inviteId: number) => {
    setResendingInvite(inviteId);
    try {
      await invitesApi.resend(id, inviteId);
    } catch (err) {
      console.error("Failed to resend invite:", err);
    } finally {
      setResendingInvite(null);
    }
  };

  const handleRevokeInvite = async (inviteId: number) => {
    try {
      await invitesApi.delete(id, inviteId);
      setInviteList((prev) => prev.filter((inv) => inv.id !== inviteId));
    } catch (err) {
      console.error("Failed to revoke invite:", err);
    }
  };

  const handleRemoveParticipant = async (participantName: string) => {
    try {
      await eventsApi.removeParticipant(id, participantName);
      await refreshEvents();
    } catch (err) {
      console.error("Failed to remove participant:", err);
    }
  };

  const handleCreateInvite = async () => {
    setInviteLoading(true);
    try {
      const invite = await invitesApi.create(id);
      setCurrentInvite(invite);
      setShowInviteModal(true);
      await loadInvites();
    } catch (err) {
      console.error("Failed to create invite:", err);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      await eventsApi.generateAssignments(id, giftCount);
      const codesData = await eventsApi.getCodes(id);
      setGeneratedCodes(
        Object.entries(codesData.codes || {}).map(([participant, code]) => ({
          participant,
          code,
        })),
      );
      await refreshEvents();
    } catch (err: any) {
      setGenerateError(
        err?.response?.data?.error ||
          "Failed to generate assignments. Check constraints.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyInviteLink = async (url: string) => {
    await Clipboard.setStringAsync(url);
  };

  const handleShare = async (url: string) => {
    try {
      await Share.share({
        message: url,
        title: "Join my Gatherly event",
      });
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  const toggleReveal = (participant: string) => {
    setRevealedCodes((prev) => ({
      ...prev,
      [participant]: !prev[participant],
    }));
  };

  const handleAllowGuestInvitesToggle = async (value: boolean) => {
    setAllowGuestInvites(value);
    try {
      await eventsApi.update(id, { allowGuestInvites: value });
      await refreshEvents();
    } catch (err) {
      console.error("Failed to update allowGuestInvites:", err);
      setAllowGuestInvites(!value); // revert on error
    }
  };

  const handleIsPublicToggle = async (value: boolean) => {
    setIsPublic(value);
    try {
      await eventsApi.update(id, { isPublic: value });
      await refreshEvents();
    } catch (err) {
      console.error("Failed to update isPublic:", err);
      setIsPublic(!value); // revert on error
    }
  };

  const handleModuleGear = (moduleType: string) => {
    if (moduleType === "gift_exchange") {
      router.push(`/manage-exclusions?id=${id}`);
    } else {
      showToast("Settings coming soon");
    }
  };

  // ── Not found guard ──────────────────────────────────────────────
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

  const couplesCount = event.couples?.length ?? 0;
  const displayDate = formatEventDate(event.eventDate ?? event.date);

  return (
    <SafeAreaView
      className="h-full w-full max-w-7xl mx-auto bg-background-0"
      edges={["bottom"]}
    >
      <View className="flex-1 bg-background-0">
        {/* ── Header ─────────────────────────────────────────────── */}
        <AppHeader title="Manage Event" onBack={() => router.back()} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}
        >
          {/* ── Section 1: Event Details card ──────────────────── */}
          <View className="mx-4 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-bold text-typography-900">
                Event Details
              </Text>
              <Pressable
                onPress={() =>
                  router.push(`/edit-event-details?id=${id}` as never)
                }
                className="flex-row items-center gap-1 active:opacity-70"
              >
                <Pencil size={14} color="#0d9488" />
                <Text
                  className="text-sm font-semibold"
                  style={{ color: "#0d9488" }}
                >
                  Edit
                </Text>
              </Pressable>
            </View>

            <View className="rounded-2xl border border-outline-100 bg-white p-4 flex-row items-center gap-3">
              {/* Thumbnail */}
              {isSafeImageUri(detailCoverPhotoUrl) ? (
                <Image
                  source={{ uri: detailCoverPhotoUrl }}
                  className="h-14 w-14 rounded-xl"
                  style={{ width: 56, height: 56, borderRadius: 12 }}
                />
              ) : (
                <View
                  className="h-14 w-14 rounded-xl items-center justify-center"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    backgroundColor: "#0d9488",
                  }}
                >
                  <Text className="text-white text-xl font-bold">
                    {event.name?.charAt(0)?.toUpperCase() ?? "E"}
                  </Text>
                </View>
              )}

              {/* Event info */}
              <View className="flex-1">
                <Text
                  className="text-base font-bold text-typography-900"
                  numberOfLines={1}
                >
                  {event.name}
                </Text>
                {displayDate ? (
                  <View className="flex-row items-center gap-1 mt-1">
                    <Calendar size={12} color="#64748b" />
                    <Text className="text-xs text-typography-500">
                      {displayDate}
                    </Text>
                  </View>
                ) : null}
                {event.location ? (
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <MapPin size={12} color="#64748b" />
                    <Text
                      className="text-xs text-typography-500"
                      numberOfLines={1}
                    >
                      {event.location}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* ── Section 2: Guest List ───────────────────────────── */}
          <View className="mx-4 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-bold text-typography-900">
                Guest List
              </Text>
              {isFree && participants.length >= 15 && (
                <View
                  style={{
                    backgroundColor: "#fffbeb",
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    marginRight: "auto",
                    marginLeft: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#92400e" }}>
                    {participants.length}/{PARTICIPANT_CAP} participants
                  </Text>
                </View>
              )}
              <Pressable
                onPress={() => setShowGuestDetails((prev) => !prev)}
                className="active:opacity-70"
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: "#0d9488" }}
                >
                  {showGuestDetails ? "Hide" : "Manage"}
                </Text>
              </Pressable>
            </View>

            {/* Summary row — always visible */}
            <View className="rounded-2xl border border-outline-100 bg-white p-4">
              <View className="flex-row items-center gap-2">
                {/* Overlapping avatars — first 4 */}
                <View className="flex-row" style={{ marginRight: 4 }}>
                  {participants.slice(0, 4).map((name, idx) => (
                    <View
                      key={name}
                      style={{
                        marginLeft: idx === 0 ? 0 : -10,
                        zIndex: 10 - idx,
                        borderRadius: 20,
                        borderWidth: 2,
                        borderColor: "#fff",
                      }}
                    >
                      <Avatar
                        size="sm"
                        style={{
                          backgroundColor:
                            AVATAR_COLORS[idx % AVATAR_COLORS.length],
                        }}
                      >
                        <AvatarFallbackText className="text-white text-xs">
                          {name}
                        </AvatarFallbackText>
                      </Avatar>
                    </View>
                  ))}
                  {participants.length > 4 && (
                    <View
                      style={{
                        marginLeft: -10,
                        zIndex: 0,
                        borderRadius: 20,
                        borderWidth: 2,
                        borderColor: "#fff",
                        backgroundColor: "#e2e8f0",
                        width: 32,
                        height: 32,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text className="text-xs font-bold text-typography-600">
                        +{participants.length - 4}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-sm font-semibold text-typography-800">
                    {participants.length} attending
                  </Text>
                  {inviteList.filter((i) => i.status === "pending").length >
                    0 && (
                    <Text className="text-xs text-typography-400">
                      {inviteList.filter((i) => i.status === "pending").length}{" "}
                      pending invite
                      {inviteList.filter((i) => i.status === "pending")
                        .length !== 1
                        ? "s"
                        : ""}
                    </Text>
                  )}
                </View>

                {/* Invite button */}
                {!isLocked && (
                  <Pressable
                    onPress={isFree && participants.length >= PARTICIPANT_CAP ? () => setShowPaywall(true) : handleCreateInvite}
                    disabled={inviteLoading}
                    className="h-9 w-9 rounded-full items-center justify-center active:opacity-70"
                    style={{ backgroundColor: "#f0fdfa" }}
                  >
                    {inviteLoading ? (
                      <ActivityIndicator size="small" color="#0d9488" />
                    ) : (
                      <UserPlus size={16} color="#0d9488" />
                    )}
                  </Pressable>
                )}
              </View>

              {/* Expanded guest details */}
              {showGuestDetails && (
                <View className="mt-4 pt-4 border-t border-outline-100">
                  {/* Participant chips */}
                  {participants.length === 0 ? (
                    <View className="rounded-xl border border-dashed border-outline-200 p-4 items-center mb-3">
                      <Text className="text-typography-400 text-sm text-center">
                        No participants yet. Add someone to get started.
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row flex-wrap gap-2 mb-3">
                      {participants.map((name, idx) => {
                        const avatarColor =
                          AVATAR_COLORS[idx % AVATAR_COLORS.length];
                        return (
                          <View
                            key={name}
                            className="flex-row items-center rounded-full px-3 py-1.5 gap-1.5 border border-outline-100"
                            style={{ backgroundColor: "#f8fafc" }}
                          >
                            <Avatar
                              size="xs"
                              style={{ backgroundColor: avatarColor }}
                            >
                              <AvatarFallbackText className="text-white text-xs">
                                {name}
                              </AvatarFallbackText>
                            </Avatar>
                            <Text className="text-sm font-semibold text-typography-800">
                              {name}
                            </Text>
                            {!isLocked && (
                              <Pressable
                                onPress={() => handleRemoveParticipant(name)}
                                className="ml-1 h-5 w-5 rounded-full bg-slate-200 items-center justify-center active:opacity-70"
                              >
                                <X size={11} color="#64748b" />
                              </Pressable>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Locked notice */}
                  {isLocked && (
                    <View
                      className="rounded-xl px-3 py-2 mb-3"
                      style={{ backgroundColor: "#fef9c3" }}
                    >
                      <Text
                        className="text-xs text-center"
                        style={{ color: "#92400e" }}
                      >
                        Participant list is locked after generation.
                      </Text>
                    </View>
                  )}

                  {/* Invites list */}
                  {!isLocked && inviteList.length > 0 && (
                    <View className="mt-2">
                      <Text className="text-xs font-bold uppercase tracking-wide text-typography-400 mb-2">
                        Invites
                      </Text>
                      {inviteList.map((invite, idx) => {
                        const isPending = invite.status === "pending";
                        const isResending = resendingInvite === invite.id;
                        return (
                          <View
                            key={invite.id}
                            className={`flex-row items-center justify-between py-2 ${
                              idx < inviteList.length - 1
                                ? "border-b border-outline-100"
                                : ""
                            }`}
                          >
                            <View className="flex-1 mr-2">
                              <Text
                                className="text-sm font-semibold text-typography-800"
                                numberOfLines={1}
                              >
                                {invite.email ||
                                  invite.invite_url?.split("/").pop() ||
                                  `Invite #${invite.id}`}
                              </Text>
                              <View
                                className="mt-0.5 self-start rounded-full px-2 py-0.5"
                                style={{
                                  backgroundColor: isPending
                                    ? "#fef9c3"
                                    : "#dcfce7",
                                }}
                              >
                                <Text
                                  className="text-xs font-bold uppercase tracking-wide"
                                  style={{
                                    color: isPending ? "#92400e" : "#15803d",
                                  }}
                                >
                                  {invite.status}
                                </Text>
                              </View>
                            </View>
                            <View className="flex-row gap-2">
                              {isPending && (
                                <Pressable
                                  onPress={() => handleResendInvite(invite.id)}
                                  disabled={isResending}
                                  className="px-3 py-1.5 rounded-lg border border-outline-200 active:opacity-70"
                                >
                                  <Text className="text-xs font-semibold text-typography-600">
                                    {isResending ? "..." : "Resend"}
                                  </Text>
                                </Pressable>
                              )}
                              <Pressable
                                onPress={() => handleRevokeInvite(invite.id)}
                                className="h-8 w-8 rounded-full bg-red-50 items-center justify-center active:opacity-70"
                              >
                                <X size={14} color="#ef4444" />
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* ── Section 3: Active Modules ───────────────────────── */}
          <View className="mx-4 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-bold text-typography-900">
                Active Modules
              </Text>
              <Pressable
                onPress={() => router.push(`/modules-config?id=${id}` as never)}
                className="active:opacity-70"
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: "#0d9488" }}
                >
                  Add Module
                </Text>
              </Pressable>
            </View>

            <View className="rounded-2xl border border-outline-100 bg-white overflow-hidden">
              {modulesLoading ? (
                <View className="p-4 items-center">
                  <ActivityIndicator color="#0d9488" />
                </View>
              ) : activeModules.length === 0 ? (
                <View className="p-4 items-center">
                  <Text className="text-sm text-typography-400 text-center">
                    No modules active. Tap "Add Module" to enable features.
                  </Text>
                </View>
              ) : (
                activeModules.map((mod, idx) => {
                  const meta = MODULE_META[mod.moduleType] ?? {
                    label: mod.moduleType,
                    icon: "⚙️",
                  };
                  return (
                    <View
                      key={mod.moduleType}
                      className={`flex-row items-center px-4 py-3 ${
                        idx < activeModules.length - 1
                          ? "border-b border-outline-100"
                          : ""
                      }`}
                    >
                      {/* Icon circle */}
                      <View
                        className="h-10 w-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: "#f0fdfa" }}
                      >
                        <Text className="text-base">{meta.icon}</Text>
                      </View>

                      {/* Label + subtitle */}
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-typography-800">
                          {meta.label}
                        </Text>
                        <Text className="text-xs text-typography-400">
                          {participants.length} participants
                        </Text>
                      </View>

                      {/* Gear icon */}
                      <Pressable
                        onPress={() => handleModuleGear(mod.moduleType)}
                        className="h-9 w-9 rounded-full bg-background-100 items-center justify-center active:opacity-70"
                      >
                        <Settings size={16} color="#64748b" />
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* ── Section 4: Global Settings ──────────────────────── */}
          <View className="mx-4 mb-4">
            <Text className="text-base font-bold text-typography-900 mb-2">
              Global Settings
            </Text>

            <View className="rounded-2xl border border-outline-100 bg-white overflow-hidden">
              {/* Allow guests to invite others */}
              <View className="flex-row items-center px-4 py-3 border-b border-outline-100">
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-semibold text-typography-800">
                    Allow guests to invite others
                  </Text>
                  <Text className="text-xs text-typography-400 mt-0.5">
                    Guests can add people to the event
                  </Text>
                </View>
                <Switch
                  value={allowGuestInvites}
                  onValueChange={handleAllowGuestInvitesToggle}
                  trackColor={{ false: "#cbd5e1", true: "#0d9488" }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Public event */}
              <View className="flex-row items-center px-4 py-3">
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-semibold text-typography-800">
                    Public event
                  </Text>
                  <Text className="text-xs text-typography-400 mt-0.5">
                    Anyone can discover this event
                  </Text>
                </View>
                <Switch
                  value={isPublic}
                  onValueChange={handleIsPublicToggle}
                  trackColor={{ false: "#cbd5e1", true: "#0d9488" }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Cancel Event */}
            <Pressable className="mt-4 items-center active:opacity-70">
              <Text
                className="text-sm font-semibold"
                style={{ color: "#ef4444" }}
              >
                Cancel Event
              </Text>
              <Text className="text-xs text-typography-400 mt-0.5">
                Permanently deactivate this event
              </Text>
            </Pressable>
          </View>

          {/* ── Generate Secret Codes button ──────────────────────── */}
          {!isLocked && (
            <View className="mx-4 mb-4">
              <Pressable
                onPress={handleGenerate}
                disabled={generating}
                className="rounded-2xl py-4 items-center justify-center flex-row gap-2 active:opacity-80"
                style={{ backgroundColor: generating ? "#0f766e" : "#0d9488" }}
              >
                {generating ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-bold text-base ml-2">
                      Generating...
                    </Text>
                  </>
                ) : (
                  <Text className="text-white font-bold text-base">
                    Generate Secret Codes
                  </Text>
                )}
              </Pressable>

              <Text className="text-xs text-typography-400 text-center mt-2 px-2">
                Clicking generate will assign pairings and lock the participant
                list. Each person will receive a unique access code.
              </Text>

              {generateError && (
                <View
                  className="mt-2 rounded-xl px-3 py-2"
                  style={{ backgroundColor: "#fef2f2" }}
                >
                  <Text
                    className="text-xs text-center"
                    style={{ color: "#dc2626" }}
                  >
                    {generateError}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Secret Access Codes section ───────────────────────── */}
          {generatedCodes.length > 0 && (
            <View className="mx-4 mb-4">
              <View className="flex-row items-center gap-2 mb-3">
                <Text className="text-base font-bold text-typography-900">
                  Secret Access Codes
                </Text>
                <View
                  className="rounded-full px-2.5 py-0.5"
                  style={{ backgroundColor: "#ccfbf1" }}
                >
                  <Text
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: "#0d9488" }}
                  >
                    READY
                  </Text>
                </View>
              </View>

              {generatedCodes.map(({ participant, code }) => {
                const isRevealed = !!revealedCodes[participant];
                const isCopied = copiedCode === code;
                return (
                  <View
                    key={participant}
                    className="rounded-2xl border border-outline-100 bg-white p-4 mb-2"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 mr-2">
                        <Text className="text-xs font-bold uppercase tracking-wider text-typography-400">
                          {participant}
                        </Text>
                        <Text
                          className="text-sm mt-1 font-mono"
                          style={{ color: isRevealed ? "#0f172a" : "#94a3b8" }}
                          numberOfLines={1}
                        >
                          {isRevealed ? code : "• • • • • • • •"}
                        </Text>
                      </View>
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={() => toggleReveal(participant)}
                          className="h-9 w-9 rounded-full bg-background-100 items-center justify-center active:opacity-70"
                        >
                          {isRevealed ? (
                            <EyeOff size={16} color="#64748b" />
                          ) : (
                            <Eye size={16} color="#64748b" />
                          )}
                        </Pressable>
                        <Pressable
                          onPress={() => handleCopyCode(code)}
                          className="h-9 w-9 rounded-full bg-background-100 items-center justify-center active:opacity-70"
                        >
                          {isCopied ? (
                            <Check size={16} color="#10b981" />
                          ) : (
                            <Copy size={16} color="#64748b" />
                          )}
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      {/* ── Invite Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        size="md"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Text className="text-lg font-bold text-typography-900">
              Invite Participant
            </Text>
            <ModalCloseButton onPress={() => setShowInviteModal(false)}>
              <X size={20} color="#64748b" />
            </ModalCloseButton>
          </ModalHeader>

          <ModalBody>
            {currentInvite ? (
              <>
                <View className="items-center py-4">
                  <QRCode value={currentInvite.magic_link_url} size={200} />
                </View>

                <Text className="text-sm text-typography-500 text-center mb-4">
                  Scan QR code or share the link below
                </Text>

                <View className="flex-row items-center rounded-xl border border-outline-200 bg-background-50 px-3 py-2 mb-3 gap-2">
                  <Text
                    className="flex-1 text-xs text-typography-600"
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {currentInvite.magic_link_url}
                  </Text>
                  <Pressable
                    onPress={() =>
                      handleCopyInviteLink(currentInvite.magic_link_url)
                    }
                    className="h-8 w-8 items-center justify-center rounded-lg bg-background-100 active:opacity-70"
                  >
                    <Copy size={14} color="#64748b" />
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => handleShare(currentInvite.magic_link_url)}
                  className="flex-row items-center justify-center rounded-xl border border-outline-300 py-3 gap-2 active:opacity-70"
                >
                  <Share2 size={16} color="#0d9488" />
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: "#0d9488" }}
                  >
                    Share Invite Link
                  </Text>
                </Pressable>
              </>
            ) : (
              <View className="items-center py-8">
                <ButtonSpinner />
                <Text className="text-sm text-typography-400 mt-2">
                  Creating invite...
                </Text>
              </View>
            )}
          </ModalBody>

          <ModalFooter>
            <Button
              onPress={() => setShowInviteModal(false)}
              className="flex-1 rounded-xl"
              style={{ backgroundColor: "#0d9488" }}
            >
              <ButtonText className="text-white font-semibold">Done</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="participant_cap"
        eventId={id}
        isParticipant={false}
      />
    </SafeAreaView>
  );
}
