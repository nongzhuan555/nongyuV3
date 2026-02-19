import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { themeStore } from '@/theme';

const COLORS = [
  { key: 'green', color: '#0A7C59', name: '川农新绿' },
  { key: 'sakura', color: '#FFB7C5', name: '樱花浅粉' },
] as const;

const MODES = [
  { key: 'light', icon: 'weather-sunny', label: '浅色' },
  { key: 'dark', icon: 'weather-night', label: '深色' },
  { key: 'system', icon: 'theme-light-dark', label: '自动' },
] as const;

const ThemeChange = observer(() => {
  const theme = useTheme();

  const handleModeChange = async (mode: 'light' | 'dark' | 'system') => {
    await themeStore.setMode(mode);
    if (mode === 'dark') {
       // 保持原有逻辑，切到 dark 时强制 green
       await themeStore.setBrand('green');
    }
  };

  const handleColorChange = async (color: 'green' | 'sakura') => {
    await themeStore.setBrand(color);
    if (themeStore.isDark) {
      // 保持原有逻辑，切颜色时切回 light
      await themeStore.setMode('light');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>外观模式</Text>
        <View style={styles.modeRow}>
          {MODES.map((item) => {
            const isSelected = themeStore.mode === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => handleModeChange(item.key)}
                activeOpacity={0.7}
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                  }
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={24}
                  color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.modeLabel,
                    { color: isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant }
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>主题色</Text>
        <View style={styles.colorRow}>
          {COLORS.map((item) => {
            const isSelected = themeStore.brand === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => handleColorChange(item.key)}
                activeOpacity={0.8}
                style={styles.colorItem}
              >
                <View style={[styles.colorCircle, { backgroundColor: item.color }]}>
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={24} color={item.key === 'sakura' ? '#3A2A31' : '#fff'} />
                  )}
                </View>
                <Text style={[styles.colorLabel, { color: theme.colors.onSurface }]}>{item.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
});

export default ThemeChange;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 4,
  },
  colorItem: {
    alignItems: 'center',
    gap: 8,
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
