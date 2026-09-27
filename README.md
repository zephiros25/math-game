# Math Run

An adaptive mental-math game for all ages. Answer fast and correctly to climb a
30-level ladder (sums to 10 → ×/÷ up to 1000); runs of 10/20/40 questions earn
coins and gems.

## Commands

```bash
npm start                # dev server (scan the QR code with Expo Go)
npm run simulate         # simulate adult/child players against the difficulty engine
npm run generate-sounds  # re-synthesize the sound effects in assets/sounds/
npm run typecheck
npm run lint
```

## Layout

- `src/game/levels.ts` – the level ladder and question generators
- `src/game/engine.ts` – adaptive difficulty (speed × correctness → level change)
- `src/game/rewards.ts` – coins and gems
- `src/feedback.ts` – sound effects + haptics
- `src/progress.ts` – saved wallet, best level and settings
- `src/app/` – home, play and results screens
