import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Share, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Minus,
  Plus,
  Share2,
  X,
} from "lucide-react-native";
import QRCode from "react-qr-code";
import * as Clipboard from "expo-clipboard";

import { useEvents } from "./contexts/EventsContext";
import { useSession } from "./contexts/AuthContext";
import { eventsApi } from "./api/events";
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

// Avatar background colours for participant chips
const AVATAR_COLORS = [
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#f43f5e", // rose-500
];

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    state: { events },
    refreshEvents,
  } = useEvents();
  const { user } = useSession();

  // ── State ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
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

  // ── Derived values ───────────────────────────────────────────────
  const event = events.find((e) => e.id === id) ?? null;
  const participants: string[] = event?.people ?? [];
  const isLocked =
    event?.assignments !== null && event?.assignments !== undefined;

  // ── On mount: initialise state from event ────────────────────────
  useEffect(() => {
    if (!event) return;
    setGiftCount(1); // giftCount is local UI state — not stored in TEvent
    setCoupleCrossing(event.coupleCrossing ?? false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

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
      await loadInvites(); // refresh list
    } catch (err) {
      console.error("Failed to create invite:", err);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCoupleCrossing = async (value: boolean) => {
    setCoupleCrossing(value);
    try {
      await eventsApi.update(id, { coupleCrossing: value });
      await refreshEvents();
    } catch (err) {
      console.error("Failed to update couple crossing:", err);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      await eventsApi.generateAssignments(id, giftCount);
      // getCodes returns { codes: Record<string, string> } — transform to array
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
    setRevealedCodes((prev) => ({ ...prev, [participant]: !prev[participant] }));
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

  return (
    <SafeAreaView
      className="h-full w-full max-w-7xl mx-auto bg-background-0"
      edges={["bottom"]}
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
            {event.name}
          </Text>
          {/* Spacer to balance the back button */}
          <View className="h-10 w-10" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}
        >
          {/* ── Participants section ──────────────────────────────── */}
          <View className="mx-4 mb-4 rounded-2xl border border-outline-100 bg-white p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-typography-900">
                Participants
              </Text>
              <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: "#f0fdfa" }}>
                <Text className="text-xs font-bold" style={{ color: "#0d9488" }}>
                  {participants.length} Total
                </Text>
              </View>
            </View>

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
                  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  return (
                    <View
                      key={name}
                      className="flex-row items-center rounded-full px-3 py-1.5 gap-1.5 border border-outline-100"
                      style={{ backgroundColor: "#f8fafc" }}
                    >
                      <Avatar size="xs" style={{ backgroundColor: avatarColor }}>
                        <AvatarFallbackText className="text-white text-xs">
                          {name}
                        </AvatarFallbackText>
                      </Avatar>
                      <Text className="text-sm font-semibold text-typography-800">
                        {name}
                      </Text>
                      {/* X button hidden when locked */}
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

            {/* + Add Participant button — hidden when locked */}
            {!isLocked && (
              <Pressable
                onPress={handleCreateInvite}
                disabled={inviteLoading}
                className="flex-row items-center justify-center rounded-xl border border-outline-200 py-2.5 gap-2 active:opacity-70"
              >
                {inviteLoading ? (
                  <Text className="text-sm font-semibold" style={{ color: "#0d9488" }}>
                    Creating invite...
                  </Text>
                ) : (
                  <>
                    <Plus size={16} color="#0d9488" />
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: "#0d9488" }}
                    >
                      Add Participant
                    </Text>
                  </>
                )}
              </Pressable>
            )}

            {/* Locked notice */}
            {isLocked && (
              <View className="rounded-xl px-3 py-2 mt-1" style={{ backgroundColor: "#fef9c3" }}>
                <Text className="text-xs text-center" style={{ color: "#92400e" }}>
                  Participant list is locked after generation.
                </Text>
              </View>
            )}
          </View>

          {/* ── Invites section ──────────────────────────────── */}
          {!isLocked && (
            <View className="mx-4 mb-4 rounded-2xl border border-outline-100 bg-white p-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-bold text-typography-900">
                  Invites
                </Text>
                {inviteListLoading && (
                  <Text className="text-xs text-typography-400">Loading...</Text>
                )}
              </View>

              {inviteList.length === 0 ? (
                <Text className="text-sm text-typography-400 text-center py-2">
                  No invites sent yet.
                </Text>
              ) : (
                inviteList.map((invite, idx) => {
                  const isPending = invite.status === 'pending';
                  const isResending = resendingInvite === invite.id;
                  return (
                    <View
                      key={invite.id}
                      className={`flex-row items-center justify-between py-2.5 ${
                        idx < inviteList.length - 1 ? "border-b border-outline-100" : ""
                      }`}
                    >
                      <View className="flex-1 mr-2">
                        <Text className="text-sm font-semibold text-typography-800" numberOfLines={1}>
                          {invite.email || invite.invite_url?.split('/').pop() || `Invite #${invite.id}`}
                        </Text>
                        <View
                          className="mt-1 self-start rounded-full px-2 py-0.5"
                          style={{ backgroundColor: isPending ? '#fef9c3' : '#dcfce7' }}
                        >
                          <Text
                            className="text-xs font-bold uppercase tracking-wide"
                            style={{ color: isPending ? '#92400e' : '#15803d' }}
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
                              {isResending ? '...' : 'Resend'}
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
                })
              )}
            </View>
          )}

          {/* ── Wishlists Status card ─────────────────────────────── */}
          <View className="mx-4 mb-4 rounded-2xl border border-outline-100 bg-white p-4">
            <Text className="text-base font-bold text-typography-900 mb-3">
              Wishlists Status
            </Text>
            {participants.length === 0 ? (
              <Text className="text-sm text-typography-400 text-center py-2">
                No participants yet.
              </Text>
            ) : (
              participants.map((name, idx) => {
                // Derive wishlist status from event.wishlists data
                const hasWishlist =
                  event.wishlists && event.wishlists.some(
                    (item) => item.participantName === name,
                  );
                const isReady = !!hasWishlist;
                return (
                  <View
                    key={name}
                    className={`flex-row items-center justify-between py-2.5 ${
                      idx < participants.length - 1
                        ? "border-b border-outline-100"
                        : ""
                    }`}
                  >
                    <Text className="text-sm font-semibold text-typography-800">
                      {name}
                    </Text>
                    <View
                      className="rounded-full px-2.5 py-0.5"
                      style={{
                        backgroundColor: isReady ? "#dcfce7" : "#f1f5f9",
                      }}
                    >
                      <Text
                        className="text-xs font-bold uppercase tracking-wide"
                        style={{ color: isReady ? "#15803d" : "#64748b" }}
                      >
                        {isReady ? "READY" : "PENDING"}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* ── Event Settings & Rules card ───────────────────────── */}
          <View className="mx-4 mb-4 rounded-2xl border border-outline-100 bg-white p-4">
            <Text className="text-base font-bold text-typography-900 mb-3">
              Event Settings & Rules
            </Text>

            {/* Gifts Per Person row */}
            <View className="flex-row items-center justify-between py-3 border-b border-outline-100">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-semibold text-typography-800">
                  Gifts Per Person
                </Text>
                <Text className="text-xs text-typography-400 mt-0.5">
                  Limit per participant
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => !isLocked && setGiftCount(Math.max(1, giftCount - 1))}
                  disabled={isLocked}
                  className="h-8 w-8 rounded-full bg-background-100 items-center justify-center active:opacity-70"
                  style={{ opacity: isLocked ? 0.4 : 1 }}
                >
                  <Minus size={16} color="#374151" />
                </Pressable>
                <Text className="text-base font-bold text-typography-900 min-w-[20px] text-center">
                  {giftCount}
                </Text>
                <Pressable
                  onPress={() =>
                    !isLocked &&
                    setGiftCount(
                      Math.min(
                        Math.max(participants.length - 1, 1),
                        giftCount + 1,
                      ),
                    )
                  }
                  disabled={isLocked}
                  className="h-8 w-8 rounded-full bg-background-100 items-center justify-center active:opacity-70"
                  style={{ opacity: isLocked ? 0.4 : 1 }}
                >
                  <Plus size={16} color="#374151" />
                </Pressable>
              </View>
            </View>

            {/* Partner Exclusions toggle row */}
            <View className="flex-row items-center justify-between py-3 border-b border-outline-100">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-semibold text-typography-800">
                  Partner Exclusions
                </Text>
                <Text className="text-xs text-typography-400 mt-0.5">
                  Allow couples to buy for each other
                </Text>
              </View>
              <Switch
                value={coupleCrossing}
                onValueChange={handleCoupleCrossing}
                disabled={isLocked}
                trackColor={{ false: "#cbd5e1", true: "#0d9488" }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Manage Exclusions row */}
            <Pressable
              onPress={() =>
                !isLocked && router.push(`/manage-exclusions?id=${id}`)
              }
              disabled={isLocked}
              className="flex-row items-center justify-between py-3 active:opacity-70"
              style={{ opacity: isLocked ? 0.4 : 1 }}
            >
              <View className="flex-1 mr-3">
                <Text className="text-sm font-semibold text-typography-800">
                  Manage Exclusions
                </Text>
                <Text className="text-xs text-typography-400 mt-0.5">
                  {couplesCount === 0
                    ? "No rules defined"
                    : `${couplesCount} ${couplesCount === 1 ? "rule" : "rules"} defined`}
                </Text>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
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

              {/* Helper text */}
              <Text className="text-xs text-typography-400 text-center mt-2 px-2">
                Clicking generate will assign pairings and lock the participant
                list. Each person will receive a unique access code.
              </Text>

              {/* Error message */}
              {generateError && (
                <View className="mt-2 rounded-xl px-3 py-2" style={{ backgroundColor: "#fef2f2" }}>
                  <Text className="text-xs text-center" style={{ color: "#dc2626" }}>
                    {generateError}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Secret Access Codes section ───────────────────────── */}
          {generatedCodes.length > 0 && (
            <View className="mx-4 mb-4">
              {/* Section header with badge */}
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

              {/* Code cards */}
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
                {/* QR Code */}
                <View className="items-center py-4">
                  <QRCode value={currentInvite.invite_url} size={200} />
                </View>

                {/* Helper text */}
                <Text className="text-sm text-typography-500 text-center mb-4">
                  Scan QR code or share the link below
                </Text>

                {/* Copyable invite URL row */}
                <View className="flex-row items-center rounded-xl border border-outline-200 bg-background-50 px-3 py-2 mb-3 gap-2">
                  <Text
                    className="flex-1 text-xs text-typography-600"
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {currentInvite.invite_url}
                  </Text>
                  <Pressable
                    onPress={() => handleCopyInviteLink(currentInvite.invite_url)}
                    className="h-8 w-8 items-center justify-center rounded-lg bg-background-100 active:opacity-70"
                  >
                    <Copy size={14} color="#64748b" />
                  </Pressable>
                </View>

                {/* Share button */}
                <Pressable
                  onPress={() => handleShare(currentInvite.invite_url)}
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
    </SafeAreaView>
  );
}
