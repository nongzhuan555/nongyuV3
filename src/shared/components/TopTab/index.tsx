import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';

export default function TopTab() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const outline = (theme as any).outline ?? '#e5e7eb';
  return (
    <View style={[styles.wrap, { paddingTop: insets.top, backgroundColor: theme.colors.background, borderBottomColor: outline }]}>
      <View style={styles.bar} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    height: 10,
  },
});
