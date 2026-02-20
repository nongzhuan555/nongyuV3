import React, { useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Surface, Button, ActivityIndicator, useTheme, Divider, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanExamHtml, ExamItem } from '@/jiaowu/jiaowuInfo/examInfo';
import { fetchAndCleanWithRetry } from '@/jiaowu/utils/retry';
import { profileStore } from '@/stores/profile';
import { observer } from 'mobx-react-lite';
import useSWR from 'swr';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { addEventToCalendar } from '@/utils/calendar';

const EXAM_STORAGE_KEY = 'app:exam:cache';

const fetcher = async () => {
  return await fetchAndCleanWithRetry(
    'https://jiaowu.sicau.edu.cn/xuesheng/kao/kao/xuesheng.asp?title_id1=01',
    (html) => cleanExamHtml(html),
    (data) => !data.list || data.list.length === 0,
    '考试安排'
  );
};

const getDaysUntilExam = (examTime?: string) => {
  if (!examTime) return null;
  const dateMatch = examTime.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (!dateMatch) return null;
  
  const examDate = new Date(
    parseInt(dateMatch[1]), 
    parseInt(dateMatch[2]) - 1, 
    parseInt(dateMatch[3])
  );
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = examDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

const ExamCard = ({ exam, theme, compact = false }: { exam: ExamItem, theme: any, compact?: boolean }) => {
  const daysLeft = getDaysUntilExam(exam.examTime);
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
  const isPassed = daysLeft !== null && daysLeft < 0;

  // 尝试解析日期和时间
  const dateMatch = exam.examTime?.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  const dateDisplay = dateMatch ? `${dateMatch[2]}月${dateMatch[3]}日` : (exam.examTime || '时间待定');
  
  const timeMatch = exam.examTime?.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
  let timeDisplay = '';
  if (timeMatch) {
    timeDisplay = `${timeMatch[1]}-${timeMatch[2]}`;
  } else if (dateMatch && exam.examTime && dateDisplay !== exam.examTime) {
     timeDisplay = exam.examTime.replace(dateMatch[0], '').trim();
  }

  const statusDisplay = exam.assessmentMethod || exam.examStatus;
  
  // 样式变量
  const cardBg = isPassed ? theme.colors.surfaceVariant : theme.colors.surface;
  const textColor = isPassed ? theme.colors.onSurfaceDisabled : theme.colors.onSurface;
  const subTextColor = isPassed ? theme.colors.onSurfaceDisabled : theme.colors.onSurfaceVariant;

  const handleAddToCalendar = async () => {
    if (!dateMatch || !timeMatch) {
      Alert.alert('无法添加', '考试时间格式无法解析，请手动添加');
      return;
    }
    
    const year = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]) - 1;
    const day = parseInt(dateMatch[3]);
    
    const [startStr, endStr] = [timeMatch[1], timeMatch[2]];
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    
    const startDate = new Date(year, month, day, startH, startM);
    const endDate = new Date(year, month, day, endH, endM);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        Alert.alert('无法添加', '时间解析错误');
        return;
    }

    await addEventToCalendar(
      `${exam.courseName} 考试`,
      startDate,
      endDate,
      exam.examRoom,
      `座位号: ${exam.seatNumber || '未知'}\n考核方式: ${exam.assessmentMethod || '未知'}`
    );
  };

  return (
    <Surface style={[styles.card, { backgroundColor: cardBg, opacity: isPassed ? 0.8 : 1, padding: compact ? 8 : 10, marginBottom: compact ? 8 : 8 }]} elevation={isPassed ? 0 : 1}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.courseName, { color: textColor, fontSize: compact ? 13 : 14 }]}>
            {exam.courseName}
          </Text>
          {!isPassed && (
             <IconButton 
               icon="calendar-plus" 
               size={16} 
               iconColor={theme.colors.primary}
               onPress={handleAddToCalendar}
               style={{ margin: 0, width: 18, height: 18 }}
             />
          )}
        </View>

        {daysLeft !== null && !isPassed ? (
          <View style={[
            styles.statusBadge, 
            { backgroundColor: isUrgent ? theme.colors.errorContainer : theme.colors.primaryContainer }
          ]}>
            <Text style={{ 
              color: isUrgent ? theme.colors.error : theme.colors.primary,
              fontSize: 10,
              fontWeight: 'bold'
            }}>
              {daysLeft === 0 ? '今天' : `剩${daysLeft}天`}
            </Text>
          </View>
        ) : isPassed ? (
          <View style={[styles.statusBadge, { backgroundColor: theme.colors.surfaceDisabled }]}>
            <Text style={{ color: theme.colors.onSurfaceDisabled, fontSize: 10 }}>已结束</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="clock-outline" size={12} color={subTextColor} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: subTextColor, fontSize: 11 }]}>
            {dateDisplay} {timeDisplay}
          </Text>
        </View>
        
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="map-marker-outline" size={12} color={subTextColor} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: subTextColor, fontSize: 11 }]} numberOfLines={1}>
            {exam.examRoom || '地点待定'}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="seat-outline" size={12} color={subTextColor} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: subTextColor, fontSize: 11 }]}>
            座位: {exam.seatNumber || '--'}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="file-document-edit-outline" size={12} color={subTextColor} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: subTextColor, fontSize: 11 }]}>
            {statusDisplay || '未知'}
          </Text>
        </View>
      </View>
    </Surface>
  );
};

