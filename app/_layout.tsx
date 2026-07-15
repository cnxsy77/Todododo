import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { runMigrations } from '../src/database/migrations';
import { initNotifications } from '../src/services/notificationService';
import { StyleSheet, Platform } from 'react-native';
import { useThemeStore } from '../src/stores/themeStore';
import { useTheme } from '../src/theme';

export default function RootLayout() {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const loadTheme = useThemeStore((s) => s.loadTheme);
  const colors = useTheme();

  useEffect(() => {
    // 启动时加载已保存的主题
    loadTheme();

    const init = async () => {
      // Web 端不支持 expo-sqlite
      if (Platform.OS === 'web') {
        console.log('Web platform: skipping database initialization');
        return;
      }

      try {
        await runMigrations();
        await initNotifications();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    init();
  }, []);

  const headerStyle = { backgroundColor: colors.surface };
  const headerTintColor = colors.text;
  const headerTitleStyle = { fontWeight: '600' as const, color: colors.text };

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="task-detail"
          options={{
            title: '任务详情',
            headerShown: true,
            headerStyle,
            headerTintColor,
            headerTitleStyle,
            headerShadowVisible: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="transaction-detail"
          options={{
            title: '添加记录',
            headerShown: true,
            headerStyle,
            headerTintColor,
            headerTitleStyle,
            headerShadowVisible: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="statistics"
          options={{
            title: '统计',
            headerShown: true,
            headerStyle,
            headerTintColor,
            headerTitleStyle,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="budget"
          options={{
            title: '预算管理',
            headerShown: true,
            headerStyle,
            headerTintColor,
            headerTitleStyle,
            headerShadowVisible: false,
          }}
        />
      </Stack>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
