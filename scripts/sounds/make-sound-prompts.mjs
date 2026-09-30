// Generates docs/sound-prompts.json (read by the Studio's Sounds page) and
// docs/sound-prompts.txt (the same prompts to read or copy) for an AI sound
// effect generator: the game's default sounds, every theme (existing and from
// docs/theme-ideas.json) and every pet's voice.
// Run with: node scripts/sounds/make-sound-prompts.mjs
//
// Each theme is described by two things: what its keys feel like to touch
// (for taps and buttons) and an instrument (for chimes and jingles). Those
// fill fixed templates per sound, written to keep every sound short, soft and
// easy on the ears: the game plays them hundreds of times.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));

// What each sound is for, and how long it should be.
export const SLOTS = {
  tap: { label: 'Number key tap', when: 'every key press (a clip with several taps gives up to 3 variations)', length: 'generate at the shortest length (0.5 s)' },
  backspace: { label: 'Backspace', when: 'deleting a digit', length: 'generate at the shortest length (0.5 s)' },
  button: { label: 'Menu button', when: 'buttons outside the keypad', length: 'generate at the shortest length (0.5 s)' },
  correct: { label: 'Correct answer', when: 'every right answer; the game plays it higher for each answer in a streak, so it must be ONE note', length: 'generate at 0.5–1 s' },
  wrong: { label: 'Wrong answer', when: 'a wrong answer; must be kind, never a buzzer', length: 'generate at about 1 s' },
  levelUp: { label: 'New best level', when: 'passing your best level during a run', length: 'generate at 1–1.5 s' },
  fanfare: { label: 'Fanfare', when: 'end of a run, unlocking a theme or pet', length: 'generate at 2–3 s' },
  coin: { label: 'Coin', when: 'coins counting up on the results screen (plays many times in a row)', length: 'generate at the shortest length (0.5 s)' },
  gem: { label: 'Gem', when: 'earning a gem', length: 'generate at 0.5–1 s' },
  voice: { label: 'Pet voice', when: 'a pet talking; the Studio cuts the clip into separate syllables', length: 'generate at 2–3 s' },
};

const CLEAN = 'Isolated sound, clean close recording, nothing else playing, no background noise, no echo, soft and pleasant, never harsh or shrill.';

const TEMPLATES = {
  tap: ({ touch }) => `One soft, short, muted tap on ${touch}, like pressing a well-made button. Gentle and satisfying, very short. Only one tap, then silence. ${CLEAN}`,
  backspace: ({ touch }) => `One soft, slightly lower and duller tap on ${touch}, a gentle "tuk" for undoing something. Very short. Only one tap, then silence. ${CLEAN}`,
  button: ({ touch }) => `One soft, round, friendly pop on ${touch}, like a light bubble or cork. Short. Only one pop, then silence. ${CLEAN}`,
  correct: ({ tone }) => `One single clear, warm note on ${tone}, gentle attack and a short natural fade. Only one note, no melody, no chord. ${CLEAN}`,
  wrong: ({ tone }) => `A soft, kind "oops": two gentle low notes stepping down on ${tone}, muted and short. Not a buzzer, not sad, not harsh. ${CLEAN}`,
  levelUp: ({ tone }) => `A short, cheerful rising run of four quick notes on ${tone}, ending on a bright note. About 1 second. ${CLEAN}`,
  fanfare: ({ tone }) => `A short, happy celebration jingle on ${tone} with a light sparkle at the end, about 2 seconds, ending cleanly. Cute, for a children's game, not loud. ${CLEAN}`,
  coin: ({ tone }) => `One tiny, soft, high "ting" of a small coin, with a hint of ${tone}. Very short and delicate. Only one ting, then silence. ${CLEAN}`,
  gem: ({ tone }) => `A small magical sparkle: a soft shimmer with one bright bell-like ping on ${tone}. About 0.7 seconds. ${CLEAN}`,
};

// The game's own sounds, used by every theme that doesn't have its own.
const DEFAULT = { touch: 'a soft, rounded wooden toy block', tone: 'a warm marimba' };

// Existing themes (Sunny uses the default sounds).
const EXISTING = {
  ocean: ['a soft water bubble', 'a soft vibraphone'],
  meadow: ['a soft wooden block in the grass', 'a gentle kalimba'],
  candy: ['a hard sugar candy', 'a toy piano'],
  night: ['soft velvet', 'a dreamy celesta'],
  aurora: ['a small piece of icy glass', 'a shimmering glass harmonica'],
  golden: ['a gold coin on velvet', 'a warm deep bell'],
  blossom: ['a soft flower petal', 'a koto'],
  diamond: ['a cut crystal', 'a crystal glass bell'],
};

