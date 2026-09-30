import { router } from 'expo-router';
import { Fragment, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { checkSound, feedback, type DefaultSetSlot } from '@/feedback';
import { FOCUS_TABLES, MIN_TRICKY, tablesLabel } from '@/game/focus';
import { LEVEL_GROUPS, levelInfo } from '@/game/levels';
import {
  activePlayer,
  addPlayer,
  maxPlayers,
  removePlayer,
  renamePlayer,
  switchPlayer,
  updateProgress,
  useDevice,
  useProgress,
  type Focus,
} from '@/progress';
import { trickyFacts, useStats } from '@/stats';
import { useTheme, type Theme } from '@/theme';

// The grown-ups' area, behind the parental gate on the home screen: Math Run
// Plus, the progress report, players, and each player's settings.
export default function Settings() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const device = useDevice();
  const { maxLevel, showPet, focus } = useProgress();
  const stats = useStats();
  const scroll = useRef<ScrollView>(null);
  const scrolled = useRef(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [soundReport, setSoundReport] = useState<string[] | null>(null);

  // Plays every sound once and lists what the phone's audio player reports.
  const runSoundCheck = async () => {
    const slots: DefaultSetSlot[] = ['tap', 'backspace', 'button', 'correct', 'wrong', 'coin', 'gem', 'voice'];
    const lines: string[] = [];
    for (const slot of slots) {
      lines.push(await checkSound(slot));
      setSoundReport([...lines]);
      await new Promise((r) => setTimeout(r, 450));
    }
  };
  const [draft, setDraft] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const player = activePlayer(device);
  const several = device.players.length > 1;

  const choose = (level: number | null) => {
    feedback.key();
    updateProgress({ maxLevel: level });
  };

  const setFocus = (next: Focus) => {
    feedback.key();
    if (!device.plus) return router.push('/plus');
    updateProgress({ focus: next });
  };

  const toggleTable = (table: number) => {
    const tables = focus?.kind === 'tables' ? focus.tables : [];
    const next = tables.includes(table) ? tables.filter((x) => x !== table) : [...tables, table];
    setFocus({ kind: 'tables', tables: next });
  };

  const newPlayer = async () => {
    feedback.button();
    if (device.players.length >= maxPlayers(device)) return router.push('/plus');
    const name = `Player ${device.players.length + 1}`;
    const id = await addPlayer(name);
    startRename(id, name);
  };

  const startRename = (id: string | null, name: string) => {
    setDraft(name);
    setEditing(id);
  };
  const commitRename = () => {
    if (editing) renamePlayer(editing, draft);
    setEditing(null);
  };

  const levelRow = (level: number | null, title: string, example: string) => {
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

  const link = (icon: string, title: string, body: string, onPress: () => void) => (
    <Pressable
      onPress={() => {
        feedback.button();
        onPress();
      }}
      style={styles.row}
    >
      <Text style={styles.linkIcon}>{icon}</Text>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowExample}>{body}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );

  const trickyCount = trickyFacts(stats).length;
  const focusRow = (selected: boolean, title: string, body: string, next: Focus) => (
    <Pressable onPress={() => setFocus(next)} style={[styles.row, selected && styles.rowSelected]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>
          {!device.plus && next !== null ? '🔒 ' : ''}
          {title}
        </Text>
        <Text style={styles.rowExample}>{body}</Text>
      </View>
      {selected && <Text style={styles.check}>✓</Text>}
    </Pressable>
  );
  const plusFocus = device.plus ? focus : null;

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
          <Text style={styles.title}>Grown-ups</Text>
          <View style={styles.backSpacer} />
        </View>

        <ScrollView ref={scroll} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {link(
            '✨',
            device.plus ? 'Math Run Plus ✓' : 'Math Run Plus',
            device.plus ? 'Unlocked. Thank you!' : 'Full report, focus practice, more players, every premium theme & pet',
            () => router.push('/plus'),
          )}
          {link('📊', several ? `${player.name}'s progress` : 'Progress report', 'Practice this week, tricky facts and skills', () => router.push('/report'))}

          <Text style={[styles.heading, styles.headingSpaced]}>Players</Text>
          {device.players.map((p) => {
            const active = p.id === device.active;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  feedback.key();
                  switchPlayer(p.id);
                }}
                style={[styles.row, active && several && styles.rowSelected]}
              >
                <View style={styles.rowText}>
                  {editing === p.id ? (
                    <TextInput
                      autoFocus
                      value={draft}
                      onChangeText={setDraft}
                      maxLength={16}
                      selectTextOnFocus
                      returnKeyType="done"
                      onSubmitEditing={commitRename}
                      onBlur={commitRename}
                      style={[styles.rowTitle, styles.nameInput]}
                    />
                  ) : (
                    <Text style={styles.rowTitle}>{p.name}</Text>
                  )}
                  {active && several && <Text style={styles.rowExample}>Playing now · the settings below are for {p.name}</Text>}
                </View>
                <Pressable hitSlop={8} onPress={() => startRename(p.id, p.name)}>
                  <Text style={styles.smallAction}>Rename</Text>
                </Pressable>
                {several && (
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      if (confirmRemove !== p.id) return setConfirmRemove(p.id);
                      setConfirmRemove(null);
                      removePlayer(p.id);
                    }}
                  >
                    <Text style={[styles.smallAction, confirmRemove === p.id && { color: t.wrong }]}>
                      {confirmRemove === p.id ? 'Tap to remove' : 'Remove'}
                    </Text>
                  </Pressable>
                )}
              </Pressable>
            );
          })}
          <Pressable onPress={newPlayer} style={[styles.row, styles.addRow]}>
            <Text style={styles.rowTitle}>
              {device.players.length >= maxPlayers(device) && !device.plus ? '🔒 ' : '+ '}Add a player
            </Text>
            {!device.plus && <Text style={styles.rowExample}>With Plus: each child gets their own progress</Text>}
          </Pressable>

          <Text style={[styles.heading, styles.headingSpaced]}>Practice</Text>
          <Text style={styles.intro}>What runs practise{several ? ` for ${player.name}` : ''}.</Text>
          {focusRow(plusFocus === null, 'Adapt automatically', 'The game finds the right level (recommended)', null)}
          {focusRow(
            plusFocus?.kind === 'tricky',
            'Tricky facts',
            trickyCount >= MIN_TRICKY
              ? `${trickyCount} facts from the progress report`
              : 'Needs a few runs first: plays normally until some facts turn out tricky',
            { kind: 'tricky' },
          )}
          {focusRow(
            plusFocus?.kind === 'tables',
            'Times tables',
            plusFocus?.kind === 'tables' && plusFocus.tables.length ? tablesLabel(plusFocus.tables) : 'Pick the tables to practise',
            { kind: 'tables', tables: plusFocus?.kind === 'tables' ? plusFocus.tables : [] },
          )}
          {plusFocus?.kind === 'tables' && (
            <View style={styles.tableChips}>
              {FOCUS_TABLES.map((table) => {
                const on = plusFocus.tables.includes(table);
                return (
                  <Pressable key={table} onPress={() => toggleTable(table)} style={[styles.tableChip, on && styles.tableChipOn]}>
                    <Text style={[styles.tableChipText, on && styles.tableChipTextOn]}>{table}×</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Text style={[styles.heading, styles.headingSpaced]}>Pet companion</Text>
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

          <Text style={[styles.heading, styles.headingSpaced]}>Sound check</Text>
          <Pressable onPress={runSoundCheck} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Play every sound</Text>
              <Text style={styles.rowExample}>If sounds stay silent, this shows what the phone reports for each one.</Text>
            </View>
          </Pressable>
          {soundReport?.map((line, i) => (
            <Text key={i} selectable style={styles.rowExample}>
              {line}
            </Text>
          ))}

          <Text style={[styles.heading, styles.headingSpaced]}>Highest level</Text>
          <Text style={styles.intro}>
            The game adapts to your child, but never goes above the level you pick here. Choose the last skill they have learned
            at school; answering fast at that level keeps them there.
          </Text>

          {levelRow(null, 'No limit', 'Adapts all the way up to level 30')}

          {/* Rows sit directly in the scroll content so their layout y is scrollable. */}
          {LEVEL_GROUPS.map((group) => (
            <Fragment key={group.title}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {Array.from({ length: group.to - group.from + 1 }, (_, i) => {
                const level = group.from + i;
                const info = levelInfo(level);
                return levelRow(level, info.name, info.example);
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
    addRow: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 0,
    },
    linkIcon: {
      fontSize: 26,
    },
    chevron: {
      fontFamily: t.font.semibold,
      fontSize: 28,
      color: t.textSoft,
    },
    smallAction: {
      fontFamily: t.font.semibold,
      fontSize: 14,
      color: t.textSoft,
    },
    nameInput: {
      padding: 0,
      borderBottomWidth: 2,
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
    tableChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tableChip: {
      minWidth: 52,
      alignItems: 'center',
      backgroundColor: t.card,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: t.cardEdge,
      paddingVertical: 8,
    },
    tableChipOn: {
      backgroundColor: t.primary,
      borderColor: t.primaryEdge,
    },
    tableChipText: {
      fontFamily: t.font.bold,
      fontSize: 16,
      color: t.text,
    },
    tableChipTextOn: {
      color: t.onPrimary,
    },
  });
