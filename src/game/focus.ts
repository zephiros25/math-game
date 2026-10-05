// Focus practice (a Plus feature): instead of climbing the adaptive ladder, a
// run drills what a grown-up picked, either the child's tricky facts from the
// progress report or chosen times tables. Questions are still timed against
// the level they belong to, so coins and speed feedback work as usual.

import type { Focus } from '@/progress';
import { trickyFacts, type Stats } from '@/stats';

import { plusMinus, tableKey, timesDivide, type Question } from './levels';

export const FOCUS_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

// The level whose target time fits each table (see LEVELS).
const TABLE_LEVEL: Record<number, number> = { 2: 13, 10: 13, 5: 14, 3: 15, 4: 15, 6: 16, 7: 16, 8: 17, 9: 17, 11: 19, 12: 19 };

// A tricky-facts run needs a few facts to mix; with fewer the game just plays normally.
export const MIN_TRICKY = 3;

export type FocusPlan = { label: string; next: (previous?: Question) => Question };

const int = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

export function tablesLabel(tables: readonly number[]) {
  const names = [...tables].sort((a, b) => a - b).map((t) => `${t}×`);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)} tables` : `${names[0]} table`;
}

// The question fact "7×8" or "3+8" as a question, asked either way round.
function fromFact(fact: string, level: number): Question {
  const [a, b] = fact.split(/[+×]/).map(Number);
  const q = fact.includes('×') ? timesDivide(a, b, true) : plusMinus(a, b, true);
  return { ...q, level };
}

// What the next run drills, or null to play the normal adaptive game.
export function focusPlan(focus: Focus, stats: Stats): FocusPlan | null {
  if (focus?.kind === 'tables' && focus.tables.length > 0) {
    return {
      label: tablesLabel(focus.tables),
      next: (previous) => {
        for (let tries = 0; ; tries++) {
          // Multiplication only (no division), the table either first or second.
          const table = pick(focus.tables);
          const other = int(2, 10);
          const [a, b] = Math.random() < 0.5 ? [table, other] : [other, table];
          const q: Question = { text: `${a} × ${b}`, answer: a * b, effort: 1, fact: tableKey(a, b), level: TABLE_LEVEL[table] ?? 18 };
          if (q.text !== previous?.text || tries > 10) return q;
        }
      },
    };
  }
  if (focus?.kind === 'tricky') {
    const facts = trickyFacts(stats);
    if (facts.length < MIN_TRICKY) return null;
    return {
      label: 'tricky facts',
      next: (previous) => {
        for (let tries = 0; ; tries++) {
          const f = pick(facts);
          const q = fromFact(f.fact, f.level);
          if (q.text !== previous?.text || tries > 10) return q;
        }
      },
    };
  }
  return null;
}
