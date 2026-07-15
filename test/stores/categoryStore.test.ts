jest.mock('../../src/database/categoryQueries', () => ({
  getAllCategories: jest.fn(() => Promise.resolve([])),
  getCategoriesByType: jest.fn(() => Promise.resolve([])),
  createCategory: jest.fn(),
  updateCategory: jest.fn(() => Promise.resolve()),
  deleteCategory: jest.fn(() => Promise.resolve()),
}));

import { useCategoryStore } from '../../src/stores/categoryStore';
import * as queries from '../../src/database/categoryQueries';
import type { Category } from '../../src/types';

const makeCat = (o: Partial<Category> = {}): Category => ({
  id: 'cat_1',
  name: '餐饮',
  type: 'expense',
  icon: '🍔',
  color: '#f00',
  createdAt: 100,
  ...o,
});

const reset = () =>
  useCategoryStore.setState({ categories: [], isLoading: false, error: null });

beforeEach(() => {
  jest.clearAllMocks();
  reset();
});

describe('loadCategories', () => {
  it('加载全部', async () => {
    (queries.getAllCategories as jest.Mock).mockResolvedValue([makeCat({ id: 'a' })]);
    await useCategoryStore.getState().loadCategories();
    expect(useCategoryStore.getState().categories).toHaveLength(1);
  });

  it('loadCategoriesByType 传参', async () => {
    (queries.getCategoriesByType as jest.Mock).mockResolvedValue([makeCat({ type: 'income' })]);
    await useCategoryStore.getState().loadCategoriesByType('income');
    expect(queries.getCategoriesByType).toHaveBeenCalledWith('income');
  });
});

describe('addCategory', () => {
  it('新建并追加', async () => {
    (queries.createCategory as jest.Mock).mockResolvedValue(makeCat({ id: 'new' }));
    useCategoryStore.setState({ categories: [makeCat({ id: 'old' })] });
    await useCategoryStore.getState().addCategory({
      name: '交通', type: 'expense', icon: '🚗', color: '#00f',
    });
    expect(useCategoryStore.getState().categories.map((c) => c.id)).toEqual(['old', 'new']);
  });
});

describe('updateCategory', () => {
  it('更新字段回流', async () => {
    useCategoryStore.setState({ categories: [makeCat({ id: 'c1', name: '旧' })] });
    await useCategoryStore.getState().updateCategory('c1', { name: '新' });
    expect(queries.updateCategory).toHaveBeenCalledWith('c1', { name: '新' });
    expect(useCategoryStore.getState().categories[0].name).toBe('新');
  });
});

describe('deleteCategory', () => {
  it('按 id 移除', async () => {
    useCategoryStore.setState({ categories: [makeCat({ id: 'a' }), makeCat({ id: 'b' })] });
    await useCategoryStore.getState().deleteCategory('a');
    expect(queries.deleteCategory).toHaveBeenCalledWith('a');
    expect(useCategoryStore.getState().categories.map((c) => c.id)).toEqual(['b']);
  });
});

describe('selectors', () => {
  beforeEach(() =>
    useCategoryStore.setState({
      categories: [
        makeCat({ id: 'e1', type: 'expense' }),
        makeCat({ id: 'i1', type: 'income' }),
        makeCat({ id: 'e2', type: 'expense' }),
      ],
    })
  );

  it('getCategoryById', () => {
    expect(useCategoryStore.getState().getCategoryById('i1')?.id).toBe('i1');
    expect(useCategoryStore.getState().getCategoryById('missing')).toBeUndefined();
  });

  it('getCategoriesByType 过滤', () => {
    expect(useCategoryStore.getState().getCategoriesByType('expense').map((c) => c.id)).toEqual(['e1', 'e2']);
    expect(useCategoryStore.getState().getCategoriesByType('income').map((c) => c.id)).toEqual(['i1']);
  });
});
