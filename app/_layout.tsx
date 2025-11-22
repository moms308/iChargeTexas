import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ServiceContext } from "@/constants/serviceContext";
import { UserContext } from "@/constants/userContext";
import { LanguageContext } from "@/constants/languageContext";
import { MessengerContext } from "@/constants/messengerContext";
import { AuthContext } from "@/constants/authContext";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import { trpc, trpcClient } from "@/lib/trpc";

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
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthContext>
          <LanguageContext>
            <UserContext>
              <ServiceContext>
                <MessengerContext>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <RootLayoutNav />
                  </GestureHandlerRootView>
                </MessengerContext>
              </ServiceContext>
            </UserContext>
          </LanguageContext>
        </AuthContext>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
