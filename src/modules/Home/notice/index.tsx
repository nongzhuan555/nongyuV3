import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_NOTICE } from '@/modules/Home/components/NoticeBar';

type RouteParams = {
  content?: string;
};

export default function NoticeDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const params = route.params as RouteParams | undefined;
  const content = useMemo(() => params?.content?.trim() || DEFAULT_NOTICE, [params?.content]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles['notice__screen'],
        { paddingTop: insets.top + 8, backgroundColor: theme.colors.background },
      ]}
    >
      <View style={styles['notice__header']}>
        <Button mode="text" onPress={() => navigation.goBack()} contentStyle={styles['notice__backContent']}>
          返回
        </Button>
        <Text style={[styles['notice__title'], { color: theme.colors.onBackground }]}>通知详情</Text>
        <View style={styles['notice__ghost']} />
      </View>
      <View
        style={[
          styles['notice__card'],
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}
      >
        <Text style={[styles['notice__content'], { color: theme.colors.onSurface }]}>{content}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  notice__screen: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  notice__header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  notice__backContent: {
    paddingHorizontal: 8,
  },
  notice__title: {
    fontSize: 18,
    fontWeight: '700',
  },
  notice__ghost: {
    width: 48,
  },
  notice__card: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  notice__content: {
    fontSize: 15,
    lineHeight: 22,
  },
});
