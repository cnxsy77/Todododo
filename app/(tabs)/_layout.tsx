import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../src/theme';

export default function TabLayout() {
  const colors = useTheme();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 4,
        },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
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
