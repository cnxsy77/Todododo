import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DraggableFlatList, { ScaleDecorator, DragEndParams, RenderItemParams } from 'react-native-draggable-flatlist';
import type { Task, ViewType } from '../../types';
import { TaskItem } from '../TaskItem';

interface TaskListProps {
  tasks: Task[];
  groupedTasks?: Map<number, Task[]>;
  ranges?: { start: number; end: number }[];
  currentView?: ViewType;
  onToggleTask?: (id: string) => void;
  onTaskPress?: (task: Task) => void;
  onReorder?: (taskIds: string[]) => void;
  onMoveTaskToDate?: (taskId: string, newStart: number, newEnd?: number) => void;
  emptyMessage?: string;
}

// 用于拖拽的数据项
interface DraggableTask {
  id: string;
  taskId: string;
  rangeStart: number;
  rangeEnd: number;
  task: Task;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  groupedTasks,
  ranges = [],
  currentView = 'day',
  onToggleTask,
  onTaskPress,
  onReorder,
  onMoveTaskToDate,
  emptyMessage = '暂无任务',
}) => {
  const [data, setData] = useState(tasks);

  // 当数据变化时更新本地状态
  React.useEffect(() => {
    setData(tasks);
  }, [tasks]);

  // 排序后的范围
  const sortedRanges = useMemo(() => {
    return [...ranges].sort((a, b) => a.start - b.start);
  }, [ranges]);

  const getPageLabel = useCallback((timestamp: number) => {
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
  }, [currentView]);

  // 构建带有日期头的渲染数据
  const renderDataWithHeaders = useMemo(() => {
    const result: (DraggableTask | { id: string; isHeader: true; rangeStart: number; rangeEnd: number })[] = [];
    sortedRanges.forEach((range) => {
      const rangeTasks = groupedTasks?.get(range.start) || [];
      // 总是添加日期头，即使没有任务
      result.push({
        id: `header-${range.start}`,
        isHeader: true,
        rangeStart: range.start,
        rangeEnd: range.end,
      });
      // 只在有任务时添加任务
      rangeTasks.forEach((task) => {
        result.push({
          id: `task-${task.id}`,
          taskId: task.id,
          rangeStart: range.start,
          rangeEnd: range.end,
          task,
        });
      });
    });
    return result;
  }, [groupedTasks, sortedRanges]);

  type RenderItem = DraggableTask | { id: string; isHeader: true; rangeStart: number; rangeEnd: number };

  // 计算 sticky header 的索引
  const stickyHeaderIndices = useMemo(() => {
    const indices: number[] = [];
    renderDataWithHeaders.forEach((item, index) => {
      if ('isHeader' in item && item.isHeader) {
        indices.push(index);
      }
    });
    return indices;
  }, [renderDataWithHeaders]);

  // 计算每个范围的任务数量（提前计算，避免重复计算）
  const rangeTaskCounts = useMemo(() => {
    const counts = new Map<number, number>();
    sortedRanges.forEach((range) => {
      const rangeTasks = groupedTasks?.get(range.start) || [];
      counts.set(range.start, rangeTasks.length);
    });
    return counts;
  }, [groupedTasks, sortedRanges]);

  const renderTaskItem = ({ item, drag, isActive }: RenderItemParams<RenderItem>) => {
    if ('isHeader' in item && item.isHeader) {
      return null;
    }
    return (
      <ScaleDecorator activeScale={1.05}>
        <TaskItem
          task={(item as DraggableTask).task}
          onToggle={onToggleTask}
          onPress={onTaskPress}
          isDragging={isActive}
          drag={drag}
        />
      </ScaleDecorator>
    );
  };

  const handleDragEndWithHeaders = useCallback(({ data: newData, from, to }: DragEndParams<RenderItem>) => {
    // 如果 from 或 to 是 -1 或者无效，直接返回（拖拽被取消或无效）
    if (from < 0 || to < 0 || from >= newData.length || to >= newData.length) {
      return;
    }

    const fromItem = newData[from];
    const toItem = newData[to];

    // 如果拖拽的是头部，不允许
    if ('isHeader' in fromItem && fromItem.isHeader) {
      return;
    }

    // 此时 fromItem 一定是 DraggableTask（因为上面已经检查了 isHeader）
    const draggableFromItem = fromItem as DraggableTask;

    // 如果目标是头部，找到头部后面的第一个任务作为目标
    let toRangeStart: number;
    if ('isHeader' in toItem && toItem.isHeader) {
      // 找到目标头部后面的第一个任务
      const nextIndex = to + 1;
      if (nextIndex < newData.length && !('isHeader' in newData[nextIndex])) {
        toRangeStart = (newData[nextIndex] as DraggableTask).rangeStart;
      } else {
        // 如果头部后面没有任务，使用头部的范围
        toRangeStart = toItem.rangeStart;
      }
    } else {
      toRangeStart = toItem.rangeStart;
    }

    const fromRangeStart = draggableFromItem.rangeStart;

    if (fromRangeStart !== toRangeStart) {
      // 跨日期拖拽
      const targetRange = sortedRanges.find((r) => r.start === toRangeStart);
      if (targetRange) {
        onMoveTaskToDate?.(draggableFromItem.taskId, targetRange.start, targetRange.end);
      }
    } else {
      // 同日期内排序 - 保持头部位置不变，只排序任务
      const taskIds = newData
        .filter((item): item is DraggableTask => !('isHeader' in item))
        .map((item) => item.taskId);
      onReorder?.(taskIds);
    }
  }, [sortedRanges, onMoveTaskToDate, onReorder]);

  // 渲染日期头（作为普通列表项）
  const renderHeaderItem = ({ item }: RenderItemParams<RenderItem>) => {
    if ('isHeader' in item && item.isHeader) {
      const count = rangeTaskCounts.get(item.rangeStart) || 0;
      return (
        <View style={styles.dateHeader} pointerEvents="none">
          <Text style={styles.dateHeaderText}>{getPageLabel(item.rangeStart)}</Text>
          <View style={styles.taskCountBadge}>
            <Text style={styles.taskCountText}>{count}</Text>
          </View>
        </View>
      );
    }
    return null;
  };

  // 如果没有分组或只有一个范围，显示单列
  if (ranges.length <= 1 || !groupedTasks || groupedTasks.size === 0) {
    if (tasks.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      );
    }

    return (
      <View style={styles.singleColumnContainer}>
        <DraggableFlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item, drag, isActive }) => (
            <ScaleDecorator activeScale={1.05}>
              <TaskItem
                task={item as Task}
                onToggle={onToggleTask}
                onPress={onTaskPress}
                isDragging={isActive}
                drag={drag}
              />
            </ScaleDecorator>
          )}
          onDragEnd={({ data: newData }) => {
            const taskIds = newData.map((t) => t.id);
            onReorder?.(taskIds);
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }

  // 检查是否所有列都为空
  const allColumnsEmpty = sortedRanges.every(
    (range) => (groupedTasks?.get(range.start) || []).length === 0
  );

  if (allColumnsEmpty) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={renderDataWithHeaders}
        keyExtractor={(item) => item.id}
        renderItem={({ item, drag, isActive, getIndex }) => {
          // 如果是头部，渲染头部
          if ('isHeader' in item && item.isHeader) {
            return renderHeaderItem({ item, drag, isActive, getIndex: getIndex! });
          }
          // 否则渲染任务
          return renderTaskItem({ item, drag, isActive, getIndex });
        }}
        onDragEnd={handleDragEndWithHeaders}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={stickyHeaderIndices}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  singleColumnContainer: {
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
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F0F0F0',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dateHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
  },
  taskCountBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  taskCountText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
