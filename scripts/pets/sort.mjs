// Works out which of a pet's three pictures is the normal pose, the blink and
// the talk, whatever order they were added in. Works on aligned pictures (see
// align.mjs), so the face is roughly in the same place in all three.
//
//   1. Blink: the picture with the fewest dark pixels in the face. Open eyes
//      have big dark pupils; closed eyes are thin lines.
//   2. Eyes: where the other two pictures are dark but the blink is not.
//   3. Talk: of the other two, the one whose small area just below the eyes
//      is filled most with dark or deep-red pixels (an open mouth and tongue).
//      A closed mouth is only a thin line there.
//
// Comparing whole pictures doesn't work: AI tools redraw fur and spikes
// slightly differently each time, which drowns out the eyes and mouth.

import sharp from 'sharp';

const SIZE = 128;
const lumOf = (px, p) => 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
const solid = (px, p) => px[p + 3] > 200;

function darkInFace(px) {
  let n = 0;
  for (let y = Math.floor(SIZE * 0.22); y < SIZE * 0.72; y++) {
    for (let x = Math.floor(SIZE * 0.2); x < SIZE * 0.8; x++) {
      const p = (y * SIZE + x) * 4;
      if (solid(px, p) && lumOf(px, p) < 70) n++;
    }
  }
  return n;
}

// `inputs`: three image buffers (or paths). Returns the index of each role,
// plus `unsure` when the call was close and a human should double-check.
export async function classifyPetPictures(inputs) {
  const pics = await Promise.all(inputs.map((input) => sharp(input).resize(SIZE, SIZE).ensureAlpha().raw().toBuffer()));

  const dark = pics.map(darkInFace);
  const order = [0, 1, 2].sort((i, j) => dark[i] - dark[j]);
  const blink = order[0];
  const [a, b] = order.slice(1);

  let sumX = 0;
  let sumY = 0;
  let n = 0;
  for (let y = Math.floor(SIZE * 0.15); y < SIZE * 0.75; y++) {
    for (let x = Math.floor(SIZE * 0.15); x < SIZE * 0.85; x++) {
      const p = (y * SIZE + x) * 4;
      const openDark = solid(pics[a], p) && solid(pics[b], p) && lumOf(pics[a], p) < 70 && lumOf(pics[b], p) < 70;
      if (openDark && lumOf(pics[blink], p) > 110) {
        sumX += x;
        sumY += y;
        n++;
      }
    }
  }
  const eyeX = n ? sumX / n : SIZE / 2;
  const eyeY = n ? sumY / n : SIZE * 0.45;

  const mouthFill = (px) => {
    let m = 0;
    for (let y = Math.floor(eyeY + SIZE * 0.05); y < eyeY + SIZE * 0.2; y++) {
      for (let x = Math.floor(eyeX - SIZE * 0.08); x < eyeX + SIZE * 0.08; x++) {
        const p = (y * SIZE + x) * 4;
        if (!solid(px, p)) continue;
        const lum = lumOf(px, p);
        const red = px[p] - px[p + 1] > 45 && px[p] - px[p + 2] > 25;
        if (lum < 90 || (red && lum < 175)) m++;
      }
    }
    return m;
  };
  const ma = mouthFill(pics[a]);
  const mb = mouthFill(pics[b]);
  const talk = ma >= mb ? a : b;
  const idle = talk === a ? b : a;

  const darkMargin = dark[order[1]] / Math.max(1, dark[blink]);
  const mouthMargin = Math.max(ma, mb) / Math.max(1, Math.min(ma, mb));
  return { idle, blink, talk, unsure: darkMargin < 1.1 || mouthMargin < 1.2 };
}
