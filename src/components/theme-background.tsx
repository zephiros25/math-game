// Slow, ambient particles behind every screen: bubbles rising in Ocean, stars
// twinkling in Night Sky, petals drifting in Blossom... Everything animates on
// the UI thread and is purely decorative (no touches, respects Reduce Motion).
// Layouts come from a seeded PRNG, so a theme looks the same every time.
// Themes can also provide a background image and their own particle sprites,
// which then move the way the chosen particle style moves.

import { Image } from 'expo-image';
import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { ParticleStyle, Theme } from '@/theme';

type Shape = 'circle' | 'ring' | 'rect' | 'oval' | 'diamond' | 'blob' | 'image';
type Motion = 'rise' | 'fall' | 'twinkle' | 'drift';

type Particle = {
  x: number; // 0..1 of screen width
  y: number; // 0..1 of screen height (ignored by rise/fall)
  size: number;
  color: string;
  image: number | null;
  shape: Shape;
  motion: Motion;
  duration: number;
  phase: number; // 0..1, where in its cycle the particle starts
  rotate: number;
  spin: number; // turns per cycle (fall/rise only)
  opacity: number;
};

type Recipe = { count: number; make: (r: () => number) => Omit<Particle, 'color' | 'image' | 'phase' | 'x' | 'y'> };

const RECIPES: Record<Exclude<ParticleStyle, 'none'>, Recipe> = {
  sunbeams: {
    count: 5,
    make: (r) => ({ size: 140 + r() * 160, shape: 'circle', motion: 'drift', duration: 9000 + r() * 5000, rotate: 0, spin: 0, opacity: 0.45 }),
  },
  bubbles: {
    count: 14,
    make: (r) => ({ size: 10 + r() * 30, shape: r() < 0.7 ? 'ring' : 'circle', motion: 'rise', duration: 14000 + r() * 12000, rotate: 0, spin: 0, opacity: 0.7 }),
  },
  leaves: {
    count: 11,
    make: (r) => ({ size: 16 + r() * 18, shape: 'oval', motion: 'fall', duration: 18000 + r() * 12000, rotate: r() * 180, spin: 0.5 + r(), opacity: 0.75 }),
  },
  confetti: {
    count: 18,
    make: (r) => ({ size: 10 + r() * 8, shape: r() < 0.6 ? 'rect' : 'circle', motion: 'fall', duration: 15000 + r() * 10000, rotate: r() * 180, spin: 1 + r() * 2, opacity: 0.8 }),
  },
  stars: {
    count: 34,
    make: (r) => ({ size: 2 + r() * 3.5, shape: 'circle', motion: 'twinkle', duration: 1400 + r() * 2600, rotate: 0, spin: 0, opacity: 1 }),
  },
  aurora: {
    count: 3,
    make: (r) => ({ size: 380 + r() * 160, shape: 'blob', motion: 'drift', duration: 11000 + r() * 6000, rotate: -20 + r() * 40, spin: 0, opacity: 0.22 }),
  },
  sparkles: {
    count: 20,
    make: (r) => ({ size: 5 + r() * 7, shape: 'diamond', motion: 'twinkle', duration: 1800 + r() * 2400, rotate: 45, spin: 0, opacity: 0.9 }),
  },
  petals: {
    count: 13,
    make: (r) => ({ size: 12 + r() * 10, shape: 'oval', motion: 'fall', duration: 16000 + r() * 10000, rotate: r() * 180, spin: 0.6 + r(), opacity: 0.85 }),
  },
};

