// Sound + haptics for every interaction. Each sound has a small pool of
// players so rapid taps can overlap instead of cutting each other off.
//
// Themes can replace any sound slot with their own recordings
// (`applyThemeSounds`); slots a theme leaves out use the defaults below.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import type { Pet } from '@/pets';
import type { SoundSlot, Theme } from '@/theme';

const DEFAULTS = {
  key1: require('@/assets/sounds/key1.wav'),
  key2: require('@/assets/sounds/key2.wav'),
  key3: require('@/assets/sounds/key3.wav'),
  back: require('@/assets/sounds/back.wav'),
  pop: require('@/assets/sounds/pop.wav'),
  wrong: require('@/assets/sounds/wrong.wav'),
  chime0: require('@/assets/sounds/chime0.wav'),
  chime1: require('@/assets/sounds/chime1.wav'),
  chime2: require('@/assets/sounds/chime2.wav'),
  chime3: require('@/assets/sounds/chime3.wav'),
  chime4: require('@/assets/sounds/chime4.wav'),
  chime5: require('@/assets/sounds/chime5.wav'),
  chime6: require('@/assets/sounds/chime6.wav'),
  chime7: require('@/assets/sounds/chime7.wav'),
  chime8: require('@/assets/sounds/chime8.wav'),
  chime9: require('@/assets/sounds/chime9.wav'),
  levelup: require('@/assets/sounds/levelup.wav'),
  fanfare: require('@/assets/sounds/fanfare.wav'),
  coin: require('@/assets/sounds/coin.wav'),
  gem: require('@/assets/sounds/gem.wav'),
  'voice-a': require('@/assets/sounds/voice-a.wav'),
  'voice-e': require('@/assets/sounds/voice-e.wav'),
  'voice-i': require('@/assets/sounds/voice-i.wav'),
  'voice-o': require('@/assets/sounds/voice-o.wav'),
  'voice-u': require('@/assets/sounds/voice-u.wav'),
} as const;

type DefaultSound = keyof typeof DEFAULTS;

// Default sound(s) for each slot, with their base volume.
const DEFAULT_SLOTS: Record<Exclude<SoundSlot, 'correct'>, { sounds: DefaultSound[]; volume: number }> = {
  tap: { sounds: ['key1', 'key2', 'key3'], volume: 0.9 },
  backspace: { sounds: ['back'], volume: 0.8 },
  button: { sounds: ['pop'], volume: 1 },
  wrong: { sounds: ['wrong'], volume: 1 },
  levelUp: { sounds: ['levelup'], volume: 0.7 },
  fanfare: { sounds: ['fanfare'], volume: 1 },
  coin: { sounds: ['coin'], volume: 0.6 },
  gem: { sounds: ['gem'], volume: 1 },
};

// A theme's single "correct" recording is pitched up the pentatonic scale for
// each answer in a streak (in semitones; capped at an octave, the highest
// playback rate every platform supports).
const STREAK_SEMITONES = [0, 2, 4, 7, 9, 12];

type Pool = { players: AudioPlayer[]; next: number };

const VOICE_SYLLABLES: DefaultSound[] = ['voice-a', 'voice-e', 'voice-i', 'voice-o', 'voice-u'];

const POOL_SIZE: Partial<Record<DefaultSound, number>> = { key1: 2, key2: 2, key3: 2, back: 2, coin: 4, pop: 2 };

const defaultPools = new Map<DefaultSound, Pool>();
// The active theme's overrides: one pool per recording (tap can have several).
let themePools = new Map<SoundSlot, { pools: Pool[]; volume: number }>();
let themeSoundsId: string | null = null;
let muted = false;

export function initFeedback() {
  setAudioModeAsync({ interruptionMode: 'mixWithOthers' }).catch(() => {});
  for (const name of Object.keys(DEFAULTS) as DefaultSound[]) {
    const players = Array.from({ length: POOL_SIZE[name] ?? 1 }, () => createAudioPlayer(DEFAULTS[name]));
    defaultPools.set(name, { players, next: 0 });
  }
}

