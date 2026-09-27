// The theme format, shared by the build script and the Theme Studio.
//
// A theme is a folder themes/<id>/ containing theme.json plus its assets
// (images and sounds), referenced from theme.json by file name.

import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const THEMES_DIR = new URL('../../themes/', import.meta.url);

export const ID_PATTERN = /^[a-z][a-z0-9-]{1,30}$/;

export const COLOR_KEYS = [
  'background', 'backgroundDeep', 'text', 'textSoft',
  'key', 'keyEdge', 'keyText',
  'primary', 'primaryEdge', 'onPrimary',
  'correct', 'correctEdge', 'wrong', 'wrongEdge', 'onFeedback',
  'streak', 'streakBg',
  'card', 'cardEdge', 'track',
];

export const PARTICLE_STYLES = ['none', 'sunbeams', 'bubbles', 'leaves', 'confetti', 'stars', 'aurora', 'sparkles', 'petals'];

// Sound slots a theme can override. Anything left out uses the default sound.
export const SOUND_SLOTS = {
  tap: 'Number key tap (add up to 3 variations)',
  backspace: 'Backspace key',
  button: 'Menu buttons',
  correct: 'Correct answer (pitched up for each answer in a streak)',
  wrong: 'Wrong answer',
  levelUp: 'New best level',
  fanfare: 'End of a run / theme unlocked',
  coin: 'Coin tick on the results screen',
  gem: 'Gem earned',
};

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
// Formats both iOS and Android play natively (no .ogg: iOS can't).
export const SOUND_EXTENSIONS = ['.wav', '.mp3', '.m4a', '.aac'];

const HEX = /^#[0-9a-fA-F]{6}$/;

export function defaultTheme(name = 'New theme') {
  return {
    name,
    tagline: '',
    order: 100,
    price: 500,
    premium: false,
    dark: false,
    colors: {
      background: '#FFF4E6', backgroundDeep: '#FFE9D1', text: '#3B2A4A', textSoft: '#8A7898',
      key: '#FFFFFF', keyEdge: '#E8D9C6', keyText: '#3B2A4A',
      primary: '#FF7A59', primaryEdge: '#D9573A', onPrimary: '#FFFFFF',
      correct: '#3CC47C', correctEdge: '#2A9A5E', wrong: '#FF6B6B', wrongEdge: '#D94B4B', onFeedback: '#FFFFFF',
      streak: '#FF8A3D', streakBg: '#FFE3CC',
      card: '#FFFFFF', cardEdge: '#EFE2D2', track: '#F1E3D1',
    },
    background: { image: null, dim: 0 },
    particles: { style: 'sunbeams', colors: ['#FFD9A8', '#FFC9B5'], images: [], amount: 1, opacity: 1 },
    sounds: {},
  };
}

// WCAG contrast ratio between two hex colors.
export function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Text/background pairs that must stay readable. [foreground, background, minimum ratio]
// Normal text follows WCAG (4.5). Button labels and the answer box use big,
// bold text, where bright kid-friendly colors are allowed to go lower.
export const CONTRAST_PAIRS = [
  ['text', 'background', 4.5],
  ['text', 'card', 4.5],
  ['keyText', 'key', 4.5],
  ['textSoft', 'background', 2.5],
  ['onPrimary', 'primary', 2],
  ['onFeedback', 'correct', 2],
  ['onFeedback', 'wrong', 2],
];

