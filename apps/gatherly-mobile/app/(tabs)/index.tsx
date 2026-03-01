import React, { useState, useRef, useMemo, useCallback } from "react";
import { useColorScheme } from "@/components/useColorScheme";
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { CreateEvent } from "@/components/CreateEvent";
import {
  Calendar,
  Users,
  Gift,
  Plus,
  Trash2,
  Search,
  Bell,
} from "lucide-react-native";
import { useEvents } from "../contexts/EventsContext";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { ScrollView, TextInput, View } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import { FlatList } from "@/components/ui/flat-list";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Fab, FabIcon } from "@/components/ui/fab";
import { useRouter } from "expo-router";
import { eventsApi } from "@/app/api/events";
import { TEvent } from "@/app/api/events";

// Filter pill types
type FilterType = "All" | "Planning" | "Active";

// Colour palette for event hero blocks — cycles through based on index
const HERO_COLORS = [
  "bg-teal-500",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-violet-500",
];

export default function EventsScreen() {
  const colorScheme = useColorScheme();
  const {
    state: { events },
    dispatch,
    useApi,
  } = useEvents();

  const router = useRouter();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Filter pill state
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");

  // Delete dialog state
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);

  // Bottom Sheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["90%"], []);

  const handleSheetChanges = useCallback((_index: number) => {}, []);

  const createEvent = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const closeBottomSheet = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  // Delete flow: store the event id, open dialog
  const confirmDelete = useCallback((id: string) => {
    setEventToDeleteId(id);
    setIsDeleteAlertOpen(true);
  }, []);

  // Delete flow: dispatch after user confirms
  const handleDeleteConfirmed = useCallback(async () => {
    if (eventToDeleteId === null) return;
    try {
      if (useApi) {
        await eventsApi.delete(eventToDeleteId);
      }
    } catch (error) {
      console.error("Failed to delete event via API:", error);
    }
    dispatch({ type: "DELETE_EVENT", payload: eventToDeleteId });
    setIsDeleteAlertOpen(false);
    setEventToDeleteId(null);
  }, [eventToDeleteId, useApi, dispatch]);

  // Derived: filter + search
  const filteredEvents = useMemo(
    () =>
      events.filter((e) => {
        const matchesSearch =
          searchQuery.trim() === "" ||
          e.name.toLowerCase().includes(searchQuery.toLowerCase());
        const isActive = e.assignments !== null && e.assignments !== undefined;
        const matchesFilter =
          activeFilter === "All" ||
          (activeFilter === "Active" && isActive) ||
          (activeFilter === "Planning" && !isActive);
        return matchesSearch && matchesFilter;
      }),
    [events, searchQuery, activeFilter],
  );

  const filterPills: FilterType[] = ["All", "Planning", "Active"];

  return (
    <View className="flex-1 bg-background-0">
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteAlertOpen}
        onClose={() => {
          setIsDeleteAlertOpen(false);
          setEventToDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogCloseButton>
              <Text className="text-base font-bold text-typography-900">
                Delete Event
              </Text>
            </AlertDialogCloseButton>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text className="text-typography-700">
              Are you sure you want to delete this event? This cannot be undone.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <View className="flex-row gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onPress={() => {
                  setIsDeleteAlertOpen(false);
                  setEventToDeleteId(null);
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

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-typography-900">
          My Events
        </Text>
        <View className="h-10 w-10 rounded-full bg-background-100 items-center justify-center">
          <Bell size={20} color="#64748b" />
        </View>
      </View>

      {/* Search Bar */}
      <View className="mx-5 ps-2 mb-3 flex-row items-center gap-2 rounded-2xl border border-outline-200 bg-background-50">
        <Search size={18} color="#94a3b8" />
        <TextInput
          placeholder="Search events..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="flex-1 text-sm text-typography-900"
          style={{ fontSize: 14, color: "#0f172a" }}
        />
      </View>

      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: 8,
          paddingBottom: 14,
        }}
        className="mb-3"
      >
        {filterPills.map((pill) => (
          <Button
            key={pill}
            onPress={() => setActiveFilter(pill)}
            className={`rounded-full px-4 py-2 ${
              activeFilter === pill
                ? "bg-primary-500"
                : "border border-outline-200 bg-background-0"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                activeFilter === pill ? "text-white" : "text-typography-600"
              }`}
            >
              {pill}
            </Text>
          </Button>
        ))}
      </ScrollView>

      {/* FAB */}
      <Fab
        size="xl"
        onPress={createEvent}
        isDisabled={false}
        isHovered={false}
        isPressed={false}
        placement="bottom right"
        className="bg-primary-500"
      >
        <FabIcon as={Plus} />
      </Fab>

      {/* Empty State */}
      {filteredEvents.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="items-center rounded-2xl border border-outline-200 p-8 w-full">
            <Calendar size={40} color="#cbd5e1" />
            <Text className="mt-3 text-typography-500 font-medium text-center">
              {searchQuery || activeFilter !== "All"
                ? "No events match your search."
                : "No events yet. Get started by creating one!"}
            </Text>
            {!searchQuery && activeFilter === "All" && (
              <Button
                variant="solid"
                className="rounded-lg mt-4 bg-primary-500"
                onPress={createEvent}
              >
                <Plus size={18} color="white" />
                <ButtonText className="text-white font-bold ml-1">
                  Create Event
                </ButtonText>
              </Button>
            )}
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          renderItem={({ item, index }) => (
            <EventCard
              item={item}
              index={index}
              onPress={() => router.push(`/event-details?id=${item.id}`)}
              onManage={() => router.push(`/edit-event?id=${item.id}`)}
              onDelete={() => confirmDelete(item.id)}
            />
          )}
        />
      )}

      {/* Bottom Sheet for CreateEvent */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        backgroundStyle={{
          backgroundColor:
            colorScheme === "dark" ? "rgb(18, 18, 18)" : "rgb(255, 255, 255)",
        }}
        handleIndicatorStyle={{
          backgroundColor:
            colorScheme === "dark" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)",
        }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
          />
        )}
      >
        <BottomSheetView style={{ flex: 1 }}>
          <CreateEvent onClose={closeBottomSheet} />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// EventCard component
