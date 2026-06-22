import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SettingsScreen } from '../../src/screens/SettingsScreen';
import { useTheme } from '../../src/theme';

export default function Settings() {
  const colors = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
