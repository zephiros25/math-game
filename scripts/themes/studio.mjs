// Theme Studio: a small local web app for creating and editing themes.
// Run with: npm run studio   then open http://localhost:4455
//
// It reads and writes the themes/ folder, shrinks imported artwork, and
// regenerates the app's theme registry on every save, so a running
// `npx expo start` picks the change up immediately on your phone.
// Only listens on localhost.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

// sharp's cache keeps image files open, and Windows can't delete or rename
// open files (removing pictures and deleting pets would fail).
sharp.cache(false);

import { alignPetImage } from '../pets/align.mjs';
import { splitSheet } from '../pets/sheet.mjs';
import { classifyPetPictures } from '../pets/sort.mjs';
import { buildPets } from '../pets/build.mjs';
import {
  defaultPet,
  ID_PATTERN as PET_ID_PATTERN,
  IMAGE_SLOTS as PET_IMAGE_SLOTS,
  LINE_SLOTS as PET_LINE_SLOTS,
  PETS_DIR,
  SOUND_EXTENSIONS as PET_SOUND_EXTENSIONS,
  validatePet,
} from '../pets/schema.mjs';
import { buildThemes } from './build.mjs';
import {
  COLOR_KEYS,
  CONTRAST_PAIRS,
  CURATED_FONTS,
  defaultTheme,
  FONT_EXTENSIONS,
  FONT_WEIGHTS,
  ID_PATTERN,
  IMAGE_EXTENSIONS,
  PARTICLE_STYLES,
  SOUND_EXTENSIONS,
  SOUND_SLOTS,
  THEMES_DIR,
  validateTheme,
} from './schema.mjs';

const PORT = Number(process.env.PORT) || 4455;
const themesDir = fileURLToPath(THEMES_DIR);
const soundsDir = fileURLToPath(new URL('../../assets/sounds/', import.meta.url));
const studioHtml = fileURLToPath(new URL('./studio.html', import.meta.url));
const petsHtml = fileURLToPath(new URL('./pets.html', import.meta.url));
const studioCss = fileURLToPath(new URL('./studio.css', import.meta.url));
const petsDir = fileURLToPath(PETS_DIR);
const defaultLinesFile = fileURLToPath(new URL('../../src/pet-lines.json', import.meta.url));
const petIdeasFile = fileURLToPath(new URL('../../docs/pet-ideas.json', import.meta.url));

// Files the Studio creates get these prefixes; only those are cleaned up
// automatically when a theme stops referencing them.
const MANAGED_PREFIXES = ['bg-', 'particle-', 'sound-', 'font-', 'key-', 'icon-'];
const SAFE_FILE = /^[A-Za-z0-9._-]+$/;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const themeDir = (id) => {
  if (!ID_PATTERN.test(id)) throw new HttpError(400, `Invalid theme id "${id}"`);
  return join(themesDir, id);
};

function readTheme(id) {
  const dir = themeDir(id);
  const file = join(dir, 'theme.json');
  if (!existsSync(file)) throw new HttpError(404, `No theme "${id}"`);
  let json = null;
  let parseError = null;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    parseError = e.message;
  }
  const files = readdirSync(dir).filter((f) => f !== 'theme.json');
  const check = json ? validateTheme(id, json, dir) : { errors: [`theme.json is not valid JSON: ${parseError}`], warnings: [] };
  return { id, json, files, ...check };
}

function listThemes() {
  return readdirSync(themesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && existsSync(join(themesDir, d.name, 'theme.json')))
    .map((d) => readTheme(d.name))
    .sort((a, b) => (a.json?.order ?? 999) - (b.json?.order ?? 999));
}

function referencedFiles(theme) {
  return new Set([
    theme.background?.image,
    theme.keys?.image,
    theme.icon,
    ...(theme.particles?.images ?? []),
    ...Object.values(theme.sounds ?? {}).flatMap((s) => s.files ?? []),
    ...Object.values(theme.font?.files ?? {}),
  ]);
}

