import { useMemo } from 'react';
import { useThemeStore } from '../stores/themeStore';

// 主题色板定义
export interface ThemeColors {
  // 背景
  background: string; // 页面底色
  surface: string; // 卡片/列表项底色
  surfaceSecondary: string; // 次级底色（按钮 inactive、徽章等）
  // 文本
  text: string; // 主文本
  textSecondary: string; // 次级文本
  textTertiary: string; // 三级文本/占位
  // 边框与分隔
  border: string;
  hairline: string;
  // 品牌色
  primary: string;
  primaryDark: string;
  primaryLight: string; // 选中态浅色背景
  // 语义色
  income: string;
  expense: string;
  warning: string;
  success: string;
  // 其他
  shadow: string;
  overlay: string; // modal 遮罩
  switchOff: string; // Switch 关闭态轨道色
}

// 亮色色板
export const lightColors: ThemeColors = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F2F7',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E5E5EA',
  hairline: '#E5E5EA',
  primary: '#007AFF',
  primaryDark: '#0056CC',
  primaryLight: '#E5F1FF',
  income: '#4CAF50',
  expense: '#F44336',
  warning: '#FF9500',
  success: '#34C759',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
  switchOff: '#E5E5EA',
};

// 暗色色板
export const darkColors: ThemeColors = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textTertiary: '#636366',
  border: '#38383A',
  hairline: '#38383A',
  primary: '#0A84FF',
  primaryDark: '#0A84FF',
  primaryLight: '#1C2A3A',
  income: '#30D158',
  expense: '#FF453A',
  warning: '#FF9F0A',
  success: '#30D158',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',
  switchOff: '#39393D',
};

// 根据当前主题返回色板
export const useTheme = (): ThemeColors => {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  return useMemo(() => (isDarkMode ? darkColors : lightColors), [isDarkMode]);
};
