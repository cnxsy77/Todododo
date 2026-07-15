import { buildTree } from '../../src/hooks/useTasks';
import type { Task } from '../../src/types';

const t = (o: Partial<Task>): Task => ({
  id: 'x',
  title: 't',
  planType: 'daily',
  startDate: 1500,
  isCompleted: false,
  order: 0,
  createdAt: 1,
  updatedAt: 1,
  ...o,
});

const RANGES = [
  { start: 1000, end: 2000 },
  { start: 3000, end: 4000 },
];

describe('buildTree', () => {
  it('空 range 返回空结构', () => {
    const { flat, grouped } = buildTree([t({ id: 'a' })], 'daily', []);
    expect(flat).toEqual([]);
    expect(grouped.size).toBe(0);
  });

  it('父子组装：父任务挂载子任务', () => {
    const tasks = [
      t({ id: 'p', startDate: 1500, order: 0 }),
      t({ id: 'c', parentTaskId: 'p', startDate: 1500, order: 0 }),
    ];
    const { flat } = buildTree(tasks, 'daily', RANGES);
    expect(flat).toHaveLength(1);
    expect(flat[0].id).toBe('p');
    expect(flat[0].children.map((c) => c.id)).toEqual(['c']);
  });

  it('planType 过滤：仅保留匹配视图的任务', () => {
    const tasks = [
      t({ id: 'd', planType: 'daily', startDate: 1500 }),
      t({ id: 'w', planType: 'weekly', startDate: 1500 }),
    ];
    const { flat } = buildTree(tasks, 'daily', RANGES);
    expect(flat.map((p) => p.id)).toEqual(['d']);
  });

  it('range 过滤：startDate 落在范围外则排除', () => {
    const tasks = [
      t({ id: 'in', startDate: 1500 }),
      t({ id: 'out', startDate: 5000 }), // 不在任何 range 内
    ];
    const { flat } = buildTree(tasks, 'daily', RANGES);
    expect(flat.map((p) => p.id)).toEqual(['in']);
  });

  it('order 排序：父任务与子任务均按 order 升序', () => {
    const tasks = [
      t({ id: 'p', startDate: 1500, order: 0 }),
      t({ id: 'c2', parentTaskId: 'p', order: 2 }),
      t({ id: 'c1', parentTaskId: 'p', order: 1 }),
      t({ id: 'pb', startDate: 1500, order: 0 }),
      t({ id: 'pa', startDate: 1500, order: -1 }),
    ];
    const { flat } = buildTree(tasks, 'daily', RANGES);
    expect(flat.map((p) => p.id)).toEqual(['pa', 'p', 'pb']);
    const p = flat.find((x) => x.id === 'p')!;
    expect(p.children.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('grouped：父任务按所属 range.start 分组', () => {
    const tasks = [
      t({ id: 'p1', startDate: 1500, order: 0 }), // 属 [1000,2000]
      t({ id: 'p2', startDate: 3500, order: 0 }), // 属 [3000,4000]
    ];
    const { grouped } = buildTree(tasks, 'daily', RANGES);
    expect(grouped.size).toBe(2);
    expect(grouped.get(1000)!.map((p) => p.id)).toEqual(['p1']);
    expect(grouped.get(3000)!.map((p) => p.id)).toEqual(['p2']);
  });

  it('孤儿子任务（父任务不在结果中）不进入 flat', () => {
    const tasks = [t({ id: 'orphan', parentTaskId: 'ghost', startDate: 1500 })];
    const { flat } = buildTree(tasks, 'daily', RANGES);
    expect(flat).toEqual([]);
  });

  it('无子任务的父任务 children 为空数组', () => {
    const tasks = [t({ id: 'p', startDate: 1500, order: 0 })];
    const { flat } = buildTree(tasks, 'daily', RANGES);
    expect(flat).toHaveLength(1);
    expect(flat[0].children).toEqual([]);
  });
});
