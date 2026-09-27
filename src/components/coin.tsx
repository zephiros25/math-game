// A drawn coin, so it looks identical on every platform (the 🪙 emoji is
// missing on some devices).

import { View } from 'react-native';

export function Coin({ size = 20 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FFBE2E',
        borderWidth: Math.max(1.5, size * 0.09),
        borderColor: '#E59A12',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderRadius: size,
          borderWidth: Math.max(1, size * 0.07),
          borderColor: '#FFE08A',
        }}
      />
    </View>
  );
}
