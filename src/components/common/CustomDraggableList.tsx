import React, { useState, useCallback, useRef, forwardRef } from 'react';
import {
  FlatList,
  FlatListProps,
  View,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';

interface DraggableItemProps {
  item: any;
  index: number;
  drag: () => void;
  isActive: boolean;
  renderItem: (params: {
    item: any;
    drag: () => void;
    isActive: boolean;
  }) => React.ReactElement;
}

const DraggableItem: React.FC<DraggableItemProps> = ({
  item,
  index,
  drag,
  isActive,
  renderItem,
}) => {
  const [itemHeight, setItemHeight] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setItemHeight(height);
  }, []);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      drag();
    })
    .onUpdate((event) => {
      translateY.setValue(event.translationY);
    })
    .onEnd(() => {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    });

  const itemStyle = {
    transform: [{ translateY: isActive ? translateY : 0 }],
    zIndex: isActive ? 999 : 1,
    elevation: isActive ? 999 : 1,
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[styles.draggableItem, itemStyle]}
        onLayout={onLayout}
      >
        {renderItem({ item, drag, isActive })}
      </Animated.View>
    </GestureDetector>
  );
};

interface DraggableFlatListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  data: T[];
  renderItem: (params: {
    item: T;
    drag: () => void;
    isActive: boolean;
  }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  onDragEnd?: (params: { data: T[]; from: number; to: number }) => void;
}

function DraggableFlatListInner<T>(
  props: DraggableFlatListProps<T>,
  ref: React.ForwardedRef<FlatList<T>>
) {
  const {
    data,
    renderItem,
    keyExtractor,
    onDragEnd,
    ...flatListProps
  } = props;

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [localData, setLocalData] = useState(data);

  const handleDragStart = useCallback((index: number) => {
    setActiveIndex(index);
    setDraggingIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (draggingIndex !== null && activeIndex !== null && draggingIndex !== activeIndex) {
      const newData = [...localData];
      const [draggedItem] = newData.splice(draggingIndex, 1);
      newData.splice(activeIndex, 0, draggedItem);

      setLocalData(newData);

      if (onDragEnd) {
        onDragEnd({
          data: newData,
          from: draggingIndex,
          to: activeIndex,
        });
      }
    }

    setActiveIndex(null);
    setDraggingIndex(null);
  }, [draggingIndex, activeIndex, localData, onDragEnd]);

  const renderDraggableItem = useCallback(({ item, index }: { item: T; index: number }) => {
    const drag = () => handleDragStart(index);
    const isActive = index === activeIndex;

    return (
      <DraggableItem
        item={item}
        index={index}
        drag={drag}
        isActive={isActive}
        renderItem={renderItem}
      />
    );
  }, [activeIndex, handleDragStart, renderItem]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <FlatList
        ref={ref}
        data={localData}
        renderItem={renderDraggableItem}
        keyExtractor={keyExtractor}
        onLayout={() => {
          if (activeIndex !== null && draggingIndex !== null) {
            handleDragEnd();
          }
        }}
        {...flatListProps}
      />
    </GestureHandlerRootView>
  );
}

const DraggableFlatListComponent = forwardRef(DraggableFlatListInner) as <T>(
  props: DraggableFlatListProps<T> & { ref?: React.ForwardedRef<FlatList<T>> }
) => React.ReactElement;

(DraggableFlatListComponent as any).displayName = 'DraggableFlatList';

const DraggableFlatList = DraggableFlatListComponent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  draggableItem: {
    width: '100%',
  },
});

export { DraggableFlatList };
export type { DraggableFlatListProps };