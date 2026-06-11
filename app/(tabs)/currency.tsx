import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CurrencyScreen } from '../../src/screens/CurrencyScreen';

export default function Currency() {
  return (
    <View style={styles.container}>
      <CurrencyScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
});