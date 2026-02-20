import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import ExamSchedule from '@/modules/Course/components/ExamSchedule';

export default function JiaowuExam() {
  const navigation = useNavigation();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="考试安排" />
      </Appbar.Header>
      {/* 复用课表系统下的考试安排组件 */}
      <ExamSchedule />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
