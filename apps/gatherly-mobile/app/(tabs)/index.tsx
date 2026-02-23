import React, { useState, useRef, useMemo, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { useColorScheme } from "@/components/useColorScheme";
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { CreateEvent } from "@/components/create-event";
import {
  Calendar,
  CheckCircle,
  Gift,
  Users,
  PartyPopper,
  Plus,
  Trash2,
  Share2,
  X,
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
import { TextInput, View } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import { FlatList } from "@/components/ui/flat-list";

import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Fab, FabIcon, FabLabel } from "@/components/ui/fab";
import { useRouter } from "expo-router";

export default function EventsScreen() {
  const colorScheme = useColorScheme();
  const {
    state: { events },
    dispatch,
  } = useEvents();

  const navigation = useNavigation();
  const router = useRouter();
  const [newEventName, setNewEventName] = useState("");
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isCreateEventAlertOpen, setIsCreateEventAlertOpen] = useState(false);

  // Bottom Sheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["90%"], []);

  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

  const createEvent = () => {
    bottomSheetRef.current?.expand();
  };

  const closeBottomSheet = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const confirmDelete = (id: string) => {
    setIsDeleteAlertOpen(true);
  };

  return (
    <View className="h-full p-4 bg-background-0">
      <AlertDialog
        isOpen={isDeleteAlertOpen}
        onClose={() => setIsDeleteAlertOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogCloseButton>Delete Event</AlertDialogCloseButton>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text>Are you sure you want to delete this event? </Text>
          </AlertDialogBody>
          <AlertDialogFooter></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          My Events
        </Text>
      </View>

      {/* Search (UI only) */}
      <TextInput
        placeholder="Search events..."
        placeholderTextColor="#94a3b8"
        className="mb-4 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100"
      />

      <Fab
        size="lg"
        onPress={createEvent}
        isDisabled={false}
        isHovered={false}
        isPressed={false}
        placement="bottom right"
        className="bg-primary-500"
      >
        <FabIcon as={Plus}></FabIcon>
      </Fab>

      {/* Empty State */}
      {events.length === 0 ? (
        <View className="mt-16 items-center rounded-2xl border border-slate-200 dark:border-slate-200 p-8">
          <Calendar size={40} color="#cbd5e1" />
          <Text className="mt-3 text-slate-500 font-medium text-center">
            No events yet. Get started by creating one!
          </Text>
          <Button
            variant="solid"
            className="rounded-lg mt-2"
            onPress={createEvent}
          >
            <Plus size={18} color="white" />
            <Text className="text-onprimary-0 font-bold">Create Event</Text>
          </Button>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <Pressable className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 active:scale-[0.99]">
              {/* Card Header */}
              <View className="flex-row justify-between mb-4">
                <View>
                  <Text className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {item.name}
                  </Text>

                  <View
                    className={`flex-row items-center gap-1 rounded-full px-2 py-1 self-start ${
                      item.assignments ? "bg-indigo-100" : "bg-blue-100"
                    }`}
                  >
                    {item.assignments ? (
                      <CheckCircle size={14} color="#4f46e5" />
                    ) : (
                      <Calendar size={14} color="#2563eb" />
                    )}
                    <Text className="text-xs font-semibold">
                      {item.assignments ? "Codes Generated" : "Planning Phase"}
                    </Text>
                  </View>
                </View>

                <View className="h-10 w-10 rounded-xl bg-orange-100 items-center justify-center">
                  <PartyPopper size={20} color="#ea580c" />
                </View>
              </View>

              {/* Metrics */}
              <View className="flex-row justify-between mb-5">
                <Metric
                  icon={<Calendar size={18} color="#64748b" />}
                  label="Date"
                  value={new Date(item.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                />
                <Metric
                  icon={<Users size={18} color="#64748b" />}
                  label="Peeps"
                  value={item.people?.length ?? 0}
                />
                <Metric
                  icon={<Gift size={18} color="#64748b" />}
                  label="Gifts"
                  value={`${
                    item.assignments ? Object.keys(item.assignments).length : 0
                  }/${item.people?.length ?? 0}`}
                />
              </View>

              {/* Actions */}
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => router.push("/edit-event", {})}
                  className="flex-1 rounded-xl bg-indigo-600 py-3 items-center active:scale-95"
                >
                  <Text className="text-white font-bold">Manage</Text>
                </Pressable>

                <Pressable className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 py-3 items-center active:scale-95">
                  <Share2 size={16} />
                </Pressable>

                <Pressable
                  onPress={() => confirmDelete(item.id)}
                  className="h-11 w-11 items-center justify-center active:scale-95"
                >
                  <Trash2 size={18} color="#ef4444" />
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      )}

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

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <View className="flex-1 mx-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 items-center">
      {icon}
      <Text className="mt-1 text-[10px] uppercase font-bold text-slate-500">
        {label}
      </Text>
      <Text className="font-bold text-slate-900 dark:text-slate-100">
        {value}
      </Text>
    </View>
  );
}
