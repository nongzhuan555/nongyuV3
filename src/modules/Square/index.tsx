import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Surface, Icon } from 'react-native-paper';
import TopTab from '@/shared/components/TopTab';

export default function Square() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TopTab />
      <ScrollView contentContainerStyle={styles.content}>
        <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <View style={styles.iconContainer}>
            <Icon source="store-off-outline" size={64} color={theme.colors.secondary} />
          </View>
          
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>
            广场模块暂未开放
          </Text>
          
          <Text variant="bodyLarge" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
            出于核心功能原则，农屿暂时关闭了广场模块。
          </Text>
          
          <Text variant="bodyLarge" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
            若您希望农屿开通广场模块，可通过农屿官方公众号、官方用户QQ群或者直接联系开发者等方式表达意愿。
          </Text>
          
          <Text variant="bodyLarge" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
            若用户意愿强烈，在不久的将来，我们将以“农家大院”的新名称正式开启农屿广场功能。
          </Text>
        </Surface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 32,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  title: {
    marginBottom: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  message: {
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
