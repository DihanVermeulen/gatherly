import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  View,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Gift, Plus } from "lucide-react-native";
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
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
import { AddWishlistItem } from "@/components/AddWishlistItem";

export default function MyWishlistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    state: { events },
    dispatch,
  } = useEvents();
  const { user } = useSession();

  // Local state for participant details (fetched via getById — not in getAll response)
  const [participantDetails, setParticipantDetails] = useState<
    Array<{ id: number; name: string }> | null
  >(null);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);
  const [isLoadingWishlists, setIsLoadingWishlists] = useState(true);

  // ActionSheet state — which item was long-pressed
  const [actionsheetItem, setActionsheetItem] = useState<TWishlistItem | null>(null);

  // Delete dialog state
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<number | null>(null);
  const [itemToDeleteName, setItemToDeleteName] = useState<string>("");

  // Bottom sheet ref for AddWishlistItem
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["90%"], []);

  // Find the event from context
  const event = events.find((e) => e.id === id) ?? null;

  // Derive my participant ID from participantDetails
  const myParticipantId = useMemo(() => {
    if (!participantDetails || !user?.name) return 0;
    return participantDetails.find((p) => p.name === user.name)?.id ?? 0;
  }, [participantDetails, user?.name]);

  // Derive my wishlist items from event context
  const myItems = useMemo(() => {
    if (!event?.wishlists || myParticipantId === 0) return [];
    return event.wishlists.filter((item) => item.participantId === myParticipantId);
  }, [event?.wishlists, myParticipantId]);

  // On mount: fetch participant details + wishlist items
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

  // Bottom sheet handlers
  const openAddSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const closeBottomSheet = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  // ActionSheet handlers
  const handleLongPress = useCallback((item: TWishlistItem) => {
    setActionsheetItem(item);
  }, []);

  const handleEdit = useCallback(() => {
    if (!actionsheetItem) return;
    setActionsheetItem(null);
    router.push(`/edit-wishlist-item?id=${actionsheetItem.id}&eventId=${id}`);
  }, [actionsheetItem, id, router]);

  const handleDeletePrompt = useCallback(() => {
    if (!actionsheetItem) return;
    setItemToDeleteId(actionsheetItem.id);
    setItemToDeleteName(actionsheetItem.itemName);
    setActionsheetItem(null);
    setIsDeleteAlertOpen(true);
  }, [actionsheetItem]);

  // Delete handler — optimistic
  const handleDeleteConfirmed = useCallback(async () => {
    if (itemToDeleteId === null || !id) return;

    // Optimistic: remove immediately
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
      // Revert: reload from API
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

  // Called when AddWishlistItem saves a new item
  const handleItemAdded = useCallback(
    (item: TWishlistItem) => {
      if (!id) return;
      dispatch({
        type: "ADD_WISHLIST_ITEM",
        payload: { eventId: id, item },
      });
    },
    [id, dispatch]
  );

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

  return (
    <SafeAreaView
      className="h-full w-full max-w-7xl mx-auto bg-background-0"
      edges={["bottom"]}
    >
      <View className="flex-1 bg-background-0">
        {/* ── Header bar ─────────────────────────────────────────── */}
        <View className="flex-row items-center px-4 pt-3 pb-2 gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 rounded-full bg-background-100 items-center justify-center active:opacity-70"
          >
            <ArrowLeft size={20} color="#0f172a" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-typography-900">
              My Wishlist
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
              Loading your wishlist...
            </Text>
          </View>
        ) : myItems.length === 0 ? (
          /* ── Empty state ──────────────────────────────────────── */
          <View className="flex-1 items-center justify-center px-8">
            <View className="items-center rounded-2xl border border-outline-200 p-8 w-full">
              <Gift size={48} color="#cbd5e1" />
              <Text className="mt-3 text-typography-500 font-medium text-center text-base">
                No wishlist items yet
              </Text>
              <Text className="mt-1 text-typography-400 text-sm text-center">
                Let others know what you'd love to receive.
              </Text>
              <Pressable
                onPress={openAddSheet}
                className="mt-4 rounded-xl px-6 py-3 active:opacity-80"
                style={{ backgroundColor: "#0d9488" }}
              >
                <Text className="text-white font-semibold">
                  Add your first item
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* ── Wishlist items list ───────────────────────────────── */
          <FlatList
            data={myItems}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 8 }}
            renderItem={({ item }) => (
              <WishlistCard item={item} onLongPress={handleLongPress} />
            )}
          />
        )}

        {/* ── FAB ─────────────────────────────────────────────────── */}
        {!isLoading && (
          <Pressable
            onPress={openAddSheet}
            className="absolute bottom-24 right-4 h-14 w-14 rounded-full items-center justify-center active:opacity-80"
            style={{
              backgroundColor: "#0d9488",
              elevation: 4,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            <Plus size={26} color="white" />
          </Pressable>
        )}

        {/* ── ActionSheet (long-press menu) ────────────────────────── */}
        <Actionsheet
          isOpen={actionsheetItem !== null}
          onClose={() => setActionsheetItem(null)}
        >
          <ActionsheetBackdrop />
          <ActionsheetContent>
            <ActionsheetDragIndicatorWrapper>
              <ActionsheetDragIndicator />
            </ActionsheetDragIndicatorWrapper>
            <ActionsheetItem onPress={handleEdit}>
              <ActionsheetItemText>Edit</ActionsheetItemText>
            </ActionsheetItem>
            <ActionsheetItem onPress={handleDeletePrompt}>
              <ActionsheetItemText className="text-error-600">
                Delete
              </ActionsheetItemText>
            </ActionsheetItem>
            <ActionsheetItem onPress={() => setActionsheetItem(null)}>
              <ActionsheetItemText>Cancel</ActionsheetItemText>
            </ActionsheetItem>
          </ActionsheetContent>
        </Actionsheet>

        {/* ── Delete Confirmation Dialog ───────────────────────────── */}
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

        {/* ── Bottom Sheet for Add Item ────────────────────────────── */}
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          backgroundStyle={{ backgroundColor: "rgb(255, 255, 255)" }}
          handleIndicatorStyle={{ backgroundColor: "rgb(0, 0, 0)" }}
          backdropComponent={(props) => (
            <BottomSheetBackdrop
              {...props}
              disappearsOnIndex={-1}
              appearsOnIndex={0}
            />
          )}
        >
          <BottomSheetView style={{ flex: 1 }}>
            <AddWishlistItem
              eventId={id ?? ""}
              participantId={myParticipantId}
              onItemAdded={handleItemAdded}
              onClose={closeBottomSheet}
            />
          </BottomSheetView>
        </BottomSheet>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WishlistCard component
// ─────────────────────────────────────────────────────────────────────────────

type WishlistCardProps = {
  item: TWishlistItem;
  onLongPress: (item: TWishlistItem) => void;
};

function WishlistCard({ item, onLongPress }: WishlistCardProps) {
  const priorityLabel =
    item.priority.charAt(0).toUpperCase() + item.priority.slice(1);

  return (
    <Pressable
      onLongPress={() => onLongPress(item)}
      className="mb-3 rounded-2xl overflow-hidden bg-white border border-outline-100"
      style={{
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      {/* Image header — only if imageUrl exists */}
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: "100%", height: 160 }}
          resizeMode="cover"
        />
      ) : null}

      {/* Card body */}
      <View className="p-4 flex-row items-center justify-between">
        <Text
          className="text-base font-bold text-typography-900 flex-1 mr-2"
          numberOfLines={2}
        >
          {item.itemName}
        </Text>
        <Text className="text-sm text-typography-400">{priorityLabel}</Text>
      </View>
    </Pressable>
  );
}