// Loads the theme's own sounds (if any) and releases the previous theme's.
export function applyThemeSounds(theme: Theme) {
  if (theme.id === themeSoundsId) return;
  themeSoundsId = theme.id;
  for (const { pools } of themePools.values()) {
    for (const pool of pools) pool.players.forEach((p) => p.remove());
  }
  themePools = new Map();
  for (const [slot, sound] of Object.entries(theme.sounds) as [SoundSlot, { sources: number[]; volume: number }][]) {
    const size = slot === 'coin' ? 4 : 2;
    const pools = sound.sources.map((source) => ({
      players: Array.from({ length: size }, () => createAudioPlayer(source)),
      next: 0,
    }));
    themePools.set(slot, { pools, volume: sound.volume });
  }
}

// The chosen pet's own babble syllables (if it has any).
let petVoice: { id: string; pools: Pool[]; volume: number; pitch: number } | null = null;

export function applyPetVoice(pet: Pet | null) {
  if ((pet?.id ?? null) === (petVoice?.id ?? null)) return;
  petVoice?.pools.forEach((pool) => pool.players.forEach((p) => p.remove()));
  petVoice = pet
    ? {
        id: pet.id,
        pools: pet.voiceFiles.map((source) => ({ players: [createAudioPlayer(source), createAudioPlayer(source)], next: 0 })),
        volume: pet.voiceVolume,
        pitch: pet.voicePitch,
      }
    : null;
}

export function setMuted(value: boolean) {
  muted = value;
}

function playFrom(pool: Pool | undefined, volume: number, rate?: number) {
  if (muted || !pool) return;
  const player = pool.players[pool.next];
  pool.next = (pool.next + 1) % pool.players.length;
  try {
    player.volume = volume;
    // No pitch correction argument: changing the rate changes the pitch.
    if (rate !== undefined) player.setPlaybackRate(rate);
    player.seekTo(0);
    player.play();
  } catch {
    // A missed sound effect should never break the game.
  }
}

let variant = 0;

function playSlot(slot: Exclude<SoundSlot, 'correct'>) {
  // Rotate through variations (tap has three) so repeats don't sound robotic.
  variant += 1 + Math.floor(Math.random() * 2);
  const custom = themePools.get(slot);
  if (custom) {
    playFrom(custom.pools[variant % custom.pools.length], custom.volume);
    return;
  }
  const { sounds, volume } = DEFAULT_SLOTS[slot];
  playFrom(defaultPools.get(sounds[variant % sounds.length]), volume);
}

const canBuzz = Platform.OS === 'ios' || Platform.OS === 'android';
const buzz = (fn: () => Promise<void>) => {
  if (canBuzz) fn().catch(() => {});
};

export const feedback = {
  key() {
    playSlot('tap');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  backspace() {
    playSlot('backspace');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
  },
  button() {
    playSlot('button');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  // Each answer in a streak rings one pentatonic step higher.
  correct(streak: number) {
    const custom = themePools.get('correct');
    if (custom) {
      const semitones = STREAK_SEMITONES[Math.min(streak - 1, STREAK_SEMITONES.length - 1)];
      playFrom(custom.pools[0], custom.volume, 2 ** (semitones / 12));
    } else {
      playFrom(defaultPools.get(`chime${Math.min(streak - 1, 9)}` as DefaultSound), 1);
    }
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  wrong() {
    playSlot('wrong');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },
  levelUp() {
    playSlot('levelUp');
  },
  coin() {
    playSlot('coin');
    buzz(() => Haptics.selectionAsync());
  },
  gem() {
    playSlot('gem');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
  },
  // One babble syllable while a pet talks, at a slightly random pitch so a
  // sentence sounds like cute chatter. `pet` sets the voice's pitch.
  petSyllable(pet: Pet) {
    const rate = Math.min(2, Math.max(0.5, pet.voicePitch * (0.88 + Math.random() * 0.3)));
    if (petVoice?.id === pet.id && petVoice.pools.length) {
      playFrom(petVoice.pools[Math.floor(Math.random() * petVoice.pools.length)], petVoice.volume, rate);
    } else {
      const syllable = VOICE_SYLLABLES[Math.floor(Math.random() * VOICE_SYLLABLES.length)];
      playFrom(defaultPools.get(syllable), pet.voiceVolume, rate);
    }
  },
  fanfare() {
    playSlot('fanfare');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
};
