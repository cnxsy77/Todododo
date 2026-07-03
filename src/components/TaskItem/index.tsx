import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Task } from '../../types';
import { useTheme, ThemeColors } from '../../theme';

interface TaskItemProps {
  task: Task;
  children?: Task[];
  onToggle?: (id: string) => void;
  onPress?: (task: Task) => void;
  onLongPress?: (task: Task) => void;
  onToggleChild?: (id: string) => void;
  onPressChild?: (task: Task) => void;
  isDragging?: boolean;
  drag?: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  children = [],
  onToggle,
  onPress,
  onLongPress,
  onToggleChild,
  onPressChild,
  isDragging = false,
  drag,
}) => {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // 折叠态默认展开；TaskItem 实例稳定（key=task-${id}），普通重渲染保留
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = children.length > 0;

  const handleComplete = () => {
    if (onToggle) {
      onToggle(task.id);
    }
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
      <View style={styles.row}>
        {/* 折叠/展开箭头（仅有子任务时显示） */}
        {hasChildren ? (
          <TouchableOpacity
            style={styles.caret}
            onPress={() => setCollapsed((c) => !c)}
            activeOpacity={0.7}
          >
            <Text style={styles.caretText}>{collapsed ? '▶' : '▼'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.caretPlaceholder} />
        )}

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

        {/* 任务内容 - 整个区域可点击进入详情 */}
        <TouchableOpacity
          style={styles.content}
          activeOpacity={0.7}
          onPress={() => onPress?.(task)}
          onLongPress={() => onLongPress?.(task)}
        >
          <Text
            style={[styles.title, task.isCompleted && styles.titleCompleted]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          {task.description && (
            <Text style={styles.description} numberOfLines={1}>
              {task.description}
            </Text>
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
            {hasChildren && (
              <Text style={styles.childrenCount}>
                {children.length} 个子任务
              </Text>
            )}
          </View>
        </TouchableOpacity>

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

      {/* 子任务块：缩进展示，随折叠态显隐 */}
      {hasChildren && !collapsed && (
        <View style={styles.childrenContainer}>
          {children.map((child) => (
            <View key={child.id} style={styles.subTaskRow}>
              <TouchableOpacity
                style={[
                  styles.subCheckbox,
                  child.isCompleted && styles.checkboxChecked,
                ]}
                onPress={() => onToggleChild?.(child.id)}
                activeOpacity={0.7}
              >
                {child.isCompleted && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.subContent}
                activeOpacity={0.7}
                onPress={() => onPressChild?.(child)}
              >
                <Text
                  style={[
                    styles.subTitle,
                    child.isCompleted && styles.titleCompleted,
                  ]}
                  numberOfLines={1}
                >
                  {child.title}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 6,
      shadowColor: c.shadow,
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
      backgroundColor: c.surfaceSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    caret: {
      width: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 4,
      paddingVertical: 4,
    },
    caretText: {
      fontSize: 10,
      color: c.textTertiary,
    },
    caretPlaceholder: {
      width: 20,
      marginRight: 4,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    checkboxChecked: {
      backgroundColor: c.primary,
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
      color: c.text,
      marginBottom: 4,
    },
    titleCompleted: {
      textDecorationLine: 'line-through',
      color: c.textTertiary,
    },
    description: {
      fontSize: 14,
      color: c.textSecondary,
      marginBottom: 8,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    planTypeBadge: {
      backgroundColor: c.surfaceSecondary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    planTypeText: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '500',
    },
    date: {
      fontSize: 12,
      color: c.textTertiary,
    },
    childrenCount: {
      fontSize: 12,
      color: c.primary,
    },
    dragHandle: {
      marginLeft: 8,
      padding: 4,
    },
    dragHandleText: {
      fontSize: 16,
      color: c.textTertiary,
    },
    // 子任务
    childrenContainer: {
      marginTop: 8,
      paddingLeft: 20 + 24 + 12, // 对齐父内容区（caret + checkbox + marginRight）
      gap: 4,
    },
    subTaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    subCheckbox: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    subContent: {
      flex: 1,
    },
    subTitle: {
      fontSize: 14,
      color: c.textSecondary,
    },
  });
