import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { Button, Text, ActivityIndicator, useTheme, ProgressBar, IconButton, Surface } from 'react-native-paper';
import { cleanProgressHtml } from '@/jiaowu/jiaowuInfo/progressInfo';
import { fetchAndCleanWithRetry } from '@/jiaowu/utils/retry';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { observer } from 'mobx-react-lite';
import { profileStore } from '@/stores/profile';
import useSWR from 'swr';

type ProgressItem = {
  group?: string;
  category?: string;
  requiredCredits?: string;
  earnedCredits?: string;
  diffCredits?: string;
  carryCredits?: string;
  progress?: string;
};

type ProgressMeta = {
  majorClass?: string;
  name?: string;
  studentId?: string;
};

const fetcher = async () => {
  return await fetchAndCleanWithRetry(
    'https://jiaowu.sicau.edu.cn/xuesheng/chengji/xdjd/xuefen_2023.asp?title_id1=1',
    (html) => cleanProgressHtml(html),
    (data) => !data.list || data.list.length === 0,
    '学业进度'
  );
};

const ProgressList = observer(() => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const { data, error, isLoading, mutate } = useSWR(
    profileStore.profile.studentId ? `jiaowu/progress/${profileStore.profile.studentId}` : null,
    fetcher,
    {
      dedupingInterval: 600000, // 10分钟缓存
      revalidateOnFocus: false,
    }
  );

  const list = (data?.list || []) as ProgressItem[];
  const meta = (data?.meta || {}) as ProgressMeta;

  const { overallItem, items } = useMemo(() => {
    if (list.length === 0) return { overallItem: null, items: [] };
    const last = list[list.length - 1];
    const isTotal = last.group?.includes('总') || last.category?.includes('总') || last.group?.includes('Total');
    
    if (isTotal || list.length > 1) {
       return {
         overallItem: list[list.length - 1],
         items: list.slice(0, -1)
       };
    }
    return { overallItem: null, items: list };
  }, [list]);

  const parseProgress = (p?: string) => {
    if (!p) return 0;
    const num = parseFloat(p.replace('%', ''));
    return isNaN(num) ? 0 : Math.min(Math.max(num / 100, 0), 1);
  };

  // 使用 store 中的数据作为兜底
  const displayMeta = {
    name: meta.name || profileStore.profile.name || '同学',
    studentId: meta.studentId || profileStore.profile.studentId || '加载中...',
    majorClass: meta.majorClass || profileStore.profile.major || '',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 56 + insets.top }]}>
        <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
        <Text style={styles.navTitle}>学业进度</Text>
        <View style={{ width: 48 }} /> 
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={mutate} colors={[theme.colors.primary]} />}
      >
        <Surface style={styles.headerCard} elevation={4}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBg}
          >
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerName}>{displayMeta.name}</Text>
                <Text style={styles.headerId}>{displayMeta.studentId}</Text>
                <Text style={styles.headerMajor}>{displayMeta.majorClass}</Text>
              </View>
              <View style={styles.headerProgress}>
                <Text style={styles.headerProgressValue}>
                  {overallItem?.progress || '0%'}
                </Text>
                <Text style={styles.headerProgressLabel}>总进度</Text>
              </View>
            </View>
            {overallItem && (
               <View style={styles.headerStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{overallItem.earnedCredits}</Text>
                    <Text style={styles.statLabel}>已修学分</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{overallItem.requiredCredits}</Text>
                    <Text style={styles.statLabel}>应修学分</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{overallItem.diffCredits}</Text>
                    <Text style={styles.statLabel}>相差学分</Text>
                  </View>
               </View>
            )}
          </LinearGradient>
        </Surface>

        {!!error && (
          <View style={styles.errorContainer}>
            <Text style={{ color: theme.colors.error }}>{error.message || '获取学业进度失败'}</Text>
            <Button mode="text" onPress={() => mutate()}>重试</Button>
          </View>
        )}

        {items.length === 0 && !isLoading && !error && (
          <View style={styles.emptyContainer}>
            <Text style={{ color: theme.colors.outline }}>暂无数据</Text>
          </View>
        )}

        {items.length === 0 && isLoading && (
          <View style={styles.loadingContainer}>
             <ActivityIndicator size="large" />
             <Text style={{ color: theme.colors.outline, marginTop: 10 }}>正在加载学业进度...</Text>
          </View>
        )}

        <View style={styles.listContainer}>
          {items.map((item, idx) => {
            const progressVal = parseProgress(item.progress);
            return (
              <Surface key={idx} style={[styles.itemCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemCategory, { color: theme.colors.onSurface }]}>
                    {item.category || item.group || '未知分类'}
                  </Text>
                  <Text style={[styles.itemProgressText, { color: theme.colors.primary }]}>
                    {item.progress}
                  </Text>
                </View>
                
                <ProgressBar 
                  progress={progressVal} 
                  color={theme.colors.primary} 
                  style={styles.progressBar} 
                />

                <View style={styles.itemStats}>
                  <View style={styles.itemStatBlock}>
                    <Text style={[styles.itemStatLabel, { color: theme.colors.outline }]}>应修</Text>
                    <Text style={[styles.itemStatValue, { color: theme.colors.onSurface }]}>{item.requiredCredits}</Text>
                  </View>
                  <View style={styles.itemStatBlock}>
                    <Text style={[styles.itemStatLabel, { color: theme.colors.outline }]}>已修</Text>
                    <Text style={[styles.itemStatValue, { color: theme.colors.onSurface }]}>{item.earnedCredits}</Text>
                  </View>
                   <View style={styles.itemStatBlock}>
                    <Text style={[styles.itemStatLabel, { color: theme.colors.outline }]}>未修</Text>
                    <Text style={[styles.itemStatValue, { color: theme.colors.error }]}>{item.diffCredits}</Text>
                  </View>
                </View>
                
                {item.group && item.group !== item.category && (
                  <Text style={[styles.itemGroup, { color: theme.colors.outline }]}>{item.group}</Text>
                )}
              </Surface>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
});

export default ProgressList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  gradientBg: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerId: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  headerMajor: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  headerProgress: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  headerProgressValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerProgressLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  listContainer: {
    gap: 12,
  },
  itemCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemCategory: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemProgressText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  itemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemStatBlock: {
    alignItems: 'flex-start',
  },
  itemStatLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  itemStatValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemGroup: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
});
