import { router } from 'expo-router';
import { Fragment, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { checkSound, feedback, type DefaultSetSlot } from '@/feedback';
import { FOCUS_TABLES, practiceLabel } from '@/game/focus';
import { LEVEL_GROUPS, levelInfo } from '@/game/levels';
import {
  activePlayer,
  addPlayer,
  MAX_PLAYERS,
  removePlayer,
  renamePlayer,
  switchPlayer,
  updateProgress,
  useDevice,
  useProgress,
  type Practice,
} from '@/progress';
import { useTheme, type Theme } from '@/theme';

// The grown-ups' area, behind the parental gate on the home screen: the
// progress report, players, and each player's settings.
export default function Settings() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const device = useDevice();
  const { maxLevel, showPet, practice } = useProgress();
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

  const setPractice = (next: Practice) => {
    feedback.key();
    updateProgress({ practice: next });
  };

  // At least one table always stays selected, so "Tafels oefenen" always works.
  const toggleTable = (table: number) => {
    const on = practice.tables.includes(table);
    if (on && practice.tables.length === 1) return feedback.wrong();
    setPractice({ ...practice, tables: on ? practice.tables.filter((x) => x !== table) : [...practice.tables, table] });
  };

  const newPlayer = async () => {
    feedback.button();
    if (device.players.length >= MAX_PLAYERS) return;
    const name = `Speler ${device.players.length + 1}`;
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
          <Text style={styles.title}>Voor ouders</Text>
          <View style={styles.backSpacer} />
        </View>

        <ScrollView ref={scroll} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {link('📊', several ? `Voortgang van ${player.name}` : 'Voortgang', 'Oefenen deze week, lastige sommen en vaardigheden', () => router.push('/report'))}

          <Text style={[styles.heading, styles.headingSpaced]}>Spelers</Text>
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
                  {active && several && <Text style={styles.rowExample}>Speelt nu · de instellingen hieronder zijn voor {p.name}</Text>}
                </View>
                <Pressable hitSlop={8} onPress={() => startRename(p.id, p.name)}>
                  <Text style={styles.smallAction}>Naam wijzigen</Text>
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
                      {confirmRemove === p.id ? 'Tik om te wissen' : 'Wissen'}
                    </Text>
                  </Pressable>
                )}
              </Pressable>
            );
          })}
          {device.players.length < MAX_PLAYERS && (
            <Pressable onPress={newPlayer} style={[styles.row, styles.addRow]}>
              <Text style={styles.rowTitle}>+ Speler toevoegen</Text>
              <Text style={styles.rowExample}>Elk kind krijgt eigen munten, huisdieren, thema’s en voortgang</Text>
            </Pressable>
          )}

          <Text style={[styles.heading, styles.headingSpaced]}>Tafels oefenen</Text>
          <Text style={styles.intro}>
            Welke tafels de knop “Tafels oefenen” op het startscherm oefent{several ? ` voor ${player.name}` : ''}. Nu:{' '}
            {practiceLabel(practice)}.
          </Text>
          <View style={styles.tableChips}>
            {FOCUS_TABLES.map((table) => {
              const on = practice.tables.includes(table);
              return (
                <Pressable key={table} onPress={() => toggleTable(table)} style={[styles.tableChip, on && styles.tableChipOn]}>
                  <Text style={[styles.tableChipText, on && styles.tableChipTextOn]}>{table}×</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.row, styles.switchRow]}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Ook delen</Text>
              <Text style={styles.rowExample}>Uit: alleen 7 × 8 en 8 × 7. Aan: ook 56 ÷ 8.</Text>
            </View>
            <Switch
              value={practice.division}
              onValueChange={(on) => setPractice({ ...practice, division: on })}
              trackColor={{ true: t.primary, false: t.track }}
              thumbColor={t.card}
            />
          </View>

          <Text style={[styles.heading, styles.headingSpaced]}>Huisdier</Text>
          <View style={[styles.row, styles.switchRow]}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Huisdier tonen</Text>
              <Text style={styles.rowExample}>Een vriendje dat je aanmoedigt. Zet het uit als het afleidt.</Text>
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

          <Text style={[styles.heading, styles.headingSpaced]}>Geluidstest</Text>
          <Pressable onPress={runSoundCheck} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Alle geluiden afspelen</Text>
              <Text style={styles.rowExample}>Blijft het stil? Dan laat dit per geluid zien wat de telefoon meldt.</Text>
            </View>
          </Pressable>
          {soundReport?.map((line, i) => (
            <Text key={i} selectable style={styles.rowExample}>
              {line}
            </Text>
          ))}

          <Text style={[styles.heading, styles.headingSpaced]}>Hoogste niveau</Text>
          <Text style={styles.intro}>
            Het spel past zich aan je kind aan, maar gaat nooit hoger dan het niveau dat je hier kiest. Kies wat je kind op
            school het laatst geleerd heeft; snel antwoorden op dat niveau houdt het daar.
          </Text>

          {levelRow(null, 'Geen grens', 'Past zich aan tot en met niveau 30')}

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
