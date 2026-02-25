import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text, Checkbox, Button, Dialog, Portal, TextInput, FAB, Divider, Card, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MD3Theme } from 'react-native-paper';

type TodoStatus = 'todo' | 'done';

type Todo = {
  id: string;
  courseId: string;
  content: string;
  status: TodoStatus;
  createdAt: string;
  completedAt: string | null;
};

type Props = {
  courseId?: string;
};

const nowISO = () => new Date().toISOString();
const MAX_LEN = 140;

export default function TodoList(props: Props & { embedded?: boolean; style?: any }) {
  const courseId = props.courseId ?? 'c_001';
  const { embedded, style } = props;
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, embedded), [theme, embedded]);

  // LayoutAnimation is enabled by default in New Architecture
  // useEffect(() => {
  //   if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  //     UIManager.setLayoutAnimationEnabledExperimental(true);
  //   }
  // }, []);

  const smooth = () => {
    LayoutAnimation.configureNext({
      duration: 200,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
  };
  const [items, setItems] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);
  // 如果 courseId 变化，重置 loaded 状态，防止旧数据污染或竞态条件
  // const storageKey = `TODO_LIST_${courseId}`; 

  // 使用 useMemo 确保 key 稳定
  const storageKey = useMemo(() => `TODO_LIST_${courseId}`, [courseId]);

  useEffect(() => {
    let isActive = true;
    (async () => {
      // 切换课程时，先重置状态，避免显示上一个课程的数据
      setLoaded(false);
      setItems([]); 
      
      try {
        const json = await AsyncStorage.getItem(storageKey);
        if (isActive && json) {
          setItems(JSON.parse(json));
        }
      } catch (e) {
        // ignore
      } finally {
        if (isActive) {
          setLoaded(true);
        }
      }
    })();
    return () => { isActive = false; };
  }, [storageKey]);

  useEffect(() => {
    // 只有当 loaded 为 true 且 storageKey 对应当前课程时才保存
    if (loaded) {
      AsyncStorage.setItem(storageKey, JSON.stringify(items)).catch(() => {});
    }
  }, [items, storageKey, loaded]);

  const [createVisible, setCreateVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [content, setContent] = useState('');
  const [detailItem, setDetailItem] = useState<Todo | null>(null);
  const [toDelete, setToDelete] = useState<Todo | null>(null);

  const todoList = useMemo(
    () => items.filter((i) => i.status === 'todo').sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [items],
  );
  const doneList = useMemo(
    () =>
      items
        .filter((i) => i.status === 'done')
        .sort((a, b) => +new Date(b.completedAt ?? 0) - +new Date(a.completedAt ?? 0)),
    [items],
  );

  const handleCreate = () => {
    smooth();
    const id = `t_${Math.random().toString(16).slice(2, 8)}`;
    const n: Todo = {
      id,
      courseId,
      content: content.trim() || '未命名待办',
      status: 'todo',
      createdAt: nowISO(),
      completedAt: null,
    };
    setItems((prev) => [n, ...prev]);
    setContent('');
    setCreateVisible(false);
  };

  const toggleDone = (id: string) => {
    smooth();
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        if (i.status === 'done') return { ...i, status: 'todo', completedAt: null };
        return { ...i, status: 'done', completedAt: nowISO() };
      }),
    );
  };

  const requestDelete = (item: Todo) => {
    setToDelete(item);
    setConfirmVisible(true);
  };
  const confirmDelete = () => {
    if (!toDelete) return;
    smooth();
    setItems((prev) => prev.filter((i) => i.id !== toDelete.id));
    setToDelete(null);
    setConfirmVisible(false);
  };

  const openDetail = (item: Todo) => {
    setDetailItem(item);
    setDetailVisible(true);
  };

  const renderCard = (item: Todo) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => openDetail(item)}
      onLongPress={() => requestDelete(item)}
    >
      <Card style={styles.card} mode={embedded ? 'outlined' : 'elevated'}>
        <View style={styles.cardRow}>
          <Checkbox
            status={item.status === 'done' ? 'checked' : 'unchecked'}
            onPress={() => toggleDone(item.id)}
          />
          <View style={styles.cardBody}>
            <Text style={[styles.cardText, item.status === 'done' && styles.textDone]} numberOfLines={2}>
              {item.content}
            </Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              {item.status === 'done'
                ? `完成于 ${formatTime(item.completedAt)}`
                : `创建于 ${formatTime(item.createdAt)}`}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={[{ type: 'todo' as const }, { type: 'done' as const }]}
        keyExtractor={(i) => i.type}
        scrollEnabled={!embedded}
        renderItem={({ item }) => {
          const list = item.type === 'todo' ? todoList : doneList;
          if (embedded && list.length === 0 && item.type === 'done') return null; // 嵌入模式下如果没有已完成项则隐藏已完成区
          return (
            <View>
              <Text style={styles.sectionTitle}>{item.type === 'todo' ? '待办' : '已完成'}</Text>
              {!embedded && <Divider />}
              {list.length === 0 ? (
                <Text style={styles.empty}>{item.type === 'todo' ? '暂无待办' : '暂无已办'}</Text>
              ) : (
                <FlatList
                  data={list}
                  keyExtractor={(t) => t.id}
                  renderItem={({ item: it }) => renderCard(it)}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  contentContainerStyle={{ paddingVertical: 8 }}
                />
              )}
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={embedded ? (
          <Button mode="contained-tonal" icon="plus" onPress={() => setCreateVisible(true)} style={{ marginTop: 12 }}>
            添加待办
          </Button>
        ) : null}
      />

      <Portal>
        <Dialog visible={createVisible} onDismiss={() => setCreateVisible(false)} style={styles.dialog}>
          <Dialog.Title>新建待办</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <TextInput
              mode="flat"
              placeholder="输入待办内容"
              multiline
              autoFocus
              maxLength={MAX_LEN}
              value={content}
              onChangeText={setContent}
              style={styles.dialogInput}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => {
                if (content.trim().length > 0) handleCreate();
              }}
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setCreateVisible(false)}>取消</Button>
            <Button mode="contained" disabled={content.trim().length === 0} onPress={handleCreate}>
              创建
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={detailVisible} onDismiss={() => setDetailVisible(false)}>
          <Dialog.Title>待办详情</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.detailText}>{detailItem?.content ?? ''}</Text>
            {detailItem ? (
              <Text style={styles.detailMeta}>
                {detailItem.status === 'done'
                  ? `完成时间：${formatTime(detailItem.completedAt)}`
                  : `创建时间：${formatTime(detailItem.createdAt)}`}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDetailVisible(false)}>关闭</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={confirmVisible} onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Title>确认删除</Dialog.Title>
          <Dialog.Content>
            <Text>确认删除该待办？删除后不可恢复。</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)}>取消</Button>
            <Button onPress={confirmDelete}>删除</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB icon="plus" style={styles.fab} onPress={() => setCreateVisible(true)} visible={!embedded} />
    </View>
  );
}

