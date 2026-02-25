import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { Button, Text, useTheme, Surface, Icon, TouchableRipple, Appbar, Portal, Dialog, TextInput } from 'react-native-paper';
import JiaowuLoginProbe from '@/modules/Profile/components/JiaowuLoginProbe';
import { observer } from 'mobx-react-lite';
import { profileStore } from '@/stores/profile';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchCourseSchedule } from '@/jiaowu/course/schedule';
import { normalizeCourses, COURSE_TIMES } from '@/utils/courseParser';
import { addEventToCalendar } from '@/utils/calendar';
import analytics from '@/sdk/analytics';

// 教务入口配置
const SERVICES = [
  { 
    key: 'notice', 
    label: '教务通知', 
    sub: '最新的教务处通知公告',
    page: 'notice', 
    disabled: false,
    icon: 'bell-outline',
    color: '#E91E63',
    bgColor: '#FCE4EC'
  },
  { 
    key: 'competition', 
    label: '竞赛通知', 
    sub: '各类学科竞赛报名通知',
    page: 'competition', 
    disabled: false,
    icon: 'trophy-outline',
    color: '#FFC107',
    bgColor: '#FFF8E1'
  },
  { 
    key: 'progress', 
    label: '学业进度', 
    sub: '查看培养方案完成情况',
    page: 'progress', 
    disabled: false,
    icon: 'school-outline',
    color: '#7E57C2',
    bgColor: '#EDE7F6'
  },
  { 
    key: 'score', 
    label: '成绩查询', 
    sub: '历年学期成绩单查询',
    page: 'score', 
    disabled: false,
    icon: 'file-document-edit-outline',
    color: '#2196F3',
    bgColor: '#E3F2FD'
  },
  { 
    key: 'rank', 
    label: '成绩排名', 
    sub: '专业/班级排名概览',
    page: 'rank', 
    disabled: false,
    icon: 'chart-bar',
    color: '#FF9800',
    bgColor: '#FFF3E0'
  },
  { 
    key: 'exam', 
    label: '考试安排', 
    sub: '期末考试时间地点查询',
    page: 'exam', 
    disabled: false,
    icon: 'calendar-clock',
    color: '#009688',
    bgColor: '#E0F2F1'
  },
] as const;

