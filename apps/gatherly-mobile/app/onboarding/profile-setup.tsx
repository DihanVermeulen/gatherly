import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export default function ProfileSetupScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background-0">
      <VStack className="items-center gap-2">
        <Text className="text-typography-500">Profile Setup - Coming Soon</Text>
      </VStack>
    </View>
  );
}
