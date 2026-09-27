import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  useFonts,
} from '@expo-google-fonts/fredoka';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { initFeedback, setMuted } from '@/feedback';
import { loadProgress } from '@/progress';
import { theme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold });
  const [progressLoaded, setProgressLoaded] = useState(false);

  useEffect(() => {
    // Inside an effect so audio players are only created on the device, not
    // during static web rendering.
    initFeedback();
    loadProgress().then((p) => {
      setMuted(p.muted);
      setProgressLoaded(true);
    });
  }, []);

  const ready = fontsLoaded && progressLoaded;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="play" options={{ gestureEnabled: false }} />
        <Stack.Screen name="results" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}
