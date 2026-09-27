// Adaptive difficulty. After every answer the player's level moves based on
// correctness and speed relative to the level's expected time:
//
//   lightning (≤ 35% of expected)  +3
//   fast      (≤ 60%)              +2
//   steady    (≤ 100%)             +1
//   slow      (> 100%)              0
//   wrong                          −1, or −2 on consecutive misses
//
// A fluent adult answers well inside the lightning window and climbs about
// three levels per question, reaching ×/÷ to 100 in under ten questions. A
// beginner who counts things out only earns +1 or 0, so the climb stops where
// they stop being fluent. A slow answer is never punished, it just doesn't
// move the player up.

import { levelInfo, MAX_LEVEL } from './levels';

export type Speed = 'lightning' | 'fast' | 'steady' | 'slow';

export type Verdict = {
  correct: boolean;
  speed: Speed | null; // null when wrong
  delta: number;
  nextLevel: number;
};

const STEPS: { speed: Speed; maxRatio: number; delta: number }[] = [
  { speed: 'lightning', maxRatio: 0.35, delta: 3 },
  { speed: 'fast', maxRatio: 0.6, delta: 2 },
  { speed: 'steady', maxRatio: 1.0, delta: 1 },
  { speed: 'slow', maxRatio: Infinity, delta: 0 },
];

export function judge(
  level: number,
  correct: boolean,
  elapsedMs: number,
  previousWasWrong: boolean,
): Verdict {
  const clamp = (l: number) => Math.max(1, Math.min(MAX_LEVEL, l));
  if (!correct) {
    const delta = previousWasWrong ? -2 : -1;
    return { correct, speed: null, delta, nextLevel: clamp(level + delta) };
  }
  const ratio = elapsedMs / levelInfo(level).expectedMs;
  const step = STEPS.find((s) => ratio <= s.maxRatio)!;
  return { correct, speed: step.speed, delta: step.delta, nextLevel: clamp(level + step.delta) };
}
