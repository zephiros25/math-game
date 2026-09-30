// An animated pet. Three pictures (normal, eyes closed, mouth open) are
// stacked and switched instantly; everything else is motion in code:
//
//   idle:  breathing, random blinks, and now and then a hop, tilt, wiggle or squish
//   talk:  speech bubble + mouth flapping with one babble syllable per flap
//
// Screens drive it through a ref: `pet.say("Nice one!")`, `pet.hop()`.

import { Image } from 'expo-image';
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { feedback, quietIn } from '@/feedback';
import type { Pet } from '@/pets';
import { useTheme, type Theme } from '@/theme';

export type PetHandle = {
  say: (text: string) => void;
  hop: () => void;
};

type Props = {
  pet: Pet;
  size: number;
  // Where the speech bubble appears.
  bubble?: 'right' | 'top';
  onPress?: () => void;
  ref?: Ref<PetHandle>;
};

// Talking pace: one mouth flap (and babble syllable) per SYLLABLE_MS, with
// the mouth open for MOUTH_OPEN of each flap. Keep in sync with the Studio
// preview (scripts/themes/pets.html).
const SYLLABLE_MS = 280;
const MAX_WAIT_MS = 4000;
const MOUTH_OPEN = 0.6;
const syllablesFor = (text: string) => Math.min(9, Math.max(2, Math.round(text.length / 4.5)));
const BUBBLE_WIDTH = 200;
const IDLE = 0;
const BLINK = 1;
const TALK = 2;

