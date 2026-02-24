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
import { Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { SessionProvider, useSession } from "./contexts/AuthContext";
import { EventsProvider } from "./contexts/EventsContext";

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
      <RootLayoutNav />
    </SessionProvider>
  );
}

function RootLayoutNav() {
  const { session, isLoading } = useSession();
  const [colorMode] = useState<"light" | "dark">("light");
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Hold splash screen while auth state is loading
  if (isLoading) return null;

  return (
    <GluestackUIProvider mode={colorMode}>
      <EventsProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View className="h-full w-full bg-background-0">
            <SafeAreaView
              className="h-full w-full max-w-7xl mx-auto bg-background-0"
              edges={["top"]}
            >
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
                      name="event-details"
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
                  <Stack.Screen name="join" options={{ headerShown: false }} />
                </Stack>
              </ThemeProvider>
            </SafeAreaView>
          </View>
        </GestureHandlerRootView>
      </EventsProvider>
    </GluestackUIProvider>
  );
}
