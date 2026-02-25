import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, Button, IconButton, useTheme } from 'react-native-paper';

interface DatePickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (date: Date) => void;
  initialDate?: Date;
}

export default function DatePickerModal({ visible, onDismiss, onConfirm, initialDate }: DatePickerModalProps) {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate || null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sunday) - 6 (Saturday)
  
  // Adjust so Monday is 0, Sunday is 6
  const startOffset = (firstDayOfMonth + 6) % 7; 

  const days = useMemo(() => {
    const arr = [];
    // Previous month padding
    for (let i = 0; i < startOffset; i++) {
      arr.push(null);
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push(new Date(year, month, i));
    }
    return arr;
  }, [year, month, startOffset, daysInMonth]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onConfirm(selectedDate);
    }
    onDismiss();
  };

  const isSelected = (date: Date) => {
    return selectedDate && 
      date.getDate() === selectedDate.getDate() && 
      date.getMonth() === selectedDate.getMonth() && 
      date.getFullYear() === selectedDate.getFullYear();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
      date.getMonth() === today.getMonth() && 
      date.getFullYear() === today.getFullYear();
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.header}>
          <Text variant="titleMedium">设置开学日期</Text>
          <View style={styles.controls}>
            <IconButton icon="chevron-left" onPress={handlePrevMonth} />
            <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>{`${year}年 ${month + 1}月`}</Text>
            <IconButton icon="chevron-right" onPress={handleNextMonth} />
          </View>
        </View>

        <View style={styles.weekHeader}>
          {['一', '二', '三', '四', '五', '六', '日'].map((day, index) => (
            <Text key={index} style={[styles.weekDay, { color: theme.colors.onSurfaceVariant }]}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendar}>
          {days.map((date, index) => {
            if (!date) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }
            const selected = isSelected(date);
            const today = isToday(date);
            
            return (
              <TouchableOpacity
                key={date.getTime()}
                style={[
                  styles.dayCell,
                  selected && { backgroundColor: theme.colors.primary, borderRadius: 20 },
                  !selected && today && { borderColor: theme.colors.primary, borderWidth: 1, borderRadius: 20 }
                ]}
                onPress={() => handleSelect(date)}
              >
                <Text style={{ 
                  color: selected ? theme.colors.onPrimary : theme.colors.onSurface 
                }}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Button onPress={onDismiss}>取消</Button>
          <Button mode="contained" onPress={handleConfirm} disabled={!selectedDate}>确定</Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDay: {
    width: 30,
    textAlign: 'center',
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%', // 100% / 7
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
});
