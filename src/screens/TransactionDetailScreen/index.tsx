import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTransactionStore } from '../../stores/transactionStore';
import { useCategoryStore } from '../../stores/categoryStore';
import { Input, Button } from '../../components/common';
import type { TransactionType, CreateTransactionInput } from '../../types';

export const TransactionDetailScreen: React.FC = () => {
  const { transactionId } = useLocalSearchParams();
  const router = useRouter();
  const { addTransaction } = useTransactionStore();
  const { categories, loadCategoriesByType } = useCategoryStore();

  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadCategoriesByType(transactionType);
  }, [transactionType]);

  const filteredCategories = categories.filter((c) => c.type === transactionType);

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('提示', '请输入有效的金额');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('提示', '请选择分类');
      return;
    }

    try {
      await addTransaction({
        type: transactionType,
        amount: numAmount,
        category: selectedCategoryId,
        note: note || undefined,
        date: Date.now(),
      });
      router.back();
    } catch (error) {
      Alert.alert('错误', '保存失败');
    }
  };

  const getCategory = (id: string) => {
    return categories.find((c) => c.id === id);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {/* 类型切换 */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'expense' && styles.typeButtonActive,
              { backgroundColor: transactionType === 'expense' ? '#F44336' : '#FFFFFF' },
            ]}
            onPress={() => setTransactionType('expense')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.typeButtonText,
                transactionType === 'expense' && styles.typeButtonTextActive,
              ]}
            >
              支出
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'income' && styles.typeButtonActive,
              { backgroundColor: transactionType === 'income' ? '#4CAF50' : '#FFFFFF' },
            ]}
            onPress={() => setTransactionType('income')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.typeButtonText,
                transactionType === 'income' && styles.typeButtonTextActive,
              ]}
            >
              收入
            </Text>
          </TouchableOpacity>
        </View>

        {/* 金额输入 */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>金额</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            autoFocus
          />
          <Text style={styles.currencySymbol}>¥</Text>
        </View>

        {/* 分类选择 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>选择分类</Text>
          <View style={styles.categoryGrid}>
            {filteredCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  selectedCategoryId === category.id && styles.categoryItemSelected,
                ]}
                onPress={() => setSelectedCategoryId(category.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text
                  style={[
                    styles.categoryName,
                    selectedCategoryId === category.id && styles.categoryNameSelected,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 备注 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>备注（可选）</Text>
          <Input
            placeholder="请输入备注"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
        </View>

        {/* 操作按钮 */}
        <View style={styles.actions}>
          <Button title="保存" onPress={handleSave} variant="primary" />
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
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  typeButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  amountSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    color: '#000000',
    padding: 0,
  },
  currencySymbol: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    fontSize: 24,
    color: '#999999',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '30%',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    color: '#666666',
  },
  categoryNameSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: 24,
    marginBottom: 40,
  },
});