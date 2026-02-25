import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { IconButton, Text, useTheme, Switch, Divider, Surface } from 'react-native-paper';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ThemeChange from '@/modules/Common/ThemeChange';
import { profileStore } from '@/stores/profile';
import analytics from '@/sdk/analytics';

const SettingItem = ({  
  title, 
  description, 
  value, 
  onValueChange, 
  disabled = false 
}: { 
  title: string; 
  description?: string; 
  value: boolean; 
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) => {
  const theme = useTheme();
  return (
    <View style={styles.itemContainer}>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: theme.colors.onSurface }]}>{title}</Text>
        {description && (
          <Text style={[styles.itemDescription, { color: theme.colors.onSurfaceVariant }]}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        color={theme.colors.primary}
      />
    </View>
  );
};

const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const theme = useTheme();
  return (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{title}</Text>
      <Surface style={[styles.sectionContent, { backgroundColor: theme.colors.surface }]} elevation={0}>
        {children}
      </Surface>
    </View>
  );
};

const Setting = observer(() => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 顶部导航栏 */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton 
          icon="arrow-left" 
          size={24} 
          onPress={() => navigation.goBack()} 
          iconColor={theme.colors.onSurface}
        />
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>设置</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SettingSection title="外观与体验">
          <ThemeChange />
        </SettingSection>

        <SettingSection title="常规设置">
          <SettingItem
            title="应用内打开网页"
            description="关闭后将使用系统默认浏览器打开链接"
            value={profileStore.webOpenMode === 'internal'}
            onValueChange={(v) => {
              const newValue = v ? 'internal' : 'external';
              profileStore.setWebOpenMode(newValue);
              analytics.trackClick('setting_change', 'ProfileSetting', {
                element_name: '应用内打开网页',
                page_name: 'ProfileSetting',
                new_value: newValue
              });
            }}
          />
          <Divider style={{ marginHorizontal: 16 }} />
          <SettingItem
            title="优先进入课表"
            description="启动应用时直接显示课表页面"
            value={profileStore.defaultCourse}
            onValueChange={(v) => {
              profileStore.setDefaultCourse(v);
              analytics.trackClick('setting_change', 'ProfileSetting', {
                element_name: '优先进入课表',
                page_name: 'ProfileSetting',
                new_value: v ? 'true' : 'false'
              });
            }}
          />
        </SettingSection>
      </ScrollView>
    </View>
  );
});

export default Setting;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 4,
    opacity: 0.8,
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  itemContent: {
    flex: 1,
    marginRight: 16,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
});
