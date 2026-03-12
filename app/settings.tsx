import React from 'react';
import { SettingsScreen } from '../src/screens/SettingsScreen';
import { Stack } from 'expo-router';

export default function Settings() {
  return (
    <>
      <Stack.Screen options={{ title: '设置' }} />
      <SettingsScreen navigation={undefined as any} />
    </>
  );
}
