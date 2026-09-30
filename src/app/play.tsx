import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { Coin } from '@/components/coin';
import { Keypad } from '@/components/keypad';
import { PetView, type PetHandle } from '@/components/pet-view';
import { Screen } from '@/components/screen';
import { feedback } from '@/feedback';
import { judge, type Verdict } from '@/game/engine';
import { focusPlan } from '@/game/focus';
import { generateQuestion, levelInfo, type Question } from '@/game/levels';
import { COINS_PER_FINISHED_RUN, coinsFor, isStreakGem, runBonusGems, today } from '@/game/rewards';
import { petLine, usePet } from '@/pets';
import { getDevice, getProgress, updateProgress } from '@/progress';
import { getStats, recordAnswer, recordRunEnd } from '@/stats';
import { useTheme, type Theme } from '@/theme';

const CORRECT_PAUSE_MS = 480;
const WRONG_PAUSE_MS = 1500;

const SPEED_LABEL = {
  lightning: '⚡ Lightning!',
  fast: 'Fast!',
  steady: 'Nice!',
  slow: 'Got it!',
} as const;

// Only called from event handlers and effects, never during render.
const now = () => Date.now();
const chance = (p: number) => Math.random() < p;

type RunStats = {
  correct: number;
  streak: number;
  bestStreak: number;
  coins: number;
  gems: number;
  peakLevel: number;
};

