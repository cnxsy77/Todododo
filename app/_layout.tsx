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
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="task-detail"
          options={{
            title: '任务详情',
            headerShown: true,
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#000000',
            headerTitleStyle: { fontWeight: '600' },
            headerShadowVisible: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="transaction-detail"
          options={{
            title: '添加记录',
            headerShown: true,
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#000000',
            headerTitleStyle: { fontWeight: '600' },
            headerShadowVisible: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="statistics"
          options={{
            title: '统计',
            headerShown: true,
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#000000',
            headerTitleStyle: { fontWeight: '600' },
            headerShadowVisible: false,
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