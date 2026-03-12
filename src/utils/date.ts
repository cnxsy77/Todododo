import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear, addDays, addWeeks, addMonths, addYears, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import type { ViewType, TimeAxisUnit } from '../types';

// 格式化日期
export const formatDate = (date: Date | number, pattern: string): string => {
  return format(date, pattern);
};

// 格式化显示日期
export const formatDisplayDate = (date: Date | number): string => {
  return format(date, 'yyyy-MM-dd');
};

// 格式化显示月份
export const formatDisplayMonth = (date: Date | number): string => {
  return format(date, 'yyyy-MM');
};

// 格式化显示年份
export const formatDisplayYear = (date: Date | number): string => {
  return format(date, 'yyyy');
};

// 格式化显示周
export const formatDisplayWeek = (date: Date | number): string => {
  return format(date, 'yyyy 年第 w 周');
};

// 获取某天的开始
export const getDayStart = (date: Date | number): Date => {
  return startOfDay(date);
};

// 获取某天的结束
export const getDayEnd = (date: Date | number): Date => {
  return endOfDay(date);
};

// 获取某周的开始
export const getWeekStart = (date: Date | number): Date => {
  return startOfWeek(date, { weekStartsOn: 1 });
};

// 获取某周的结束
export const getWeekEnd = (date: Date | number): Date => {
  return endOfWeek(date, { weekStartsOn: 1 });
};

// 获取某月的开始
export const getMonthStart = (date: Date | number): Date => {
  return startOfMonth(date);
};

// 获取某月的结束
export const getMonthEnd = (date: Date | number): Date => {
  return endOfMonth(date);
};

// 获取某年的开始
export const getYearStart = (date: Date | number): Date => {
  return startOfYear(date);
};

// 获取某年的结束
export const getYearEnd = (date: Date | number): Date => {
  return endOfYear(date);
};

// 获取时间范围
export const getTimeRange = (date: Date | number, view: ViewType): { start: Date; end: Date } => {
  switch (view) {
    case 'day':
      return { start: getDayStart(date), end: getDayEnd(date) };
    case 'week':
      return { start: getWeekStart(date), end: getWeekEnd(date) };
    case 'month':
      return { start: getMonthStart(date), end: getMonthEnd(date) };
    case 'year':
      return { start: getYearStart(date), end: getYearEnd(date) };
  }
};

// 添加时间单位
export const addTimeUnit = (date: Date, view: ViewType, amount: number): Date => {
  switch (view) {
    case 'day':
      return addDays(date, amount);
    case 'week':
      return addWeeks(date, amount);
    case 'month':
      return addMonths(date, amount);
    case 'year':
      return addYears(date, amount);
  }
};

// 获取时间轴单元
export const getTimeAxisUnits = (
  currentDate: number,
  view: ViewType,
  selectedRanges: number[]
): TimeAxisUnit[] => {
  const date = new Date(currentDate);
  const units: TimeAxisUnit[] = [];

  switch (view) {
    case 'day': {
      // 显示前后 3 天
      const days = eachDayOfInterval({
        start: addDays(date, -3),
        end: addDays(date, 3),
      });
      days.forEach((day) => {
        const timestamp = day.getTime();
        units.push({
          id: `day-${timestamp}`,
          label: format(day, 'MM-dd'),
          subLabel: format(day, 'EEE'),
          startDate: getDayStart(day),
          endDate: getDayEnd(day),
          isSelected: selectedRanges.includes(timestamp),
        });
      });
      break;
    }
    case 'week': {
      // 显示前后 4 周
      const weeks = eachWeekOfInterval({
        start: addWeeks(date, -4),
        end: addWeeks(date, 4),
      }, { weekStartsOn: 1 });
      weeks.forEach((week) => {
        const timestamp = week.getTime();
        units.push({
          id: `week-${timestamp}`,
          label: format(week, 'MM-dd'),
          subLabel: format(week, '第 w 周'),
          startDate: getWeekStart(week),
          endDate: getWeekEnd(week),
          isSelected: selectedRanges.includes(timestamp),
        });
      });
      break;
    }
    case 'month': {
      // 显示前后 6 个月
      const months = eachMonthOfInterval({
        start: addMonths(date, -6),
        end: addMonths(date, 6),
      });
      months.forEach((month) => {
        const timestamp = month.getTime();
        units.push({
          id: `month-${timestamp}`,
          label: format(month, 'yyyy-MM'),
          startDate: getMonthStart(month),
          endDate: getMonthEnd(month),
          isSelected: selectedRanges.includes(timestamp),
        });
      });
      break;
    }
    case 'year': {
      // 显示前后 5 年
      const years: Date[] = [];
      for (let i = -5; i <= 5; i++) {
        years.push(addYears(date, i));
      }
      years.forEach((year) => {
        const timestamp = year.getTime();
        units.push({
          id: `year-${timestamp}`,
          label: format(year, 'yyyy'),
          startDate: getYearStart(year),
          endDate: getYearEnd(year),
          isSelected: selectedRanges.includes(timestamp),
        });
      });
      break;
    }
  }

  return units;
};

// 获取多选范围的时间段
export const getSelectedRanges = (
  selectedTimestamps: number[],
  view: ViewType
): { start: number; end: number }[] => {
  if (selectedTimestamps.length === 0) {
    return [];
  }

  const ranges: { start: number; end: number }[] = [];
  const sorted = [...selectedTimestamps].sort((a, b) => a - b);

  // 根据视图类型获取时间范围
  const getRangeForTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    switch (view) {
      case 'day':
        return { start: getDayStart(date).getTime(), end: getDayEnd(date).getTime() };
      case 'week':
        return { start: getWeekStart(date).getTime(), end: getWeekEnd(date).getTime() };
      case 'month':
        return { start: getMonthStart(date).getTime(), end: getMonthEnd(date).getTime() };
      case 'year':
        return { start: getYearStart(date).getTime(), end: getYearEnd(date).getTime() };
    }
  };

  sorted.forEach((timestamp) => {
    ranges.push(getRangeForTimestamp(timestamp));
  });

  return ranges;
};

// 判断日期是否在今天
export const isToday = (date: Date | number): boolean => {
  return format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
};

// 判断日期是否在本周
export const isThisWeek = (date: Date | number): boolean => {
  const now = new Date();
  const start = getWeekStart(now);
  const end = getWeekEnd(now);
  const d = new Date(date);
  return d >= start && d <= end;
};

// 判断日期是否在本月
export const isThisMonth = (date: Date | number): boolean => {
  const now = new Date();
  return format(date, 'yyyy-MM') === format(now, 'yyyy-MM');
};

// 判断日期是否在今年
export const isThisYear = (date: Date | number): boolean => {
  const now = new Date();
  return format(date, 'yyyy') === format(now, 'yyyy');
};
