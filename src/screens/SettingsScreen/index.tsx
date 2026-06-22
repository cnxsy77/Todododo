import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Linking, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { exportData } from '../../utils/export';
import { importData } from '../../utils/import';
import { useThemeStore } from '../../stores/themeStore';
import { useTheme, ThemeColors } from '../../theme';
import { useTaskStore } from '../../stores/taskStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useCategoryStore } from '../../stores/categoryStore';
import { useBudgetStore } from '../../stores/budgetStore';

export const SettingsScreen: React.FC = () => {
  const { theme, isDarkMode, setTheme } = useThemeStore();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const loadTasks = useTaskStore((s) => s.loadTasks);
  const loadTransactions = useTransactionStore((s) => s.loadTransactions);
  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const loadBudgets = useBudgetStore((s) => s.loadBudgets);

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

  const refreshAllStores = async () => {
    await Promise.all([
      loadTasks(),
      loadTransactions(),
      loadCategories(),
      loadBudgets(),
    ]);
  };

  const handleImport = async () => {
    Alert.alert(
      '导入数据',
      '导入将清空当前的 任务 / 交易 / 分类 / 预算 数据并替换为文件内容。是否继续？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '选择文件并导入',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
              });
              if (result.canceled || !result.assets?.length) {
                return;
              }
              const file = result.assets[0];
              setIsImporting(true);
              const summary = await importData(file.uri);
              await refreshAllStores();
              Alert.alert(
                '导入成功',
                `任务 ${summary.tasks} 条\n交易 ${summary.transactions} 条\n分类 ${summary.categories} 个\n预算 ${summary.budgets} 个`
              );
            } catch (error) {
              console.error('Import failed:', error);
              Alert.alert('错误', '导入失败，请检查文件格式是否正确');
            } finally {
              setIsImporting(false);
            }
          },
        },
      ]
    );
  };

  const settingsSections: {
    title: string;
    items: Array<
      | { label: string; type: 'switch'; value: boolean; onValueChange: (v: boolean) => void }
      | { label: string; type: 'button'; onPress: () => void; disabled?: boolean; hint?: string }
      | { label: string; type: 'text'; value: string }
    >;
  }[] = [
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
          hint: isExporting ? '导出中...' : undefined,
        },
        {
          label: '导入数据',
          type: 'button',
          onPress: handleImport,
          disabled: isImporting,
          hint: isImporting ? '导入中...' : undefined,
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
                <View style={styles.settingLabelRow}>
                  {item.type === 'button' && item.label === '导入数据' && isImporting && (
                    <ActivityIndicator size="small" color={colors.primary} style={styles.indicator} />
                  )}
                  {item.type === 'button' && item.label === '导出数据' && isExporting && (
                    <ActivityIndicator size="small" color={colors.primary} style={styles.indicator} />
                  )}
                  <Text style={styles.settingLabel}>{item.label}</Text>
                </View>

                {item.type === 'switch' && (
                  <Switch
                    value={item.value}
                    onValueChange={item.onValueChange}
                    trackColor={{ false: colors.switchOff, true: colors.primary }}
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
                      {item.hint || '›'}
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

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    section: {
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      textTransform: 'uppercase',
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    sectionContent: {
      backgroundColor: c.surface,
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
      borderBottomColor: c.hairline,
    },
    settingLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    indicator: {
      marginRight: 8,
    },
    settingLabel: {
      fontSize: 16,
      color: c.text,
    },
    settingValue: {
      fontSize: 20,
      color: c.textTertiary,
    },
    settingValueDisabled: {
      color: c.textTertiary,
      opacity: 0.6,
    },
    footer: {
      paddingVertical: 32,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 14,
      color: c.textTertiary,
    },
  });
