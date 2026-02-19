import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

type NoticeBarProps = {
  content?: string | null;
};

export const DEFAULT_NOTICE = '欢迎使用农屿，这是农屿的官方通知栏~';

export default function NoticeBar({ content }: NoticeBarProps) {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const text = content?.trim() ? content.trim() : DEFAULT_NOTICE;

  return (
    <Pressable
      style={({ pressed }) => [
        styles['notice__wrap'],
        { 
          backgroundColor: theme.dark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.25)',
          borderWidth: 1,
          borderColor: theme.dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.6)'
        },
        pressed ? styles['notice__wrapPressed'] : null,
      ]}
      onPress={() => navigation.navigate('NoticeDetail', { content: text })}
    >
      <View style={[styles['notice__badge'], { backgroundColor: theme.colors.primary }]}>
        <MaterialCommunityIcons name="bullhorn" size={14} color={theme.colors.onPrimary} />
      </View>
      <Text style={[styles['notice__text'], { color: theme.colors.onSurface }]} numberOfLines={1} ellipsizeMode="tail">
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  notice__wrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  notice__wrapPressed: {
    opacity: 0.86,
  },
  notice__badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  notice__text: {
    flex: 1,
    fontSize: 14,
  },
});