function seeded(text: string) {
  let s = 0;
  for (const ch of text) s = (Math.imul(s, 31) + ch.charCodeAt(0)) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildParticles(theme: Theme): Particle[] {
  if (theme.particleStyle === 'none') return [];
  const r = seeded(theme.id);
  const recipe = RECIPES[theme.particleStyle];
  const images = theme.particleImages;
  const colors = theme.particleColors.length ? theme.particleColors : ['#FFFFFF'];
  return Array.from({ length: Math.round(recipe.count * theme.particleAmount) }, (_, i) => {
    const base = recipe.make(r);
    const image = images.length ? images[i % images.length] : null;
    return {
      ...base,
      // Sprites need a bit more room than the tiny built-in shapes.
      size: image && base.shape !== 'blob' ? Math.max(base.size * 1.8, 22) : base.size,
      shape: image ? 'image' : base.shape,
      image,
      opacity: base.opacity * theme.particleOpacity,
      color: colors[i % colors.length],
      x: r(),
      y: r(),
      phase: r(),
    };
  });
}

type Props = {
  theme: Theme;
  // Tones the particles down so they never distract from the question.
  subtle?: boolean;
};

export function ThemeBackground({ theme, subtle = false }: Props) {
  const particles = useMemo(() => buildParticles(theme), [theme]);
  const reduceMotion = useReducedMotion();

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, { backgroundColor: theme.background }]}>
      {theme.backgroundImage !== null && (
        <>
          <Image source={theme.backgroundImage} contentFit="cover" transition={200} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, opacity: theme.backgroundDim }]} />
        </>
      )}
      {particles.map((p, i) => (
        <ParticleView key={`${theme.id}-${i}`} p={p} still={reduceMotion} dim={subtle ? 0.55 : 1} />
      ))}
    </View>
  );
}

function ParticleView({ p, still, dim }: { p: Particle; still: boolean; dim: number }) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(p.phase);

  useEffect(() => {
    if (still) return;
    if (p.motion === 'rise' || p.motion === 'fall') {
      // Continue from the starting phase, then loop 0 → 1 forever.
      const linear = { easing: Easing.linear };
      progress.set(
        withSequence(
          withTiming(1, { duration: (1 - p.phase) * p.duration, ...linear }),
          withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: p.duration, ...linear })), -1),
        ),
      );
    } else {
      progress.set(0);
      progress.set(
        withDelay(
          p.phase * p.duration,
          withRepeat(withTiming(1, { duration: p.duration, easing: Easing.inOut(Easing.sin) }), -1, true),
        ),
      );
    }
  }, [p, progress, still]);

  const animated = useParticleStyle(p, progress, width, height, dim);
  const shape = shapeStyle(p);

  return (
    <Animated.View style={[styles.particle, shape, animated]}>
      {p.image !== null && <Image source={p.image} contentFit="contain" style={StyleSheet.absoluteFill} />}
    </Animated.View>
  );
}

function useParticleStyle(p: Particle, progress: SharedValue<number>, width: number, height: number, dim: number) {
  const baseX = p.x * width;
  const baseY = p.y * height;
  const travel = height + 2 * p.size;

  return useAnimatedStyle(() => {
    const t = progress.value;
    if (p.motion === 'rise' || p.motion === 'fall') {
      const y = p.motion === 'rise' ? (1 - t) * travel - p.size : t * travel - p.size;
      const sway = Math.sin(t * Math.PI * 2 * 2 + p.phase * 6) * (p.motion === 'rise' ? 10 : 24);
      return {
        opacity: p.opacity * dim,
        transform: [
          { translateX: baseX + sway },
          { translateY: y },
          { rotate: `${p.rotate + t * 360 * p.spin}deg` },
        ],
      };
    }
    if (p.motion === 'twinkle') {
      return {
        opacity: (0.2 + 0.8 * t) * p.opacity * dim,
        transform: [{ translateX: baseX }, { translateY: baseY }, { rotate: `${p.rotate}deg` }, { scale: 0.6 + 0.4 * t }],
      };
    }
    return {
      opacity: p.opacity * dim,
      transform: [
        { translateX: baseX - p.size / 2 + (t - 0.5) * 50 },
        { translateY: baseY - p.size / 2 + (t - 0.5) * 30 },
        { rotate: `${p.rotate}deg` },
        { scale: 1 + 0.08 * t },
      ],
    };
  });
}

function shapeStyle(p: Particle) {
  const s = p.size;
  switch (p.shape) {
    case 'circle':
      return { width: s, height: s, borderRadius: s / 2, backgroundColor: p.color };
    case 'ring':
      return { width: s, height: s, borderRadius: s / 2, borderWidth: Math.max(1.5, s / 12), borderColor: p.color };
    case 'rect':
      return { width: s * 0.55, height: s, borderRadius: 2, backgroundColor: p.color };
    case 'oval':
      return { width: s, height: s * 0.6, borderTopLeftRadius: s, borderBottomRightRadius: s, backgroundColor: p.color };
    case 'diamond':
      return { width: s, height: s, borderRadius: 1, backgroundColor: p.color };
    case 'blob':
      return { width: s, height: s * 0.45, borderRadius: s, backgroundColor: p.color };
    case 'image':
      return { width: s, height: s };
  }
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
