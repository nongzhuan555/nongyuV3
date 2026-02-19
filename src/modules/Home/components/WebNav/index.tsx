import React, { useMemo, useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { observer } from 'mobx-react-lite';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import { profileStore } from '@/stores/profile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type WebItem = {
  img: string;
  text: string;
  url: string;
};

const list1: WebItem[] = [
  { img: 'static/icons/logo.png', text: '川农官网', url: 'https://www.sicau.edu.cn/index.jsp' },
  { img: 'static/icons/jiaowu.png', text: '教务网', url: 'https://jiaowu.sicau.edu.cn/web/web/web/index.asp' },
  { img: 'https://xgxt.sicau.edu.cn/sys/SystemForm/MImages/07.jpg', text: '学工系统', url: 'https://xgxt.sicau.edu.cn/sys/SystemForm/main.htm' },
  { img: 'static/icons/logo.jpg', text: '后勤官网', url: 'https://hqfw.sicau.edu.cn/' },
  { img: 'https://busticket.sicau.edu.cn/img/favicon/favicon.png', text: '校车官网', url: 'https://busticket.sicau.edu.cn/' },
  { img: 'static/icons/Library.png', text: '图书馆', url: 'https://lib.sicau.edu.cn/LibSicau/' },
  { img: 'static/icons/cet.jpg', text: '四六级', url: 'https://cet.neea.edu.cn/' },
  { img: 'static/icons/ncr.jpg', text: '计算机', url: 'https://ncre.neea.edu.cn/' },
];

const list2: WebItem[] = [
  { img: 'https://xxgc.sicau.edu.cn/280-200.gif', text: '信息工程', url: 'https://xxgc.sicau.edu.cn/' },
  { img: 'static/icons/resources.png', text: '资源学院', url: 'https://zyxy.sicau.edu.cn/' },
  { img: 'static/icons/horticulture.png', text: '园艺学院', url: 'https://yyx.sicau.edu.cn/' },
  { img: 'static/icons/art.png', text: '艺术传媒', url: 'https://yscm.sicau.edu.cn/' },
  { img: 'static/icons/civil.png', text: '土木工程', url: 'https://tmgcxy.sicau.edu.cn/' },
  { img: 'static/icons/sports.png', text: '体育学院', url: 'https://ytxy.sicau.edu.cn/' },
  { img: 'static/icons/water.png', text: '水利水电', url: 'https://slsd.sicau.edu.cn/' },
  { img: 'static/icons/food.png', text: '食品学院', url: 'https://spxy.sicau.edu.cn/' },
];

const list3: WebItem[] = [
  { img: 'static/icons/life.png', text: '生命科学', url: 'https://smkx.sicau.edu.cn/' },
  { img: 'static/icons/tour.png', text: '商旅学院', url: 'https://slxy.sicau.edu.cn/' },
  { img: 'static/icons/read.png', text: '人文学院', url: 'https://rwy.sicau.edu.cn/' },
  { img: 'static/icons/agriculture.png', text: '农学院', url: 'https://nxy.sicau.edu.cn/' },
  { img: 'static/icons/forestry.png', text: '林学院', url: 'https://lxy.sicau.edu.cn/' },
  { img: 'static/icons/science.png', text: '理学院', url: 'https://lixueyuan.sicau.edu.cn/' },
  { img: 'static/icons/economics.png', text: '经济学院', url: 'https://jjxy.sicau.edu.cn/' },
  { img: 'static/icons/ME.png', text: '机电学院', url: 'https://jdxy.sicau.edu.cn/' },
];

const list4: WebItem[] = [
  { img: 'static/icons/planning.png', text: '建筑城乡', url: 'https://jg.sicau.edu.cn/' },
  { img: 'static/icons/environment.png', text: '环境学院', url: 'https://hjxy.sicau.edu.cn/' },
  { img: 'static/icons/management.png', text: '管理学院', url: 'https://glxy.sicau.edu.cn/' },
  { img: 'static/icons/public.png', text: '公共管理', url: 'https://fpa.sicau.edu.cn/' },
  { img: 'static/icons/landscape.png', text: '风景园林', url: 'https://fjylxy.sicau.edu.cn/' },
  { img: 'static/icons/law.png', text: '法学院', url: 'https://fxy.sicau.edu.cn/' },
  { img: 'static/icons/veterinary.png', text: '动物医学', url: 'https://dyy.sicau.edu.cn/' },
  { img: 'static/icons/grassland.png', text: '草业科技', url: 'https://cgst.sicau.edu.cn/index.jsp' },
];

