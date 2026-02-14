// 主题模块：负责全局主题的状态、构建与持久化
// 设计目标：
// 1) 将主题相关逻辑从 App.tsx 中抽离，保持入口简洁
// 2) 支持明/暗主题切换，并可扩展更多品牌色（brand）
// 3) 把用户偏好持久化到 AsyncStorage，保证重启后仍然生效
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MD3DarkTheme as PaperDarkTheme,
  MD3LightTheme as PaperLightTheme,
  MD3Theme,
} from 'react-native-paper';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  Theme as NavigationTheme,
} from '@react-navigation/native';
import { makeAutoObservable } from 'mobx';
import { Appearance, ColorSchemeName } from 'react-native';

// 品牌色定义：后续如需增加其它主题色，只需在此处新增一项并设置对应色值
// 注意：尽量只覆盖 MD3 中常用的 primary/secondary/tertiary 等关键色，避免大范围覆盖导致视觉不一致
export type BrandName = 'green' | 'sakura' | 'default';

const BRAND_PALETTES: Record<
  BrandName,
  {
    primary: string;
    onPrimary: string;
    secondary: string;
    onSecondary: string;
    tertiary: string;
    background: string;
    onBackground: string;
    surface: string;
    onSurface: string;
    outline: string;
  }
> = {
  // 为兼容历史存储值，default 等同于 green
  default: {
    primary: '#0A7C59',
    onPrimary: '#FFFFFF',
    secondary: '#2E7D6E',
    onSecondary: '#FFFFFF',
    tertiary: '#8FBF9B',
    background: '#FAFBFA',
    onBackground: '#111827',
    surface: '#FFFFFF',
    onSurface: '#1F2937',
    outline: '#CFE3DA',
  },
  green: {
    primary: '#0A7C59',
    onPrimary: '#FFFFFF',
    secondary: '#2E7D6E',
    onSecondary: '#FFFFFF',
    tertiary: '#8FBF9B',
    background: '#FAFBFA',
    onBackground: '#111827',
    surface: '#FFFFFF',
    onSurface: '#1F2937',
    outline: '#CFE3DA',
  },
  sakura: {
    primary: '#FFB7C5',
    onPrimary: '#3A2A31',
    secondary: '#F8BBD0',
    onSecondary: '#3A2A31',
    tertiary: '#FFE4EC',
    background: '#FFF9FB',
    onBackground: '#3A2A31',
    surface: '#FFFFFF',
    onSurface: '#3A2A31',
    outline: '#F4D8E3',
  },
};

// 根据明/暗与品牌色构建 Paper 主题
function buildPaperTheme(isDark: boolean, brand: BrandName): MD3Theme {
  const base = isDark ? PaperDarkTheme : PaperLightTheme;
  const palette = BRAND_PALETTES[brand] ?? BRAND_PALETTES['green'];
  const lightExtras = !isDark
    ? {
        primary: palette.primary,
        secondary: palette.secondary,
        tertiary: palette.tertiary,
        background: palette.background,
        surface: palette.surface,
        onBackground: palette.onBackground,
        onSurface: palette.onSurface,
        outline: palette.outline,
      }
    : {};
  // 深色模式：保留MD3暗色对比，同时同步品牌主色与部分强调色
  const darkExtras = isDark
    ? {
        primary: palette.primary,
        secondary: palette.secondary,
        outline: '#3F3F46',
        background: '#121212',
        surface: '#1C1C1F',
      }
    : {};
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.primary,
      secondary: palette.secondary,
      tertiary: palette.tertiary,
      ...(isDark ? darkExtras : lightExtras),
    },
  };
}

// 根据明/暗构建 Navigation 主题（基础跟随明/暗），并尽量与 Paper 保持主要色一致
function buildNavigationTheme(isDark: boolean, paperTheme: MD3Theme): NavigationTheme {
  const base = isDark ? NavigationDarkTheme : NavigationDefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      // 与 Paper 主题主色保持一致，便于导航条/高亮效果与品牌色统一
      primary: paperTheme.colors.primary,
    },
  };
}

// ThemeStore：统一管理主题状态与持久化
export class ThemeStore {
  isDark = false;
  brand: BrandName = 'default';
  ready = false;
  mode: 'light' | 'dark' | 'system' = 'light';
  systemScheme: ColorSchemeName = Appearance.getColorScheme();
  _appearanceSub: { remove: () => void } | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // 读取本地存储的主题偏好
  load = async () => {
    try {
      const mode = await AsyncStorage.getItem('theme_mode');
      const brand = (await AsyncStorage.getItem('theme_brand')) as BrandName | null;
      if (mode === 'dark' || mode === 'light' || mode === 'system') {
        this.mode = mode;
      }
      this.syncEffectiveDark();
      if (brand && BRAND_PALETTES[brand]) {
        this.brand = brand;
      }
      this._appearanceSub?.remove?.();
      this._appearanceSub = Appearance.addChangeListener(({ colorScheme }) => {
        this.systemScheme = colorScheme;
        this.syncEffectiveDark();
      });
    } catch {
      // 忽略读取错误，保持默认配置
    } finally {
      this.ready = true;
    }
  };

  setMode = async (mode: 'light' | 'dark' | 'system') => {
    this.mode = mode;
    await AsyncStorage.setItem('theme_mode', mode);
    this.syncEffectiveDark();
  };

  setDark = async (val: boolean) => {
    await this.setMode(val ? 'dark' : 'light');
  };

  toggle = async () => {
    await this.setMode(this.isDark ? 'light' : 'dark');
  };

  setBrand = async (brand: BrandName) => {
    this.brand = brand;
    await AsyncStorage.setItem('theme_brand', brand);
  };

  // 计算属性：根据当前状态生成主题对象，供 Provider 使用
  get paperTheme(): MD3Theme {
    return buildPaperTheme(this.isDark, this.brand);
  }

  get navTheme(): NavigationTheme {
    return buildNavigationTheme(this.isDark, this.paperTheme);
  }

  syncEffectiveDark() {
    this.isDark = this.mode === 'dark' || (this.mode === 'system' && this.systemScheme === 'dark');
  }
}

// 导出单例，便于全局复用
export const themeStore = new ThemeStore();

// 如需新增主题色：
// 1) 在 BRAND_PALETTES 中添加新条目（如 'purple'）
// 2) 在其它位置调用 themeStore.setBrand('purple') 即可实时切换
