import React, { forwardRef, useMemo } from 'react';
import OriginalDraggableFlatList, {
  DraggableFlatListProps,
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';

// 创建一个代理组件，尝试减少 findDOMNode 警告
const DraggableFlatListWrapper = forwardRef(function DraggableFlatListWrapper<T>(
  props: DraggableFlatListProps<T>,
  ref: React.ForwardedRef<any>
) {
  // 尝试通过 memoization 减少重新渲染
  const memoizedProps = useMemo(() => {
    const { CellRendererComponent, ...restProps } = props;

    // 如果有自定义的 CellRendererComponent，使用它
    // 否则，保持原样
    return {
      ...restProps,
      // 这里可以添加一些自定义属性来尝试解决警告
    };
  }, [props]);

  return <OriginalDraggableFlatList ref={ref} {...memoizedProps} />;
});

// 尝试禁用 React 的严格模式检查（仅用于开发环境）
const DraggableFlatListWithDevCheck = forwardRef(function DraggableFlatListWithDevCheck<T>(
  props: DraggableFlatListProps<T>,
  ref: React.ForwardedRef<any>
) {
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

  if (isDev) {
    // 在开发环境中，我们可以尝试一些变通方法
    // 这里我们可以尝试使用一个自定义的 CellRendererComponent
    const enhancedProps = {
      ...props,
      // 尝试设置自定义的 CellRendererComponent
      CellRendererComponent: props.CellRendererComponent || ((props: any) => {
        const { children, ...rest } = props;
        // 移除可能包含的 ref 属性
        const { ref, ...restWithoutRef } = rest;
        // 包装子元素，避免 findDOMNode 调用
        // 使用 React.Children.only 确保只有一个子元素
        const child = React.Children.only(children);
        // 克隆元素但不传递 ref
        return React.cloneElement(child, {
          ...restWithoutRef,
        });
      })
    };

    return <OriginalDraggableFlatList ref={ref} {...enhancedProps} />;
  }

  return <OriginalDraggableFlatList ref={ref} {...props} />;
});

// 导出两个版本供测试
export const DraggableFlatList = DraggableFlatListWithDevCheck;
export { ScaleDecorator };
export type { DraggableFlatListProps, RenderItemParams } from 'react-native-draggable-flatlist';