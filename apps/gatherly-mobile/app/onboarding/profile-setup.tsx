import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Image,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera, ChevronLeft } from "lucide-react-native";
import { usersApi } from "@/app/api/users";
import { useSession } from "@/app/contexts/AuthContext";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import {
  Input,
  InputField,
} from "@/components/ui/input";
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Icon } from "@/components/ui/icon";

export default function ProfileSetupScreen() {
  const { user } = useSession();

  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState("");
  const [giftPreferences, setGiftPreferences] = useState(""); // UI only — no backend field yet
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setAvatarBase64(`data:image/jpeg;base64,${asset.base64}`);
      }
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      await usersApi.updateMe({
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarBase64 || undefined,
      });
    } catch (err) {
      // Non-fatal — proceed to next step regardless
      console.error("Failed to save profile:", err);
    } finally {
      setLoading(false);
      router.push("/onboarding/preferences" as never);
    }
  };

  const handleSkip = () => {
    router.push("/onboarding/preferences" as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-background-0">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-4 pb-8">
            {/* Header: back arrow + step title */}
            <HStack className="items-center mb-6">
              <Pressable onPress={() => router.back()} className="mr-4">
                <Icon as={ChevronLeft} size="xl" className="text-typography-900" />
              </Pressable>
              <Text className="text-xl font-bold text-typography-900 flex-1 text-center">
                Step 1 of 2
              </Text>
              {/* Spacer to keep title centered */}
              <View className="w-8 ml-4" />
            </HStack>

            {/* Progress bar */}
            <VStack className="mb-6 gap-1">
              <Text className="text-sm font-medium text-typography-700">
                Profile Setup
              </Text>
              <View className="h-2 rounded-full bg-outline-200 overflow-hidden">
                <View
                  className="h-2 rounded-full bg-teal-600"
                  style={{ width: "50%" }}
                />
              </View>
            </VStack>

            {/* Avatar section */}
            <VStack className="items-center mb-8 gap-3">
              <Pressable onPress={handlePickAvatar} className="relative">
                <View
                  className="w-24 h-24 rounded-full bg-teal-100 items-center justify-center overflow-hidden"
                  style={{ borderWidth: 2, borderColor: "#0d9488" }}
                >
                  {avatarBase64 ? (
                    <Image
                      source={{ uri: avatarBase64 }}
                      style={{ width: 96, height: 96, borderRadius: 48 }}
                    />
                  ) : (
                    <Icon as={Camera} size="xl" className="text-teal-600" />
                  )}
                </View>
                {/* Camera badge */}
                <View
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: "#0d9488" }}
                >
                  <Icon as={Camera} size="sm" className="text-white" />
                </View>
              </Pressable>

              <VStack className="items-center gap-1">
                <Heading size="xl" className="text-typography-900 font-bold text-center">
                  Tell us about yourself
                </Heading>
                <Text className="text-typography-500 text-sm text-center">
                  This helps friends find you and see what you like.
                </Text>
              </VStack>
            </VStack>

            {/* Form fields */}
            <VStack className="gap-5">
              {/* Full Name */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText className="text-typography-900 font-medium">
                    Full Name
                  </FormControlLabelText>
                </FormControlLabel>
                <Input variant="outline" size="xl" className="rounded-2xl">
                  <InputField
                    placeholder="e.g. John Doe"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </Input>
              </FormControl>

              {/* Short Bio */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText className="text-typography-900 font-medium">
                    Short Bio
                  </FormControlLabelText>
                </FormControlLabel>
                <Textarea className="rounded-2xl" size="xl">
                  <TextareaInput
                    placeholder="A little bit about you..."
                    value={bio}
                    onChangeText={(text) => {
                      if (text.length <= 200) setBio(text);
                    }}
                    numberOfLines={3}
                  />
                </Textarea>
                {bio.length > 150 && (
                  <Text className="text-typography-400 text-xs text-right mt-1">
                    {bio.length}/200
                  </Text>
                )}
              </FormControl>

              {/* Gift Preferences (cosmetic — no backend field yet) */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText className="text-typography-900 font-medium">
                    Gift Preferences
                  </FormControlLabelText>
                </FormControlLabel>
                <Input variant="outline" size="xl" className="rounded-2xl">
                  <InputField
                    placeholder="I love tech gadgets and coffee."
                    value={giftPreferences}
                    onChangeText={setGiftPreferences}
                    autoCapitalize="sentences"
                  />
                </Input>
              </FormControl>
            </VStack>

            {/* Bottom actions */}
            <VStack className="mt-8 gap-4">
              <Button
                size="xl"
                className="w-full rounded-2xl"
                style={{ backgroundColor: "#0d9488" }}
                onPress={handleNext}
                disabled={loading}
              >
                {loading && <ButtonSpinner className="mr-2" />}
                <ButtonText className="font-semibold text-white">Next</ButtonText>
              </Button>

              <Pressable onPress={handleSkip} className="items-center py-2">
                <Text className="text-typography-500 text-sm">Skip for now</Text>
              </Pressable>
            </VStack>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
