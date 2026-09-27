// Themes. The themes themselves live as data in the themes/ folder (edited
// with the Theme Studio: npm run studio) and are compiled into
// theme-registry.generated.ts. Every screen reads the active theme via
// `useTheme()`.
//
// Unlock rules: `price` in coins (earned by playing, never sold), or
// `premium` for themes that will be sold as in-app purchases, with part of
// the proceeds going to Alzheimer's research.

import { createContext, useContext } from 'react';

import { useProgress } from '@/progress';
import { THEME_DATA } from '@/theme-registry.generated';

export type ParticleStyle = 'none' | 'sunbeams' | 'bubbles' | 'leaves' | 'confetti' | 'stars' | 'aurora' | 'sparkles' | 'petals';

export type SoundSlot = 'tap' | 'backspace' | 'button' | 'correct' | 'wrong' | 'levelUp' | 'fanfare' | 'coin' | 'gem';

// A bundled asset, as returned by require().
type Asset = number;

type Colors = {
  background: string;
  backgroundDeep: string;
  text: string;
  textSoft: string;
  key: string;
  keyEdge: string;
  keyText: string;
  primary: string;
  primaryEdge: string;
  onPrimary: string;
  correct: string;
  correctEdge: string;
  wrong: string;
  wrongEdge: string;
  onFeedback: string;
  streak: string;
  streakBg: string;
  card: string;
  cardEdge: string;
  track: string;
};

// The shape of each entry in the generated registry.
export type ThemeData = {
  id: string;
  name: string;
  tagline: string;
  order: number;
  price: number; // coins; 0 = free
  premium: boolean;
  dark: boolean;
  colors: Colors;
  backgroundImage: Asset | null;
  backgroundDim: number; // 0..0.9, fades the image towards the background color
  particleStyle: string;
  particleColors: string[];
  particleImages: Asset[];
  particleAmount: number; // multiplier on the style's particle count
  particleOpacity: number;
  sounds: Partial<Record<SoundSlot, { sources: Asset[]; volume: number }>>;
};

// Colors are flattened onto the theme so screens can write `t.primary`.
export type Theme = Omit<ThemeData, 'colors' | 'particleStyle'> & Colors & { particleStyle: ParticleStyle };

export const THEMES: readonly Theme[] = THEME_DATA.map(({ colors, ...rest }) => ({
  ...rest,
  ...colors,
  particleStyle: rest.particleStyle as ParticleStyle,
}));

export const DEFAULT_THEME_ID = 'sunny';

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID) ?? THEMES[0];
}

// Lets a subtree (the theme shop's live preview) render in a theme other than
// the equipped one.
export const ThemeOverride = createContext<Theme | null>(null);

export function useTheme(): Theme {
  const override = useContext(ThemeOverride);
  const { theme } = useProgress();
  return override ?? themeById(theme);
}

export const font = {
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
};
