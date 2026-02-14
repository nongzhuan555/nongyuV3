// 课程视图：作为底部Tab“课程”的页面占位
// 说明：临时使用 StyleSheet（规避 Metro 配置问题），后续替换为课表等模块
import React from 'react';
import { View, StyleSheet } from 'react-native';
import TodoList from './components/TodoList';

export default function Course() {
  return (
    <View style={styles['course__screen']}>
      <TodoList />
    </View>
  );
}

const styles = StyleSheet.create({
  course__screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
