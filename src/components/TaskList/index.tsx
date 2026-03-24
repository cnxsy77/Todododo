import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import type { Task, ViewType } from '../../types';
import { TaskItem } from '../TaskItem';

interface TaskListProps {
  tasks: Task[];
  groupedTasks?: Map<number, Task[]>;
  ranges?: { start: number; end: number }[];
  currentView?: ViewType;
  onToggleTask?: (id: string) => void;
  onTaskPress?: (task: Task) => void;
  onTaskLongPress?: (task: Task) => void;
  onReorder?: (taskIds: string[]) => void;
  emptyMessage?: string;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  groupedTasks,
  ranges = [],
  currentView = 'day',
  onToggleTask,
  onTaskPress,
  onTaskLongPress,
  onReorder,
  emptyMessage = '暂无任务',
}) => {
  const [data, setData] = useState(tasks);
  const [activePageIndex, setActivePageIndex] = useState(0);

  // 当数据变化时更新本地状态
  React.useEffect(() => {
    setData(tasks);
  }, [tasks]);

  // 当多选范围变化时，重置到第一页
  React.useEffect(() => {
    setActivePageIndex(0);
  }, [ranges.length, groupedTasks.size]);

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
          drag={drag}
        />
      </ScaleDecorator>
    );
  };

  // 如果只有一个范围或没有分组，直接显示所有任务
  if (ranges.length <= 1 || !groupedTasks || groupedTasks.size === 0) {
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
  }

  // 多选模式：显示分页（显示所有选中的日期）
  const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
  const currentRange = sortedRanges[activePageIndex];
  const currentRangeTasks = groupedTasks.get(currentRange?.start) || [];

  const getPageLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    switch (currentView) {
      case 'day':
        return `${date.getMonth() + 1}月${date.getDate()}日`;
      case 'week':
        return `${date.getMonth() + 1}月第${Math.ceil(date.getDate() / 7)}周`;
      case 'month':
        return `${date.getFullYear()}年${date.getMonth() + 1}月`;
      case 'year':
        return `${date.getFullYear()}年`;
    }
  };

  return (
    <View style={styles.container}>
      {/* 分页标签 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.paginationContainer}
      >
        {sortedRanges.map((range, index) => {
          const isActive = index === activePageIndex;
          const taskCount = groupedTasks.get(range.start)?.length || 0;
          return (
            <TouchableOpacity
              key={range.start}
              style={[styles.pageTab, isActive && styles.pageTabActive]}
              onPress={() => setActivePageIndex(index)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pageTabText, isActive && styles.pageTabTextActive]}>
                {getPageLabel(range.start)} · {taskCount}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 当前页的任务列表 */}
      {currentRangeTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <DraggableFlatList
          data={currentRangeTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  paginationContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  pageTabActive: {
    backgroundColor: '#007AFF',
  },
  pageTabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  pageTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
