import React, { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Card, Portal, Snackbar, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopTab from '@/shared/components/TopTab';
import Greeting from './components/Greeting';
import NoticeBar from './components/NoticeBar';
import WebNav from './components/WebNav';
import analytics from '@/sdk/analytics';

export default function Home() {
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [msgVisible, setMsgVisible] = useState(false);
  const [msgText, setMsgText] = useState('');
  const wechatName = '农屿校园助手';
  const qqGroup = '327303003';

  const copyText = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    setMsgText(`${label}已复制`);
    setMsgVisible(true);
    analytics.trackClick('copy_button', 'Home', {
      element_name: `复制${label}`,
      page_name: 'Home',
      value: value
    });
  };

  return (
    <View style={[styles['home__wrap'], { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.primaryContainer, theme.colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
      />
      <TopTab backgroundColor="transparent" />
      <View style={styles['home__screen']}>
        <Greeting />
        <NoticeBar />
        <WebNav />
        <Card style={[styles['home__socialCard'], { backgroundColor: theme.colors.surface }]}>
          <Pressable
            style={({ pressed }) => [styles['home__socialRow'], pressed ? styles['home__socialPressed'] : null]}
            onPress={() => navigation.navigate('JiaowuHome' as never)}
          >
            <View style={[styles['home__socialIcon'], { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="school" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles['home__socialText'], { color: theme.colors.onSurface }]} numberOfLines={1}>
              教务系统
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles['home__socialRow'], pressed ? styles['home__socialPressed'] : null]}
            onPress={() => navigation.navigate('SecondHome' as never)}
          >
            <View style={[styles['home__socialIcon'], { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="trophy" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles['home__socialText'], { color: theme.colors.onSurface }]} numberOfLines={1}>
              二课系统
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        </Card>
        <Card style={[styles['home__socialCard'], { backgroundColor: theme.colors.surface }]}>
          <Pressable
            style={({ pressed }) => [styles['home__socialRow'], pressed ? styles['home__socialPressed'] : null]}
            onPress={() => copyText(wechatName, '公众号')}
          >
            <View style={[styles['home__socialIcon'], { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="wechat" size={18} color={theme.colors.onSurfaceVariant} />
            </View>
            <Text style={[styles['home__socialText'], { color: theme.colors.onSurface }]} numberOfLines={1}>
              农屿微信公众号：{wechatName}
            </Text>
            <Text style={[styles['home__socialHint'], { color: theme.colors.outline }]}>点击复制</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles['home__socialRow'], pressed ? styles['home__socialPressed'] : null]}
            onPress={() => copyText(qqGroup, 'QQ群号')}
          >
            <View style={[styles['home__socialIcon'], { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="qqchat" size={18} color={theme.colors.onSurfaceVariant} />
            </View>
            <Text style={[styles['home__socialText'], { color: theme.colors.onSurface }]} numberOfLines={1}>
              农屿官方QQ群：{qqGroup}
            </Text>
            <Text style={[styles['home__socialHint'], { color: theme.colors.outline }]}>点击复制</Text>
          </Pressable>
        </Card>
      </View>
      <Portal>
        <View style={[styles['home__toastWrap'], { top: insets.top + 82 }]}>
          <Snackbar
            visible={msgVisible}
            onDismiss={() => setMsgVisible(false)}
            duration={2000}
            style={[styles['home__toast'], { backgroundColor: theme.colors.primary }]}
          >
            {msgText}
          </Snackbar>
        </View>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  home__wrap: {
    flex: 1,
  },
  home__screen: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  home__entry: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    gap: 12,
  },
  home__entryBtn: {
    flex: 1,
    borderRadius: 12,
  },
  home__entryContent: {
    height: 46,
  },
  home__socialCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  home__socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  home__socialPressed: {
    opacity: 0.7,
  },
  home__socialIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  home__socialText: {
    flex: 1,
    fontSize: 13,
  },
  home__socialHint: {
    fontSize: 10,
  },
  home__toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  home__toast: {
    borderRadius: 12,
  },
});
