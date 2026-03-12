import { create } from 'zustand';
import type { ViewType, ViewState } from '../types';

interface ViewAction {
  setView: (view: ViewType) => void;
  setCurrentDate: (date: Date | number) => void;
  toggleRangeSelection: (timestamp: number) => void;
  clearRangeSelection: () => void;
  setRangeSelection: (timestamps: number[]) => void;
  next: () => void;
  previous: () => void;
}

export const useViewStore = create<ViewState & ViewAction>((set, get) => ({
  currentView: 'day',
  currentDate: Date.now(),
  selectedRanges: [],

  setView: (view: ViewType) => {
    set({ currentView: view });
  },

  setCurrentDate: (date: Date | number) => {
    const timestamp = date instanceof Date ? date.getTime() : date;
    set({ currentDate: timestamp });
  },

  toggleRangeSelection: (timestamp: number) => {
    const current = get().selectedRanges;
    const isSelected = current.includes(timestamp);

    if (isSelected) {
      set({ selectedRanges: current.filter((t) => t !== timestamp) });
    } else {
      set({ selectedRanges: [...current, timestamp].sort((a, b) => a - b) });
    }
  },

  clearRangeSelection: () => {
    set({ selectedRanges: [] });
  },

  setRangeSelection: (timestamps: number[]) => {
    set({ selectedRanges: timestamps });
  },

  next: () => {
    const { currentView, currentDate } = get();
    const date = new Date(currentDate);

    switch (currentView) {
      case 'day':
        date.setDate(date.getDate() + 1);
        break;
      case 'week':
        date.setDate(date.getDate() + 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }

    set({ currentDate: date.getTime() });
  },

  previous: () => {
    const { currentView, currentDate } = get();
    const date = new Date(currentDate);

    switch (currentView) {
      case 'day':
        date.setDate(date.getDate() - 1);
        break;
      case 'week':
        date.setDate(date.getDate() - 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() - 1);
        break;
    }

    set({ currentDate: date.getTime() });
  },
}));
