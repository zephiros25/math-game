// The pet format, shared by the pet build script and the Theme Studio.
//
// A pet is a folder pets/<id>/ containing pet.json plus its pictures and
// (optionally) voice recordings, referenced from pet.json by file name.
// Three pictures animate a pet: "idle" (required), "blink" (eyes closed)
// and "talk" (mouth open). They must share the same canvas so they line up.

import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const PETS_DIR = new URL('../../pets/', import.meta.url);

export const ID_PATTERN = /^[a-z][a-z0-9-]{1,30}$/;
export const IMAGE_EXTENSIONS = ['.png', '.webp'];
export const SOUND_EXTENSIONS = ['.wav', '.mp3', '.m4a', '.aac'];

export const IMAGE_SLOTS = {
  idle: 'Normal pose (required)',
  blink: 'Eyes closed (for blinking)',
  talk: 'Mouth open (for talking)',
};

// What a pet says, by moment. Pets may override any of these in "lines";
// the defaults live in the app (src/pet-lines.ts).
export const LINE_SLOTS = {
  hello: 'Home screen greeting, and when tapped',
  start: 'Start of a run',
  correct: 'Now and then after a correct answer',
  streak: 'Streak of 3, 5, 10... ({streak} = the number)',
  lightning: 'After a lightning-fast answer',
  newBest: 'Reaching a new best level',
  wrong: 'After a mistake (keep it kind!)',
  finish: 'End of a run',
};

export function defaultPet(name = 'New pet') {
  return {
    name,
    tagline: '',
    order: 100,
    price: 5,
    premium: false,
    images: { idle: null, blink: null, talk: null },
    size: 1,
    voice: { pitch: 1, files: [], volume: 0.8 },
    lines: {},
  };
}

// Returns { errors, warnings }. Errors keep the pet out of the app.
export function validatePet(id, pet, dir) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(`${id}: ${m}`);
  const warn = (m) => warnings.push(`${id}: ${m}`);

  if (!ID_PATTERN.test(id)) err(`folder name must be lowercase letters, digits or dashes (got "${id}")`);
  if (typeof pet !== 'object' || pet === null) {
    err('pet.json is not an object');
    return { errors, warnings };
  }
  if (typeof pet.name !== 'string' || !pet.name.trim()) err('"name" is required');
  if (typeof pet.tagline !== 'string') err('"tagline" must be text');
  if (!Number.isFinite(pet.order)) err('"order" must be a number');
  if (!Number.isInteger(pet.price) || pet.price < 0) err('"price" must be a whole number of gems (0 = free)');
  if (typeof pet.premium !== 'boolean') err('"premium" must be true or false');

  const fileCheck = (file, exts, what) => {
    if (typeof file !== 'string' || !file) return err(`${what} must be a file name`);
    if (file.includes('/') || file.includes('\\')) return err(`${what} "${file}" must be a file inside the pet folder`);
    const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
    if (!exts.includes(ext)) return err(`${what} "${file}" must be one of ${exts.join(', ')}`);
    const path = join(dir, file);
    if (!existsSync(path)) return err(`${what} "${file}" is missing from the pet folder`);
    return statSync(path).size;
  };

  const images = pet.images ?? {};
  if (!images.idle) err('the normal pose picture (images.idle) is required');
  for (const slot of Object.keys(IMAGE_SLOTS)) {
    if (images[slot]) fileCheck(images[slot], IMAGE_EXTENSIONS, `images.${slot}`);
  }
  if (images.idle && !images.blink) warn('no "eyes closed" picture: the pet will not blink');
  if (images.idle && !images.talk) warn('no "mouth open" picture: the pet talks without moving its mouth');

  if (!(pet.size >= 0.6 && pet.size <= 1.5)) err('"size" must be between 0.6 and 1.5');

  const voice = pet.voice ?? {};
  if (!(voice.pitch >= 0.6 && voice.pitch <= 1.8)) err('voice.pitch must be between 0.6 and 1.8');
  if (!(voice.volume >= 0 && voice.volume <= 1)) err('voice.volume must be between 0 and 1');
  if (!Array.isArray(voice.files)) err('voice.files must be a list');
  else voice.files.forEach((f, i) => fileCheck(f, SOUND_EXTENSIONS, `voice.files[${i}]`));

  for (const [slot, lines] of Object.entries(pet.lines ?? {})) {
    if (!(slot in LINE_SLOTS)) err(`lines.${slot} is not a known moment (use ${Object.keys(LINE_SLOTS).join(', ')})`);
    else if (!Array.isArray(lines) || lines.some((l) => typeof l !== 'string')) err(`lines.${slot} must be a list of sentences`);
    else if (lines.some((l) => l.length > 60)) warn(`lines.${slot}: keep sentences under 60 characters so they fit the speech bubble`);
  }

  return { errors, warnings };
}
