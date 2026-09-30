// Builds a theme's full colour set from two colours: the background and an
// accent, for a light or dark theme. Everything else (text, keys, cards,
// button edges, feedback colours) is derived, then checked for contrast and
// nudged until it reads well. Used for themes created from the ideas list.

import { contrast, CONTRAST_PAIRS } from './schema.mjs';

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))).toString(16).padStart(2, '0');
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

// Lighter (+) or darker (-) by `amount` lightness points.
const shade = (hex, amount) => {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s + (amount < 0 ? 4 : 0), l + amount);
};

const mix = (a, b, t) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};

// Whichever of two text colours reads better on `bg`.
const bestOn = (bg, ...options) => options.reduce((best, c) => (contrast(c, bg) > contrast(best, bg) ? c : best));

export function derivePalette({ mood, background, accent }) {
  const [hue] = hexToHsl(accent);
  const [bgHue] = hexToHsl(background);
  const dark = mood === 'dark';
  const c = dark
    ? {
        background,
        backgroundDeep: shade(background, -4),
        text: hslToHex(bgHue, 40, 95),
        textSoft: hslToHex(bgHue, 25, 72),
        key: shade(background, 10),
        keyEdge: shade(background, -6),
        primary: accent,
        primaryEdge: shade(accent, -16),
        correct: '#36D399',
        correctEdge: '#1F9E6F',
        wrong: '#FF6B8A',
        wrongEdge: '#C94464',
        streak: accent,
        streakBg: shade(background, 14),
        card: shade(background, 7),
        cardEdge: shade(background, -6),
        track: shade(background, 12),
      }
    : {
        background,
        backgroundDeep: shade(background, -5),
        text: hslToHex(hue, 30, 18),
        textSoft: hslToHex(hue, 14, 42),
        key: mix('#FFFFFF', background, 0.15),
        keyEdge: shade(background, -14),
        primary: accent,
        primaryEdge: shade(accent, -14),
        correct: '#3CC47C',
        correctEdge: '#2A9A5E',
        wrong: '#FF6B6B',
        wrongEdge: '#D94B4B',
        streak: accent,
        streakBg: mix(accent, '#FFFFFF', 0.8),
        card: mix('#FFFFFF', background, 0.08),
        cardEdge: shade(background, -10),
        track: shade(background, -8),
      };
  c.keyText = c.text;
  const darkInk = dark ? background : c.text;
  c.onPrimary = bestOn(accent, '#FFFFFF', darkInk);
  c.onFeedback = bestOn(c.correct, '#FFFFFF', darkInk);

  // Nudge text colours until every checked pair reads well enough.
  for (let tries = 0; tries < 30; tries++) {
    const failing = CONTRAST_PAIRS.filter(([fg, bg, min]) => contrast(c[fg], c[bg]) < min);
    if (!failing.length) break;
    for (const [fg] of failing) {
      if (fg === 'onPrimary' || fg === 'onFeedback') continue; // already the best of two
      c[fg] = shade(c[fg], dark ? 3 : -3);
    }
    c.keyText = c.text;
  }
  return c;
}
