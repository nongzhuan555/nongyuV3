// 个人视图（目录化）：占位实现 + 主题切换入口（临时使用 StyleSheet）
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import ThemeChange from '@/modules/Common/ThemeChange';

const Profile = observer(() => {
  return (
    <View style={styles['profile__screen']}>
      <Text style={[styles['profile__text'], styles['profile__title']]}>这是个人</Text>
      <View style={styles['profile__center']}>
        <ThemeChange />
      </View>
    </View>
  );
});

export default Profile;

const styles = StyleSheet.create({
  profile__screen: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
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
});