// Themes from docs/theme-ideas.json: [touch, tone].
const IDEAS = {
  'forest-glade': ['a soft wooden block', 'a warm wooden marimba'],
  'mushroom-village': ['a soft squishy mushroom cap', 'a gentle kalimba'],
  'sunflower-field': ['a soft straw basket', 'a bright ukulele'],
  'bamboo-grove': ['a hollow bamboo stick', 'soft bamboo wind chimes'],
  rainforest: ['a big leaf with a water drop', 'a wooden tongue drum'],
  'lavender-fields': ['soft linen fabric', 'a gentle harp'],
  'butterfly-garden': ['a soft flower petal', 'a music box'],
  'cactus-desert': ['a terracotta clay pot', 'a soft handpan'],
  'lily-pond': ['a water droplet on a lily pad', 'a soft water-glass bell'],
  'mountain-lake': ['a smooth river pebble', 'a clear glockenspiel'],
  'firefly-night': ['soft wood', 'a dreamy celesta'],
  'tulip-garden': ['a painted ceramic tile', 'a music box'],
  'enchanted-moss': ['soft moss', 'an airy kalimba with a magical shimmer'],
  'savanna-sunset': ['warm sandstone', 'a warm balafon (wooden xylophone)'],
  'rainbow-hills': ['a soft rubber toy', 'a bright toy xylophone'],
  'coral-reef': ['a small underwater bubble', 'a bubbly vibraphone'],
  'deep-sea': ['a deep, soft underwater bubble', 'a dreamy glass harmonica'],
  'tropical-beach': ['a coconut shell', 'a steel drum'],
  'tide-pools': ['frosted sea glass', 'glass wind chimes'],
  'lighthouse-bay': ['weathered wood', 'a small soft ship bell'],
  'pirate-cove': ['an old wooden barrel', 'a jolly glockenspiel'],
  'mermaid-lagoon': ['a pearly seashell', 'a shimmering harp'],
  'waterfall-oasis': ['a wet smooth pebble', 'a watery marimba'],
  submarine: ['a small brass button', 'a soft sonar-like bell ping'],
  'seashell-shore': ['a polished seashell', 'soft wind chimes'],
  'cotton-clouds': ['a soft pillow', 'an airy soft synth bell'],
  'hot-air-balloons': ['a soft balloon', 'a cheerful ukulele'],
  'rocket-launch': ['a soft plastic space button', 'a round, soft retro synth'],
  planets: ['a soft rubber ball', 'a spacey vibraphone'],
  nebula: ['a soft glassy bubble', 'a shimmering synth bell'],
  'moonlit-night': ['soft velvet', 'a lullaby celesta'],
  sunrise: ['warm glass', 'a gentle marimba'],
  observatory: ['a brass dial', 'a bright glockenspiel'],
  'comet-trail': ['an icy crystal', 'a sparkly synth bell'],
  'space-station': ['a soft spaceship panel button', 'a friendly soft synth'],
  'kite-day': ['light kite fabric', 'a bright toy xylophone'],
  'paper-planes': ['folded paper', 'soft pizzicato strings'],
  'autumn-leaves': ['a dry autumn leaf', 'a warm acoustic guitar'],
  'winter-wonderland': ['soft fresh snow', 'a celesta with tiny sleigh bells'],
  'spring-showers': ['a raindrop', 'a soft kalimba'],
  'summer-picnic': ['a light wicker basket', 'a ukulele'],
  thunderstorm: ['a soft raindrop on a window', 'a deep warm vibraphone'],
  'snowy-cabin': ['a wooden log', 'a warm music box'],
  'pumpkin-patch': ['a hollow pumpkin', 'a wooden marimba'],
  'foggy-morning': ['a soft pebble', 'a muted soft piano'],
  'windy-day': ['a soft puff of air', 'airy wind chimes'],
  'frozen-lake': ['clear ice', 'a crystal glass bell'],
  'ice-cream-parlour': ['a soft ice cream scoop', 'a glockenspiel'],
  bakery: ['soft bread dough', 'a warm toy piano'],
  'chocolate-factory': ['a small chocolate square', 'a bubbly marimba'],
  'donut-shop': ['a soft squishy donut', 'a bouncy toy xylophone'],
  'fruit-market': ['a crisp apple', 'a bright marimba'],
  'bubble-tea': ['a tapioca pearl popping', 'a bubbly synth pluck'],
  'gingerbread-house': ['a gingerbread cookie', 'a celesta with tiny sleigh bells'],
  'pancake-breakfast': ['a soft pancake', 'a cheerful toy piano'],
  'lollipop-land': ['a hard candy', 'a music box'],
  'pizza-party': ['a soft cardboard box', 'a cheerful mandolin'],
  'dragons-lair': ['a gold coin on stone', 'a warm deep bell'],
  'wizard-tower': ['an old book cover', 'a magical celesta'],
  'fairy-garden': ['a tiny flower petal', 'tiny fairy bells'],
  'unicorn-clouds': ['a soft cloud puff', 'a sparkly harp'],
  'castle-kingdom': ['carved stone', 'a royal glockenspiel'],
  'crystal-cave': ['a crystal', 'a glass harmonica'],
  'enchanted-library': ['a leather book cover', 'a soft harpsichord'],
  'potion-lab': ['a small glass bottle', 'a bubbly glass marimba'],
  'floating-islands': ['a mossy stone', 'an airy harp'],
  'magic-lamp': ['a brass lamp', 'a shimmering santoor (hammered dulcimer)'],
  'pumpkin-night': ['a hollow pumpkin', 'a spooky-cute celesta'],
  'treasure-island': ['a gold coin', 'a steel drum'],
  'cosy-bedroom': ['a soft plush toy', 'a lullaby music box'],
  'reading-nook': ['a book page', 'a soft piano'],
  'toy-box': ['a wooden toy block', 'a toy xylophone'],
  'tea-party': ['a porcelain teacup', 'a delicate porcelain bell'],
  'rainy-window': ['a raindrop on glass', 'a soft electric piano'],
  'knitting-basket': ['soft wool yarn', 'a gentle kalimba'],
  campfire: ['a small dry twig', 'an acoustic guitar'],
  treehouse: ['a wooden plank', 'a wooden marimba'],
  'city-lights': ['a soft keyboard key', 'a smooth jazz vibraphone'],
  'paris-cafe': ['a small porcelain cup', 'an accordion'],
  'japanese-garden': ['a bamboo water fountain knock', 'a koto'],
  pyramids: ['sandstone', 'an oud'],
  carnival: ['a soft squeaky toy', 'a carousel organ'],
  'train-journey': ['a ticket punch', 'a friendly train bell'],
  'farm-barn': ['a wooden fence', 'a banjo'],
  'snowy-village': ['a painted wooden sign', 'a music box with tiny sleigh bells'],
  'ruby-palace': ['a cut ruby', 'a crystal glass bell'],
  'emerald-city': ['a cut emerald', 'shimmering glass chimes'],
  'sapphire-velvet': ['a sapphire on velvet', 'a deep glass bell'],
  'stained-glass': ['coloured glass', 'a soft tubular bell'],
  origami: ['folded paper', 'soft pizzicato strings'],
  'crayon-doodles': ['a crayon on paper', 'a toy piano'],
  'pottery-studio': ['a clay pot', 'a soft handpan'],
  'football-pitch': ['a soft football', 'a cheerful soft brass'],
  playground: ['a soft rubber ball', 'a toy xylophone'],
  'skate-park': ['a skateboard wheel', 'a funky synth pluck'],
  'race-track': ['a soft gear-shift click', 'a bright synth'],
  'swimming-pool': ['a water drop', 'a bubbly vibraphone'],
  'circus-tent': ['a soft squeaky clown nose', 'a circus organ'],
  'music-stage': ['a piano key', 'a grand piano'],
  'dinosaur-valley': ['a small stone', 'a wooden tongue drum'],
};

