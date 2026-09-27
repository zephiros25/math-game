// Themes. Each theme is a full set of color tokens plus an animated background
// decoration. Every screen reads the active theme via `useTheme()`, so a new
// theme is just a new entry in THEMES.
//
// Unlock rules: `price` in coins (earned by playing, never sold), or
// `premium` for themes that will be sold as in-app purchases, with part of
// the proceeds going to Alzheimer's research.

import { createContext, useContext } from 'react';

import { useProgress } from '@/progress';

export type Decoration = 'sunbeams' | 'bubbles' | 'leaves' | 'confetti' | 'stars' | 'aurora' | 'sparkles' | 'petals';

export type Theme = {
  id: string;
  name: string;
  tagline: string;
  price: number; // coins; 0 = free
  premium: boolean;
  dark: boolean;
  decoration: Decoration;
  // Colors used by the decoration particles.
  particles: string[];

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

const sunny: Theme = {
  id: 'sunny',
  name: 'Sunny',
  tagline: 'Warm and cosy',
  price: 0,
  premium: false,
  dark: false,
  decoration: 'sunbeams',
  particles: ['#FFD9A8', '#FFC9B5', '#FFE7B8'],
  background: '#FFF4E6',
  backgroundDeep: '#FFE9D1',
  text: '#3B2A4A',
  textSoft: '#8A7898',
  key: '#FFFFFF',
  keyEdge: '#E8D9C6',
  keyText: '#3B2A4A',
  primary: '#FF7A59',
  primaryEdge: '#D9573A',
  onPrimary: '#FFFFFF',
  correct: '#3CC47C',
  correctEdge: '#2A9A5E',
  wrong: '#FF6B6B',
  wrongEdge: '#D94B4B',
  onFeedback: '#FFFFFF',
  streak: '#FF8A3D',
  streakBg: '#FFE3CC',
  card: '#FFFFFF',
  cardEdge: '#EFE2D2',
  track: '#F1E3D1',
};

const ocean: Theme = {
  id: 'ocean',
  name: 'Ocean',
  tagline: 'Bubbles from the deep',
  price: 300,
  premium: false,
  dark: false,
  decoration: 'bubbles',
  particles: ['#9FDDF0', '#B8E8F5', '#8FD3EA'],
  background: '#E8F7FC',
  backgroundDeep: '#D2EEF7',
  text: '#123B4F',
  textSoft: '#5E8A9C',
  key: '#FFFFFF',
  keyEdge: '#BFE0EC',
  keyText: '#123B4F',
  primary: '#1FA3C9',
  primaryEdge: '#147C9C',
  onPrimary: '#FFFFFF',
  correct: '#2EC4A0',
  correctEdge: '#1F9A7C',
  wrong: '#FF7A7A',
  wrongEdge: '#D95656',
  onFeedback: '#FFFFFF',
  streak: '#FF8A5C',
  streakBg: '#FFE6DA',
  card: '#FFFFFF',
  cardEdge: '#C9E6EF',
  track: '#D3EDF5',
};

const meadow: Theme = {
  id: 'meadow',
  name: 'Meadow',
  tagline: 'Sunflowers and soft grass',
  price: 500,
  premium: false,
  dark: false,
  decoration: 'leaves',
  particles: ['#B7DE9C', '#CFE8B5', '#F7D98A'],
  background: '#F2F9EA',
  backgroundDeep: '#E2F1D4',
  text: '#2E4A2A',
  textSoft: '#75926E',
  key: '#FFFFFF',
  keyEdge: '#D2E6C4',
  keyText: '#2E4A2A',
  primary: '#F2A93B',
  primaryEdge: '#C9832A',
  onPrimary: '#FFFFFF',
  correct: '#5CBF5A',
  correctEdge: '#3F9A3E',
  wrong: '#EE7B6B',
  wrongEdge: '#C95A4B',
  onFeedback: '#FFFFFF',
  streak: '#E9892B',
  streakBg: '#FCEBCF',
  card: '#FFFFFF',
  cardEdge: '#D9EBCB',
  track: '#DDEFD0',
};

const candy: Theme = {
  id: 'candy',
  name: 'Candy',
  tagline: 'Sprinkles on everything',
  price: 800,
  premium: false,
  dark: false,
  decoration: 'confetti',
  particles: ['#FF9CC7', '#9FD8FF', '#FFE17A', '#B9A7FF', '#8FE3C4'],
  background: '#FFF0F6',
  backgroundDeep: '#FFDDEB',
  text: '#5A2A4A',
  textSoft: '#A37A93',
  key: '#FFFFFF',
  keyEdge: '#F5CFE0',
  keyText: '#5A2A4A',
  primary: '#FF5FA2',
  primaryEdge: '#D63E80',
  onPrimary: '#FFFFFF',
  correct: '#3CC4A0',
  correctEdge: '#2A9A7E',
  wrong: '#FF8A5C',
  wrongEdge: '#D96A3E',
  onFeedback: '#FFFFFF',
  streak: '#FF5FA2',
  streakBg: '#FFD9EA',
  card: '#FFFFFF',
  cardEdge: '#F6D5E4',
  track: '#FBDDEA',
};

const night: Theme = {
  id: 'night',
  name: 'Night Sky',
  tagline: 'Count the stars',
  price: 1200,
  premium: false,
  dark: true,
  decoration: 'stars',
  particles: ['#FFFFFF', '#FFE8A3', '#C9C2FF'],
  background: '#1B1740',
  backgroundDeep: '#141033',
  text: '#F3F0FF',
  textSoft: '#A49FD1',
  key: '#2E2966',
  keyEdge: '#141033',
  keyText: '#F3F0FF',
  primary: '#FFC845',
  primaryEdge: '#C9951C',
  onPrimary: '#3A2A00',
  correct: '#36D399',
  correctEdge: '#1F9E6F',
  wrong: '#FF6B8A',
  wrongEdge: '#C94464',
  onFeedback: '#FFFFFF',
  streak: '#FFC845',
  streakBg: '#3A3370',
  card: '#2A2560',
  cardEdge: '#141033',
  track: '#2E2966',
};

const aurora: Theme = {
  id: 'aurora',
  name: 'Aurora',
  tagline: 'Northern lights, drifting slowly',
  price: 0,
  premium: true,
  dark: true,
  decoration: 'aurora',
  particles: ['#3EE8B5', '#7B6CFF', '#2FB7E8'],
  background: '#0D1F2D',
  backgroundDeep: '#08151F',
  text: '#E8FFF8',
  textSoft: '#86B5B0',
  key: '#17364A',
  keyEdge: '#07121A',
  keyText: '#E8FFF8',
  primary: '#5EF2C2',
  primaryEdge: '#2FB892',
  onPrimary: '#06302A',
  correct: '#7CF29A',
  correctEdge: '#44B865',
  wrong: '#FF7AA8',
  wrongEdge: '#C9507E',
  onFeedback: '#06201A',
  streak: '#5EF2C2',
  streakBg: '#17364A',
  card: '#14324A',
  cardEdge: '#07121A',
  track: '#1C4258',
};

const golden: Theme = {
  id: 'golden',
  name: 'Golden',
  tagline: 'Black velvet and gold leaf',
  price: 0,
  premium: true,
  dark: true,
  decoration: 'sparkles',
  particles: ['#F5D67B', '#E8B83E', '#FFF1C2'],
  background: '#16130F',
  backgroundDeep: '#0E0C09',
  text: '#FFF4DC',
  textSoft: '#B8A57E',
  key: '#26201A',
  keyEdge: '#0A0806',
  keyText: '#F5D67B',
  primary: '#E8B83E',
  primaryEdge: '#A87E1C',
  onPrimary: '#241A00',
  correct: '#9BD66B',
  correctEdge: '#6FA844',
  wrong: '#E8735A',
  wrongEdge: '#B2503A',
  onFeedback: '#16130F',
  streak: '#F5D67B',
  streakBg: '#2E271C',
  card: '#221C15',
  cardEdge: '#0A0806',
  track: '#2E271C',
};

const blossom: Theme = {
  id: 'blossom',
  name: 'Blossom',
  tagline: 'Cherry petals on the breeze',
  price: 0,
  premium: true,
  dark: false,
  decoration: 'petals',
  particles: ['#F7B6C8', '#FAD0DC', '#F29DB5'],
  background: '#FFF6F3',
  backgroundDeep: '#FCE7E2',
  text: '#4A2E3A',
  textSoft: '#A48390',
  key: '#FFFFFF',
  keyEdge: '#F2D6D1',
  keyText: '#4A2E3A',
  primary: '#E86A8E',
  primaryEdge: '#BF4C6F',
  onPrimary: '#FFFFFF',
  correct: '#6BBF8A',
  correctEdge: '#4C9A6A',
  wrong: '#E8845A',
  wrongEdge: '#C0643E',
  onFeedback: '#FFFFFF',
  streak: '#E86A8E',
  streakBg: '#FBDDE5',
  card: '#FFFFFF',
  cardEdge: '#F2DAD5',
  track: '#F7E1DC',
};

export const THEMES: readonly Theme[] = [sunny, ocean, meadow, candy, night, aurora, golden, blossom];

export const DEFAULT_THEME_ID = sunny.id;

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? sunny;
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
