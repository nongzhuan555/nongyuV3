import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Alert, Dimensions, ScrollView, Image, SafeAreaView, Pressable, StatusBar, Platform } from 'react-native';
import { Text, Button, useTheme, Surface, Avatar } from 'react-native-paper';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import { profileStore } from '@/stores/profile';
import { observer } from 'mobx-react-lite';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SharePosterProps {
  visible: boolean;
  onDismiss: () => void;
  screenshotUri?: string | null;
}

const { width, height } = Dimensions.get('window');
const POSTER_WIDTH = width * 0.88;

// --- 海报配置区域 ---
const POSTER_CONFIG = {
  appName: '农屿 NongYu',
  slogan: '让校园生活更简单',
  qrCodeUrl: 'https://nongyu-app.github.io/index.html',
  scanHint: '长按识别二维码',
};
// --------------------

const SharePoster: React.FC<SharePosterProps> = observer(({ visible, onDismiss, screenshotUri }) => {
  const theme = useTheme();
  const viewShotRef = useRef<ViewShot>(null);
  const [processing, setProcessing] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const profile = profileStore.profile;
  const userName = profile.name || '农屿用户';
  const userAvatarText = (userName?.[0] || 'N').toUpperCase();
  const currentDate = new Date().toLocaleDateString();

  useEffect(() => {
    if (screenshotUri) {
      Image.getSize(screenshotUri, (w, h) => {
        // Calculate aspect ratio
        const aspectRatio = h / w;
        // Calculate display height based on poster width (minus padding)
        const contentWidth = POSTER_WIDTH - 48; // 24 * 2 padding
        const calculatedHeight = contentWidth * aspectRatio;
        
        setImageSize({ 
          width: contentWidth, 
          height: calculatedHeight 
        });
      }, (error) => {
        console.error('Failed to get image size', error);
      });
    }
  }, [screenshotUri]);

  // 生成并保存海报
  const handleSave = async () => {
    if (processing) return;
    setProcessing(true);

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要访问相册权限以保存海报');
        setProcessing(false);
        return;
      }

      // Capture with better quality
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error('生成海报失败');

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
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error('生成海报失败');

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('分享不可用', '当前设备不支持直接分享文件');
        setProcessing(false);
        return;
      }

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
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        {/* 背景遮罩 - 使用绝对定位填满全屏 */}
        <Pressable 
          style={styles.backdrop} 
          onPress={onDismiss}
        />
        
        {/* 滚动容器层 - 覆盖在遮罩之上 */}
        <View style={styles.scrollWrapper} pointerEvents="box-none">
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
            // 确保点击ScrollView的空白区域也会关闭Modal（如果在内容之外）
            // 但ScrollView通常会拦截触摸。
            // 可以在这里加一个Pressable包裹内容来拦截冒泡
          >
            <Pressable style={styles.posterWrapper} onPress={() => {}}>
              <ViewShot 
                ref={viewShotRef} 
                options={{ format: 'png', quality: 1.0, result: 'tmpfile' }}
                style={[styles.posterCard, { backgroundColor: '#FFFFFF' }]}
              >
                {/* Header: Minimalist User Info */}
                <View style={styles.header}>
                  <View style={styles.userInfo}>
                    <Avatar.Text 
                      size={40} 
                      label={userAvatarText} 
                      style={{ backgroundColor: theme.colors.primaryContainer }}
                      color={theme.colors.onPrimaryContainer}
                    />
                    <View style={styles.userMeta}>
                      <Text style={styles.userName}>{userName}</Text>
                      <Text style={styles.dateText}>{currentDate}</Text>
                    </View>
                  </View>
                  <View style={styles.brandTag}>
                    <MaterialCommunityIcons name="sprout" size={16} color={theme.colors.primary} />
                    <Text style={[styles.brandText, { color: theme.colors.primary }]}>农屿</Text>
                  </View>
                </View>

                {/* Body: Screenshot or Content */}
                <View style={styles.body}>
                  {screenshotUri ? (
                    <View style={[styles.screenshotContainer, { height: imageSize.height || 300 }]}>
                      <Image 
                        source={{ uri: screenshotUri }} 
                        style={styles.screenshot} 
                        resizeMode="contain"
                      />
                    </View>
                  ) : (
                    <View style={styles.placeholderContent}>
                      <Text style={styles.placeholderText}>暂无内容</Text>
                    </View>
                  )}
                  
                  {/* Motivational Quote or Slogan */}
                  <View style={styles.sloganContainer}>
                    <Text style={styles.mainSlogan}>{POSTER_CONFIG.slogan}</Text>
                    <View style={styles.divider} />
                  </View>
                </View>

                {/* Footer: QR Code & Branding */}
                <View style={styles.footer}>
                  <View style={styles.qrSection}>
                    <View style={styles.qrBorder}>
                      <QRCode
                        value={POSTER_CONFIG.qrCodeUrl}
                        size={70}
                        color="#000"
                        backgroundColor="transparent"
                      />
                    </View>
                    <View style={styles.qrTextContainer}>
                      <Text style={styles.appName}>{POSTER_CONFIG.appName}</Text>
                      <Text style={styles.scanHint}>{POSTER_CONFIG.scanHint}</Text>
                    </View>
                  </View>
                </View>
              </ViewShot>
            </Pressable>
            
            {/* Spacer for bottom actions */}
            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Floating Action Bar - 放在 ScrollWrapper 内，绝对定位 */}
          <SafeAreaView style={styles.actionBarContainer} pointerEvents="box-none">
            <View style={styles.actionBar}>
              <Surface style={styles.actionSurface} elevation={4}>
                <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
                </TouchableOpacity>
                
                <View style={styles.mainActions}>
                  <Button 
                    mode="outlined" 
                    onPress={handleShare}
                    icon="share-variant"
                    style={styles.actionBtn}
                    disabled={processing}
                  >
                    分享
                  </Button>
                  <Button 
                    mode="contained" 
                    onPress={handleSave}
                    icon="download"
                    style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                    disabled={processing}
                    loading={processing}
                  >
                    保存海报
                  </Button>
                </View>
              </Surface>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1,
  },
  scrollWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    justifyContent: 'flex-start',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 20 : 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  posterWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  posterCard: {
    width: POSTER_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 24,
    backgroundColor: '#FFFFFF',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userMeta: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#8e8e93',
  },
  brandTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  body: {
    marginBottom: 24,
  },
  screenshotContainer: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  screenshot: {
    width: '100%',
    height: '100%',
  },
  placeholderContent: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
    borderRadius: 12,
  },
  placeholderText: {
    color: '#8e8e93',
  },
  sloganContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  mainSlogan: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1a1a1a',
    letterSpacing: 1,
    textAlign: 'center',
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: '#e5e5e5',
    marginTop: 12,
    borderRadius: 2,
  },
  footer: {
    marginTop: 10,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  qrSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBorder: {
    padding: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  qrTextContainer: {
    marginLeft: 16,
    justifyContent: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  scanHint: {
    fontSize: 12,
    color: '#8e8e93',
  },
  actionBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
  actionBar: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  actionSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 8,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 400,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mainActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtn: {
    borderRadius: 20,
  },
});

export default SharePoster;
