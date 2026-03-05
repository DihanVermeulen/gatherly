import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  SectionList,
  Image,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Gift, CheckCircle } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useEvents } from "./contexts/EventsContext";
import { useSession } from "./contexts/AuthContext";
import { eventsApi, TWishlistItem } from "./api/events";
import { wishlistsApi } from "./api/wishlists";

import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Button, ButtonText } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogCloseButton,
} from "@/components/ui/alert-dialog";
import {
  Actionsheet,
  ActionsheetContent,
  ActionsheetItem,
  ActionsheetItemText,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetBackdrop,
} from "@/components/ui/actionsheet";
import { useToast, Toast, ToastTitle } from "@/components/ui/toast";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SectionData = {
  participantId: number;
  title: string;
  isOwn: boolean;
  data: TWishlistItem[];
};

type ActionsheetState = {
  item: TWishlistItem;
  isOwn: boolean;
} | null;

// ─────────────────────────────────────────────────────────────────────────────
// ViewWishlistsScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function ViewWishlistsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const {
    state: { events },
    dispatch,
  } = useEvents();
  const { user } = useSession();

  // Local state for participant details (fetched via getById)
  const [participantDetails, setParticipantDetails] = useState<
    Array<{ id: number; name: string }> | null
  >(null);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);
  const [isLoadingWishlists, setIsLoadingWishlists] = useState(true);

  // ActionSheet state — which item was long-pressed and its section context
  const [actionsheetState, setActionsheetState] = useState<ActionsheetState>(null);

  // Delete dialog state
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<number | null>(null);
  const [itemToDeleteName, setItemToDeleteName] = useState<string>("");

  // Find the event from context
  const event = events.find((e) => e.id === id) ?? null;

  // Derive my participant ID from participantDetails
  const myParticipantId = useMemo(() => {
    if (!participantDetails || !user?.name) return 0;
    return participantDetails.find((p) => p.name === user.name)?.id ?? 0;
  }, [participantDetails, user?.name]);

  // On mount: fetch participant details + all wishlist items (parallel)
  useEffect(() => {
    if (!id) return;

    const fetchParticipants = async () => {
      try {
        const fullEvent = await eventsApi.getById(id);
        setParticipantDetails(fullEvent.participantDetails ?? []);
      } catch (err) {
        console.error("Failed to fetch participant details:", err);
        setParticipantDetails([]);
      } finally {
        setIsLoadingParticipants(false);
      }
    };

    const fetchWishlists = async () => {
      try {
        const items = await wishlistsApi.getAll(id);
        dispatch({
          type: "SET_WISHLISTS",
          payload: { eventId: id, items },
        });
      } catch (err) {
        console.error("Failed to fetch wishlists:", err);
      } finally {
        setIsLoadingWishlists(false);
      }
    };

    fetchParticipants();
    fetchWishlists();
  }, [id, dispatch]);

  // Build SectionList sections (memoized)
  const sections = useMemo((): SectionData[] => {
    if (!event?.wishlists || !participantDetails) return [];

    // Group items by participantId
    const itemsByParticipant = new Map<number, TWishlistItem[]>();
    for (const item of event.wishlists) {
      const existing = itemsByParticipant.get(item.participantId) ?? [];
      existing.push(item);
      itemsByParticipant.set(item.participantId, existing);
    }

    const result: SectionData[] = [];

    // "My Wishlist" section first (if I have a participantId and items)
    if (myParticipantId !== 0) {
      const myItems = itemsByParticipant.get(myParticipantId) ?? [];
      if (myItems.length > 0) {
        result.push({
          participantId: myParticipantId,
          title: "My Wishlist",
          isOwn: true,
          data: myItems,
        });
      }
    }

    // Other participants alphabetically (skip my section)
    const otherParticipants = participantDetails
      .filter((p) => p.id !== myParticipantId)
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const participant of otherParticipants) {
      const items = itemsByParticipant.get(participant.id) ?? [];
      if (items.length > 0) {
        result.push({
          participantId: participant.id,
          title: `${participant.name}'s Wishlist`,
          isOwn: false,
          data: items,
        });
      }
    }

    return result;
  }, [event?.wishlists, participantDetails, myParticipantId]);

  // ── ActionSheet handlers ──────────────────────────────────────────────────

  const handleLongPress = useCallback(
    (item: TWishlistItem, isOwn: boolean) => {
      // Others' items claimed by someone else → no action
      if (!isOwn && item.isClaimed && !item.claimedByMe) return;
      setActionsheetState({ item, isOwn });
    },
    []
  );

  const handleEdit = useCallback(() => {
    if (!actionsheetState) return;
    setActionsheetState(null);
    router.push(
      `/edit-wishlist-item?id=${actionsheetState.item.id}&eventId=${id}`
    );
  }, [actionsheetState, id, router]);

  const handleDeletePrompt = useCallback(() => {
    if (!actionsheetState) return;
    setItemToDeleteId(actionsheetState.item.id);
    setItemToDeleteName(actionsheetState.item.itemName);
    setActionsheetState(null);
    setIsDeleteAlertOpen(true);
  }, [actionsheetState]);

  // Delete handler — optimistic
  const handleDeleteConfirmed = useCallback(async () => {
    if (itemToDeleteId === null || !id) return;

    dispatch({
      type: "DELETE_WISHLIST_ITEM",
      payload: { eventId: id, itemId: itemToDeleteId },
    });
    setIsDeleteAlertOpen(false);
    const deletedId = itemToDeleteId;
    setItemToDeleteId(null);
    setItemToDeleteName("");

    try {
      await wishlistsApi.delete(id, deletedId, myParticipantId);
    } catch (err) {
      console.error("Failed to delete wishlist item:", err);
      try {
        const fresh = await wishlistsApi.getAll(id);
        dispatch({
          type: "SET_WISHLISTS",
          payload: { eventId: id, items: fresh },
        });
      } catch (revertErr) {
        console.error("Failed to revert wishlist after delete failure:", revertErr);
      }
    }
  }, [itemToDeleteId, id, myParticipantId, dispatch]);

  // Claim handler — optimistic
  const handleClaim = useCallback(async () => {
    if (!actionsheetState || !id) return;
    const { item } = actionsheetState;

    setActionsheetState(null);
    dispatch({
      type: "CLAIM_WISHLIST_ITEM",
      payload: { eventId: id, itemId: item.id },
    });

    toast.show({
      placement: "top",
      duration: 2000,
      render: ({ id: toastId }) => (
        <Toast nativeID={toastId} action="success">
          <ToastTitle>Claimed!</ToastTitle>
        </Toast>
      ),
    });

    try {
      await wishlistsApi.claim(id, item.id);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        // Already claimed by someone else — revert and refresh
        try {
          const fresh = await wishlistsApi.getAll(id);
          dispatch({
            type: "SET_WISHLISTS",
            payload: { eventId: id, items: fresh },
          });
        } catch (refreshErr) {
          console.error("Failed to refresh wishlists after 409:", refreshErr);
        }
        // Revert the optimistic update
        dispatch({
          type: "UNCLAIM_WISHLIST_ITEM",
          payload: { eventId: id, itemId: item.id },
        });
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id: toastId }) => (
            <Toast nativeID={toastId} action="error">
              <ToastTitle>Already claimed by someone else</ToastTitle>
            </Toast>
          ),
        });
      } else {
        // Generic failure — revert
        dispatch({
          type: "UNCLAIM_WISHLIST_ITEM",
          payload: { eventId: id, itemId: item.id },
        });
        toast.show({
          placement: "top",
          duration: 2500,
          render: ({ id: toastId }) => (
            <Toast nativeID={toastId} action="error">
              <ToastTitle>Failed to claim item</ToastTitle>
            </Toast>
          ),
        });
      }
    }
  }, [actionsheetState, id, dispatch, toast]);

  // Unclaim handler — optimistic
  const handleUnclaim = useCallback(async () => {
    if (!actionsheetState || !id) return;
    const { item } = actionsheetState;

    setActionsheetState(null);
    dispatch({
      type: "UNCLAIM_WISHLIST_ITEM",
      payload: { eventId: id, itemId: item.id },
    });

    toast.show({
      placement: "top",
      duration: 2000,
      render: ({ id: toastId }) => (
        <Toast nativeID={toastId} action="muted">
          <ToastTitle>Unclaimed</ToastTitle>
        </Toast>
      ),
    });

    try {
      await wishlistsApi.unclaim(id, item.id);
    } catch (err) {
      console.error("Failed to unclaim wishlist item:", err);
      // Revert
      dispatch({
        type: "CLAIM_WISHLIST_ITEM",
        payload: { eventId: id, itemId: item.id },
      });
      toast.show({
        placement: "top",
        duration: 2500,
        render: ({ id: toastId }) => (
          <Toast nativeID={toastId} action="error">
            <ToastTitle>Failed to unclaim item</ToastTitle>
          </Toast>
        ),
      });
    }
  }, [actionsheetState, id, dispatch, toast]);

  // Determine ActionSheet mode at render time
  const actionsheetMode: "edit" | "claim" | "unclaim" | null = useMemo(() => {
    if (!actionsheetState) return null;
    const { item, isOwn } = actionsheetState;
    if (isOwn) return "edit";
    if (!item.isClaimed) return "claim";
    if (item.claimedByMe) return "unclaim";
    return null;
  }, [actionsheetState]);

  const isLoading = isLoadingParticipants || isLoadingWishlists;

  // Event not found
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

  const totalItems = sections.reduce((sum, s) => sum + s.data.length, 0);

  return (
    <SafeAreaView
      className="h-full w-full max-w-7xl mx-auto bg-background-0"
      edges={["bottom"]}
    >
      <View className="flex-1 bg-background-0">
        {/* ── Header bar ───────────────────────────────────────────── */}
        <View className="flex-row items-center px-4 pt-3 pb-2 gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 rounded-full bg-background-100 items-center justify-center active:opacity-70"
          >
            <ArrowLeft size={20} color="#0f172a" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-typography-900">
              Wishlists
            </Text>
            <Text className="text-sm text-typography-400" numberOfLines={1}>
              {event.name}
            </Text>
          </View>
        </View>

        {/* ── Content ─────────────────────────────────────────────── */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0d9488" />
            <Text className="mt-3 text-typography-400 text-sm">
              Loading wishlists...
            </Text>
          </View>
        ) : totalItems === 0 ? (
          /* ── Empty state ─────────────────────────────────────── */
          <View className="flex-1 items-center justify-center px-8">
            <View className="items-center rounded-2xl border border-outline-200 p-8 w-full">
              <Gift size={48} color="#cbd5e1" />
              <Text className="mt-3 text-typography-500 font-medium text-center text-base">
                No wishlist items yet
              </Text>
              <Text className="mt-1 text-typography-400 text-sm text-center">
                Participants haven't added any wishlist items yet.
              </Text>
            </View>
          </View>
        ) : (
          /* ── SectionList ──────────────────────────────────────── */
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 120,
              paddingTop: 8,
            }}
            renderSectionHeader={({ section }) => (
              <SectionHeader section={section} />
            )}
            renderItem={({ item, section }) => (
              <WishlistCard
                item={item}
                isOwn={section.isOwn}
                onLongPress={handleLongPress}
              />
            )}
            SectionSeparatorComponent={() => <View className="h-2" />}
          />
        )}

        {/* ── ActionSheet (long-press menu) ─────────────────────── */}
        <Actionsheet
          isOpen={actionsheetState !== null}
          onClose={() => setActionsheetState(null)}
        >
          <ActionsheetBackdrop />
          <ActionsheetContent>
            <ActionsheetDragIndicatorWrapper>
              <ActionsheetDragIndicator />
            </ActionsheetDragIndicatorWrapper>

            {actionsheetMode === "edit" && (
              <>
                <ActionsheetItem onPress={handleEdit}>
                  <ActionsheetItemText>Edit</ActionsheetItemText>
                </ActionsheetItem>
                <ActionsheetItem onPress={handleDeletePrompt}>
                  <ActionsheetItemText className="text-error-600">
                    Delete
                  </ActionsheetItemText>
                </ActionsheetItem>
              </>
            )}

            {actionsheetMode === "claim" && (
              <ActionsheetItem onPress={handleClaim}>
                <ActionsheetItemText style={{ color: "#0d9488" }}>
                  Claim
                </ActionsheetItemText>
              </ActionsheetItem>
            )}

            {actionsheetMode === "unclaim" && (
              <ActionsheetItem onPress={handleUnclaim}>
                <ActionsheetItemText className="text-typography-600">
                  Unclaim
                </ActionsheetItemText>
              </ActionsheetItem>
            )}

            <ActionsheetItem onPress={() => setActionsheetState(null)}>
              <ActionsheetItemText>Cancel</ActionsheetItemText>
            </ActionsheetItem>
          </ActionsheetContent>
        </Actionsheet>

        {/* ── Delete Confirmation Dialog ────────────────────────── */}
        <AlertDialog
          isOpen={isDeleteAlertOpen}
          onClose={() => {
            setIsDeleteAlertOpen(false);
            setItemToDeleteId(null);
            setItemToDeleteName("");
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogCloseButton>
                <Text className="text-base font-bold text-typography-900">
                  Delete Item
                </Text>
              </AlertDialogCloseButton>
            </AlertDialogHeader>
            <AlertDialogBody>
              <Text className="text-typography-700">
                Are you sure you want to delete{" "}
                <Text className="font-semibold">{itemToDeleteName}</Text>?
              </Text>
            </AlertDialogBody>
            <AlertDialogFooter>
              <View className="flex-row gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onPress={() => {
                    setIsDeleteAlertOpen(false);
                    setItemToDeleteId(null);
                    setItemToDeleteName("");
                  }}
                >
                  <ButtonText>Cancel</ButtonText>
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-error-600"
                  onPress={handleDeleteConfirmed}
                >
                  <ButtonText className="text-white font-bold">Delete</ButtonText>
                </Button>
              </View>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader component
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ section }: { section: SectionData }) {
  if (section.isOwn) {
    return (
      <View
        className="flex-row items-center px-3 py-2 mb-2 rounded-xl"
        style={{ backgroundColor: "#f0fdfa", borderLeftWidth: 3, borderLeftColor: "#0d9488" }}
      >
        <Text className="font-bold text-base" style={{ color: "#0f766e" }}>
          My Wishlist
        </Text>
        <Text className="ml-2 text-xs text-typography-400">
          ({section.data.length} {section.data.length === 1 ? "item" : "items"})
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center px-1 py-2 mb-2 border-b border-outline-100">
      <Text className="font-bold text-base text-typography-800">
        {section.title}
      </Text>
      <Text className="ml-2 text-xs text-typography-400">
        ({section.data.length} {section.data.length === 1 ? "item" : "items"})
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WishlistCard component
// ─────────────────────────────────────────────────────────────────────────────

type WishlistCardProps = {
  item: TWishlistItem;
  isOwn: boolean;
  onLongPress: (item: TWishlistItem, isOwn: boolean) => void;
};

const PRIORITY_CONFIG = {
  high: { label: "HIGH PRIORITY", bg: "#fef2f2", text: "#dc2626" },
  medium: { label: "MEDIUM PRIORITY", bg: "#fffbeb", text: "#d97706" },
  low: { label: "LOW PRIORITY", bg: "#f8fafc", text: "#64748b" },
};

function WishlistCard({ item, isOwn, onLongPress }: WishlistCardProps) {
  const priority = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.low;

  // Determine visual state
  const isOthersClaimedByMe = !isOwn && item.claimedByMe;
  const isOthersClaimedBySomeoneElse = !isOwn && item.isClaimed && !item.claimedByMe;
  const isOwnClaimed = isOwn && item.isClaimed;

  // Card opacity: gray out only others' items claimed by someone else
  const cardOpacity = isOthersClaimedBySomeoneElse ? 0.5 : 1;

  return (
    <Pressable
      onLongPress={() => onLongPress(item, isOwn)}
      className="mb-3 rounded-2xl overflow-hidden bg-white border border-outline-100"
      style={{
        opacity: cardOpacity,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      {/* Image header — only if imageUrl exists */}
      {item.imageUrl ? (
        <View>
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: "100%", height: 160 }}
            resizeMode="cover"
          />
          {/* Status badge overlay on image */}
          {isOthersClaimedBySomeoneElse && (
            <View
              className="absolute bottom-2 right-2 rounded-full px-3 py-1"
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            >
              <Text className="text-white text-xs font-bold">CLAIMED</Text>
            </View>
          )}
          {(isOthersClaimedByMe) && (
            <View
              className="absolute bottom-2 right-2 rounded-full px-3 py-1"
              style={{ backgroundColor: "#0d9488" }}
            >
              <Text className="text-white text-xs font-bold">CLAIMED BY ME</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Card body */}
      <View className="p-4">
        {/* Priority badge */}
        <View className="flex-row items-center mb-2">
          <View
            className="rounded-full px-2.5 py-0.5"
            style={{ backgroundColor: priority.bg }}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: priority.text }}
            >
              {priority.label}
            </Text>
          </View>
        </View>

        {/* Item name row + status indicators */}
        <View className="flex-row items-center justify-between">
          <Text
            className="text-base font-bold text-typography-900 flex-1 mr-2"
            numberOfLines={2}
          >
            {item.itemName}
          </Text>

          {/* Own items claimed by others: subtle teal CheckCircle */}
          {isOwnClaimed && (
            <CheckCircle size={20} color="#0d9488" />
          )}

          {/* Others' items with no image: show text status */}
          {!item.imageUrl && isOthersClaimedBySomeoneElse && (
            <View
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: "#f1f5f9" }}
            >
              <Text className="text-xs font-bold text-typography-500">
                CLAIMED
              </Text>
            </View>
          )}

          {!item.imageUrl && isOthersClaimedByMe && (
            <View
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: "#f0fdfa" }}
            >
              <Text className="text-xs font-bold" style={{ color: "#0d9488" }}>
                MINE
              </Text>
            </View>
          )}
        </View>

        {/* Description if present */}
        {item.description ? (
          <Text
            className="mt-1 text-sm text-typography-400"
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
