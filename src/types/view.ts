// 视图类型
export type ViewType = 'day' | 'week' | 'month' | 'year';

// 时间范围
export interface TimeRange {
  startDate: Date;
  endDate: Date;
  unit: ViewType;
}

// 视图配置
export interface ViewState {
  currentView: ViewType;
  currentDate: number; // 时间戳
  selectedRanges: number[]; // 多选的时间单元（时间戳数组）
}

// 时间轴单元
export interface TimeAxisUnit {
  id: string;
  label: string;
  subLabel?: string;
  startDate: Date;
  endDate: Date;
  isSelected: boolean;
}
