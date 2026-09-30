// Splits a "character sheet" (three versions of a pet side by side in one
// picture) into three separate pictures. Figures are found by the empty,
// fully transparent columns between them, not by a fixed grid, so uneven
// spacing is fine. Tiny specks between figures are ignored.

import sharp from 'sharp';

const ALPHA_THRESHOLD = 20;

// `count` is how many figures the sheet holds (3 for pets, 2 for a theme's
// icon and button).
export async function splitSheet(input, count = 3) {
  const { data, info } = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const filled = new Array(width).fill(false);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (data[(y * width + x) * 4 + 3] >= ALPHA_THRESHOLD) {
        filled[x] = true;
        break;
      }
    }
  }
  const runs = [];
  let start = null;
  for (let x = 0; x <= width; x++) {
    const on = x < width && filled[x];
    if (on && start === null) start = x;
    if (!on && start !== null) {
      runs.push({ left: start, right: x - 1 });
      start = null;
    }
  }

  // The widest runs are the figures; keep them in left-to-right order.
  const figures = runs
    .filter((r) => r.right - r.left + 1 >= width * 0.05)
    .sort((a, b) => b.right - b.left - (a.right - a.left))
    .slice(0, count)
    .sort((a, b) => a.left - b.left);
  if (figures.length < count) {
    throw new Error(`found ${figures.length} separate figure(s) instead of ${count}. Ask ChatGPT for clear empty space between them.`);
  }

  // Cut each figure out with a little transparent margin; alignment later
  // centres and scales them.
  const margin = Math.round(width * 0.01);
  const raw = { raw: { width, height, channels: 4 } };
  return Promise.all(
    figures.map(({ left, right }) => {
      const x = Math.max(0, left - margin);
      const w = Math.min(width, right + margin + 1) - x;
      return sharp(data, raw).extract({ left: x, top: 0, width: w, height }).png().toBuffer();
    }),
  );
}
