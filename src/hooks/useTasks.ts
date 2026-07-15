import { useEffect, useMemo, useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import type { Task, PlanType, TaskWithChildren } from '../types';

/**
 * 把扁平任务列表组装成"父任务带子任务"的树，并按视图范围过滤。
 *
 * 子任务继承父任务的 planType/startDate（在 createTask/moveTask/updateTask 中强制级联），
 * 因此父子天然落在同一 range、同一 planType，buildTree 只需把 parentTaskId 匹配上即可挂载。
 *
 * @returns flat: 范围内的父任务（带 children）；grouped: 按 range.start 分组的父任务树
 */
const buildTree = (
  tasks: Task[],
  planType: PlanType,
  ranges: { start: number; end: number }[]
) => {
  if (ranges.length === 0) {
    return { flat: [] as TaskWithChildren[], grouped: new Map<number, TaskWithChildren[]>() };
  }

  const inRanges = (t: Task) =>
    ranges.some((r) => t.startDate >= r.start && t.startDate <= r.end);

  const matched = tasks.filter((t) => t.planType === planType && inRanges(t));

  // 父任务（无 parentTaskId）按 order 排序
  const parents = matched
    .filter((t) => !t.parentTaskId)
    .sort((a, b) => a.order - b.order);

  // 子任务按 parentTaskId 分组，组内按 order 排序
  const childMap = new Map<string, Task[]>();
  matched
    .filter((t) => t.parentTaskId)
    .forEach((c) => {
      const arr = childMap.get(c.parentTaskId!) ?? [];
      arr.push(c);
      childMap.set(c.parentTaskId!, arr);
    });
  childMap.forEach((arr) => arr.sort((a, b) => a.order - b.order));

  const flat: TaskWithChildren[] = parents.map((p) => ({
    ...p,
    children: childMap.get(p.id) ?? [],
  }));

  const grouped = new Map<number, TaskWithChildren[]>();
  ranges.forEach((range) => {
    grouped.set(
      range.start,
      flat.filter((p) => p.startDate >= range.start && p.startDate <= range.end)
    );
  });

  return { flat, grouped };
};

// 根据多选范围获取任务（首页时间轴多选场景）
// planType 用于按当前视图过滤：日视图只看 daily、周视图只看 weekly，依此类推，
// 避免不同粒度的任务互相混入。返回的父任务带子任务（缩进嵌套展示用）。
export const useTasksByRanges = (
  ranges: { start: number; end: number }[],
  planType: PlanType
) => {
  const { tasks, isLoading, error, loadTasks } = useTaskStore();

  // range/planType 变化时按需查库（替代全量加载）：切换视图并加载当前范围任务
  useEffect(() => {
    loadTasks(planType, ranges);
  }, [planType, JSON.stringify(ranges), loadTasks]);

  // 使用 useMemo 缓存过滤结果（同步派生）
  const memoizedFilteredTasks = useMemo(
    () => buildTree(tasks, planType, ranges).flat,
    [tasks, planType, JSON.stringify(ranges)]
  );

  // 按日期范围分组任务，包含所有选中的日期。
  // 必须用 useEffect 异步派生（落后一帧）：store 写操作（moveTaskToDate 等）先 await 库
  // 再 set，set 后这里再延一帧才更新 groupedTasks→renderDataFromProps。这样 data prop 的
  // 变化总是滞后于 DraggableFlatList 的 onDragEnd 收尾动画/reset，避免同帧竞争导致的
  // cell translateY 残留（"上移一半被遮住"）。TaskList 的 localRenderData+pendingSyncRef
  // 负责拖拽后立即态，props 回流在此异步完成同步切换。
  const [groupedTasks, setGroupedTasks] = useState<Map<number, TaskWithChildren[]>>(
    new Map()
  );
  useEffect(() => {
    setGroupedTasks(buildTree(tasks, planType, ranges).grouped);
  }, [tasks, ranges, planType]);

  return { tasks: memoizedFilteredTasks, groupedTasks, isLoading, error, ranges };
};
