import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, ActivityIndicator } from 'react-native';
import { Text, Avatar, useTheme, Appbar, Divider, ProgressBar, Surface, Icon, Snackbar, Portal, Button } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useSWR from 'swr';
import { observer } from 'mobx-react-lite';
import api from '../api';
import { profileStore } from '@/stores/profile';

type UserInfo = {
  id: string;
  nickName: string;
  realName: string | null;
  profilePicture: string;
  sex: number;
  enrollmentYear: string;
  countryName: string;
  provinceName: string;
  cityName: string;
  nativePlace: string;
};

type ActivityHour = {
  categoryId: string;
  categoryName: string;
  totalCredit: number;
  totalTitle: string;
};

type ReportCard = {
  totalPerScore: string;
  totalCreditScore: string;
  classTop: number;
  majorTop: number;
  gradeTop: number;
  schoolTop: number;
  classPeopleNum: number;
  majorPeopleNum: number;
  gradePeopleNum: number;
  schoolPeopleNum: number;
};

type ExtraPoint = {
  id: string;
  title: string;
  level: string;
  importTime: string;
  score: string;
};

type UserData = {
  userInfo: UserInfo | null;
  hoursDetail: ActivityHour[];
  reportCard: ReportCard | null;
  extraPoints: ExtraPoint[];
};

const fetcher = async (): Promise<UserData> => {
  console.log('Starting fetcher in SecondUserInfo');

  // 个人信息是核心数据，如果失败则抛出异常，触发 SWR 的 error 状态
  const fetchUserInfo = async () => {
    const url = '/user/frontPage/v1.0.0/getUserInfo';
    const res = await api.post(url);
    return res.data;
  };

  // 其他数据允许失败，失败时返回 null 或空数组
  const fetchHours = async () => {
    const url = '/act/credit/v1.0.0/getActivityHoursDetail';
    const config = { params: { hoursType: 1 } };
    try {
      const res = await api.post(url, null, config);
      return res.data;
    } catch (e: any) {
      console.error(`[Error] ${url}`, e.message);
      return null;
    }
  };

  const fetchReport = async () => {
    const url = '/act/integrate/v1.0.0/myReportCard';
    try {
      const res = await api.post(url);
      return res.data;
    } catch (e: any) {
      console.error(`[Error] ${url}`, e.message);
      return null;
    }
  };

  const fetchExtra = async () => {
    const url = '/act/credit/v1.0.0/getImportCreditDetail';
    try {
      const res = await api.post(url);
      return res.data;
    } catch (e: any) {
      console.error(`[Error] ${url}`, e.message);
      return null;
    }
  };

  const [userData, hoursData, reportData, extraData] = await Promise.all([
    fetchUserInfo(),
    fetchHours(),
    fetchReport(),
    fetchExtra()
  ]);

  const result: UserData = {
    userInfo: userData?.content || null,
    hoursDetail: hoursData?.content || [],
    reportCard: reportData?.content || null,
    extraPoints: extraData?.content || [],
  };

  // Update global profile store if user info is available
  if (result.userInfo) {
    const info = result.userInfo;
    let genderStr = '未知';
    const sexVal = Number(info.sex);
    if (sexVal === 1) genderStr = '男';
    else if (sexVal === 2) genderStr = '女';
    
    profileStore.setProfile({
      gender: genderStr,
      origin: info.nativePlace || '未知',
    });
  }

  return result;
};