export function PetView({ pet, size: baseSize, bubble = 'right', onPress, ref }: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const size = Math.round(baseSize * pet.size);
  const still = useReducedMotion();

  const frame = useSharedValue(IDLE);
  const breathe = useSharedValue(0);
  const jump = useSharedValue(0); // hops and talk bounces, in px (negative = up)
  const tilt = useSharedValue(0); // degrees
  const squish = useSharedValue(0); // -1..1: taller..wider

  const [speech, setSpeech] = useState<string | null>(null);
  const talking = useRef(false);
  // Idle loops and speech keep separate timers, so a new sentence can cancel
  // the previous one without stopping the blinking and fidgeting.
  const loopTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const talkTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const schedule = (timers: Set<ReturnType<typeof setTimeout>>, ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  const later = (ms: number, fn: () => void) => schedule(loopTimers.current, ms, fn);
  const whileTalking = (ms: number, fn: () => void) => schedule(talkTimers.current, ms, fn);
  useEffect(() => {
    const loops = loopTimers.current;
    const talk = talkTimers.current;
    return () => {
      loops.forEach(clearTimeout);
      talk.forEach(clearTimeout);
    };
  }, []);

  const hasBlink = pet.blink !== null;
  const hasTalk = pet.talk !== null;

  const hop = () => {
    if (still) return;
    squish.set(withSequence(withTiming(-0.6, { duration: 90 }), withTiming(0.5, { duration: 200 }), withSpring(0, { damping: 7 })));
    jump.set(
      withSequence(
        withTiming(0, { duration: 80 }),
        withTiming(-size * 0.2, { duration: 170, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) }),
        withSpring(0),
      ),
    );
  };

  // Breathing, forever.
  useEffect(() => {
    if (still) return;
    breathe.set(withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [breathe, still]);

  // Blinks at random moments (sometimes a double blink).
  useEffect(() => {
    if (!hasBlink) return;
    let alive = true;
    const blinkOnce = (after: number) =>
      later(after, () => {
        if (talking.current) return;
        frame.set(BLINK);
        later(120, () => frame.get() === BLINK && frame.set(IDLE));
      });
    const loop = () =>
      later(2200 + Math.random() * 3500, () => {
        if (!alive) return;
        blinkOnce(0);
        if (Math.random() < 0.25) blinkOnce(240);
        loop();
      });
    loop();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet.id, hasBlink]);

  // A little idle action every 5 to 10 seconds.
  useEffect(() => {
    if (still) return;
    let alive = true;
    const loop = () =>
      later(5000 + Math.random() * 5000, () => {
        if (!alive) return;
        if (!talking.current) {
          const action = Math.floor(Math.random() * 4);
          if (action === 0) hop();
          else if (action === 1) tilt.set(withSequence(withTiming(9, { duration: 260 }), withTiming(9, { duration: 500 }), withSpring(0)));
          else if (action === 2)
            tilt.set(withSequence(withTiming(-7, { duration: 90 }), withTiming(7, { duration: 120 }), withTiming(-5, { duration: 110 }), withSpring(0)));
          else squish.set(withSequence(withTiming(0.7, { duration: 220 }), withSpring(0, { damping: 6 })));
        }
        loop();
      });
    loop();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet.id, still, size]);

  // The pet waits until other sounds have finished (up to MAX_WAIT_MS), so it
  // never talks over the fanfare or an answer chime.
  const say = (text: string) => {
    talkTimers.current.forEach(clearTimeout);
    talkTimers.current.clear();
    whileTalking(Math.min(quietIn(), MAX_WAIT_MS), () => talk(text));
  };

  const talk = (text: string) => {
    talking.current = true;
    setSpeech(text);
    const syllables = syllablesFor(text);
    for (let i = 0; i < syllables; i++) {
      whileTalking(i * SYLLABLE_MS, () => {
        if (hasTalk) frame.set(TALK);
        feedback.petSyllable(pet);
        if (!still) jump.set(withSequence(withTiming(-3, { duration: 110 }), withTiming(0, { duration: 150 })));
        whileTalking(SYLLABLE_MS * MOUTH_OPEN, () => frame.set(IDLE));
      });
    }
    const done = syllables * SYLLABLE_MS;
    whileTalking(done, () => {
      talking.current = false;
      frame.set(IDLE);
    });
    whileTalking(done + 1500, () => setSpeech(null));
  };

  useImperativeHandle(ref, () => ({ say, hop }));

  const body = useAnimatedStyle(() => {
    const scaleY = 1 + 0.03 * breathe.value - 0.08 * squish.value;
    const scaleX = 1 - 0.01 * breathe.value + 0.08 * squish.value;
    return {
      transform: [
        // Keep the feet on the ground while breathing and squishing.
        { translateY: jump.value - ((scaleY - 1) * size) / 2 },
        { rotate: `${tilt.value}deg` },
        { scaleX },
        { scaleY },
      ],
    };
  });
  const idleStyle = useAnimatedStyle(() => ({
    opacity: frame.value === IDLE || (frame.value === BLINK && !hasBlink) || (frame.value === TALK && !hasTalk) ? 1 : 0,
  }));
  const blinkStyle = useAnimatedStyle(() => ({ opacity: frame.value === BLINK ? 1 : 0 }));
  const talkStyle = useAnimatedStyle(() => ({ opacity: frame.value === TALK ? 1 : 0 }));

  // The bubble gets its own width (otherwise it would wrap to the pet's
  // width); the speech inside shrinks to fit shorter sentences.
  const bubbleStyle =
    bubble === 'right'
      ? { left: size * 0.9, top: size * 0.02, width: BUBBLE_WIDTH, alignItems: 'flex-start' as const }
      : { bottom: size * 0.98, left: size / 2 - BUBBLE_WIDTH / 2, width: BUBBLE_WIDTH, alignItems: 'center' as const };

  return (
    <View style={{ width: size, height: size }}>
      <Pressable onPress={onPress} disabled={!onPress} style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, body]}>
          <Animated.View style={[StyleSheet.absoluteFill, idleStyle]}>
            <Image source={pet.idle} contentFit="contain" style={StyleSheet.absoluteFill} />
          </Animated.View>
          {hasBlink && (
            <Animated.View style={[StyleSheet.absoluteFill, blinkStyle]}>
              <Image source={pet.blink} contentFit="contain" style={StyleSheet.absoluteFill} />
            </Animated.View>
          )}
          {hasTalk && (
            <Animated.View style={[StyleSheet.absoluteFill, talkStyle]}>
              <Image source={pet.talk} contentFit="contain" style={StyleSheet.absoluteFill} />
            </Animated.View>
          )}
        </Animated.View>
      </Pressable>
      {speech !== null && (
        <Animated.View key={speech} entering={ZoomIn.springify().damping(12)} exiting={FadeOut.duration(200)} style={[styles.bubbleWrap, bubbleStyle]} pointerEvents="none">
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{speech}</Text>
          </View>
          <View style={[styles.tail, bubble === 'right' ? styles.tailLeft : styles.tailDown]} />
        </Animated.View>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    bubbleWrap: {
      position: 'absolute',
      zIndex: 10,
    },
    bubble: {
      backgroundColor: t.card,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 2,
      borderColor: t.cardEdge,
    },
    bubbleText: {
      fontFamily: t.font.semibold,
      fontSize: 15,
      color: t.text,
    },
    tail: {
      position: 'absolute',
      width: 12,
      height: 12,
      backgroundColor: t.card,
      borderColor: t.cardEdge,
      transform: [{ rotate: '45deg' }],
    },
    tailLeft: {
      left: -6,
      top: 14,
      borderLeftWidth: 2,
      borderBottomWidth: 2,
    },
    tailDown: {
      bottom: -6,
      borderRightWidth: 2,
      borderBottomWidth: 2,
    },
  });
