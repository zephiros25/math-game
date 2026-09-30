// Cleans up a downloaded sound effect for the game: mono, silence trimmed,
// loudness evened out per kind of sound, a soft fade in and out, and a
// maximum length. Pet voice clips are cut into separate babble syllables.
//
// Decoding and AAC encoding use ffmpeg (the ffmpeg-static package); the
// processing itself is plain JavaScript on the samples.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import ffmpeg from 'ffmpeg-static';

const RATE = 44100;

// Per sound: loudness target (dB of the loudest 50 ms, relative to full
// scale), longest allowed length, and fade-out length. Busy sounds (taps,
// coins) are quieter so they never get tiring.
export const RULES = {
  tap: { target: -21, maxMs: 250, fadeMs: 40 },
  backspace: { target: -23, maxMs: 300, fadeMs: 50 },
  button: { target: -20, maxMs: 400, fadeMs: 60 },
  correct: { target: -18, maxMs: 1200, fadeMs: 200 },
  wrong: { target: -21, maxMs: 1000, fadeMs: 150 },
  levelUp: { target: -18, maxMs: 2200, fadeMs: 300 },
  fanfare: { target: -17, maxMs: 3500, fadeMs: 400 },
  coin: { target: -23, maxMs: 400, fadeMs: 80 },
  gem: { target: -19, maxMs: 1500, fadeMs: 250 },
  voice: { target: -20, maxMs: 450, fadeMs: 40 },
};

// Long sounds (the fanfare, the level-up run) are saved as AAC (.m4a) to keep
// the app small; everything else as WAV, which starts playing instantly (AAC adds a few milliseconds of delay).
const AAC_FROM_MS = 1500;

export function decode(data) {
  const r = spawnSync(ffmpeg, ['-v', 'error', '-i', 'pipe:0', '-f', 'f32le', '-ac', '1', '-ar', String(RATE), 'pipe:1'], {
    input: data,
    maxBuffer: 1 << 28,
  });
  if (r.status !== 0) throw new Error(`could not read this sound (${r.stderr.toString().trim().split('\n').at(-1)})`);
  const buf = r.stdout;
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4).slice();
}

const ms = (n) => Math.round((n / 1000) * RATE);
const db = (x) => 20 * Math.log10(Math.max(x, 1e-9));

function peakOf(s) {
  let p = 0;
  for (const x of s) p = Math.max(p, Math.abs(x));
  return p;
}

// RMS of the loudest 50 ms window.
function loudestRms(s) {
  const w = ms(50);
  if (s.length <= w) return Math.sqrt(s.reduce((a, x) => a + x * x, 0) / Math.max(1, s.length));
  let sum = 0;
  for (let i = 0; i < w; i++) sum += s[i] * s[i];
  let best = sum;
  for (let i = w; i < s.length; i++) {
    sum += s[i] * s[i] - s[i - w] * s[i - w];
    best = Math.max(best, sum);
  }
  return Math.sqrt(best / w);
}

// Loudness (RMS) of every 5 ms stretch. Judging by stretches rather than
// single samples keeps faint hiss or a lone click from counting as sound.
const ENV_MS = 5;
function envelope(s) {
  const w = ms(ENV_MS);
  const env = [];
  for (let i = 0; i < s.length; i += w) {
    let sum = 0;
    const end = Math.min(s.length, i + w);
    for (let j = i; j < end; j++) sum += s[j] * s[j];
    env.push(Math.sqrt(sum / (end - i)));
  }
  return env;
}

// Cuts off the silence before and after the sound: it starts where it gets
// within 35 dB of its loudest moment and ends when it fades below 50 dB.
function trim(s) {
  const env = envelope(s);
  const top = Math.max(...env);
  const first = env.findIndex((v) => v >= top * 10 ** (-35 / 20));
  let last = env.length - 1;
  while (last > first && env[last] < top * 10 ** (-50 / 20)) last--;
  const w = ms(ENV_MS);
  return s.slice(Math.max(0, first * w - ms(3)), Math.min(s.length, (last + 1) * w + ms(5)));
}

// The separate hits in a clip (generators often make several in a row):
// stretches within 30 dB of the loudest moment, apart by at least 40 ms of
// quiet. Returns [start, end] sample positions; each hit runs until the next
// one starts, so its natural decay is kept.
function hits(s) {
  const env = envelope(s);
  const top = Math.max(...env);
  const on = top * 10 ** (-30 / 20);
  const gap = Math.round(40 / ENV_MS);
  const starts = [];
  let quiet = gap;
  env.forEach((v, i) => {
    if (v >= on) {
      if (quiet >= gap) starts.push(i);
      quiet = 0;
    } else quiet++;
  });
  const w = ms(ENV_MS);
  return starts.map((a, k) => [Math.max(0, a * w - ms(3)), k + 1 < starts.length ? starts[k + 1] * w - ms(5) : s.length]);
}

