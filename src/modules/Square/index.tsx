// 广场视图（目录化）：占位实现，临时使用 StyleSheet（规避 Metro 配置问题）
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import TopTab from '@/shared/components/TopTab';

export default function Square() {
  const theme = useTheme();
  return (
    <View style={[styles['square__screen'], { backgroundColor: theme.colors.background }]}>
      <TopTab />
      <Text style={[styles['square__text'], { color: theme.colors.onBackground }]}>这是广场</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  square__screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  square__text: {
    fontSize: 20,
  },
});
