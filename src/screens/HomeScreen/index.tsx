import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { TimeAxis } from '../../components/TimeAxis';
import { TaskList } from '../../components/TaskList';
import { MovableFab } from '../../components/MovableFab';
import { useView, useTasksByRanges } from '../../hooks';
import { useTaskStore } from '../../stores/taskStore';
import { useTheme, ThemeColors } from '../../theme';
import type { TimeAxisUnit, ViewType, PlanType, TaskWithChildren } from '../../types';

// 视图 → 计划类型 映射：日视图只展示 daily，周视图只展示 weekly，依此类推。
const VIEW_TO_PLAN_TYPE: Record<ViewType, PlanType> = {
  day: 'daily',
  week: 'weekly',
  month: 'monthly',
  year: 'yearly',
};

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

  const { tasks, isLoading, error, groupedTasks, ranges } = useTasksByRanges(
    selectedTimeRanges,
    VIEW_TO_PLAN_TYPE[currentView]
  );
  const { toggleTaskCompleted, reorderTasks, moveTaskToDate, moveTaskToDateWithOrder } = useTaskStore();
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // 搜索与完成状态筛选（仅作用于父任务；筛选态禁用拖拽，避免部分可见任务重排破坏全局顺序）
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const isFiltering = searchKeyword.trim() !== '' || statusFilter !== 'all';

  const matchTask = useCallback((t: TaskWithChildren) => {
    const kw = searchKeyword.trim().toLowerCase();
    if (kw) {
      const inTitle = t.title.toLowerCase().includes(kw);
      const inDesc = t.description?.toLowerCase().includes(kw) ?? false;
      if (!inTitle && !inDesc) return false;
    }
    if (statusFilter === 'active' && t.isCompleted) return false;
    if (statusFilter === 'completed' && !t.isCompleted) return false;
    return true;
  }, [searchKeyword, statusFilter]);

  const filteredTasks = useMemo(() => tasks.filter(matchTask), [tasks, matchTask]);
  const filteredGrouped = useMemo(() => {
    if (!isFiltering) return groupedTasks;
    const map = new Map<number, TaskWithChildren[]>();
    groupedTasks.forEach((arr, key) => map.set(key, arr.filter(matchTask)));
    return map;
  }, [groupedTasks, matchTask, isFiltering]);

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
    reorderTasks(VIEW_TO_PLAN_TYPE[currentView], taskIds);
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
    await moveTaskToDateWithOrder(
      taskId,
      newStart,
      newEnd,
      VIEW_TO_PLAN_TYPE[currentView],
      taskIds
    );
  };

  const handleTaskPress = (task: any) => {
    router.push({
      pathname: '/task-detail',
      params: { taskId: task.id },
    });
  };

  const getEmptyMessage = () => {
    if (isFiltering) return '没有符合条件的任务';
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

      {/* 搜索与完成状态筛选 */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="搜索任务标题或描述"
            placeholderTextColor={colors.textTertiary}
            value={searchKeyword}
            onChangeText={setSearchKeyword}
          />
          {searchKeyword !== '' && (
            <TouchableOpacity onPress={() => setSearchKeyword('')} style={styles.searchClear} activeOpacity={0.7}>
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.statusFilterRow}>
          {([
            { key: 'all', label: '全部' },
            { key: 'active', label: '未完成' },
            { key: 'completed', label: '已完成' },
          ] as const).map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.statusChip, statusFilter === s.key && styles.statusChipActive]}
              onPress={() => setStatusFilter(s.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.statusChipText, statusFilter === s.key && styles.statusChipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
        tasks={filteredTasks}
        groupedTasks={filteredGrouped}
        ranges={ranges}
        currentView={currentView}
        onToggleTask={handleToggleTask}
        onTaskPress={handleTaskPress}
        onReorder={handleReorder}
        onMoveTaskToDate={handleMoveTaskToDate}
        onMoveTaskToDateWithOrder={handleMoveTaskToDateWithOrder}
        emptyMessage={getEmptyMessage()}
        dragEnabled={!isFiltering}
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
    searchBar: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    searchInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    searchIcon: {
      fontSize: 14,
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: c.text,
      paddingVertical: 8,
    },
    searchClear: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    searchClearText: {
      fontSize: 14,
      color: c.textTertiary,
    },
    statusFilterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    statusChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    statusChipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    statusChipText: {
      fontSize: 13,
      color: c.textSecondary,
    },
    statusChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '500',
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
