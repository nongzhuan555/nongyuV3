import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, Text, IconButton } from 'react-native-paper';
import TopTab from '@/shared/components/TopTab';
import CourseTable from './components/CourseTable';
import ShareSheet from '@/components/ShareSheet';

export default function Course() {
  const theme = useTheme();
  const [shareVisible, setShareVisible] = useState(false);

  return (
    <View style={[styles['course__screen'], { backgroundColor: theme.colors.background }]}>
      <TopTab />
      
      <View style={styles.header}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>课程表</Text>
        <IconButton 
          icon="share-variant" 
          mode="contained-tonal"
          size={20} 
          onPress={() => setShareVisible(true)} 
        />
      </View>

      <CourseTable />
      
      <ShareSheet 
        visible={shareVisible} 
        onDismiss={() => setShareVisible(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  course__screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
});
