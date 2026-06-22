import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTransactionStore } from '../../stores/transactionStore';
import { useCategoryStore } from '../../stores/categoryStore';
import { useTheme, ThemeColors } from '../../theme';
import { format } from 'date-fns';

type PeriodType = 'week' | 'month' | 'year';

export const StatisticsScreen: React.FC = () => {
  const { transactions, getStatistics } = useTransactionStore();
  const { categories } = useCategoryStore();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [period, setPeriod] = useState<PeriodType>('month');

  const stats = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    return getStatistics(startDate.getTime(), now.getTime());
  }, [transactions, period, getStatistics]);

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || categoryId;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || '#007AFF';
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'week':
        return '最近7天';
      case 'month':
        return '本月';
      case 'year':
        return '今年';
    }
  };

  const maxValue = Math.max(
    ...Object.values(stats.incomeByCategory),
    ...Object.values(stats.expenseByCategory),
    1
  );

  return (
    <ScrollView style={styles.container}>
      {/* 周期切换 */}
      <View style={styles.periodToggle}>
        {(['week', 'month', 'year'] as PeriodType[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.periodButton,
              period === p && styles.periodButtonActive,
            ]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.periodButtonText,
                period === p && styles.periodButtonTextActive,
              ]}
            >
              {p === 'week' ? '周' : p === 'month' ? '月' : '年'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 概览 */}
      <View style={styles.overviewCard}>
        <Text style={styles.overviewLabel}>{getPeriodLabel()}收支</Text>
        <Text style={styles.balanceAmount}>¥{stats.balance.toFixed(2)}</Text>
        <View style={styles.overviewRow}>
          <View style={styles.overviewItem}>
            <Text style={styles.incomeLabel}>收入</Text>
            <Text style={styles.incomeAmount}>+¥{stats.totalIncome.toFixed(2)}</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.expenseLabel}>支出</Text>
            <Text style={styles.expenseAmount}>-¥{stats.totalExpense.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* 收入分类统计 */}
      {Object.keys(stats.incomeByCategory).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>收入分类</Text>
          <View style={styles.categoryList}>
            {Object.entries(stats.incomeByCategory).map(([categoryId, amount]) => (
              <View key={categoryId} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: getCategoryColor(categoryId) },
                    ]}
                  />
                  <Text style={styles.categoryName}>
                    {getCategoryName(categoryId)}
                  </Text>
                </View>
                <Text style={styles.incomeAmount}>{amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 支出分类统计 */}
      {Object.keys(stats.expenseByCategory).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>支出分类</Text>
          <View style={styles.categoryList}>
            {Object.entries(stats.expenseByCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([categoryId, amount]) => {
                const percentage = (amount / stats.totalExpense) * 100;
                return (
                  <View key={categoryId} style={styles.categoryItem}>
                    <View style={styles.categoryItemTop}>
                      <View style={styles.categoryInfo}>
                        <View
                          style={[
                            styles.categoryDot,
                            { backgroundColor: getCategoryColor(categoryId) },
                          ]}
                        />
                        <Text style={styles.categoryName}>
                          {getCategoryName(categoryId)}
                        </Text>
                      </View>
                      <View style={styles.categoryAmounts}>
                        <Text style={styles.expenseAmount}>{amount.toFixed(2)}</Text>
                        <Text style={styles.categoryPercentage}>{percentage.toFixed(1)}%</Text>
                      </View>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: getCategoryColor(categoryId),
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
          </View>
        </View>
      )}

      {/* 每日数据 */}
      {stats.dailyData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>每日收支</Text>
          <View style={styles.dailyChart}>
            {stats.dailyData.slice(0, 7).reverse().map((day) => (
              <View key={day.date} style={styles.dayItem}>
                <View style={styles.dayBars}>
                  {day.income > 0 && (
                    <View style={styles.barContainer}>
                      <Text style={styles.barValue}>{day.income.toFixed(0)}</Text>
                      <View
                        style={[
                          styles.bar,
                          styles.incomeBar,
                          {
                            height: Math.min((day.income / maxValue) * 80, 80),
                          },
                        ]}
                      />
                    </View>
                  )}
                  {day.expense > 0 && (
                    <View style={styles.barContainer}>
                      <Text style={styles.barValue}>{day.expense.toFixed(0)}</Text>
                      <View
                        style={[
                          styles.bar,
                          styles.expenseBar,
                          {
                            height: Math.min((day.expense / maxValue) * 80, 80),
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
                <Text style={styles.dayLabel}>
                  {format(new Date(day.date), 'M/d')}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    periodToggle: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      margin: 16,
      borderRadius: 12,
      padding: 4,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
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
    overviewCard: {
      backgroundColor: c.surface,
      margin: 16,
      marginTop: 0,
      padding: 20,
      borderRadius: 16,
    },
    overviewLabel: {
      fontSize: 14,
      color: c.textSecondary,
      marginBottom: 8,
    },
    balanceAmount: {
      fontSize: 32,
      fontWeight: '700',
      color: c.text,
      marginBottom: 20,
    },
    overviewRow: {
      flexDirection: 'row',
      gap: 24,
    },
    overviewItem: {
      flex: 1,
    },
    incomeLabel: {
      fontSize: 12,
      color: c.textSecondary,
      marginBottom: 4,
    },
    incomeAmount: {
      fontSize: 18,
      fontWeight: '600',
      color: c.income,
    },
    expenseLabel: {
      fontSize: 12,
      color: c.textSecondary,
      marginBottom: 4,
    },
    expenseAmount: {
      fontSize: 18,
      fontWeight: '600',
      color: c.expense,
    },
    section: {
      margin: 16,
      marginTop: 0,
      backgroundColor: c.surface,
      padding: 16,
      borderRadius: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.text,
      marginBottom: 16,
    },
    categoryList: {
      gap: 16,
    },
    categoryItem: {
      gap: 8,
    },
    categoryItemTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    categoryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    categoryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    categoryName: {
      fontSize: 14,
      color: c.text,
    },
    categoryAmounts: {
      alignItems: 'flex-end',
      gap: 2,
    },
    categoryPercentage: {
      fontSize: 12,
      color: c.textTertiary,
    },
    progressBar: {
      height: 4,
      backgroundColor: c.surfaceSecondary,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
    },
    dailyChart: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingTop: 16,
    },
    dayItem: {
      alignItems: 'center',
      gap: 8,
    },
    dayBars: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
      height: 80,
    },
    barContainer: {
      alignItems: 'center',
      gap: 2,
    },
    bar: {
      width: 12,
      borderRadius: 6,
    },
    barValue: {
      fontSize: 10,
      color: c.textTertiary,
    },
    incomeBar: {
      backgroundColor: c.income,
    },
    expenseBar: {
      backgroundColor: c.expense,
    },
    dayLabel: {
      fontSize: 12,
      color: c.textTertiary,
    },
  });