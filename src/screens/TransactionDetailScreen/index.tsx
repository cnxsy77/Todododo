import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Modal, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useTransactionStore } from '../../stores/transactionStore';
import { useCategoryStore } from '../../stores/categoryStore';
import { Input, Button } from '../../components/common';
import { useTheme, ThemeColors } from '../../theme';
import type { TransactionType } from '../../types';

const PRESET_ICONS = ['💰', '📈', '💼', '🎁', '💵', '🍜', '🚗', '🛒', '🎮', '💊', '📚', '🏠', '📱', '📦', '✈️', '👕', '⚽', '🎵', '☕', '🐾', '💡', '🔧'];
const PRESET_COLORS = ['#4CAF50', '#8BC34A', '#FFC107', '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#FF9800', '#795548'];

export const TransactionDetailScreen: React.FC = () => {
  const { transactionId } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactionStore();
  const { categories, loadCategoriesByType, addCategory } = useCategoryStore();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isEditing = Boolean(transactionId);
  const existingTransaction = isEditing
    ? transactions.find((t) => t.id === transactionId)
    : undefined;

  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(Date.now());

  // 新建分类 modal
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState(PRESET_ICONS[0]);
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);

  // 动态标题
  useEffect(() => {
    navigation.setOptions({ title: isEditing ? '编辑记录' : '添加记录' });
  }, [isEditing]);

  // 加载已有交易数据
  useEffect(() => {
    if (existingTransaction) {
      setTransactionType(existingTransaction.type);
      setAmount(String(existingTransaction.amount));
      setSelectedCategoryId(existingTransaction.category);
      setNote(existingTransaction.note || '');
      setDate(existingTransaction.date);
    }
  }, [existingTransaction]);

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
      if (isEditing && existingTransaction) {
        await updateTransaction(existingTransaction.id, {
          type: transactionType,
          amount: numAmount,
          category: selectedCategoryId,
          note: note || undefined,
          date,
        });
      } else {
        await addTransaction({
          type: transactionType,
          amount: numAmount,
          category: selectedCategoryId,
          note: note || undefined,
          date,
        });
      }
      router.back();
    } catch (error) {
      Alert.alert('错误', '保存失败');
    }
  };

  const handleDelete = () => {
    if (!existingTransaction) return;
    Alert.alert('确认删除', '确定要删除这条交易记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTransaction(existingTransaction.id);
            router.back();
          } catch (error) {
            Alert.alert('错误', '删除失败');
          }
        },
      },
    ]);
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      Alert.alert('提示', '请输入分类名称');
      return;
    }
    try {
      const created = await addCategory({
        name,
        type: transactionType,
        icon: newCategoryIcon,
        color: newCategoryColor,
      });
      setSelectedCategoryId(created.id);
      setCategoryModalVisible(false);
      setNewCategoryName('');
      setNewCategoryIcon(PRESET_ICONS[0]);
      setNewCategoryColor(PRESET_COLORS[0]);
    } catch (error) {
      Alert.alert('错误', '创建分类失败');
    }
  };

  const openCategoryModal = () => {
    setNewCategoryIcon(PRESET_ICONS[0]);
    setNewCategoryColor(PRESET_COLORS[0]);
    setNewCategoryName('');
    setCategoryModalVisible(true);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {/* 类型切换 */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'expense' && { backgroundColor: colors.expense },
            ]}
            onPress={() => setTransactionType('expense')}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeButtonText, transactionType === 'expense' && styles.typeButtonTextActive]}>
              支出
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              transactionType === 'income' && { backgroundColor: colors.income },
            ]}
            onPress={() => setTransactionType('income')}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeButtonText, transactionType === 'income' && styles.typeButtonTextActive]}>
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
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            autoFocus={!isEditing}
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

            {/* 新建分类入口 */}
            <TouchableOpacity
              style={styles.categoryItem}
              onPress={openCategoryModal}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryIcon}>＋</Text>
              <Text style={styles.categoryName}>新建</Text>
            </TouchableOpacity>
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
          {isEditing && (
            <Button title="删除" onPress={handleDelete} variant="secondary" />
          )}
        </View>
      </View>

      {/* 新建分类 Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>新建{transactionType === 'income' ? '收入' : '支出'}分类</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.fieldLabel}>名称</Text>
              <Input
                placeholder="请输入分类名称"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                maxLength={10}
              />

              <Text style={styles.fieldLabel}>图标</Text>
              <FlatList
                data={PRESET_ICONS}
                keyExtractor={(item) => item}
                numColumns={6}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.presetItem,
                      newCategoryIcon === item && styles.presetItemSelected,
                    ]}
                    onPress={() => setNewCategoryIcon(item)}
                  >
                    <Text style={styles.presetIcon}>{item}</Text>
                  </TouchableOpacity>
                )}
              />

              <Text style={styles.fieldLabel}>颜色</Text>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorItem,
                      { backgroundColor: color },
                      newCategoryColor === color && styles.colorItemSelected,
                    ]}
                    onPress={() => setNewCategoryColor(color)}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button title="取消" onPress={() => setCategoryModalVisible(false)} variant="secondary" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Button title="创建" onPress={handleCreateCategory} variant="primary" />
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
    content: {
      padding: 16,
    },
    typeToggle: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 4,
      marginBottom: 24,
    },
    typeButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: c.surface,
    },
    typeButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textSecondary,
    },
    typeButtonTextActive: {
      color: '#FFFFFF',
    },
    amountSection: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 24,
      marginBottom: 24,
    },
    amountLabel: {
      fontSize: 14,
      color: c.textSecondary,
      marginBottom: 16,
    },
    amountInput: {
      fontSize: 48,
      fontWeight: '700',
      color: c.text,
      padding: 0,
    },
    currencySymbol: {
      position: 'absolute',
      right: 24,
      bottom: 32,
      fontSize: 24,
      color: c.textTertiary,
    },
    section: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: c.text,
      marginBottom: 12,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    categoryItem: {
      backgroundColor: c.surface,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      width: '30%',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    categoryItemSelected: {
      borderColor: c.primary,
      backgroundColor: c.primaryLight,
    },
    categoryIcon: {
      fontSize: 28,
      marginBottom: 8,
    },
    categoryName: {
      fontSize: 14,
      color: c.textSecondary,
    },
    categoryNameSelected: {
      color: c.primary,
      fontWeight: '500',
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    actions: {
      gap: 12,
      marginTop: 24,
      marginBottom: 40,
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
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
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
    modalBody: {
      maxHeight: 400,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: c.text,
      marginBottom: 8,
      marginTop: 8,
    },
    presetItem: {
      width: 44,
      height: 44,
      borderRadius: 8,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      margin: 4,
    },
    presetItemSelected: {
      backgroundColor: c.primaryLight,
      borderWidth: 2,
      borderColor: c.primary,
    },
    presetIcon: {
      fontSize: 22,
    },
    colorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    colorItem: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    colorItemSelected: {
      borderWidth: 3,
      borderColor: c.text,
    },
    modalActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
    },
  });
