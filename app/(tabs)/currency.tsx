import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CurrencyScreen } from '../../src/screens/CurrencyScreen';
import { useTheme } from '../../src/theme';

export default function Currency() {
  const colors = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CurrencyScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
