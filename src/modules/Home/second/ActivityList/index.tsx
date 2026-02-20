import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Text, Searchbar, Chip, useTheme, Appbar, SegmentedButtons, Portal, Modal, List, Button, Divider, Snackbar, Icon } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { profileStore } from '@/stores/profile';
import api from '../api';

type Activity = {
  id: number;
  title: string;
  logo: string;
  startTime: string;
  endTime: string;
  addr: string;
  typeName: string;
  statusName: string;
};

type Tribe = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
  types?: Category[];
};

const ActivityItem = React.memo(({ item, onPress }: { item: Activity; onPress: (id: number) => void }) => {
  const theme = useTheme();
  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={() => onPress(item.id)}
    >
      <Image source={{ uri: item.logo }} style={[styles.logo, { backgroundColor: theme.colors.surfaceVariant }]} resizeMode="cover" />
      <View style={styles.cardContent}>
        <Text variant="titleMedium" numberOfLines={2} style={[styles.title, { color: theme.colors.onSurface }]}>{item.title}</Text>
        <View style={styles.row}>
          <Chip icon={({ color }) => <Icon source="tag" size={10} color={theme.colors.onSecondaryContainer} />} style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]} textStyle={{ fontSize: 9, marginVertical: 0, paddingVertical: 0, lineHeight: 14, color: theme.colors.onSecondaryContainer }} compact>{item.typeName}</Chip>
          <Chip icon={({ color }) => <Icon source="check-circle" size={10} color={theme.colors.onSecondaryContainer} />} style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]} textStyle={{ fontSize: 9, marginVertical: 0, paddingVertical: 0, lineHeight: 14, color: theme.colors.onSecondaryContainer }} compact>{item.statusName}</Chip>
        </View>
        <Text variant="bodySmall" style={[styles.info, { color: theme.colors.onSurfaceVariant }]}>时间: {item.startTime}</Text>
        <Text variant="bodySmall" style={[styles.info, { color: theme.colors.onSurfaceVariant }]}>地点: {item.addr}</Text>
      </View>
    </TouchableOpacity>
  );
});

