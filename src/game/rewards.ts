// Coins reward every correct answer, weighted by level and speed, so a child
// playing at their own level still earns steadily; they buy themes.
//
// Gems buy pets, and mostly reward effort rather than skill, so younger and
// struggling players collect pets too: every finished run earns one, and the
// first run of the day earns extra (a daily habit is what learning needs).
// Streaks, perfect runs and new records add a little on top.
// See scripts/economy.ts for how fast this pays out.

import type { Speed } from './engine';

export const GEMS = {
  welcome: 3, // once, at first launch, so a child can pick a pet right away
  finishedRun: 1,
  firstRunOfDay: 2,
  streak: 1, // every 10 correct in a row
  perfectRun: 1, // at least 10 questions, all correct
  newBest: 1,
};

export function coinsFor(level: number, speed: Speed): number {
  const speedBonus = speed === 'lightning' || speed === 'fast' ? 1 : 0;
  return 1 + Math.floor(level / 3) + speedBonus;
}

export const STREAK_GEM_EVERY = 10;

export function isStreakGem(streak: number) {
  return streak > 0 && streak % STREAK_GEM_EVERY === 0;
}

// Gems earned at the end of a run (streak gems are counted during the run).
export function runBonusGems(run: {
  correct: number;
  total: number;
  peakLevel: number;
  previousBest: number;
  firstRunToday: boolean;
}) {
  const daily = run.firstRunToday ? GEMS.firstRunOfDay : 0;
  let gems = GEMS.finishedRun + daily;
  if (run.total >= 10 && run.correct === run.total) gems += GEMS.perfectRun;
  if (run.peakLevel > run.previousBest) gems += GEMS.newBest;
  return { gems, daily };
}

// Local calendar day, e.g. "2026-09-30", for the first-run-of-the-day bonus.
export function today(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
