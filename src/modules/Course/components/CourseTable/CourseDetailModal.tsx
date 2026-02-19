import React, { useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, Easing, Pressable } from 'react-native';
import { Portal, Text, Button, IconButton, useTheme, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TodoList from '../TodoList';
import { CourseEntry, AttendanceRecord } from './types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  visible: boolean;
  course: CourseEntry | null;
  attendance: AttendanceRecord;
  onClose: () => void;
  onDelete: () => void;
  onUpdateAttendance: (type: keyof AttendanceRecord, delta: number) => void;
};

export default function CourseDetailModal({ visible, course, attendance, onClose, onDelete, onUpdateAttendance }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!course && !visible) return null;

  const renderCounter = (label: string, type: keyof AttendanceRecord, color: string, icon: string) => (
    <View style={styles.counterContainer}>
      <Text style={[styles.counterLabel, { color }]}>{label}</Text>
      <View style={[styles.counterBox, { borderColor: color + '40', backgroundColor: color + '10' }]}>
        <TouchableOpacity onPress={() => onUpdateAttendance(type, -1)} disabled={attendance[type] <= 0}>
          <MaterialCommunityIcons name="minus" size={20} color={attendance[type] <= 0 ? theme.colors.disabled : color} />
        </TouchableOpacity>
        <Text style={[styles.counterValue, { color }]}>{attendance[type]}</Text>
        <TouchableOpacity onPress={() => onUpdateAttendance(type, 1)}>
          <MaterialCommunityIcons name="plus" size={20} color={color} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Portal>
      {/* 背景遮罩 */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { backgroundColor: 'rgba(0,0,0,0.5)', opacity: fadeAnim }
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* 弹窗内容 */}
      <Animated.View
        style={[
          styles.modalContainer,
          { transform: [{ translateY: slideAnim }] }
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.handleBar} />
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.courseName}>{course?.name}</Text>
            <View style={styles.tagsRow}>
              {!!course?.room && (
                <View style={styles.tag}>
                  <MaterialCommunityIcons name="map-marker-outline" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text style={styles.tagText}>{course.room}</Text>
                </View>
              )}
              {!!course?.teacher && (
                <View style={styles.tag}>
                  <MaterialCommunityIcons name="account-outline" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text style={styles.tagText}>{course.teacher}</Text>
                </View>
              )}
              <View style={styles.tag}>
                <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.tagText}>周{course?.day} {course?.startPeriod}-{course?.endPeriod}节</Text>
              </View>
              {course?.isCustom && (
                 <View style={[styles.tag, { backgroundColor: theme.colors.primaryContainer }]}>
                   <Text style={[styles.tagText, { color: theme.colors.onPrimaryContainer }]}>自定义</Text>
                 </View>
              )}
            </View>
          </View>
          <IconButton icon="close" size={24} onPress={onClose} style={{ margin: 0 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* 非自定义课程显示考勤和待办 */}
          {!course?.isCustom && (
            <>
              {/* 考勤区域 */}
              <Surface style={styles.sectionCard} elevation={0}>
                <Text style={styles.sectionTitle}>考勤记录</Text>
                <View style={styles.attendanceRow}>
                  {renderCounter('签到', 'present', '#4CAF50', 'check')}
                  {renderCounter('迟到', 'late', '#FF9800', 'clock-alert')}
                  {renderCounter('旷课', 'absent', '#F44336', 'close')}
                </View>
              </Surface>

              {/* 待办区域 */}
              <Surface style={styles.sectionCard} elevation={0}>
                <TodoList embedded courseId={course?.name} style={{ flex: 0 }} />
              </Surface>
            </>
          )}

          {/* 操作区域 */}
          <Button 
            mode="outlined" 
            textColor={theme.colors.error} 
            style={styles.deleteBtn} 
            icon="delete-outline"
            onPress={onDelete}
          >
            删除课程
          </Button>
        </ScrollView>
      </Animated.View>
    </Portal>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    modalContainer: {
      position: 'absolute',
      bottom: 0,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      maxHeight: SCREEN_HEIGHT * 0.85,
      minHeight: SCREEN_HEIGHT * 0.5,
      width: '100%',
      alignSelf: 'center',
    },
    handleBar: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.outlineVariant,
      alignSelf: 'center',
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    courseName: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginBottom: 8,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    tagText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    content: {
      paddingHorizontal: 20,
    },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant + '40', // Very subtle border
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: 12,
    },
    attendanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    counterContainer: {
      flex: 1,
      alignItems: 'center',
    },
    counterLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    counterBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      paddingHorizontal: 4,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
    },
    counterValue: {
      fontSize: 16,
      fontWeight: 'bold',
      minWidth: 20,
      textAlign: 'center',
    },
    deleteBtn: {
      borderColor: theme.colors.error,
      marginTop: 8,
      marginBottom: 20,
    },
  });
}
