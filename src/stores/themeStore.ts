import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  isDarkMode: false,
  isLoading: false,

  setTheme: async (theme: ThemeType) => {
    let isDarkMode = false;

    if (theme === 'auto') {
      // 跟随系统
      try {
        const { Appearance } = require('react-native');
        isDarkMode = Appearance.getColorScheme() === 'dark';
      } catch {
        isDarkMode = false;
      }
    } else {
      isDarkMode = theme === 'dark';
    }

    await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    set({ theme, isDarkMode });
  },

  toggleTheme: async () => {
    const { isDarkMode } = get();
    const newTheme = isDarkMode ? 'light' : 'dark';
    await get().setTheme(newTheme);
  },

  loadTheme: async () => {
    set({ isLoading: true });
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const theme = (savedTheme as ThemeType) || 'light';
      await get().setTheme(theme);
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));