import { getDatabase } from './schema';
import type { SQLiteDatabase } from './schema';
import type { Task, CreateTaskInput, UpdateTaskInput } from '../types';
import { uuid } from '../utils/uuid';

// 行映射：DB 列(snake_case) → Task(camelCase)
const mapRow = (row: any): Task => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  planType: row.plan_type,
  startDate: row.start_date,
  endDate: row.end_date ?? undefined,
  reminderAt: row.reminder_at ?? undefined,
  isCompleted: row.is_completed === 1,
  order: row.sort_order,
  parentTaskId: row.parent_task_id ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// 获取所有任务
export const getAllTasks = async (): Promise<Task[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM tasks ORDER BY sort_order ASC'
  );
  return rows.map(mapRow);
};

// 根据 ID 获取任务
export const getTaskById = async (id: string): Promise<Task | undefined> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM tasks WHERE id = ?',
    [id]
  );
  return row ? mapRow(row) : undefined;
};

// 创建任务
export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  const db = await getDatabase();
  const id = uuid();
  const now = Date.now();

  // 若指定父任务：强制继承父的 planType/startDate/endDate，并校验仅支持两层
  let planType = input.planType;
  let startDate = input.startDate;
  let endDate = input.endDate;
  let parentTaskId = input.parentTaskId || null;
  // 提醒时间不随父任务继承，子任务可独立设置
  const reminderAt = input.reminderAt;

  if (parentTaskId) {
    const parent = await getTaskById(parentTaskId);
    if (!parent) {
      throw new Error('父任务不存在');
    }
    // 仅支持父-子两层：父任务自身不能是子任务
    if (parent.parentTaskId) {
      throw new Error('子任务不能再有子任务（仅支持两层）');
    }
    planType = parent.planType;
    startDate = parent.startDate;
    endDate = parent.endDate;
  }

  await db.withTransactionAsync(async () => {
    // 获取当前最大 sort_order
    const result = await db.getFirstAsync<{ max_order: number }>(
      'SELECT MAX(sort_order) as max_order FROM tasks WHERE plan_type = ?',
      [planType]
    );
    const sort_order = (result?.max_order ?? -1) + 1;

    await db.runAsync(
      `INSERT INTO tasks (id, title, description, plan_type, start_date, end_date, is_completed, sort_order, parent_task_id, reminder_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title,
        input.description || null,
        planType,
        startDate,
        endDate || null,
        0,
        sort_order,
        parentTaskId,
        reminderAt || null,
        now,
        now,
      ]
    );
  });

  const created = await getTaskById(id);
  return (
    created ?? {
      id,
      title: input.title,
      description: input.description,
      planType,
      startDate,
      endDate,
      reminderAt,
      isCompleted: false,
      order: 0,
      parentTaskId: parentTaskId || undefined,
      createdAt: now,
      updatedAt: now,
    }
  );
};

// 更新任务
export const updateTask = async (
  id: string,
  input: UpdateTaskInput
): Promise<void> => {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.planType !== undefined) {
      updates.push('plan_type = ?');
      values.push(input.planType);
    }
    if (input.startDate !== undefined) {
      updates.push('start_date = ?');
      values.push(input.startDate);
    }
    if (input.endDate !== undefined) {
      updates.push('end_date = ?');
      values.push(input.endDate);
    }
    if (input.isCompleted !== undefined) {
      updates.push('is_completed = ?');
      values.push(input.isCompleted ? 1 : 0);
    }
    if (input.order !== undefined) {
      updates.push('sort_order = ?');
      values.push(input.order);
    }
    if (input.parentTaskId !== undefined) {
      updates.push('parent_task_id = ?');
      values.push(input.parentTaskId);
    }
    if (input.reminderAt !== undefined) {
      updates.push('reminder_at = ?');
      values.push(input.reminderAt);
    }

    updates.push('updated_at = ?');
    const now = Date.now();
    values.push(now);
    values.push(id);

    await db.runAsync(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // 父任务的 planType/startDate/endDate 变更需级联到子任务
    const childCols: string[] = [];
    const childVals: any[] = [];
    if (input.planType !== undefined) {
      childCols.push('plan_type = ?');
      childVals.push(input.planType);
    }
    if (input.startDate !== undefined) {
      childCols.push('start_date = ?');
      childVals.push(input.startDate);
    }
    if (input.endDate !== undefined) {
      childCols.push('end_date = ?');
      childVals.push(input.endDate);
    }
    if (childCols.length) {
      childVals.push(now, id);
      await db.runAsync(
        `UPDATE tasks SET ${childCols.join(', ')}, updated_at = ? WHERE parent_task_id = ?`,
        childVals
      );
    }
  });
};

// 设置任务及其所有子任务的完成状态（完成联动）
export const setTaskAndChildrenCompleted = async (
  id: string,
  completed: boolean
): Promise<void> => {
  const db = await getDatabase();
  const now = Date.now();
  const v = completed ? 1 : 0;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE tasks SET is_completed = ?, updated_at = ? WHERE id = ?',
      [v, now, id]
    );
    await db.runAsync(
      'UPDATE tasks SET is_completed = ?, updated_at = ? WHERE parent_task_id = ?',
      [v, now, id]
    );
  });
};

// 删除任务（级联删除其所有子任务）
export const deleteTask = async (id: string): Promise<void> => {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM tasks WHERE parent_task_id = ?', [id]);
    await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
  });
};

// 批量更新任务排序
export const updateTaskOrders = async (
  _planType: string,
  taskIds: string[]
): Promise<void> => {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const now = Date.now();
    for (let i = 0; i < taskIds.length; i++) {
      await db.runAsync(
        'UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?',
        [i, now, taskIds[i]]
      );
    }
  });
};

// 移动任务到新的日期（级联更新其子任务的日期，保持父子同范围）
export const moveTaskToDate = async (
  id: string,
  newStartDate: number,
  newEndDate?: number
): Promise<void> => {
  const db = await getDatabase();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE tasks SET start_date = ?, end_date = ?, updated_at = ? WHERE id = ?',
      [newStartDate, newEndDate || null, now, id]
    );
    await db.runAsync(
      'UPDATE tasks SET start_date = ?, end_date = ?, updated_at = ? WHERE parent_task_id = ?',
      [newStartDate, newEndDate || null, now, id]
    );
  });
};

// 导出类型供其他模块复用
export type { SQLiteDatabase };
