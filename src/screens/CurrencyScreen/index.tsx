import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTransactionStore } from '../../stores/transactionStore';
import { useCategoryStore } from '../../stores/categoryStore';
import { useRouter } from 'expo-router';
import type { Transaction } from '../../types';

export const CurrencyScreen: React.FC = () => {
  const router = useRouter();
  const { transactions, loadTransactions, getStatistics } = useTransactionStore();
  const { categories, loadCategories } = useCategoryStore();

  const stats = getStatistics();

  useEffect(() => {
    loadTransactions();
    loadCategories();
  }, []);

  const getCategory = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId);
  };

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

  // 按日期分组交易
  const groupedTransactions = transactions.reduce((acc, t) => {
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
            <Text style={styles.incomeLabel}>收入</Text>
            <Text style={styles.incomeAmount}>+¥{stats.totalIncome.toFixed(2)}</Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={styles.expenseLabel}>支出</Text>
            <Text style={styles.expenseAmount}>-¥{stats.totalExpense.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* 交易列表 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>交易记录</Text>

        {Object.keys(groupedTransactions).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无交易记录</Text>
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
                      onPress={() => {
                        // TODO: 跳转到交易详情
                      }}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  balanceCard: {
    backgroundColor: '#007AFF',
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
  incomeLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  incomeAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  expenseLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
  },
  daySection: {
    marginBottom: 24,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
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
    backgroundColor: '#FFFFFF',
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
    color: '#000000',
    marginBottom: 2,
  },
  transactionNote: {
    fontSize: 14,
    color: '#999999',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  income: {
    color: '#4CAF50',
  },
  expense: {
    color: '#F44336',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
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