// The difficulty ladder. Each level has a name shown to the player, an
// expected answer time (including typing) used by the engine to judge speed,
// and a generator. Generators never produce negative or fractional answers.
//
// Every level mixes an operation with its inverse (+ with −, × with ÷), so a
// child who stays on a level practises both. Levels differ by number size
// and mechanics (crossing the ten, carrying, bigger tables), not by operation.
// Each question comes from one number fact shown forwards or backwards:
// 8 + 5 and 13 − 5 practise the same bond; 5 × 7 and 35 ÷ 5 the same table.

export type Question = {
  text: string; // e.g. "34 + 25"
  answer: number;
  level: number;
  // Multiplier on the level's expected time. Subtracting and dividing take a
  // little longer than adding and multiplying the same numbers, so they get
  // more time; otherwise drawing them would slow a player's climb.
  effort: number;
  // The basic number fact behind the question, for the progress report:
  // "3+8" (a number bond, both parts up to 10) or "7×8" (a times-table fact,
  // both factors up to 12), whichever way round it is asked. Bigger sums
  // have none.
  fact?: string;
};

type Fact = Omit<Question, 'level'>;

type Level = {
  name: string;
  example: string; // shown to parents when choosing a level cap
  expectedMs: number;
  generate: () => Fact;
};

const INVERSE_EFFORT = 1.15;

const int = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
const coin = () => Math.random() < 0.5;

export function bondKey(a: number, b: number) {
  return a >= 1 && b >= 1 && a <= 10 && b <= 10 ? `${Math.min(a, b)}+${Math.max(a, b)}` : undefined;
}
export function tableKey(a: number, b: number) {
  return a >= 1 && b >= 1 && a <= 12 && b <= 12 ? `${Math.min(a, b)}×${Math.max(a, b)}` : undefined;
}

const add = (a: number, b: number): Fact => ({ text: `${a} + ${b}`, answer: a + b, effort: 1, fact: bondKey(a, b) });
const sub = (a: number, b: number): Fact => ({ text: `${a} − ${b}`, answer: a - b, effort: INVERSE_EFFORT, fact: bondKey(b, a - b) });
const mul = (a: number, b: number): Fact => ({ text: `${a} × ${b}`, answer: a * b, effort: 1, fact: tableKey(a, b) });
const div = (a: number, b: number): Fact => ({ text: `${a} ÷ ${b}`, answer: a / b, effort: INVERSE_EFFORT, fact: tableKey(b, a / b) });

// The addition fact a + b, shown as a sum (in either order) or as a
// subtraction. `b` is the number that gets taken away, unless `either`.
export function plusMinus(a: number, b: number, either = false, addChance = 0.5): Fact {
  if (Math.random() < addChance) return coin() ? add(a, b) : add(b, a);
  const taken = either && coin() ? a : b;
  return sub(a + b, taken);
}

// The multiplication fact a × b, shown as a product (in either order) or as a
// division. The divisor is `b` (usually the table being practised), unless
// `either`.
export function timesDivide(a: number, b: number, either = false): Fact {
  if (coin()) return coin() ? mul(a, b) : mul(b, a);
  const divisor = either && coin() ? a : b;
  return div(a * b, divisor);
}

// A times-table fact: mostly the focus tables, sometimes a review of easier ones.
function table(focus: readonly number[], review: readonly number[] = [], minOther = 1) {
  const t = review.length && Math.random() < 0.25 ? pick(review) : pick(focus);
  return timesDivide(int(minOther, 10), t);
}

