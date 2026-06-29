import { getDatabase } from './schema';
import type { SQLiteDatabase } from './schema';
import type { Task, CreateTaskInput, UpdateTaskInput } from '../types';

// 行映射：DB 列(snake_case) → Task(camelCase)
const mapRow = (row: any): Task => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  planType: row.plan_type,
  startDate: row.start_date,
  endDate: row.end_date ?? undefined,
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
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    // 获取当前最大 sort_order
    const result = await db.getFirstAsync<{ max_order: number }>(
      'SELECT MAX(sort_order) as max_order FROM tasks WHERE plan_type = ?',
      [input.planType]
    );
    const sort_order = (result?.max_order ?? -1) + 1;

    await db.runAsync(
      `INSERT INTO tasks (id, title, description, plan_type, start_date, end_date, is_completed, sort_order, parent_task_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title,
        input.description || null,
        input.planType,
        input.startDate,
        input.endDate || null,
        0,
        sort_order,
        input.parentTaskId || null,
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
      planType: input.planType,
      startDate: input.startDate,
      endDate: input.endDate,
      isCompleted: false,
      order: 0,
      parentTaskId: input.parentTaskId,
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

  updates.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);

  await db.runAsync(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
};

// 删除任务
export const deleteTask = async (id: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
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

// 移动任务到新的日期
export const moveTaskToDate = async (
  id: string,
  newStartDate: number,
  newEndDate?: number
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE tasks SET start_date = ?, end_date = ?, updated_at = ? WHERE id = ?',
    [newStartDate, newEndDate || null, Date.now(), id]
  );
};

// 导出类型供其他模块复用
export type { SQLiteDatabase };
