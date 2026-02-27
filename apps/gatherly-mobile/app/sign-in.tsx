import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { router } from "expo-router";
import { Eye, EyeOff, Users } from "lucide-react-native";
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

export default function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await authApi.login(email.trim(), password);
      await signIn(response.accessToken, response.user);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      setError(
        anyErr?.response?.data?.message ||
          "Invalid credentials. Please try again.",
      );
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
          {/* Header row: Back arrow + Logo */}
          <HStack className="items-center mb-8">
            {router.canGoBack() ? (
              <Pressable onPress={() => router.back()} className="mr-4">
                <Text className="text-2xl text-typography-900">&#8592;</Text>
              </Pressable>
            ) : (
              <View className="w-8 mr-4" />
            )}
            <HStack className="items-center gap-2 flex-1 justify-center">
              <View className="w-9 h-9 rounded-full bg-primary-500 items-center justify-center">
                <Icon as={Users} size="sm" className="text-white" />
              </View>
              <Text className="text-xl font-bold text-typography-900">
                Gatherly
              </Text>
            </HStack>
            {/* Spacer to balance the back arrow */}
            <View className="w-8 ml-4" />
          </HStack>

          {/* Welcome heading */}
          <VStack className="mb-8 gap-2">
            <Heading size="2xl" className="text-typography-900 font-bold">
              Welcome Back
            </Heading>
            <Text className="text-typography-500 text-base">
              Please enter your details to sign in to Gatherly.
            </Text>
          </VStack>

          {/* Form */}
          <VStack className="gap-5">
            {/* Email field */}
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
                <InputField
                  placeholder="e.g. name@example.com"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </Input>
            </FormControl>

            {/* Password field */}
            <FormControl>
              <HStack className="justify-between items-center mb-1">
                <FormControlLabel className="mb-0">
                  <FormControlLabelText className="text-typography-900 font-medium">
                    Password
                  </FormControlLabelText>
                </FormControlLabel>
                <Pressable>
                  <Text className="text-primary-500 text-sm font-medium">
                    Forgot Password?
                  </Text>
                </Pressable>
              </HStack>
              <Input
                variant="outline"
                size="xl"
                className="rounded-2xl"
              >
                <InputField
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError(null);
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

            {/* Inline error */}
            {error && (
              <FormControl isInvalid>
                <FormControlError>
                  <FormControlErrorText>{error}</FormControlErrorText>
                </FormControlError>
              </FormControl>
            )}

            {/* Log In button */}
            <Button
              size="xl"
              action="primary"
              className="w-full rounded-2xl mt-2"
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting && <ButtonSpinner className="mr-2" />}
              <ButtonText className="font-semibold">Log In</ButtonText>
            </Button>
          </VStack>

          {/* OR CONTINUE WITH divider */}
          <HStack className="items-center my-6 gap-3">
            <Divider className="flex-1" />
            <Text className="text-typography-400 text-xs font-medium tracking-widest uppercase">
              Or continue with
            </Text>
            <Divider className="flex-1" />
          </HStack>

          {/* Social login buttons */}
          <HStack className="gap-3 mb-8">
            <Button
              variant="outline"
              size="xl"
              className="flex-1 rounded-2xl"
              onPress={() => {}}
            >
              <ButtonText className="text-typography-700">Google</ButtonText>
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="flex-1 rounded-2xl"
              onPress={() => {}}
            >
              <ButtonText className="text-typography-700">Apple</ButtonText>
            </Button>
          </HStack>

          {/* Sign Up link */}
          <HStack className="justify-center items-center gap-1">
            <Text className="text-typography-500 text-sm">
              Don't have an account?
            </Text>
            <Pressable onPress={() => router.push("/register" as never)}>
              <Text className="text-primary-500 text-sm font-semibold">
                Sign Up
              </Text>
            </Pressable>
          </HStack>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
