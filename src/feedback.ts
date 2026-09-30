// Sound + haptics for every interaction. Each sound has a small pool of
// players so rapid taps can overlap instead of cutting each other off.
//
// Themes can replace any sound slot with their own recordings
// (`applyThemeSounds`); slots a theme leaves out use the default set made in
// the Studio (src/default-sounds.generated.ts), and slots without one of
// those use the built-in synthesized sounds below.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { DEFAULT_SET } from '@/default-sounds.generated';
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

// Slots the Studio's default set can fill: every theme slot plus the voice
// used by pets without their own.
export type DefaultSetSlot = SoundSlot | 'voice';

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

// Each sound has a few players so quick repeats can overlap.
type Voice = { player: AudioPlayer };
type Pool = { voices: Voice[]; next: number };

// Playing faster must also sound higher (the streak climbs a scale, pets
// talk at their own pitch), so pitch correction is off: by default a faster
// rate keeps the pitch and just rushes the sound.
function createPlayer(source: number) {
  const player = createAudioPlayer(source);
  player.shouldCorrectPitch = false;
  return player;
}

const makePool = (source: number, size: number): Pool => ({
  voices: Array.from({ length: size }, () => ({ player: createPlayer(source) })),
  next: 0,
});

const releasePool = (pool: Pool) => pool.voices.forEach((v) => v.player.remove());

// Players per recording: more for sounds that repeat quickly. A fast player
// hears a correct sound every half second, so three players let each one
// ring out fully (about 1.5 s) before it is reused.
const poolSize = (slot: DefaultSetSlot) => (slot === 'coin' ? 4 : slot === 'correct' ? 3 : 2);

const VOICE_SYLLABLES: DefaultSound[] = ['voice-a', 'voice-e', 'voice-i', 'voice-o', 'voice-u'];

const POOL_SIZE: Partial<Record<DefaultSound, number>> = { key1: 2, key2: 2, key3: 2, back: 2, coin: 4, pop: 2 };

const defaultPools = new Map<DefaultSound, Pool>();
// The active theme's overrides: one pool per recording (tap can have several).
let themePools = new Map<SoundSlot, { pools: Pool[]; volume: number }>();
let themeSoundsId: string | null = null;
const defaultSetPools = new Map<DefaultSetSlot, { pools: Pool[]; volume: number }>();
let muted = false;

export function initFeedback() {
  setAudioModeAsync({ interruptionMode: 'mixWithOthers' }).catch(() => {});
  for (const name of Object.keys(DEFAULTS) as DefaultSound[]) {
    defaultPools.set(name, makePool(DEFAULTS[name], POOL_SIZE[name] ?? 1));
  }
  for (const [slot, sound] of Object.entries(DEFAULT_SET) as [DefaultSetSlot, { sources: number[]; volume: number }][]) {
    defaultSetPools.set(slot, { pools: sound.sources.map((source) => makePool(source, poolSize(slot))), volume: sound.volume });
  }
}

// Loads the theme's own sounds (if any) and releases the previous theme's.
export function applyThemeSounds(theme: Theme) {
  if (theme.id === themeSoundsId) return;
  themeSoundsId = theme.id;
  for (const { pools } of themePools.values()) {
    pools.forEach(releasePool);
  }
  themePools = new Map();
  for (const [slot, sound] of Object.entries(theme.sounds) as [SoundSlot, { sources: number[]; volume: number }][]) {
    themePools.set(slot, { pools: sound.sources.map((source) => makePool(source, poolSize(slot))), volume: sound.volume });
  }
}

// The chosen pet's own babble syllables (if it has any).
let petVoice: { id: string; pools: Pool[]; volume: number; pitch: number } | null = null;

export function applyPetVoice(pet: Pet | null) {
  if ((pet?.id ?? null) === (petVoice?.id ?? null)) return;
  petVoice?.pools.forEach(releasePool);
  petVoice = pet
    ? {
        id: pet.id,
        pools: pet.voiceFiles.map((source) => makePool(source, 2)),
        volume: pet.voiceVolume,
        pitch: pet.voicePitch,
      }
    : null;
}

export function setMuted(value: boolean) {
  muted = value;
}

