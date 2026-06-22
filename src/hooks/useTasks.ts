import { useEffect, useMemo, useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import type { Task } from '../types';

// 根据多选范围获取任务（首页时间轴多选场景）
export const useTasksByRanges = (ranges: { start: number; end: number }[]) => {
  const { tasks, isLoading, error, loadTasks } = useTaskStore();
  const [groupedTasks, setGroupedTasks] = useState<Map<number, Task[]>>(new Map());

  // 只在组件挂载时加载一次任务
  useEffect(() => {
    loadTasks();
  }, []);

  // 使用 useMemo 缓存过滤结果
  const memoizedFilteredTasks = useMemo(() => {
    if (ranges.length === 0) {
      return [];
    }
    return tasks.filter((task) =>
      ranges.some(
        (range) => task.startDate >= range.start && task.startDate <= range.end
      )
    );
  }, [tasks, JSON.stringify(ranges)]);

  // 按日期范围分组任务，包含所有选中的日期
  useEffect(() => {
    if (ranges.length === 0) {
      setGroupedTasks(new Map());
      return;
    }

    const grouped = new Map<number, Task[]>();
    ranges.forEach((range) => {
      const rangeTasks = tasks.filter(
        (task) => task.startDate >= range.start && task.startDate <= range.end
      );
      // 所有选中的日期都保留，即使没有任务
      grouped.set(range.start, rangeTasks);
    });
    setGroupedTasks(grouped);
  }, [tasks, ranges]);

  return { tasks: memoizedFilteredTasks, groupedTasks, isLoading, error, ranges };
};