// Pet voices. The Studio cuts one babble clip into separate syllables.
const PET_GROUP_VOICE = {
  'Forest & countryside': 'sweet, soft and squeaky',
  'Pets at home': 'sweet, playful and squeaky',
  'Ocean & water': 'bubbly, gurgly and soft',
  'Jungle, savanna & far away': 'playful and bouncy',
  'Snow & ice': 'soft, puffy and cosy',
  Birds: 'chirpy, whistly and tweety',
  'Bugs & small critters': 'tiny, buzzy and very high',
  Dinosaurs: 'low, rumbly and clumsy, like a baby trying to roar',
  'Mythical creatures': 'magical, sparkly and sing-song',
};
const EXTRA_PETS = {
  mochi: { description: 'a soft, bouncy little mochi blob', voice: 'bouncy, squishy and happy' },
  nova: { description: 'a little star creature from far away', voice: 'twinkly, airy and sing-song' },
  sprout: { description: 'a round little seedling sprout creature', voice: 'sweet, soft and gentle' },
  sulfy: { description: 'a cute little fire spirit', voice: 'crackly, warm and excited' },
};
const pitchWords = (pitch) => (pitch >= 1.3 ? 'Very high' : pitch >= 1.1 ? 'High' : pitch >= 0.95 ? 'Medium-high' : 'Low');

const petPrompt = (description, voice, pitch) =>
  `A cute cartoon baby creature voice (${description}) babbling happy gibberish: about 6 short, separate syllables with a clear little pause between each, like "ba... mi... doo... ki... pa... no". ${pitchWords(pitch)}, ${voice} voice, friendly and cheerful. No real words, no music, no background noise, no echo.`;

// ---------------------------------------------------------------- build
const prompts = (touch, tone) => Object.fromEntries(Object.entries(TEMPLATES).map(([slot, make]) => [slot, make({ touch, tone })]));

