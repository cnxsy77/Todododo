import { useViewStore } from '../../src/stores/viewStore';
import { formatDate } from '../../src/utils/date';

const reset = () =>
  useViewStore.setState({ currentView: 'day', currentDate: new Date(2026, 6, 15).getTime(), selectedRanges: [] });

beforeEach(() => reset());

describe('setView', () => {
  it('切换视图', () => {
    useViewStore.getState().setView('week');
    expect(useViewStore.getState().currentView).toBe('week');
  });
});

describe('setCurrentDate', () => {
  it('接受 Date', () => {
    useViewStore.getState().setCurrentDate(new Date(2026, 0, 1));
    expect(formatDate(useViewStore.getState().currentDate, 'yyyy-MM-dd')).toBe('2026-01-01');
  });
  it('接受时间戳', () => {
    const ts = new Date(2026, 11, 31).getTime();
    useViewStore.getState().setCurrentDate(ts);
    expect(useViewStore.getState().currentDate).toBe(ts);
  });
});

describe('toggleRangeSelection', () => {
  it('选中并按升序排列', () => {
    useViewStore.getState().toggleRangeSelection(5);
    useViewStore.getState().toggleRangeSelection(3);
    expect(useViewStore.getState().selectedRanges).toEqual([3, 5]);
  });

  it('再次点击取消选中', () => {
    useViewStore.setState({ selectedRanges: [3, 5] });
    useViewStore.getState().toggleRangeSelection(3);
    expect(useViewStore.getState().selectedRanges).toEqual([5]);
  });

  it('最多选择 3 个，第 4 个被忽略', () => {
    useViewStore.setState({ selectedRanges: [1, 2, 3] });
    useViewStore.getState().toggleRangeSelection(4);
    expect(useViewStore.getState().selectedRanges).toEqual([1, 2, 3]);
  });
});

describe('clearRangeSelection', () => {
  it('清空', () => {
    useViewStore.setState({ selectedRanges: [1, 2, 3] });
    useViewStore.getState().clearRangeSelection();
    expect(useViewStore.getState().selectedRanges).toEqual([]);
  });
});

describe('setRangeSelection', () => {
  it('直接覆盖（不过滤数量与顺序）', () => {
    useViewStore.getState().setRangeSelection([3, 1, 2]);
    expect(useViewStore.getState().selectedRanges).toEqual([3, 1, 2]);
  });
});

describe('next / previous', () => {
  it('day 视图前后一天', () => {
    useViewStore.setState({ currentView: 'day' });
    useViewStore.getState().next();
    expect(formatDate(useViewStore.getState().currentDate, 'yyyy-MM-dd')).toBe('2026-07-16');
    useViewStore.getState().previous();
    useViewStore.getState().previous();
    expect(formatDate(useViewStore.getState().currentDate, 'yyyy-MM-dd')).toBe('2026-07-14');
  });

  it('week 视图前后一周', () => {
    useViewStore.setState({ currentView: 'week' });
    useViewStore.getState().next();
    expect(formatDate(useViewStore.getState().currentDate, 'yyyy-MM-dd')).toBe('2026-07-22');
    useViewStore.getState().previous();
    expect(formatDate(useViewStore.getState().currentDate, 'yyyy-MM-dd')).toBe('2026-07-15');
  });

  it('month 视图前后一月', () => {
    useViewStore.setState({ currentView: 'month' });
    useViewStore.getState().next();
    expect(formatDate(useViewStore.getState().currentDate, 'yyyy-MM-dd')).toBe('2026-08-15');
    useViewStore.getState().previous();
    expect(formatDate(useViewStore.getState().currentDate, 'yyyy-MM-dd')).toBe('2026-07-15');
  });

  it('year 视图前后一年', () => {
    useViewStore.setState({ currentView: 'year' });
    useViewStore.getState().next();
    expect(formatDate(useViewStore.getState().currentDate, 'yyyy-MM-dd')).toBe('2027-07-15');
    useViewStore.getState().previous();
    expect(formatDate(useViewStore.getState().currentDate, 'yyyy-MM-dd')).toBe('2026-07-15');
  });
});
