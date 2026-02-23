import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useLocalSearchParams } from 'expo-router';

export default function JoinScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background-0 p-8">
      <Text className="text-2xl font-bold text-slate-900">Join Event</Text>
      <Text className="text-slate-500 text-center">
        Join screen coming in Phase 17.
      </Text>
      {token && (
        <Text className="text-xs text-slate-400">Token: {token}</Text>
      )}
    </View>
  );
}
