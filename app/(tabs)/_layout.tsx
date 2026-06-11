import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '任务',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconFocused]}>📋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="currency"
        options={{
          title: '货币',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconFocused]}>💰</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconFocused]}>⚙️</Text>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 24,
  },
  iconFocused: {
    opacity: 1,
  },
});