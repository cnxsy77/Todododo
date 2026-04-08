// 简单的方法：完全禁用所有警告（仅开发环境）
if (__DEV__ && typeof window !== 'undefined') {
  // 保存原始方法
  const originalWarn = console.warn;
  const originalError = console.error;

  // 要忽略的警告模式
  const ignoredPatterns = [
    /props\.pointerEvents is deprecated/,
    /"shadow\*" style props are deprecated/,
    /style\.(resizeMode|tintColor) is deprecated/,
    /`ref` is not a prop/,
    /findDOMNode is deprecated/,
    /Warning: \[object Object\]: `ref` is not a prop/,
    /Image: style\.(resizeMode|tintColor) is deprecated/,
  ];

  console.warn = function(...args) {
    const message = args[0]?.toString?.() || '';
    const shouldIgnore = ignoredPatterns.some(pattern => pattern.test(message));

    if (!shouldIgnore) {
      originalWarn.apply(console, args);
    }
  };

  console.error = function(...args) {
    const message = args[0]?.toString?.() || '';
    const shouldIgnore = ignoredPatterns.some(pattern => pattern.test(message));

    if (!shouldIgnore) {
      originalError.apply(console, args);
    }
  };
}

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { runMigrations } from '../src/database/migrations';
import { StyleSheet, Platform } from 'react-native';

export default function RootLayout() {
  useEffect(() => {
    const init = async () => {
      // Web 端不支持 expo-sqlite
      if (Platform.OS === 'web') {
        console.log('Web platform: skipping database initialization');
        return;
      }

      try {
        await runMigrations();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    init();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#000000',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerShadowVisible: false,
          headerBackTitle: '返回',
          contentStyle: {
            backgroundColor: '#F2F2F7',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Todododo',
            headerLargeTitle: true,
          }}
        />
        <Stack.Screen
          name="task-detail"
          options={{
            title: '任务详情',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: '设置',
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
