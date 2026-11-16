/// <reference types="node" />
// Simulates how fast different players earn coins and gems, and how long it
// takes to unlock themes and pets at the current prices.
// Run with: npm run economy
//
// Uses the real engine, levels, reward rules and prices, with rough player
// skill curves. 20-question runs, about 1.5 runs a day (one run one day, two
// the next), so two out of three runs get the first-run-of-the-day bonus.

import { readdirSync, readFileSync } from 'node:fs';

import { judge } from '../src/game/engine';
import { generateQuestion, MAX_LEVEL } from '../src/game/levels';
import { COINS_PER_FINISHED_RUN, coinsFor, GEMS, isStreakGem, runBonusGems } from '../src/game/rewards';

type Skill = (level: number) => [ms: number, accuracy: number];

function curve(seconds: number[], accuracy: number[]): Skill {
  return (level) => [(seconds[level - 1] ?? 60) * 1000 * (0.75 + Math.random() * 0.5), accuracy[level - 1] ?? 0.15];
}

const PLAYERS: Record<string, Skill> = {
  '5-year-old': curve([4, 6, 10, 9, 16, 15, 20], [0.9, 0.8, 0.7, 0.7, 0.45, 0.5, 0.3]),
  '7-year-old': curve([2.5, 3.2, 4.5, 4.5, 8, 6, 6.5, 10, 8.5, 13, 18, 22, 12, 20], [0.98, 0.95, 0.93, 0.92, 0.8, 0.9, 0.88, 0.72, 0.8, 0.7, 0.6, 0.5, 0.45, 0.2]),
  'Adult': curve(
    [1.8, 2, 2.3, 2, 2.8, 2.5, 3, 3.6, 3.2, 4.5, 5.5, 6.5, 2.2, 2.5, 3.2, 4, 4.5, 4.8, 7, 8, 9, 11, 15, 15, 20],
    [1, 1, 1, 1, 0.98, 1, 0.98, 0.96, 0.97, 0.95, 0.92, 0.9, 0.98, 0.97, 0.93, 0.88, 0.86, 0.85, 0.8, 0.8, 0.75, 0.72, 0.6, 0.6, 0.5],
  ),
};

const readPrices = (dir: string, file: string) =>
  readdirSync(dir)
    .filter((d) => !d.startsWith('.'))
    .map((id) => JSON.parse(readFileSync(`${dir}/${id}/${file}`, 'utf8')))
    .filter((x) => x.price > 0)
    .map((x) => x.price as number)
    .sort((a, b) => a - b);
const themePrices = readPrices('themes', 'theme.json');
const petPrices = readPrices('pets', 'pet.json');
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

const QUESTIONS = 20;
const RUNS = 1500;
const REPEATS = 20;
const RUNS_PER_DAY = 1.5;

console.log(`Coin themes: ${themePrices.join(', ')} (${sum(themePrices)} coins)`);
console.log(`Gem pets: ${petPrices.length}, ${sum(petPrices)} gems in total; welcome gift ${GEMS.welcome} gems`);

for (const [name, skill] of Object.entries(PLAYERS)) {
  const coinsAt: number[] = new Array(RUNS).fill(0); // cumulative, summed over repeats
  const gemsAt: number[] = new Array(RUNS).fill(0);
  for (let rep = 0; rep < REPEATS; rep++) {
    let best = 0;
    let coins = 0;
    let gems = GEMS.welcome;
    for (let run = 0; run < RUNS; run++) {
      let level = 1;
      let peak = 1;
      let streak = 0;
      let correct = 0;
      let wrongBefore = false;
      for (let q = 0; q < QUESTIONS; q++) {
        const question = generateQuestion(level);
        const [ms, accuracy] = skill(level);
        const ok = Math.random() < accuracy;
        const v = judge(level, ok, ms, wrongBefore, question.effort, MAX_LEVEL);
        wrongBefore = !ok;
        if (ok) {
          correct++;
          streak++;
          coins += coinsFor(level, v.speed!);
          if (isStreakGem(streak)) gems++;
        } else streak = 0;
        level = v.nextLevel;
        peak = Math.max(peak, level);
      }
      coins += COINS_PER_FINISHED_RUN;
      gems += runBonusGems({ correct, total: QUESTIONS, peakLevel: peak, previousBest: best, firstRunToday: run % 3 !== 2 }).gems;
      best = Math.max(best, peak);
      coinsAt[run] += coins;
      gemsAt[run] += gems;
    }
  }
  // Runs until the (average) player has enough for the cheapest n items.
  const runsFor = (totals: number[], amount: number) => {
    const i = totals.findIndex((t) => t / REPEATS >= amount);
    return i < 0 ? `>${RUNS}` : String(i + 1);
  };
  const days = (runs: string) => (runs.startsWith('>') ? 'years' : `~${Math.round(Number(runs) / RUNS_PER_DAY)} days`);
  const perRun = (totals: number[]) => ((totals[RUNS - 1] - totals[RUNS - 101]) / 100 / REPEATS).toFixed(1);
  const firstPet = runsFor(gemsAt, petPrices[0]);
  const tenPets = runsFor(gemsAt, sum(petPrices.slice(0, 10)));
  const allPets = runsFor(gemsAt, sum(petPrices));
  const firstTheme = runsFor(coinsAt, themePrices[0]);
  const allThemes = runsFor(coinsAt, sum(themePrices));
  console.log(`\n${name}: ${perRun(coinsAt)} coins and ${perRun(gemsAt)} gems per run`);
  console.log(`  first new pet after ${firstPet} run(s), 10 pets after ${tenPets} (${days(tenPets)}), all pets after ${allPets} (${days(allPets)})`);
  console.log(`  first theme after ${firstTheme} runs (${days(firstTheme)}), all coin themes after ${allThemes} (${days(allThemes)})`);
}