export const LEVELS: readonly Level[] = [
  // ---- Adding and taking away to 20
  {
    name: 'Within 5', example: '3 + 2 · 4 − 1',
    expectedMs: 4000,
    generate: () => {
      const a = int(1, 4);
      return plusMinus(a, int(1, 5 - a), true);
    },
  },
  {
    name: 'Within 10', example: '6 + 3 · 9 − 4',
    expectedMs: 4500,
    generate: () => {
      const total = int(4, 10);
      const a = int(1, total - 1);
      return plusMinus(a, total - a, true);
    },
  },
  {
    // 12 + 3 and 17 − 4: the ones never cross the ten.
    name: 'Teens', example: '12 + 3 · 17 − 4',
    expectedMs: 5000,
    generate: () => {
      const a = int(11, 17);
      return plusMinus(a, int(1, 19 - a));
    },
  },
  {
    name: 'Doubles & halves', example: '7 + 7 · 16 − 8',
    expectedMs: 5000,
    generate: () => {
      const n = int(2, 10);
      return plusMinus(n, n);
    },
  },
  {
    // 8 + 5 and 13 − 5: the ones cross the ten.
    name: 'Over & under the ten', example: '8 + 5 · 13 − 5',
    expectedMs: 5000,
    generate: () => {
      const a = int(2, 9);
      return plusMinus(a, int(11 - a, 9), true);
    },
  },
  // ---- Adding and taking away to 100
  {
    name: 'Tens', example: '30 + 40 · 70 − 20',
    expectedMs: 5000,
    generate: () => {
      const a = int(1, 8);
      return plusMinus(a * 10, int(1, 9 - a) * 10, true);
    },
  },
  {
    // 34 + 5 and 39 − 5, without crossing a ten.
    name: 'Two-digit ± one-digit', example: '53 + 6 · 69 − 5',
    expectedMs: 5000,
    generate: () => {
      const ones = int(0, 8);
      return plusMinus(int(2, 8) * 10 + ones, int(1, 9 - ones));
    },
  },
  {
    // 47 + 8 and 55 − 8: crossing a ten.
    name: 'Crossing a ten', example: '47 + 8 · 55 − 8',
    expectedMs: 5000,
    generate: () => {
      const ones = int(2, 9);
      return plusMinus(int(2, 8) * 10 + ones, int(10 - ones, 9));
    },
  },
  {
    name: 'Adding & taking away tens', example: '34 + 20 · 76 − 30',
    expectedMs: 5000,
    generate: () => {
      const a = int(11, 79);
      return plusMinus(a, int(1, Math.floor((99 - a) / 10)) * 10);
    },
  },
  {
    // 34 + 25 and 59 − 25, no carrying or borrowing.
    name: 'Two-digit ± two-digit', example: '34 + 25 · 59 − 25',
    expectedMs: 9000,
    generate: () => {
      const t1 = int(1, 7);
      const o1 = int(0, 8);
      return plusMinus(t1 * 10 + o1, int(1, 8 - t1) * 10 + int(1, 9 - o1));
    },
  },
  {
    // 38 + 47 and 85 − 47.
    name: 'Carrying & borrowing', example: '38 + 47 · 85 − 47',
    expectedMs: 10500,
    generate: () => {
      const t1 = int(1, 7);
      const o1 = int(1, 9);
      return plusMinus(t1 * 10 + o1, int(1, 8 - t1) * 10 + int(10 - o1, 9));
    },
  },
  {
    name: 'All the way to 100', example: '100 − 37 · 57 + 36',
    expectedMs: 11000,
    generate: () => {
      // Taking away from 100 (only this way round: "63 + 37" would always be 100).
      if (Math.random() < 0.3) {
        const x = int(11, 89);
        return sub(100, x % 10 === 0 ? x + 3 : x);
      }
      // Bigger carrying and borrowing, totals from 60 to 99. Leans towards
      // adding so the level as a whole stays half adding, half taking away.
      const t1 = int(2, 6);
      const o1 = int(2, 9);
      return plusMinus(t1 * 10 + o1, int(Math.max(1, 5 - t1), 8 - t1) * 10 + int(10 - o1, 9), true, 5 / 7);
    },
  },
  // ---- Times and division tables
  { name: '×÷ 2 and 10', example: '2 × 7 · 60 ÷ 10', expectedMs: 4500, generate: () => table([2, 10]) },
  { name: '×÷ 5', example: '5 × 6 · 35 ÷ 5', expectedMs: 5000, generate: () => table([5], [2, 10]) },
  { name: '×÷ 3 and 4', example: '4 × 7 · 24 ÷ 3', expectedMs: 6000, generate: () => table([3, 4], [2, 5, 10], 2) },
  { name: '×÷ 6 and 7', example: '6 × 8 · 42 ÷ 7', expectedMs: 7000, generate: () => table([6, 7], [3, 4, 5], 2) },
  { name: '×÷ 8 and 9', example: '9 × 7 · 64 ÷ 8', expectedMs: 7000, generate: () => table([8, 9], [6, 7], 2) },
  { name: 'All the tables', example: '7 × 8 · 54 ÷ 9', expectedMs: 7500, generate: () => table([3, 4, 6, 7, 8, 9], [], 2) },
  // ---- Bigger numbers, up to 1000
  {
    name: 'Tens times', example: '7 × 30 · 210 ÷ 7',
    expectedMs: 9000,
    generate: () => (Math.random() < 0.7 ? timesDivide(int(2, 9) * 10, int(2, 9)) : table([11, 12], [], 2)),
  },
  {
    name: 'Hundreds', example: '340 + 280 · 620 − 280',
    expectedMs: 10000,
    generate: () => {
      const a = int(12, 70);
      return plusMinus(a * 10, int(11, 99 - a) * 10, true);
    },
  },
  { name: 'Big times', example: '23 × 4 · 92 ÷ 4', expectedMs: 10500, generate: () => timesDivide(int(13, 49), int(3, 9)) },
  {
    // 356 + 487 and 843 − 487.
    name: 'Three digits', example: '356 + 487 · 843 − 487',
    expectedMs: 15000,
    generate: () => {
      const a = int(123, 689);
      return plusMinus(a, int(123, 999 - a), true);
    },
  },
  { name: 'Teens times teens', example: '12 × 15 · 180 ÷ 12', expectedMs: 14000, generate: () => timesDivide(int(11, 19), int(11, 19), true) },
  { name: 'Long division', example: '72 × 7 · 504 ÷ 7', expectedMs: 13000, generate: () => timesDivide(int(21, 99), int(4, 9)) },
  {
    name: 'Up to 1000', example: '25 × 32 · 800 ÷ 25',
    expectedMs: 16000,
    generate: () => {
      const a = int(12, 45);
      return timesDivide(a, int(12, Math.floor(999 / a)), true);
    },
  },
  { name: 'Sharing by teens', example: '13 × 28 · 364 ÷ 13', expectedMs: 16000, generate: () => timesDivide(int(12, 60), int(11, 16)) },
  {
    name: 'Squares', example: '23 × 23 · 529 ÷ 23',
    expectedMs: 17000,
    generate: () => {
      const n = int(13, 31);
      return timesDivide(n, n);
    },
  },
  {
    name: 'Two steps', example: '7 × 24 + 35',
    expectedMs: 18000,
    generate: () => {
      const a = int(3, 9);
      const b = int(12, 40);
      const c = int(11, 99);
      return pick([
        { text: `${a} × ${b} + ${c}`, answer: a * b + c, effort: 1 },
        { text: `${a * b + c} − ${a} × ${b}`, answer: c, effort: INVERSE_EFFORT },
        { text: `${a * b} ÷ ${a} + ${c}`, answer: b + c, effort: INVERSE_EFFORT },
      ]);
    },
  },
  {
    name: 'Two steps plus', example: '6 × 83 − 48',
    expectedMs: 20000,
    generate: () => {
      const a = int(4, 9);
      const b = int(21, 99);
      const c = int(21, 99);
      const small = int(11, b - 1); // keeps "b − small" positive
      const taken = int(11, Math.min(99, a * b - 1)); // keeps "a × b − taken" positive
      return pick([
        { text: `${a} × ${b} − ${taken}`, answer: a * b - taken, effort: INVERSE_EFFORT },
        { text: `${c} + ${a} × ${b}`, answer: c + a * b, effort: 1 },
        { text: `${a * b} ÷ ${a} − ${small}`, answer: b - small, effort: INVERSE_EFFORT },
      ]);
    },
  },
  {
    name: 'Grandmaster', example: '27 × 35 · 945 ÷ 27',
    expectedMs: 22000,
    generate: () => {
      const a = int(21, 39);
      return timesDivide(a, int(21, Math.floor(999 / a)), true);
    },
  },
];

export const MAX_LEVEL = LEVELS.length;

// How the ladder is grouped when shown to parents (level numbers, inclusive).
export const LEVEL_GROUPS = [
  { title: 'Adding & taking away to 20', from: 1, to: 5 },
  { title: 'Adding & taking away to 100', from: 6, to: 12 },
  { title: 'Times & division tables', from: 13, to: 18 },
  { title: 'Bigger numbers, up to 1000', from: 19, to: 27 },
  { title: 'Expert', from: 28, to: 30 },
];

export function levelInfo(level: number) {
  return LEVELS[level - 1];
}

// Generates a question for `level`, avoiding an exact repeat of `previous`.
export function generateQuestion(level: number, previous?: Question): Question {
  for (let tries = 0; tries < 10; tries++) {
    const q = { ...LEVELS[level - 1].generate(), level };
    if (q.text !== previous?.text) return q;
  }
  return { ...LEVELS[level - 1].generate(), level };
}
