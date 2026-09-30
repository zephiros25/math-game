// Lines up pet pictures so blinking and talking don't make the pet jump.
//
// AI image tools often shift or rescale the character between "the same
// image, but eyes closed" edits. For each picture we find the pet (its
// non-transparent pixels), scale it to a fixed height and place it on a
// 512 px transparent canvas: horizontally centred on its centre of mass,
// feet on a fixed ground line. Three pictures of the same pet then overlap
// exactly, whatever their original framing.
//
// The centre of mass is used rather than the bounding box because a spike or
// ear cut off at the image edge would pull a bounding box sideways.

import sharp from 'sharp';

const CANVAS = 512;
const PET_HEIGHT = 448; // pet's height on the canvas
const GROUND = 482; // y of the pet's lowest pixel
const ALPHA_THRESHOLD = 20; // pixels fainter than this count as background

export async function alignPetImage(input) {
  const { data, info } = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  let minY = height;
  let maxY = -1;
  let massX = 0;
  let mass = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a < ALPHA_THRESHOLD) continue;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      massX += x * a;
      mass += a;
    }
  }
  if (maxY < 0) throw new Error('the picture is completely transparent');

  const opaqueShare = mass / 255 / (width * height);
  const scale = PET_HEIGHT / (maxY - minY + 1);
  const scaledW = Math.max(1, Math.round(width * scale));
  const scaledH = Math.max(1, Math.round(height * scale));
  const resized = await sharp(data, { raw: { width, height, channels: 4 } }).resize(scaledW, scaledH).png().toBuffer();

  // Place on an oversized canvas first (offsets can be negative), then cut
  // out the final square.
  const pad = Math.max(scaledW, scaledH);
  const left = Math.round(CANVAS / 2 - (massX / mass) * scale) + pad;
  const top = Math.round(GROUND - (maxY + 1) * scale) + pad;
  const big = CANVAS + 2 * pad;
  const out = await sharp({ create: { width: big, height: big, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
  const png = await sharp(out).extract({ left: pad, top: pad, width: CANVAS, height: CANVAS }).png({ compressionLevel: 9 }).toBuffer();

  // A picture that's almost entirely opaque has no transparent background:
  // the "pet" is really a whole rectangle.
  return { png, transparent: opaqueShare < 0.9 };
}
