// Simulates runs by different kinds of players to tune the difficulty engine.
// Run with: npm run simulate
//
// Each player has a "fluency" curve: how long they need for a level and how
// likely they are to get it right. The numbers are rough guesses; the point is
// to check that adults shoot up and beginners stay in their comfort zone.
// Players are assumed ~20% slower on subtraction and division.

import { judge } from '../src/game/engine';
import { generateQuestion, levelInfo, MAX_LEVEL } from '../src/game/levels';

type Player = {
  name: string;
  // Returns [answer time in ms, chance of a correct answer] at a level.
  skill: (level: number) => [number, number];
};

// Seconds per level for each player, index = level - 1. Beyond the array
// they're effectively stuck (very slow, mostly wrong).
function curve(seconds: number[], accuracy: number[]): Player['skill'] {
  return (level) => {
    const s = seconds[level - 1] ?? 60;
    const a = accuracy[level - 1] ?? 0.15;
    return [s * 1000 * (0.75 + Math.random() * 0.5), a];
  };
}

const players: Player[] = [
  {
    name: 'Fluent adult',
    skill: curve(
      [1.2, 1.3, 1.4, 1.3, 1.6, 1.5, 1.7, 2.0, 1.9, 2.6, 3.2, 3.5, 1.3, 1.4, 1.7, 2.0, 2.1, 2.2, 2.8, 3.5, 4, 5, 6, 6, 8, 8, 9, 9, 11, 12],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.98, 0.97, 1, 1, 0.98, 0.97, 0.97, 0.96, 0.95, 0.95, 0.93, 0.9, 0.85, 0.85, 0.8, 0.8, 0.8, 0.8, 0.75, 0.7],
    ),
  },
  {
    name: 'Rusty adult',
    skill: curve(
      [1.8, 2, 2.3, 2, 2.8, 2.5, 3, 3.6, 3.2, 4.5, 5.5, 6.5, 2.2, 2.5, 3.2, 4, 4.5, 4.8, 7, 8, 9, 11, 15, 15, 20],
      [1, 1, 1, 1, 0.98, 1, 0.98, 0.96, 0.97, 0.95, 0.92, 0.9, 0.98, 0.97, 0.93, 0.88, 0.86, 0.85, 0.8, 0.8, 0.75, 0.72, 0.6, 0.6, 0.5],
    ),
  },
  {
    name: '7-year-old (to 100)',
    skill: curve(
      [2.5, 3.2, 4.5, 4.5, 8, 6, 6.5, 10, 8.5, 13, 18, 22, 12, 20],
      [0.98, 0.95, 0.93, 0.92, 0.8, 0.9, 0.88, 0.72, 0.8, 0.7, 0.6, 0.5, 0.45, 0.2],
    ),
  },
  {
    name: '5-year-old beginner',
    skill: curve([4, 6, 10, 9, 16, 15, 20], [0.9, 0.8, 0.7, 0.7, 0.45, 0.5, 0.3]),
  },
];

const RUNS = 2000;
const QUESTIONS = 20;

for (const player of players) {
  let totalPeak = 0;
  let maxPeak = 0;
  let reachedTables = 0; // level 13+
  let reachedBig = 0; // level 21+ (×/÷ to 100 and beyond)
  const levelAt10 = new Array(MAX_LEVEL + 1).fill(0);
  let correct = 0;

  for (let r = 0; r < RUNS; r++) {
    let level = 1;
    let peak = 1;
    let wrongBefore = false;
    for (let q = 1; q <= QUESTIONS; q++) {
      const question = generateQuestion(level);
      const [ms, accuracy] = player.skill(level);
      const inverse = / [−÷] /.test(question.text);
      const ok = Math.random() < accuracy;
      if (ok) correct++;
      const v = judge(level, ok, inverse ? ms * 1.2 : ms, wrongBefore, question.effort);
      wrongBefore = !ok;
      level = v.nextLevel;
      peak = Math.max(peak, level);
      if (q === 10) levelAt10[level]++;
    }
    totalPeak += peak;
    maxPeak = Math.max(maxPeak, peak);
    if (peak >= 13) reachedTables++;
    if (peak >= 21) reachedBig++;
  }

  const median10 = (() => {
    let acc = 0;
    for (let l = 1; l <= MAX_LEVEL; l++) {
      acc += levelAt10[l];
      if (acc >= RUNS / 2) return l;
    }
    return MAX_LEVEL;
  })();

  console.log(`\n${player.name}`);
  console.log(`  level after 10 questions (median): ${median10}  "${levelInfo(median10).name}"`);
  console.log(`  average peak in ${QUESTIONS} questions: ${(totalPeak / RUNS).toFixed(1)}   best peak ever: ${maxPeak}`);
  console.log(`  runs reaching tables (13+): ${((100 * reachedTables) / RUNS).toFixed(1)}%   reaching ×/÷ to 100+ (21+): ${((100 * reachedBig) / RUNS).toFixed(1)}%`);
  console.log(`  accuracy: ${((100 * correct) / (RUNS * QUESTIONS)).toFixed(0)}%`);
}

// Sanity check every generator: integer, non-negative answers, ≤ 1000, and
// a real mix of an operation with its inverse (+ with −, × with ÷).
console.log('\nLevel mix (share of − or ÷ questions) and examples:');
for (let level = 1; level <= MAX_LEVEL; level++) {
  let inverse = 0;
  const samples = new Set<string>();
  for (let i = 0; i < 5000; i++) {
    const q = generateQuestion(level);
    const operands = q.text.match(/\d+/g)!.map(Number);
    if (!Number.isInteger(q.answer) || q.answer < 0 || Math.max(q.answer, ...operands) > 1000) {
      throw new Error(`Bad question at level ${level}: ${q.text} = ${q.answer}`);
    }
    if (/ [−÷] /.test(q.text)) inverse++;
    if (samples.size < 4) samples.add(`${q.text} = ${q.answer}`);
  }
  const share = Math.round((100 * inverse) / 5000);
  console.log(`  ${String(level).padStart(2)} ${levelInfo(level).name.padEnd(26)} ${String(share).padStart(3)}%   ${[...samples].join('   ')}`);
}
console.log('\nAll generators OK.');
