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
import { getProgress, updateProgress, useProgress } from '@/progress';
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
  // Free pets (price 0) belong to everyone.
  const owns = (pet: Pet) => progress.ownedPets.includes(pet.id) || pet.price === 0;

  // Browsing a pet also loads its voice; leaving restores the chosen pet's.
  useEffect(() => {
    applyPetVoice(selected);
  }, [selected]);
  useEffect(() => () => applyPetVoice(petById(getProgress().pet)), []);

  // Greet on arrival.
  useEffect(() => {
    const id = setTimeout(() => selected && petRef.current?.say(`Hoi, ik ben ${selected.name}!`), 500);
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
    setTimeout(() => petRef.current?.say(`Hoi, ik ben ${pet.name}!`), 250);
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
    setTimeout(() => petRef.current?.say('Joepie! Laten we samen spelen!'), 600);
  }

  const quiet = { color: t.card, edgeColor: t.cardEdge, textColor: t.textSoft, height: 64 };
  let action: React.ReactNode;
  if (chosen) {
    action = <ChunkyButton label={`✓ ${selected.name} is bij je`} fontSize={22} onPress={() => petRef.current?.hop()} {...quiet} />;
  } else if (owned) {
    action = <ChunkyButton label={`Neem ${selected.name} mee`} fontSize={22} onPress={choose} height={64} />;
  } else if (shortBy > 0) {
    action = <ChunkyButton label={`Speel nog ${shortBy} 💎 bij elkaar`} fontSize={22} onPress={() => feedback.wrong()} {...quiet} />;
  } else {
    action = <ChunkyButton label={`Vrijspelen voor ${selected.price} 💎`} fontSize={24} onPress={unlock} height={64} />;
  }

  // Development builds can take any pet along without gems.
  const devUnlock = __DEV__ && !owned && (
    <Pressable onPress={() => updateProgress({ pet: selected.id, ownedPets: [...progress.ownedPets, selected.id] })}>
      <Text style={styles.devLink}>Ontwikkelaar: gratis vrijspelen en meenemen</Text>
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
          <Text style={styles.title}>Huisdieren</Text>
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
              const status = progress.pet === pet.id ? '✓ Bij je' : isOwned ? 'Van jou' : `💎 ${pet.price}`;
              return (
                <Pressable key={pet.id} onPress={() => select(pet)} style={styles.tile}>
                  <View style={[styles.tileCard, { borderColor: isSelected ? t.primary : t.cardEdge }]}>
                    <Image source={pet.idle} contentFit="contain" style={styles.tileImage} />
                    {!isOwned && <Text style={styles.lock}>🔒</Text>}
                    {isSelected && <Animated.View entering={ZoomIn.springify()} style={[styles.selectedRing, { borderColor: t.primary }]} />}
                  </View>
                  <Text style={styles.tileName} numberOfLines={1}>
                    {pet.name}
                  </Text>
                  <Text style={styles.tileStatus}>{status}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>Verdien 💎 met elke ronde die je afmaakt, +2 voor je eerste ronde van de dag, en extra voor 10 goed op een rij, een foutloze ronde of een nieuw record.</Text>
        </ScrollView>

        {devUnlock}
        {action}
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
    devLink: {
      fontFamily: t.font.medium,
      fontSize: 13,
      color: t.textSoft,
      textAlign: 'center',
      textDecorationLine: 'underline',
      paddingBottom: 10,
    },
  });
