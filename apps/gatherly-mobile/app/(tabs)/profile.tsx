import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { LogOut, Pencil, X, Check, User } from "lucide-react-native";
import { useSession } from "@/app/contexts/AuthContext";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Avatar, AvatarFallbackText } from "@/components/ui/avatar";
import { SafeAreaView } from "react-native-safe-area-context";
import { usersApi, type UserProfile } from "@/app/api/users";

export default function ProfileScreen() {
  const { signOut, user } = useSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getMe();
      setProfile(data);
      setNameInput(data.name);
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await usersApi.updateMe(nameInput.trim());
      setProfile((prev) => prev ? { ...prev, name: updated.name } : prev);
      setEditing(false);
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || "Failed to save name.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile?.name ?? user?.name ?? "";
  const displayEmail = profile?.email ?? user?.email ?? "";
  const initials = displayName
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background-0">
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-0" edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ───────────────────────────────────── */}
        <View
          className="items-center pt-10 pb-8 px-6"
          style={{ backgroundColor: "#f0fdfa" }}
        >
          <Avatar size="xl" className="bg-teal-500 mb-4">
            {initials ? (
              <AvatarFallbackText className="text-white text-2xl font-bold">
                {initials}
              </AvatarFallbackText>
            ) : (
              <Icon as={User} className="text-white" size="xl" />
            )}
          </Avatar>

          {editing ? (
            <View className="flex-row items-center gap-2">
              <View className="border border-outline-300 rounded-xl px-4 py-2 bg-white">
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Your name"
                  style={{ fontSize: 18, fontWeight: "700", color: "#0f172a", minWidth: 160 }}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
              </View>
              <Pressable
                onPress={handleSaveName}
                disabled={saving}
                className="h-10 w-10 rounded-full bg-teal-500 items-center justify-center active:opacity-70"
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Check size={18} color="white" />
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setEditing(false);
                  setNameInput(profile?.name ?? user?.name ?? "");
                  setSaveError(null);
                }}
                className="h-10 w-10 rounded-full bg-background-200 items-center justify-center active:opacity-70"
              >
                <X size={18} color="#64748b" />
              </Pressable>
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-bold text-typography-900">
                {displayName || "No name"}
              </Text>
              <Pressable
                onPress={() => setEditing(true)}
                className="h-8 w-8 rounded-full bg-teal-100 items-center justify-center active:opacity-70"
              >
                <Pencil size={14} color="#0d9488" />
              </Pressable>
            </View>
          )}

          {saveError ? (
            <Text className="text-error-500 text-sm mt-1">{saveError}</Text>
          ) : null}

          <Text className="text-typography-500 text-sm mt-1">{displayEmail}</Text>
        </View>

        {/* ── Stats row ─────────────────────────────────── */}
        <View className="flex-row mx-4 mt-6 gap-3">
          <View className="flex-1 rounded-2xl border border-outline-100 bg-white p-4 items-center">
            <Text className="text-2xl font-bold text-teal-600">
              {profile?.eventsOrganized ?? 0}
            </Text>
            <Text className="text-xs text-typography-500 mt-1 text-center">
              Events Organised
            </Text>
          </View>
          <View className="flex-1 rounded-2xl border border-outline-100 bg-white p-4 items-center">
            <Text className="text-2xl font-bold text-indigo-500">
              {user?.role === "organizer" ? "Organiser" : "Member"}
            </Text>
            <Text className="text-xs text-typography-500 mt-1 text-center">
              Account Type
            </Text>
          </View>
        </View>

        {/* ── Account info ──────────────────────────────── */}
        <View className="mx-4 mt-4 rounded-2xl border border-outline-100 bg-white p-4">
          <Text className="text-sm font-bold text-typography-500 uppercase tracking-wide mb-3">
            Account
          </Text>
          <View className="flex-row justify-between py-2 border-b border-outline-100">
            <Text className="text-sm text-typography-600">Email</Text>
            <Text className="text-sm font-semibold text-typography-900">
              {displayEmail}
            </Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-sm text-typography-600">Member since</Text>
            <Text className="text-sm font-semibold text-typography-900">
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </Text>
          </View>
        </View>

        {/* ── Sign out ──────────────────────────────────── */}
        <View className="mx-4 mt-6">
          <Button
            action="negative"
            variant="outline"
            onPress={async () => {
              await signOut();
            }}
          >
            <Icon as={LogOut} className="mr-2 text-error-600" size="sm" />
            <ButtonText>Sign Out</ButtonText>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
