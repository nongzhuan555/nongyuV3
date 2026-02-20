import React, { useRef, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Platform, Alert, Dimensions, ScrollView, Image } from 'react-native';
import { Text, Button, IconButton, useTheme, Surface, ActivityIndicator, Avatar } from 'react-native-paper';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { profileStore } from '@/stores/profile';
import { observer } from 'mobx-react-lite';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SharePosterProps {
  visible: boolean;
  onDismiss: () => void;
  screenshotUri?: string | null;
}

const { width } = Dimensions.get('window');
const POSTER_WIDTH = width * 0.85;

// --- 海报配置区域 ---
const POSTER_CONFIG = {
  appName: '农屿 NongYu',
  slogan: '川农学子的贴心助手',
  inviteText: '让校园生活更简单',
  qrCodeUrl: 'https://nongyu.app', // 二维码跳转链接
  scanHint: '长按识别二维码 / 扫码进入农屿官网下载',
};
// --------------------

const SharePoster: React.FC<SharePosterProps> = observer(({ visible, onDismiss, screenshotUri }) => {
  const theme = useTheme();
  const viewShotRef = useRef<ViewShot>(null);
  const [processing, setProcessing] = useState(false);

  const profile = profileStore.profile;
  const userName = profile.name || '农屿用户';
  const userAvatarText = (userName?.[0] || 'N').toUpperCase();

  // 生成并保存海报
  const handleSave = async () => {
    if (processing) return;
    setProcessing(true);

    try {
      // 1. 请求权限
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要访问相册权限以保存海报');
        setProcessing(false);
        return;
      }

      // 2. 截图
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error('生成海报失败');

      // 3. 保存
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('保存成功', '海报已保存到相册', [{ text: '好的', onPress: onDismiss }]);
    } catch (error: any) {
      Alert.alert('保存失败', error.message || '未知错误');
    } finally {
      setProcessing(false);
    }
  };

  // 生成并直接分享
  const handleShare = async () => {
    if (processing) return;
    setProcessing(true);

    try {
      // 1. 截图
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error('生成海报失败');

      // 2. 检查分享是否可用
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('分享不可用', '当前设备不支持直接分享文件');
        setProcessing(false);
        return;
      }

      // 3. 分享
      await Sharing.shareAsync(uri);
    } catch (error: any) {
      Alert.alert('分享失败', error.message || '未知错误');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.container}>
        <View style={styles.backdrop} />
        
        <View style={styles.content}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ViewShot 
              ref={viewShotRef} 
              options={{ format: 'png', quality: 1.0 }}
              style={[styles.posterContainer, { backgroundColor: theme.colors.surface }]}
            >
              {/* 顶部装饰 */}
              <LinearGradient
                colors={['#4facfe', '#00f2fe']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerDecoration}
              />

              <View style={styles.posterBody}>
                {/* 用户信息 */}
                <View style={styles.userInfo}>
                  <Avatar.Text 
                    size={50} 
                    label={userAvatarText} 
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                    color={theme.colors.onPrimaryContainer}
                  />
                  <View style={styles.userMeta}>
                    <Text style={[styles.userName, { color: theme.colors.onSurface }]}>{userName}</Text>
                    <Text style={[styles.inviteText, { color: theme.colors.onSurfaceVariant }]}>
                      {POSTER_CONFIG.inviteText}
                    </Text>
                  </View>
                </View>

                {/* 截图区域 (如果存在) */}
                {screenshotUri && (
                  <View style={styles.screenshotWrapper}>
                    <Image 
                      source={{ uri: screenshotUri }} 
                      style={styles.screenshot} 
                      resizeMode="contain"
                    />
                  </View>
                )}

                {/* 主要内容 */}
                <View style={styles.mainContent}>
                  <Text style={[styles.appName, { color: theme.colors.primary }]}>{POSTER_CONFIG.appName}</Text>
                  <Text style={[styles.slogan, { color: theme.colors.onSurfaceVariant }]}>{POSTER_CONFIG.slogan}</Text>
                </View>

                {/* 底部二维码 */}
                <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
                  <View style={styles.qrCodeContainer}>
                    <QRCode
                      value={POSTER_CONFIG.qrCodeUrl}
                      size={80}
                      color={theme.colors.onSurface}
                      backgroundColor="transparent"
                    />
                  </View>
                  <View style={styles.footerText}>
                    <Text style={[styles.scanHint, { color: theme.colors.onSurfaceVariant }]}>
                      {POSTER_CONFIG.scanHint}
                    </Text>
                    <View style={styles.logoRow}>
                      <MaterialCommunityIcons name="sprout" size={16} color={theme.colors.primary} />
                      <Text style={[styles.footerLogo, { color: theme.colors.onSurfaceVariant }]}>
                        NongYu App
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ViewShot>
          </ScrollView>

          {/* 底部操作栏 */}
          <View style={styles.actionBar}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onDismiss}
              disabled={processing}
            >
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.actionButtons}>
              <Button 
                mode="contained" 
                onPress={handleShare}
                style={styles.actionBtn}
                icon="share-variant"
                loading={processing}
                disabled={processing}
              >
                分享
              </Button>
              <Button 
                mode="contained-tonal" 
                onPress={handleSave}
                style={styles.actionBtn}
                icon="download"
                loading={processing}
                disabled={processing}
              >
                保存
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  content: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80, // Space for action bar
  },
  posterContainer: {
    width: POSTER_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
  },
  headerDecoration: {
    height: 120,
    width: '100%',
    marginBottom: -60,
  },
  posterBody: {
    padding: 20,
    paddingTop: 70,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userMeta: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  inviteText: {
    fontSize: 12,
    marginTop: 2,
  },
  screenshotWrapper: {
    width: '100%',
    height: 500,
    backgroundColor: '#fff',
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  screenshot: {
    width: '100%',
    height: '100%',
  },
  mainContent: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 1,
  },
  slogan: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  qrCodeContainer: {
    padding: 4,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  footerText: {
    marginLeft: 16,
    flex: 1,
  },
  scanHint: {
    fontSize: 10,
    marginBottom: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLogo: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    minWidth: 80,
  },
});

export default SharePoster;
