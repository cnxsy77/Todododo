# 跨日期拖拽功能实现计划

## 上下文

用户需要在多选日期的场景下，能够将任务从一个日期拖拽到另一个日期，实现跨日期移动任务。

### 当前实现状况

1. **TaskList 组件** (`src/components/TaskList/index.tsx`)
   - 当前使用分页显示，每个日期一个页面
   - 使用 `DraggableFlatList` 实现列表内拖拽排序
   - `onDragEnd` 只处理当前页的排序，不支持跨页拖拽

2. **useDrag Hook** (`src/hooks/useDrag.ts`)
   - 已有 `handleDropOnDate` 函数，但未使用
   - 已有 `moveTaskToDate` 方法在 taskStore 中

3. **任务存储** (`src/stores/taskStore.ts`)
   - `moveTaskToDate` 方法已实现，可移动任务到指定日期

### 问题

- 当前分页模式下，用户只能看到当前页面的任务，无法直接将任务拖到另一个日期
- 需要一种直观的 UI 来实现跨日期拖拽

---

## 设计方案

### 方案：并排显示所有选中日期的列式布局

#### 界面布局
```
┌─────────────────────────────────────────────────────────────────┐
│  [时间轴组件 - 可横向滚动]                                       │
├─────────────────────────────────────────────────────────────────┤
│  [已选择 3 天                                           清空]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ 12 月 25 日 ·2│  │ 12 月 26 日 ·0│  │ 12 月 27 日 ·3│            │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤            │
│  │ ☐ 任务 A    │  │ (空)        │  │ ☐ 任务 E    │            │
│  │ ☑ 任务 B    │  │             │  │ ☐ 任务 F    │            │
│  │             │  │             │  │ ☐ 任务 G    │            │
│  │             │  │             │  │             │            │
│  │  ⋮⋮拖拽     │  │  ⋮⋮拖拽     │  │  ⋮⋮拖拽     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│       ↓                  ↓                  ↓                  │
│   可拖拽到           可拖拽到           可拖拽到               │
│   其他列             其他列             其他列                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 核心功能

1. **水平滚动容器**：使用 `ScrollView` 横向展示所有选中日期的列
2. **每列独立**：每列显示一个日期的任务列表
3. **跨列拖拽**：使用 `DraggableFlatList` 的 `onDragEnd` 检测拖拽到不同列
4. **视觉反馈**：拖拽时高亮显示目标列

#### 修改的文件

| 文件 | 修改内容 |
|------|----------|
| `src/components/TaskList/index.tsx` | 重构为多列布局，支持跨列拖拽 |
| `src/screens/HomeScreen/index.tsx` | 添加 `onMoveTaskToDate` 处理函数 |
| `src/hooks/useTasks.ts` | 返回完整的 ranges 数据供 TaskList 使用 |

---

## 实现步骤

### 1. 修改 TaskList 组件结构

将分页布局改为并排多列布局：

```tsx
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  <View style={columnsContainer}>
    {sortedRanges.map((range, index) => (
      <View key={range.start} style={column}>
        <View style={columnHeader}>
          <Text>{getPageLabel(range.start)}</Text>
          <Text>{taskCount}</Text>
        </View>
        <DraggableFlatList
          data={groupedTasks.get(range.start) || []}
          onDragEnd={handleDragEnd}
          // 传递 range 信息以便跨列拖拽
        />
      </View>
    ))}
  </View>
</ScrollView>
```

### 2. 实现跨列拖拽检测

在 `onDragEnd` 中检测是否跨列拖拽：

```tsx
const handleDragEnd = ({ data: newData, from, to }) => {
  // from.index 和 to.index 分别表示拖拽前后的位置
  // 需要检测是否跨列（即从 range A 拖到 range B）

  const fromRange = sortedRanges[fromPage];
  const toRange = sortedRanges[toPage];

  if (fromRange?.start !== toRange?.start) {
    // 跨列拖拽，调用 moveTaskToDate
    handleMoveTaskToNewDate(taskId, toRange.start, toRange.end);
  } else {
    // 同列内排序
    handleReorder(taskIds);
  }
};
```

### 3. 添加 HomeScreen 处理函数

```tsx
const handleMoveTaskToDate = async (
  taskId: string,
  newStartDate: number,
  newEndDate?: number
) => {
  await moveTaskToDate(taskId, newStartDate, newEndDate);
  // 更新本地状态
};
```

---

## 验证方案

1. 选择多个日期（如 3 天）
2. 长按任务进入拖拽模式
3. 将任务拖到另一个日期列
4. 释放任务
5. 验证任务已移动到目标日期
6. 验证任务在原日期列表中消失

---

## 关键文件路径

- `src/components/TaskList/index.tsx` - 主要修改
- `src/screens/HomeScreen/index.tsx` - 添加移动任务处理
- `src/stores/taskStore.ts` - 使用已有的 `moveTaskToDate` 方法

---

## 备选方案

如果 DraggableFlatList 不支持跨列表拖拽，可以考虑：
1. 使用 `react-native-draggable-flatlist` v4+ 的 `onDragBegin` 和 `onDragEnd` 的完整事件数据
2. 或者使用自定义的拖拽实现，结合 `PanGestureHandler`
