// What pets say, by moment. The sentences live in pet-lines.json (shared with
// the Studio). Each pet can replace any of them with its own lines. Keep them
// short, warm and never teasing: mistakes are part of learning. "{streak}"
// becomes the streak count.

import lines from './pet-lines.json';

export type LineMoment = 'hello' | 'start' | 'correct' | 'streak' | 'lightning' | 'newBest' | 'wrong' | 'finish';

export const PET_LINES: Record<LineMoment, string[]> = lines;
