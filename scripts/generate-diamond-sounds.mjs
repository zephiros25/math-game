// Synthesizes the "Diamond" theme's crystal sound set into themes/diamond/.
// Run with: node scripts/generate-diamond-sounds.mjs
//
// Glassy, bright and airy, but kept soft: every sound is low-passed and
// quieter than a real glass so it never becomes piercing on a phone speaker.
// Crystal partials are inharmonic (like a struck wine glass) and each note is
// a pair of slightly detuned tones, which gives a gentle shimmer.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buffer, lowpass, mix, normalize, rng, SR, writeWav } from './sound-synth.mjs';

const outDir = fileURLToPath(new URL('../themes/diamond/', import.meta.url));

// A struck crystal: inharmonic partials, detuned pairs for shimmer.
function crystal(freq, seconds = 1.6, seed = 1, brightness = 1) {
  const partials = [
    [1, 1, 1.3],
    [2.76, 0.35 * brightness, 0.5],
    [5.4, 0.14 * brightness, 0.22],
    [8.93, 0.05 * brightness, 0.1],
  ];
  const x = buffer(seconds);
  const r = rng(seed);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [ratio, amp, decay] of partials) {
      const f = freq * ratio;
      v += amp * 0.5 * (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.0025 * t)) * Math.exp(-t / decay);
    }
    v *= 1 - Math.exp(-t / 0.0015);
    v += 0.04 * (r() * 2 - 1) * Math.exp(-t / 0.002);
    x[i] = v;
  }
  return lowpass(x, 9000);
}

// Fingertip on glass: a tiny bright "tik" over a soft body.
function glassTap(freq, seed) {
  const x = buffer(0.09);
  const r = rng(seed);
  const noise = lowpass(Float32Array.from(x, () => r() * 2 - 1), 6000);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] =
      0.55 * Math.sin(2 * Math.PI * freq * t) * Math.exp(-t / 0.012) +
      0.25 * Math.sin(2 * Math.PI * freq * 2.76 * t) * Math.exp(-t / 0.006) +
      0.45 * Math.sin(2 * Math.PI * 520 * t) * Math.exp(-t / 0.02) +
      0.35 * noise[i] * Math.exp(-t / 0.0015);
  }
  return normalize(lowpass(x, 7000), 0.42);
}

// A muted, frosted thud for mistakes: clearly "not that", never harsh.
function frostedThud() {
  const x = buffer(0.45);
  const r = rng(77);
  const noise = lowpass(Float32Array.from(x, () => r() * 2 - 1), 900);
  let p = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f = 300 - 110 * (1 - Math.exp(-t / 0.1));
    p += (2 * Math.PI * f) / SR;
    const env = (1 - Math.exp(-t / 0.005)) * Math.exp(-t / 0.12);
    x[i] = (Math.sin(p) + 0.3 * Math.sin(2.76 * p)) * env + 0.25 * noise[i] * Math.exp(-t / 0.03);
  }
  return normalize(lowpass(x, 1600), 0.5);
}

function glassPop() {
  const x = buffer(0.12);
  let p = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f = 900 + 900 * (1 - Math.exp(-t / 0.015));
    p += (2 * Math.PI * f) / SR;
    x[i] = (Math.sin(p) + 0.2 * Math.sin(2.76 * p)) * Math.exp(-t / 0.03) * (1 - Math.exp(-t / 0.0015));
  }
  return normalize(lowpass(x, 8000), 0.4);
}

const NOTE = { E5: 659.26, G5: 783.99, B5: 987.77, D6: 1174.66, E6: 1318.51, G6: 1567.98, B6: 1975.53, E7: 2637.02 };

function crystalArpeggio(notes, spacing, seconds, peak) {
  const x = buffer(seconds);
  notes.forEach((n, i) => mix(x, crystal(NOTE[n], seconds - i * spacing, 40 + i, 0.8), i * spacing, 1 - i * 0.05));
  return normalize(x, peak);
}

function sparkleBurst(seed, count, seconds) {
  const r = rng(seed);
  const high = ['E6', 'G6', 'B6', 'E7'];
  const x = buffer(seconds);
  for (let i = 0; i < count; i++) {
    mix(x, crystal(NOTE[high[Math.floor(r() * high.length)]] * 1.5, 0.6, 60 + i, 0.6), i * 0.04 + r() * 0.02, 0.6 + r() * 0.4);
  }
  return normalize(x, 0.38);
}

mkdirSync(outDir, { recursive: true });
console.log(`Writing Diamond sounds to ${outDir}`);

writeWav(join(outDir, 'sound-glass-tap-1.wav'), glassTap(2300, 1));
writeWav(join(outDir, 'sound-glass-tap-2.wav'), glassTap(2450, 2));
writeWav(join(outDir, 'sound-glass-tap-3.wav'), glassTap(2600, 3));
writeWav(join(outDir, 'sound-glass-back.wav'), glassTap(1700, 4));
writeWav(join(outDir, 'sound-glass-pop.wav'), glassPop());
// One note; the app pitches it up the scale for each answer in a streak.
writeWav(join(outDir, 'sound-crystal-chime.wav'), normalize(crystal(NOTE.E6, 1.5, 9), 0.45));
writeWav(join(outDir, 'sound-frosted-thud.wav'), frostedThud());
writeWav(join(outDir, 'sound-crystal-rise.wav'), crystalArpeggio(['B5', 'E6', 'G6', 'B6'], 0.07, 1.6, 0.45));
writeWav(join(outDir, 'sound-crystal-fanfare.wav'), crystalArpeggio(['E5', 'G5', 'B5', 'E6', 'G6', 'B6', 'E7'], 0.085, 2.6, 0.5));
writeWav(join(outDir, 'sound-crystal-coin.wav'), normalize(crystal(NOTE.B6, 0.35, 5, 0.6), 0.35));
writeWav(join(outDir, 'sound-diamond-sparkle.wav'), sparkleBurst(99, 7, 1.0));
