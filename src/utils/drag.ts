// 拖拽相关工具函数

import type { Task } from '../types';

// 计算拖拽后的新顺序
export const calculateNewOrder = (
  tasks: Task[],
  draggedIndex: number,
  dropIndex: number
): Task[] => {
  const newTasks = [...tasks];
  const [draggedTask] = newTasks.splice(draggedIndex, 1);
  newTasks.splice(dropIndex, 0, draggedTask);

  // 重新计算 order
  return newTasks.map((task, index) => ({
    ...task,
    order: index,
  }));
};

// 验证拖拽目标是否有效
export const isValidDropTarget = (
  draggedTask: Task,
  targetTask: Task,
  view: string
): boolean => {
  // 同计划类型才能拖拽
  return draggedTask.planType === targetTask.planType;
};

// 获取拖拽预览样式
export const getDragPreviewStyle = (
  isDragging: boolean
): { opacity?: number; transform?: any } => {
  if (isDragging) {
    return {
      opacity: 0.5,
      transform: { scale: 1.05 },
    };
  }
  return {};
};
