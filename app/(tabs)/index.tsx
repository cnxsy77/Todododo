import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HomeScreen } from '../../src/screens/HomeScreen';

export default function Index() {
  return (
    <View style={styles.container}>
      <HomeScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
});