import { router } from 'expo-router';
import { Fragment, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { feedback } from '@/feedback';
import { LEVEL_GROUPS, levelInfo } from '@/game/levels';
import { updateProgress, useProgress } from '@/progress';
import { useTheme, type Theme } from '@/theme';

// Grown-up settings (opened from the home screen by holding the gear).
export default function Settings() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { maxLevel, showPet } = useProgress();
  const scroll = useRef<ScrollView>(null);
  const scrolled = useRef(false);

  const choose = (level: number | null) => {
    feedback.key();
    updateProgress({ maxLevel: level });
  };

  const row = (level: number | null, title: string, example: string) => {
    const selected = maxLevel === level;
    return (
      <Pressable
        key={level ?? 'none'}
        onPress={() => choose(level)}
        // Bring the current choice into view once, when the screen opens.
        onLayout={(e) => {
          if (!selected || level === null || scrolled.current) return;
          scrolled.current = true;
          scroll.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 160), animated: false });
        }}
        style={[styles.row, selected && styles.rowSelected]}
      >
        <View style={[styles.badge, selected && styles.badgeSelected]}>
          <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>{level ?? '∞'}</Text>
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowExample}>{example}</Text>
        </View>
        {selected && <Text style={styles.check}>✓</Text>}
      </Pressable>
    );
  };

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
          <Text style={styles.title}>Settings</Text>
          <View style={styles.backSpacer} />
        </View>

        <ScrollView ref={scroll} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.heading}>Pet companion</Text>
          <View style={[styles.row, styles.switchRow]}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Show a pet</Text>
              <Text style={styles.rowExample}>A little friend who cheers during play. Turn off if it distracts.</Text>
            </View>
            <Switch
              value={showPet}
              onValueChange={(on) => {
                feedback.key();
                updateProgress({ showPet: on });
              }}
              trackColor={{ true: t.primary, false: t.track }}
              thumbColor={t.card}
            />
          </View>

          <Text style={[styles.heading, styles.headingSpaced]}>Highest level</Text>
          <Text style={styles.intro}>
            The game adapts to your child, but never goes above the level you pick here. Choose the last skill they have learned
            at school; answering fast at that level keeps them there.
          </Text>

          {row(null, 'No limit', 'Adapts all the way up to level 30')}

          {/* Rows sit directly in the scroll content so their layout y is scrollable. */}
          {LEVEL_GROUPS.map((group) => (
            <Fragment key={group.title}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {Array.from({ length: group.to - group.from + 1 }, (_, i) => {
                const level = group.from + i;
                const info = levelInfo(level);
                return row(level, info.name, info.example);
              })}
            </Fragment>
          ))}
        </ScrollView>
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
      paddingHorizontal: 20,
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
    backSpacer: {
      width: 30,
    },
    title: {
      fontFamily: t.font.bold,
      fontSize: 26,
      color: t.text,
    },
    scroll: {
      paddingTop: 12,
      paddingBottom: 40,
      gap: 8,
    },
    heading: {
      fontFamily: t.font.bold,
      fontSize: 20,
      color: t.text,
    },
    headingSpaced: {
      marginTop: 18,
    },
    switchRow: {
      marginBottom: 4,
    },
    intro: {
      fontFamily: t.font.regular,
      fontSize: 15,
      lineHeight: 21,
      color: t.textSoft,
      marginBottom: 8,
    },
    groupTitle: {
      marginTop: 10,
      fontFamily: t.font.semibold,
      fontSize: 14,
      color: t.textSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.card,
      borderRadius: 16,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 3,
      borderColor: t.cardEdge,
    },
    rowSelected: {
      borderWidth: 2,
      borderBottomWidth: 4,
      borderColor: t.primary,
    },
    badge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: t.track,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeSelected: {
      backgroundColor: t.primary,
    },
    badgeText: {
      fontFamily: t.font.bold,
      fontSize: 15,
      color: t.textSoft,
    },
    badgeTextSelected: {
      color: t.onPrimary,
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      fontFamily: t.font.semibold,
      fontSize: 17,
      color: t.text,
    },
    rowExample: {
      fontFamily: t.font.regular,
      fontSize: 14,
      color: t.textSoft,
    },
    check: {
      fontFamily: t.font.bold,
      fontSize: 22,
      color: t.primary,
    },
  });
