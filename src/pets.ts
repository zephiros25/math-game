// Pets: companions that cheer the player on. The pets themselves live as data
// in the pets/ folder (edited in the Studio) and are compiled into
// pet-registry.generated.ts. Pets are unlocked with gems earned by playing;
// `premium` pets will be sold, like premium themes.

import { PET_LINES, type LineMoment } from '@/pet-lines';
import { PET_DATA } from '@/pet-registry.generated';
import { useProgress } from '@/progress';

type Asset = number;

// The shape of each entry in the generated registry.
export type PetData = {
  id: string;
  name: string;
  tagline: string;
  order: number;
  price: number; // gems; 0 = free
  premium: boolean;
  size: number; // scale on screen, 0.6..1.5
  idle: Asset;
  blink: Asset | null; // eyes closed
  talk: Asset | null; // mouth open
  voicePitch: number;
  voiceVolume: number;
  voiceFiles: Asset[]; // own babble syllables; empty = default voice
  lines: Partial<Record<LineMoment, string[]>>;
};

export type Pet = PetData;

export const PETS: readonly Pet[] = PET_DATA;

export const DEFAULT_PET_ID = 'sprout';

export function petById(id: string | null): Pet | null {
  if (id === null) return null;
  return PETS.find((p) => p.id === id) ?? PETS.find((p) => p.id === DEFAULT_PET_ID) ?? PETS[0] ?? null;
}

// A random sentence for a moment: the pet's own lines if it has any,
// otherwise the defaults. "{streak}" is filled in when given.
export function petLine(pet: Pet, moment: LineMoment, vars: { streak?: number } = {}) {
  const own = pet.lines[moment];
  const lines = own && own.length ? own : PET_LINES[moment];
  const line = lines[Math.floor(Math.random() * lines.length)];
  return line.replace('{streak}', String(vars.streak ?? ''));
}

// The chosen pet, or null when a parent has turned pets off.
export function usePet(): Pet | null {
  const { pet, showPet } = useProgress();
  return showPet ? petById(pet) : null;
}
