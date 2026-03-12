import { useState, useCallback } from 'react';
import { useTaskStore } from '../stores/taskStore';
import type { Task } from '../types';

// 拖拽相关 Hooks
export const useDrag = () => {
  const { reorderTasks, moveTaskToDate } = useTaskStore();
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const handleDragStart = useCallback((task: Task) => {
    setIsDragging(true);
    setDraggedTask(task);
  }, []);

  const handleDragEnd = useCallback(async (
    planType: string,
    taskIds: string[]
  ) => {
    setIsDragging(false);
    setDraggedTask(null);
    await reorderTasks(planType, taskIds);
  }, [reorderTasks]);

  const handleDropOnDate = useCallback(async (
    taskId: string,
    newStartDate: number,
    newEndDate?: number
  ) => {
    await moveTaskToDate(taskId, newStartDate, newEndDate);
  }, [moveTaskToDate]);

  return {
    isDragging,
    draggedTask,
    handleDragStart,
    handleDragEnd,
    handleDropOnDate,
  };
};
