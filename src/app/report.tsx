import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/chunky-button';
import { Screen } from '@/components/screen';
import { feedback } from '@/feedback';
import { MIN_TRICKY } from '@/game/focus';
import { bondKey, LEVEL_GROUPS, levelInfo, tableKey } from '@/game/levels';
import { activePlayer, useDevice, useProgress } from '@/progress';
import { dailyCounts, factStatus, recentTotals, trickyFacts, useStats, type FactStatus, type Stats } from '@/stats';
import { useTheme, type Theme } from '@/theme';

// The grown-ups' progress report: practice this week, tricky facts (with a
// button to practise them), daily activity, skills and fact maps.
export default function Report() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const device = useDevice();
  const progress = useProgress();
  const stats = useStats();
  const player = activePlayer(device);
  const week = recentTotals(stats, 7);
  const minutes = Math.round(week.ms / 60000);

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
          <Text style={styles.title}>{device.players.length > 1 ? `Voortgang van ${player.name}` : 'Voortgang'}</Text>
          <View style={styles.backSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.heading}>Deze week</Text>
          <View style={styles.tiles}>
            <Tile value={`${week.daysPlayed}/7`} label="dagen gespeeld" />
            <Tile value={String(week.n)} label="vragen" />
            <Tile value={week.n ? `${Math.round((week.right / week.n) * 100)}%` : '–'} label="goed" />
            <Tile value={minutes < 1 && week.n ? '<1' : String(minutes)} label={minutes === 1 ? 'minuut' : 'minuten'} />
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Beste niveau</Text>
            <Text style={styles.cardValue}>
              {progress.bestLevel > 0 ? `${progress.bestLevel} · ${levelInfo(progress.bestLevel).name}` : 'Nog niet gespeeld'}
            </Text>
            {progress.bestLevel > 0 && <Text style={styles.cardNote}>{levelInfo(progress.bestLevel).example}</Text>}
          </View>

          <Details stats={stats} />
        </ScrollView>
      </View>
    </Screen>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function Details({ stats }: { stats: Stats }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const tricky = trickyFacts(stats, 8);
  const seenTables = Object.keys(stats.facts).some((f) => f.includes('×'));
  const seenBonds = Object.keys(stats.facts).some((f) => f.includes('+'));

  const days = dailyCounts(stats, 14);
  const most = Math.max(10, ...days.map((d) => d.n));

  const skills = LEVEL_GROUPS.map((g) => {
    let n = 0;
    let right = 0;
    let speed = 0;
    for (let l = g.from; l <= g.to; l++) {
      const x = stats.levels[l];
      if (!x) continue;
      n += x.n;
      right += x.right;
      speed += x.speed * x.n;
    }
    return { title: g.title, n, right, speed: n ? speed / n : 0 };
  }).filter((s) => s.n > 0);

  // Starts a run with just these facts right away.
  const practiseTricky = () => {
    feedback.button();
    router.push({ pathname: '/play', params: { mode: 'tricky' } });
  };

  return (
    <>
      <Text style={styles.heading}>Nu lastig</Text>
      {tricky.length === 0 ? (
        <Text style={styles.note}>Nog niets lastigs. Sommen verschijnen hier zodra ze fout of traag beantwoord zijn.</Text>
      ) : (
        <View style={styles.card}>
          <View style={styles.factChips}>
            {tricky.map((f) => (
              <View key={f.fact} style={[styles.factChip, { borderColor: statusColor(t, f.status) }]}>
                <Text style={styles.factText}>{factText(f.fact)}</Text>
              </View>
            ))}
          </View>
          {tricky.length >= MIN_TRICKY ? (
            <ChunkyButton label="🎯 Oefen deze sommen" fontSize={20} height={52} onPress={practiseTricky} style={styles.cardButton} />
          ) : (
            <Text style={styles.cardNote}>Oefenen kan vanaf {MIN_TRICKY} lastige sommen.</Text>
          )}
        </View>
      )}

      <Text style={styles.heading}>Laatste 14 dagen</Text>
      <View style={[styles.card, styles.chart]}>
        {days.map((d, i) => (
          <View key={i} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height: `${(d.n / most) * 100}%` }]} />
            </View>
            <Text style={styles.barLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.note}>Beantwoorde vragen per dag.</Text>

      {skills.length > 0 && (
        <>
          <Text style={styles.heading}>Vaardigheden</Text>
          {skills.map((s) => (
            <View key={s.title} style={[styles.card, styles.skill]}>
              <View style={styles.skillText}>
                <Text style={styles.skillTitle}>{s.title}</Text>
                <Text style={styles.cardNote}>
                  {s.n} vragen · {Math.round((s.right / s.n) * 100)}% goed
                </Text>
              </View>
              <Text style={[styles.speed, { color: s.speed <= 0.6 ? t.correct : s.speed <= 1 ? t.text : t.textSoft }]}>
                {s.speed <= 0.6 ? 'Snel' : s.speed <= 1 ? 'Rustig' : 'Kost tijd'}
              </Text>
            </View>
          ))}
        </>
      )}

      {seenTables && <FactGrid title="Tafels" rows={[2, 3, 4, 5, 6, 7, 8, 9, 10]} cols={10} op="×" stats={stats} />}
      {seenBonds && <FactGrid title="Optellen tot 20" rows={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} cols={10} op="+" stats={stats} />}
      {(seenTables || seenBonds) && (
        <View style={styles.legend}>
          {(['known', 'shaky', 'learning', 'new'] as FactStatus[]).map((s) => (
            <View key={s} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: statusColor(t, s) }]} />
              <Text style={styles.legendText}>{STATUS_LABEL[s]}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const STATUS_LABEL: Record<FactStatus, string> = {
  known: 'Kent het uit het hoofd',
  shaky: 'Bijna',
  learning: 'Nog aan het leren',
  new: 'Nog niet gevraagd',
};

function statusColor(t: Theme, status: FactStatus) {
  if (status === 'known') return t.correct;
  if (status === 'shaky') return '#F2B53A';
  if (status === 'learning') return t.wrong;
  return t.track;
}

// "7×8" → "7 × 8 = 56"
function factText(fact: string) {
  const [a, b] = fact.split(/[+×]/).map(Number);
  return fact.includes('×') ? `${a} × ${b} = ${a * b}` : `${a} + ${b} = ${a + b}`;
}

type GridProps = { title: string; rows: number[]; cols: number; op: '×' | '+'; stats: Stats };

function FactGrid({ title, rows, cols, op, stats }: GridProps) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const key = op === '×' ? tableKey : bondKey;
  return (
    <>
      <Text style={styles.heading}>{title}</Text>
      <View style={[styles.card, styles.grid]}>
        {rows.map((r) => (
          <View key={r} style={styles.gridRow}>
            <Text style={styles.gridHead}>
              {r}
              {op}
            </Text>
            {Array.from({ length: cols }, (_, i) => {
              const status = factStatus(stats.facts[key(r, i + 1) ?? '']);
              return (
                <View key={i} style={[styles.cell, { backgroundColor: statusColor(t, status) }]}>
                  <Text style={[styles.cellText, status !== 'new' && { color: '#fff' }]}>{i + 1}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </>
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
      flex: 1,
      fontFamily: t.font.bold,
      fontSize: 24,
      color: t.text,
      textAlign: 'center',
    },
    scroll: {
      paddingTop: 8,
      paddingBottom: 40,
      gap: 8,
    },
    heading: {
      fontFamily: t.font.bold,
      fontSize: 20,
      color: t.text,
      marginTop: 12,
    },
    note: {
      fontFamily: t.font.regular,
      fontSize: 14,
      color: t.textSoft,
    },
    tiles: {
      flexDirection: 'row',
      gap: 8,
    },
    tile: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: t.card,
      borderRadius: 16,
      borderBottomWidth: 3,
      borderColor: t.cardEdge,
      paddingVertical: 10,
    },
    tileValue: {
      fontFamily: t.font.bold,
      fontSize: 22,
      color: t.text,
    },
    tileLabel: {
      fontFamily: t.font.medium,
      fontSize: 12,
      color: t.textSoft,
    },
    card: {
      backgroundColor: t.card,
      borderRadius: 18,
      borderBottomWidth: 3,
      borderColor: t.cardEdge,
      padding: 14,
    },
    cardLabel: {
      fontFamily: t.font.medium,
      fontSize: 13,
      color: t.textSoft,
    },
    cardValue: {
      fontFamily: t.font.bold,
      fontSize: 18,
      color: t.text,
    },
    cardNote: {
      fontFamily: t.font.regular,
      fontSize: 14,
      color: t.textSoft,
      marginTop: 4,
    },
    cardButton: {
      marginTop: 12,
    },
    factChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    factChip: {
      borderWidth: 2,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    factText: {
      fontFamily: t.font.semibold,
      fontSize: 16,
      color: t.text,
    },
    chart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
      height: 130,
    },
    barCol: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      height: '100%',
    },
    barTrack: {
      flex: 1,
      width: '100%',
      justifyContent: 'flex-end',
    },
    bar: {
      width: '100%',
      minHeight: 2,
      borderRadius: 4,
      backgroundColor: t.primary,
    },
    barLabel: {
      fontFamily: t.font.medium,
      fontSize: 11,
      color: t.textSoft,
    },
    skill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    skillText: {
      flex: 1,
    },
    skillTitle: {
      fontFamily: t.font.semibold,
      fontSize: 16,
      color: t.text,
    },
    speed: {
      fontFamily: t.font.bold,
      fontSize: 15,
    },
    grid: {
      gap: 4,
    },
    gridRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    gridHead: {
      width: 34,
      fontFamily: t.font.bold,
      fontSize: 14,
      color: t.text,
    },
    cell: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellText: {
      fontFamily: t.font.semibold,
      fontSize: 11,
      color: t.textSoft,
    },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 4,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 4,
    },
    legendText: {
      fontFamily: t.font.regular,
      fontSize: 13,
      color: t.textSoft,
    },
  });
