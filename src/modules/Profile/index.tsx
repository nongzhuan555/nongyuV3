import React, { useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet, Animated, Easing } from 'react-native';
import { Button } from 'react-native-paper';
import { observer } from 'mobx-react-lite';
import JiaowuLoginProbe from './components/JiaowuLoginProbe';
import TopTab from '@/shared/components/TopTab';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Profile = observer(() => {
  const [logged, setLogged] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  useEffect(() => {
    Animated.timing(progress, {
      toValue: logged ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [logged]);

  const loginOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const loginTranslate = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const mineOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const mineTranslate = progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <View style={styles['profile__screen']}>
      <TopTab />
      <Animated.View
        pointerEvents={logged ? 'none' : 'auto'}
        style={[styles.layer, { top: insets.top, opacity: loginOpacity, transform: [{ translateY: loginTranslate }] }]}
      >
        <View style={styles['profile__center']}>
          <JiaowuLoginProbe onSuccess={() => setLogged(true)} />
        </View>
      </Animated.View>
      <Animated.View
        pointerEvents={logged ? 'auto' : 'none'}
        style={[styles.layer, { top: insets.top, opacity: mineOpacity, transform: [{ translateY: mineTranslate }] }]}
      >
        <View style={styles['profile__mineWrap']}>
          <Text style={styles['profile__mineText']}>我的页面</Text>
          <Button mode="outlined" style={styles['logoutBtn']} onPress={() => setLogged(false)}>
            退出登录
          </Button>
        </View>
      </Animated.View>
    </View>
  );
});

export default Profile;

const styles = StyleSheet.create({
  profile__screen: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'relative',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profile__text: {
    fontSize: 20,
    color: '#333',
  },
  profile__title: {
    marginBottom: 12,
  },
  profile__label: {
    marginBottom: 8,
  },
  profile__center: {
    alignItems: 'center',
    width: '100%',
  },
  profile__mineWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  profile__mineText: {
    fontSize: 22,
    color: '#333',
  },
  logoutBtn: {
    marginTop: 12,
    borderRadius: 10,
  },
});
