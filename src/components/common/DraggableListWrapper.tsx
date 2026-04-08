import React, { forwardRef } from 'react';
import OriginalDraggableFlatList, {
  DraggableFlatListProps,
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';

// 创建一个包装组件来避免 findDOMNode 警告
const DraggableFlatListWithRef = forwardRef(function DraggableFlatListWithRef<T>(
  props: DraggableFlatListProps<T>,
  ref: React.ForwardedRef<any>
) {
  return <OriginalDraggableFlatList ref={ref} {...props} />;
});

// 导出重命名的组件
export const DraggableFlatList = DraggableFlatListWithRef;
export { ScaleDecorator, RenderItemParams };
export type { DraggableFlatListProps } from 'react-native-draggable-flatlist';