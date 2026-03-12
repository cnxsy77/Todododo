import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import type { Task } from '../../types';
import { TaskItem } from '../TaskItem';

interface TaskListProps {
  tasks: Task[];
  onToggleTask?: (id: string) => void;
  onTaskPress?: (task: Task) => void;
  onTaskLongPress?: (task: Task) => void;
  onReorder?: (taskIds: string[]) => void;
  emptyMessage?: string;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleTask,
  onTaskPress,
  onTaskLongPress,
  onReorder,
  emptyMessage = '暂无任务',
}) => {
  const [data, setData] = useState(tasks);

  // 当数据变化时更新本地状态
  React.useEffect(() => {
    setData(tasks);
  }, [tasks]);

  const handleDragEnd = ({ data: newData }: { data: Task[] }) => {
    setData(newData);
    const taskIds = newData.map((t) => t.id);
    onReorder?.(taskIds);
  };

  const renderItem = ({ item, drag, isActive }: { item: Task; drag: () => void; isActive: boolean }) => {
    return (
      <ScaleDecorator activeScale={1.05}>
        <TaskItem
          task={item}
          onToggle={onToggleTask}
          onPress={onTaskPress}
          onLongPress={onTaskLongPress}
          isDragging={isActive}
        />
      </ScaleDecorator>
    );
  };

  if (tasks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
  },
});
