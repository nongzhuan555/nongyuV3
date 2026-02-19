import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Button, Text, ActivityIndicator, useTheme, Appbar, Surface, Icon, Divider } from 'react-native-paper';
import { cleanRankHtml } from '@/jiaowu/jiaowuInfo/rankInfo';
import { fetchAndCleanWithRetry } from '@/jiaowu/utils/retry';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileStore } from '@/stores/profile';
import { observer } from 'mobx-react-lite';
import useSWR from 'swr';
import { LinearGradient } from 'expo-linear-gradient';

// LayoutAnimation is enabled by default in New Architecture
// if (Platform.OS === 'android') {
//   if (UIManager.setLayoutAnimationEnabledExperimental) {
//     UIManager.setLayoutAnimationEnabledExperimental(true);
//   }
// }

type RankItem = {
  index?: string;
  campus?: string;
  college?: string;
  major?: string;
  grade?: string;
  studentId?: string;
  name?: string;
  className?: string;
  weightedScore?: string;
  majorRank?: string;
  status?: string;
};

const fetcher = async () => {
  return await fetchAndCleanWithRetry(
    'https://jiaowu.sicau.edu.cn/xuesheng/chengji/chengji/zytongbf.asp',
    (html) => cleanRankHtml(html),
    (data) => !data.list || data.list.length === 0,
    '成绩排名'
  );
};

const RankList = observer(() => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, error: swrError, isLoading, mutate } = useSWR(
    profileStore.profile.studentId ? `jiaowu/rank/${profileStore.profile.studentId}` : null,
    fetcher,
    {
      dedupingInterval: 600000,
      revalidateOnFocus: false,
      onSuccess: (cleaned) => {
        const nextList = (cleaned.list || []) as RankItem[];
        const currentStudentId = profileStore.profile?.studentId?.trim();
        if (currentStudentId) {
          const hit = nextList.find((item) => item.studentId?.trim() === currentStudentId);
          const className = hit?.className?.trim();
          if (className && className !== profileStore.profile.className) {
            profileStore.setProfile({ className });
          }
        }
      }
    }
  );

  const list = (data?.list || []) as RankItem[];

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const getRankStyle = (rankStr: string) => {
    const rank = parseInt(rankStr);
    if (rank === 1) return { color: '#D4AF37', icon: 'crown', size: 28 }; // Gold
    if (rank === 2) return { color: '#A9A9A9', icon: 'medal', size: 24 }; // Silver
    if (rank === 3) return { color: '#CD7F32', icon: 'medal-outline', size: 24 }; // Bronze
    return { color: theme.colors.onSurfaceVariant, icon: '', size: 18 };
  };

  const renderRankItem = (item: RankItem, index: number) => {
    const { color, icon, size } = getRankStyle(item.majorRank || '0');
    const isTop3 = parseInt(item.majorRank || '99') <= 3;

    return (
      <Surface key={index} style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
        {/* Header Section: Rank & Score */}
        <View style={styles.cardHeader}>
          <View style={styles.rankContainer}>
            {isTop3 ? (
              <Icon source={icon} color={color} size={40} />
            ) : (
              <Text variant="displayMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                {item.majorRank}
              </Text>
            )}
            <Text variant="labelMedium" style={{ color: theme.colors.outline, marginTop: 4 }}>专业排名</Text>
          </View>
          
          <Divider style={{ width: 1, height: 40, marginHorizontal: 24, backgroundColor: theme.colors.outlineVariant }} />
          
          <View style={styles.scoreContainer}>
            <Text variant="displayMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              {item.weightedScore}
            </Text>
            <Text variant="labelMedium" style={{ color: theme.colors.outline, marginTop: 4 }}>加权平均分</Text>
          </View>
        </View>

        <Divider style={{ marginVertical: 16, backgroundColor: theme.colors.surfaceVariant }} />

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                {item.name || '-'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>姓名</Text>
            </View>
            <View style={styles.infoItem}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                {item.studentId || '-'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>学号</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                {item.major || '-'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>专业</Text>
            </View>
            <View style={styles.infoItem}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                {item.grade || '-'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>年级</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
             <View style={styles.infoItem}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                {item.className || '-'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>班级</Text>
            </View>
            <View style={styles.infoItem}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                {item.status || '-'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>状态</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                {item.college || '-'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>学院</Text>
            </View>
            <View style={styles.infoItem}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                {item.campus || '-'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>校区</Text>
            </View>
          </View>
        </View>
      </Surface>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.primaryContainer, theme.colors.background]}
        style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />
      {/* Custom Minimal Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon source="arrow-left" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => mutate()} style={styles.refreshButton}>
             {isLoading ? <ActivityIndicator size={18} color={theme.colors.primary} /> : <Icon source="refresh" size={24} color={theme.colors.onSurface} />}
          </TouchableOpacity>
        </View>
        <View style={styles.headerTitleContainer}>
          <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>成绩排名</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {swrError && (
          <Surface style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]}>
            <Icon source="alert-circle" size={24} color={theme.colors.onErrorContainer} />
            <Text style={{ color: theme.colors.onErrorContainer, marginLeft: 8 }}>
              {swrError.message || '获取排名失败'}
            </Text>
          </Surface>
        )}

        {list.length === 0 && !isLoading && !swrError && (
          <View style={styles.emptyState}>
            <Icon source="format-list-bulleted" size={48} color={theme.colors.outline} />
            <Text style={{ marginTop: 16, color: theme.colors.outline }}>暂无排名数据</Text>
          </View>
        )}

        <View style={styles.listContainer}>
          {list.map((item, index) => renderRankItem(item, index))}
        </View>
      </ScrollView>
    </View>
  );
});

export default RankList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  refreshButton: {
    padding: 8,
    marginRight: -8,
  },
  headerTitleContainer: {
    paddingHorizontal: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  errorCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  rankContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  infoGrid: {
    gap: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flex: 1,
  },
});
