import React, { useEffect, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Dices,
  Eye,
  EyeOff,
  Link2Off,
  Minus,
  Plus,
  X,
} from "lucide-react-native";
import { useEvents } from "./contexts/EventsContext";
import * as Clipboard from "expo-clipboard";
import { View } from "@/components/Themed";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { ScrollView } from "@/components/ui/scroll-view";
import { TextInput } from "react-native";
import { Alert } from "@/components/ui/alert";

export default function EditEventScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const {
    state: { events },
    dispatch,
  } = useEvents();

  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedCouples, setSelectedCouples] = useState<string[][]>([]);
  const [coupleCrossing, setCoupleCrossing] = useState(false);
  const [firstPersonSelected, setFirstPersonSelected] = useState<string | null>(
    null,
  );
  const [giftCount, setGiftCount] = useState(1);
  const [newPerson, setNewPerson] = useState("");
  const [revealedCodes, setRevealedCodes] = useState<Record<string, boolean>>(
    {},
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const event = events.find((e) => e.id === id);
    if (event) {
      setEditingEvent({ ...event });
      setSelectedCouples([...event.couples]);
      setCoupleCrossing(event.coupleCrossing);
    }
  }, [id, events]);

  const saveEvent = () => {
    dispatch({
      type: "UPDATE_EVENT",
      payload: {
        ...editingEvent,
        couples: selectedCouples,
        coupleCrossing,
      },
    });
    navigation.goBack();
  };

  const addPerson = () => {
    if (!newPerson.trim() || editingEvent.people.includes(newPerson)) return;
    setEditingEvent({
      ...editingEvent,
      people: [...editingEvent.people, newPerson],
    });
    setNewPerson("");
  };

  const removePerson = (person: string) => {
    setEditingEvent({
      ...editingEvent,
      people: editingEvent.people.filter((p: string) => p !== person),
    });
    setSelectedCouples(selectedCouples.filter((c) => !c.includes(person)));
    setFirstPersonSelected(null);
  };

  const generateCode = (
    person: string,
    assignments: Record<string, string[]>,
  ) => btoa(`${person}:${assignments[person].join(",")}`);

  const toggleReveal = (code: string) =>
    setRevealedCodes((p) => ({ ...p, [code]: !p[code] }));

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!editingEvent) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-slate-500">Event not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-black">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} />
        </Pressable>
        <Text className="text-lg font-bold">{editingEvent.name}</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="pb-40">
        {/* Participants */}
        <Section title="Participants">
          <View className="flex-row flex-wrap gap-2 mb-3">
            {editingEvent.people.map((p: string) => (
              <View
                key={p}
                className="flex-row items-center gap-2 rounded-lg bg-indigo-100 px-3 py-2"
              >
                <Text className="font-semibold">{p}</Text>
                <Pressable onPress={() => removePerson(p)}>
                  <X size={16} />
                </Pressable>
              </View>
            ))}
          </View>

          <View className="flex-row rounded-xl border border-slate-200 overflow-hidden">
            <TextInput
              value={newPerson}
              onChangeText={setNewPerson}
              placeholder="Enter friend's name"
              className="flex-1 px-4 py-3"
            />
            <Pressable
              onPress={addPerson}
              className="bg-indigo-600 px-4 justify-center"
            >
              <Plus size={18} color="white" />
            </Pressable>
          </View>
        </Section>

        {/* Gift Count */}
        <Section title="Gifts Per Person">
          <View className="flex-row items-center justify-between bg-slate-100 rounded-xl p-4">
            <Text className="font-medium">Each participant gives</Text>
            <View className="flex-row items-center gap-3">
              <IconBtn
                icon={<Minus size={16} />}
                onPress={() => setGiftCount(Math.max(1, giftCount - 1))}
              />
              <Text className="font-bold">{giftCount}</Text>
              <IconBtn
                icon={<Plus size={16} />}
                onPress={() =>
                  setGiftCount(
                    Math.min(
                      editingEvent.people.length - 1 || 1,
                      giftCount + 1,
                    ),
                  )
                }
              />
            </View>
          </View>
        </Section>

        {/* Generate */}
        <View className="px-4 mt-6">
          {/* <Pressable
            onPress={() => Alert.alert("Generation logic unchanged")}
            className="bg-indigo-600 py-4 rounded-xl items-center flex-row justify-center gap-2"
          >
            <Dices size={18} color="white" />
            <Text className="text-white font-bold">Generate Secret Codes</Text>
          </Pressable> */}
        </View>

        {/* Codes */}
        {editingEvent.assignments && (
          <Section title="Secret Access Codes">
            {Object.entries(editingEvent.assignments).map(
              ([person, receivers]) => {
                const code = generateCode(person, editingEvent.assignments);
                const revealed = revealedCodes[code];
                return (
                  <View
                    key={person}
                    className="flex-row justify-between items-center bg-white border border-slate-200 rounded-xl p-4 mb-2"
                  >
                    <View>
                      <Text className="font-bold">{person}</Text>
                      <Text className="font-mono text-xs text-slate-400">
                        {revealed ? code : "••••••"}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <IconBtn
                        icon={revealed ? <EyeOff /> : <Eye />}
                        onPress={() => toggleReveal(code)}
                      />
                      <IconBtn
                        icon={copiedCode === code ? <Check /> : <Copy />}
                        onPress={() => copyCode(code)}
                      />
                    </View>
                  </View>
                );
              },
            )}
          </Section>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 flex-row gap-3">
        <Pressable
          onPress={() => navigation.goBack()}
          className="flex-1 py-3 rounded-xl bg-slate-100 items-center"
        >
          <Text className="font-bold">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={saveEvent}
          className="flex-[2] py-3 rounded-xl bg-indigo-600 items-center"
        >
          <Text className="font-bold text-white">Save Event</Text>
        </Pressable>
      </View>
    </View>
  );
}

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View className="mt-6 px-4">
    <Text className="text-lg font-bold mb-3">{title}</Text>
    {children}
  </View>
);

const IconBtn = ({
  icon,
  onPress,
}: {
  icon: React.ReactNode;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className="h-9 w-9 items-center justify-center rounded-lg bg-slate-100"
  >
    {icon}
  </Pressable>
);
