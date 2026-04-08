import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DraggableFlatList, ScaleDecorator, RenderItemParams } from '../common/DraggableListWrapperFixed';
import type { DragEndParams } from 'react-native-draggable-flatlist';
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
  // 用于多日期场景的本地数据状态（用于拖拽时立即更新 UI）
  const [localRenderData, setLocalRenderData] = useState<(DraggableTask | { id: string; isHeader: true; rangeStart: number; rangeEnd: number })[]>([]);
  // 标记是否正在使用本地数据（拖拽后等待同步）
  const [isUsingLocalData, setIsUsingLocalData] = useState(false);
  // 使用 ref 跟踪拖拽后待同步的状态（避免闭包问题）
  const pendingSyncRef = React.useRef(false);
  // 为 DraggableFlatList 添加 ref
  const flatListRef = useRef<any>(null);

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

  // 构建带有日期头的渲染数据（从 props 计算）
  const renderDataFromProps = useMemo(() => {
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

  // 当 props 数据变化时，重置本地数据标记并更新
  // 但只在没有待同步的拖拽操作时才执行
  React.useEffect(() => {
    // 如果有待同步的拖拽操作，不要覆盖本地数据
    if (pendingSyncRef.current) {
      return;
    }

    setData(tasks);
    setLocalRenderData(renderDataFromProps);
    setIsUsingLocalData(false);
  }, [tasks, renderDataFromProps]);

  // 使用本地数据或 props 数据
  const renderDataWithHeaders = isUsingLocalData ? localRenderData : renderDataFromProps;

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

  // 渲染任务项
  const renderTaskItem = ({ item, drag, isActive, getIndex: _getIndex }: {
    item: DraggableTask;
    drag: () => void;
    isActive: boolean;
    getIndex?: () => number | undefined;
  }) => {
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

    // 重要：newData 是拖拽后的数组，任务已经在 to 位置
    // 所以被拖拽的任务在 newData[to]
    const draggedItem = newData[to];

    // 如果拖拽的是头部，不允许
    if ('isHeader' in draggedItem && draggedItem.isHeader) {
      return;
    }

    // 此时 draggedItem 一定是 DraggableTask
    const draggableDraggedItem = draggedItem as DraggableTask;
    const fromRangeStart = draggableDraggedItem.rangeStart;

    // 关键修复：只查找最近的头部来确定 toRangeStart，忽略中间的任务
    // 这是因为任务可能属于不同的日期范围，只有头部能准确标识范围边界
    let toRangeStart: number = fromRangeStart; // 默认使用源范围

    // 向前查找最近的头部
    for (let i = to - 1; i >= 0; i--) {
      const item = newData[i] as RenderItem;
      if ('isHeader' in item && item.isHeader) {
        // 找到头部，使用该头部的范围
        toRangeStart = (item as { id: string; isHeader: true; rangeStart: number; rangeEnd: number }).rangeStart;
        break;
      }
    }

    if (fromRangeStart !== toRangeStart) {
      // 跨日期拖拽
      const targetRange = sortedRanges.find((r) => r.start === toRangeStart);
      if (targetRange) {
        // 立即更新本地数据，防止列表回弹
        // 从 newData 中移除被拖拽的任务（在 to 位置）
        const newLocalData = newData.filter((_, idx) => idx !== to);

        const updatedTask: DraggableTask = {
          ...draggableDraggedItem,
          rangeStart: targetRange.start,
          rangeEnd: targetRange.end,
          task: {
            ...draggableDraggedItem.task,
            startDate: targetRange.start,
            endDate: targetRange.end,
          },
        };

        // 找到目标头部的位置
        const targetHeaderIndex = newLocalData.findIndex(
          item => 'isHeader' in item && item.rangeStart === targetRange.start
        );

        if (targetHeaderIndex >= 0) {
          // 在 newLocalData 中，从目标头部后面开始，找到最后一个属于目标范围的任务
          let lastTargetTaskLocalIndex = -1;
          for (let i = newLocalData.length - 1; i > targetHeaderIndex; i--) {
            const item = newLocalData[i];
            if (!('isHeader' in item) &&
                (item as DraggableTask).rangeStart === targetRange.start) {
              lastTargetTaskLocalIndex = i;
              break;
            }
          }

          // 在 newData 中找到最后一个目标范围任务的索引
          let lastTargetTaskNewDataIndex = -1;
          for (let i = newData.length - 1; i >= 0; i--) {
            const item = newData[i];
            if (!('isHeader' in item) &&
                (item as DraggableTask).rangeStart === targetRange.start &&
                i !== to) {
              lastTargetTaskNewDataIndex = i;
              break;
            }
          }

          let insertIndex: number;

          if (lastTargetTaskLocalIndex === -1) {
            insertIndex = targetHeaderIndex + 1;
          } else {
            if (to > lastTargetTaskNewDataIndex) {
              insertIndex = lastTargetTaskLocalIndex + 1;
            } else {
              let firstTargetTaskLocalIndex = -1;
              for (let i = targetHeaderIndex + 1; i < newLocalData.length; i++) {
                const item = newLocalData[i];
                if (!('isHeader' in item) &&
                    (item as DraggableTask).rangeStart === targetRange.start) {
                  firstTargetTaskLocalIndex = i;
                  break;
                }
              }
              insertIndex = firstTargetTaskLocalIndex !== -1 ? firstTargetTaskLocalIndex : targetHeaderIndex + 1;
            }
          }

          insertIndex = Math.min(insertIndex, newLocalData.length);
          newLocalData.splice(insertIndex, 0, updatedTask);
        } else {
          newLocalData.push(updatedTask);
        }

        setLocalRenderData(newLocalData);
        setIsUsingLocalData(true);
        pendingSyncRef.current = true;

        onMoveTaskToDate?.(draggableDraggedItem.taskId, targetRange.start, targetRange.end);

        setTimeout(() => {
          pendingSyncRef.current = false;
        }, 100);
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
  const renderHeaderItem = ({ item, drag: _drag, isActive: _isActive, getIndex: _getIndex }: {
    item: { id: string; isHeader: true; rangeStart: number; rangeEnd: number };
    drag: () => void;
    isActive: boolean;
    getIndex?: () => number | undefined;
  }) => {
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
          ref={flatListRef}
          data={data}
          keyExtractor={(item) => (item as Task).id}
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
            const taskIds = newData.map((t) => (t as Task).id);
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
        ref={flatListRef}
        data={renderDataWithHeaders}
        keyExtractor={(item) => (item as RenderItem).id}
        renderItem={({ item, drag, isActive, getIndex }) => {
          // 如果是头部，渲染头部
          const renderItem = item as RenderItem;
          if ('isHeader' in renderItem && renderItem.isHeader && 'rangeStart' in renderItem && 'rangeEnd' in renderItem) {
            const headerItem = renderItem as { id: string; isHeader: true; rangeStart: number; rangeEnd: number };
            return renderHeaderItem({ item: headerItem, drag, isActive, getIndex });
          }
          // 否则渲染任务
          const taskItem = renderItem as DraggableTask;
          return renderTaskItem({ item: taskItem, drag, isActive, getIndex });
        }}
        onDragEnd={handleDragEndWithHeaders as (params: DragEndParams<unknown>) => void}
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
