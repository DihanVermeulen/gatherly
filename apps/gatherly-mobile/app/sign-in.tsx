import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { useSession } from './contexts/AuthContext';

export default function SignInScreen() {
  const { signIn } = useSession();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background-0 p-8">
      <Text className="text-2xl font-bold text-slate-900">Sign in to Gatherly</Text>
      <Text className="text-slate-500 text-center">
        Login screen coming in Phase 12.
      </Text>
      <Button onPress={() => signIn('stub-token')} className="w-full">
        <ButtonText>Continue (stub)</ButtonText>
      </Button>
    </View>
  );
}