function formatTime(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function createStyles(theme: MD3Theme, embedded?: boolean) {
  const onSurface = theme.colors.onSurface;
  const onSurfaceVariant = theme.colors.onSurfaceVariant;
  const outline = theme.colors.outline;
  const surface = theme.colors.surface;
  const onSurfaceDisabled = theme.colors.onSurfaceDisabled;
  const surfaceVariant = theme.colors.surfaceVariant;
  return StyleSheet.create({
    container: { flex: embedded ? 0 : 1, backgroundColor: embedded ? 'transparent' : theme.colors?.background },
    listContent: { padding: embedded ? 0 : 12, paddingBottom: embedded ? 0 : 80, gap: 8 },
    sectionTitle: { fontSize: 14, color: onSurfaceVariant, marginTop: 8, marginBottom: 4 },
    empty: { color: onSurfaceVariant, paddingVertical: 8 },
    card: {
      borderRadius: 12,
      minHeight: 76,
      justifyContent: 'center',
      backgroundColor: surface,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
    cardBody: { flex: 1, paddingLeft: 6 },
    cardText: { fontSize: 16, color: onSurface },
    cardMeta: { fontSize: 12, color: onSurfaceVariant, marginTop: 6 },
    textDone: { textDecorationLine: 'line-through', color: onSurfaceDisabled },
    detailText: { fontSize: 16, color: onSurface },
    detailMeta: { fontSize: 12, color: onSurfaceVariant, marginTop: 8 },
    fab: { position: 'absolute', right: 16, bottom: 24 },
    dialog: { borderRadius: 16, borderWidth: 1, borderColor: outline },
    dialogContent: { paddingTop: 6 },
    dialogInput: {
      minHeight: 120,
      textAlignVertical: 'top' as const,
      backgroundColor: surfaceVariant,
      borderRadius: 12,
      paddingTop: 12,
    },
    dialogActions: { paddingHorizontal: 12, paddingBottom: 8 },
  });
}

