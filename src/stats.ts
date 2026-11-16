// Every answer a player gives, summed up for the grown-ups' progress report:
// per day (how much they practised), per level (how well each skill goes)
// and per basic number fact ("7×8", "3+8"), to find the facts a child knows
// by heart and the ones that are still tricky. Stored per player.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { levelInfo, type Question } from '@/game/levels';
import { today } from '@/game/rewards';

export type Tally = { n: number; right: number };
export type DayTally = Tally & { runs: number; ms: number };
export type FactTally = Tally & {
  recent: string; // the last answers, oldest first: "1" right, "0" wrong
  speed: number; // recent answer time as a share of the level's target time (lower is faster)
  level: number; // the level the fact was last asked at
};
export type Stats = {
  days: Record<string, DayTally>;
  levels: Record<string, Tally & { speed: number }>;
  facts: Record<string, FactTally>;
};

const EMPTY: Stats = { days: {}, levels: {}, facts: {} };
const KEEP_DAYS = 120;
const RECENT = 6;
// A long pause (the child walked away) shouldn't count as practice time.
const MAX_ANSWER_MS = 60_000;

const key = (playerId: string) => `stats.${playerId}.v1`;
let playerId = 'main';
let current: Stats = EMPTY;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadStats(id: string) {
  playerId = id;
  current = EMPTY;
  try {
    const raw = await AsyncStorage.getItem(key(id));
    if (raw) current = { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    // Unreadable: start a fresh report.
  }
  emit();
}

export function removeStats(id: string) {
  AsyncStorage.removeItem(key(id)).catch(() => {});
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function save() {
  clearTimeout(saveTimer);
  const id = playerId;
  const data = JSON.stringify(current);
  saveTimer = setTimeout(() => AsyncStorage.setItem(key(id), data).catch(() => {}), 500);
}

// Moving average: recent answers count more than old ones.
const blend = (old: number | undefined, value: number) => (old === undefined ? value : old * 0.6 + value * 0.4);

export function recordAnswer(question: Question, correct: boolean, elapsedMs: number) {
  const day = today();
  const ms = Math.min(elapsedMs, MAX_ANSWER_MS);
  const speed = Math.min(3, ms / (levelInfo(question.level).expectedMs * question.effort));
  const d = current.days[day] ?? { n: 0, right: 0, runs: 0, ms: 0 };
  const l = current.levels[question.level] ?? { n: 0, right: 0, speed: 1 };
  const next: Stats = {
    ...current,
    days: { ...current.days, [day]: { ...d, n: d.n + 1, right: d.right + (correct ? 1 : 0), ms: d.ms + ms } },
    levels: {
      ...current.levels,
      [question.level]: { n: l.n + 1, right: l.right + (correct ? 1 : 0), speed: correct ? blend(l.n ? l.speed : undefined, speed) : l.speed },
    },
  };
  if (question.fact) {
    const f = current.facts[question.fact];
    next.facts = {
      ...current.facts,
      [question.fact]: {
        n: (f?.n ?? 0) + 1,
        right: (f?.right ?? 0) + (correct ? 1 : 0),
        recent: `${f?.recent ?? ''}${correct ? 1 : 0}`.slice(-RECENT),
        speed: correct ? blend(f?.speed, speed) : (f?.speed ?? 3),
        level: question.level,
      },
    };
  }
  current = next;
  emit();
  save();
}

export function recordRunEnd() {
  const day = today();
  const d = current.days[day] ?? { n: 0, right: 0, runs: 0, ms: 0 };
  const days = { ...current.days, [day]: { ...d, runs: d.runs + 1 } };
  // Forget days older than a few months.
  const cutoff = today(new Date(Date.now() - KEEP_DAYS * 86_400_000));
  for (const k of Object.keys(days)) if (k < cutoff) delete days[k];
  current = { ...current, days };
  emit();
  save();
}

export function getStats() {
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStats() {
  return useSyncExternalStore(subscribe, getStats, getStats);
}

// ---------------------------------------------------------------- reading the stats

// new: never asked. learning: mostly wrong lately. shaky: right, but slow or
// with a recent slip. known: right every time lately, and quick.
export type FactStatus = 'new' | 'learning' | 'shaky' | 'known';

const recentMisses = (f: FactTally) => [...f.recent.slice(-4)].filter((c) => c === '0').length;

export function factStatus(f: FactTally | undefined): FactStatus {
  if (!f) return 'new';
  const misses = recentMisses(f);
  if (f.right === 0 || misses >= 2) return 'learning';
  if (misses === 1 || f.recent.length < 2 || f.speed > 0.6) return 'shaky';
  return 'known';
}

// The facts most worth practising, trickiest first: answered wrongly or
// slowly lately. (A fact answered right once isn't tricky, just not proven yet.)
export function trickyFacts(stats: Stats, limit = 12) {
  const score = (f: FactTally) => recentMisses(f) * 2 + f.speed;
  return Object.entries(stats.facts)
    .filter(([, f]) => recentMisses(f) > 0 || f.speed > 0.6)
    .sort(([, a], [, b]) => score(b) - score(a))
    .slice(0, limit)
    .map(([fact, f]) => ({ fact, ...f, status: factStatus(f) }));
}

// Totals over the last `days` days (today included).
export function recentTotals(stats: Stats, days: number) {
  const totals = { n: 0, right: 0, runs: 0, ms: 0, daysPlayed: 0 };
  for (let i = 0; i < days; i++) {
    const d = stats.days[today(new Date(Date.now() - i * 86_400_000))];
    if (!d) continue;
    totals.n += d.n;
    totals.right += d.right;
    totals.runs += d.runs;
    totals.ms += d.ms;
    if (d.n > 0) totals.daysPlayed++;
  }
  return totals;
}

// Questions answered on each of the last `days` days, oldest first, with the
// weekday's initial.
export function dailyCounts(stats: Stats, days: number) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - 1 - i) * 86_400_000);
    return { label: 'ZMDWDVZ'[date.getDay()], n: stats.days[today(date)]?.n ?? 0 };
  });
}
