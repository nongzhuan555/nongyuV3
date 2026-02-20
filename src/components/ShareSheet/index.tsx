import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions, TouchableWithoutFeedback, Share, Platform, Alert, ScrollView, ToastAndroid } from 'react-native';
import { Text, useTheme, Surface, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { captureScreen } from 'react-native-view-shot';
import * as WeChat from '@/utils/wechat';
import SharePoster from '../SharePoster';

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
  // const [screenshotUri, setScreenshotUri] = useState<string | null>(null); // Passed as prop now or handled internally? 
  // Wait, in previous implementation (from Read output), screenshotUri was state inside ShareSheet?
  // Let's check the Read output again.
  // Line 23: const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  
  // However, the user request implies capturing screen from outside might be better if we want to capture a specific view?
  // But captureScreen captures the whole screen.
  // The user says "Generate poster button is in Profile section".
  
  // If I move this component, I should keep the logic.
  // The previous Read output showed:
  /*
  23→  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  ...
  113→  const handleGeneratePoster = () => {
  114→    // Close the sheet first
  115→    onDismiss();
  116→    
  117→    // Small delay to allow the sheet to close completely before capturing
  118→    setTimeout(async () => {
  119→      try {
  120→        // Capture the screen
  121→        const uri = await captureScreen({
  122→          format: 'jpg',
  123→          quality: 0.8,
  124→        });
  125→        setScreenshotUri(uri);
  126→        setPosterVisible(true);
  127→      } catch (e) {
  128→        console.log('Capture failed', e);
  129→        setScreenshotUri(null);
  130→        setPosterVisible(true);
  131→      }
  132→    }, 500);
  133→  };
  */
  
  // So ShareSheet handles the capture itself. This is good.
  // It captures the screen *after* dismissing itself.
  // So if I call ShareSheet from Course page, it will dismiss, then capture the Course page.
  // That is exactly what we want!
  
  // So I just need to copy the content exactly as it was.
  
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [internalScreenshotUri, setInternalScreenshotUri] = useState<string | null>(null);

  // WeChat initialization is handled in App.tsx

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
                      message: '快来加入农屿，体验更便捷的校园生活！https://nongyu.app',
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
          if (platform === 'wechat') {
            await WeChat.shareWebpage({
              title: '农屿 - 川农学子的贴心助手',
              description: '课表成绩一键查，考试安排早知道。让校园生活更简单，点击立即体验！',
              thumbImage: 'https://nongyu.app/logo.png',
              webpageUrl: 'https://nongyu.app',
              scene: 0, // 0: Session, 1: Timeline, 2: Favorite
            });
          } else {
            await WeChat.shareWebpage({
              title: '农屿 - 川农学子的贴心助手',
              description: '课表成绩一键查，考试安排早知道。让校园生活更简单，点击立即体验！',
              thumbImage: 'https://nongyu.app/logo.png',
              webpageUrl: 'https://nongyu.app',
              scene: 1, // Timeline
            });
          }
        } catch (e: any) {
          showToast('分享失败: ' + (e.message || '未知错误'));
        }
      } else if (platform === 'system') {
        try {
          await Share.share({
            message: '农屿 - 川农学子的贴心助手\n课表成绩一键查，考试安排早知道。让校园生活更简单，点击立即体验！\nhttps://nongyu.app',
            title: '分享农屿',
          });
        } catch (error: any) {
          showToast(error.message);
        }
      } else if (platform === 'copy') {
        await Clipboard.setStringAsync('https://nongyu.app');
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
