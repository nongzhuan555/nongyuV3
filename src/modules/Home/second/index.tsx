import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View, Dimensions, TouchableOpacity } from 'react-native';
import { Text, useTheme, Surface, Icon, TouchableRipple, Appbar } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSecondClassToken } from './api';

// 二课入口配置
const ENTRY_LIST = [
  { 
    key: 'activity', 
    label: '活动报名', 
    sub: '浏览热门活动，一键快速报名', 
    route: 'SecondActivityList', 
    icon: 'calendar-check', 
    color: '#4CAF50',
    bgColor: '#E8F5E9'
  },
  { 
    key: 'userInfo', 
    label: '个人信息', 
    sub: '查看个人学分、综测及排名', 
    route: 'SecondUserInfo', 
    icon: 'account-circle', 
    color: '#2196F3',
    bgColor: '#E3F2FD'
  },
  { 
    key: 'points', 
    label: '学分记录', 
    sub: '每一分收获都值得被记录', 
    route: null, 
    icon: 'file-document-outline', 
    color: '#FF9800',
    bgColor: '#FFF3E0'
  },
  { 
    key: 'rank', 
    label: '综合排名', 
    sub: '班级、年级、专业排名概览', 
    route: null, 
    icon: 'chart-box-outline', 
    color: '#9C27B0',
    bgColor: '#F3E5F5'
  },
];

export default function SecondHome() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const handlePress = async (route: string | null) => {
    if (route) {
      const token = await getSecondClassToken();
      if (!token) {
        // @ts-ignore
        navigation.navigate('SecondLogin');
        return;
      }
      // @ts-ignore
      navigation.navigate(route);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#f5f7fa' }]}>
      {/* 顶部背景区域 */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 220, backgroundColor: theme.colors.primary, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }} />

      <Appbar.Header style={{ backgroundColor: 'transparent', elevation: 0 }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#fff" />
        <Appbar.Content title="" />
      </Appbar.Header>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingTop: 0 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerTitleContainer}>
          <Text variant="displaySmall" style={styles.headerTitle}>二课中心</Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>丰富校园生活，记录成长足迹</Text>
        </View>

        <View style={styles.grid}>
          {ENTRY_LIST.map((item) => (
            <Surface key={item.key} style={styles.cardContainer} elevation={2}>
              <TouchableRipple 
                style={styles.cardTouchable} 
                onPress={() => handlePress(item.route)}
                rippleColor="rgba(0, 0, 0, 0.05)"
              >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
                    <Icon source={item.icon} size={28} color={item.color} />
                  </View>
                  <View style={styles.textContainer}>
                    <Text variant="titleMedium" style={styles.cardTitle}>{item.label}</Text>
                    <Text variant="bodySmall" style={styles.cardSub} numberOfLines={2}>{item.sub}</Text>
                  </View>
                  <View style={styles.arrowContainer}>
                    <Icon source="chevron-right" size={24} color="#ccc" />
                  </View>
                </View>
              </TouchableRipple>
            </Surface>
          ))}
        </View>
        
        {/* 底部装饰或提示 */}
        <View style={styles.footer}>
           <Text variant="bodySmall" style={styles.footerText}>© Sichuan Agricultural University</Text>
        </View>
      </ScrollView>
    </View>
  );
}

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
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    opacity: 0.5,
  }
});
