import { useMemo } from 'react';
import { useViewStore } from '../stores/viewStore';
import type { ViewType } from '../types';
import { getTimeAxisUnits, getSelectedRanges } from '../utils/date';

// 视图相关 Hooks
export const useView = () => {
  const {
    currentView,
    currentDate,
    selectedRanges,
    setView,
    setCurrentDate,
    toggleRangeSelection,
    clearRangeSelection,
    setRangeSelection,
    next,
    previous,
  } = useViewStore();

  // 获取时间轴单元 - 使用 useMemo 避免每次渲染都创建新对象
  const timeAxisUnits = useMemo(
    () => getTimeAxisUnits(currentDate, currentView, selectedRanges),
    [currentDate, currentView, selectedRanges]
  );

  // 获取选中范围的时间段 - 使用 useMemo 避免每次渲染都创建新数组
  const selectedTimeRanges = useMemo(
    () => getSelectedRanges(selectedRanges, currentView),
    [selectedRanges, currentView]
  );

  return {
    currentView,
    currentDate,
    selectedRanges,
    timeAxisUnits,
    selectedTimeRanges,
    setView,
    setCurrentDate,
    toggleRangeSelection,
    clearRangeSelection,
    setRangeSelection,
    next,
    previous,
  };
};

// 视图切换 Hook
export const useViewSwitcher = () => {
  const { currentView, setView } = useViewStore();

  const views: ViewType[] = ['day', 'week', 'month', 'year'];

  const switchToView = (view: ViewType) => {
    setView(view);
  };

  const nextView = () => {
    const currentIndex = views.indexOf(currentView);
    const nextIndex = (currentIndex + 1) % views.length;
    setView(views[nextIndex]);
  };

  const previousView = () => {
    const currentIndex = views.indexOf(currentView);
    const previousIndex = (currentIndex - 1 + views.length) % views.length;
    setView(views[previousIndex]);
  };

  return {
    currentView,
    views,
    switchToView,
    nextView,
    previousView,
  };
};
