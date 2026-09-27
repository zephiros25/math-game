// Generates the game's sound effects as 16-bit mono WAV files in assets/sounds/.
// Everything is synthesized, so there are no licensing concerns.
// Run with: npm run generate-sounds
//
// The palette is deliberately soft: woody "tock" keys, glassy bell chimes on a
// pentatonic scale (so any sequence of streak notes sounds musical), and a
// gentle low "bwomp" for mistakes instead of a harsh buzzer.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

// Deterministic PRNG so regenerating produces identical files.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const buffer = (seconds) => new Float32Array(Math.ceil(seconds * SR));

function lowpass(x, cutoff) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y += a * (x[i] - y);
    x[i] = y;
  }
  return x;
}

// Adds `src` into `dst` starting at `offsetSeconds`.
function mix(dst, src, offsetSeconds = 0, gain = 1) {
  const off = Math.round(offsetSeconds * SR);
  for (let i = 0; i < src.length && off + i < dst.length; i++) dst[off + i] += src[i] * gain;
  return dst;
}

function normalize(x, peak) {
  let max = 0;
  for (const v of x) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / max;
  // 1 ms fade-in and 10 ms fade-out so nothing clicks.
  const fin = Math.round(0.001 * SR);
  const fout = Math.round(0.01 * SR);
  for (let i = 0; i < fin; i++) x[i] *= i / fin;
  for (let i = 0; i < fout; i++) x[x.length - 1 - i] *= i / fout;
  return x;
}

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

// Glassy bell: slightly inharmonic partials with individual decays, plus a
// soft mallet transient.
function bell(freq, seconds = 1.4, seed = 1) {
  const partials = [
    [1, 1, 1.1],
    [2.0, 0.42, 0.55],
    [3.0, 0.2, 0.35],
    [4.16, 0.1, 0.22],
    [5.43, 0.05, 0.15],
  ];
  const x = buffer(seconds);
  const r = rng(seed);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [ratio, amp, decay] of partials) {
      v += amp * Math.sin(2 * Math.PI * freq * ratio * t) * Math.exp(-t / decay);
    }
    v *= 1 - Math.exp(-t / 0.002);
    v += 0.08 * (r() * 2 - 1) * Math.exp(-t / 0.003);
    x[i] = v;
  }
  return x;
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

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(join(outDir, `${name}.wav`), Buffer.concat([header, data]));
  console.log(`  ${name}.wav  ${(samples.length / SR).toFixed(2)}s`);
}

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
