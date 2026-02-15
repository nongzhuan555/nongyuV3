import React from 'react';
import { View, StyleSheet } from 'react-native';
import TopTab from '@/shared/components/TopTab';
import CourseTable from './components/CourseTable';

export default function Course() {
  return (
    <View style={styles['course__screen']}>
      <TopTab />
      <CourseTable />
    </View>
  );
}

const styles = StyleSheet.create({
  course__screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
