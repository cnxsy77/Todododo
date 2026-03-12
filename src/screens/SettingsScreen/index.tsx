import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const settingsItems = [
    { label: '通知设置', value: 'notifications' },
    { label: '主题设置', value: 'theme' },
    { label: '周开始日期', value: 'weekStart' },
    { label: '数据备份', value: 'backup' },
    { label: '关于我们', value: 'about' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>设置</Text>

        {settingsItems.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={styles.settingItem}
            onPress={() => {
              // 导航到对应设置页面
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.settingLabel}>{item.label}</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.footer}>
          <Text style={styles.version}>版本 1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  settingLabel: {
    fontSize: 16,
    color: '#000000',
  },
  settingArrow: {
    fontSize: 20,
    color: '#C7C7CC',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  version: {
    fontSize: 14,
    color: '#999999',
  },
});
