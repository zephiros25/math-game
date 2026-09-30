// Works out which of a pet's three pictures is the normal pose, the blink and
// the talk, whatever order they were added in. Works on aligned pictures (see
// align.mjs), so the face is roughly in the same place in all three.
//
//   1. Blink: the picture with the least "open eye" evidence: dark pupils
//      plus the small white highlights in them. Closed eyes are thin lines
//      without highlights (the highlights matter for pandas, whose black eye
//      patches stay dark with the eyes closed).
//   2. Eyes: where the other two pictures are dark but the blink is not.
//   3. Talk vs normal: just below the eyes, look only where those two
//      pictures differ. The blink has a closed mouth like the normal pose,
//      so the picture that looks least like the blink there is talking.
//      When that's a close call, fall back to darkness: an open mouth is a
//      dark hole compared to the face around a closed one.
//
// Comparing whole pictures doesn't work: AI tools redraw fur and details
// slightly differently each time. Tested on the first 104 pets in every
// order: 99% right, and every mistake was flagged as unsure.

import sharp from 'sharp';

const SIZE = 128;
const lumOf = (px, p) => 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
const solid = (px, p) => px[p + 3] > 200;
const colorDiff = (a, b, p) => Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]);

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

// Near-white pixels right next to very dark ones: the shine in open pupils.
function eyeHighlights(px) {
  let n = 0;
  for (let y = Math.floor(SIZE * 0.2); y < SIZE * 0.7; y++) {
    for (let x = Math.floor(SIZE * 0.2); x < SIZE * 0.8; x++) {
      const p = (y * SIZE + x) * 4;
      if (!solid(px, p)) continue;
      const [r, g, b] = [px[p], px[p + 1], px[p + 2]];
      if (Math.min(r, g, b) < 225 || Math.max(r, g, b) - Math.min(r, g, b) > 30) continue;
      let darkNear = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (lumOf(px, ((y + dy) * SIZE + (x + dx)) * 4) < 60) darkNear++;
        }
      }
      if (darkNear >= 6) n++;
    }
  }
  return n;
}

// `inputs`: three image buffers (or paths). Returns the index of each role,
// plus `unsure` when the call was close and a person should double-check.
export async function classifyPetPictures(inputs) {
  const pics = await Promise.all(inputs.map((input) => sharp(input).resize(SIZE, SIZE).ensureAlpha().raw().toBuffer()));

  // 1. Blink.
  const dark = pics.map(darkInFace);
  const shine = pics.map(eyeHighlights);
  const share = (values, k) => values[k] / Math.max(1, ...values);
  const openEyes = [0, 1, 2].map((k) => share(dark, k) + share(shine, k));
  const order = [0, 1, 2].sort((i, j) => openEyes[i] - openEyes[j]);
  const blink = order[0];
  const [a, b] = order.slice(1);

  // 2. Eyes.
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

  // 3. Talk vs normal, looking only where a and b differ below the eyes.
  let changed = 0;
  let aDarker = 0; // > 0: a is darker there
  let aOffBlink = 0; // how far a is from the blink there
  let bOffBlink = 0;
  for (let y = Math.floor(eyeY + SIZE * 0.04); y < eyeY + SIZE * 0.26; y++) {
    for (let x = Math.floor(eyeX - SIZE * 0.14); x < eyeX + SIZE * 0.14; x++) {
      const p = (y * SIZE + x) * 4;
      if (!solid(pics[a], p) || !solid(pics[b], p) || colorDiff(pics[a], pics[b], p) < 90) continue;
      changed++;
      aDarker += lumOf(pics[b], p) - lumOf(pics[a], p);
      aOffBlink += colorDiff(pics[a], pics[blink], p);
      bOffBlink += colorDiff(pics[b], pics[blink], p);
    }
  }
  const blinkRatio = Math.max(aOffBlink, bOffBlink) / Math.max(1, Math.min(aOffBlink, bOffBlink));
  const talk = blinkRatio >= 1.3 ? (aOffBlink >= bOffBlink ? a : b) : aDarker >= 0 ? a : b;
  const idle = talk === a ? b : a;

  const eyeMargin = openEyes[order[1]] - openEyes[blink];
  const darkness = Math.abs(aDarker) / Math.max(1, changed);
  const unsure = eyeMargin < 0.25 || changed < 15 || (blinkRatio < 1.3 && darkness < 25);
  return { idle, blink, talk, unsure };
}
