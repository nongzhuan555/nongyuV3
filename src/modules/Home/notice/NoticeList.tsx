import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, Pressable, RefreshControl } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { getNotificationList, Notification } from '@/modules/Home/components/NoticeBar/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NoticeList() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  
  const [list, setList] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchList = useCallback(async (pageNum: number, isRefresh = false) => {
    if (loading) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getNotificationList(pageNum);
      if (res) {
        setList(prev => isRefresh ? res.list : [...prev, ...res.list]);
        setHasMore(res.list.length === 10);
        setPage(pageNum);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchList(1, true);
  }, []);

  const handleRefresh = () => {
    fetchList(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchList(page + 1);
    }
  };

  const getTypeLabel = (type: number) => {
    switch (type) {
      case 1: return { text: '系统更新', color: theme.colors.primary };
      case 2: return { text: '系统维护', color: theme.colors.error };
      case 3: return { text: '安全通知', color: theme.colors.tertiary };
      case 4: return { text: '日常通知', color: theme.colors.secondary };
      default: return { text: '通知', color: theme.colors.primary };
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const typeInfo = getTypeLabel(item.type);
    const date = new Date(item.created_at).toLocaleString();

    return (
      <Pressable
        style={({ pressed }) => [
          styles.item,
          { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
            opacity: pressed ? 0.8 : 1
          }
        ]}
        onPress={() => navigation.navigate('NoticeDetail', {
          content: item.content,
          title: item.title,
          created_at: item.created_at,
          type: item.type,
        })}
      >
        <View style={styles.itemHeader}>
          <View style={[styles.badge, { backgroundColor: typeInfo.color + '20' }]}>
            <Text style={[styles.badgeText, { color: typeInfo.color }]}>{typeInfo.text}</Text>
          </View>
          <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>{date}</Text>
        </View>
        <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.preview, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
          {item.content}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>通知中心</Text>
      </View>
      
      <FlatList
        data={list}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        ListFooterComponent={
          loading && !refreshing ? (
            <ActivityIndicator style={styles.loading} />
          ) : null
        }
        ListEmptyComponent={
          !loading && list.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>暂无通知</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backBtn: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  item: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
  },
  loading: {
    padding: 16,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
});
