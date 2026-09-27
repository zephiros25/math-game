import { StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/chunky-button';
import { font, theme } from '@/theme';

type Props = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
};

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export function Keypad({ onDigit, onBackspace, disabled }: Props) {
  const key = (d: string) => (
    <ChunkyButton
      key={d}
      label={d}
      onPress={() => onDigit(d)}
      fireOnPressIn
      disabled={disabled}
      color={theme.key}
      edgeColor={theme.keyEdge}
      textColor={theme.keyText}
      fontSize={34}
      height={62}
      style={styles.key}
    />
  );

  return (
    <View style={styles.pad}>
      {ROWS.map((row) => (
        <View key={row.join()} style={styles.row}>
          {row.map(key)}
        </View>
      ))}
      <View style={styles.row}>
        <View style={styles.key} />
        {key('0')}
        <ChunkyButton
          onPress={onBackspace}
          fireOnPressIn
          disabled={disabled}
          color={theme.backgroundDeep}
          edgeColor={theme.keyEdge}
          height={62}
          style={styles.key}
        >
          <Text style={styles.backspace}>⌫</Text>
        </ChunkyButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  key: {
    flex: 1,
  },
  backspace: {
    fontFamily: font.medium,
    fontSize: 28,
    color: theme.textSoft,
  },
});
