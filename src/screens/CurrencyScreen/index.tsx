import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTransactionStore } from '../../stores/transactionStore';
import { useCategoryStore } from '../../stores/categoryStore';
import { useRouter } from 'expo-router';
import { useTheme, ThemeColors } from '../../theme';
import type { Transaction } from '../../types';

export const CurrencyScreen: React.FC = () => {
  const router = useRouter();
  const { transactions, loadTransactions, getStatistics } = useTransactionStore();
  const { categories, loadCategories } = useCategoryStore();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const stats = getStatistics();

  useEffect(() => {
    loadTransactions();
    loadCategories();
  }, []);

  const getCategory = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId);
  };

  // —— 筛选状态 ——
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  // null = 全部月份；{ year, month } 月份为 0-based
  const [filterMonth, setFilterMonth] = useState<{ year: number; month: number } | null>(null);

  // 类型筛选下可选分类：选了收入/支出时只列对应类型，避免选到无关分类
  const availableCategories = useMemo(() => {
    if (filterType === 'all') return categories;
    return categories.filter((c) => c.type === filterType);
  }, [categories, filterType]);

  // 切换类型时，若当前选中的分类不属于新类型则清空，防止列表被筛空
  const handleFilterTypeChange = (type: 'all' | 'income' | 'expense') => {
    setFilterType(type);
    if (filterCategoryId) {
      const cat = categories.find((c) => c.id === filterCategoryId);
      if (cat && type !== 'all' && cat.type !== type) {
        setFilterCategoryId(null);
      }
    }
  };

  // 月份前后翻页；null 时从当前月起算
  const shiftMonth = (delta: number) => {
    setFilterMonth((prev) => {
      const base = prev ?? { year: new Date().getFullYear(), month: new Date().getMonth() };
      const d = new Date(base.year, base.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const clearAllFilters = () => {
    setFilterType('all');
    setFilterCategoryId(null);
    setFilterMonth(null);
  };

  // 前端过滤：收支类型 / 分类 / 月份
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterCategoryId && t.category !== filterCategoryId) return false;
      if (filterMonth) {
        const d = new Date(t.date);
        if (d.getFullYear() !== filterMonth.year || d.getMonth() !== filterMonth.month) return false;
      }
      return true;
    });
  }, [transactions, filterType, filterCategoryId, filterMonth]);

  const formatAmount = (amount: number, type: 'income' | 'expense') => {
    return `${type === 'income' ? '+' : '-'}¥${amount.toFixed(2)}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  };

  // 按日期分组（基于筛选后的交易）
  const groupedTransactions = filteredTransactions.reduce((acc, t) => {
    const dateKey = new Date(t.date).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  return (
    <ScrollView style={styles.container}>
      {/* 余额卡片 */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>余额</Text>
        <Text style={styles.balanceAmount}>¥{stats.balance.toFixed(2)}</Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceSubLabel}>收入</Text>
            <Text style={styles.balanceSubAmount}>+¥{stats.totalIncome.toFixed(2)}</Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceSubLabel}>支出</Text>
            <Text style={styles.balanceSubAmount}>-¥{stats.totalExpense.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* 快捷入口 */}
      <View style={styles.entryRow}>
        <TouchableOpacity
          style={styles.entryButton}
          onPress={() => router.push('/statistics')}
          activeOpacity={0.7}
        >
          <Text style={styles.entryIcon}>📊</Text>
          <Text style={styles.entryText}>统计</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.entryButton}
          onPress={() => router.push('/budget')}
          activeOpacity={0.7}
        >
          <Text style={styles.entryIcon}>🎯</Text>
          <Text style={styles.entryText}>预算</Text>
        </TouchableOpacity>
      </View>

      {/* 筛选条 */}
      <View style={styles.filterBar}>
        {/* 月份 */}
        <View style={styles.filterRow}>
          <View style={styles.monthPicker}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.monthArrow} activeOpacity={0.6}>
              <Text style={styles.monthArrowText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {filterMonth ? `${filterMonth.year}年${filterMonth.month + 1}月` : '全部交易'}
            </Text>
            <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.monthArrow} activeOpacity={0.6}>
              <Text style={styles.monthArrowText}>›</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.chip, filterMonth === null && styles.chipActive]}
            onPress={() => setFilterMonth(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, filterMonth === null && styles.chipTextActive]}>全部月份</Text>
          </TouchableOpacity>
        </View>

        {/* 收支类型 */}
        <View style={styles.filterRow}>
          {([
            { key: 'all', label: '全部' },
            { key: 'income', label: '收入' },
            { key: 'expense', label: '支出' },
          ] as const).map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.chip, filterType === t.key && styles.chipActive]}
              onPress={() => handleFilterTypeChange(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, filterType === t.key && styles.chipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 分类（横向滚动） */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled style={styles.categoryScroll}>
          <TouchableOpacity
            style={[styles.chip, filterCategoryId === null && styles.chipActive]}
            onPress={() => setFilterCategoryId(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, filterCategoryId === null && styles.chipTextActive]}>
              全部分类
            </Text>
          </TouchableOpacity>
          {availableCategories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, filterCategoryId === c.id && styles.chipActive]}
              onPress={() => setFilterCategoryId(c.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, filterCategoryId === c.id && styles.chipTextActive]}>
                {c.icon} {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 交易列表 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>交易记录</Text>

        {Object.keys(groupedTransactions).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {transactions.length === 0 ? '暂无交易记录' : '没有符合条件的交易'}
            </Text>
            {transactions.length > 0 && (
              <TouchableOpacity onPress={clearAllFilters} style={styles.clearFilterButton} activeOpacity={0.7}>
                <Text style={styles.clearFilterText}>清除筛选</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          Object.entries(groupedTransactions).map(([dateKey, items]) => (
            <View key={dateKey} style={styles.daySection}>
              <Text style={styles.dayLabel}>{formatDate(new Date(dateKey).getTime())}</Text>
              <View style={styles.transactionsList}>
                {items.map((transaction) => {
                  const category = getCategory(transaction.category);
                  return (
                    <TouchableOpacity
                      key={transaction.id}
                      style={styles.transactionItem}
                      onPress={() =>
                        router.push({
                          pathname: '/transaction-detail',
                          params: { transactionId: transaction.id },
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <View style={styles.transactionLeft}>
                        <Text style={styles.categoryIcon}>
                          {category?.icon || '💰'}
                        </Text>
                        <View style={styles.transactionInfo}>
                          <Text style={styles.categoryName}>
                            {category?.name || transaction.category}
                          </Text>
                          {transaction.note && (
                            <Text style={styles.transactionNote} numberOfLines={1}>
                              {transaction.note}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.transactionAmount,
                          transaction.type === 'income' ? styles.income : styles.expense,
                        ]}
                      >
                        {formatAmount(transaction.amount, transaction.type)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>

      {/* 添加交易按钮 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/transaction-detail')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    balanceCard: {
      backgroundColor: c.primary,
      margin: 16,
      padding: 24,
      borderRadius: 16,
    },
    balanceLabel: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: 8,
    },
    balanceAmount: {
      fontSize: 36,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 24,
    },
    balanceRow: {
      flexDirection: 'row',
      gap: 32,
    },
    balanceItem: {
      flex: 1,
    },
    balanceSubLabel: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: 4,
    },
    balanceSubAmount: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    entryRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 8,
    },
    entryButton: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    entryIcon: {
      fontSize: 24,
      marginBottom: 4,
    },
    entryText: {
      fontSize: 14,
      color: c.text,
      fontWeight: '500',
    },
    filterBar: {
      paddingHorizontal: 16,
      marginBottom: 8,
      gap: 8,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    monthPicker: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 8,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    monthArrow: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthArrowText: {
      fontSize: 22,
      color: c.textSecondary,
      lineHeight: 26,
    },
    monthLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: c.text,
      minWidth: 96,
      textAlign: 'center',
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    chipText: {
      fontSize: 13,
      color: c.textSecondary,
    },
    chipTextActive: {
      color: '#FFFFFF',
      fontWeight: '500',
    },
    categoryScroll: {
      marginHorizontal: -16,
      paddingHorizontal: 16,
    },
    clearFilterButton: {
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.primary,
    },
    clearFilterText: {
      fontSize: 14,
      color: c.primary,
      fontWeight: '500',
    },
    section: {
      paddingHorizontal: 16,
      paddingBottom: 80,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: c.text,
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    emptyContainer: {
      paddingVertical: 60,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: c.textTertiary,
    },
    daySection: {
      marginBottom: 24,
    },
    dayLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: c.textSecondary,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    transactionsList: {
      gap: 8,
    },
    transactionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.surface,
      padding: 16,
      borderRadius: 12,
    },
    transactionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    categoryIcon: {
      fontSize: 24,
    },
    transactionInfo: {
      flex: 1,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: '500',
      color: c.text,
      marginBottom: 2,
    },
    transactionNote: {
      fontSize: 14,
      color: c.textTertiary,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: '600',
    },
    income: {
      color: c.income,
    },
    expense: {
      color: c.expense,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    },
    fabText: {
      fontSize: 32,
      color: '#FFFFFF',
      fontWeight: '300',
    },
  });
