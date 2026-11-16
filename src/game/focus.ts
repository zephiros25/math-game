// Practice runs: instead of climbing the adaptive ladder, a run drills either
// the times tables chosen in the grown-ups screen (the "Tafels oefenen"
// button on the home screen) or the child's tricky facts from the progress
// report. Questions are still timed against the level they belong to, so
// coins and speed feedback work as usual.

import type { Practice } from '@/progress';
import { trickyFacts, type Stats } from '@/stats';

import { plusMinus, tableKey, timesDivide, type Question } from './levels';

export const FOCUS_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

// What a practice run drills: the chosen tables, or the tricky facts.
export type PracticeMode = 'tables' | 'tricky';

// The level whose target time fits each table (see LEVELS).
const TABLE_LEVEL: Record<number, number> = { 2: 13, 10: 13, 5: 14, 3: 15, 4: 15, 6: 16, 7: 16, 8: 17, 9: 17, 11: 19, 12: 19 };

// A tricky-facts run needs a few facts to mix; with fewer there is nothing to practise.
export const MIN_TRICKY = 3;

export type FocusPlan = { label: string; next: (previous?: Question) => Question };

const int = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

// "tafel van 7", "tafels van 2, 5 en 10"
export function tablesLabel(tables: readonly number[]) {
  const sorted = [...tables].sort((a, b) => a - b);
  if (sorted.length === 1) return `tafel van ${sorted[0]}`;
  return `tafels van ${sorted.slice(0, -1).join(', ')} en ${sorted.at(-1)}`;
}

export const practiceLabel = (practice: Practice) => tablesLabel(practice.tables) + (practice.division ? ' (met ÷)' : '');

// The question fact "7×8" or "3+8" as a question, asked either way round.
function fromFact(fact: string, level: number): Question {
  const [a, b] = fact.split(/[+×]/).map(Number);
  const q = fact.includes('×') ? timesDivide(a, b, true) : plusMinus(a, b, true);
  return { ...q, level };
}

// What a practice run drills, or null when there is nothing to practise.
export function practicePlan(mode: PracticeMode, practice: Practice, stats: Stats): FocusPlan | null {
  if (mode === 'tables' && practice.tables.length > 0) {
    return {
      label: practiceLabel(practice),
      next: (previous) => {
        for (let tries = 0; ; tries++) {
          const table = pick(practice.tables);
          const other = int(2, 10);
          const level = TABLE_LEVEL[table] ?? 18;
          let q: Question;
          if (practice.division) {
            // Half multiplication, half dividing by the table (56 ÷ 8).
            q = { ...timesDivide(other, table), level };
          } else {
            // Multiplication only, the table either first or second.
            const [a, b] = Math.random() < 0.5 ? [table, other] : [other, table];
            q = { text: `${a} × ${b}`, answer: a * b, effort: 1, fact: tableKey(a, b), level };
          }
          if (q.text !== previous?.text || tries > 10) return q;
        }
      },
    };
  }
  if (mode === 'tricky') {
    const facts = trickyFacts(stats);
    if (facts.length < MIN_TRICKY) return null;
    return {
      label: 'lastige sommen',
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
