import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { DEFAULT_NOTICE } from '@/modules/Home/components/NoticeBar';

type RouteParams = {
  content?: string;
  title?: string;
  created_at?: string;
  type?: number;
};

export default function NoticeDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const params = route.params as RouteParams | undefined;
  const content = useMemo(() => params?.content?.trim() || DEFAULT_NOTICE, [params?.content]);
  const title = params?.title || '通知详情';
  const date = params?.created_at ? new Date(params.created_at).toLocaleString() : '';

  const markdownStyles = useMemo(() => ({
    body: {
      color: theme.colors.onSurface,
      fontSize: 15,
      lineHeight: 24,
    },
    heading1: {
      color: theme.colors.onSurface,
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    heading2: {
      color: theme.colors.onSurface,
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 8,
      marginTop: 8,
    },
    heading3: {
      color: theme.colors.onSurface,
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 6,
      marginTop: 6,
    },
    heading4: {
      color: theme.colors.onSurface,
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 4,
      marginTop: 4,
    },
    link: {
      color: theme.colors.primary,
    },
    code_inline: {
      backgroundColor: theme.colors.surfaceVariant,
      color: theme.colors.onSurfaceVariant,
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    code_block: {
      backgroundColor: theme.colors.surfaceVariant,
      color: theme.colors.onSurfaceVariant,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
    },
    blockquote: {
      backgroundColor: theme.colors.surfaceVariant,
      borderLeftColor: theme.colors.primary,
      borderLeftWidth: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginVertical: 8,
    },
    hr: {
      backgroundColor: theme.colors.outline,
      height: 1,
      marginVertical: 16,
    },
  }), [theme.colors]);

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
        <Text style={[styles['notice__title'], { color: theme.colors.onBackground }]}>{title}</Text>
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
        {date ? (
          <Text style={[styles['notice__date'], { color: theme.colors.onSurfaceVariant }]}>
            发布时间：{date}
          </Text>
        ) : null}
        <Markdown style={markdownStyles}>
          {content}
        </Markdown>
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
  notice__date: {
    fontSize: 12,
    marginBottom: 16,
    opacity: 0.7,
  },
  notice__content: {
    fontSize: 15,
    lineHeight: 22,
  },
});