function SecondUserInfo() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const { data, error, isLoading, mutate } = useSWR<UserData>(
    profileStore.profile.studentId ? `second/userInfo/${profileStore.profile.studentId}` : null,
    fetcher,
    {
      dedupingInterval: 600000, // 10分钟缓存
      revalidateOnFocus: false,
    }
  );

  const userInfo = data?.userInfo;
  const hoursDetail = data?.hoursDetail || [];
  const reportCard = data?.reportCard;
  const extraPoints = data?.extraPoints || [];

  const { width } = Dimensions.get('window');

  const renderRankItem = (label: string, rank: number, total: number) => (
    <View style={styles.rankItem}>
      <Text variant="labelSmall" style={{ color: theme.colors.outline, marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{rank}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline, marginLeft: 2 }}>/{total}</Text>
      </View>
    </View>
  );

  if (isLoading && !data) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>加载数据中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260, backgroundColor: theme.colors.primary, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, zIndex: 0 }} />
      
      <Appbar.Header style={{ backgroundColor: 'transparent', elevation: 0 }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color={theme.colors.onPrimary} />
        <Appbar.Content title="个人信息" titleStyle={{ color: theme.colors.onPrimary, fontWeight: 'bold' }} />
      </Appbar.Header>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => mutate()} tintColor={theme.colors.onPrimary} />}
        showsVerticalScrollIndicator={false}
      >
        {!!error && !data ? (
          <View style={{ padding: 20, alignItems: 'center', marginTop: 60 }}>
            <Icon source="alert-circle-outline" size={48} color={theme.colors.onPrimary} />
            <Text variant="titleMedium" style={{ color: theme.colors.onPrimary, marginTop: 16, marginBottom: 8 }}>{error.message || '获取个人信息失败'}</Text>
            <Button mode="contained-tonal" onPress={() => mutate()} style={{ marginTop: 16 }}>
              重试
            </Button>
          </View>
        ) : (
          <>
            {userInfo && (
              <View style={styles.header}>
                <View style={styles.avatarContainer}>
                  {userInfo.profilePicture ? (
                    <Avatar.Image size={84} source={{ uri: userInfo.profilePicture }} style={[styles.avatar, { borderColor: theme.colors.surface }]} />
                  ) : (
                    <Avatar.Icon size={84} icon="account" style={[styles.avatar, { borderColor: theme.colors.surface, backgroundColor: theme.colors.primaryContainer }]} />
                  )}
                  <View style={styles.userInfoText}>
                <Text variant="headlineSmall" style={[styles.name, { color: theme.colors.onPrimary }]}>{userInfo.realName || userInfo.nickName || '未命名'}</Text>
                <View style={styles.tagContainer}>
                  <View style={[styles.tag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={[styles.tagText, { color: theme.colors.onPrimary }]}>{userInfo.enrollmentYear}级</Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={[styles.tagText, { color: theme.colors.onPrimary }]}>{userInfo.id}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            {reportCard && (
              <Surface style={[styles.statsCard, { backgroundColor: theme.colors.surface }]} elevation={4}>
                <View style={styles.scoreRow}>
                  <View style={styles.scoreItem}>
                    <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{reportCard.totalCreditScore}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>累计学分</Text>
                  </View>
                  <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                  <View style={styles.scoreItem}>
                    <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{reportCard.totalPerScore}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>综测得分</Text>
                  </View>
                </View>
                <Divider style={{ marginVertical: 16, backgroundColor: theme.colors.outlineVariant }} />
                <View style={styles.rankRow}>
                  {renderRankItem('班级排名', reportCard.classTop, reportCard.classPeopleNum)}
                  {renderRankItem('专业排名', reportCard.majorTop, reportCard.majorPeopleNum)}
                  {renderRankItem('年级排名', reportCard.gradeTop, reportCard.gradePeopleNum)}
                  {renderRankItem('全校排名', reportCard.schoolTop, reportCard.schoolPeopleNum)}
                </View>
              </Surface>
            )}
          </View>
        )}

        {hoursDetail.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Icon source="chart-pie" size={20} color={theme.colors.primary} />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>学分分布</Text>
            </View>
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
              {hoursDetail.map((item, index) => (
                <View key={item.categoryId} style={styles.distributionItem}>
                  <View style={styles.distributionHeader}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{item.categoryName}</Text>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>{item.totalCredit} <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontWeight: 'normal' }}>学时</Text></Text>
                  </View>
                  <ProgressBar progress={Math.min(item.totalCredit / 20, 1)} color={theme.colors.primary} style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]} />
                  {index < hoursDetail.length - 1 && <Divider style={{ marginTop: 16, backgroundColor: theme.colors.surfaceVariant }} />}
                </View>
              ))}
            </Surface>
          </View>
        )}

        {extraPoints.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Icon source="star" size={20} color={theme.colors.primary} />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>附加分记录</Text>
            </View>
            <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
              {extraPoints.map((item, index) => (
                <View key={item.id} style={styles.extraPointItem}>
                  <View style={styles.extraPointHeader}>
                    <Text variant="titleMedium" numberOfLines={1} style={[styles.extraPointTitle, { color: theme.colors.onSurface }]}>{item.title}</Text>
                    <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>+{item.score}</Text>
                  </View>
                  <View style={styles.extraPointSub}>
                    <View style={[styles.chipContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
                      <Text style={[styles.chipText, { color: theme.colors.onSecondaryContainer }]}>{item.level}</Text>
                    </View>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{item.importTime}</Text>
                  </View>
                  {index < extraPoints.length - 1 && <Divider style={{ marginVertical: 12, backgroundColor: theme.colors.surfaceVariant }} />}
                </View>
              ))}
            </Surface>
          </View>
        )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    paddingTop: 0,
  },
  header: {
    marginBottom: 24,
    marginTop: 10,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  avatar: {
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 4,
  },
  userInfoText: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
  },
  rankRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  rankItem: {
    alignItems: 'center',
    width: '50%',
    marginBottom: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  distributionItem: {
    marginVertical: 6,
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f0f0f0',
  },
  extraPointItem: {
    marginVertical: 4,
  },
  extraPointHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  extraPointTitle: {
    flex: 1,
    marginRight: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  extraPointSub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipContainer: {
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 11,
    color: '#2196f3',
  },
});

export default observer(SecondUserInfo);