// Returns { errors, warnings }. Errors block the build; warnings are advice.
export function validateTheme(id, theme, dir) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(`${id}: ${m}`);
  const warn = (m) => warnings.push(`${id}: ${m}`);

  if (!ID_PATTERN.test(id)) err(`folder name must be lowercase letters, digits or dashes (got "${id}")`);
  if (typeof theme !== 'object' || theme === null) {
    err('theme.json is not an object');
    return { errors, warnings };
  }
  if (typeof theme.name !== 'string' || !theme.name.trim()) err('"name" is required');
  if (typeof theme.tagline !== 'string') err('"tagline" must be text');
  if (!Number.isFinite(theme.order)) err('"order" must be a number');
  if (!Number.isInteger(theme.price) || theme.price < 0) err('"price" must be a whole number of coins (0 = free)');
  if (typeof theme.premium !== 'boolean') err('"premium" must be true or false');
  if (typeof theme.dark !== 'boolean') err('"dark" must be true or false');
  if (theme.premium && theme.price > 0) warn('premium themes are bought, not unlocked with coins; "price" is ignored');

  const colors = theme.colors ?? {};
  for (const key of COLOR_KEYS) {
    if (!HEX.test(colors[key] ?? '')) err(`colors.${key} must be a hex color like #A1B2C3 (got ${JSON.stringify(colors[key])})`);
  }
  if (errors.length === 0) {
    for (const [fg, bg, min] of CONTRAST_PAIRS) {
      const ratio = contrast(colors[fg], colors[bg]);
      if (ratio < min) warn(`${fg} on ${bg} is hard to read (contrast ${ratio.toFixed(1)}, aim for ${min}+)`);
    }
  }

  const fileCheck = (file, exts, what) => {
    if (typeof file !== 'string' || !file) return err(`${what} must be a file name`);
    if (file.includes('/') || file.includes('\\')) return err(`${what} "${file}" must be a file inside the theme folder`);
    const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
    if (!exts.includes(ext)) return err(`${what} "${file}" must be one of ${exts.join(', ')}`);
    const path = join(dir, file);
    if (!existsSync(path)) return err(`${what} "${file}" is missing from the theme folder`);
    return statSync(path).size;
  };

  const bg = theme.background ?? {};
  if (bg.image !== null && bg.image !== undefined) {
    const size = fileCheck(bg.image, IMAGE_EXTENSIONS, 'background.image');
    if (size > 1.5e6) warn(`background image is ${(size / 1e6).toFixed(1)} MB; the Studio shrinks images it imports`);
  }
  if (!(bg.dim >= 0 && bg.dim <= 0.9)) err('background.dim must be between 0 and 0.9');

  const p = theme.particles ?? {};
  if (!PARTICLE_STYLES.includes(p.style)) err(`particles.style must be one of ${PARTICLE_STYLES.join(', ')}`);
  if (!Array.isArray(p.colors) || p.colors.some((c) => !HEX.test(c))) err('particles.colors must be a list of hex colors');
  if (p.style !== 'none' && (p.colors?.length ?? 0) === 0 && (p.images?.length ?? 0) === 0) {
    err('particles need at least one color or image');
  }
  if (!Array.isArray(p.images)) err('particles.images must be a list');
  else p.images.forEach((f, i) => fileCheck(f, IMAGE_EXTENSIONS, `particles.images[${i}]`));
  if (!(p.amount >= 0 && p.amount <= 3)) err('particles.amount must be between 0 and 3');
  if (!(p.opacity >= 0 && p.opacity <= 1)) err('particles.opacity must be between 0 and 1');

  for (const [slot, s] of Object.entries(theme.sounds ?? {})) {
    if (!(slot in SOUND_SLOTS)) {
      err(`sounds.${slot} is not a known sound (use ${Object.keys(SOUND_SLOTS).join(', ')})`);
      continue;
    }
    if (!Array.isArray(s.files) || s.files.length === 0) err(`sounds.${slot}.files must list at least one file`);
    else {
      if (slot !== 'tap' && s.files.length > 1) warn(`sounds.${slot}: only the first file is used`);
      if (s.files.length > 3) warn(`sounds.${slot}: only the first 3 variations are used`);
      s.files.forEach((f, i) => {
        const size = fileCheck(f, SOUND_EXTENSIONS, `sounds.${slot}.files[${i}]`);
        if (size > 800e3) warn(`sounds.${slot} "${f}" is ${(size / 1e6).toFixed(1)} MB; short effects should be well under 1 MB`);
      });
    }
    if (!(s.volume >= 0 && s.volume <= 1)) err(`sounds.${slot}.volume must be between 0 and 1`);
  }

  return { errors, warnings };
}