// Sounds that should be one short hit, and how many of them to keep (the
// tap rotates between up to three variations).
const SINGLE_HITS = { tap: 3, backspace: 1, button: 1, coin: 1, correct: 1 };

export function processSamples(samples, kind) {
  const rule = RULES[kind];
  if (!rule) throw new Error(`unknown sound "${kind}"`);
  if (peakOf(samples) < 1e-4) throw new Error('the sound is silent');
  let s = trim(samples);
  if (s.length < ms(15)) throw new Error('the sound is (almost) silent');
  if (s.length > ms(rule.maxMs)) s = s.slice(0, ms(rule.maxMs));
  // Remove any DC offset.
  const mean = s.reduce((a, x) => a + x, 0) / s.length;
  for (let i = 0; i < s.length; i++) s[i] -= mean;
  // Even out loudness, never louder than -1 dB peak.
  let gain = 10 ** ((rule.target - db(loudestRms(s))) / 20);
  gain = Math.min(gain, 10 ** (-1 / 20) / Math.max(peakOf(s), 1e-9));
  for (let i = 0; i < s.length; i++) s[i] *= gain;
  // Soft edges: no clicks at the start, a gentle tail at the end.
  const fadeIn = Math.min(ms(4), s.length);
  for (let i = 0; i < fadeIn; i++) s[i] *= i / fadeIn;
  const fadeOut = Math.min(ms(rule.fadeMs), Math.floor(s.length / 2));
  for (let i = 0; i < fadeOut; i++) s[s.length - 1 - i] *= (i / fadeOut) ** 2;
  return s;
}

export function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((x, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

function aac(samples) {
  const dir = mkdtempSync(join(tmpdir(), 'mathrun-sound-'));
  try {
    writeFileSync(join(dir, 'in.wav'), wav(samples));
    const r = spawnSync(ffmpeg, ['-v', 'error', '-y', '-i', join(dir, 'in.wav'), '-c:a', 'aac', '-b:a', '96k', join(dir, 'out.m4a')]);
    if (r.status !== 0) throw new Error(`could not encode AAC: ${r.stderr.toString().trim()}`);
    return readFileSync(join(dir, 'out.m4a'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// → { data, ext, ms }
export function encode(samples) {
  const length = Math.round((samples.length / RATE) * 1000);
  return length >= AAC_FROM_MS ? { data: aac(samples), ext: '.m4a', ms: length } : { data: wav(samples), ext: '.wav', ms: length };
}

// A downloaded sound, ready for the game: a list of prepared sounds (one,
// or up to three tap variations when the clip holds several hits).
export function prepareSounds(data, kind) {
  const s = decode(data);
  const keep = SINGLE_HITS[kind];
  if (!keep) return [encode(processSamples(s, kind))];
  // Keep only full hits (within 6 dB of the loudest), not quiet echoes.
  const found = hits(s).map(([a, b]) => s.slice(a, b));
  const peaks = found.map(peakOf);
  const loudest = Math.max(...peaks);
  return found
    .filter((_, i) => peaks[i] >= loudest / 2)
    .slice(0, keep)
    .map((hit) => encode(processSamples(hit, kind)));
}

// Cuts a babble clip into syllables at the quiet gaps between them. Returns
// up to 8 prepared syllables.
export function prepareVoice(data) {
  const s = trim(decode(data));
  const win = ms(10);
  const env = [];
  for (let i = 0; i < s.length; i += win) {
    let sum = 0;
    const end = Math.min(s.length, i + win);
    for (let j = i; j < end; j++) sum += s[j] * s[j];
    env.push(Math.sqrt(sum / (end - i)));
  }
  const top = Math.max(...env);
  // Try stricter thresholds until the clip falls apart into a few syllables.
  let segments = [];
  for (const share of [0.06, 0.12, 0.2, 0.3]) {
    segments = [];
    let start = null;
    let quiet = 0;
    env.forEach((v, i) => {
      if (v >= top * share) {
        if (start === null) start = i;
        quiet = 0;
      } else if (start !== null && ++quiet >= 4) {
        segments.push([start, i - quiet + 1]);
        start = null;
        quiet = 0;
      }
    });
    if (start !== null) segments.push([start, env.length]);
    // Syllables are 60–450 ms long.
    segments = segments.filter(([a, b]) => b - a >= 6);
    if (segments.length >= 3 && segments.every(([a, b]) => b - a <= 45)) break;
  }
  if (segments.length < 2) throw new Error('could not find separate syllables: ask for clear pauses between them');
  return segments
    .slice(0, 8)
    .map(([a, b]) => encode(processSamples(s.slice(Math.max(0, a * win - ms(8)), Math.min(s.length, b * win + ms(15))), 'voice')));
}
