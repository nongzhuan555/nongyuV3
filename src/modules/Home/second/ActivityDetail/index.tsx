import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { Text, Button, Chip, Divider, useTheme, Appbar, Card, Paragraph, Title, Portal, Dialog } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { profileStore } from '@/stores/profile';
import api from '../api';
import { RootStackParamList } from '@/navigation/types';

type DetailRouteProp = RouteProp<RootStackParamList, 'SecondActivityDetail'>;

type ActivityDetail = {
  id: number;
  title: string;
  logo: string;
  description: string;
  startTime: string;
  endTime: string;
  addr: string;
  typeName: string;
  statusName: string;
  groupName: string;
  activityMemberCounts: number;
  allowUserCount: number;
  currentUserIdentity: string; // 4: not joined?
  currentUserButton: string; // 1: sign up?
  canJoin: string;
};

function SecondActivityDetail() {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { id } = route.params;

  const [detail, setDetail] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const response = await api.post('/act/actInfo/v1.0.0/getActDetail', null, {
        params: { actId: id },
      });
      setDetail(response.data?.content);
    } catch (error) {
      console.error('Fetch detail error:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleAction = async (status: number) => {
    setActionLoading(true);
    try {
      const response = await api.post('/act/actInfo/v1.0.0/updateActMemberStatus', null, {
        params: {
          actId: id,
          status: status, // 1: sign up, 2: cancel
        }
      });
      
      if (response.data?.code === '0') {
        Alert.alert('提示', status === 1 ? '报名成功' : '取消成功');
        fetchDetail(); // Refresh to update status
      } else {
        Alert.alert('失败', response.data?.message || '操作失败');
      }
    } catch (error) {
      console.error('Action error:', error);
      Alert.alert('错误', '操作请求失败');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>未找到活动详情</Text>
      </View>
    );
  }

  // Logic to determine button state
  // Assuming statusName "报名中" means we can try to sign up
  // We need a way to know if we HAVE signed up.
  // API doc doesn't explicitly state "isJoined".
  // But often `currentUserIdentity` changes.
  // For now, I'll show "Sign Up" if statusName is "报名中".
  // And maybe a "Cancel" button if we can detect it.
  // Since I can't be sure, I'll just show "报名" if status is "报名中".
  // If the user is already signed up, the API might return an error or handle it.
  
  const canSignUp = detail.statusName === '报名中';
  // Check if likely joined (this is a guess without exact doc field, but commonly 1/2/3 might mean joined roles)
  // If currentUserIdentity is NOT 4, maybe joined?
  // Let's rely on user intent for now.

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: 'transparent', elevation: 0 }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color={theme.colors.onPrimary} />
        <Appbar.Content title="活动详情" titleStyle={{ color: theme.colors.onPrimary, fontWeight: 'bold' }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Title style={[styles.title, { color: theme.colors.onBackground }]}>{detail.title}</Title>
          
          <View style={styles.chips}>
            <Chip icon="tag" style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]} textStyle={{ color: theme.colors.onSecondaryContainer }} compact>{detail.typeName}</Chip>
            <Chip icon="account-group" style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]} textStyle={{ color: theme.colors.onSecondaryContainer }} compact>{detail.groupName}</Chip>
            <Chip icon="check-circle" style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]} textStyle={{ color: theme.colors.onSecondaryContainer }} compact>{detail.statusName}</Chip>
          </View>

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <Card.Content>
              <Title style={[styles.sectionTitle, { color: theme.colors.primary }]}>活动信息</Title>
              <Paragraph style={[styles.infoRow, { color: theme.colors.onSurfaceVariant }]}>时间：{detail.startTime} ~ {detail.endTime}</Paragraph>
              <Paragraph style={[styles.infoRow, { color: theme.colors.onSurfaceVariant }]}>地点：{detail.addr}</Paragraph>
              <Paragraph style={[styles.infoRow, { color: theme.colors.onSurfaceVariant }]}>人数：{detail.activityMemberCounts} / {detail.allowUserCount}</Paragraph>
            </Card.Content>
          </Card>

          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <Card.Content>
              <Title style={[styles.sectionTitle, { color: theme.colors.primary }]}>活动介绍</Title>
              <Paragraph style={[styles.description, { color: theme.colors.onSurface }]} selectable={true}>{detail.description || '暂无介绍'}</Paragraph>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 10, backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
        {canSignUp ? (
           <View style={styles.buttonRow}>
             <Button 
               mode="contained" 
               onPress={() => handleAction(1)} 
               loading={actionLoading}
               style={styles.actionButton}
               buttonColor={theme.colors.primary}
               textColor={theme.colors.onPrimary}
             >
               立即报名
             </Button>
             {/* Optional: Show Cancel if we think they are joined. For now, hide to avoid confusion unless we know. */}
             {/* 
             <Button 
               mode="outlined" 
               onPress={() => handleAction(2)} 
               loading={actionLoading}
               style={styles.actionButton}
               textColor={theme.colors.error}
             >
               取消报名
             </Button> 
             */}
           </View>
        ) : (
          <Button mode="contained" disabled style={[styles.actionButton, { backgroundColor: theme.colors.surfaceDisabled }]} textColor={theme.colors.onSurfaceDisabled}>
            {detail.statusName}
          </Button>
        )}
      </View>
    </View>
  );
}

export default observer(SecondActivityDetail);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  image: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
    fontSize: 20,
    lineHeight: 28,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoRow: {
    marginBottom: 4,
  },
  description: {
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    elevation: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
});
