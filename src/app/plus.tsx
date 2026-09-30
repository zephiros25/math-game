import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/chunky-button';
import { Screen } from '@/components/screen';
import { feedback } from '@/feedback';
import { PETS } from '@/pets';
import { PLUS_PLAYERS, useDevice } from '@/progress';
import { buyPlus, CHARITY_SHARE, devSetPlus, PLUS_PRICE_LABEL, restorePurchases } from '@/purchases';
import { THEMES, useTheme, type Theme } from '@/theme';

// What Math Run Plus adds, for grown-ups. Only reachable through the parental
// gate (settings, or "Ask a grown-up" in the shops).
export default function Plus() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { plus } = useDevice();
  const premiumThemes = THEMES.filter((x) => x.premium).length;
  const premiumPets = PETS.filter((x) => x.premium).length;

  const perks = [
    ['📊', 'Progress report', 'See which facts your child knows by heart, which are still tricky, and how each skill is going.'],
    ['🎯', 'Focus practice', 'Runs that drill the tricky facts, or just the times tables you pick.'],
    ['👨‍👩‍👧', `Up to ${PLUS_PLAYERS} players`, 'Each child gets their own coins, pets, themes and report.'],
    ['✨', 'Every premium theme & pet', `${premiumThemes} premium themes and ${premiumPets} premium pet${premiumPets === 1 ? '' : 's'} today, plus every new one we add.`],
    ['💜', "Alzheimer's research", `${CHARITY_SHARE ?? 'Part'} of every purchase goes to Alzheimer's research.`],
  ] as const;

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
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>MATH RUN</Text>
          <Text style={styles.title}>Plus</Text>
          <Text style={styles.subtitle}>
            {plus ? 'Thank you for supporting Math Run!' : 'One purchase. No subscription, no ads, yours for good.'}
          </Text>

          <View style={styles.perks}>
            {perks.map(([icon, title, body]) => (
              <View key={title} style={styles.perk}>
                <Text style={styles.perkIcon}>{icon}</Text>
                <View style={styles.perkText}>
                  <Text style={styles.perkTitle}>{title}</Text>
                  <Text style={styles.perkBody}>{body}</Text>
                </View>
                {plus && <Text style={styles.check}>✓</Text>}
              </View>
            ))}
          </View>
          <Text style={styles.free}>Everything else stays free: the whole game, and every theme and pet you can earn by playing.</Text>
        </ScrollView>

        {plus ? (
          <ChunkyButton label="✓ You have Plus" onPress={() => feedback.button()} color={t.card} edgeColor={t.cardEdge} textColor={t.textSoft} />
        ) : (
          <ChunkyButton
            label={`Get Plus · ${PLUS_PRICE_LABEL}`}
            fontSize={24}
            onPress={async () => {
              feedback.button();
              if (await buyPlus()) feedback.fanfare();
            }}
          />
        )}
        {!plus && (
          <Pressable hitSlop={8} onPress={restorePurchases}>
            <Text style={styles.link}>Restore purchase</Text>
          </Pressable>
        )}
        {__DEV__ && (
          <Pressable hitSlop={8} onPress={() => devSetPlus(!plus)}>
            <Text style={styles.link}>Developer: turn Plus {plus ? 'off' : 'on'}</Text>
          </Pressable>
        )}
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
      paddingBottom: 16,
      gap: 10,
    },
    topBar: {
      paddingTop: 4,
    },
    back: {
      fontFamily: t.font.semibold,
      fontSize: 40,
      lineHeight: 44,
      color: t.textSoft,
      paddingHorizontal: 6,
    },
    scroll: {
      paddingBottom: 16,
    },
    kicker: {
      fontFamily: t.font.bold,
      fontSize: 18,
      letterSpacing: 6,
      color: t.primary,
      textAlign: 'center',
    },
    title: {
      fontFamily: t.font.bold,
      fontSize: 64,
      lineHeight: 70,
      color: t.text,
      textAlign: 'center',
    },
    subtitle: {
      fontFamily: t.font.medium,
      fontSize: 16,
      color: t.textSoft,
      textAlign: 'center',
      marginBottom: 18,
    },
    perks: {
      gap: 10,
    },
    perk: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: t.card,
      borderRadius: 18,
      borderBottomWidth: 3,
      borderColor: t.cardEdge,
      padding: 14,
    },
    perkIcon: {
      fontSize: 28,
    },
    perkText: {
      flex: 1,
      gap: 2,
    },
    perkTitle: {
      fontFamily: t.font.bold,
      fontSize: 17,
      color: t.text,
    },
    perkBody: {
      fontFamily: t.font.regular,
      fontSize: 14,
      lineHeight: 19,
      color: t.textSoft,
    },
    check: {
      fontFamily: t.font.bold,
      fontSize: 22,
      color: t.correct,
    },
    free: {
      fontFamily: t.font.regular,
      fontSize: 14,
      lineHeight: 19,
      color: t.textSoft,
      textAlign: 'center',
      marginTop: 16,
    },
    link: {
      fontFamily: t.font.medium,
      fontSize: 14,
      color: t.textSoft,
      textAlign: 'center',
      textDecorationLine: 'underline',
      paddingTop: 4,
    },
  });
