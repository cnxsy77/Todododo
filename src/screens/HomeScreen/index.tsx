import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { TimeAxis } from '../../components/TimeAxis';
import { TaskList } from '../../components/TaskList';
import { useView, useTasksByRanges } from '../../hooks';
import { useTaskStore } from '../../stores/taskStore';
import type { TimeAxisUnit } from '../../types';

export const HomeScreen: React.FC = () => {
  const router = useRouter();
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
  const { toggleTaskCompleted, reorderTasks, moveTaskToDate } = useTaskStore();
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
    } else if (selectedRanges.length > 0) {
      // 当切换视图时，清空之前的选择，选择当前视图的时间单元
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
  }, [currentView, currentDate]);

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
            已选择 {selectedRanges.length} {currentView === 'day' ? '天' : currentView === 'week' ? '周' : currentView === 'month' ? '月' : '年'} {selectedRanges.length >= 3 && '(最多 3 个)'})
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
        emptyMessage={getEmptyMessage()}
      />

      {/* 添加任务按钮 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push({ pathname: '/task-detail', params: { createNew: 'true' } })}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  multiSelectBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007AFF',
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
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  maxSelectWarningText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});
