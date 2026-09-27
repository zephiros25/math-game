// Coins reward every correct answer, weighted by level and speed, so a child
// playing at their own level still earns steadily. Gems are rarer: streak
// milestones, a perfect run, and beating your best level.

import type { Speed } from './engine';

export function coinsFor(level: number, speed: Speed): number {
  const speedBonus = speed === 'lightning' || speed === 'fast' ? 1 : 0;
  return 1 + Math.floor(level / 3) + speedBonus;
}

export const STREAK_GEM_EVERY = 10;

export function isStreakGem(streak: number) {
  return streak > 0 && streak % STREAK_GEM_EVERY === 0;
}

export function runBonusGems(correct: number, total: number, peakLevel: number, previousBest: number) {
  let gems = 0;
  if (total >= 10 && correct === total) gems += 1;
  if (peakLevel > previousBest) gems += 1;
  return gems;
}
