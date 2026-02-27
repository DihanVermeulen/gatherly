import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Eye, EyeOff, Lock, Mail, User, Users } from "lucide-react-native";
import { authApi } from "./api/auth";
import { useSession } from "./contexts/AuthContext";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Divider } from "@/components/ui/divider";
import {
  Input,
  InputField,
  InputSlot,
  InputIcon,
} from "@/components/ui/input";
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
} from "@/components/ui/form-control";
import { Icon } from "@/components/ui/icon";

// Pending invite flow: join.tsx calls setPendingInviteCode before navigating here.
// After signIn(), _layout.tsx consumes the pending code and redirects to /join.
// See: utils/pendingInvite.ts (setPendingInviteCode)

export default function RegisterScreen() {
  const { signIn } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => {
    if (error) setError(null);
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await authApi.register(email.trim(), password, name.trim());
      await signIn(response.accessToken, response.user);
    } catch (err: unknown) {
      const anyErr = err as {
        response?: { status?: number; data?: { error?: string; message?: string } };
      };
      const status = anyErr?.response?.status;
      const msg =
        anyErr?.response?.data?.error ||
        anyErr?.response?.data?.message;

      if (status === 409) {
        setError("An account with this email already exists.");
      } else if (status === 400 && msg) {
        setError(msg);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 bg-background-0 px-6 pt-12 pb-8">
          {/* Header row: Back arrow + "Join Gatherly" title */}
          <HStack className="items-center mb-8">
            <Pressable onPress={() => router.back()} className="mr-4">
              <Icon as={ChevronLeft} size="xl" className="text-typography-900" />
            </Pressable>
            <Text className="text-xl font-bold text-typography-900 flex-1 text-center">
              Join Gatherly
            </Text>
            {/* Spacer to keep title centered */}
            <View className="w-8 ml-4" />
          </HStack>

          {/* Circular icon */}
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-full bg-primary-100 items-center justify-center">
              <Icon as={Users} size="xl" className="text-primary-500" />
            </View>
          </View>

          {/* Heading and subtitle */}
          <VStack className="mb-8 gap-2 items-center">
            <Heading size="2xl" className="text-typography-900 font-bold text-center">
              Create your account
            </Heading>
            <Text className="text-typography-500 text-base text-center">
              Start connecting with your community today.
            </Text>
          </VStack>

          {/* Form */}
          <VStack className="gap-5">
            {/* Full Name field */}
            <FormControl>
              <FormControlLabel>
                <FormControlLabelText className="text-typography-900 font-medium">
                  Full Name
                </FormControlLabelText>
              </FormControlLabel>
              <Input
                variant="outline"
                size="xl"
                className="rounded-2xl"
              >
                <InputSlot className="pl-3">
                  <InputIcon as={User} className="text-typography-400" />
                </InputSlot>
                <InputField
                  placeholder="John Doe"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    clearError();
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </Input>
            </FormControl>

            {/* Email Address field */}
            <FormControl>
              <FormControlLabel>
                <FormControlLabelText className="text-typography-900 font-medium">
                  Email Address
                </FormControlLabelText>
              </FormControlLabel>
              <Input
                variant="outline"
                size="xl"
                className="rounded-2xl"
              >
                <InputSlot className="pl-3">
                  <InputIcon as={Mail} className="text-typography-400" />
                </InputSlot>
                <InputField
                  placeholder="name@example.com"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    clearError();
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </Input>
            </FormControl>

            {/* Password field */}
            <FormControl>
              <FormControlLabel>
                <FormControlLabelText className="text-typography-900 font-medium">
                  Password
                </FormControlLabelText>
              </FormControlLabel>
              <Input
                variant="outline"
                size="xl"
                className="rounded-2xl"
              >
                <InputSlot className="pl-3">
                  <InputIcon as={Lock} className="text-typography-400" />
                </InputSlot>
                <InputField
                  placeholder="••••••••"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    clearError();
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <InputSlot
                  className="pr-3"
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <InputIcon
                    as={showPassword ? EyeOff : Eye}
                    className="text-typography-400"
                  />
                </InputSlot>
              </Input>
            </FormControl>

            {/* Terms text */}
            <Text className="text-typography-500 text-xs text-center leading-5">
              By creating an account, you agree to our{" "}
              <Text className="text-primary-500 text-xs">Terms of Service</Text>
              {" "}and{" "}
              <Text className="text-primary-500 text-xs">Privacy Policy</Text>.
            </Text>

            {/* Inline error */}
            {error && (
              <FormControl isInvalid>
                <FormControlError>
                  <FormControlErrorText>{error}</FormControlErrorText>
                </FormControlError>
              </FormControl>
            )}

            {/* Create Account button */}
            <Button
              size="xl"
              action="primary"
              className="w-full rounded-2xl"
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              {isSubmitting && <ButtonSpinner className="mr-2" />}
              <ButtonText className="font-semibold">Create Account</ButtonText>
            </Button>
          </VStack>

          {/* Divider */}
          <Divider className="my-8" />

          {/* Log In link */}
          <HStack className="justify-center items-center gap-1">
            <Text className="text-typography-500 text-sm">
              Already have an account?
            </Text>
            <Pressable onPress={() => router.back()}>
              <Text className="text-primary-500 text-sm font-semibold">
                Log In
              </Text>
            </Pressable>
          </HStack>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
