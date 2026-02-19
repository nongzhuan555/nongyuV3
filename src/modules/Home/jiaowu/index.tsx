import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme, Surface, Icon, TouchableRipple, Appbar } from 'react-native-paper';
import JiaowuLoginProbe from '@/modules/Profile/components/JiaowuLoginProbe';
import { observer } from 'mobx-react-lite';
import { profileStore } from '@/stores/profile';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    key: 'course', 
    label: '课表导入', 
    sub: '一键导入课程表到日历',
    page: 'course', 
    disabled: true,
    icon: 'calendar-import',
    color: '#9E9E9E',
    bgColor: '#F5F5F5'
  },
  { 
    key: 'exam', 
    label: '考试安排', 
    sub: '期末考试时间地点查询',
    page: 'exam', 
    disabled: true,
    icon: 'calendar-clock',
    color: '#9E9E9E',
    bgColor: '#F5F5F5'
  },
] as const;

const JiaowuHome = observer(() => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const logged = !!profileStore.profile?.studentId?.trim();
  const theme = useTheme();

  const handlePress = (item: typeof SERVICES[number]) => {
    if (item.disabled) return;
    
    // 如果未登录且不是教务通知或竞赛通知，提示登录（虽然 UI 上已经显示锁定，但防止误触）
    if (!logged && item.key !== 'notice' && item.key !== 'competition') {
      return;
    }

    if (item.page === 'progress') navigation.navigate('JiaowuProgress' as never);
    if (item.page === 'rank') navigation.navigate('JiaowuRank' as never);
    if (item.page === 'score') navigation.navigate('JiaowuScore' as never);
    if (item.page === 'notice') navigation.navigate('JiaowuNotice' as never);
    if (item.page === 'competition') navigation.navigate('JiaowuCompetition' as never);
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
