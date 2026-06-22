import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HomeScreen } from '../../src/screens/HomeScreen';
import { useTheme } from '../../src/theme';

export default function Index() {
  const colors = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HomeScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
