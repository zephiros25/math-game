// The grown-ups' door: settings and the progress report sit behind it. It
// asks for a number written out in Dutch words, like "vierduizend
// driehonderdzevenenveertig", which young children can't read yet.

import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Keypad } from '@/components/keypad';
import { feedback } from '@/feedback';
import { useTheme, type Theme } from '@/theme';

const ONES = ['', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien'];
const TENS = ['', '', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig', 'tachtig', 'negentig'];

// 47 → "zevenenveertig", 23 → "drieëntwintig" (ën after a word ending in e).
function underHundred(n: number) {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = ONES[n % 10];
  if (!ones) return tens;
  return `${ones}${ones.endsWith('e') ? 'ën' : 'en'}${tens}`;
}

// 4347 → "vierduizend driehonderdzevenenveertig"
export function numberInWords(n: number) {
  const thousands = Math.floor(n / 1000);
  const hundreds = Math.floor((n % 1000) / 100);
  const rest = n % 100;
  const prefix = (count: number) => (count === 1 ? '' : ONES[count]);
  let words = thousands ? `${prefix(thousands)}duizend` : '';
  const tail = (hundreds ? `${prefix(hundreds)}honderd` : '') + (rest ? underHundred(rest) : '');
  if (tail) words += `${words ? ' ' : ''}${tail}`;
  return words;
}

// Four digits, no zeros (so every word has to be read).
const newCode = () => {
  const d = () => 1 + Math.floor(Math.random() * 9);
  return d() * 1000 + d() * 100 + (2 + Math.floor(Math.random() * 8)) * 10 + d();
};

type Props = { visible: boolean; onPass: () => void; onCancel: () => void };

export function ParentGate({ visible, onPass, onCancel }: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [code, setCode] = useState(newCode);
  const [input, setInput] = useState('');
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const reset = () => {
    clearTimeout(timer.current);
    setCode(newCode());
    setInput('');
  };

  function onDigit(d: string) {
    const value = input + d;
    feedback.key();
    setInput(value);
    if (value.length < 4) return;
    if (Number(value) === code) {
      timer.current = setTimeout(() => {
        reset();
        onPass();
      }, 150);
    } else {
      feedback.wrong();
      shake.set(withSequence(withTiming(-12, { duration: 50 }), withTiming(10, { duration: 70 }), withTiming(0, { duration: 60 })));
      timer.current = setTimeout(reset, 500);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Alleen voor ouders</Text>
          <Text style={styles.body}>Typ dit getal om verder te gaan:</Text>
          <Text style={styles.words}>{numberInWords(code)}</Text>
          <Animated.View style={[styles.answer, shakeStyle]}>
            <Text style={styles.answerText}>{input.padEnd(4, '·')}</Text>
          </Animated.View>
          <Keypad onDigit={onDigit} onBackspace={() => setInput(input.slice(0, -1))} />
          <Pressable
            hitSlop={10}
            onPress={() => {
              reset();
              onCancel();
            }}
          >
            <Text style={styles.cancel}>Annuleren</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// Runs `action` after the gate is passed. Render `gate` somewhere in the screen.
export function useParentGate() {
  const [pending, setPending] = useState<(() => void) | null>(null);
  const gate = (
    <ParentGate
      visible={pending !== null}
      onPass={() => {
        const action = pending;
        setPending(null);
        action?.();
      }}
      onCancel={() => setPending(null)}
    />
  );
  return { gate, ask: (action: () => void) => setPending(() => action) };
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    sheet: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: t.background,
      borderRadius: 28,
      padding: 20,
      gap: 10,
    },
    title: {
      fontFamily: t.font.bold,
      fontSize: 24,
      color: t.text,
      textAlign: 'center',
    },
    body: {
      fontFamily: t.font.medium,
      fontSize: 15,
      color: t.textSoft,
      textAlign: 'center',
    },
    words: {
      fontFamily: t.font.semibold,
      fontSize: 19,
      color: t.text,
      textAlign: 'center',
    },
    answer: {
      alignSelf: 'center',
      backgroundColor: t.card,
      borderRadius: 16,
      borderBottomWidth: 4,
      borderColor: t.cardEdge,
      paddingHorizontal: 22,
      paddingVertical: 6,
      marginBottom: 4,
    },
    answerText: {
      fontFamily: t.font.bold,
      fontSize: 32,
      letterSpacing: 6,
      color: t.text,
    },
    cancel: {
      fontFamily: t.font.semibold,
      fontSize: 16,
      color: t.textSoft,
      textAlign: 'center',
      paddingTop: 6,
    },
  });
