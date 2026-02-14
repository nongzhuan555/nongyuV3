// 首页视图（目录化）：占位实现，临时使用 StyleSheet（规避 Metro 配置问题）
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

export default function Home() {
  return (
    <View style={styles['home__screen']}>
      <Text style={styles['home__text']}>这是首页</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  home__screen: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  home__text: {
    fontSize: 20,
    color: '#333',
  },
});
