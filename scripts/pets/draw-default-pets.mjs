// Draws the built-in starter pets as PNGs (normal, eyes closed, mouth open)
// so the pet feature works before any AI artwork is added. Each pet is the
// same round, sticker-style creature with its own colors and headwear.
// Run with: node scripts/pets/draw-default-pets.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const petsDir = fileURLToPath(new URL('../../pets/', import.meta.url));
const INK = '#3B2A4A';

const PETS = {
  sprout: {
    body: ['#A6E8BD', '#6CC894'],
    belly: '#E4F8EA',
    cheek: '#FF9DB0',
    // A little seedling growing from the head.
    headwear: `
      <path d="M256 168 C 254 130, 262 104, 266 86" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M264 96 C 300 60, 352 66, 360 92 C 330 122, 286 122, 264 96 Z" fill="#7BD48F" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M262 104 C 232 70, 186 74, 176 98 C 204 126, 244 126, 262 104 Z" fill="#9BE3A8" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>`,
  },
  mochi: {
    body: ['#FFF1F5', '#FFD0DE'],
    belly: '#FFFFFF',
    cheek: '#FF8FB0',
    // Two long bunny ears.
    headwear: `
      <g transform="rotate(-14 196 150)">
        <rect x="166" y="36" width="60" height="150" rx="30" fill="#FFE3EC" stroke="${INK}" stroke-width="8"/>
        <rect x="182" y="58" width="28" height="104" rx="14" fill="#FFB3C7"/>
      </g>
      <g transform="rotate(14 316 150)">
        <rect x="286" y="36" width="60" height="150" rx="30" fill="#FFE3EC" stroke="${INK}" stroke-width="8"/>
        <rect x="302" y="58" width="28" height="104" rx="14" fill="#FFB3C7"/>
      </g>`,
  },
  nova: {
    body: ['#D4C9FF', '#9D86F2'],
    belly: '#EFEAFF',
    cheek: '#FF9DCB',
    // A star on an antenna, plus floating sparkles.
    headwear: `
      <path d="M256 164 C 256 132, 250 110, 244 92" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M244 40 L256 70 L288 72 L263 92 L272 124 L244 106 L216 124 L225 92 L200 72 L232 70 Z" fill="#FFD66B" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M392 150 l8 18 l18 8 l-18 8 l-8 18 l-8 -18 l-18 -8 l18 -8 Z" fill="#FFE8A3"/>
      <path d="M104 128 l6 13 l13 6 l-13 6 l-6 13 l-6 -13 l-13 -6 l13 -6 Z" fill="#FFE8A3"/>`,
  },
};

function svg(pet, { eyes, mouth }) {
  const eye = (cx) =>
    eyes === 'closed'
      ? `<path d="M${cx - 22} 282 Q ${cx} 302 ${cx + 22} 282" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="${cx}" cy="282" rx="21" ry="27" fill="${INK}"/><circle cx="${cx - 7}" cy="272" r="8" fill="#FFFFFF"/><circle cx="${cx + 7}" cy="291" r="3.5" fill="#FFFFFF"/>`;
  const mouthShape =
    mouth === 'open'
      ? `<path d="M232 318 Q 256 318 280 318 Q 278 356 256 358 Q 234 356 232 318 Z" fill="#5A2E48" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
         <ellipse cx="256" cy="345" rx="12" ry="8" fill="#FF8FA6"/>`
      : `<path d="M236 320 Q 246 334 256 322 Q 266 334 276 320" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${pet.body[0]}"/><stop offset="1" stop-color="${pet.body[1]}"/>
    </linearGradient>
  </defs>
  <ellipse cx="256" cy="478" rx="130" ry="16" fill="#000" opacity="0.12"/>
  ${pet.headwear}
  <path d="M256 150 C 372 150, 432 236, 426 326 C 420 420, 348 470, 256 470 C 164 470, 92 420, 86 326 C 80 236, 140 150, 256 150 Z" fill="url(#body)" stroke="${INK}" stroke-width="9"/>
  <ellipse cx="256" cy="392" rx="104" ry="64" fill="${pet.belly}" opacity="0.9"/>
  <ellipse cx="184" cy="208" rx="46" ry="20" fill="#FFFFFF" opacity="0.45" transform="rotate(-25 184 208)"/>
  <path d="M120 400 Q 96 420 112 440" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M392 400 Q 416 420 400 440" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>
  ${eye(204)}${eye(308)}
  <ellipse cx="160" cy="322" rx="26" ry="15" fill="${pet.cheek}" opacity="0.55"/>
  <ellipse cx="352" cy="322" rx="26" ry="15" fill="${pet.cheek}" opacity="0.55"/>
  ${mouthShape}
</svg>`;
}

const STATES = {
  'img-idle.png': { eyes: 'open', mouth: 'closed' },
  'img-blink.png': { eyes: 'closed', mouth: 'closed' },
  'img-talk.png': { eyes: 'open', mouth: 'open' },
};

for (const [id, pet] of Object.entries(PETS)) {
  const dir = join(petsDir, id);
  mkdirSync(dir, { recursive: true });
  for (const [file, state] of Object.entries(STATES)) {
    writeFileSync(join(dir, file), await sharp(Buffer.from(svg(pet, state))).png({ compressionLevel: 9 }).toBuffer());
  }
  console.log(`  ${id}: ${Object.keys(STATES).join(', ')}`);
}
