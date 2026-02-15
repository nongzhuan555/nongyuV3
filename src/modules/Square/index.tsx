// 广场视图（目录化）：占位实现，临时使用 StyleSheet（规避 Metro 配置问题）
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import TopTab from '@/shared/components/TopTab';

export default function Square() {
  return (
    <View style={styles['square__screen']}>
      <TopTab />
      <Text style={styles['square__text']}>这是广场</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  square__screen: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  square__text: {
    fontSize: 20,
    color: '#333',
  },
});
