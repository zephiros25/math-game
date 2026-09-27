import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, ZoomIn } from 'react-native-reanimated';

import { ChunkyButton } from '@/components/chunky-button';
import { Coin } from '@/components/coin';
import { Screen } from '@/components/screen';
import { applyThemeSounds, feedback } from '@/feedback';
import { getProgress, updateProgress, useProgress } from '@/progress';
import { ThemeOverride, THEMES, themeById, useTheme, type Theme } from '@/theme';

// The shop renders entirely in the theme being browsed, so tapping a tile
// previews the whole look (background, colors, buttons) before unlocking it.
export default function Themes() {
  const progress = useProgress();
  const [selectedId, setSelectedId] = useState(progress.theme);
  const selected = themeById(selectedId);

  // Browsing a theme also previews its sounds; leaving restores the equipped one's.
  useEffect(() => {
    applyThemeSounds(selected);
  }, [selected]);
  useEffect(() => () => applyThemeSounds(themeById(getProgress().theme)), []);

  return (
    <ThemeOverride.Provider value={selected}>
      <Shop selected={selected} onSelect={setSelectedId} />
    </ThemeOverride.Provider>
  );
}

function Shop({ selected, onSelect }: { selected: Theme; onSelect: (id: string) => void }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const progress = useProgress();

  const owned = progress.ownedThemes.includes(selected.id);
  const equipped = progress.theme === selected.id;
  const shortBy = selected.price - progress.coins;

  const pop = useSharedValue(1);
  const previewStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  function select(theme: Theme) {
    if (theme.id === selected.id) return;
    feedback.key();
    onSelect(theme.id);
    pop.set(withSequence(withSpring(0.96, { duration: 80 }), withSpring(1, { damping: 9 })));
  }

  function equip() {
    feedback.button();
    updateProgress({ theme: selected.id });
  }

  function unlock() {
    updateProgress({
      coins: progress.coins - selected.price,
      ownedThemes: [...progress.ownedThemes, selected.id],
      theme: selected.id,
    });
    feedback.fanfare();
    setTimeout(feedback.gem, 350);
    pop.set(withSequence(withSpring(1.08, { damping: 5, stiffness: 400 }), withSpring(1, { damping: 8 })));
  }

  let action: React.ReactNode;
  // Solid "card" buttons for states with nothing to do (instead of faded
  // disabled buttons, which let the background show through).
  const quiet = { color: t.card, edgeColor: t.cardEdge, textColor: t.textSoft, height: 64 };

  if (equipped) {
    action = <ChunkyButton label="✓ Equipped" onPress={() => {}} {...quiet} />;
  } else if (owned) {
    action = <ChunkyButton label="Use this theme" onPress={equip} height={64} />;
  } else if (selected.premium) {
    action = (
      <View style={styles.premiumNote}>
        <Text style={styles.premiumTitle}>Premium theme · coming soon</Text>
        <Text style={styles.premiumBody}>Part of every premium theme will go to Alzheimer&apos;s research.</Text>
      </View>
    );
  } else if (shortBy > 0) {
    action = (
      <ChunkyButton onPress={() => feedback.wrong()} {...quiet}>
        <View style={styles.priceRow}>
          <Text style={[styles.priceText, { color: t.textSoft }]}>Play to earn {shortBy} more</Text>
          <Coin size={22} />
        </View>
      </ChunkyButton>
    );
  } else {
    action = (
      <ChunkyButton onPress={unlock} height={64}>
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>Unlock for {selected.price}</Text>
          {/* A soft backing keeps the coin visible on gold buttons. */}
          <View style={styles.coinBacking}>
            <Coin size={22} />
          </View>
        </View>
      </ChunkyButton>
    );
  }

  // Development builds can equip any theme without coins or a purchase, to
  // check themes made in the Theme Studio on a real phone.
  const devEquip = __DEV__ && !owned && (
    <Pressable onPress={() => updateProgress({ theme: selected.id, ownedThemes: [...progress.ownedThemes, selected.id] })}>
      <Text style={styles.devLink}>Developer: unlock &amp; equip for free</Text>
    </Pressable>
  );

  return (
    <Screen>
      <View style={styles.column}>
        <View style={styles.topBar}>
          <Pressable
            hitSlop={12}
            onPress={() => {
              feedback.button();
              router.back();
            }}
          >
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Themes</Text>
          <View style={styles.wallet}>
            <Coin size={18} />
            <Text style={styles.walletText}>{progress.coins}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.preview, previewStyle]}>
            <Preview />
            <Text style={styles.name}>{selected.name}</Text>
            <Text style={styles.tagline}>{selected.tagline}</Text>
          </Animated.View>

          <View style={styles.grid}>
            {THEMES.map((theme) => (
              <Tile
                key={theme.id}
                theme={theme}
                selected={theme.id === selected.id}
                owned={progress.ownedThemes.includes(theme.id)}
                equipped={progress.theme === theme.id}
                onPress={() => select(theme)}
              />
            ))}
          </View>
        </ScrollView>

        {devEquip}
        {action}
      </View>
    </Screen>
  );
}

