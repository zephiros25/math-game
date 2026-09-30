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

import { applyPetVoice, applyThemeSounds, initFeedback, setMuted } from '@/feedback';
import { petById } from '@/pets';
import { loadProgress, useProgress } from '@/progress';
import { THEME_FONT_FILES, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    ...THEME_FONT_FILES,
  });
  const [progressLoaded, setProgressLoaded] = useState(false);
  const t = useTheme();
  const { pet, showPet } = useProgress();

  useEffect(() => {
    // Inside an effect so audio players are only created on the device, not
    // during static web rendering.
    initFeedback();
    loadProgress().then((p) => {
      setMuted(p.muted);
      setProgressLoaded(true);
    });
  }, []);

  useEffect(() => {
    applyThemeSounds(t);
  }, [t]);

  useEffect(() => {
    applyPetVoice(showPet ? petById(pet) : null);
  }, [pet, showPet]);

  const ready = fontsLoaded && progressLoaded;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: t.background },
        }}
      >
        <Stack.Screen name="play" options={{ gestureEnabled: false }} />
        <Stack.Screen name="results" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}