const themeIdeas = existsSync(new URL('docs/theme-ideas.json', root)) ? read('docs/theme-ideas.json') : [];
const missing = themeIdeas.filter((i) => !IDEAS[i.id]).map((i) => i.id);
if (missing.length) throw new Error(`no sounds described for theme ideas: ${missing.join(', ')}`);

const themes = {};
for (const [id, [touch, tone]] of Object.entries(EXISTING)) {
  const json = read(`themes/${id}/theme.json`);
  themes[id] = { name: json.name, group: 'Existing themes', touch, tone, prompts: prompts(touch, tone) };
}
for (const idea of themeIdeas) {
  const [touch, tone] = IDEAS[idea.id];
  themes[idea.id] = { name: idea.name, group: idea.group, touch, tone, prompts: prompts(touch, tone) };
}

const petIdeas = read('docs/pet-ideas.json');
const pets = {};
for (const idea of petIdeas) {
  const voice = PET_GROUP_VOICE[idea.group] ?? 'sweet and playful';
  pets[idea.id] = { name: idea.name, group: idea.group, voice, prompt: petPrompt(idea.description, voice, idea.pitch) };
}
for (const id of readdirSync(new URL('pets/', root))) {
  if (id.startsWith('.') || pets[id]) continue;
  const json = read(`pets/${id}/pet.json`);
  const extra = EXTRA_PETS[id] ?? { description: `a cute little creature called ${json.name}`, voice: 'sweet and playful' };
  pets[id] = { name: json.name, group: 'Starter pets', voice: extra.voice, prompt: petPrompt(extra.description, extra.voice, json.voice?.pitch ?? 1) };
}

const out = {
  slots: SLOTS,
  default: {
    name: 'Default sounds',
    touch: DEFAULT.touch,
    tone: DEFAULT.tone,
    // The voice for pets without their own.
    prompts: { ...prompts(DEFAULT.touch, DEFAULT.tone), voice: petPrompt('a cute little round creature', 'sweet and playful', 1.1) },
  },
  themes,
  pets,
};
writeFileSync(new URL('docs/sound-prompts.json', root), JSON.stringify(out, null, 2) + '\n');

// ---------------------------------------------------------------- text version
const L = [];
const rule = (c = '-') => L.push(c.repeat(64));
L.push('MATH RUN · SOUND PROMPTS', '='.repeat(24), '');
L.push('The easiest way: open the Studio, click "Sounds", pick a theme or pet and press Start.');
L.push('The Studio copies each prompt and catches the file you download from the sound');
L.push('generator (it watches your Downloads folder), then trims it, evens out the volume');
L.push('and adds soft fades. No renaming, no dragging.', '');
L.push('Generator tips:');
L.push(' - Set the length yourself (not Auto, which tends to make 7-second clips): see the');
L.push('   length per sound below. A long clip still works: the Studio keeps the best hit.');
L.push(' - Most generators make several versions: listen and download only the nicest.');
L.push(' - For the tap sound, download up to 3 versions: the game rotates between them.');
L.push(' - Check the licence: the sounds must be allowed in a paid app.', '');
L.push('What each sound is for:');
for (const s of Object.values(SLOTS)) L.push(` - ${s.label} (${s.length}): ${s.when}`);
L.push('');

const themeBlock = (title, t) => {
  L.push('', title, `   Keys feel like: ${t.touch} · Instrument: ${t.tone}`, '');
  for (const [slot, text] of Object.entries(t.prompts)) L.push(`   ${SLOTS[slot].label} (${SLOTS[slot].length}):`, `   ${text}`, '');
  rule();
};

L.push('', '#'.repeat(64), '# 1. DEFAULT SOUNDS (used by Sunny and every theme without its own)', '#'.repeat(64));
themeBlock('DEFAULT SOUNDS', out.default);

L.push('', '#'.repeat(64), '# 2. THEMES', '#'.repeat(64));
let group = null;
for (const t of Object.values(themes)) {
  if (t.group !== group) {
    group = t.group;
    L.push('', `=== ${group.toUpperCase()} ===`);
  }
  themeBlock(t.name.toUpperCase(), t);
}

L.push('', '#'.repeat(64), '# 3. PET VOICES (one clip per pet; the Studio cuts it into syllables)', '#'.repeat(64));
group = null;
for (const p of Object.values(pets)) {
  if (p.group !== group) {
    group = p.group;
    L.push('', `=== ${group.toUpperCase()} ===`, '');
  }
  L.push(`${p.name}:`, `   ${p.prompt}`, '');
}
writeFileSync(new URL('docs/sound-prompts.txt', root), L.join('\r\n') + '\r\n');
console.log(`wrote sound prompts: default, ${Object.keys(themes).length} themes, ${Object.keys(pets).length} pets`);