const UpcomingExam = ({ exam, theme }: { exam: ExamItem, theme: any }) => {
  if (!exam) return null;
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <MaterialCommunityIcons name="fire" size={16} color={theme.colors.error} />
        <Text style={{ marginLeft: 4, color: theme.colors.error, fontWeight: 'bold', fontSize: 12 }}>近期考试</Text>
      </View>
      <ExamCard exam={exam} theme={theme} />
    </View>
  );
};

const ExamSummary = ({ exams, theme }: { exams: ExamItem[], theme: any }) => {
  const stats = useMemo(() => {
    const total = exams.length;
    // 简单判断线上/线下：包含“机”、“网”、“线”字样的视为线上，否则为线下
    const online = exams.filter(e => {
      const method = e.assessmentMethod || '';
      const room = e.examRoom || '';
      return method.includes('机') || method.includes('网') || method.includes('线') || room.includes('机房');
    }).length;
    const offline = total - online;
    return { total, online, offline };
  }, [exams]);

  if (stats.total === 0) return null;

  return (
    <LinearGradient
      colors={[theme.colors.primaryContainer, theme.colors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.summaryContainer}
    >
      <View style={styles.summaryContent}>
        <View style={[styles.summaryIconBox, { backgroundColor: theme.colors.primary }]}>
          <MaterialCommunityIcons name="school-outline" size={24} color={theme.colors.onPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
            本期末你需要考 <Text style={{ color: theme.colors.primary, fontSize: 18 }}>{stats.total}</Text> 门课
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            其中 <Text style={{ fontWeight: 'bold' }}>{stats.online}</Text> 门线上，<Text style={{ fontWeight: 'bold' }}>{stats.offline}</Text> 门线下
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.secondary, marginTop: 4, fontStyle: 'italic' }}>
            祝您逢考必过~
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const ExamSchedule = observer(() => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [cachedData, setCachedData] = useState<any>(undefined);
  const [checkingStorage, setCheckingStorage] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(EXAM_STORAGE_KEY).then(json => {
      if (json) {
        try {
          setCachedData(JSON.parse(json));
        } catch {}
      }
      setCheckingStorage(false);
    });
  }, []);

  const { data, error, isLoading: swrLoading, mutate } = useSWR(
    !checkingStorage && profileStore.profile.studentId ? `jiaowu/exam/${profileStore.profile.studentId}` : null,
    fetcher,
    {
      dedupingInterval: 600000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      fallbackData: cachedData || undefined,
      revalidateIfStale: !cachedData,
      revalidateOnMount: !cachedData,
      onSuccess: (d) => {
        if (d) AsyncStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(d));
      }
    }
  );
  
  const isLoading = swrLoading || checkingStorage;

  const examList = (data?.list || []) as ExamItem[];
  
  // 排序：未考的在前（按时间正序），已考的在后（按时间倒序）
  const sortedExams = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const parseDate = (timeStr?: string) => {
      if (!timeStr) return null;
      const match = timeStr.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
      if (!match) return null;
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    };

    const future: ExamItem[] = [];
    const past: ExamItem[] = [];

    examList.forEach(exam => {
      const date = parseDate(exam.examTime);
      if (date && date < now) {
        past.push(exam);
      } else {
        future.push(exam);
      }
    });

    // 未考的按时间正序
    future.sort((a, b) => {
      const da = parseDate(a.examTime);
      const db = parseDate(b.examTime);
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });

    // 已考的按时间倒序
    past.sort((a, b) => {
      const da = parseDate(a.examTime);
      const db = parseDate(b.examTime);
      if (!da || !db) return 0;
      return db.getTime() - da.getTime();
    });

    return [...future, ...past];
  }, [examList]);

  const upcomingExam = useMemo(() => {
    if (sortedExams.length === 0) return null;
    const first = sortedExams[0];
    const days = getDaysUntilExam(first.examTime);
    if (days !== null && days >= 0) {
        return first;
    }
    return null;
  }, [sortedExams]);

  const onRefresh = React.useCallback(() => {
    mutate();
  }, [mutate]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
      >
        {examList.length > 0 && <ExamSummary exams={examList} theme={theme} />}
        
        {upcomingExam && <UpcomingExam exam={upcomingExam} theme={theme} />}

        <View style={styles.listContainer}>
          {sortedExams.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
               <MaterialCommunityIcons name="format-list-bulleted" size={16} color={theme.colors.primary} />
               <Text style={{ marginLeft: 4, color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}>
                 所有考试（按时间由近到远排序）
               </Text>
            </View>
          )}
          {sortedExams.map((exam, index) => (
            <ExamCard key={`${exam.courseName}-${index}`} exam={exam} theme={theme} compact={true} />
          ))}
          
          {sortedExams.length === 0 && !isLoading && (
            <View style={styles.emptyContainer}>
               <MaterialCommunityIcons name="calendar-check-outline" size={60} color={theme.colors.surfaceVariant} />
               <Text style={{ textAlign: 'center', marginTop: 16, color: theme.colors.outline }}>
                 暂无考试安排
               </Text>
               <Button mode="text" onPress={() => mutate()} style={{ marginTop: 10 }}>刷新试试</Button>
            </View>
          )}

          {isLoading && !data && (
             <ActivityIndicator animating={true} size="large" style={{ marginTop: 50 }} />
          )}
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  summaryContainer: {
    padding: 20,
    marginBottom: 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  card: {
    borderRadius: 16,
    marginBottom: 12,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseName: {
    flex: 1,
    fontWeight: 'bold',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4, 
  },
  infoItem: {
    width: '50%', 
    paddingHorizontal: 4,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 4,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
  },
});

export default ExamSchedule;
