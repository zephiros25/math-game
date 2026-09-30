// The player's saved progress (wallet, best level, settings), persisted to
// AsyncStorage. Kept in a module-level store so any screen can read it
// synchronously once `loadProgress` has run at startup.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { GEMS } from '@/game/rewards';

export type Progress = {
  coins: number;
  gems: number;
  bestLevel: number;
  runLength: number;
  muted: boolean;
  maxLevel: number | null; // highest level the game may use; null = no limit
  theme: string; // id of the equipped theme
  ownedThemes: string[];
  pet: string | null; // id of the chosen pet
  ownedPets: string[];
  showPet: boolean; // parents can hide the pet without losing the child's choice
  lastRunDay: string | null; // local date of the last finished run (daily gem bonus)
  welcomeGiven: boolean; // the one-time welcome gems
};

const KEY = 'progress.v1';
const DEFAULTS: Progress = {
  coins: 0,
  gems: 0,
  bestLevel: 0,
  runLength: 20,
  muted: false,
  maxLevel: null,
  theme: 'sunny',
  ownedThemes: ['sunny'],
  pet: 'sprout',
  ownedPets: ['sprout'],
  showPet: true,
  lastRunDay: null,
  welcomeGiven: false,
};

let current: Progress = DEFAULTS;
const listeners = new Set<() => void>();

export async function loadProgress() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) current = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // Corrupt or unavailable storage: start fresh.
  }
  // Welcome gems, once (also for players from before the gift existed).
  if (!current.welcomeGiven) updateProgress({ gems: current.gems + GEMS.welcome, welcomeGiven: true });
  return current;
}

export function getProgress() {
  return current;
}

export function updateProgress(patch: Partial<Progress>) {
  current = { ...current, ...patch };
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => {});
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProgress() {
  return useSyncExternalStore(subscribe, getProgress, getProgress);
}
