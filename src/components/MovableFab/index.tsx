import React, { useRef, useEffect, useState } from 'react';
import {
  Text,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
  View,
  LayoutChangeEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors } from '../../theme';

const FAB_SIZE = 56;
const EDGE_MARGIN = 20;
// 位移小于该阈值视为点击，不触发拖动
const TAP_THRESHOLD = 8;
const STORAGE_KEY = 'fabPosition';

interface MovableFabProps {
  onPress: () => void;
  colors: ThemeColors;
  label?: string;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

// 计算给定边界下的默认右下角位置
const defaultPos = (b: Bounds): { x: number; y: number } => ({
  x: b.maxX,
  y: b.maxY,
});

// 全窗口尺寸作为初始 fallback（真实尺寸由 onLayout 校正）
const windowBounds = (): Bounds => {
  const { width, height } = Dimensions.get('window');
  return {
    minX: EDGE_MARGIN,
    maxX: Math.max(EDGE_MARGIN, width - FAB_SIZE - EDGE_MARGIN),
    minY: EDGE_MARGIN,
    maxY: Math.max(EDGE_MARGIN, height - FAB_SIZE - EDGE_MARGIN),
    width,
    height,
  };
};

/**
 * 可拖动的悬浮添加按钮：
 * - 拖动结束后自动吸附到最近的左/右边缘
 * - 位置持久化到 AsyncStorage，下次打开保持在原处
 * - 轻点（位移小于阈值）仍触发 onPress
 *
 * 定位上下文是父容器（Tab 内容区，不含 header/tab bar），
 * 因此边界用 onLayout 测量父容器真实尺寸，而非全窗口尺寸。
 */
export const MovableFab: React.FC<MovableFabProps> = ({
  onPress,
  colors,
  label = '+',
}) => {
  const [bounds, setBounds] = useState<Bounds>(windowBounds);
  // 初始放在窗口右下角附近，首帧即可见；onLayout 触发后会校正到真实容器右下角
  const position = useRef(new Animated.ValueXY(defaultPos(windowBounds()))).current;
  // 实时跟踪当前位置，避免依赖内部私有 API __getValue
  const currentPos = useRef(defaultPos(windowBounds()));
  const dragStart = useRef({ x: 0, y: 0 });
  const loadedRef = useRef(false);

  // 测量父容器真实尺寸，更新边界并校正按钮位置
  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const b: Bounds = {
      minX: EDGE_MARGIN,
      maxX: Math.max(EDGE_MARGIN, width - FAB_SIZE - EDGE_MARGIN),
      minY: EDGE_MARGIN,
      maxY: Math.max(EDGE_MARGIN, height - FAB_SIZE - EDGE_MARGIN),
      width,
      height,
    };
    setBounds(b);

    if (!loadedRef.current) {
      // 首次拿到真实尺寸前，先放在默认右下角保证可见
      const pos = defaultPos(b);
      currentPos.current = pos;
      position.setValue(pos);
    } else {
      // 尺寸变化（如旋转）时把按钮拉回可视范围
      const x = clamp(currentPos.current.x, b.minX, b.maxX);
      const y = clamp(currentPos.current.y, b.minY, b.maxY);
      currentPos.current = { x, y };
      position.setValue({ x, y });
    }
  };

  // 读取已保存位置
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled || !saved) return;
        const p = JSON.parse(saved);
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          const x = clamp(p.x, bounds.minX, bounds.maxX);
          const y = clamp(p.y, bounds.minY, bounds.maxY);
          currentPos.current = { x, y };
          position.setValue({ x, y });
        }
      } catch (error) {
        console.warn('Failed to load fab position:', error);
      } finally {
        if (!cancelled) loadedRef.current = true;
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [position]); // bounds 在 handleLayout 中已通过闭包使用，此处不依赖

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onPanResponderGrant: () => {
        dragStart.current = { ...currentPos.current };
        position.setOffset({ x: currentPos.current.x, y: currentPos.current.y });
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, g) => {
        position.flattenOffset();
        const currentX = clamp(dragStart.current.x + g.dx, bounds.minX, bounds.maxX);
        const currentY = clamp(dragStart.current.y + g.dy, bounds.minY, bounds.maxY);

        // 位移很小视为点击
        const tapped =
          Math.abs(g.dx) < TAP_THRESHOLD && Math.abs(g.dy) < TAP_THRESHOLD;
        if (tapped) {
          position.setValue({ x: dragStart.current.x, y: dragStart.current.y });
          onPress();
          return;
        }

        // 吸附到最近的左/右边缘
        const targetX =
          currentX + FAB_SIZE / 2 > bounds.width / 2 ? bounds.maxX : bounds.minX;
        const targetY = clamp(currentY, bounds.minY, bounds.maxY);

        currentPos.current = { x: targetX, y: targetY };
        Animated.spring(position, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          tension: 65,
          friction: 11,
        }).start();

        AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ x: targetX, y: targetY })
        ).catch((e) => console.warn('Failed to save fab position:', e));
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* 测量父容器真实尺寸 */}
      <View style={StyleSheet.absoluteFill} onLayout={handleLayout} pointerEvents="none" />
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.fab,
          position.getLayout(),
          { backgroundColor: colors.primary },
        ]}
      >
        <Text style={styles.fabText}>{label}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});
