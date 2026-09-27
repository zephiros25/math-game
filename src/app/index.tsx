import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ChunkyButton } from '@/components/chunky-button';
import { Coin } from '@/components/coin';
import { Screen } from '@/components/screen';
import { feedback, setMuted } from '@/feedback';
import { levelInfo } from '@/game/levels';
import { updateProgress, useProgress } from '@/progress';
import { useTheme, type Theme } from '@/theme';

const RUN_LENGTHS = [10, 20, 40];

export default function Home() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const progress = useProgress();

  // Gentle idle bob on the title.
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
  }, [bob]);
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * bob.value }, { rotate: `${-2 + 4 * bob.value}deg` }],
  }));

  const toggleMute = () => {
    setMuted(!progress.muted);
    updateProgress({ muted: !progress.muted });
    if (progress.muted) feedback.button();
  };

  return (
    <Screen>
      <View style={styles.column}>
        <View style={styles.topBar}>
          <View style={styles.wallet}>
            <Chip icon={<Coin size={18} />} value={progress.coins} />
            <Chip icon={<Text style={styles.chipIcon}>💎</Text>} value={progress.gems} />
          </View>
          <Pressable onPress={toggleMute} hitSlop={12} style={styles.muteButton}>
            <Text style={styles.muteIcon}>{progress.muted ? '🔇' : '🔊'}</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Animated.View style={titleStyle}>
            <Text style={styles.titleSmall}>MATH</Text>
            <Text style={styles.title}>RUN</Text>
          </Animated.View>
          <View style={styles.bubbles}>
            {['7 + 5', '6 × 8', '81 ÷ 9'].map((t, i) => (
              <Text key={t} style={[styles.bubble, { transform: [{ rotate: `${(i - 1) * 6}deg` }] }]}>
                {t}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={[styles.card, styles.cardGrow]}>
            <Text style={styles.cardLabel}>Best level</Text>
            <Text style={styles.cardValue} numberOfLines={1}>
              {progress.bestLevel > 0 ? `${progress.bestLevel} · ${levelInfo(progress.bestLevel).name}` : 'Not played yet'}
            </Text>
          </View>
          <ChunkyButton
            onPress={() => {
              feedback.button();
              router.push('/themes');
            }}
            color={t.card}
            edgeColor={t.cardEdge}
            height={70}
            edge={4}
            style={styles.themesButton}
          >
            <Text style={styles.themesIcon}>🎨</Text>
            <Text style={styles.themesLabel}>Themes</Text>
          </ChunkyButton>
        </View>

        <View style={styles.lengths}>
          <Text style={styles.lengthsLabel}>Questions</Text>
          <View style={styles.segment}>
            {RUN_LENGTHS.map((n) => {
              const active = progress.runLength === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => {
                    feedback.key();
                    updateProgress({ runLength: n });
                  }}
                  style={[styles.segmentItem, active && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ChunkyButton
          label="PLAY"
          fontSize={34}
          height={76}
          edge={8}
          onPress={() => {
            feedback.button();
            router.push('/play');
          }}
        />
      </View>
    </Screen>
  );
}

function Chip({ icon, value }: { icon: React.ReactNode; value: number }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.chip}>
      {icon}
      <Text style={styles.chipValue}>{value}</Text>
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
      gap: 18,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
    },
    wallet: {
      flexDirection: 'row',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: t.card,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderBottomWidth: 3,
      borderColor: t.cardEdge,
    },
    chipIcon: {
      fontSize: 18,
    },
    chipValue: {
      fontFamily: t.font.semibold,
      fontSize: 18,
      color: t.text,
    },
    muteButton: {
      padding: 4,
    },
    muteIcon: {
      fontSize: 24,
    },
    hero: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
    },
    titleSmall: {
      fontFamily: t.font.bold,
      fontSize: 36,
      letterSpacing: 8,
      color: t.primary,
      textAlign: 'center',
    },
    title: {
      fontFamily: t.font.bold,
      fontSize: 96,
      lineHeight: 100,
      color: t.text,
      textAlign: 'center',
    },
    bubbles: {
      flexDirection: 'row',
      gap: 10,
    },
    bubble: {
      fontFamily: t.font.semibold,
      fontSize: 18,
      color: t.textSoft,
      backgroundColor: t.card,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 6,
      overflow: 'hidden',
    },
    card: {
      backgroundColor: t.card,
      borderRadius: 20,
      padding: 16,
      borderBottomWidth: 4,
      borderColor: t.cardEdge,
    },
    cardRow: {
      flexDirection: 'row',
      gap: 12,
    },
    cardGrow: {
      flex: 1,
      justifyContent: 'center',
    },
    themesButton: {
      width: 92,
    },
    themesIcon: {
      fontSize: 24,
    },
    themesLabel: {
      fontFamily: t.font.semibold,
      fontSize: 14,
      color: t.text,
    },
    cardLabel: {
      fontFamily: t.font.medium,
      fontSize: 14,
      color: t.textSoft,
    },
    cardValue: {
      fontFamily: t.font.semibold,
      fontSize: 20,
      color: t.text,
      marginTop: 2,
    },
    lengths: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    lengthsLabel: {
      fontFamily: t.font.medium,
      fontSize: 18,
      color: t.textSoft,
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: t.track,
      borderRadius: 16,
      padding: 4,
    },
    segmentItem: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 12,
    },
    segmentActive: {
      backgroundColor: t.card,
    },
    segmentText: {
      fontFamily: t.font.semibold,
      fontSize: 18,
      color: t.textSoft,
    },
    segmentTextActive: {
      color: t.text,
    },
  });
