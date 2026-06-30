import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { TimeAxis } from '../../components/TimeAxis';
import { TaskList } from '../../components/TaskList';
import { MovableFab } from '../../components/MovableFab';
import { useView, useTasksByRanges } from '../../hooks';
import { useTaskStore } from '../../stores/taskStore';
import { useTheme, ThemeColors } from '../../theme';
import type { TimeAxisUnit } from '../../types';

export const HomeScreen: React.FC = () => {
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    currentView,
    currentDate,
    selectedRanges,
    timeAxisUnits,
    selectedTimeRanges,
    setView,
    setCurrentDate,
    toggleRangeSelection,
    clearRangeSelection,
    next,
    previous,
  } = useView();

  const { tasks, isLoading, error, groupedTasks, ranges } = useTasksByRanges(selectedTimeRanges);
  const { toggleTaskCompleted, reorderTasks, moveTaskToDate, moveTaskToDateWithOrder } = useTaskStore();
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // 如果没有选择任何范围，默认选择当前时间单元
  useEffect(() => {
    if (selectedRanges.length === 0 && currentDate) {
      // 获取当前时间单元的开始时间
      const getUnitTimestamp = () => {
        const date = new Date(currentDate);
        switch (currentView) {
          case 'day':
            return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
          case 'week':
            const weekStart = new Date(date);
            const day = weekStart.getDay() || 7;
            weekStart.setDate(weekStart.getDate() - day + 1);
            return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
          case 'month':
            return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
          case 'year':
            return new Date(date.getFullYear(), 0, 1).getTime();
        }
      };

      const timestamp = getUnitTimestamp();
      // 检查是否已经包含该时间戳，避免无限循环
      if (!selectedRanges.includes(timestamp)) {
        toggleRangeSelection(timestamp);
      }
    }
  }, [currentView, currentDate]);

  // 只在切换视图时重置选中范围
  useEffect(() => {
    if (selectedRanges.length > 0 && currentDate) {
      const date = new Date(currentDate);
      const getUnitTimestamp = () => {
        switch (currentView) {
          case 'day':
            return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
          case 'week':
            const weekStart = new Date(date);
            const day = weekStart.getDay() || 7;
            weekStart.setDate(weekStart.getDate() - day + 1);
            return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
          case 'month':
            return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
          case 'year':
            return new Date(date.getFullYear(), 0, 1).getTime();
        }
      };
      const timestamp = getUnitTimestamp();
      clearRangeSelection();
      toggleRangeSelection(timestamp);
    }
  }, [currentView]);

  const handleUnitPress = (unit: TimeAxisUnit) => {
    const timestamp = unit.startDate.getTime();
    toggleRangeSelection(timestamp);
  };

  const handleToggleTask = (id: string) => {
    toggleTaskCompleted(id);
  };

  const handleReorder = (taskIds: string[]) => {
    // 转换 view 到 planType
    const planTypeMap: Record<string, string> = {
      day: 'daily',
      week: 'weekly',
      month: 'monthly',
      year: 'yearly',
    };
    reorderTasks(planTypeMap[currentView], taskIds);
  };

  const handleMoveTaskToDate = async (
    taskId: string,
    newStart: number,
    newEnd?: number
  ) => {
    await moveTaskToDate(taskId, newStart, newEnd);
  };

  const handleMoveTaskToDateWithOrder = async (
    taskId: string,
    newStart: number,
    newEnd: number | undefined,
    taskIds: string[]
  ) => {
    const planTypeMap: Record<string, string> = {
      day: 'daily',
      week: 'weekly',
      month: 'monthly',
      year: 'yearly',
    };
    await moveTaskToDateWithOrder(taskId, newStart, newEnd, planTypeMap[currentView], taskIds);
  };

  const handleTaskPress = (task: any) => {
    router.push({
      pathname: '/task-detail',
      params: { taskId: task.id },
    });
  };

  const getEmptyMessage = () => {
    const labels = {
      day: '今日暂无任务',
      week: '本周暂无任务',
      month: '本月暂无任务',
      year: '今年暂无任务',
    };
    return labels[currentView];
  };

  return (
    <View style={styles.container}>
      {/* 时间轴组件 */}
      <TimeAxis
        units={timeAxisUnits}
        currentView={currentView}
        onUnitPress={handleUnitPress}
        onPrevious={previous}
        onNext={next}
        onSetView={setView}
      />

      {/* 多选模式提示 */}
      {selectedRanges.length > 1 && (
        <View style={styles.multiSelectBar}>
          <Text style={styles.multiSelectText}>
            已选择 {selectedRanges.length} {currentView === 'day' ? '天' : currentView === 'week' ? '周' : currentView === 'month' ? '月' : '年'} {selectedRanges.length >= 3 && '(最多 3 个)'}
          </Text>
          <TouchableOpacity onPress={() => clearRangeSelection()}>
            <Text style={styles.clearButton}>清空</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 已达最大选择数量提示 */}
      {selectedRanges.length >= 3 && (
        <View style={styles.maxSelectWarning}>
          <Text style={styles.maxSelectWarningText}>已达最大选择数量（3 个）</Text>
        </View>
      )}

      {/* 任务列表 */}
      <TaskList
        tasks={tasks}
        groupedTasks={groupedTasks}
        ranges={ranges}
        currentView={currentView}
        onToggleTask={handleToggleTask}
        onTaskPress={handleTaskPress}
        onReorder={handleReorder}
        onMoveTaskToDate={handleMoveTaskToDate}
        onMoveTaskToDateWithOrder={handleMoveTaskToDateWithOrder}
        emptyMessage={getEmptyMessage()}
      />

      {/* 添加任务按钮（可拖动） */}
      <MovableFab
        colors={colors}
        onPress={() => router.push({ pathname: '/task-detail', params: { createNew: 'true' } })}
      />
    </View>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    multiSelectBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    multiSelectText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '500',
    },
    clearButton: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    maxSelectWarning: {
      backgroundColor: c.warning,
      paddingHorizontal: 16,
      paddingVertical: 6,
      alignItems: 'center',
    },
    maxSelectWarningText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '500',
    },
  });