// ──────────────────────────────────────────────────────────────────────────────

type EventCardProps = {
  item: TEvent;
  index: number;
  onPress: () => void;
  onManage: () => void;
  onDelete: () => void;
};

function EventCard({
  item,
  index,
  onPress,
  onManage,
  onDelete,
}: EventCardProps) {
  const isActive = item.assignments !== null && item.assignments !== undefined;
  const heroColor = HERO_COLORS[index % HERO_COLORS.length];
  const initial = item.name.charAt(0).toUpperCase();
  const participantCount =
    item.people?.length ?? item.participants?.length ?? 0;
  const giftCount = isActive ? Object.keys(item.assignments!).length : 0;

  return (
    <Pressable
      onPress={onPress}
      className="mb-4 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-outline-100 active:opacity-90"
      style={{
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      {/* Hero block */}
      <View className={`h-32 ${heroColor} items-center justify-center`}>
        <Text
          className="text-5xl font-bold text-white"
          style={{ opacity: 0.9 }}
        >
          {initial}
        </Text>
        {/* Status badge */}
        <View
          className={`absolute top-3 right-3 rounded-full px-3 py-1 ${
            isActive ? "bg-emerald-500" : "bg-blue-500"
          }`}
        >
          <Text className="text-xs font-bold text-white">
            {isActive ? "Active" : "Planning"}
          </Text>
        </View>
      </View>

      {/* Card body */}
      <View className="p-4">
        <Text className="text-base font-bold text-typography-900 mb-1">
          {item.name}
        </Text>

        {/* Stats row */}
        <View className="flex-row gap-4 mb-4">
          <View className="flex-row items-center gap-1">
            <Users size={14} color="#64748b" />
            <Text className="text-xs text-typography-500">
              {participantCount} {participantCount === 1 ? "person" : "people"}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Gift size={14} color="#64748b" />
            <Text className="text-xs text-typography-500">
              {giftCount} assignment{giftCount !== 1 ? "s" : ""}
            </Text>
          </View>
          {item.date ? (
            <View className="flex-row items-center gap-1">
              <Calendar size={14} color="#64748b" />
              <Text className="text-xs text-typography-500">
                {new Date(item.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Action row */}
        <View className="flex-row gap-2 items-center">
          <Pressable
            onPress={onManage}
            className="flex-1 rounded-xl bg-primary-500 py-2.5 items-center active:opacity-80"
          >
            <Text className="text-white font-bold text-sm">Manage</Text>
          </Pressable>
          <Pressable
            onPress={onDelete}
            className="h-10 w-10 rounded-xl border border-error-200 items-center justify-center active:bg-error-50"
          >
            <Trash2 size={16} color="#ef4444" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
