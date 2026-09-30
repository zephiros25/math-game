# Math Run

An adaptive mental-math game for all ages. Answer fast and correctly to climb a
30-level ladder (sums to 10 → ×/÷ up to 1000); runs of 10/20/40 questions earn
coins and gems.

## Commands

```bash
npm start                # dev server (scan the QR code with Expo Go)
npm run simulate         # simulate adult/child players against the difficulty engine
npm run generate-sounds  # re-synthesize the default sound effects in assets/sounds/
npm run studio           # Theme Studio: create and edit themes at http://localhost:4455
npm run themes           # validate themes/ and regenerate src/theme-registry.generated.ts
npm run pets             # validate pets/ and regenerate src/pet-registry.generated.ts
npm run typecheck
npm run lint
```

## Layout

- `src/game/levels.ts` – the level ladder and question generators
- `src/game/engine.ts` – adaptive difficulty (speed × correctness → level change)
- `src/game/rewards.ts` – coins and gems
- `src/feedback.ts` – sound effects + haptics
- `src/progress.ts` – saved wallet, best level and settings
- `src/app/` – home, play, results and theme shop screens
- `themes/<id>/` – one folder per theme: `theme.json` plus its images and sounds
- `scripts/themes/` – theme format (`schema.mjs`), build step and the Studio (themes and pets pages)
- `pets/<id>/` – one folder per pet: `pet.json`, three pictures (normal, eyes closed, mouth open), optional voice
- `scripts/pets/` – pet format, build step, and the drawing script for the starter pets
- `src/components/pet-view.tsx` – the animated pet (idle motion, blinking, talking)

## Making themes

1. Run `npx expo start` (phone preview) and, in a second terminal, `npm run studio`.
2. Open http://localhost:4455, then create or duplicate a theme.
3. Pick colors and a font (any Google Fonts family, or your own .ttf/.otf files), drop in
   a background image, particle sprites (transparent PNGs) and
   sound recordings. The Studio shrinks images and checks formats and contrast.
4. Save (Ctrl+S). The app's theme registry is regenerated and the phone reloads.
   In development builds the theme shop has a "Developer: unlock & equip" link
   so you can try locked or premium themes without coins.

A theme with errors is left out of the app (the others keep working) until fixed.

## Making pets

In the Studio, open **Pets**. A pet needs a normal picture; add an "eyes closed"
and a "mouth open" version of the *same* image so it can blink and talk (the
page has a ChatGPT recipe for making all three). Set its price in gems, its
voice pitch, and optionally its own sentences per moment. Kids unlock pets
with gems in the app's pet shop; parents can hide the pet in Settings.