function SecondActivityList() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [sortType, setSortType] = useState<string>('2'); // 1: upcoming, 2: new, 4: available
  const [selectedGid, setSelectedGid] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  
  // Filter Options
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Modals
  const [showTribeModal, setShowTribeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // Message
  const [messageVisible, setMessageVisible] = useState(false);
  const [message, setMessage] = useState('');

  const fetchFilters = async () => {
    try {
      const [tribeRes, categoryRes] = await Promise.all([
        api.post('/act/actconfig/v1.0.0/getSchoolGroup'),
        api.post('/act/actType/v1.0.0/getSchoolActType')
      ]);
      
      if (tribeRes.data?.content) {
        setTribes(tribeRes.data.content);
      }
      if (categoryRes.data?.content) {
        setCategories(categoryRes.data.content);
      }
    } catch (error) {
      console.error('Fetch filters error:', error);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchActivities = useCallback(async (pageNum: number, isRefresh = false) => {
    if (loading && !isRefresh) return;
    setLoading(true);
    
    try {
      const response = await api.post('/act/actInfo/v1.0.0/getUserSchoolActList', null, {
        params: {
          page: pageNum,
          actName: searchQuery,
          sortType: Number(sortType),
          gid: selectedGid || undefined,
          typeId: selectedTypeId || undefined,
        },
      });
      
      const newActivities = response.data?.content || [];
      if (isRefresh) {
        setActivities(newActivities);
        setHasMore(newActivities.length >= 10);
      } else {
        setActivities(prev => [...prev, ...newActivities]);
        setHasMore(newActivities.length >= 10);
      }
    } catch (error) {
      console.error('Fetch activities error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, sortType, selectedGid, selectedTypeId]);

  useEffect(() => {
    setPage(1);
    fetchActivities(1, true);
  }, [fetchActivities]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchActivities(1, true);
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setMessageVisible(true);
  };

  const onEndReached = () => {
    // If we're already loading, do nothing
    if (loading) return;

    // If no more data, do nothing (footer handles it)
    if (!hasMore) {
      return;
    }

    // If has more data and not loading, fetch next page
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage, false);
  };

  const renderFooter = () => {
    if (loading && !refreshing) {
      return (
        <View style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.outline }}>加载中...</Text>
        </View>
      );
    }
    if (!hasMore && activities.length > 0) {
      return (
        <View style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>没有更多活动了</Text>
        </View>
      );
    }
    return <View style={{ height: 20 }} />;
  };

  const renderItem = useCallback(({ item }: { item: Activity }) => (
    <ActivityItem 
      item={item} 
      onPress={(id) => {
        // @ts-ignore
        navigation.navigate('SecondActivityDetail', { id: String(id) });
      }} 
    />
  ), [navigation]);

  const renderCategoryItem = (category: Category, level = 0) => {
    return (
      <React.Fragment key={category.id}>
        <List.Item
          title={category.name}
          titleStyle={{ color: theme.colors.onSurface }}
          style={{ paddingLeft: level * 20 }}
          onPress={() => {
            setSelectedTypeId(category.id);
            setShowCategoryModal(false);
          }}
          right={props => selectedTypeId === category.id ? <List.Icon {...props} icon="check" color={theme.colors.primary} /> : null}
        />
        {category.types && category.types.map(sub => renderCategoryItem(sub, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color={theme.colors.onPrimary} />
        <Appbar.Content title="二课活动" titleStyle={{ color: theme.colors.onPrimary, fontWeight: 'bold' }} />
      </Appbar.Header>
      
      <View style={[styles.filterContainer, { backgroundColor: theme.colors.surface }]}>
        <Searchbar
          placeholder="输入关键词搜索二课活动"
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={() => {
            setPage(1);
            fetchActivities(1, true);
          }}
          style={[styles.searchBar, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
          inputStyle={{
            fontSize: 14,
            alignSelf: 'center',
            minHeight: 0,
            paddingVertical: 0,
            color: theme.colors.onSurface
          }}
          iconColor={theme.colors.onSurfaceVariant}
          placeholderTextColor={theme.colors.onSurfaceVariant}
        />
        
        <View style={styles.sortContainer}>
          <SegmentedButtons
            value={sortType}
            onValueChange={setSortType}
            buttons={[
              { value: '2', label: '最新' },
              { value: '1', label: '即将开始' },
              { value: '4', label: '可参与' },
            ]}
            style={styles.segmentedButton}
            density="small"
            theme={{ colors: { secondaryContainer: theme.colors.primaryContainer, onSecondaryContainer: theme.colors.onPrimaryContainer } }}
          />
        </View>

        <View style={styles.filterButtons}>
          <Button 
            mode="outlined" 
            onPress={() => setShowTribeModal(true)}
            style={styles.filterBtn}
            compact
            textColor={theme.colors.primary}
          >
            {selectedGid ? tribes.find(t => t.id === selectedGid)?.name || '部落' : '所有部落'}
          </Button>
          <Button 
            mode="outlined" 
            onPress={() => setShowCategoryModal(true)}
            style={styles.filterBtn}
            compact
            textColor={theme.colors.primary}
          >
            {selectedTypeId ? '已选分类' : '所有分类'}
          </Button>
          {(selectedGid || selectedTypeId) && (
             <Button onPress={() => { setSelectedGid(''); setSelectedTypeId(''); }} compact textColor={theme.colors.error}>重置</Button>
          )}
        </View>
      </View>

      <FlatList
        data={activities}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.1}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListFooterComponent={renderFooter()}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: 'center', marginTop: 20, color: theme.colors.onSurfaceVariant }}>暂无活动</Text>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={{ marginTop: 10, color: theme.colors.onSurfaceVariant }}>加载中...</Text>
            </View>
          )
        }
        style={{ flex: 1 }}
      />

      <Portal>
        <Snackbar
          visible={messageVisible}
          onDismiss={() => setMessageVisible(false)}
          duration={2000}
          style={{ 
            position: 'absolute', 
            top: 102, 
            left: 0, 
            right: 0, 
            backgroundColor: theme.colors.inverseSurface,
            marginHorizontal: 16,
            borderRadius: 8
          }}
        >
          <Text style={{ color: theme.colors.inverseOnSurface }}>{message}</Text>
        </Snackbar>
        
        <Modal visible={showTribeModal} onDismiss={() => setShowTribeModal(false)} contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>选择部落</Text>
          <ScrollView style={styles.modalScroll}>
            <List.Item title="所有部落" titleStyle={{ color: theme.colors.onSurface }} onPress={() => { setSelectedGid(''); setShowTribeModal(false); }} />
            <Divider />
            {tribes.map(tribe => (
              <List.Item
                key={tribe.id}
                title={tribe.name}
                titleStyle={{ color: theme.colors.onSurface }}
                onPress={() => {
                  setSelectedGid(tribe.id);
                  setShowTribeModal(false);
                }}
                right={props => selectedGid === tribe.id ? <List.Icon {...props} icon="check" color={theme.colors.primary} /> : null}
              />
            ))}
          </ScrollView>
        </Modal>

        <Modal visible={showCategoryModal} onDismiss={() => setShowCategoryModal(false)} contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>选择分类</Text>
          <ScrollView style={styles.modalScroll}>
            <List.Item title="所有分类" titleStyle={{ color: theme.colors.onSurface }} onPress={() => { setSelectedTypeId(''); setShowCategoryModal(false); }} />
            <Divider />
            {categories.map(cat => renderCategoryItem(cat))}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

export default observer(SecondActivityList);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    padding: 10,
    elevation: 2,
  },
  searchBar: {
    elevation: 0,
    borderWidth: 1,
    marginBottom: 10,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortContainer: {
    marginBottom: 10,
  },
  segmentedButton: {
    // width: '100%',
  },
  filterButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBtn: {
    flex: 1,
  },
  listContent: {
    padding: 10,
  },
  card: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 8,
  },
  cardContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 6,
    fontSize: 16,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  info: {
    fontSize: 12,
  },
  modalContent: {
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 10,
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: 400,
  },
});