const WebNav = observer(() => {
  const [keyword, setKeyword] = useState('');
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerTitle, setViewerTitle] = useState('');
  const list = useMemo(() => [...list1, ...list2, ...list3, ...list4], []);
  const filtered = useMemo(() => {
    const val = keyword.trim();
    if (!val) return list;
    return list.filter((item) => item.text.includes(val));
  }, [keyword, list]);

  // 计算每行4个，展示前3行的高度
  // 精确计算，去除多余buffer
  // itemHeight: icon(36) + margin(4) + text(14) = 54
  // rowGap: 8
  // panelPadding: 6 (paddingTop) + 6 (paddingBottom) = 12
  // 3行高度 = 54*3 + 8*2 + 12 = 162 + 16 + 12 = 190
  const itemHeight = 54;
  const rowGap = 8;
  const panelPadding = 12;
  const panelHeight = useMemo(() => {
    if (filtered.length === 0) return 100;
    // 固定展示3行的高度，无论实际内容多少
    return itemHeight * 3 + rowGap * 2 + panelPadding;
  }, [filtered.length]);

  const openUrl = async (item: WebItem) => {
    if (profileStore.webOpenMode === 'external') {
      await Linking.openURL(item.url);
      return;
    }
    if (viewerVisible) setViewerVisible(false);
    setViewerTitle(item.text);
    setViewerUrl(item.url);
    setViewerVisible(true);
    await WebBrowser.warmUpAsync();
  };

  const closeViewer = async () => {
    setViewerVisible(false);
    setViewerUrl('');
    setViewerTitle('');
    await WebBrowser.coolDownAsync();
  };

  return (
    <View style={styles['webnav__wrap']}>
      <View style={styles['webnav__header']}>
        <Text style={[styles['webnav__title'], { color: theme.colors.onSurface }]}>常用网站</Text>
        <Text style={[styles['webnav__sub'], { color: theme.colors.outline }]}>
          {`共 ${filtered.length} 个`}
        </Text>
      </View>
      <View style={styles['webnav__search']}>
        <TextInput
          mode="outlined"
          placeholder="搜索网站"
          value={keyword}
          onChangeText={setKeyword}
          dense
          style={[styles['webnav__searchInput'], { backgroundColor: theme.colors.surface }]}
          outlineStyle={styles['webnav__searchOutline']}
          left={
            <TextInput.Icon
              icon={() => (
                <MaterialCommunityIcons name="magnify" size={16} color={theme.colors.onSurfaceVariant} />
              )}
              style={{ marginRight: -8 }} // 减小icon与placeholder的间距
            />
          }
          contentStyle={styles['webnav__searchContent']}
          theme={{ colors: { primary: theme.colors.primary } }}
        />
      </View>
      <Card style={[styles['webnav__card'], { backgroundColor: theme.colors.surface }]}>
        <View style={[styles['webnav__panel'], { height: panelHeight }]}>
          <ScrollView contentContainerStyle={styles['webnav__cardRow']} showsVerticalScrollIndicator={false}>
            {filtered.map((item) => (
              <TouchableOpacity
                key={item.text}
                style={styles['webnav__item']}
                activeOpacity={0.8}
                onPress={() => openUrl(item)}
              >
                <View
                  style={[
                    styles['webnav__itemIcon'],
                    {
                      backgroundColor: theme.colors.surface,
                      shadowColor: theme.colors.primary, // 使用主色作为阴影色，增加通透感
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[theme.colors.surface, theme.colors.primaryContainer]} // 浅色到主题容器色的渐变，营造清新感
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles['webnav__itemGradient']}
                  >
                    <View style={[styles['webnav__itemInnerShadow'], { borderColor: theme.colors.surface }]} />
                    <Text style={[styles['webnav__itemFallbackText'], { color: theme.colors.primary }]}>
                      {item.text.slice(0, 1)}
                    </Text>
                  </LinearGradient>
                </View>
                <Text style={[styles['webnav__itemTitle'], { color: theme.colors.onSurface }]} numberOfLines={1}>
                  {item.text}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Card>
      <Modal visible={viewerVisible} animationType="slide" onRequestClose={closeViewer}>
        <View style={[styles['webnav__viewer'], { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
          <View
            style={[
              styles['webnav__viewerHeader'],
              {
                backgroundColor: theme.colors.surface,
                borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}
          >
            <IconButton icon="close" size={20} onPress={closeViewer} />
            <Text style={[styles['webnav__viewerTitle'], { color: theme.colors.onSurface }]} numberOfLines={1}>
              {viewerTitle || '网页'}
            </Text>
            <View style={styles['webnav__viewerGhost']} />
          </View>
          {viewerUrl ? <WebView source={{ uri: viewerUrl }} style={styles['webnav__viewerBody']} /> : null}
        </View>
      </Modal>
    </View>
  );
});

export default WebNav;

const styles = StyleSheet.create({
  webnav__wrap: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  webnav__header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  webnav__search: {
    marginBottom: 8,
  },
  webnav__searchInput: {
    height: 38,
  },
  webnav__searchOutline: {
    borderRadius: 12,
  },
  webnav__searchContent: {
    fontSize: 12,
  },
  webnav__title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  webnav__sub: {
    fontSize: 12,
  },
  webnav__card: {
    borderRadius: 12,
  },
  webnav__panel: {
    overflow: 'hidden',
  },
  webnav__cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6, // 减小内边距，给内容更多空间
    rowGap: 8,  // 保持适中的行间距
  },
  webnav__item: {
    width: '25%', // 改为一行4个
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  webnav__itemIcon: {
    width: 36, // 缩小尺寸
    height: 36,
    borderRadius: 12, // 保持圆润比例
    marginBottom: 4, // 减小底部间距
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  webnav__itemGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  webnav__itemInnerShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 1.5,
    opacity: 0.3,
  },
  webnav__itemFallbackText: {
    fontSize: 14, // 减小字号
    fontWeight: '500', // 减小字重
    fontFamily: 'sans-serif-rounded', // Android默认圆润字体，iOS可能需要额外字体但默认已较圆润
  },
  webnav__itemTitle: {
    fontSize: 11, // 稍微调小字体
    lineHeight: 14,
    fontWeight: '500', // 减轻字重
    textAlign: 'center',
  },
  webnav__viewer: {
    flex: 1,
  },
  webnav__viewerHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  webnav__viewerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  webnav__viewerGhost: {
    width: 40,
  },
  webnav__viewerBody: {
    flex: 1,
  },
});
