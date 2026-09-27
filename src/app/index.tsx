import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChunkyButton } from '@/components/chunky-button';
import { feedback, setMuted } from '@/feedback';
import { levelInfo } from '@/game/levels';
import { updateProgress, useProgress } from '@/progress';
import { font, theme } from '@/theme';

const RUN_LENGTHS = [10, 20, 40];

export default function Home() {
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
    <SafeAreaView style={styles.screen}>
      <View style={styles.column}>
        <View style={styles.topBar}>
          <View style={styles.wallet}>
            <Chip icon="🪙" value={progress.coins} />
            <Chip icon="💎" value={progress.gems} />
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

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Best level</Text>
          <Text style={styles.cardValue}>
            {progress.bestLevel > 0 ? `${progress.bestLevel} · ${levelInfo(progress.bestLevel).name}` : 'Not played yet'}
          </Text>
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
    </SafeAreaView>
  );
}

function Chip({ icon, value }: { icon: string; value: number }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
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
    backgroundColor: theme.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 3,
    borderColor: theme.cardEdge,
  },
  chipIcon: {
    fontSize: 18,
  },
  chipValue: {
    fontFamily: font.semibold,
    fontSize: 18,
    color: theme.text,
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
    fontFamily: font.bold,
    fontSize: 36,
    letterSpacing: 8,
    color: theme.primary,
    textAlign: 'center',
  },
  title: {
    fontFamily: font.bold,
    fontSize: 96,
    lineHeight: 100,
    color: theme.text,
    textAlign: 'center',
  },
  bubbles: {
    flexDirection: 'row',
    gap: 10,
  },
  bubble: {
    fontFamily: font.semibold,
    fontSize: 18,
    color: theme.textSoft,
    backgroundColor: theme.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 16,
    borderBottomWidth: 4,
    borderColor: theme.cardEdge,
  },
  cardLabel: {
    fontFamily: font.medium,
    fontSize: 14,
    color: theme.textSoft,
  },
  cardValue: {
    fontFamily: font.semibold,
    fontSize: 20,
    color: theme.text,
    marginTop: 2,
  },
  lengths: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lengthsLabel: {
    fontFamily: font.medium,
    fontSize: 18,
    color: theme.textSoft,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: theme.track,
    borderRadius: 16,
    padding: 4,
  },
  segmentItem: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
  },
  segmentActive: {
    backgroundColor: theme.card,
  },
  segmentText: {
    fontFamily: font.semibold,
    fontSize: 18,
    color: theme.textSoft,
  },
  segmentTextActive: {
    color: theme.text,
  },
});
