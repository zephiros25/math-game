// The difficulty ladder. Each level has a name shown to the player, an
// expected answer time (including typing) used by the engine to judge speed,
// and a generator. Generators never produce negative or fractional answers.

export type Op = '+' | '−' | '×' | '÷';

export type Question = {
  text: string; // e.g. "34 + 25"
  answer: number;
  level: number;
};

type Level = {
  name: string;
  expectedMs: number;
  generate: () => Omit<Question, 'level'>;
};

const int = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

const add = (a: number, b: number) => ({ text: `${a} + ${b}`, answer: a + b });
const sub = (a: number, b: number) => ({ text: `${a} − ${b}`, answer: a - b });
const mul = (a: number, b: number) => ({ text: `${a} × ${b}`, answer: a * b });
// Division is generated from its product so it is always exact.
const div = (quotient: number, divisor: number) => ({
  text: `${quotient * divisor} ÷ ${divisor}`,
  answer: quotient,
});
const swap = (a: number, b: number): [number, number] => (Math.random() < 0.5 ? [a, b] : [b, a]);

function addWithin(max: number, minSum = 2) {
  const sum = int(minSum, max);
  const a = int(1, sum - 1);
  return add(a, sum - a);
}

function subWithin(max: number) {
  const a = int(2, max);
  return sub(a, int(1, a - 1));
}

// Ones digits that sum to 10 or more: 8 + 5, 7 + 6 ...
function addCrossingTen() {
  const a = int(2, 9);
  return add(...swap(a, int(11 - a, 9)));
}

function subCrossingTen() {
  const b = int(2, 9);
  const a = int(11, 10 + b - 1);
  return sub(a, b);
}

function tables(factors: readonly number[]) {
  return mul(...swap(pick(factors), int(1, 10)));
}

function divTables(divisors: readonly number[]) {
  return div(int(1, 10), pick(divisors));
}

export const LEVELS: readonly Level[] = [
  { name: 'Tiny sums', expectedMs: 4000, generate: () => addWithin(5) },
  { name: 'Sums to 10', expectedMs: 4500, generate: () => addWithin(10, 4) },
  { name: 'Take away to 10', expectedMs: 5000, generate: () => subWithin(10) },
  { name: 'Mix to 10', expectedMs: 5000, generate: () => (Math.random() < 0.5 ? addWithin(10, 4) : subWithin(10)) },
  { name: 'Sums to 20', expectedMs: 5500, generate: () => add(10 + int(0, 5), int(1, 4)) },
  { name: 'Take away to 20', expectedMs: 6000, generate: () => { const a = int(13, 19); return sub(a, int(1, a - 10)); } },
  { name: 'Over the ten', expectedMs: 6500, generate: addCrossingTen },
  { name: 'Under the ten', expectedMs: 7000, generate: subCrossingTen },
  {
    name: 'Tens',
    expectedMs: 6500,
    generate: () =>
      Math.random() < 0.5
        ? (() => { const a = int(1, 8); return add(a * 10, int(1, 9 - a) * 10); })()
        : add(int(2, 8) * 10 + int(1, 4), int(1, 5)),
  },
  {
    name: 'Carry the one',
    expectedMs: 7500,
    generate: () => {
      if (Math.random() < 0.5) {
        const ones = int(3, 9);
        return add(int(1, 8) * 10 + ones, int(10 - ones, 9));
      }
      const ones = int(0, 7);
      return sub(int(2, 9) * 10 + ones, int(ones + 1, 9));
    },
  },
  { name: 'Sums to 100', expectedMs: 9000, generate: () => { const a = int(12, 68); return add(a, int(11, 99 - a)); } },
  { name: 'Take away to 100', expectedMs: 10000, generate: () => { const a = int(40, 99); return sub(a, int(11, a - 10)); } },
  { name: 'Tables of 2, 5, 10', expectedMs: 5000, generate: () => tables([2, 5, 10]) },
  { name: 'Tables of 3 and 4', expectedMs: 6000, generate: () => tables([2, 3, 4, 5, 10]) },
  { name: 'All the tables', expectedMs: 7000, generate: () => tables([3, 4, 6, 7, 8, 9]) },
  { name: 'Sharing by 2, 5, 10', expectedMs: 6000, generate: () => divTables([2, 5, 10]) },
  { name: 'Dividing', expectedMs: 7500, generate: () => divTables([3, 4, 6, 7, 8, 9]) },
  {
    name: 'Times and divide',
    expectedMs: 7500,
    generate: () => (Math.random() < 0.5 ? tables([6, 7, 8, 9]) : divTables([6, 7, 8, 9])),
  },
  {
    name: 'Tens times',
    expectedMs: 9000,
    generate: () => (Math.random() < 0.5 ? mul(...swap(int(2, 9), int(2, 9) * 10)) : tables([11, 12])),
  },
  {
    name: 'Hundreds',
    expectedMs: 10000,
    generate: () => {
      if (Math.random() < 0.5) {
        const a = int(12, 70) * 10;
        return add(a, int(11, 99 - a / 10) * 10);
      }
      const a = int(30, 99) * 10;
      return sub(a, int(11, a / 10 - 5) * 10);
    },
  },
  { name: 'Big times', expectedMs: 10000, generate: () => mul(...swap(int(13, 49), int(3, 9))) },
  { name: 'Big sharing', expectedMs: 11000, generate: () => div(int(12, 40), int(3, 8)) },
  { name: 'Teens times teens', expectedMs: 14000, generate: () => mul(int(11, 19), int(11, 19)) },
  { name: 'Long division', expectedMs: 13000, generate: () => div(int(21, 99), int(4, 9)) },
  {
    name: 'Up to 1000',
    expectedMs: 16000,
    generate: () => {
      const a = int(12, 45);
      return mul(...swap(a, int(12, Math.floor(999 / a))));
    },
  },
  { name: 'Sharing by teens', expectedMs: 16000, generate: () => div(int(12, 60), int(11, 16)) },
  {
    name: 'Three digits',
    expectedMs: 16000,
    generate: () => {
      if (Math.random() < 0.5) {
        const a = int(178, 689);
        return add(a, int(123, 999 - a));
      }
      const a = int(400, 999);
      return sub(a, int(123, a - 100));
    },
  },
  {
    name: 'Two steps',
    expectedMs: 18000,
    generate: () => {
      const a = int(3, 9);
      const b = int(12, 40);
      const c = int(11, 99);
      return Math.random() < 0.5
        ? { text: `${a} × ${b} + ${c}`, answer: a * b + c }
        : { text: `${a * b + c} − ${a} × ${b}`, answer: c };
    },
  },
  {
    name: 'Squares',
    expectedMs: 18000,
    generate: () => {
      if (Math.random() < 0.5) {
        const n = int(13, 31);
        return mul(n, n);
      }
      return div(int(21, 52), int(12, 19));
    },
  },
  {
    name: 'Grandmaster',
    expectedMs: 22000,
    generate: () => {
      const a = int(21, 39);
      return mul(a, int(21, Math.floor(999 / a)));
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
