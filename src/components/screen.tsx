import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeBackground } from '@/components/theme-background';
import { useTheme } from '@/theme';

// Root of every screen: the theme's animated background with safe-area
// content on top.
export function Screen({ children, subtle }: { children: React.ReactNode; subtle?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: t.background }]}>
      <ThemeBackground theme={t} subtle={subtle} />
      <SafeAreaView style={styles.fill}>{children}</SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
