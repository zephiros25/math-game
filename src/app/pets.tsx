import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { ChunkyButton } from '@/components/chunky-button';
import { PetView, type PetHandle } from '@/components/pet-view';
import { Screen } from '@/components/screen';
import { applyPetVoice, feedback } from '@/feedback';
import { petById, PETS, type Pet } from '@/pets';
import { useParentGate } from '@/components/parent-gate';
import { getProgress, updateProgress, useDevice, useProgress } from '@/progress';
import { useTheme, type Theme } from '@/theme';

// The pet shop: tap a pet to meet it (it introduces itself in its own
// voice), then unlock it with gems earned by playing.
export default function Pets() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const progress = useProgress();
  const [selectedId, setSelectedId] = useState(progress.pet ?? PETS[0]?.id ?? null);
  const selected = petById(selectedId);
  const petRef = useRef<PetHandle>(null);
  const { plus } = useDevice();
  const { gate, ask } = useParentGate();
  // Plus includes every premium pet.
  const owns = (pet: Pet) => progress.ownedPets.includes(pet.id) || (pet.premium && plus);

  // Browsing a pet also loads its voice; leaving restores the chosen pet's.
  useEffect(() => {
    applyPetVoice(selected);
  }, [selected]);
  useEffect(() => () => applyPetVoice(petById(getProgress().pet)), []);

  // Greet on arrival.
  useEffect(() => {
    const id = setTimeout(() => selected && petRef.current?.say(`Hi, I'm ${selected.name}!`), 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!selected) return null;

  const owned = owns(selected);
  const chosen = progress.pet === selected.id;
  const shortBy = selected.price - progress.gems;

  function select(pet: Pet) {
    if (pet.id === selected?.id) return petRef.current?.hop();
    feedback.key();
    setSelectedId(pet.id);
    setTimeout(() => petRef.current?.say(`Hi, I'm ${pet.name}!`), 250);
  }

  function choose() {
    feedback.button();
    updateProgress({ pet: selected!.id });
    petRef.current?.hop();
  }

  function unlock() {
    updateProgress({
      gems: progress.gems - selected!.price,
      ownedPets: [...progress.ownedPets, selected!.id],
      pet: selected!.id,
    });
    feedback.fanfare();
    setTimeout(feedback.gem, 350);
    petRef.current?.hop();
    setTimeout(() => petRef.current?.say("Yay! Let's play together!"), 600);
  }

  const quiet = { color: t.card, edgeColor: t.cardEdge, textColor: t.textSoft, height: 64 };
  let action: React.ReactNode;
  if (chosen) {
    action = <ChunkyButton label={`✓ ${selected.name} is with you`} fontSize={22} onPress={() => petRef.current?.hop()} {...quiet} />;
  } else if (owned) {
    action = <ChunkyButton label={`Take ${selected.name} along`} fontSize={22} onPress={choose} height={64} />;
  } else if (selected.premium) {
    action = (
      <View style={styles.premiumNote}>
        <Text style={styles.premiumTitle}>★ Comes with Math Run Plus</Text>
        <Text style={styles.premiumBody}>One purchase unlocks every premium theme and pet, and more for grown-ups.</Text>
        <ChunkyButton label="Ask a grown-up" fontSize={20} height={52} onPress={() => ask(() => router.push('/plus'))} style={styles.askButton} />
      </View>
    );
  } else if (shortBy > 0) {
    action = <ChunkyButton label={`Play to earn ${shortBy} more 💎`} fontSize={22} onPress={() => feedback.wrong()} {...quiet} />;
  } else {
    action = <ChunkyButton label={`Unlock for ${selected.price} 💎`} fontSize={24} onPress={unlock} height={64} />;
  }

  // Development builds can take any pet along without gems or a purchase.
  const devUnlock = __DEV__ && !owned && (
    <Pressable onPress={() => updateProgress({ pet: selected.id, ownedPets: [...progress.ownedPets, selected.id] })}>
      <Text style={styles.devLink}>Developer: unlock &amp; take along for free</Text>
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
          <Text style={styles.title}>Pets</Text>
          <View style={styles.wallet}>
            <Text style={styles.walletIcon}>💎</Text>
            <Text style={styles.walletText}>{progress.gems}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.stage}>
            <PetView key={selected.id} ref={petRef} pet={selected} size={150} bubble="top" onPress={() => petRef.current?.hop()} />
          </View>
          <Text style={styles.name}>{selected.name}</Text>
          <Text style={styles.tagline}>{selected.tagline}</Text>

          <View style={styles.grid}>
            {PETS.map((pet) => {
              const isSelected = pet.id === selected.id;
              const isOwned = owns(pet);
              const status = progress.pet === pet.id ? '✓ With you' : isOwned ? 'Owned' : pet.premium ? '★ Premium' : `💎 ${pet.price}`;
              return (
                <Pressable key={pet.id} onPress={() => select(pet)} style={styles.tile}>
                  <View style={[styles.tileCard, { borderColor: isSelected ? t.primary : t.cardEdge }]}>
                    <Image source={pet.idle} contentFit="contain" style={styles.tileImage} />
                    {!isOwned && !pet.premium && <Text style={styles.lock}>🔒</Text>}
                    {isSelected && <Animated.View entering={ZoomIn.springify()} style={[styles.selectedRing, { borderColor: t.primary }]} />}
                  </View>
                  <Text style={styles.tileName} numberOfLines={1}>
                    {pet.name}
                  </Text>
                  <Text style={[styles.tileStatus, pet.premium && !isOwned && { color: t.primary }]}>{status}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>Earn 💎 for every run you finish, +2 for your first run each day, and extra for 10 in a row, a perfect run or a new best level.</Text>
        </ScrollView>

        {devUnlock}
        {action}
      </View>
      {gate}
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
    walletIcon: {
      fontSize: 16,
    },
    walletText: {
      fontFamily: t.font.semibold,
      fontSize: 17,
      color: t.text,
    },
    scroll: {
      paddingTop: 70, // room for the speech bubble above the pet
      paddingBottom: 20,
      alignItems: 'center',
    },
    stage: {
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: 160,
    },
    name: {
      fontFamily: t.font.bold,
      fontSize: 30,
      color: t.text,
      marginTop: 6,
    },
    tagline: {
      fontFamily: t.font.medium,
      fontSize: 16,
      color: t.textSoft,
      marginBottom: 20,
    },
    grid: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 16,
    },
    tile: {
      width: '25%',
      alignItems: 'center',
      gap: 2,
    },
    tileCard: {
      width: 68,
      height: 68,
      borderRadius: 20,
      borderWidth: 3,
      backgroundColor: t.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    tileImage: {
      width: 54,
      height: 54,
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
    hint: {
      fontFamily: t.font.regular,
      fontSize: 13,
      color: t.textSoft,
      textAlign: 'center',
      marginTop: 18,
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
    askButton: {
      alignSelf: 'stretch',
      marginTop: 8,
    },
    devLink: {
      fontFamily: t.font.medium,
      fontSize: 13,
      color: t.textSoft,
      textAlign: 'center',
      textDecorationLine: 'underline',
      paddingBottom: 10,
    },
  });
