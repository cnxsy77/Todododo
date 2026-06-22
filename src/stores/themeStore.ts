import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

type ThemeType = 'light' | 'dark' | 'auto';

interface ThemeState {
  theme: ThemeType;
  isDarkMode: boolean;
  isLoading: boolean;

  // Actions
  setTheme: (theme: ThemeType) => Promise<void>;
  toggleTheme: () => Promise<void>;
  loadTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = '@todododo_theme';

// 根据主题类型计算是否深色
const computeIsDark = (theme: ThemeType): boolean => {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  // auto：跟随系统
  try {
    return Appearance.getColorScheme() === 'dark';
  } catch {
    return false;
  }
};

// 系统外观变化监听（仅注册一次）
let appearanceSubscription: { remove: () => void } | null = null;
const ensureSystemListener = (get: () => ThemeState) => {
  if (appearanceSubscription) return;
  try {
    const listener = () => {
      const { theme } = get();
      // 仅在 auto 模式下响应系统变化
      if (theme === 'auto') {
        const isDarkMode = computeIsDark(theme);
        useThemeStore.setState({ isDarkMode });
      }
    };
    appearanceSubscription = Appearance.addChangeListener(listener);
  } catch {
    // 某些环境（如 Web）不支持 Appearance，忽略
  }
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  isDarkMode: false,
  isLoading: false,

  setTheme: async (theme: ThemeType) => {
    const isDarkMode = computeIsDark(theme);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    set({ theme, isDarkMode });
  },

  toggleTheme: async () => {
    const { isDarkMode } = get();
    const newTheme: ThemeType = isDarkMode ? 'light' : 'dark';
    await get().setTheme(newTheme);
  },

  loadTheme: async () => {
    set({ isLoading: true });
    try {
      const savedTheme = (await AsyncStorage.getItem(THEME_STORAGE_KEY)) as ThemeType | null;
      const theme: ThemeType = savedTheme || 'light';
      // 注册系统外观监听，使 auto 模式跟随系统深浅色变化
      ensureSystemListener(get);
      await get().setTheme(theme);
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
