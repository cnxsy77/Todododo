import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DraggableFlatList, { ScaleDecorator, DragEndParams, RenderItemParams } from 'react-native-draggable-flatlist';
import type { Task, ViewType } from '../../types';
import { TaskItem } from '../TaskItem';
import { useTheme, ThemeColors } from '../../theme';

interface TaskListProps {
  tasks: Task[];
  groupedTasks?: Map<number, Task[]>;
  ranges?: { start: number; end: number }[];
  currentView?: ViewType;
  onToggleTask?: (id: string) => void;
  onTaskPress?: (task: Task) => void;
  onReorder?: (taskIds: string[]) => void;
  onMoveTaskToDate?: (taskId: string, newStart: number, newEnd?: number) => void;
  // 跨日拖拽：同时更新任务日期与全局顺序，使 props 回流后顺序与本地一致
  onMoveTaskToDateWithOrder?: (
    taskId: string,
    newStart: number,
    newEnd: number | undefined,
    taskIds: string[]
  ) => void;
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
  onMoveTaskToDateWithOrder,
  emptyMessage = '暂无任务',
}) => {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState(tasks);
  // 多日期拖拽：本地立即更新数据。DraggableFlatList 的 onDragEnd 在 spring 动画完成后
  // 才回调，回调→store set→props 回流之间存在时序缺口：库内部 cell 已到 to 落点，但 data
  // prop 仍为旧状态，于是错位/残影。onDragEnd 中立即把本地数据更新到与库落点一致，
  // 并用 pendingSyncRef 阻止 props 回流期间覆盖（防回弹），100ms 后放行同步。
  const [localRenderData, setLocalRenderData] = useState<(DraggableTask | { id: string; isHeader: true; rangeStart: number; rangeEnd: number })[]>([]);
  const [isUsingLocalData, setIsUsingLocalData] = useState(false);
  const pendingSyncRef = React.useRef(false);
  // 无效落点（任务拖到首个日期头之前）时递增，强制 DraggableFlatList 重挂载，
  // 让所有 cell 按正确 data 重新 layout 回原位。FlatList 对 key 相同仅引用变化的
  // data 不会重 layout cell 位置，必须通过 key 变化重挂载才能纠正。
  const [remountKey, setRemountKey] = useState(0);

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

  // props 变化时同步本地数据；拖拽后 pendingSyncRef 期间禁止覆盖（防 props 回流回弹/残影）
  React.useEffect(() => {
    if (pendingSyncRef.current) {
      return;
    }
    setData(tasks);
    setLocalRenderData(renderDataFromProps);
    setIsUsingLocalData(false);
  }, [tasks, renderDataFromProps]);

  // 拖拽后立即使用本地数据（与库落点一致）；否则用 props 派生数据
  const renderDataWithHeaders = isUsingLocalData ? localRenderData : renderDataFromProps;

  type RenderItem = DraggableTask | { id: string; isHeader: true; rangeStart: number; rangeEnd: number };

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
    let foundHeader = false;

    // 向前查找最近的头部
    for (let i = to - 1; i >= 0; i--) {
      const item = newData[i];
      if ('isHeader' in item && item.isHeader) {
        // 找到头部，使用该头部的范围
        toRangeStart = item.rangeStart;
        foundHeader = true;
        break;
      }
    }

    // 任务被拖到第一个日期头之前（列表最顶部，脱离任何日期分组）——无效落点。
    // 库的 onDragEnd 已把 cell 物理移到 index 0，但 props.data 仍是拖拽前的正确顺序，
    // key 序列未变，库不会自动 reset。这里切换到本地数据（新数组引用）强制 FlatList
    // reconcile：把 cell 按 renderDataFromProps 的正确 key→index 重新 layout 回原位。
    // pendingSyncRef 锁住，避免 props 回流覆盖；下一帧放行恢复 props 驱动。
    if (!foundHeader) {
      pendingSyncRef.current = true;
      setLocalRenderData([...renderDataFromProps]);
      setIsUsingLocalData(true);
      // 递增 key 强制 DraggableFlatList 重挂载，按正确 data 重新 layout cell
      setRemountKey((k) => k + 1);
      setTimeout(() => {
        pendingSyncRef.current = false;
      }, 100);
      return;
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
          (item) => 'isHeader' in item && item.rangeStart === targetRange.start
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

          // 新逻辑：精确定位插入位置
          let insertIndex = targetHeaderIndex + 1; // 默认插入到头部后面

          if (lastTargetTaskLocalIndex === -1) {
            // 目标范围没有任务，插入到头部后面
            insertIndex = targetHeaderIndex + 1;
          } else {
            // 在 newData 中找到 to 位置之后（或之前）的最近一个目标范围任务
            let nearestTaskIndexInNewData: number | null = null;

            // 先向后查找
            for (let i = to + 1; i < newData.length; i++) {
              const item = newData[i];
              if (!('isHeader' in item) &&
                (item as DraggableTask).rangeStart === targetRange.start) {
                nearestTaskIndexInNewData = i;
                break;
              }
            }

            // 如果后面没找到，向前查找
            if (nearestTaskIndexInNewData === null) {
              for (let i = to - 1; i >= 0; i--) {
                const item = newData[i];
                if (!('isHeader' in item) &&
                  (item as DraggableTask).rangeStart === targetRange.start) {
                  nearestTaskIndexInNewData = i;
                  break;
                }
              }
            }

            // 在 newLocalData 中找到对应的任务
            if (nearestTaskIndexInNewData !== null) {
              const nearestTaskInNewData = newData[nearestTaskIndexInNewData] as DraggableTask;
              const nearestTaskId = nearestTaskInNewData.taskId;

              // 在 newLocalData 中找到相同 taskId 的任务
              for (let i = targetHeaderIndex + 1; i < newLocalData.length; i++) {
                const item = newLocalData[i];
                if (!('isHeader' in item)) {
                  const task = item as DraggableTask;
                  if (task.taskId === nearestTaskId) {
                    // 如果是从 newData 中向后找到的，插入到它前面
                    if (nearestTaskIndexInNewData > to) {
                      insertIndex = i;
                    } else {
                      // 如果是从 newData 中向前找到的，插入到它后面
                      insertIndex = i + 1;
                    }
                    break;
                  }
                }
              }
            }

            // insertIndex 已在声明时设置默认值，无需额外处理
          }

          insertIndex = Math.min(insertIndex, newLocalData.length);
          newLocalData.splice(insertIndex, 0, updatedTask);
        } else {
          newLocalData.push(updatedTask);
        }

        setLocalRenderData(newLocalData);
        setIsUsingLocalData(true);
        pendingSyncRef.current = true;

        // 同时改日期与顺序：把 newLocalData 的任务顺序同步到 store，使 props 回流后
        // groupedTasks 的顺序与 localRenderData 一致，避免被 store 原顺序覆盖
        // （如把任务2拖到29日任务1上方，回流后任务1不会反超到上面）。
        const allTaskIds = newLocalData
          .filter((item): item is DraggableTask => !('isHeader' in item))
          .map((item) => item.taskId);
        if (onMoveTaskToDateWithOrder) {
          onMoveTaskToDateWithOrder(
            draggableDraggedItem.taskId,
            targetRange.start,
            targetRange.end,
            allTaskIds
          );
        } else {
          onMoveTaskToDate?.(draggableDraggedItem.taskId, targetRange.start, targetRange.end);
          onReorder?.(allTaskIds);
        }

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
  }, [sortedRanges, onMoveTaskToDate, onMoveTaskToDateWithOrder, onReorder]);

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
        key={remountKey}
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
      />
    </View>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
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
      color: c.textTertiary,
    },
    dateHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: c.surfaceSecondary,
      borderTopWidth: 1,
      borderTopColor: c.border,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    dateHeaderText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.text,
    },
    taskCountBadge: {
      backgroundColor: c.primary,
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