// When every sound effect playing now will have finished (pet babble not
// included), so the pet can wait for quiet and screens can wait for the
// fanfare to end instead of piling sounds on top of each other.
let busyUntil = 0;
// Used when a player hasn't loaded its file yet and doesn't know its length.
const FALLBACK_SECONDS = 0.5;

function playFrom(pool: Pool | undefined, volume: number, rate?: number, isPet = false): Voice | undefined {
  if (muted || !pool) return undefined;
  const voice = pool.voices[pool.next];
  pool.next = (pool.next + 1) % pool.voices.length;
  const player = voice.player;
  try {
    player.volume = volume;
    // No pitch correction argument: changing the rate changes the pitch.
    if (rate !== undefined) player.setPlaybackRate(rate);
    // Jumping back to the start is asynchronous. A player still at the end
    // of its last sound must wait for it, or play() starts at the end and
    // plays nothing (the missing key taps).
    // (If the jump back doesn't confirm quickly, play anyway after 60 ms.)
    if (player.currentTime > 0.02) {
      let started = false;
      const start = () => {
        if (started) return;
        started = true;
        player.play();
      };
      player.seekTo(0).then(start, start);
      setTimeout(start, 60);
    } else {
      player.seekTo(0);
      player.play();
    }
    if (!isPet) {
      const seconds = (player.duration > 0 ? player.duration : FALLBACK_SECONDS) / (rate ?? 1);
      busyUntil = Math.max(busyUntil, Date.now() + seconds * 1000);
    }
  } catch (e) {
    // A missed sound effect should never break the game, but remember why
    // for the Sound check in the grown-ups' screen.
    lastError = e instanceof Error ? e.message : String(e);
  }
  return voice;
}

let lastError: string | null = null;

// For the Sound check (settings): plays one slot's sound and reports what the
// audio player says about it a moment later.
export async function checkSound(slot: DefaultSetSlot) {
  const set = defaultSetPools.get(slot);
  const theme = slot === 'voice' ? undefined : themePools.get(slot);
  const pool = (theme ?? set)?.pools[0] ?? defaultPools.get(slot === 'voice' ? 'voice-a' : DEFAULT_SLOTS_FOR_CHECK[slot]);
  const source = theme ? 'theme' : set ? 'default set' : 'built-in';
  if (!pool) return `${slot}: no sound`;
  const errorBefore = lastError;
  const voice = playFrom(pool, 1);
  await new Promise((r) => setTimeout(r, 150));
  const p = voice?.player;
  if (!p) return `${slot} (${source}): not played${muted ? ' (muted)' : ''}`;
  const error = lastError !== errorBefore ? ` · error: ${lastError}` : '';
  return `${slot} (${source}): loaded ${p.isLoaded ? 'yes' : 'NO'}, ${p.playing ? 'playing' : 'NOT playing'}, at ${p.currentTime.toFixed(2)} of ${p.duration.toFixed(2)} s${error}`;
}

const DEFAULT_SLOTS_FOR_CHECK: Record<Exclude<DefaultSetSlot, 'voice'>, DefaultSound> = {
  tap: 'key1',
  backspace: 'back',
  button: 'pop',
  correct: 'chime0',
  wrong: 'wrong',
  levelUp: 'levelup',
  fanfare: 'fanfare',
  coin: 'coin',
  gem: 'gem',
};

// Milliseconds until the sound effects playing now have finished (0 = quiet).
export function quietIn() {
  return muted ? 0 : Math.max(0, busyUntil - Date.now());
}

let lastSyllable = -1;
// A random syllable, never the same one twice in a row.
function pickSyllable(count: number) {
  let i = Math.floor(Math.random() * count);
  if (count > 1 && i === lastSyllable) i = (i + 1 + Math.floor(Math.random() * (count - 1))) % count;
  lastSyllable = i;
  return i;
}

let variant = 0;

// `vary` plays the sound with a little random change: pitch by up to
// ±vary.pitch semitones, volume down by up to vary.volume (0–1).
type Vary = { pitch: number; volume: number };

