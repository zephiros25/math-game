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

import { buildThemes } from './build.mjs';
import {
  COLOR_KEYS,
  CONTRAST_PAIRS,
  defaultTheme,
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

// Files the Studio creates get these prefixes; only those are cleaned up
// automatically when a theme stops referencing them.
const MANAGED_PREFIXES = ['bg-', 'particle-', 'sound-'];
const SAFE_FILE = /^[A-Za-z0-9._-]+$/;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
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
    ...(theme.particles?.images ?? []),
    ...Object.values(theme.sounds ?? {}).flatMap((s) => s.files ?? []),
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
  throw new HttpError(400, `Unknown upload kind "${kind}"`);
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

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const method = req.method;

  if (method === 'GET' && parts.length === 0) return sendFile(res, studioHtml);

  // Theme assets and default sounds, for the preview.
  if (method === 'GET' && parts[0] === 'files' && parts.length === 3 && SAFE_FILE.test(parts[2])) {
    return sendFile(res, join(themeDir(parts[1]), parts[2]));
  }
  if (method === 'GET' && parts[0] === 'default-sounds' && parts.length === 2 && SAFE_FILE.test(parts[1])) {
    return sendFile(res, join(soundsDir, parts[1]));
  }

  if (parts[0] !== 'api') throw new HttpError(404, 'Not found');

  if (method === 'GET' && parts[1] === 'meta') {
    return send(res, 200, { colorKeys: COLOR_KEYS, particleStyles: PARTICLE_STYLES, soundSlots: SOUND_SLOTS, contrastPairs: CONTRAST_PAIRS, defaultTheme: defaultTheme() });
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
  const { themes, errors } = buildThemes({ quiet: true });
  console.log(`Theme Studio: http://localhost:${PORT}  (${themes.length} themes${errors.length ? `, ${errors.length} error(s)` : ''})`);
  console.log('Keep `npx expo start` running next to it: saved themes appear on your phone right away.');
});
