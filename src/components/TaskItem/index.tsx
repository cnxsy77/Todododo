import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import type { Task } from '../../types';

interface TaskItemProps {
  task: Task;
  onToggle?: (id: string) => void;
  onPress?: (task: Task) => void;
  onLongPress?: (task: Task) => void;
  isDragging?: boolean;
  drag?: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggle,
  onPress,
  onLongPress,
  isDragging = false,
  drag,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleComplete = () => {
    if (onToggle) {
      onToggle(task.id);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    // 保存逻辑可以在父组件处理
  };

  const getPlanTypeLabel = () => {
    const labels = {
      daily: '日',
      weekly: '周',
      monthly: '月',
      yearly: '年',
    };
    return labels[task.planType];
  };

  return (
    <View
      style={[
        styles.container,
        task.isCompleted && styles.completed,
        isDragging && styles.dragging,
      ]}
    >
      {/* 完成状态复选框 */}
      <TouchableOpacity
        style={[
          styles.checkbox,
          task.isCompleted && styles.checkboxChecked,
        ]}
        onPress={handleComplete}
        activeOpacity={0.7}
      >
        {task.isCompleted && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      {/* 任务内容 */}
      <View style={styles.content}>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={editTitle}
            onChangeText={setEditTitle}
            onBlur={handleSave}
            onSubmitEditing={handleSave}
            autoFocus
          />
        ) : (
          <>
            <Text
              style={[styles.title, task.isCompleted && styles.titleCompleted]}
              numberOfLines={2}
              onPress={() => onPress?.(task)}
              onLongPress={() => onLongPress?.(task)}
            >
              {task.title}
            </Text>

            {task.description && (
              <Text style={styles.description} numberOfLines={1}>
                {task.description}
              </Text>
            )}
          </>
        )}

        <View style={styles.footer}>
          <View style={styles.planTypeBadge}>
            <Text style={styles.planTypeText}>{getPlanTypeLabel()}</Text>
          </View>
          <Text style={styles.date}>
            {new Date(task.startDate).toLocaleDateString('zh-CN', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>

      {/* 拖拽手柄 - 长按触发拖拽 */}
      <TouchableOpacity
        style={styles.dragHandle}
        onPress={drag}
        onLongPress={drag}
        delayLongPress={250}
        activeOpacity={0.7}
        disabled={!drag}
      >
        <Text style={styles.dragHandleText}>⋮⋮</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  completed: {
    opacity: 0.6,
  },
  dragging: {
    opacity: 0.5,
    backgroundColor: '#F2F2F7',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999999',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planTypeBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  planTypeText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    color: '#999999',
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
    paddingBottom: 4,
  },
  dragHandle: {
    marginLeft: 8,
    padding: 4,
  },
  dragHandleText: {
    fontSize: 16,
    color: '#999999',
  },
});