function playSlot(slot: Exclude<SoundSlot, 'correct'>, vary?: Vary) {
  // Rotate through variations (tap has three) so repeats don't sound robotic.
  variant += 1 + Math.floor(Math.random() * 2);
  const rate = vary ? 2 ** (((Math.random() * 2 - 1) * vary.pitch) / 12) : undefined;
  const gain = vary ? 1 - Math.random() * vary.volume : 1;
  const custom = themePools.get(slot) ?? defaultSetPools.get(slot);
  if (custom) return playFrom(custom.pools[variant % custom.pools.length], custom.volume * gain, rate);
  const { sounds, volume } = DEFAULT_SLOTS[slot];
  return playFrom(defaultPools.get(sounds[variant % sounds.length]), volume * gain, rate);
}

// The answer is judged on the last key press, so the correct/wrong sound
// waits for that key's tap to finish instead of sounding on top of it (at
// most AFTER_TAP_MAX_MS, so it never feels slow).
const AFTER_TAP_MAX_MS = 300;
let tapEndsAt = 0;
export function afterTap(fn: () => void) {
  const wait = Math.min(Math.max(0, tapEndsAt - Date.now()), AFTER_TAP_MAX_MS);
  if (wait > 0) setTimeout(fn, wait);
  else fn();
}

const canBuzz = Platform.OS === 'ios' || Platform.OS === 'android';
const buzz = (fn: () => Promise<void>) => {
  if (canBuzz) fn().catch(() => {});
};

export const feedback = {
  key() {
    const voice = playSlot('tap');
    const seconds = voice && voice.player.duration > 0 ? voice.player.duration : 0;
    tapEndsAt = Date.now() + seconds * 1000;
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
    afterTap(() => {
      const custom = themePools.get('correct') ?? defaultSetPools.get('correct');
      if (custom) {
        const semitones = STREAK_SEMITONES[Math.min(streak - 1, STREAK_SEMITONES.length - 1)];
        playFrom(custom.pools[0], custom.volume, 2 ** (semitones / 12));
      } else {
        playFrom(defaultPools.get(`chime${Math.min(streak - 1, 9)}` as DefaultSound), 1);
      }
      buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    });
  },
  wrong() {
    afterTap(() => {
      playSlot('wrong');
      buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    });
  },
  levelUp() {
    playSlot('levelUp');
  },
  // Each coin a touch higher or lower and softer or louder, so a count-up
  // sounds like real coins rather than one sample repeated.
  coin() {
    playSlot('coin', { pitch: 1, volume: 0.25 });
    buzz(() => Haptics.selectionAsync());
  },
  gem() {
    playSlot('gem');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
  },
  // One babble syllable while a pet talks, at a slightly random pitch so a
  // sentence sounds like cute chatter. `pet` sets the voice's pitch.
  // One babble syllable of a talking pet. Returns how long it lasts (ms), so
  // the pet can start the next one only when this one is over; 0 when it
  // stayed silent. The pitch varies only a little, and the same syllable
  // never plays twice in a row, so a sentence sounds like calm chatter.
  petSyllable(pet: Pet): number {
    // Another sound started while the pet was talking: let it finish silently.
    if (quietIn() > 0) return 0;
    const rate = Math.min(2, Math.max(0.5, pet.voicePitch * (0.96 + Math.random() * 0.08)));
    const setVoice = defaultSetPools.get('voice');
    let voice: Voice | undefined;
    if (petVoice?.id === pet.id && petVoice.pools.length) {
      voice = playFrom(petVoice.pools[pickSyllable(petVoice.pools.length)], petVoice.volume, rate, true);
    } else if (setVoice) {
      voice = playFrom(setVoice.pools[pickSyllable(setVoice.pools.length)], pet.voiceVolume * setVoice.volume, rate, true);
    } else {
      voice = playFrom(defaultPools.get(VOICE_SYLLABLES[pickSyllable(VOICE_SYLLABLES.length)]), pet.voiceVolume, rate, true);
    }
    if (!voice) return 0;
    const seconds = voice.player.duration > 0 ? voice.player.duration : 0.25;
    return Math.round((seconds * 1000) / rate);
  },
  fanfare() {
    playSlot('fanfare');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
};
