// Sound + haptics for every interaction. Each sound has a small pool of
// players so rapid taps can overlap instead of cutting each other off.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const SOURCES = {
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
} as const;

type Sound = keyof typeof SOURCES;

const POOL_SIZE: Partial<Record<Sound, number>> = { key1: 2, key2: 2, key3: 2, back: 2, coin: 4, pop: 2 };

const pools = new Map<Sound, { players: AudioPlayer[]; next: number }>();
let muted = false;

export function initFeedback() {
  setAudioModeAsync({ interruptionMode: 'mixWithOthers' }).catch(() => {});
  for (const name of Object.keys(SOURCES) as Sound[]) {
    const players = Array.from({ length: POOL_SIZE[name] ?? 1 }, () => createAudioPlayer(SOURCES[name]));
    pools.set(name, { players, next: 0 });
  }
}

export function setMuted(value: boolean) {
  muted = value;
}

function play(name: Sound, volume = 1) {
  if (muted) return;
  const pool = pools.get(name);
  if (!pool) return;
  const player = pool.players[pool.next];
  pool.next = (pool.next + 1) % pool.players.length;
  try {
    player.volume = volume;
    player.seekTo(0);
    player.play();
  } catch {
    // A missed sound effect should never break the game.
  }
}

const canBuzz = Platform.OS === 'ios' || Platform.OS === 'android';
const buzz = (fn: () => Promise<void>) => {
  if (canBuzz) fn().catch(() => {});
};

let keyVariant = 0;

export const feedback = {
  key() {
    // Rotate through three slightly different knocks so fast typing doesn't
    // sound like a machine gun.
    keyVariant = (keyVariant + 1 + Math.floor(Math.random() * 2)) % 3;
    play((['key1', 'key2', 'key3'] as const)[keyVariant], 0.9);
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  backspace() {
    play('back', 0.8);
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
  },
  button() {
    play('pop');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  // Each answer in a streak rings one pentatonic step higher.
  correct(streak: number) {
    play(`chime${Math.min(streak - 1, 9)}` as Sound);
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  wrong() {
    play('wrong');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },
  levelUp() {
    play('levelup', 0.7);
  },
  coin() {
    play('coin', 0.6);
    buzz(() => Haptics.selectionAsync());
  },
  gem() {
    play('gem');
    buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
  },
  fanfare() {
    play('fanfare');
    buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
};
