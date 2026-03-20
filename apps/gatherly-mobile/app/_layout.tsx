import { GestureHandlerRootView } from "react-native-gesture-handler";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { useColorScheme } from "@/components/useColorScheme";
import { Stack, useRouter } from "expo-router";
import { View } from "react-native";
import { consumePendingInviteCode, consumePendingMagicToken } from "./utils/pendingInvite";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { SessionProvider, useSession } from "./contexts/AuthContext";
import { EventsProvider } from "./contexts/EventsContext";
import { DatabaseProvider } from "@/contexts/DatabaseContext";
import { OfflineBanner } from "@/components/OfflineBanner";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Do NOT hide splash here — RootNavigator hides it after auth state resolves
  if (!loaded) return null;

  return (
    <SessionProvider>
      <DatabaseProvider>
        <RootLayoutNav />
      </DatabaseProvider>
    </SessionProvider>
  );
}

function RootLayoutNav() {
  const { session, isLoading } = useSession();
  const [colorMode] = useState<"light" | "dark">("light");
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // After authentication, check for pending magic token or invite code and redirect.
  // Magic token takes priority — it came from the user's original deep link.
  // This handles the race condition where Stack.Protected redirects away from
  // sign-in/register before they can navigate back themselves.
  useEffect(() => {
    if (session && !isLoading) {
      const magicToken = consumePendingMagicToken();
      if (magicToken) {
        // Small delay to let the Stack.Protected navigation settle
        const timer = setTimeout(() => {
          router.replace(`/magic-link/${magicToken}` as never);
        }, 100);
        return () => clearTimeout(timer);
      }
      const pendingCode = consumePendingInviteCode();
      if (pendingCode) {
        // Small delay to let the Stack.Protected navigation settle
        const timer = setTimeout(() => {
          router.replace(`/join?token=${pendingCode}`);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [session, isLoading]);

  // Hold splash screen while auth state is loading
  if (isLoading) return null;

  return (
    <GluestackUIProvider mode={colorMode}>
      <EventsProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View className="h-full w-full bg-background-500">
            <SafeAreaView
              className="h-full w-full max-w-7xl mx-auto bg-background-500"
              edges={["top"]}
            >
              <>
                <OfflineBanner />
                <ThemeProvider
                  value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
                >
                  <Stack>
                    {/* Authenticated routes — only accessible when session exists */}
                    <Stack.Protected guard={!!session}>
                      <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="edit-event"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="manage-exclusions"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="event-details"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="my-wishlist"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="edit-wishlist-item"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="view-wishlists"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="modal"
                        options={{ presentation: "modal" }}
                      />
                    </Stack.Protected>

                    {/* Unauthenticated routes — only accessible when no session */}
                    <Stack.Protected guard={!session}>
                      <Stack.Screen
                        name="sign-in"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="register"
                        options={{ headerShown: false }}
                      />
                    </Stack.Protected>

                    {/* Public routes — accessible regardless of auth state */}
                    <Stack.Screen
                      name="join"
                      options={{ headerShown: false, gestureEnabled: false }}
                    />
                    <Stack.Screen
                      name="magic-link/[token]"
                      options={{ headerShown: false, gestureEnabled: false }}
                    />
                  </Stack>
                </ThemeProvider>
              </>
            </SafeAreaView>
          </View>
        </GestureHandlerRootView>
      </EventsProvider>
    </GluestackUIProvider>
  );
}
