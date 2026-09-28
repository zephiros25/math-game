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
};

type Fact = Omit<Question, 'level'>;

type Level = {
  name: string;
  expectedMs: number;
  generate: () => Fact;
};

const INVERSE_EFFORT = 1.15;

const int = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
const coin = () => Math.random() < 0.5;

const add = (a: number, b: number): Fact => ({ text: `${a} + ${b}`, answer: a + b, effort: 1 });
const sub = (a: number, b: number): Fact => ({ text: `${a} − ${b}`, answer: a - b, effort: INVERSE_EFFORT });
const mul = (a: number, b: number): Fact => ({ text: `${a} × ${b}`, answer: a * b, effort: 1 });
const div = (a: number, b: number): Fact => ({ text: `${a} ÷ ${b}`, answer: a / b, effort: INVERSE_EFFORT });

// The addition fact a + b, shown as a sum (in either order) or as a
// subtraction. `b` is the number that gets taken away, unless `either`.
function plusMinus(a: number, b: number, either = false, addChance = 0.5): Fact {
  if (Math.random() < addChance) return coin() ? add(a, b) : add(b, a);
  const taken = either && coin() ? a : b;
  return sub(a + b, taken);
}

// The multiplication fact a × b, shown as a product (in either order) or as a
// division. The divisor is `b` (usually the table being practised), unless
// `either`.
function timesDivide(a: number, b: number, either = false): Fact {
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
    name: 'Within 5',
    expectedMs: 4000,
    generate: () => {
      const a = int(1, 4);
      return plusMinus(a, int(1, 5 - a), true);
    },
  },
  {
    name: 'Within 10',
    expectedMs: 4500,
    generate: () => {
      const total = int(4, 10);
      const a = int(1, total - 1);
      return plusMinus(a, total - a, true);
    },
  },
  {
    // 12 + 3 and 17 − 4: the ones never cross the ten.
    name: 'Teens',
    expectedMs: 5000,
    generate: () => {
      const a = int(11, 17);
      return plusMinus(a, int(1, 19 - a));
    },
  },
  {
    name: 'Doubles & halves',
    expectedMs: 5000,
    generate: () => {
      const n = int(2, 10);
      return plusMinus(n, n);
    },
  },
  {
    // 8 + 5 and 13 − 5: the ones cross the ten.
    name: 'Over & under the ten',
    expectedMs: 5000,
    generate: () => {
      const a = int(2, 9);
      return plusMinus(a, int(11 - a, 9), true);
    },
  },
  // ---- Adding and taking away to 100
  {
    name: 'Tens',
    expectedMs: 5000,
    generate: () => {
      const a = int(1, 8);
      return plusMinus(a * 10, int(1, 9 - a) * 10, true);
    },
  },
  {
    // 34 + 5 and 39 − 5, without crossing a ten.
    name: 'Two-digit ± one-digit',
    expectedMs: 5000,
    generate: () => {
      const ones = int(0, 8);
      return plusMinus(int(2, 8) * 10 + ones, int(1, 9 - ones));
    },
  },
  {
    // 47 + 8 and 55 − 8: crossing a ten.
    name: 'Crossing a ten',
    expectedMs: 5000,
    generate: () => {
      const ones = int(2, 9);
      return plusMinus(int(2, 8) * 10 + ones, int(10 - ones, 9));
    },
  },
  {
    name: 'Adding & taking away tens',
    expectedMs: 5000,
    generate: () => {
      const a = int(11, 79);
      return plusMinus(a, int(1, Math.floor((99 - a) / 10)) * 10);
    },
  },
  {
    // 34 + 25 and 59 − 25, no carrying or borrowing.
    name: 'Two-digit ± two-digit',
    expectedMs: 9000,
    generate: () => {
      const t1 = int(1, 7);
      const o1 = int(0, 8);
      return plusMinus(t1 * 10 + o1, int(1, 8 - t1) * 10 + int(1, 9 - o1));
    },
  },
  {
    // 38 + 47 and 85 − 47.
    name: 'Carrying & borrowing',
    expectedMs: 10500,
    generate: () => {
      const t1 = int(1, 7);
      const o1 = int(1, 9);
      return plusMinus(t1 * 10 + o1, int(1, 8 - t1) * 10 + int(10 - o1, 9));
    },
  },
  {
    name: 'All the way to 100',
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
  { name: '×÷ 2 and 10', expectedMs: 4500, generate: () => table([2, 10]) },
  { name: '×÷ 5', expectedMs: 5000, generate: () => table([5], [2, 10]) },
  { name: '×÷ 3 and 4', expectedMs: 6000, generate: () => table([3, 4], [2, 5, 10], 2) },
  { name: '×÷ 6 and 7', expectedMs: 7000, generate: () => table([6, 7], [3, 4, 5], 2) },
  { name: '×÷ 8 and 9', expectedMs: 7000, generate: () => table([8, 9], [6, 7], 2) },
  { name: 'All the tables', expectedMs: 7500, generate: () => table([3, 4, 6, 7, 8, 9], [], 2) },
  // ---- Bigger numbers, up to 1000
  {
    name: 'Tens times',
    expectedMs: 9000,
    generate: () => (Math.random() < 0.7 ? timesDivide(int(2, 9) * 10, int(2, 9)) : table([11, 12], [], 2)),
  },
  {
    name: 'Hundreds',
    expectedMs: 10000,
    generate: () => {
      const a = int(12, 70);
      return plusMinus(a * 10, int(11, 99 - a) * 10, true);
    },
  },
  { name: 'Big times', expectedMs: 10500, generate: () => timesDivide(int(13, 49), int(3, 9)) },
  {
    // 356 + 487 and 843 − 487.
    name: 'Three digits',
    expectedMs: 15000,
    generate: () => {
      const a = int(123, 689);
      return plusMinus(a, int(123, 999 - a), true);
    },
  },
  { name: 'Teens times teens', expectedMs: 14000, generate: () => timesDivide(int(11, 19), int(11, 19), true) },
  { name: 'Long division', expectedMs: 13000, generate: () => timesDivide(int(21, 99), int(4, 9)) },
  {
    name: 'Up to 1000',
    expectedMs: 16000,
    generate: () => {
      const a = int(12, 45);
      return timesDivide(a, int(12, Math.floor(999 / a)), true);
    },
  },
  { name: 'Sharing by teens', expectedMs: 16000, generate: () => timesDivide(int(12, 60), int(11, 16)) },
  {
    name: 'Squares',
    expectedMs: 17000,
    generate: () => {
      const n = int(13, 31);
      return timesDivide(n, n);
    },
  },
  {
    name: 'Two steps',
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
    name: 'Two steps plus',
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
    name: 'Grandmaster',
    expectedMs: 22000,
    generate: () => {
      const a = int(21, 39);
      return timesDivide(a, int(21, Math.floor(999 / a)), true);
    },
  },
];

export const MAX_LEVEL = LEVELS.length;

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
