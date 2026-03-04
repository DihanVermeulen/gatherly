import { View, Text } from "react-native";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

/**
 * Displays a visible banner when the device is offline.
 * Only renders when definitively offline (isConnected === false).
 * Returns null during initialization (null) or when connected (true).
 * Auto-hides when connectivity is restored.
 */
export function OfflineBanner() {
  const isConnected = useNetworkStatus();

  // Don't show during initialization (null) or when connected
  if (isConnected !== false) return null;

  return (
    <View className="bg-amber-500 px-4 py-2">
      <Text className="text-white text-center text-sm font-medium">
        You're offline — showing cached data
      </Text>
    </View>
  );
}
