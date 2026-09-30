// The players on this device and each player's saved progress (wallet, best
// level, settings), persisted to AsyncStorage. Kept in module-level stores so
// any screen can read them synchronously once `loadProgress` has run at
// startup. `getProgress`/`updateProgress`/`useProgress` always act on the
// active player.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { GEMS } from '@/game/rewards';
import { loadStats, removeStats } from '@/stats';

// What a practice run drills instead of the adaptive ladder (a Plus feature).
export type Focus = { kind: 'tricky' } | { kind: 'tables'; tables: number[] } | null;

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
  focus: Focus;
};

export type Player = { id: string; name: string };

// Device-wide: who plays here, who is playing now, and whether Math Run Plus
// is unlocked (for everyone on the device).
export type Device = {
  players: Player[];
  active: string;
  plus: boolean;
};

export const FREE_PLAYERS = 1;
export const PLUS_PLAYERS = 6;

const DEVICE_KEY = 'device.v1';
// The first player keeps the storage key from before there were players.
const progressKey = (id: string) => (id === 'main' ? 'progress.v1' : `progress.${id}.v1`);

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
  focus: null,
};
const DEVICE_DEFAULTS: Device = { players: [{ id: 'main', name: 'Player 1' }], active: 'main', plus: false };

let current: Progress = DEFAULTS;
let device: Device = DEVICE_DEFAULTS;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function readJson<T>(key: string, defaults: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    // Corrupt or unavailable storage: start fresh.
  }
  return defaults;
}

// Loads a player's progress and report and makes them the active player.
async function loadPlayer(id: string) {
  const progress = await readJson(progressKey(id), DEFAULTS);
  await loadStats(id);
  current = progress;
  device = { ...device, active: id };
  // Welcome gems, once per player (also for players from before the gift existed).
  if (!current.welcomeGiven) updateProgress({ gems: current.gems + GEMS.welcome, welcomeGiven: true });
  emit();
}

export async function loadProgress() {
  device = await readJson(DEVICE_KEY, DEVICE_DEFAULTS);
  await loadPlayer(device.players.some((p) => p.id === device.active) ? device.active : device.players[0].id);
  return current;
}

export function getProgress() {
  return current;
}

export function updateProgress(patch: Partial<Progress>) {
  current = { ...current, ...patch };
  emit();
  AsyncStorage.setItem(progressKey(device.active), JSON.stringify(current)).catch(() => {});
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProgress() {
  return useSyncExternalStore(subscribe, getProgress, getProgress);
}

// ---------------------------------------------------------------- players and Plus

export function getDevice() {
  return device;
}

export function useDevice() {
  return useSyncExternalStore(subscribe, getDevice, getDevice);
}

function updateDevice(patch: Partial<Device>) {
  device = { ...device, ...patch };
  emit();
  AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(device)).catch(() => {});
}

export const activePlayer = (d: Device = device) => d.players.find((p) => p.id === d.active) ?? d.players[0];
export const maxPlayers = (d: Device = device) => (d.plus ? PLUS_PLAYERS : FREE_PLAYERS);

export async function switchPlayer(id: string) {
  if (id === device.active || !device.players.some((p) => p.id === id)) return;
  await loadPlayer(id);
  updateDevice({ active: id });
}

export async function addPlayer(name: string) {
  if (device.players.length >= maxPlayers()) return null;
  const id = `p${Date.now().toString(36)}`;
  updateDevice({ players: [...device.players, { id, name: name.trim() || `Player ${device.players.length + 1}` }] });
  await switchPlayer(id);
  return id;
}

export function renamePlayer(id: string, name: string) {
  updateDevice({ players: device.players.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)) });
}

export async function removePlayer(id: string) {
  const rest = device.players.filter((p) => p.id !== id);
  if (rest.length === 0) return;
  if (device.active === id) await switchPlayer(rest[0].id);
  updateDevice({ players: rest });
  AsyncStorage.removeItem(progressKey(id)).catch(() => {});
  removeStats(id);
}

export function setPlus(plus: boolean) {
  updateDevice({ plus });
}
