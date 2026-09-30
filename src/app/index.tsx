import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ChunkyButton } from '@/components/chunky-button';
import { Coin } from '@/components/coin';
import { PetView, type PetHandle } from '@/components/pet-view';
import { Screen } from '@/components/screen';
import { feedback, setMuted } from '@/feedback';
import { levelInfo } from '@/game/levels';
import { petLine, usePet } from '@/pets';
import { updateProgress, useProgress } from '@/progress';
import { useTheme, type Theme } from '@/theme';

const RUN_LENGTHS = [10, 20, 40];

// Settings are for grown-ups: the gear must be held this long to open them.
// The web build (only used for testing) opens them with a plain click, since
// press-and-hold isn't reliable with a mouse there.
const SETTINGS_HOLD_MS = 1500;
const HOLD_TO_OPEN = Platform.OS !== 'web';

export default function Home() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const progress = useProgress();

  // The pet greets the child, and says something new every time it's tapped.
  const pet = usePet();
  const petRef = useRef<PetHandle>(null);
  useEffect(() => {
    if (!pet) return;
    const id = setTimeout(() => petRef.current?.say(petLine(pet, 'hello')), 900);
    return () => clearTimeout(id);
  }, [pet]);

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

  // Holding the gear spins it; a quick tap shows how to open settings.
  const [hint, setHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(hintTimer.current), []);
  const spin = useSharedValue(0);
  const gearStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));

  const openSettings = () => {
    feedback.button();
    setHint(false);
    router.push('/settings');
  };

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
          <View style={styles.topActions}>
            <Pressable onPress={toggleMute} hitSlop={12} style={styles.iconButton}>
              <Text style={styles.icon}>{progress.muted ? '🔇' : '🔊'}</Text>
            </Pressable>
            <Pressable
              hitSlop={12}
              style={styles.iconButton}
              delayLongPress={SETTINGS_HOLD_MS}
              onPressIn={() => spin.set(withTiming(1, { duration: SETTINGS_HOLD_MS, easing: Easing.inOut(Easing.quad) }))}
              onPressOut={() => spin.set(withTiming(0, { duration: 250 }))}
              onLongPress={HOLD_TO_OPEN ? openSettings : undefined}
              onPress={() => {
                if (!HOLD_TO_OPEN) return openSettings();
                setHint(true);
                clearTimeout(hintTimer.current);
                hintTimer.current = setTimeout(() => setHint(false), 2500);
              }}
            >
              <Animated.Text style={[styles.icon, gearStyle]}>⚙️</Animated.Text>
            </Pressable>
          </View>
          {hint && (
            <Animated.Text entering={FadeIn} exiting={FadeOut} style={styles.hint}>
              Grown-ups: hold ⚙️ to open settings
            </Animated.Text>
          )}
        </View>

        <View style={styles.hero}>
          <Animated.View style={titleStyle}>
            <Text style={styles.titleSmall}>MATH</Text>
            <Text style={styles.title}>RUN</Text>
          </Animated.View>
          {pet ? (
            // Pet on the left, so its speech bubble has room on the right.
            <View style={styles.petRow}>
              <PetView ref={petRef} pet={pet} size={112} bubble="right" onPress={() => petRef.current?.say(petLine(pet, 'hello'))} />
            </View>
          ) : (
            <View style={styles.bubbles}>
              {['7 + 5', '6 × 8', '81 ÷ 9'].map((t, i) => (
                <Text key={t} style={[styles.bubble, { transform: [{ rotate: `${(i - 1) * 6}deg` }] }]}>
                  {t}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Best level</Text>
            <Text style={styles.cardValue} numberOfLines={1}>
              {progress.bestLevel > 0 ? `${progress.bestLevel} · ${levelInfo(progress.bestLevel).name}` : 'Not played yet'}
            </Text>
            {progress.maxLevel !== null && (
              <Text style={styles.capText} numberOfLines={1}>
                Up to: {levelInfo(progress.maxLevel).name}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.shopRow}>
          {[
            { icon: '🎨', label: 'Themes', route: '/themes' as const },
            { icon: '🐾', label: 'Pets', route: '/pets' as const },
          ].map((b) => (
            <ChunkyButton
              key={b.route}
              onPress={() => {
                feedback.button();
                router.push(b.route);
              }}
              color={t.card}
              edgeColor={t.cardEdge}
              height={54}
              edge={4}
              style={styles.shopButton}
            >
              <View style={styles.shopButtonInner}>
                <Text style={styles.shopIcon}>{b.icon}</Text>
                <Text style={styles.shopLabel}>{b.label}</Text>
              </View>
            </ChunkyButton>
          ))}
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
    topActions: {
      flexDirection: 'row',
      gap: 14,
    },
    iconButton: {
      padding: 4,
    },
    icon: {
      fontSize: 24,
    },
    hint: {
      position: 'absolute',
      right: 0,
      top: 48,
      zIndex: 1,
      fontFamily: t.font.medium,
      fontSize: 13,
      color: t.text,
      backgroundColor: t.card,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      overflow: 'hidden',
    },
    capText: {
      fontFamily: t.font.medium,
      fontSize: 13,
      color: t.primary,
      marginTop: 2,
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
    petRow: {
      alignSelf: 'stretch',
      paddingLeft: 24,
    },
    shopRow: {
      flexDirection: 'row',
      gap: 12,
    },
    shopButton: {
      flex: 1,
    },
    shopButtonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    shopIcon: {
      fontSize: 22,
    },
    shopLabel: {
      fontFamily: t.font.semibold,
      fontSize: 17,
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
