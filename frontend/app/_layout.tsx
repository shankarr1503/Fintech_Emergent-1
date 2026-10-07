import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { GameProvider } from '../src/game/GameContext';
import { C } from '../src/game/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Sends signed-out players (logout, expired session) back to the title screen. */
function AuthGate() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const inAuth = segments[0] === '(auth)';
  const atRoot = (segments as string[]).length === 0;

  useEffect(() => {
    if (!isLoading && !user && !inAuth && !atRoot) router.replace('/(auth)/login');
  }, [isLoading, user, inAuth, atRoot, router]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ PressStart2P_400Regular });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GameProvider>
          <AuthGate />
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.sky }, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          </Stack>
        </GameProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
