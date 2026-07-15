import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Input, Button } from '../../components/common';
import { DatePicker } from '../../components/DatePicker';
import { ReminderPicker } from '../../components/ReminderPicker';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import { MarkdownToolbar } from '../../components/MarkdownToolbar';
import { ensureNotificationPermissions } from '../../services/notificationService';
import { useTaskStore } from '../../stores/taskStore';
import { useTheme, ThemeColors } from '../../theme';
import type { PlanType } from '../../types';

export const TaskDetailScreen: React.FC = () => {
  const { taskId, parentTaskId } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { addTask, updateTask, deleteTask, toggleTaskCompleted, tasks } = useTaskStore();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const existingTask = taskId ? tasks.find((t) => t.id === taskId) : null;
  // 父任务：创建子任务时由参数指定，或当前任务是子任务时取其父
  const parentTaskIdResolved = (parentTaskId as string) || existingTask?.parentTaskId;
  const parentTask = parentTaskIdResolved
    ? tasks.find((t) => t.id === parentTaskIdResolved)
    : undefined;
  const isChild = !!parentTask;
  // 当前任务（父）的子任务
  const children = existingTask
    ? tasks
        .filter((t) => t.parentTaskId === existingTask.id)
        .sort((a, b) => a.order - b.order)
    : [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [planType, setPlanType] = useState<PlanType>('daily');
  const [startDate, setStartDate] = useState(Date.now());
  const [endDate, setEndDate] = useState<number | undefined>(undefined);
  const [reminderAt, setReminderAt] = useState<number | undefined>(undefined);
  // 描述编辑/预览切换 + 光标位置跟踪（工具栏插入语法用）
  const [descMode, setDescMode] = useState<'edit' | 'preview'>('edit');
  const [descSelection, setDescSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const descSelectionRef = useRef({ start: 0, end: 0 });

  // 工具栏插入后把光标移到指定位置：一次性受控 selection，下一 tick 清空避免干扰输入
  const applySelection = (start: number, end: number) => {
    setDescSelection({ start, end });
    setTimeout(() => setDescSelection(undefined), 0);
  };

  useEffect(() => {
    if (existingTask) {
      setTitle(existingTask.title);
      setDescription(existingTask.description || '');
      setPlanType(existingTask.planType);
      setStartDate(existingTask.startDate);
      setEndDate(existingTask.endDate);
      setReminderAt(existingTask.reminderAt);
    } else if (parentTask) {
      // 新建子任务：继承父的 planType/startDate/endDate
      setPlanType(parentTask.planType);
      setStartDate(parentTask.startDate);
      setEndDate(parentTask.endDate);
      // 子任务提醒独立设置，不继承父
      setReminderAt(undefined);
    } else {
      // 新建独立任务：默认无结束日期
      setEndDate(undefined);
      setReminderAt(undefined);
    }
  }, [existingTask, parentTask]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入任务标题');
      return;
    }

    if (endDate !== undefined && endDate < startDate) {
      Alert.alert('提示', '结束日期不能早于开始日期');
      return;
    }

    // 设了未来提醒时请求通知权限（拒绝则提示，但仍保存）
    if (reminderAt && reminderAt > Date.now()) {
      const granted = await ensureNotificationPermissions();
      if (!granted) {
        Alert.alert('提示', '未开启通知权限，提醒将无法发送。请在系统设置中开启通知。');
      }
    }

    try {
      if (existingTask) {
        await updateTask(existingTask.id, {
          title,
          description: description || undefined,
          planType,
          startDate,
          // null 表示清除结束日期（updateTask 据此写 NULL）；undefined 才是"不更新"
          endDate: endDate ?? null,
          reminderAt: reminderAt ?? null,
        });
      } else if (parentTask) {
        // 创建子任务：planType/startDate/endDate 由 createTask 强制继承父值，这里仍传以保持一致
        await addTask({
          title,
          description: description || undefined,
          planType: parentTask.planType,
          startDate: parentTask.startDate,
          endDate: parentTask.endDate,
          reminderAt,
          parentTaskId: parentTask.id,
        });
      } else {
        await addTask({
          title,
          description: description || undefined,
          planType,
          startDate,
          endDate,
          reminderAt,
        });
      }
      router.back();
    } catch (error) {
      console.error('[TaskDetail] 保存失败:', error);
      Alert.alert('错误', (error as Error).message || '保存失败');
    }
  };

  const handleDelete = async () => {
    if (!existingTask) return;

    const hint =
      children.length > 0 ? `\n\n将同时删除 ${children.length} 个子任务。` : '';
    Alert.alert('确认删除', `确定要删除这个任务吗？${hint}`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(existingTask.id);
            router.back();
          } catch (error) {
            Alert.alert('错误', '删除失败');
          }
        },
      },
    ]);
  };

  const handleAddSubTask = () => {
    router.push({
      pathname: '/task-detail',
      params: { createNew: 'true', parentTaskId: existingTask!.id },
    });
  };

  const handleToggleChild = (id: string) => {
    toggleTaskCompleted(id);
  };

  const handlePressChild = (task: { id: string }) => {
    router.push({ pathname: '/task-detail', params: { taskId: task.id } });
  };

  // 点击"父任务"链接：优先回到栈中已有的父任务屏（goBack，零新增栈项），
  // 避免连续 1→1.1→父→1.2→父 时 replace 累积出多个父任务条目导致后退多次。
  // 仅当栈中上一屏不是该父任务时（如从首页列表直接进入子任务），才 replace 兜底。
  const handleParentLinkPress = () => {
    if (!parentTask) return;
    try {
      const state = navigation.getState();
      const routes = state?.routes ?? [];
      if (routes.length >= 2) {
        const prev = routes[routes.length - 2];
        const prevTaskId = (prev?.params as { taskId?: unknown } | undefined)?.taskId;
        if (
          prev?.name === 'task-detail' &&
          prevTaskId != null &&
          String(prevTaskId) === parentTask.id
        ) {
          // 上一屏正是父任务，直接返回揭示它
          navigation.goBack();
          return;
        }
      }
    } catch (e) {
      // 读取栈状态失败，走 replace 兜底
    }
    router.replace({
      pathname: '/task-detail',
      params: { taskId: parentTask.id },
    });
  };

  const planTypes: { label: string; value: PlanType }[] = [
    { label: '日计划', value: 'daily' },
    { label: '周计划', value: 'weekly' },
    { label: '月计划', value: 'monthly' },
    { label: '年计划', value: 'yearly' },
  ];

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {/* 父任务链接（当前是子任务时显示） */}
        {isChild && parentTask && (
          <TouchableOpacity
            style={styles.parentLink}
            onPress={handleParentLinkPress}
            activeOpacity={0.7}
          >
            <Text style={styles.parentLinkLabel}>父任务</Text>
            <Text style={styles.parentLinkTitle} numberOfLines={1}>
              {parentTask.title} ›
            </Text>
          </TouchableOpacity>
        )}

        {/* 标题 */}
        <Input
          label="任务标题"
          placeholder="请输入任务标题"
          value={title}
          onChangeText={setTitle}
          autoFocus={!existingTask}
        />

        {/* 描述（支持 Markdown） */}
        <View style={styles.section}>
          <View style={styles.descHeader}>
            <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>描述（可选）</Text>
            <View style={styles.descTabs}>
              <TouchableOpacity
                style={[styles.descTab, descMode === 'edit' && styles.descTabActive]}
                onPress={() => setDescMode('edit')}
                activeOpacity={0.7}
              >
                <Text style={[styles.descTabText, descMode === 'edit' && styles.descTabTextActive]}>编辑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.descTab, descMode === 'preview' && styles.descTabActive]}
                onPress={() => setDescMode('preview')}
                activeOpacity={0.7}
              >
                <Text style={[styles.descTabText, descMode === 'preview' && styles.descTabTextActive]}>预览</Text>
              </TouchableOpacity>
            </View>
          </View>
          {descMode === 'edit' ? (
            <>
              <MarkdownToolbar
                value={description}
                onChange={setDescription}
                selectionRef={descSelectionRef}
                applySelection={applySelection}
              />
              <Input
                placeholder="支持 Markdown：# 标题 **粗体** - 列表"
                value={description}
                onChangeText={setDescription}
                onSelectionChange={(e) => {
                  descSelectionRef.current = e.nativeEvent.selection;
                }}
                selection={descSelection}
                multiline
                numberOfLines={4}
                style={styles.textArea}
              />
            </>
          ) : (
            <View style={styles.previewWrap}>
              {description.trim() ? (
                <MarkdownRenderer md={description} />
              ) : (
                <Text style={styles.previewEmpty}>暂无描述内容</Text>
              )}
            </View>
          )}
        </View>

        {/* 计划类型 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            计划类型{isChild ? '（继承自父任务）' : ''}
          </Text>
          <View style={styles.planTypeContainer}>
            {planTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.planTypeButton,
                  planType === type.value && styles.planTypeButtonActive,
                ]}
                onPress={() => !isChild && setPlanType(type.value)}
                disabled={isChild}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.planTypeButtonText,
                    planType === type.value && styles.planTypeButtonTextActive,
                    isChild && styles.planTypeButtonTextDisabled,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 开始日期 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            开始日期{isChild ? '（继承自父任务）' : ''}
          </Text>
          {isChild ? (
            <View style={styles.readonlyDate}>
              <Text style={styles.readonlyDateText}>
                {new Date(startDate).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </Text>
            </View>
          ) : (
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              label="选择开始日期"
            />
          )}
        </View>

        {/* 结束日期（可选，子任务继承父任务） */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            结束日期（可选）{isChild ? '（继承自父任务）' : ''}
          </Text>
          {isChild ? (
            <View style={styles.readonlyDate}>
              <Text style={styles.readonlyDateText}>
                {endDate
                  ? new Date(endDate).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short',
                    })
                  : '未设置'}
              </Text>
            </View>
          ) : (
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              onClear={() => setEndDate(undefined)}
              label="选择结束日期"
              placeholder="未设置（单日任务可不填）"
            />
          )}
        </View>

        {/* 提醒（可选，子任务可独立设置） */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>提醒（可选）</Text>
          <ReminderPicker
            value={reminderAt}
            onChange={setReminderAt}
            onClear={() => setReminderAt(undefined)}
          />
        </View>

        {/* 子任务列表（当前任务是父任务时显示） */}
        {existingTask && !isChild && (
          <View style={styles.section}>
            <View style={styles.subTasksHeader}>
              <Text style={styles.sectionLabel}>子任务（{children.length}）</Text>
              <TouchableOpacity onPress={handleAddSubTask} activeOpacity={0.7}>
                <Text style={styles.addSubTaskButton}>+ 添加子任务</Text>
              </TouchableOpacity>
            </View>

            {children.length === 0 ? (
              <Text style={styles.subTasksEmpty}>暂无子任务</Text>
            ) : (
              <View style={styles.subTasksList}>
                {children.map((child) => (
                  <View key={child.id} style={styles.subTaskRow}>
                    <TouchableOpacity
                      style={[
                        styles.subCheckbox,
                        child.isCompleted && styles.subCheckboxChecked,
                      ]}
                      onPress={() => handleToggleChild(child.id)}
                      activeOpacity={0.7}
                    >
                      {child.isCompleted && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.subTaskContent}
                      onPress={() => handlePressChild(child)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.subTaskTitle,
                          child.isCompleted && styles.subTaskTitleCompleted,
                        ]}
                        numberOfLines={1}
                      >
                        {child.title}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 操作按钮 */}
        <View style={styles.actions}>
          <Button title="保存" onPress={handleSave} variant="primary" />
          {existingTask && (
            <Button title="删除" onPress={handleDelete} variant="secondary" />
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: 16,
    },
    parentLink: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      marginBottom: 16,
    },
    parentLinkLabel: {
      fontSize: 12,
      color: c.primary,
      marginRight: 8,
    },
    parentLinkTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: c.primary,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    descHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    descTabs: {
      flexDirection: 'row',
      gap: 6,
    },
    descTab: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: c.surfaceSecondary,
    },
    descTabActive: {
      backgroundColor: c.primary,
    },
    descTabText: {
      fontSize: 13,
      color: c.textSecondary,
    },
    descTabTextActive: {
      color: '#FFFFFF',
      fontWeight: '500',
    },
    previewWrap: {
      minHeight: 100,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      padding: 16,
    },
    previewEmpty: {
      fontSize: 14,
      color: c.textTertiary,
    },
    section: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: c.text,
      marginBottom: 12,
    },
    planTypeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    planTypeButton: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    planTypeButtonActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    planTypeButtonText: {
      fontSize: 14,
      color: c.textSecondary,
    },
    planTypeButtonTextActive: {
      color: '#FFFFFF',
    },
    planTypeButtonTextDisabled: {
      opacity: 0.6,
    },
    readonlyDate: {
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    readonlyDateText: {
      fontSize: 16,
      color: c.textSecondary,
    },
    subTasksHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    addSubTaskButton: {
      fontSize: 14,
      fontWeight: '600',
      color: c.primary,
    },
    subTasksEmpty: {
      fontSize: 14,
      color: c.textTertiary,
      paddingVertical: 8,
    },
    subTasksList: {
      backgroundColor: c.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    subTaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.hairline,
    },
    subCheckbox: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    subCheckboxChecked: {
      backgroundColor: c.primary,
    },
    checkmark: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    subTaskContent: {
      flex: 1,
    },
    subTaskTitle: {
      fontSize: 15,
      color: c.text,
    },
    subTaskTitleCompleted: {
      textDecorationLine: 'line-through',
      color: c.textTertiary,
    },
    actions: {
      gap: 12,
      marginTop: 24,
    },
  });
