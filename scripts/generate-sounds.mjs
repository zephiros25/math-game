// Generates the game's sound effects as 16-bit mono WAV files in assets/sounds/.
// Everything is synthesized, so there are no licensing concerns.
// Run with: npm run generate-sounds
//
// The palette is deliberately soft: woody "tock" keys, glassy bell chimes on a
// pentatonic scale (so any sequence of streak notes sounds musical), and a
// gentle low "bwomp" for mistakes instead of a harsh buzzer.

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bell, buffer, lowpass, mix, normalize, rng, SR, writeWav as writeFile } from './sound-synth.mjs';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

// Short woody knock: a pitch-dropping sine body, an inharmonic overtone and a
// tiny filtered noise transient for the "contact" of a fingertip.
function tock(freq, seed) {
  const x = buffer(0.11);
  const r = rng(seed);
  let phase = 0;
  let phase2 = 0;
  const noise = lowpass(Float32Array.from(x, () => r() * 2 - 1), 3500);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f = freq * (1 + 0.6 * Math.exp(-t / 0.004));
    phase += (2 * Math.PI * f) / SR;
    phase2 += (2 * Math.PI * f * 2.76) / SR;
    x[i] =
      Math.sin(phase) * Math.exp(-t / 0.022) +
      0.25 * Math.sin(phase2) * Math.exp(-t / 0.007) +
      0.5 * noise[i] * Math.exp(-t / 0.0018);
  }
  return normalize(lowpass(x, 5000), 0.5);
}

// Soft bubble pop for UI buttons.
function pop() {
  const x = buffer(0.09);
  let phase = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f = 380 + 520 * (1 - Math.exp(-t / 0.018));
    phase += (2 * Math.PI * f) / SR;
    x[i] = Math.sin(phase) * Math.exp(-t / 0.025) * (1 - Math.exp(-t / 0.002));
  }
  return normalize(x, 0.45);
}

// Gentle "bwomp": two low, detuned sines sliding down. Clearly different from
// a correct chime, but never harsh.
function wrong() {
  const x = buffer(0.42);
  let p1 = 0;
  let p2 = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f1 = 230 - 90 * (1 - Math.exp(-t / 0.12));
    const f2 = 172 - 70 * (1 - Math.exp(-t / 0.12));
    p1 += (2 * Math.PI * f1) / SR;
    p2 += (2 * Math.PI * f2) / SR;
    const env = (1 - Math.exp(-t / 0.006)) * Math.exp(-t / 0.11);
    x[i] = (Math.sin(p1) + 0.8 * Math.sin(p2) + 0.15 * Math.sin(2 * p1)) * env;
  }
  return normalize(lowpass(x, 1200), 0.55);
}

const NOTE = {
  C5: 523.25, D5: 587.33, E5: 659.26, G5: 783.99, A5: 880.0,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, A6: 1760.0,
  B6: 1975.53, C7: 2093.0, E7: 2637.02,
};

// Pentatonic ladder used for the streak: each consecutive correct answer
// rings one step higher.
const STREAK_NOTES = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6'];

function arpeggio(notes, spacing, seconds, peak) {
  const x = buffer(seconds);
  notes.forEach((n, i) => mix(x, bell(NOTE[n], seconds - i * spacing, i + 7), i * spacing, 1 - i * 0.06));
  return normalize(x, peak);
}

function coin() {
  const x = buffer(0.45);
  mix(x, bell(NOTE.B6, 0.45, 3), 0, 0.8);
  mix(x, bell(NOTE.E7, 0.4, 4), 0.055, 1);
  for (let i = 0; i < x.length; i++) x[i] *= Math.exp(-i / SR / 0.16);
  return normalize(x, 0.4);
}

function gem() {
  const r = rng(99);
  const high = ['C6', 'E6', 'G6', 'A6', 'C7'];
  const x = buffer(1.0);
  for (let i = 0; i < 6; i++) {
    const n = high[Math.floor(r() * high.length)];
    mix(x, bell(NOTE[n] * 2, 0.6, 20 + i), i * 0.045, 0.7 + r() * 0.3);
  }
  return normalize(x, 0.4);
}

// One babble syllable for the pets' default voice: a short sung vowel. A
// glottal-like source (harmonics of a gliding pitch) is shaped by the vowel's
// two formants, so "a", "e", "i", "o", "u" sound distinct. The app strings
// syllables together at varied pitches while a pet talks.
const VOWELS = { a: [800, 1200], e: [480, 1900], i: [320, 2300], o: [520, 900], u: [360, 800] };

function syllable([f1, f2], seed) {
  const x = buffer(0.11);
  const r = rng(seed);
  const formant = (f, center, width) => Math.exp(-(((f - center) / width) ** 2));
  let phase = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f0 = 330 * (1 + 0.08 * Math.sin(t * 30) - 0.12 * t * 5);
    phase += (2 * Math.PI * f0) / SR;
    let v = 0;
    for (let k = 1; k <= 14; k++) {
      const gain = formant(k * f0, f1, 180) + 0.7 * formant(k * f0, f2, 260) + 0.05;
      v += (gain / k) * Math.sin(k * phase);
    }
    const env = (1 - Math.exp(-t / 0.006)) * Math.exp(-t / 0.045);
    x[i] = v * env + 0.01 * (r() * 2 - 1) * env;
  }
  return normalize(lowpass(x, 4500), 0.45);
}

const writeWav = (name, samples) => writeFile(join(outDir, `${name}.wav`), samples);

mkdirSync(outDir, { recursive: true });
console.log(`Writing sounds to ${outDir}`);

writeWav('key1', tock(470, 1));
writeWav('key2', tock(505, 2));
writeWav('key3', tock(540, 3));
writeWav('back', tock(360, 4));
writeWav('pop', pop());
writeWav('wrong', wrong());
STREAK_NOTES.forEach((n, i) => writeWav(`chime${i}`, normalize(bell(NOTE[n], 1.3, i + 30), 0.5)));
writeWav('levelup', arpeggio(['G5', 'C6', 'E6', 'G6'], 0.06, 1.4, 0.5));
writeWav('fanfare', arpeggio(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.09, 2.4, 0.55));
writeWav('coin', coin());
writeWav('gem', gem());
Object.entries(VOWELS).forEach(([vowel, formants], i) => writeWav(`voice-${vowel}`, syllable(formants, 50 + i)));
