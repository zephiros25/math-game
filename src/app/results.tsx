import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { ChunkyButton } from '@/components/chunky-button';
import { Coin } from '@/components/coin';
import { Screen } from '@/components/screen';
import { feedback } from '@/feedback';
import { levelInfo } from '@/game/levels';
import { font, useTheme, type Theme } from '@/theme';

function starsFor(correct: number, total: number) {
  const pct = correct / total;
  return pct >= 0.95 ? 3 : pct >= 0.8 ? 2 : pct >= 0.5 ? 1 : 0;
}

const STAR_DELAY = 500;
const STAR_GAP = 350;

export default function Results() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const params = useLocalSearchParams<Record<string, string>>();
  const correct = Number(params.correct);
  const total = Number(params.total);
  const peak = Number(params.peak);
  const coins = Number(params.coins);
  const gems = Number(params.gems);
  const bestStreak = Number(params.bestStreak);
  const newBest = params.newBest === '1';
  const stars = starsFor(correct, total);

  const [shownCoins, setShownCoins] = useState(0);
  const [showGems, setShowGems] = useState(false);

  // Choreography: fanfare, stars one by one, coins counting up with ticks,
  // then gems.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    at(0, feedback.fanfare);
    for (let i = 0; i < stars; i++) at(STAR_DELAY + i * STAR_GAP, () => feedback.correct(3 + i * 2));

    const coinsStart = STAR_DELAY + stars * STAR_GAP + 200;
    const ticks = Math.min(coins, 24);
    for (let i = 1; i <= ticks; i++) {
      at(coinsStart + i * 55, () => {
        setShownCoins(Math.round((coins * i) / ticks));
        feedback.coin();
      });
    }
    if (gems > 0) {
      at(coinsStart + ticks * 55 + 300, () => {
        setShowGems(true);
        feedback.gem();
      });
    }
    return () => timers.forEach(clearTimeout);
  }, [coins, gems, stars]);

  const headline = stars === 3 ? 'Amazing!' : stars === 2 ? 'Great run!' : stars === 1 ? 'Nice work!' : 'Keep going!';

  return (
    <Screen>
      <View style={styles.column}>
        <View style={styles.hero}>
          <Animated.Text entering={ZoomIn.springify().damping(10)} style={styles.headline}>
            {headline}
          </Animated.Text>

          <View style={styles.stars}>
            {[0, 1, 2].map((i) =>
              i < stars ? (
                <Animated.Text
                  key={i}
                  entering={ZoomIn.delay(STAR_DELAY + i * STAR_GAP).springify().damping(7)}
                  style={[styles.star, i === 1 && styles.starMiddle]}
                >
                  ⭐
                </Animated.Text>
              ) : (
                <Text key={i} style={[styles.star, styles.starEmpty, i === 1 && styles.starMiddle]}>
                  ⭐
                </Text>
              ),
            )}
          </View>

          <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
            <Stat label="Correct" value={`${correct} / ${total}`} />
            <Stat label="Top level" value={`${peak} · ${levelInfo(peak).name}`} highlight={newBest ? 'New best!' : undefined} />
            <Stat label="Best streak" value={`🔥 ${bestStreak}`} />
          </Animated.View>

          <View style={styles.rewards}>
            <View style={styles.reward}>
              <Coin size={36} />
              <Text style={styles.rewardValue}>+{shownCoins}</Text>
            </View>
            {showGems && (
              <Animated.View entering={ZoomIn.springify().damping(8)} style={styles.reward}>
                <Text style={styles.rewardIcon}>💎</Text>
                <Text style={styles.rewardValue}>+{gems}</Text>
              </Animated.View>
            )}
          </View>
        </View>

        <View style={styles.buttons}>
          <ChunkyButton
            label="PLAY AGAIN"
            height={70}
            edge={7}
            onPress={() => {
              feedback.button();
              router.replace('/play');
            }}
          />
          <ChunkyButton
            label="Home"
            color={t.card}
            edgeColor={t.cardEdge}
            textColor={t.text}
            height={58}
            onPress={() => {
              feedback.button();
              router.back();
            }}
          />
        </View>
      </View>
    </Screen>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statRight}>
        {highlight && <Text style={styles.statHighlight}>{highlight}</Text>}
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    column: {
      flex: 1,
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    hero: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 22,
    },
    headline: {
      fontFamily: font.bold,
      fontSize: 48,
      color: t.text,
    },
    stars: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    star: {
      fontSize: 56,
    },
    starMiddle: {
      fontSize: 76,
      marginBottom: 12,
    },
    starEmpty: {
      opacity: 0.18,
    },
    card: {
      alignSelf: 'stretch',
      backgroundColor: t.card,
      borderRadius: 22,
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderBottomWidth: 4,
      borderColor: t.cardEdge,
    },
    stat: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
    },
    statLabel: {
      fontFamily: font.medium,
      fontSize: 17,
      color: t.textSoft,
    },
    statRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 1,
    },
    statHighlight: {
      fontFamily: font.bold,
      fontSize: 13,
      color: t.onPrimary,
      backgroundColor: t.primary,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    statValue: {
      fontFamily: font.semibold,
      fontSize: 17,
      color: t.text,
      flexShrink: 1,
    },
    rewards: {
      flexDirection: 'row',
      gap: 28,
      minHeight: 56,
    },
    reward: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rewardIcon: {
      fontSize: 40,
    },
    rewardValue: {
      fontFamily: font.bold,
      fontSize: 40,
      color: t.text,
    },
    buttons: {
      gap: 12,
    },
  });
