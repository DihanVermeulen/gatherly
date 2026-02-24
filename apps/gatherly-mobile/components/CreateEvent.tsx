import React, { useState, useCallback } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { Button, ButtonText } from "@/components/ui/button";
import { X, Gift } from "lucide-react-native";
import { Pressable } from "@/components/ui/pressable";
import { useEvents } from "@/app/contexts/EventsContext";

type CreateEventProps = {
  onClose: () => void;
};

export function CreateEvent({ onClose }: CreateEventProps) {
  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const { dispatch } = useEvents();

  const handleCreate = useCallback(() => {
    if (!eventName.trim()) return;

    dispatch({
      type: "ADD_EVENT",
      payload: {
        id: Date.now().toString(),
        name: eventName,
        people: [],
        couples: [],
        assignments: null,
        coupleCrossing: false,
        gifts: {},
        date: new Date().toISOString(),
        participants: [],
        description: description,
      },
    });

    setEventName("");
    setDescription("");
    onClose();
  }, [eventName, description, dispatch, onClose]);

  return (
    <View className="flex-1 bg-background-0 dark:bg-background-950 rounded-t-3xl overflow-hidden">
      {/* Top Bar */}
      <View className="flex-row items-center p-4 pb-2 justify-between">
        <Pressable
          onPress={onClose}
          className="h-12 w-12 items-center justify-center rounded-full active:bg-background-100 dark:active:bg-background-800"
        >
          <X size={24} className="text-secondary-900 dark:text-secondary-100" />
        </Pressable>
        <Text className="text-lg font-bold text-typography-900 flex-1 text-center pr-12">
          Create New Event
        </Text>
      </View>

      {/* Illustration Area */}
      <View className="flex justify-center items-center py-4">
        <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center">
          <Gift size={32} className="text-primary-600" />
        </View>
      </View>

      {/* Form Content */}
      <View className="flex-1 px-4 pb-12 gap-6">
        {/* Event Name */}
        <View className="gap-2">
          <Text className="font-medium text-typography-900">Event Name</Text>
          <Input
            size="xl"
            className="border-outline-200 bg-background-50 dark:bg-background-900 h-14"
          >
            <InputField
              placeholder="e.g. Family Christmas 2024"
              value={eventName}
              onChangeText={setEventName}
              className="font-normal"
            />
          </Input>
        </View>

        {/* Description */}
        <View className="gap-2">
          <View className="flex-row justify-between items-center">
            <Text className="font-medium text-typography-900">Description</Text>
            <Text className="text-xs text-typography-500 font-medium">
              Optional
            </Text>
          </View>
          <Textarea
            size="md"
            className="border-outline-200 bg-background-50 dark:bg-background-900 h-36"
          >
            <TextareaInput
              placeholder="Add details like budget, theme, or location..."
              value={description}
              onChangeText={setDescription}
              className="font-normal"
            />
          </Textarea>
        </View>

        {/* Action Buttons */}
        <View className="gap-3 mt-4">
          <Button
            size="xl"
            className="rounded-xl h-14 bg-primary-500 active:bg-primary-600"
            onPress={handleCreate}
          >
            <ButtonText className="bg-primary-500 text-on-primary-0 font-bold text-lg">
              Create Event
            </ButtonText>
          </Button>

          <Button
            size="xl"
            variant="link"
            className="rounded-xl h-12"
            onPress={onClose}
          >
            <ButtonText className="text-typography-500 font-semibold text-base">
              Cancel
            </ButtonText>
          </Button>
        </View>
      </View>
    </View>
  );
}