const JiaowuHome = observer(() => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const logged = !!profileStore.profile?.studentId?.trim();
  const theme = useTheme();

  const [importDialogVisible, setImportDialogVisible] = useState(false);
  const [currentWeekInput, setCurrentWeekInput] = useState('1');
  const [importing, setImporting] = useState(false);

  const handlePress = (item: typeof SERVICES[number]) => {
    if (item.disabled) return;
    
    analytics.trackClick(item.key, 'JiaowuHome', {
      element_name: item.label,
      page_name: 'JiaowuHome',
    });

    // 如果未登录且不是教务通知或竞赛通知，提示登录（虽然 UI 上已经显示锁定，但防止误触）
    if (!logged && item.key !== 'notice' && item.key !== 'competition') {
      return;
    }

    if (item.page === 'progress') navigation.navigate('JiaowuProgress' as never);
    if (item.page === 'rank') navigation.navigate('JiaowuRank' as never);
    if (item.page === 'score') navigation.navigate('JiaowuScore' as never);
    if (item.page === 'notice') navigation.navigate('JiaowuNotice' as never);
    if (item.page === 'competition') navigation.navigate('JiaowuCompetition' as never);
    if (item.page === 'exam') navigation.navigate('JiaowuExam' as never);
    if (item.page === 'course') {
        setImportDialogVisible(true);
    }
  };

  const handleImportConfirm = async () => {
    analytics.trackClick('confirm_import_course', 'JiaowuHome', {
      element_name: '确认导入课表',
      page_name: 'JiaowuHome',
    });
    const currentWeek = parseInt(currentWeekInput);
      if (isNaN(currentWeek) || currentWeek < 1 || currentWeek > 25) {
        Alert.alert('错误', '请输入有效的周次（1-25）');
        return;
      }
      
      setImporting(true);
      try {
        const data = await fetchCourseSchedule();
        if (!data || !data.grid) {
          Alert.alert('错误', '无法获取课表数据');
          return;
        }
        
        const { courses } = normalizeCourses(data.grid);
        if (courses.length === 0) {
          Alert.alert('提示', '本学期没有课程');
          return;
        }
        
        // Calculate semester start date based on current week
        // Monday of THIS week
        const today = new Date();
        const day = today.getDay() === 0 ? 7 : today.getDay();
        const diff = today.getDate() - day + 1; 
        const currentMonday = new Date(today.getFullYear(), today.getMonth(), diff);
        
        // Semester start date (Monday of Week 1)
        const semesterStart = new Date(currentMonday);
        semesterStart.setDate(semesterStart.getDate() - (currentWeek - 1) * 7);
        
        let count = 0;
        
        for (const course of courses) {
            let weeksToSchedule: number[] = [];
            if (course.weeksList && course.weeksList.length > 0) {
                weeksToSchedule = course.weeksList;
            } else {
                for (let w = course.weeks.start; w <= course.weeks.end; w++) {
                    if (course.odd && w % 2 === 0) continue;
                    if (course.even && w % 2 !== 0) continue;
                    weeksToSchedule.push(w);
                }
            }
            
            for (const w of weeksToSchedule) {
                const sessionDate = new Date(semesterStart);
                sessionDate.setDate(semesterStart.getDate() + (w - 1) * 7 + (course.day - 1));
                
                const startT = COURSE_TIMES[course.startPeriod - 1];
                const endT = COURSE_TIMES[course.endPeriod - 1];
                
                if (!startT || !endT) continue;
                
                const [sh, sm] = startT.start.split(':').map(Number);
                const [eh, em] = endT.end.split(':').map(Number);
                
                const startDate = new Date(sessionDate);
                startDate.setHours(sh, sm, 0, 0);
                
                const endDate = new Date(sessionDate);
                endDate.setHours(eh, em, 0, 0);
                
                await addEventToCalendar(
                    course.name,
                    startDate,
                    endDate,
                    course.room,
                    `教师: ${course.teacher}\n周次: ${w}`
                );
                count++;
            }
        }
        
        Alert.alert('导入成功', `已将 ${count} 节课程导入系统日历`);
        setImportDialogVisible(false);
      } catch (e) {
        console.error(e);
        Alert.alert('错误', '导入失败，请稍后重试');
      } finally {
        setImporting(false);
      }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 顶部背景区域 */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220, backgroundColor: theme.colors.primary, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }} />

      <Appbar.Header style={{ backgroundColor: 'transparent', elevation: 0 }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color={theme.colors.onPrimary} />
        <Appbar.Content title="" />
      </Appbar.Header>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingTop: 0 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerTitleContainer}>
          <Text variant="displaySmall" style={[styles.headerTitle, { color: theme.colors.onPrimary }]}>教务系统</Text>
          <Text variant="bodyMedium" style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>查成绩、看课表、掌握学业进度</Text>
        </View>

        {!logged && (
          <Surface style={[styles.loginCard, { marginBottom: 20, backgroundColor: theme.colors.surface }]} elevation={2}>
            <View style={styles.loginContent}>
              <Icon source="account-lock" size={48} color={theme.colors.primary} />
              <Text variant="titleMedium" style={[styles.loginTitle, { color: theme.colors.onSurface }]}>请先登录教务系统</Text>
              <Text variant="bodySmall" style={[styles.loginSub, { color: theme.colors.onSurfaceVariant }]}>登录后即可访问所有教务服务</Text>
              <View style={styles.loginProbeContainer}>
                <JiaowuLoginProbe suppressSuccessNavigate />
              </View>
            </View>
          </Surface>
        )}

        <View style={styles.grid}>
          {SERVICES.map((item) => {
            const isLocked = !logged && item.key !== 'notice' && item.key !== 'competition';
            const isDisabled = item.disabled || isLocked;

            return (
              <Surface 
                key={item.key} 
                style={[
                  styles.cardContainer, 
                  { backgroundColor: theme.colors.surface }, 
                  isDisabled && { backgroundColor: theme.colors.surfaceDisabled, opacity: 0.8 }
                ]} 
                elevation={isDisabled ? 0 : 2}
              >
                <TouchableRipple 
                  style={styles.cardTouchable} 
                  onPress={() => handlePress(item)}
                  rippleColor="rgba(0, 0, 0, 0.05)"
                  disabled={item.disabled} 
                >
                  <View style={styles.cardContent}>
                    <View style={[styles.iconContainer, { backgroundColor: isLocked ? theme.colors.surfaceDisabled : item.bgColor }]}>
                      <Icon source={isLocked ? 'lock' : item.icon} size={28} color={isLocked ? theme.colors.onSurfaceDisabled : item.color} />
                    </View>
                    <View style={styles.textContainer}>
                      <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }, isDisabled && { color: theme.colors.onSurfaceDisabled }]}>{item.label}</Text>
                      <Text variant="bodySmall" style={[styles.cardSub, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
                        {item.disabled ? '即将上线' : (isLocked ? '请先登录' : item.sub)}
                      </Text>
                    </View>
                    <View style={styles.arrowContainer}>
                      {!isDisabled && <Icon source="chevron-right" size={20} color={theme.colors.outline} />}
                    </View>
                  </View>
                </TouchableRipple>
              </Surface>
            );
          })}
        </View>
        
        <View style={styles.footer}>
           <Text variant="bodySmall" style={[styles.footerText, { color: theme.colors.onSurfaceDisabled }]}>© Sichuan Agricultural University</Text>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={importDialogVisible} onDismiss={() => !importing && setImportDialogVisible(false)}>
            <Dialog.Title>导入课表到日历</Dialog.Title>
            <Dialog.Content>
                <Text variant="bodyMedium" style={{marginBottom: 10}}>
                    我们将把您的所有课程添加到手机系统日历中。为了确保日期准确，请告诉我们当前是第几周？
                </Text>
                <TextInput
                    label="当前周次"
                    value={currentWeekInput}
                    onChangeText={setCurrentWeekInput}
                    keyboardType="numeric"
                    mode="outlined"
                    disabled={importing}
                />
            </Dialog.Content>
            <Dialog.Actions>
                <Button onPress={() => setImportDialogVisible(false)} disabled={importing}>取消</Button>
                <Button onPress={handleImportConfirm} loading={importing} disabled={importing}>开始导入</Button>
            </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
});

export default JiaowuHome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitleContainer: {
    marginBottom: 30,
    marginTop: 10,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
  },
  grid: {
    gap: 16,
  },
  cardContainer: {
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  cardDisabled: {
    backgroundColor: '#f9f9f9',
    opacity: 0.8,
  },
  cardTouchable: {
    padding: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  cardSub: {
    color: '#888',
    lineHeight: 18,
  },
  arrowContainer: {
    justifyContent: 'center',
  },
  loginCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
  },
  loginContent: {
    alignItems: 'center',
    width: '100%',
  },
  loginTitle: {
    marginTop: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  loginSub: {
    marginTop: 4,
    color: '#666',
    marginBottom: 24,
  },
  loginProbeContainer: {
    width: '100%',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    opacity: 0.5,
  }
});