function saveTheme(id, json) {
  const dir = themeDir(id);
  if (!existsSync(dir)) throw new HttpError(404, `No theme "${id}"`);
  writeFileSync(join(dir, 'theme.json'), JSON.stringify(json, null, 2) + '\n');
  // Remove Studio-imported files the theme no longer uses.
  const used = referencedFiles(json);
  for (const f of readdirSync(dir)) {
    if (MANAGED_PREFIXES.some((p) => f.startsWith(p)) && !used.has(f)) rmSync(join(dir, f));
  }
  return rebuild(id);
}

function rebuild(id) {
  const build = buildThemes({ quiet: true });
  const theme = readTheme(id);
  return { ...theme, otherErrors: build.errors.filter((e) => !e.startsWith(`${id}:`)) };
}

function uniqueName(dir, base, ext) {
  let name = `${base}${ext}`;
  for (let i = 2; existsSync(join(dir, name)); i++) name = `${base}-${i}${ext}`;
  return name;
}

const slug = (name) =>
  name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30) || 'file';

// Imported images are resized and re-encoded: backgrounds become phone-sized
// JPEGs, particle sprites become small PNGs (keeping transparency).
async function importFile(id, kind, originalName, data) {
  const dir = themeDir(id);
  const ext = extname(originalName).toLowerCase();
  if (kind === 'icon') {
    if (!IMAGE_EXTENSIONS.includes(ext)) throw new HttpError(400, `Images must be ${IMAGE_EXTENSIONS.join(', ')}`);
    // Shop tiles are small squares: crop to the centre and keep 256 px.
    const image = sharp(data).rotate().resize({ width: 256, height: 256, fit: 'cover', position: 'attention' });
    const { hasAlpha } = await sharp(data).metadata();
    const out = hasAlpha ? await image.png({ compressionLevel: 9 }).toBuffer() : await image.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    const name = uniqueName(dir, `icon-${slug(originalName)}`, hasAlpha ? '.png' : '.jpg');
    writeFileSync(join(dir, name), out);
    return name;
  }
  if (kind === 'key') {
    if (!IMAGE_EXTENSIONS.includes(ext)) throw new HttpError(400, `Images must be ${IMAGE_EXTENSIONS.join(', ')}`);
    // Keys are small: 512 px is plenty. Keep PNG only when the image has transparency.
    const image = sharp(data).rotate().resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true });
    const { hasAlpha } = await sharp(data).metadata();
    const out = hasAlpha ? await image.png({ compressionLevel: 9 }).toBuffer() : await image.jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    const name = uniqueName(dir, `key-${slug(originalName)}`, hasAlpha ? '.png' : '.jpg');
    writeFileSync(join(dir, name), out);
    return name;
  }
  if (kind === 'background' || kind === 'particle') {
    if (!IMAGE_EXTENSIONS.includes(ext)) throw new HttpError(400, `Images must be ${IMAGE_EXTENSIONS.join(', ')}`);
    const image = sharp(data).rotate();
    if (kind === 'background') {
      const out = await image.resize({ width: 1290, height: 2796, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
      const name = uniqueName(dir, `bg-${slug(originalName)}`, '.jpg');
      writeFileSync(join(dir, name), out);
      return name;
    }
    const out = await image.resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
    const name = uniqueName(dir, `particle-${slug(originalName)}`, '.png');
    writeFileSync(join(dir, name), out);
    return name;
  }
  if (kind === 'sound') {
    if (!SOUND_EXTENSIONS.includes(ext)) {
      throw new HttpError(400, `Sounds must be ${SOUND_EXTENSIONS.join(', ')} (iPhones can't play ${ext || 'that format'})`);
    }
    const name = uniqueName(dir, `sound-${slug(originalName)}`, ext);
    writeFileSync(join(dir, name), data);
    return name;
  }
  if (kind === 'font') {
    if (!FONT_EXTENSIONS.includes(ext)) throw new HttpError(400, `Fonts must be ${FONT_EXTENSIONS.join(' or ')} files`);
    const name = uniqueName(dir, `font-${slug(originalName)}`, ext);
    writeFileSync(join(dir, name), data);
    return name;
  }
  throw new HttpError(400, `Unknown upload kind "${kind}"`);
}

// Downloads a Google Fonts family (as TTF, which phones can use) into the
// theme folder. Returns { name, files } ready to put in theme.json.
async function importGoogleFont(id, family) {
  const dir = themeDir(id);
  family = String(family ?? '').trim();
  if (!/^[A-Za-z0-9 ]{2,40}$/.test(family)) throw new HttpError(400, 'Type a Google Fonts family name, e.g. "Baloo 2"');
  const weights = Object.values(FONT_WEIGHTS).join(';');
  const query = encodeURIComponent(family).replace(/%20/g, '+');
  let res = await fetch(`https://fonts.googleapis.com/css2?family=${query}:wght@${weights}`);
  // Families with a single weight reject a weight list; ask for the default one.
  if (!res.ok) res = await fetch(`https://fonts.googleapis.com/css2?family=${query}`);
  if (!res.ok) throw new HttpError(404, `Google Fonts has no family called "${family}" (check the spelling on fonts.google.com)`);
  const css = await res.text();
  const urls = new Map();
  for (const block of css.split('@font-face').slice(1)) {
    const weight = Number(block.match(/font-weight:\s*(\d+)/)?.[1] ?? 400);
    const url = block.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
    // Google may split a weight into several unicode subsets; the first one is Latin.
    if (url && !urls.has(weight) && !/font-style:\s*italic/.test(block)) urls.set(weight, url);
  }
  if (urls.size === 0) throw new HttpError(502, 'Google Fonts did not return any TTF files for that family');
  const files = {};
  for (const [key, weight] of Object.entries(FONT_WEIGHTS)) {
    const url = urls.get(weight);
    if (!url) continue;
    const data = Buffer.from(await (await fetch(url)).arrayBuffer());
    const name = uniqueName(dir, `font-${slug(family)}-${key}`, '.ttf');
    writeFileSync(join(dir, name), data);
    files[key] = name;
  }
  if (Object.keys(files).length === 0) {
    // Only unusual weights (e.g. 300 or 800) exist: take the one closest to regular.
    const [weight, url] = [...urls.entries()].sort((a, b) => Math.abs(a[0] - 400) - Math.abs(b[0] - 400))[0];
    const name = uniqueName(dir, `font-${slug(family)}-${weight}`, '.ttf');
    writeFileSync(join(dir, name), Buffer.from(await (await fetch(url)).arrayBuffer()));
    files.regular = name;
  }
  return { name: family, files };
}

function createTheme(id, from) {
  const dir = themeDir(id);
  if (existsSync(dir)) throw new HttpError(409, `A theme called "${id}" already exists`);
  if (from) {
    cpSync(themeDir(from), dir, { recursive: true });
    const json = JSON.parse(readFileSync(join(dir, 'theme.json'), 'utf8'));
    json.name = `${json.name} copy`;
    json.order += 1;
    writeFileSync(join(dir, 'theme.json'), JSON.stringify(json, null, 2) + '\n');
  } else {
    mkdirSync(dir);
    writeFileSync(join(dir, 'theme.json'), JSON.stringify(defaultTheme(), null, 2) + '\n');
  }
  return rebuild(id);
}

// Deleted themes are moved aside, not destroyed.
function deleteTheme(id) {
  const dir = themeDir(id);
  const trash = join(themesDir, '.deleted');
  mkdirSync(trash, { recursive: true });
  renameSync(dir, join(trash, `${id}-${Date.now()}`));
  buildThemes({ quiet: true });
}

function readBody(req, limit = 25e6) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, 'File too large (max 25 MB)'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function sendFile(res, path) {
  if (!existsSync(path)) throw new HttpError(404, 'Not found');
  send(res, 200, readFileSync(path), TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream');
}

// ---------------------------------------------------------------- pets
// Pets work like themes: a folder per pet with pet.json and its files.

const PET_MANAGED_PREFIXES = ['img-', 'voice-'];

// Pet pictures are stored as WebP: about 8x smaller than PNG at the same
// visible quality, with transparency, and supported by the app on iOS and
// Android. (104 pets: 82 MB as PNG, 11 MB as WebP.)
const toWebp = (png) => sharp(png).webp({ quality: 85, alphaQuality: 90, effort: 6 }).toBuffer();

const petDir = (id) => {
  if (!PET_ID_PATTERN.test(id)) throw new HttpError(400, `Invalid pet id "${id}"`);
  return join(petsDir, id);
};

function readPet(id) {
  const dir = petDir(id);
  const file = join(dir, 'pet.json');
  if (!existsSync(file)) throw new HttpError(404, `No pet "${id}"`);
  let json = null;
  let parseError = null;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    parseError = e.message;
  }
  const files = readdirSync(dir).filter((f) => f !== 'pet.json');
  const check = json ? validatePet(id, json, dir) : { errors: [`pet.json is not valid JSON: ${parseError}`], warnings: [] };
  return { id, json, files, ...check };
}

function listPets() {
  if (!existsSync(petsDir)) return [];
  return readdirSync(petsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && existsSync(join(petsDir, d.name, 'pet.json')))
    .map((d) => readPet(d.name))
    .sort((a, b) => (a.json?.order ?? 999) - (b.json?.order ?? 999));
}

function rebuildPet(id) {
  const build = buildPets({ quiet: true });
  return { ...readPet(id), otherErrors: build.errors.filter((e) => !e.startsWith(`${id}:`)) };
}

function savePet(id, json) {
  const dir = petDir(id);
  if (!existsSync(dir)) throw new HttpError(404, `No pet "${id}"`);
  writeFileSync(join(dir, 'pet.json'), JSON.stringify(json, null, 2) + '\n');
  // Remove Studio-imported files the pet no longer uses.
  const used = new Set([...Object.values(json.images ?? {}), ...(json.voice?.files ?? [])]);
  for (const f of readdirSync(dir)) {
    if (PET_MANAGED_PREFIXES.some((p) => f.startsWith(p)) && !used.has(f)) rmSync(join(dir, f));
  }
  return rebuildPet(id);
}

function createPet(id, from) {
  const dir = petDir(id);
  if (existsSync(dir)) throw new HttpError(409, `A pet called "${id}" already exists`);
  mkdirSync(petsDir, { recursive: true });
  if (from) {
    cpSync(petDir(from), dir, { recursive: true });
    const json = JSON.parse(readFileSync(join(dir, 'pet.json'), 'utf8'));
    json.name = `${json.name} copy`;
    json.order += 1;
    writeFileSync(join(dir, 'pet.json'), JSON.stringify(json, null, 2) + '\n');
  } else {
    mkdirSync(dir);
    writeFileSync(join(dir, 'pet.json'), JSON.stringify(defaultPet(), null, 2) + '\n');
  }
  return rebuildPet(id);
}

function deletePet(id) {
  const dir = petDir(id);
  const trash = join(petsDir, '.deleted');
  mkdirSync(trash, { recursive: true });
  renameSync(dir, join(trash, `${id}-${Date.now()}`));
  buildPets({ quiet: true });
}

// Pet pictures are aligned onto the same 512 px transparent square (see
// scripts/pets/align.mjs), so the normal, blink and talk pictures line up.
async function importPetFile(id, kind, slot, originalName, data) {
  const dir = petDir(id);
  const ext = extname(originalName).toLowerCase();
  if (kind === 'image') {
    if (!(slot in PET_IMAGE_SLOTS)) throw new HttpError(400, `Unknown picture "${slot}"`);
    if (!['.png', '.webp', '.jpg', '.jpeg'].includes(ext)) {
      throw new HttpError(400, 'Pictures must be PNG (best, with a transparent background), WebP or JPG');
    }
    const meta = await sharp(data).metadata();
    // Centre and scale the pet the same way in every picture, so the normal,
    // blink and talk pictures line up even when the AI shifted them.
    const { png, transparent, cutOff } = await alignPetImage(data);
    const name = uniqueName(dir, `img-${slot}`, '.webp');
    writeFileSync(join(dir, name), await toWebp(png));
    return { file: name, width: meta.width, height: meta.height, transparent, cutOff };
  }
  if (kind === 'sheet') {
    // One picture with all three versions side by side: split, align and
    // save them in sheet order (normal, blink, talk). The client then runs
    // the automatic sorting, which double-checks the order.
    let parts;
    try {
      parts = await splitSheet(data);
    } catch (e) {
      throw new HttpError(400, `Could not split this picture: ${e.message}`);
    }
    const files = [];
    const cutOff = [];
    for (const [i, part] of parts.entries()) {
      const aligned = await alignPetImage(part);
      const name = uniqueName(dir, `img-${['idle', 'blink', 'talk'][i]}`, '.webp');
      writeFileSync(join(dir, name), await toWebp(aligned.png));
      files.push(name);
      cutOff.push(...aligned.cutOff.filter((edge) => edge === 'top'));
    }
    const meta = await sharp(data).metadata();
    return { files, width: meta.width, height: meta.height, transparent: Boolean(meta.hasAlpha), cutOff };
  }
  if (kind === 'voice') {
    if (!PET_SOUND_EXTENSIONS.includes(ext)) throw new HttpError(400, `Sounds must be ${PET_SOUND_EXTENSIONS.join(', ')}`);
    const name = uniqueName(dir, `voice-${slug(originalName)}`, ext);
    writeFileSync(join(dir, name), data);
    return { file: name };
  }
  throw new HttpError(400, `Unknown upload kind "${kind}"`);
}

// Works out which of a pet's three pictures is the normal pose, the blink and
// the talk, whatever order they were added in (see scripts/pets/sort.mjs).
async function sortPetPictures(id) {
  const dir = petDir(id);
  const json = JSON.parse(readFileSync(join(dir, 'pet.json'), 'utf8'));
  const files = ['idle', 'blink', 'talk'].map((slot) => json.images?.[slot]);
  if (files.some((file) => !file)) throw new HttpError(400, 'Add all three pictures first');
  // Read the files into memory first, so nothing keeps them open.
  const buffers = files.map((file) => readFileSync(join(dir, file)));
  const { idle, blink, talk, unsure } = await classifyPetPictures(buffers);

  // Rewrite the files under names matching their slots.
  files.forEach((file) => rmSync(join(dir, file)));
  const images = {};
  for (const [slot, k] of [['idle', idle], ['blink', blink], ['talk', talk]]) {
    const name = uniqueName(dir, `img-${slot}`, extname(files[k]));
    writeFileSync(join(dir, name), buffers[k]);
    images[slot] = name;
  }
  json.images = images;
  writeFileSync(join(dir, 'pet.json'), JSON.stringify(json, null, 2) + '\n');
  const moved = ['idle', 'blink', 'talk'].filter((slot, k) => [idle, blink, talk][k] !== k);
  return { ...rebuildPet(id), images, moved, unsure };
}

async function handlePets(req, res, parts, url) {
  const method = req.method;
  if (method === 'GET' && parts.length === 2) return send(res, 200, listPets());
  if (method === 'POST' && parts.length === 2) {
    const { id, from } = JSON.parse((await readBody(req)).toString());
    return send(res, 200, createPet(id, from));
  }
  const id = parts[2];
  if (method === 'GET' && parts.length === 3) return send(res, 200, readPet(id));
  if (method === 'PUT' && parts.length === 3) return send(res, 200, savePet(id, JSON.parse((await readBody(req)).toString())));
  if (method === 'DELETE' && parts.length === 3) {
    deletePet(id);
    return send(res, 200, { ok: true });
  }
  if (method === 'POST' && parts[3] === 'sort') return send(res, 200, await sortPetPictures(id));
  if (method === 'POST' && parts[3] === 'upload') {
    const result = await importPetFile(
      id,
      url.searchParams.get('kind'),
      url.searchParams.get('slot'),
      url.searchParams.get('name') ?? 'file',
      await readBody(req),
    );
    return send(res, 200, result);
  }
  throw new HttpError(404, 'Not found');
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const method = req.method;

  if (method === 'GET' && parts.length === 0) return sendFile(res, studioHtml);
  if (method === 'GET' && parts.length === 1 && parts[0] === 'pets') return sendFile(res, petsHtml);
  if (method === 'GET' && parts.length === 1 && parts[0] === 'studio.css') return sendFile(res, studioCss);
  if (method === 'GET' && parts[0] === 'pet-files' && parts.length === 3 && SAFE_FILE.test(parts[2])) {
    return sendFile(res, join(petDir(parts[1]), parts[2]));
  }
  if (parts[0] === 'api' && parts[1] === 'pet-meta' && method === 'GET') {
    return send(res, 200, {
      imageSlots: PET_IMAGE_SLOTS,
      lineSlots: PET_LINE_SLOTS,
      defaultLines: JSON.parse(readFileSync(defaultLinesFile, 'utf8')),
      defaultPet: defaultPet(),
    });
  }
  if (parts[0] === 'api' && parts[1] === 'pet-ideas' && method === 'GET') {
    return send(res, 200, existsSync(petIdeasFile) ? JSON.parse(readFileSync(petIdeasFile, 'utf8')) : []);
  }
  if (parts[0] === 'api' && parts[1] === 'pets') return handlePets(req, res, parts, url);

  // Theme assets and default sounds, for the preview.
  if (method === 'GET' && parts[0] === 'files' && parts.length === 3 && SAFE_FILE.test(parts[2])) {
    return sendFile(res, join(themeDir(parts[1]), parts[2]));
  }
  if (method === 'GET' && parts[0] === 'default-sounds' && parts.length === 2 && SAFE_FILE.test(parts[1])) {
    return sendFile(res, join(soundsDir, parts[1]));
  }

  if (parts[0] !== 'api') throw new HttpError(404, 'Not found');

  if (method === 'GET' && parts[1] === 'meta') {
    return send(res, 200, { colorKeys: COLOR_KEYS, curatedFonts: CURATED_FONTS, fontWeights: FONT_WEIGHTS, particleStyles: PARTICLE_STYLES, soundSlots: SOUND_SLOTS, contrastPairs: CONTRAST_PAIRS, defaultTheme: defaultTheme() });
  }
  if (parts[1] !== 'themes') throw new HttpError(404, 'Not found');

  if (method === 'GET' && parts.length === 2) return send(res, 200, listThemes());
  if (method === 'POST' && parts.length === 2) {
    const { id, from } = JSON.parse((await readBody(req)).toString());
    return send(res, 200, createTheme(id, from));
  }

  const id = parts[2];
  if (method === 'GET' && parts.length === 3) return send(res, 200, readTheme(id));
  if (method === 'PUT' && parts.length === 3) {
    const json = JSON.parse((await readBody(req)).toString());
    return send(res, 200, saveTheme(id, json));
  }
  if (method === 'DELETE' && parts.length === 3) {
    deleteTheme(id);
    return send(res, 200, { ok: true });
  }
  if (method === 'POST' && parts[3] === 'google-font') {
    const { family } = JSON.parse((await readBody(req)).toString());
    return send(res, 200, await importGoogleFont(id, family));
  }
  if (method === 'POST' && parts[3] === 'upload') {
    const kind = url.searchParams.get('kind');
    const name = url.searchParams.get('name') ?? 'file';
    const file = await importFile(id, kind, name, await readBody(req));
    return send(res, 200, { file });
  }
  throw new HttpError(404, 'Not found');
}

createServer((req, res) => {
  handle(req, res).catch((e) => {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    send(res, status, { error: e.message });
  });
}).listen(PORT, '127.0.0.1', () => {
  buildPets({ quiet: true });
  const { themes, errors } = buildThemes({ quiet: true });
  console.log(`Theme Studio: http://localhost:${PORT}  (${themes.length} themes${errors.length ? `, ${errors.length} error(s)` : ''})`);
  console.log('Keep `npx expo start` running next to it: saved themes appear on your phone right away.');
});