export default function Play() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [total] = useState(() => getProgress().runLength);
  const [bestBefore] = useState(() => getProgress().bestLevel);
  const [maxLevel] = useState(() => getProgress().maxLevel ?? undefined);
  // A focus run (Plus) drills chosen facts instead of climbing the levels.
  const [focus] = useState(() => (getDevice().plus ? focusPlan(getProgress().focus, getStats()) : null));

  const [index, setIndex] = useState(1);
  const [level, setLevel] = useState(1);
  const [question, setQuestion] = useState<Question>(() => (focus ? focus.next() : generateQuestion(1)));
  const [input, setInput] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [stats, setStats] = useState<RunStats>({ correct: 0, streak: 0, bestStreak: 0, coins: 0, gems: 0, peakLevel: 1 });

  // The answer clock starts once each question is on screen.
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = now();
  }, [index]);
  const wrongBefore = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // The pet cheers at the start, on streaks, fast answers and new records,
  // and sometimes comforts after a mistake. Otherwise it just hops, so it
  // never chatters on every question.
  const pet = usePet();
  const petRef = useRef<PetHandle>(null);
  const lastTalk = useRef(0);
  const petSay = (text: string, important = false) => {
    if (!important && now() - lastTalk.current < 3000) return petRef.current?.hop();
    lastTalk.current = now();
    petRef.current?.say(text);
  };
  useEffect(() => {
    if (!pet) return;
    const id = setTimeout(() => petSay(petLine(pet, 'start'), true), 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shake = useSharedValue(0);
  const pop = useSharedValue(1);
  const coinBump = useSharedValue(1);
  const answerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { scale: pop.value }],
  }));
  const coinStyle = useAnimatedStyle(() => ({ transform: [{ scale: coinBump.value }] }));

  const answering = verdict === null;

  function submit(value: string) {
    const correct = Number(value) === question.answer;
    const elapsed = now() - shownAt.current;
    const v = judge(question.level, correct, elapsed, wrongBefore.current, question.effort, maxLevel);
    recordAnswer(question, correct, elapsed);
    wrongBefore.current = !correct;
    setVerdict(v);

    const streak = correct ? stats.streak + 1 : 0;
    const earnedCoins = correct ? coinsFor(question.level, v.speed!) : 0;
    const streakGem = correct && isStreakGem(streak);
    const next: RunStats = {
      correct: stats.correct + (correct ? 1 : 0),
      streak,
      bestStreak: Math.max(stats.bestStreak, streak),
      coins: stats.coins + earnedCoins,
      gems: stats.gems + (streakGem ? 1 : 0),
      // Focus runs don't climb, so they don't count towards the best level.
      peakLevel: focus ? stats.peakLevel : Math.max(stats.peakLevel, v.nextLevel),
    };
    const newBest = !focus && v.nextLevel > Math.max(bestBefore, stats.peakLevel) && bestBefore > 0;
    setStats(next);

    if (correct) {
      feedback.correct(streak);
      pop.set(withSequence(withSpring(1.18, { damping: 6, stiffness: 500 }), withSpring(1, { damping: 10 })));
      coinBump.set(withSequence(withTiming(1.35, { duration: 90 }), withSpring(1, { damping: 8 })));
      // Crossing your all-time best level is worth a little fanfare.
      if (newBest) feedback.levelUp();
      if (streakGem) setTimeout(feedback.gem, 250);
      if (pet) {
        if (newBest) petSay(petLine(pet, 'newBest'), true);
        else if (streak === 3 || (streak >= 5 && streak % 5 === 0)) petSay(petLine(pet, 'streak', { streak }), true);
        else if (v.speed === 'lightning' && chance(0.5)) petSay(petLine(pet, 'lightning'));
        else if (chance(0.2)) petSay(petLine(pet, 'correct'));
        else petRef.current?.hop();
      }
    } else {
      if (pet && chance(0.7)) petSay(petLine(pet, 'wrong'));
      feedback.wrong();
      shake.set(
        withSequence(
          withTiming(-14, { duration: 50 }),
          withTiming(12, { duration: 70 }),
          withTiming(-8, { duration: 70 }),
          withTiming(4, { duration: 60 }),
          withTiming(0, { duration: 50 }),
        ),
      );
    }

    timer.current = setTimeout(() => advance(v.nextLevel, next), correct ? CORRECT_PAUSE_MS : WRONG_PAUSE_MS);
  }

  function advance(nextLevel: number, s: RunStats) {
    if (index >= total) {
      finish(s);
      return;
    }
    setIndex(index + 1);
    setLevel(nextLevel);
    setQuestion(focus ? focus.next(question) : generateQuestion(nextLevel, question));
    setInput('');
    setVerdict(null);
  }

  function finish(s: RunStats) {
    recordRunEnd();
    const p = getProgress();
    const day = today();
    const bonus = runBonusGems({
      correct: s.correct,
      total,
      peakLevel: s.peakLevel,
      previousBest: bestBefore,
      firstRunToday: p.lastRunDay !== day,
    });
    const coins = s.coins + COINS_PER_FINISHED_RUN;
    updateProgress({
      coins: p.coins + coins,
      gems: p.gems + s.gems + bonus.gems,
      bestLevel: Math.max(p.bestLevel, s.peakLevel),
      lastRunDay: day,
    });
    router.replace({
      pathname: '/results',
      params: {
        correct: s.correct,
        total,
        peak: s.peakLevel,
        coins,
        gems: s.gems + bonus.gems,
        daily: bonus.daily > 0 ? 1 : 0,
        bestStreak: s.bestStreak,
        newBest: s.peakLevel > bestBefore ? 1 : 0,
        ...(focus && { focus: focus.label }),
      },
    });
  }

  function onDigit(d: string) {
    if (!answering) return;
    const value = (input + d).replace(/^0+(?=\d)/, '');
    feedback.key();
    setInput(value);
    // Auto-submit as soon as the answer has as many digits as the solution.
    if (value.length >= String(question.answer).length) submit(value);
  }

  function onBackspace() {
    if (!answering || input.length === 0) return;
    feedback.backspace();
    setInput(input.slice(0, -1));
  }

  const boxColor = verdict === null ? t.card : verdict.correct ? t.correct : t.wrong;
  const boxEdge = verdict === null ? t.cardEdge : verdict.correct ? t.correctEdge : t.wrongEdge;
  const boxText = verdict === null ? t.text : t.onFeedback;
  const progressPct = ((index - (answering ? 1 : 0)) / total) * 100;

  return (
    <Screen subtle>
      <View style={styles.column}>
        <View style={styles.topBar}>
          <Pressable
            hitSlop={12}
            onPress={() => {
              feedback.button();
              router.back();
            }}
          >
            <Text style={styles.close}>✕</Text>
          </Pressable>
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${progressPct}%` }]} />
          </View>
          <Animated.View style={[styles.coinChip, coinStyle]}>
            <Coin size={20} />
            <Text style={styles.coinValue}>{stats.coins}</Text>
          </Animated.View>
        </View>

        <View style={styles.statusRow}>
          {focus ? (
            <View style={styles.levelChip}>
              <Text style={styles.levelNumber}>🎯</Text>
              <Text style={styles.levelName}>Practising {focus.label}</Text>
            </View>
          ) : (
            <Animated.View key={level} entering={ZoomIn.springify().damping(12)} style={styles.levelChip}>
              <Text style={styles.levelNumber}>Lv {level}</Text>
              <Text style={styles.levelName}>{levelInfo(level).name}</Text>
            </Animated.View>
          )}
          {stats.streak >= 3 && (
            <Animated.View entering={ZoomIn} exiting={FadeOut} style={styles.streakChip}>
              <Text style={styles.streakText}>🔥 {stats.streak}</Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.stage}>
          <View style={styles.toastSlot}>
            {verdict?.correct && (
              <Animated.Text key={`t${index}`} entering={FadeInDown.springify()} style={styles.toast}>
                {SPEED_LABEL[verdict.speed!]}
              </Animated.Text>
            )}
          </View>

          <Animated.View key={index} entering={FadeInDown.springify().damping(14)} exiting={FadeOutUp.duration(150)} style={styles.questionBlock}>
            <Text
              style={[styles.question, question.text.length > 12 && styles.questionLong]}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {question.text} =
            </Text>
            <Animated.View style={[styles.answerBox, { backgroundColor: boxColor, borderColor: boxEdge }, answerStyle]}>
              <Text style={[styles.answer, { color: boxText }, input === '' && styles.answerPlaceholder]}>
                {input === '' ? '?' : input}
              </Text>
            </Animated.View>
          </Animated.View>

          <View style={styles.toastSlot}>
            {verdict && !verdict.correct && (
              <Animated.Text entering={FadeIn.delay(250)} style={styles.reveal}>
                {question.text} = <Text style={styles.revealAnswer}>{question.answer}</Text>
              </Animated.Text>
            )}
          </View>
        </View>

        <View style={[styles.petRow, !pet && styles.petRowEmpty]}>
          {/* Quiet during a run: the game's own sounds are enough. */}
          {pet && <PetView ref={petRef} pet={pet} size={72} bubble="right" silent />}
          <Text style={styles.counter}>
            {Math.min(index, total)} / {total}
          </Text>
        </View>
        <Keypad onDigit={onDigit} onBackspace={onBackspace} />
      </View>
    </Screen>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    column: {
      flex: 1,
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingTop: 8,
    },
    close: {
      fontSize: 22,
      color: t.textSoft,
      fontFamily: t.font.semibold,
      paddingHorizontal: 4,
    },
    track: {
      flex: 1,
      height: 14,
      borderRadius: 7,
      backgroundColor: t.track,
      overflow: 'hidden',
    },
    trackFill: {
      height: '100%',
      borderRadius: 7,
      backgroundColor: t.correct,
    },
    coinChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minWidth: 56,
    },
    coinValue: {
      fontFamily: t.font.semibold,
      fontSize: 20,
      color: t.text,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
      minHeight: 36,
    },
    levelChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: t.card,
      borderRadius: 999,
      paddingLeft: 6,
      paddingRight: 14,
      paddingVertical: 5,
      borderBottomWidth: 3,
      borderColor: t.cardEdge,
    },
    levelNumber: {
      fontFamily: t.font.bold,
      fontSize: 14,
      color: t.onPrimary,
      backgroundColor: t.primary,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    levelName: {
      fontFamily: t.font.medium,
      fontSize: 15,
      color: t.text,
    },
    streakChip: {
      backgroundColor: t.streakBg,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    streakText: {
      fontFamily: t.font.bold,
      fontSize: 16,
      color: t.streak,
    },
    stage: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toastSlot: {
      height: 44,
      justifyContent: 'center',
    },
    toast: {
      fontFamily: t.font.bold,
      fontSize: 24,
      color: t.correct,
    },
    questionBlock: {
      alignItems: 'center',
      gap: 18,
      width: '100%',
    },
    question: {
      fontFamily: t.font.semibold,
      fontSize: 64,
      color: t.text,
    },
    questionLong: {
      fontSize: 48,
    },
    answerBox: {
      minWidth: 130,
      paddingHorizontal: 24,
      height: 96,
      borderRadius: 26,
      borderBottomWidth: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    answer: {
      fontFamily: t.font.bold,
      fontSize: 60,
    },
    answerPlaceholder: {
      color: t.keyEdge,
    },
    reveal: {
      fontFamily: t.font.medium,
      fontSize: 24,
      color: t.textSoft,
    },
    revealAnswer: {
      fontFamily: t.font.bold,
      color: t.correct,
    },
    // Pet on the left (its speech bubble opens to the right), counter on the right.
    petRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 8,
      zIndex: 5,
    },
    petRowEmpty: {
      justifyContent: 'center',
    },
    counter: {
      fontFamily: t.font.medium,
      fontSize: 15,
      color: t.textSoft,
      marginBottom: 4,
    },
  });
