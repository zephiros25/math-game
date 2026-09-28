// A tactile "3D" button: a colored face sitting on a darker edge. Pressing
// pushes the face down onto the edge, like a real key. An optional image
// (a theme's key texture) is drawn on the face, under the label.

import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme';

type Props = {
  label?: string;
  children?: React.ReactNode;
  onPress: () => void;
  // Fire on touch-down instead of release. Used by the keypad so typing feels instant.
  fireOnPressIn?: boolean;
  color?: string;
  edgeColor?: string;
  textColor?: string;
  fontSize?: number;
  height?: number;
  edge?: number;
  disabled?: boolean;
  image?: number | null;
  imageFit?: 'cover' | 'stretch';
  style?: StyleProp<ViewStyle>;
};

export function ChunkyButton({
  label,
  children,
  onPress,
  fireOnPressIn = false,
  color,
  edgeColor,
  textColor,
  fontSize = 26,
  height = 64,
  edge = 6,
  disabled = false,
  image = null,
  imageFit = 'cover',
  style,
}: Props) {
  const t = useTheme();
  color ??= t.primary;
  edgeColor ??= t.primaryEdge;
  textColor ??= t.onPrimary;
  const pressed = useSharedValue(0);
  // react-native-web doesn't reliably deliver press-in for mouse clicks, so
  // the web build falls back to firing on click.
  const onTouchDown = fireOnPressIn && Platform.OS !== 'web';

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value * (edge - 1) }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        pressed.set(withTiming(1, { duration: 50 }));
        if (onTouchDown) onPress();
      }}
      onPressOut={() => {
        pressed.set(withSpring(0, { damping: 12, stiffness: 400 }));
      }}
      onPress={onTouchDown ? undefined : onPress}
      style={[{ height: height + edge, opacity: disabled ? 0.5 : 1 }, style]}
    >
      <View style={[styles.edge, { top: edge, height, backgroundColor: edgeColor }]} />
      <Animated.View style={[styles.face, { height, backgroundColor: color }, image !== null && styles.clip, faceStyle]}>
        {image !== null && (
          <Image source={image} contentFit={imageFit === 'stretch' ? 'fill' : 'cover'} style={StyleSheet.absoluteFill} />
        )}
        {children ?? <Text style={{ color: textColor, fontSize, fontFamily: t.font.semibold }}>{label}</Text>}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 20,
  },
  clip: {
    overflow: 'hidden',
  },
  face: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
