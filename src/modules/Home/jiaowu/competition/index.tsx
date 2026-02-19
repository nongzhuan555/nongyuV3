
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Linking, TouchableOpacity } from 'react-native';
import { Button, Card, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cleanCompetitionHtml, NoticeItem } from '@/jiaowu/jiaowuInfo/noticeInfo';
import { fetchJiaowuHtml } from '@/jiaowu/login/login';
import { profileStore } from '@/stores/profile';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated } from 'react-native';
import { Surface } from 'react-native-paper';

export default observer(function JiaowuCompetition() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<NoticeItem[]>([]);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Show message
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 抓取教务系统首页
      const resp = await fetchJiaowuHtml('https://jiaowu.sicau.edu.cn/web/web/web/index.asp');
      const cleaned = cleanCompetitionHtml(resp.html);
      setList(cleaned.list || []);
    } catch (e) {
      const err = e as { message?: string } | null;
      setError(err?.message || '获取竞赛通知失败');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePress = useCallback((item: NoticeItem) => {
    const { url, title } = item;
    if (!url) return;

    if (profileStore.webOpenMode === 'internal') {
      // @ts-ignore
      navigation.navigate('WebViewScreen', { url, title });
    } else {
      Linking.openURL(url).catch((err) => {
        console.error('Failed to open URL:', err);
        setError('无法打开链接');
      });
    }
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.primaryContainer, theme.colors.background]}
        style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: 'transparent' }]}>
        <Button mode="text" onPress={() => navigation.goBack()} contentStyle={styles.backContent}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onBackground} />
        </Button>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>竞赛通知</Text>
        <View style={styles.ghost} />
      </View>

      <Animated.View style={[
        styles.messageContainer, 
        { 
          top: insets.top + 102,
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0]
            })
          }]
        }
      ]}>
        <Surface style={styles.messageSurface} elevation={2}>
          <MaterialCommunityIcons name="information-outline" size={16} color="white" />
          <Text style={styles.messageText}>点击列表项可查看通知详情</Text>
        </Surface>
      </Animated.View>

      {loading && !list.length ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>加载中...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.error, marginBottom: 16 }}>{error}</Text>
          <Button mode="contained" onPress={load}>重试</Button>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {list.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 20, color: theme.colors.onSurfaceVariant }}>暂无通知</Text>
          ) : (
            list.map((item, index) => (
              <Card
                key={index}
                style={[styles.card, { backgroundColor: theme.colors.surface }]}
                onPress={() => handlePress(item)}
              >
                <Card.Content style={styles.cardRow}>
                  <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="trophy-outline" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                      {item.title}
                    </Text>
                    {item.date && (
                      <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4 }}>
                        {item.date}
                      </Text>
                    )}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.outline} />
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 4,
    zIndex: 1,
  },
  backContent: {
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  ghost: {
    width: 64,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  messageContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  messageSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  messageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});
