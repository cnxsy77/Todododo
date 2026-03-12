import { useEffect, useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import type { Task, PlanType } from '../types';

// 获取所有任务
export const useTasks = () => {
  const { tasks, isLoading, error, loadTasks } = useTaskStore();

  useEffect(() => {
    loadTasks();
  }, []);

  return { tasks, isLoading, error };
};

// 根据计划类型获取任务
export const useTasksByPlanType = (planType: PlanType) => {
  const { tasks, isLoading, error, loadTasksByPlanType } = useTaskStore();
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  useEffect(() => {
    loadTasksByPlanType(planType);
  }, [planType]);

  useEffect(() => {
    setFilteredTasks(tasks.filter((task) => task.planType === planType));
  }, [tasks, planType]);

  return { tasks: filteredTasks, isLoading, error };
};

// 根据日期范围获取任务
export const useTasksByDateRange = (startDate: number, endDate: number) => {
  const { tasks, isLoading, error, loadTasksByDateRange } = useTaskStore();
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  useEffect(() => {
    loadTasksByDateRange(startDate, endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    setFilteredTasks(
      tasks.filter(
        (task) => task.startDate >= startDate && task.startDate <= endDate
      )
    );
  }, [tasks, startDate, endDate]);

  return { tasks: filteredTasks, isLoading, error };
};

// 根据多选范围获取任务
export const useTasksByRanges = (ranges: { start: number; end: number }[]) => {
  const { tasks, isLoading, error, loadTasks } = useTaskStore();
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (ranges.length === 0) {
      setFilteredTasks([]);
      return;
    }

    const filtered = tasks.filter((task) =>
      ranges.some(
        (range) => task.startDate >= range.start && task.startDate <= range.end
      )
    );
    setFilteredTasks(filtered);
  }, [tasks, ranges]);

  return { tasks: filteredTasks, isLoading, error };
};
