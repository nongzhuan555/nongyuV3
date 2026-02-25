import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions, TouchableWithoutFeedback, Share, Platform, Alert, ScrollView, ToastAndroid, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Text, useTheme, Surface, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { captureScreen } from 'react-native-view-shot';
import * as WeChat from '@/utils/wechat';
import SharePoster from '../SharePoster';
import analytics from '@/sdk/analytics';

interface ShareSheetProps {
  visible: boolean;
  onDismiss: () => void;
  screenshotUri?: string | null;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

const ShareSheet: React.FC<ShareSheetProps> = ({ visible, onDismiss, screenshotUri }) => {
  const theme = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posterVisible, setPosterVisible] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [internalScreenshotUri, setInternalScreenshotUri] = useState<string | null>(null);

  // WeChat initialization is handled in App.tsx
  const shareThumbCache = useRef<string | null>(null);
  const buildShareThumb = async () => {
    if (shareThumbCache.current) return shareThumbCache.current;
    try {
      const mod = await import('expo-image-manipulator');
      const resolved = Image.resolveAssetSource(require('../../../assets/icon.png'));
      const uri = resolved?.uri ?? '';
      const result = await mod.manipulateAsync(
        uri,
        [{ resize: { width: 96, height: 96 } }],
        { compress: 1, format: mod.SaveFormat.PNG, base64: false }
      );
      const out = result?.uri ?? '';
      shareThumbCache.current = out;
      return out;
    } catch {
      const resolved = Image.resolveAssetSource(require('../../../assets/icon.png'));
      const uri = resolved?.uri ?? '';
      let out = uri;
      try {
        if (uri?.startsWith('file://')) {
          const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          out = `data:image/jpeg;base64,${b64}`;
        }
      } catch {}
      shareThumbCache.current = out;
      return out;
    }
  };

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Platform.OS === 'ios' ? undefined : undefined,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setShowModal(false));
    }
  }, [visible]);

  const handleClose = () => {
    onDismiss();
  };

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('提示', message);
    }
  };

  const handleShare = async (platform: string) => {
    const platformName = platform === 'wechat' ? '微信好友' : 
                        platform === 'moments' ? '朋友圈' : 
                        platform === 'system' ? '系统分享' : 
                        platform === 'copy' ? '复制链接' : platform;
                        
    analytics.trackClick('share_action', 'ShareSheet', {
      element_name: `分享到${platformName}`,
      page_name: 'ShareSheet',
      platform: platform
    });

    if (loading) return;
    setLoading(true);
    try {
      if (platform === 'wechat' || platform === 'moments') {
        const isInstalled = await WeChat.isWechatInstalled();
        
        if (!isInstalled) {
          const isNativeAvailable = await WeChat.isNativeModuleAvailable();
          if (!isNativeAvailable) {
            Alert.alert(
              '开发提示', 
              '检测到原生微信模块未加载。\n请运行 "npx expo run:android" 重新构建应用以启用微信分享功能。',
              [
                { text: '取消', style: 'cancel' },
                { 
                  text: '使用系统分享', 
                  onPress: async () => {
                    await Share.share({
                      message: '为川农er打造的专属校园助手app，课表、教务、二课一网打尽！\nhttps://nongyu-app.github.io/index.html',
                      title: '分享农屿',
                    });
                  }
                }
              ]
            );
          } else {
            showToast('未检测到微信客户端，请先安装');
          }
          setLoading(false);
          return;
        }

        try {
          const thumbImage = await buildShareThumb();
          if (platform === 'wechat') {
            await WeChat.shareWebpage({
              title: '农屿 - 专属川农er的校园助手',
              description: '在农屿，无广告课表、便捷教务信息查询、i川农二课接入，你想要的，农屿都能做到！',
              thumbImage,
              webpageUrl: 'https://nongyu-app.github.io/index.html',
              scene: 0, // 0: Session, 1: Timeline, 2: Favorite
            });
          } else {
            await WeChat.shareWebpage({
              title: '农屿 - 专属川农er的校园助手',
              description: '在农屿，无广告课表、便捷教务信息查询、i川农二课接入，你想要的，农屿都能做到！',
              thumbImage,
              webpageUrl: 'https://nongyu-app.github.io/index.html',
              scene: 1, // Timeline
            });
          }
        } catch (e: any) {
          showToast('分享失败: ' + (e.message || '未知错误'));
        }
      } else if (platform === 'system') {
        try {
          await Share.share({
            message: '为川农er打造的专属校园助手app\nhttps://nongyu-app.github.io/index.html',
            title: '分享农屿',
          });
        } catch (error: any) {
          showToast(error.message);
        }
      } else if (platform === 'copy') {
        await Clipboard.setStringAsync('https://nongyu-app.github.io/index.html');
        showToast('链接已复制');
      }
    } catch (error) {
      console.error(error);
      showToast('操作失败');
    } finally {
      setLoading(false);
      onDismiss();
    }
  };

  const handleGeneratePoster = () => {
    analytics.trackClick('share_action', 'ShareSheet', {
      element_name: '生成海报',
      page_name: 'ShareSheet',
      platform: 'poster'
    });

    // Close the sheet first
    onDismiss();
    
    // Small delay to allow the sheet to close completely before capturing
    setTimeout(async () => {
      try {
        // Capture the screen
        const uri = await captureScreen({
          format: 'jpg',
          quality: 0.8,
        });
        setInternalScreenshotUri(uri);
        setPosterVisible(true);
      } catch (e) {
        console.log('Capture failed', e);
        setInternalScreenshotUri(null);
        setPosterVisible(true);
      }
    }, 500);
  };

  return (
    <>
      {showModal && (
        <Modal
          visible={showModal}
          transparent
          animationType="none"
          onRequestClose={handleClose}
        >
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={handleClose}>
              <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
            </TouchableWithoutFeedback>
            
            <Animated.View 
              style={[
                styles.sheetContainer, 
                { 
                  transform: [{ translateY: slideAnim }],
                  backgroundColor: theme.colors.surface,
                }
              ]}
            >
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.onSurface }]}>分享给好友</Text>
              </View>

              <View style={styles.grid}>
                <TouchableOpacity style={styles.gridItem} onPress={() => handleShare('wechat')}>
                  <View style={[styles.iconBox, { backgroundColor: '#E7FAF0' }]}>
                    <MaterialCommunityIcons name="wechat" size={28} color="#07C160" />
                  </View>
                  <Text style={[styles.gridLabel, { color: theme.colors.onSurfaceVariant }]}>微信好友</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridItem} onPress={() => handleShare('moments')}>
                  <View style={[styles.iconBox, { backgroundColor: '#E7FAF0' }]}>
                    <MaterialCommunityIcons name="camera-iris" size={28} color="#07C160" />
                  </View>
                  <Text style={[styles.gridLabel, { color: theme.colors.onSurfaceVariant }]}>朋友圈</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridItem} onPress={handleGeneratePoster}>
                  <View style={[styles.iconBox, { backgroundColor: '#FFF0E6' }]}>
                    <MaterialCommunityIcons name="image-outline" size={28} color="#FF9500" />
                  </View>
                  <Text style={[styles.gridLabel, { color: theme.colors.onSurfaceVariant }]}>生成海报</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridItem} onPress={() => handleShare('system')}>
                  <View style={[styles.iconBox, { backgroundColor: '#F0F2F5' }]}>
                    <MaterialCommunityIcons name="share-variant" size={28} color="#666" />
                  </View>
                  <Text style={[styles.gridLabel, { color: theme.colors.onSurfaceVariant }]}>系统分享</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.gridItem} onPress={() => handleShare('copy')}>
                  <View style={[styles.iconBox, { backgroundColor: '#F0F2F5' }]}>
                    <MaterialCommunityIcons name="link" size={28} color="#666" />
                  </View>
                  <Text style={[styles.gridLabel, { color: theme.colors.onSurfaceVariant }]}>复制链接</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.cancelButton, { borderTopColor: theme.colors.outlineVariant }]} 
                onPress={handleClose}
              >
                <Text style={[styles.cancelText, { color: theme.colors.onSurface }]}>取消</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}

      <SharePoster 
        visible={posterVisible} 
        onDismiss={() => setPosterVisible(false)}
        screenshotUri={internalScreenshotUri || screenshotUri}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  gridItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 12,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelText: {
    fontSize: 16,
  },
});

export default ShareSheet;
