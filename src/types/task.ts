// 任务类型
export type PlanType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Task {
  id: string;
  title: string;
  description?: string;
  planType: PlanType;
  startDate: number; // 时间戳
  endDate?: number;  // 时间戳
  isCompleted: boolean;
  order: number;           // 排序顺序
  parentTaskId?: string;   // 父任务 ID (用于层级)
  createdAt: number;       // 时间戳
  updatedAt: number;       // 时间戳
}

// 创建任务时的输入类型
export interface CreateTaskInput {
  title: string;
  description?: string;
  planType: PlanType;
  startDate: number;
  endDate?: number;
  parentTaskId?: string;
}

// 更新任务时的输入类型
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  planType?: PlanType;
  startDate?: number;
  endDate?: number;
  isCompleted?: boolean;
  order?: number;
  parentTaskId?: string;
}
