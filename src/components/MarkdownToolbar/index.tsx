import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme, ThemeColors } from '../../theme';

interface MarkdownToolbarProps {
  value: string;
  onChange: (v: string) => void;
  // 跟踪 TextInput 当前选区（onSelectionChange 维护）
  selectionRef: React.MutableRefObject<{ start: number; end: number }>;
  // 插入后把光标移到指定位置（一次性受控 selection 应用）
  applySelection: (start: number, end: number) => void;
}

interface Btn {
  label: string;
  onPress: () => void;
}

// 轻量 Markdown 编辑工具栏：在光标处插入常用语法。
// 行首类（# -）插在当前行行首；包裹类（** * ` []）包住选区，无选中时插入占位并选中。
export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  value,
  onChange,
  selectionRef,
  applySelection,
}) => {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // 在选区两侧包裹前后缀；无选中时插入占位文字并选中占位
  const wrap = (prefix: string, suffix: string, placeholder: string) => {
    const { start, end } = selectionRef.current;
    const hasSel = end > start;
    const selected = hasSel ? value.slice(start, end) : placeholder;
    const next = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    onChange(next);
    const selStart = start + prefix.length;
    applySelection(selStart, selStart + selected.length);
  };

  // 在当前行行首插入前缀
  const linePrefix = (prefix: string) => {
    const { start } = selectionRef.current;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    const newPos = start + prefix.length;
    applySelection(newPos, newPos);
  };

  const buttons: Btn[] = [
    { label: 'H', onPress: () => linePrefix('# ') },
    { label: 'B', onPress: () => wrap('**', '**', '粗体') },
    { label: 'I', onPress: () => wrap('*', '*', '斜体') },
    { label: '• 列表', onPress: () => linePrefix('- ') },
    { label: '<> 代码', onPress: () => wrap('`', '`', '代码') },
    { label: '🔗 链接', onPress: () => wrap('[', '](https://)', '链接文字') },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {buttons.map((b) => (
        <TouchableOpacity key={b.label} style={styles.btn} onPress={b.onPress} activeOpacity={0.7}>
          <Text style={styles.btnText}>{b.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 6,
    },
    btn: {
      backgroundColor: c.surfaceSecondary,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    btnText: {
      fontSize: 13,
      color: c.textSecondary,
    },
  });
