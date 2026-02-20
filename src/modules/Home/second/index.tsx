import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View, Dimensions, TouchableOpacity, ImageBackground } from 'react-native';
import { Text, useTheme, Surface, Icon, TouchableRipple, Appbar } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { profileStore } from '@/stores/profile';
import { getSecondClassToken } from './api';

// 二课入口配置
const ENTRY_LIST = [
  { 
    key: 'activity', 
    label: '活动报名', 
    sub: '浏览热门活动，一键快速报名', 
    route: 'SecondActivityList', 
    icon: 'calendar-check-outline', 
    color: '#fff',
    gradient: ['#4CAF50', '#81C784']
  },
  { 
    key: 'userInfo', 
    label: '个人信息', 
    sub: '查看个人学分、综测及排名', 
    route: 'SecondUserInfo', 
    icon: 'account-circle-outline', 
    color: '#fff',
    gradient: ['#2196F3', '#64B5F6']
  },
];

function SecondHome() {
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
    <View style={[styles.container, { backgroundColor: '#F5F7FA' }]}>
      {/* 顶部高级背景 */}
      <View style={styles.headerBackground}>
        <LinearGradient
          colors={[theme.colors.primary, '#1a237e']} // 深邃的渐变色
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerPattern}>
            <MaterialCommunityIcons name="trophy-outline" size={180} color="rgba(255,255,255,0.05)" style={styles.bgIcon} />
        </View>
      </View>

      <Appbar.Header style={{ backgroundColor: 'transparent', elevation: 0 }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#fff" />
        <Appbar.Content title="" />
      </Appbar.Header>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerTitleContainer}>
          <Text variant="displaySmall" style={styles.headerTitle}>二课中心</Text>
          <Text variant="bodyLarge" style={styles.headerSubtitle}>集成i川农核心功能</Text>
        </View>

        <View style={styles.grid}>
          {ENTRY_LIST.map((item) => (
            <Surface key={item.key} style={styles.cardContainer} elevation={4}>
              <TouchableRipple 
                style={styles.cardTouchable} 
                onPress={() => handlePress(item.route)}
                rippleColor="rgba(0, 0, 0, 0.05)"
              >
                <View style={styles.cardContent}>
                  <LinearGradient
                    colors={item.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconContainer}
                  >
                    <MaterialCommunityIcons name={item.icon as any} size={28} color={item.color} />
                  </LinearGradient>
                  
                  <View style={styles.textContainer}>
                    <Text variant="titleMedium" style={styles.cardTitle}>{item.label}</Text>
                    <Text variant="bodySmall" style={styles.cardSub} numberOfLines={1}>{item.sub}</Text>
                  </View>
                  
                  <View style={styles.arrowContainer}>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#E0E0E0" />
                  </View>
                </View>
              </TouchableRipple>
            </Surface>
          ))}
        </View>
        
        {/* 底部装饰 */}
        <View style={styles.footer}>
           <Text variant="labelSmall" style={styles.footerText}>农屿工作室</Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default observer(SecondHome);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  headerPattern: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: -20,
    paddingTop: 40,
  },
  bgIcon: {
    transform: [{ rotate: '-15deg' }],
  },
  content: {
    padding: 24,
  },
  headerTitleContainer: {
    marginBottom: 40,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  grid: {
    gap: 20,
  },
  cardContainer: {
    borderRadius: 24,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTouchable: {
    padding: 24,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 17,
    marginBottom: 4,
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  cardSub: {
    color: '#888',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  arrowContainer: {
    justifyContent: 'center',
    marginLeft: 8,
  },
  footer: {
    marginTop: 60,
    alignItems: 'center',
  },
  footerText: {
    color: '#B0BEC5',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontSize: 10,
  }
});
