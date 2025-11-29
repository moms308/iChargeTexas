import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ServiceContext } from "@/constants/serviceContext";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { UserContext } from "@/constants/userContext";
import { LanguageContext } from "@/constants/languageContext";
import { MessengerContext } from "@/constants/messengerContext";
import { AuthContext } from "@/constants/authContext";
import { ThemeContext } from "@/constants/themeContext";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import { trpc, trpcReactClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  'source.uri should not be an empty string',
]);

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen 
          name="user-management" 
          options={{ 
            title: "User Management",
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="invoice-detail" 
          options={{ 
            title: "Invoice Details",
            headerShown: false,
          }} 
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcReactClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthContext>
          <ThemeContext>
            <LanguageContext>
              <UserContext>
                <ServiceContext>
                  <MessengerContext>
                    <AppErrorBoundary>
                      <GestureHandlerRootView style={{ flex: 1 }}>
                        <RootLayoutNav />
                      </GestureHandlerRootView>
                    </AppErrorBoundary>
                  </MessengerContext>
                </ServiceContext>
              </UserContext>
            </LanguageContext>
          </ThemeContext>
        </AuthContext>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
