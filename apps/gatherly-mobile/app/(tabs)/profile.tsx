import { View } from "react-native";
import { LogOut } from "lucide-react-native";
import { useSession } from "@/app/contexts/AuthContext";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function ProfileScreen() {
  const { signOut, user } = useSession();

  return (
    <View className="flex-1 items-center justify-center bg-background-0 px-6">
      {user?.email ? (
        <Text className="text-typography-600 mb-2 text-sm">{user.email}</Text>
      ) : null}
      <Text className="text-typography-500 mb-6">Profile — coming soon</Text>
      <Button
        action="negative"
        variant="outline"
        className="mt-2"
        onPress={async () => {
          await signOut();
        }}
      >
        <Icon as={LogOut} className="mr-2 text-error-600" size="sm" />
        <ButtonText>Log Out</ButtonText>
      </Button>
    </View>
  );
}
