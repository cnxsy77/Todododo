import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../../src/stores/themeStore';

const THEME_KEY = '@todododo_theme';

// Appearance 在 jsdom 下默认可能为 null/抛错，统一 spy 成可控值
const colorSchemeSpy = jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
const addChangeListenerSpy = jest
  .spyOn(Appearance, 'addChangeListener')
  .mockReturnValue({ remove: jest.fn() });

const reset = () => useThemeStore.setState({ theme: 'light', isDarkMode: false, isLoading: false });

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  colorSchemeSpy.mockReturnValue('light');
  reset();
});

describe('setTheme', () => {
  it('dark -> isDarkMode true 并持久化', async () => {
    await useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(useThemeStore.getState().isDarkMode).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(THEME_KEY, 'dark');
  });

  it('light -> isDarkMode false', async () => {
    await useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().isDarkMode).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(THEME_KEY, 'light');
  });

  it('auto 跟随系统深色', async () => {
    colorSchemeSpy.mockReturnValue('dark');
    await useThemeStore.getState().setTheme('auto');
    expect(useThemeStore.getState().isDarkMode).toBe(true);
  });

  it('auto 跟随系统浅色', async () => {
    colorSchemeSpy.mockReturnValue('light');
    await useThemeStore.getState().setTheme('auto');
    expect(useThemeStore.getState().isDarkMode).toBe(false);
  });
});

describe('toggleTheme', () => {
  it('浅色 -> 深色', async () => {
    useThemeStore.setState({ theme: 'light', isDarkMode: false });
    await useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(useThemeStore.getState().isDarkMode).toBe(true);
  });

  it('深色 -> 浅色', async () => {
    useThemeStore.setState({ theme: 'dark', isDarkMode: true });
    await useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('light');
    expect(useThemeStore.getState().isDarkMode).toBe(false);
  });
});

describe('loadTheme', () => {
  it('首次加载注册系统外观监听', async () => {
    await useThemeStore.getState().loadTheme();
    expect(addChangeListenerSpy).toHaveBeenCalled();
    expect(useThemeStore.getState().isLoading).toBe(false);
  });

  it('无保存主题默认 light', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await useThemeStore.getState().loadTheme();
    expect(useThemeStore.getState().theme).toBe('light');
    expect(useThemeStore.getState().isDarkMode).toBe(false);
  });

  it('读取已保存的 dark 主题', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');
    await useThemeStore.getState().loadTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(useThemeStore.getState().isDarkMode).toBe(true);
  });
});
