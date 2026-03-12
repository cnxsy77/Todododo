// 存储相关工具函数

const STORAGE_KEYS = {
  SETTINGS: 'todododo_settings',
  THEME: 'todododo_theme',
};

export interface Settings {
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  theme: 'light' | 'dark' | 'auto';
  notificationsEnabled: boolean;
}

const defaultSettings: Settings = {
  weekStartsOn: 1,
  theme: 'auto',
  notificationsEnabled: true,
};

// 由于 React Native 没有 localStorage，我们使用异步存储
// 在实际使用中，可以使用 AsyncStorage 或 expo-secure-store
let storage: Record<string, string> = {};

export const saveSettings = async (settings: Settings): Promise<void> => {
  try {
    storage[STORAGE_KEYS.SETTINGS] = JSON.stringify(settings);
    console.log('Settings saved:', settings);
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

export const loadSettings = async (): Promise<Settings> => {
  try {
    const saved = storage[STORAGE_KEYS.SETTINGS];
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return defaultSettings;
};

export const saveTheme = async (theme: 'light' | 'dark' | 'auto'): Promise<void> => {
  try {
    storage[STORAGE_KEYS.THEME] = theme;
  } catch (error) {
    console.error('Failed to save theme:', error);
  }
};

export const loadTheme = async (): Promise<'light' | 'dark' | 'auto'> => {
  try {
    const theme = storage[STORAGE_KEYS.THEME];
    if (theme) {
      return theme as 'light' | 'dark' | 'auto';
    }
  } catch (error) {
    console.error('Failed to load theme:', error);
  }
  return 'auto';
};
