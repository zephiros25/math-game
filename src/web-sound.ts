// Sound players for the web version (the home-screen app on iPhone). Safari's
// <audio> elements, which expo-audio uses on the web, start each sound with a
// noticeable delay, so every key tap felt late. These players decode each
// sound once and play it through the Web Audio API, which starts instantly
// and lets the same sound overlap itself.
//
// They mimic the parts of expo-audio's AudioPlayer that src/feedback.ts uses.

import { Asset } from 'expo-asset';

let context: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function audio() {
  if (!context) {
    context = new AudioContext();
    // Browsers only start audio after a touch: resume on the first one.
    const unlock = () => {
      context?.resume().catch(() => {});
      if (context?.state === 'running') {
        document.removeEventListener('pointerdown', unlock, true);
        document.removeEventListener('touchend', unlock, true);
      }
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('touchend', unlock, true);
  }
  return context;
}

function load(uri: string) {
  let buffer = buffers.get(uri);
  if (!buffer) {
    buffer = fetch(uri)
      .then((r) => r.arrayBuffer())
      .then((data) => audio().decodeAudioData(data))
      .catch(() => null);
    buffers.set(uri, buffer);
  }
  return buffer;
}

export class WebSoundPlayer {
  volume = 1;
  shouldCorrectPitch = false;
  duration = 0;
  isLoaded = false;
  playing = false;
  private buffer: AudioBuffer | null = null;
  private rate = 1;
  private startedAt = 0;

  constructor(source: number) {
    load(Asset.fromModule(source).uri).then((buffer) => {
      this.buffer = buffer;
      this.duration = buffer?.duration ?? 0;
      this.isLoaded = buffer !== null;
    });
  }

  // Seconds into the sound while it plays; 0 when idle (always "rewound").
  get currentTime() {
    return this.playing && context ? Math.min(this.duration, (context.currentTime - this.startedAt) * this.rate) : 0;
  }

  setPlaybackRate(rate: number) {
    this.rate = rate;
  }

  // Every play starts from the beginning, so there is nothing to seek.
  seekTo() {
    return Promise.resolve();
  }

  play() {
    if (!this.buffer) return;
    const ctx = audio();
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    const source = ctx.createBufferSource();
    source.buffer = this.buffer;
    source.playbackRate.value = this.rate; // changes pitch too, like the native players
    const gain = ctx.createGain();
    gain.gain.value = this.volume;
    source.connect(gain).connect(ctx.destination);
    source.onended = () => {
      this.playing = false;
    };
    this.startedAt = ctx.currentTime;
    this.playing = true;
    source.start();
  }

  remove() {}
}
