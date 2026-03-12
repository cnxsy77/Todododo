import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Input, Button } from '../../components/common';
import { useTaskStore } from '../../stores/taskStore';
import type { PlanType, CreateTaskInput } from '../../types';

interface TaskDetailScreenProps {
  route: {
    params?: {
      taskId?: string;
      createNew?: boolean;
    };
  };
  navigation: any;
}

export const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ route, navigation }) => {
  const { taskId, createNew } = route.params || {};
  const { addTask, updateTask, deleteTask, tasks } = useTaskStore();
  const existingTask = taskId ? tasks.find((t) => t.id === taskId) : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [planType, setPlanType] = useState<PlanType>('daily');
  const [startDate, setStartDate] = useState(Date.now());

  useEffect(() => {
    if (existingTask) {
      setTitle(existingTask.title);
      setDescription(existingTask.description || '');
      setPlanType(existingTask.planType);
      setStartDate(existingTask.startDate);
    }
  }, [existingTask]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入任务标题');
      return;
    }

    try {
      if (existingTask) {
        await updateTask(existingTask.id, {
          title,
          description: description || undefined,
          planType,
          startDate,
        });
      } else {
        await addTask({
          title,
          description: description || undefined,
          planType,
          startDate,
        });
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('错误', '保存失败');
    }
  };

  const handleDelete = async () => {
    if (!existingTask) return;

    Alert.alert('确认删除', '确定要删除这个任务吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(existingTask.id);
            navigation.goBack();
          } catch (error) {
            Alert.alert('错误', '删除失败');
          }
        },
      },
    ]);
  };

  const planTypes: { label: string; value: PlanType }[] = [
    { label: '日计划', value: 'daily' },
    { label: '周计划', value: 'weekly' },
    { label: '月计划', value: 'monthly' },
    { label: '年计划', value: 'yearly' },
  ];

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {/* 标题 */}
        <Input
          label="任务标题"
          placeholder="请输入任务标题"
          value={title}
          onChangeText={setTitle}
          autoFocus
        />

        {/* 描述 */}
        <Input
          label="描述（可选）"
          placeholder="请输入任务描述"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />

        {/* 计划类型 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>计划类型</Text>
          <View style={styles.planTypeContainer}>
            {planTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.planTypeButton,
                  planType === type.value && styles.planTypeButtonActive,
                ]}
                onPress={() => setPlanType(type.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.planTypeButtonText,
                    planType === type.value && styles.planTypeButtonTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 开始日期 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>开始日期</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              // 这里可以添加日期选择器
              Alert.alert('提示', '日期选择器功能待实现');
            }}
          >
            <Text style={styles.dateButtonText}>
              {new Date(startDate).toLocaleDateString('zh-CN')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 操作按钮 */}
        <View style={styles.actions}>
          <Button title="保存" onPress={handleSave} variant="primary" />
          {existingTask && (
            <Button title="删除" onPress={handleDelete} variant="secondary" />
          )}
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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
  planTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  planTypeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  planTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  planTypeButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  planTypeButtonTextActive: {
    color: '#FFFFFF',
  },
  dateButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333333',
  },
  actions: {
    gap: 12,
    marginTop: 24,
  },
});