// A miniature of the play screen drawn in the previewed theme.
function Preview() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.mock}>
      <View style={styles.mockTop}>
        <View style={styles.mockTrack}>
          <View style={styles.mockFill} />
        </View>
        <View style={styles.mockStreak}>
          <Text style={styles.mockStreakText}>🔥 7</Text>
        </View>
      </View>
      <Text style={styles.mockQuestion}>6 × 7 =</Text>
      <View style={styles.mockAnswer}>
        <Text style={styles.mockAnswerText}>42</Text>
      </View>
      <View style={styles.mockKeys}>
        {['1', '2', '3'].map((k) => (
          <View key={k} style={styles.mockKey}>
            <Text style={styles.mockKeyText}>{k}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

type TileProps = { theme: Theme; selected: boolean; owned: boolean; equipped: boolean; onPress: () => void };

function Tile({ theme, selected, owned, equipped, onPress }: TileProps) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  let status: React.ReactNode;
  if (equipped) status = <Text style={styles.tileStatus}>✓ On</Text>;
  else if (owned) status = <Text style={styles.tileStatus}>Owned</Text>;
  else if (theme.premium) status = <Text style={[styles.tileStatus, styles.tilePremium]}>★ Premium</Text>;
  else
    status = (
      <View style={styles.tilePrice}>
        <Coin size={13} />
        <Text style={styles.tileStatus}>{theme.price}</Text>
      </View>
    );

  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <View style={[styles.swatch, { backgroundColor: theme.background, borderColor: selected ? t.primary : t.cardEdge }]}>
        {/* Two dots hint at the theme's accent and feedback colors. */}
        <View style={[styles.swatchDot, { backgroundColor: theme.primary }]} />
        <View style={[styles.swatchDotSmall, { backgroundColor: theme.correct }]} />
        {!owned && !theme.premium && <Text style={styles.lock}>🔒</Text>}
        {selected && <Animated.View entering={ZoomIn.springify()} style={[styles.selectedRing, { borderColor: t.primary }]} />}
      </View>
      <Text style={[styles.tileName, { fontFamily: theme.font.semibold }]} numberOfLines={1}>
        {theme.name}
      </Text>
      {status}
    </Pressable>
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
      paddingBottom: 20,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 4,
    },
    back: {
      fontFamily: t.font.semibold,
      fontSize: 40,
      lineHeight: 44,
      color: t.textSoft,
      paddingHorizontal: 6,
    },
    title: {
      fontFamily: t.font.bold,
      fontSize: 26,
      color: t.text,
    },
    wallet: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: t.card,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderBottomWidth: 3,
      borderColor: t.cardEdge,
    },
    walletText: {
      fontFamily: t.font.semibold,
      fontSize: 17,
      color: t.text,
    },
    scroll: {
      paddingTop: 12,
      paddingBottom: 20,
      gap: 22,
    },
    preview: {
      alignItems: 'center',
      gap: 4,
    },
    name: {
      fontFamily: t.font.bold,
      fontSize: 30,
      color: t.text,
      marginTop: 12,
    },
    tagline: {
      fontFamily: t.font.medium,
      fontSize: 16,
      color: t.textSoft,
    },
    mock: {
      width: 220,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 28,
      backgroundColor: t.backgroundDeep,
      alignItems: 'center',
      gap: 10,
      borderBottomWidth: 5,
      borderColor: t.cardEdge,
    },
    mockTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'stretch',
    },
    mockTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.track,
      overflow: 'hidden',
    },
    mockFill: {
      width: '60%',
      height: '100%',
      backgroundColor: t.correct,
    },
    mockStreak: {
      backgroundColor: t.streakBg,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    mockStreakText: {
      fontFamily: t.font.bold,
      fontSize: 12,
      color: t.streak,
    },
    mockQuestion: {
      fontFamily: t.font.semibold,
      fontSize: 34,
      color: t.text,
    },
    mockAnswer: {
      paddingHorizontal: 22,
      paddingVertical: 2,
      borderRadius: 16,
      backgroundColor: t.correct,
      borderBottomWidth: 4,
      borderColor: t.correctEdge,
    },
    mockAnswerText: {
      fontFamily: t.font.bold,
      fontSize: 32,
      color: t.onFeedback,
    },
    mockKeys: {
      flexDirection: 'row',
      gap: 6,
      alignSelf: 'stretch',
      marginTop: 4,
    },
    mockKey: {
      flex: 1,
      height: 36,
      borderRadius: 10,
      backgroundColor: t.key,
      borderBottomWidth: 3,
      borderColor: t.keyEdge,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mockKeyText: {
      fontFamily: t.font.semibold,
      fontSize: 18,
      color: t.keyText,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 16,
    },
    tile: {
      width: '25%',
      alignItems: 'center',
      gap: 2,
    },
    swatch: {
      width: 64,
      height: 64,
      borderRadius: 20,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    swatchDot: {
      width: 26,
      height: 26,
      borderRadius: 13,
    },
    swatchDotSmall: {
      position: 'absolute',
      right: 10,
      bottom: 10,
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    lock: {
      position: 'absolute',
      top: -6,
      right: -6,
      fontSize: 16,
    },
    selectedRing: {
      position: 'absolute',
      top: -8,
      left: -8,
      right: -8,
      bottom: -8,
      borderRadius: 26,
      borderWidth: 2,
      opacity: 0.5,
    },
    tileName: {
      fontFamily: t.font.semibold,
      fontSize: 14,
      color: t.text,
    },
    tileStatus: {
      fontFamily: t.font.medium,
      fontSize: 12,
      color: t.textSoft,
    },
    tilePremium: {
      color: t.primary,
    },
    tilePrice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    devLink: {
      fontFamily: t.font.medium,
      fontSize: 13,
      color: t.textSoft,
      textAlign: 'center',
      textDecorationLine: 'underline',
      paddingBottom: 10,
    },
    coinBacking: {
      padding: 3,
      borderRadius: 999,
      backgroundColor: 'rgba(0, 0, 0, 0.14)',
    },
    priceText: {
      fontFamily: t.font.semibold,
      fontSize: 22,
      color: t.onPrimary,
    },
    premiumNote: {
      alignItems: 'center',
      gap: 4,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: t.card,
      borderBottomWidth: 4,
      borderColor: t.cardEdge,
    },
    premiumTitle: {
      fontFamily: t.font.bold,
      fontSize: 18,
      color: t.text,
    },
    premiumBody: {
      fontFamily: t.font.medium,
      fontSize: 14,
      color: t.textSoft,
      textAlign: 'center',
    },
  });
