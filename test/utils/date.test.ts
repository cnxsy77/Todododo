import {
  formatDate,
  formatDisplayDate,
  formatDisplayMonth,
  formatDisplayYear,
  formatDisplayWeek,
  getDayStart,
  getDayEnd,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  getYearStart,
  getYearEnd,
  getTimeRange,
  addTimeUnit,
  isToday,
  isThisWeek,
  isThisMonth,
  isThisYear,
  getSelectedRanges,
} from '../../src/utils/date';

const D = (y: number, m: number, d: number, h = 0, mi = 0, s = 0) =>
  new Date(y, m, d, h, mi, s);

describe('date 格式化', () => {
  it('formatDate 按模式格式化', () => {
    expect(formatDate(D(2026, 6, 15), 'yyyy-MM-dd')).toBe('2026-07-15');
    expect(formatDate(D(2026, 6, 15, 9, 5), 'yyyy/MM/dd HH:mm')).toBe('2026/07/15 09:05');
  });

  it('formatDisplayDate', () => {
    expect(formatDisplayDate(D(2026, 6, 15))).toBe('2026-07-15');
  });

  it('formatDisplayMonth', () => {
    expect(formatDisplayMonth(D(2026, 6, 15))).toBe('2026-07');
  });

  it('formatDisplayYear', () => {
    expect(formatDisplayYear(D(2026, 6, 15))).toBe('2026');
  });

  it('formatDisplayWeek 含年份与周数', () => {
    expect(formatDisplayWeek(D(2026, 6, 15))).toMatch(/^\d{4} 年第 \d+ 周$/);
  });
});

describe('date 范围边界', () => {
  it('getDayStart / getDayEnd', () => {
    expect(formatDate(getDayStart(D(2026, 6, 15, 13, 45)), 'yyyy-MM-dd HH:mm:ss')).toBe('2026-07-15 00:00:00');
    expect(formatDate(getDayEnd(D(2026, 6, 15, 13, 45)), 'yyyy-MM-dd HH:mm:ss')).toBe('2026-07-15 23:59:59');
  });

  it('getWeekStart / getWeekEnd（周一为起始）', () => {
    // 2026-07-15 是周三，周一=07-13，周日=07-19
    expect(formatDate(getWeekStart(D(2026, 6, 15)), 'yyyy-MM-dd')).toBe('2026-07-13');
    expect(formatDate(getWeekEnd(D(2026, 6, 15)), 'yyyy-MM-dd')).toBe('2026-07-19');
  });

  it('getMonthStart / getMonthEnd', () => {
    expect(formatDate(getMonthStart(D(2026, 6, 15)), 'yyyy-MM-dd')).toBe('2026-07-01');
    expect(formatDate(getMonthEnd(D(2026, 6, 15)), 'yyyy-MM-dd')).toBe('2026-07-31');
  });

  it('getYearStart / getYearEnd', () => {
    expect(formatDate(getYearStart(D(2026, 6, 15)), 'yyyy-MM-dd')).toBe('2026-01-01');
    expect(formatDate(getYearEnd(D(2026, 6, 15)), 'yyyy-MM-dd')).toBe('2026-12-31');
  });
});

describe('getTimeRange', () => {
  const date = D(2026, 6, 15);

  it('day', () => {
    expect(getTimeRange(date, 'day')).toEqual({ start: getDayStart(date), end: getDayEnd(date) });
  });
  it('week', () => {
    expect(getTimeRange(date, 'week')).toEqual({ start: getWeekStart(date), end: getWeekEnd(date) });
  });
  it('month', () => {
    expect(getTimeRange(date, 'month')).toEqual({ start: getMonthStart(date), end: getMonthEnd(date) });
  });
  it('year', () => {
    expect(getTimeRange(date, 'year')).toEqual({ start: getYearStart(date), end: getYearEnd(date) });
  });
});

describe('addTimeUnit', () => {
  const date = D(2026, 6, 15);

  it('day', () => {
    expect(formatDate(addTimeUnit(date, 'day', 1), 'yyyy-MM-dd')).toBe('2026-07-16');
    expect(formatDate(addTimeUnit(date, 'day', -1), 'yyyy-MM-dd')).toBe('2026-07-14');
  });
  it('week', () => {
    expect(formatDate(addTimeUnit(date, 'week', 1), 'yyyy-MM-dd')).toBe('2026-07-22');
  });
  it('month', () => {
    expect(formatDate(addTimeUnit(date, 'month', 1), 'yyyy-MM-dd')).toBe('2026-08-15');
  });
  it('year', () => {
    expect(formatDate(addTimeUnit(date, 'year', 1), 'yyyy-MM-dd')).toBe('2027-07-15');
  });
});

describe('is* 判断', () => {
  it('isToday', () => {
    expect(isToday(new Date())).toBe(true);
    expect(isToday(D(2020, 0, 1))).toBe(false);
  });

  it('isThisWeek', () => {
    expect(isThisWeek(new Date())).toBe(true);
    expect(isThisWeek(D(2020, 0, 1))).toBe(false);
  });

  it('isThisMonth', () => {
    expect(isThisMonth(new Date())).toBe(true);
    expect(isThisMonth(D(2020, 0, 1))).toBe(false);
  });

  it('isThisYear', () => {
    expect(isThisYear(new Date())).toBe(true);
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    expect(isThisYear(lastYear)).toBe(false);
  });
});

describe('getSelectedRanges', () => {
  it('空数组返回空', () => {
    expect(getSelectedRanges([], 'day')).toEqual([]);
  });

  it('day 视图：单时间戳映射为该日范围', () => {
    const ts = D(2026, 6, 15, 12, 0).getTime();
    const ranges = getSelectedRanges([ts], 'day');
    expect(ranges).toEqual([
      { start: getDayStart(ts).getTime(), end: getDayEnd(ts).getTime() },
    ]);
  });

  it('多个时间戳按升序映射', () => {
    const ts1 = D(2026, 6, 15, 12, 0).getTime();
    const ts2 = D(2026, 6, 20, 12, 0).getTime();
    const ranges = getSelectedRanges([ts2, ts1], 'day');
    expect(ranges).toEqual([
      { start: getDayStart(ts1).getTime(), end: getDayEnd(ts1).getTime() },
      { start: getDayStart(ts2).getTime(), end: getDayEnd(ts2).getTime() },
    ]);
  });

  it('year 视图：映射为整年范围', () => {
    const ts = D(2026, 6, 15, 12, 0).getTime();
    const ranges = getSelectedRanges([ts], 'year');
    expect(ranges).toEqual([
      { start: getYearStart(ts).getTime(), end: getYearEnd(ts).getTime() },
    ]);
  });
});
