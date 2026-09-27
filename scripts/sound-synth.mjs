// Building blocks for synthesizing sound effects as 16-bit mono WAV files.
// Shared by generate-sounds.mjs (the default sounds) and theme sound sets.

import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';

export const SR = 44100;

// Deterministic PRNG so regenerating produces identical files.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const buffer = (seconds) => new Float32Array(Math.ceil(seconds * SR));

export function lowpass(x, cutoff) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y += a * (x[i] - y);
    x[i] = y;
  }
  return x;
}

// Adds `src` into `dst` starting at `offsetSeconds`.
export function mix(dst, src, offsetSeconds = 0, gain = 1) {
  const off = Math.round(offsetSeconds * SR);
  for (let i = 0; i < src.length && off + i < dst.length; i++) dst[off + i] += src[i] * gain;
  return dst;
}

export function normalize(x, peak) {
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

// Glassy bell: slightly inharmonic partials with individual decays, plus a
// soft mallet transient.
export function bell(freq, seconds = 1.4, seed = 1) {
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

export function writeWav(path, samples) {
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
  writeFileSync(path, Buffer.concat([header, data]));
  console.log(`  ${basename(path)}  ${(samples.length / SR).toFixed(2)}s`);
}

