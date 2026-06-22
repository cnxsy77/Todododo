import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useBudgetStore } from '../../stores/budgetStore';
import { useCategoryStore } from '../../stores/categoryStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { Button } from '../../components/common';
import { useTheme, ThemeColors } from '../../theme';
import type { BudgetPeriod, Category } from '../../types';

export const BudgetScreen: React.FC = () => {
  const { budgets, loadBudgets, addBudget, updateBudget, deleteBudget } = useBudgetStore();
  const { categories, loadCategories } = useCategoryStore();
  const { transactions, loadTransactions } = useTransactionStore();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');

  useEffect(() => {
    loadBudgets();
    loadCategories();
    loadTransactions();
  }, []);

  // 只对支出分类设置预算
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  // 当前月支出按分类统计
  const monthExpenseByCategory = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const result: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense' && t.date >= monthStart)
      .forEach((t) => {
        result[t.category] = (result[t.category] || 0) + t.amount;
      });
    return result;
  }, [transactions]);

  const getCategoryById = (id: string) => categories.find((c) => c.id === id);

  const openEditor = (category: Category) => {
    const existing = budgets.find((b) => b.categoryId === category.id);
    setEditingCategory(category);
    setAmountInput(existing ? String(existing.amount) : '');
    setPeriod(existing?.period || 'monthly');
  };

  const closeEditor = () => {
    setEditingCategory(null);
    setAmountInput('');
  };

  const handleSave = async () => {
    if (!editingCategory) return;
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('提示', '请输入有效的预算金额');
      return;
    }

    try {
      const existing = budgets.find((b) => b.categoryId === editingCategory.id);
      if (existing) {
        await updateBudget(existing.id, { amount, period });
      } else {
        await addBudget({
          categoryId: editingCategory.id,
          amount,
          period,
        });
      }
      closeEditor();
    } catch (error) {
      Alert.alert('错误', '保存预算失败');
    }
  };

  const handleDelete = async () => {
    if (!editingCategory) return;
    const existing = budgets.find((b) => b.categoryId === editingCategory.id);
    if (!existing) {
      closeEditor();
      return;
    }
    Alert.alert('确认删除', '确定要删除该分类的预算吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBudget(existing.id);
            closeEditor();
          } catch (error) {
            Alert.alert('错误', '删除失败');
          }
        },
      },
    ]);
  };

  const periodLabel = (p: BudgetPeriod) => (p === 'monthly' ? '月预算' : '年预算');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>本月预算总览</Text>
        {(() => {
          const totalBudget = budgets
            .filter((b) => b.period === 'monthly')
            .reduce((sum, b) => sum + b.amount, 0);
          const totalSpent = Object.values(monthExpenseByCategory).reduce((s, n) => s + n, 0);
          const percent = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
          return (
            <>
              <Text style={styles.summaryAmount}>
                ¥{totalSpent.toFixed(2)} / ¥{totalBudget.toFixed(2)}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${percent}%`,
                      backgroundColor: percent >= 100 ? colors.expense : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.summaryHint}>
                {totalBudget > 0 ? `已使用 ${percent.toFixed(0)}%` : '点击下方分类设置预算'}
              </Text>
            </>
          );
        })()}
      </View>

      <View style={styles.listSection}>
        <Text style={styles.listTitle}>支出分类预算</Text>
        {expenseCategories.map((category) => {
          const budget = budgets.find((b) => b.categoryId === category.id);
          const spent = monthExpenseByCategory[category.id] || 0;
          const percent = budget && budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
          const overBudget = budget && spent > budget.amount;
          return (
            <TouchableOpacity
              key={category.id}
              style={styles.budgetItem}
              onPress={() => openEditor(category)}
              activeOpacity={0.7}
            >
              <View style={styles.budgetItemTop}>
                <View style={styles.budgetItemLeft}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <View>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryMeta}>
                      {budget ? periodLabel(budget.period) : '未设置预算'}
                    </Text>
                  </View>
                </View>
                <View style={styles.budgetItemRight}>
                  <Text
                    style={[
                      styles.spentAmount,
                      overBudget && styles.overBudgetText,
                    ]}
                  >
                    ¥{spent.toFixed(2)}
                  </Text>
                  <Text style={styles.budgetAmountText}>
                    / {budget ? `¥${budget.amount.toFixed(2)}` : '—'}
                  </Text>
                </View>
              </View>
              {budget && (
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${percent}%`,
                        backgroundColor: overBudget ? colors.expense : colors.primary,
                      },
                    ]}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 编辑/设置预算 Modal */}
      <Modal
        visible={editingCategory !== null}
        transparent
        animationType="slide"
        onRequestClose={closeEditor}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? `${editingCategory.name} 预算` : ''}
              </Text>
              <TouchableOpacity onPress={closeEditor}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>预算金额</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>¥</Text>
              <TextInput
                style={styles.amountInput}
                value={amountInput}
                onChangeText={setAmountInput}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            <Text style={styles.fieldLabel}>周期</Text>
            <View style={styles.periodToggle}>
              {(['monthly', 'yearly'] as BudgetPeriod[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodButton, period === p && styles.periodButtonActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      period === p && styles.periodButtonTextActive,
                    ]}
                  >
                    {p === 'monthly' ? '月' : '年'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              {budgets.find((b) => b.categoryId === editingCategory?.id) && (
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Button title="删除预算" onPress={handleDelete} variant="secondary" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Button title="保存" onPress={handleSave} variant="primary" />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    summaryCard: {
      backgroundColor: c.surface,
      margin: 16,
      padding: 20,
      borderRadius: 16,
    },
    summaryTitle: {
      fontSize: 14,
      color: c.textSecondary,
      marginBottom: 8,
    },
    summaryAmount: {
      fontSize: 24,
      fontWeight: '700',
      color: c.text,
      marginBottom: 12,
    },
    progressBar: {
      height: 6,
      backgroundColor: c.surfaceSecondary,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    summaryHint: {
      fontSize: 12,
      color: c.textTertiary,
      marginTop: 8,
    },
    listSection: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    listTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: c.text,
      marginBottom: 16,
    },
    budgetItem: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    budgetItemTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    budgetItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    categoryIcon: {
      fontSize: 24,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '500',
      color: c.text,
    },
    categoryMeta: {
      fontSize: 12,
      color: c.textTertiary,
      marginTop: 2,
    },
    budgetItemRight: {
      alignItems: 'flex-end',
    },
    spentAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: c.text,
    },
    overBudgetText: {
      color: c.expense,
    },
    budgetAmountText: {
      fontSize: 13,
      color: c.textTertiary,
      marginTop: 2,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.text,
    },
    closeButton: {
      fontSize: 22,
      color: c.textTertiary,
      width: 32,
      height: 32,
      textAlign: 'center',
      lineHeight: 32,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: c.text,
      marginBottom: 8,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      backgroundColor: c.surface,
      marginBottom: 16,
    },
    currencySymbol: {
      fontSize: 20,
      color: c.textTertiary,
      marginRight: 8,
    },
    amountInput: {
      flex: 1,
      fontSize: 24,
      fontWeight: '600',
      color: c.text,
      paddingVertical: 12,
    },
    periodToggle: {
      flexDirection: 'row',
      backgroundColor: c.surfaceSecondary,
      borderRadius: 8,
      padding: 4,
      marginBottom: 24,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: 'center',
    },
    periodButtonActive: {
      backgroundColor: c.primary,
    },
    periodButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: c.textSecondary,
    },
    periodButtonTextActive: {
      color: '#FFFFFF',
    },
    modalActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
