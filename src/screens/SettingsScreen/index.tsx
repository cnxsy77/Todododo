import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Linking } from 'react-native';
import { exportData } from '../../utils/export';
import { useThemeStore } from '../../stores/themeStore';

export const SettingsScreen: React.FC = () => {
  const { theme, isDarkMode, setTheme, toggleTheme } = useThemeStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleThemeChange = async (value: boolean) => {
    if (value) {
      await setTheme('dark');
    } else {
      await setTheme('light');
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportData();
    } catch (error) {
      Alert.alert('错误', '导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    Alert.alert('提示', '导入功能开发中...');
  };

  const settingsSections = [
    {
      title: '外观',
      items: [
        {
          label: '深色模式',
          type: 'switch',
          value: isDarkMode,
          onValueChange: handleThemeChange,
        },
        {
          label: '跟随系统',
          type: 'switch',
          value: theme === 'auto',
          onValueChange: async (value: boolean) => {
            await setTheme(value ? 'auto' : isDarkMode ? 'dark' : 'light');
          },
        },
      ],
    },
    {
      title: '数据',
      items: [
        {
          label: '导出数据',
          type: 'button',
          onPress: handleExport,
          disabled: isExporting,
        },
        {
          label: '导入数据',
          type: 'button',
          onPress: handleImport,
        },
      ],
    },
    {
      title: '关于',
      items: [
        {
          label: 'GitHub',
          type: 'button',
          onPress: () => Linking.openURL('https://github.com/cnxsy77/Todododo'),
        },
        {
          label: '版本',
          type: 'text',
          value: '1.0.0',
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {settingsSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map((item, index) => (
              <View
                key={item.label}
                style={[
                  styles.settingItem,
                  index < section.items.length - 1 && styles.settingItemBorder,
                ]}
              >
                <Text style={styles.settingLabel}>{item.label}</Text>

                {item.type === 'switch' && (
                  <Switch
                    value={item.value}
                    onValueChange={item.onValueChange}
                    trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                    thumbColor="#FFFFFF"
                  />
                )}

                {item.type === 'button' && (
                  <TouchableOpacity
                    onPress={item.onPress}
                    disabled={item.disabled}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.settingValue,
                        item.disabled && styles.settingValueDisabled,
                      ]}
                    >
                      {item.label === '导出数据' && isExporting ? '导出中...' : '›'}
                    </Text>
                  </TouchableOpacity>
                )}

                {item.type === 'text' && (
                  <Text style={styles.settingValue}>{item.value}</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Todododo</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  settingLabel: {
    fontSize: 16,
    color: '#000000',
  },
  settingValue: {
    fontSize: 20,
    color: '#C7C7CC',
  },
  settingValueDisabled: {
    color: '#CCCCCC',
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999999',
  },
});