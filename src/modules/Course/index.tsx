import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, Text, IconButton } from 'react-native-paper';
import TopTab from '@/shared/components/TopTab';
import CourseTable from './components/CourseTable';
import ShareSheet from '@/components/ShareSheet';
import DatePickerModal from '@/components/DatePickerModal';
import { getSemesterStartDate, saveSemesterStartDate } from '@/utils/semesterDate';
import analytics from '@/sdk/analytics';

export default function Course() {
  const theme = useTheme();
  const [shareVisible, setShareVisible] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('农屿课程表');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    getSemesterStartDate().then(date => {
      if (date) setStartDate(date);
    });
  }, []);

  const handleDateConfirm = (date: Date) => {
    setStartDate(date);
    saveSemesterStartDate(date);
    setDatePickerVisible(false);
  };

  return (
    <View style={[styles['course__screen'], { backgroundColor: theme.colors.background }]}>
      <TopTab />
      
      <View style={styles.header}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>{headerTitle}</Text>
        <View style={styles.actions}>
          <IconButton 
            icon="calendar-clock" 
            mode="contained-tonal"
            size={20} 
            onPress={() => setDatePickerVisible(true)} 
          />
          <IconButton 
            icon="share-variant" 
            mode="contained-tonal"
            size={20} 
            onPress={() => {
              setShareVisible(true);
              analytics.trackClick('share_button', 'CourseTable', {
                element_name: '右上角分享按钮',
                page_name: 'CourseTable'
              });
            }} 
          />
        </View>
      </View>

      <CourseTable onTitleChange={setHeaderTitle} startDate={startDate} />
      
      <ShareSheet 
        visible={shareVisible} 
        onDismiss={() => setShareVisible(false)} 
      />

      <DatePickerModal 
        visible={datePickerVisible} 
        onDismiss={() => setDatePickerVisible(false)} 
        onConfirm={handleDateConfirm}
        initialDate={startDate || new Date()} 
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
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
