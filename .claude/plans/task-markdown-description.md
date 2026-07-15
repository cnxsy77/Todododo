# 任务富文本描述（Markdown）

## 目标
把任务 description 从纯文本升级为 Markdown：编辑支持常用语法，详情页与卡片格式化渲染。description 仍为 `TEXT` 字段存 markdown 字符串，**无 DB 迁移**。

## 渲染库选型（已论证）
- 不用 `react-native-markdown-display`（2023-12 停更，RN 0.85 运行时风险）。
- 用 `marked`（纯 JS parser，活跃维护，2026-07 更新），自写 token→RN 渲染器。纯 JS，**无 native 代码、无需重建 dev client**、无 peer dep 风险。备选 `markdown-it`（若 marked 在 Metro 异常）。

## 1. 依赖
- `npm install marked`（仅此一个，纯 JS）

## 2. 新增 `src/components/MarkdownRenderer/index.tsx`
- `marked.lexer(md)` 解析为 block token，遍历渲染为 RN 组件，`useMemo` 缓存。
- block：heading(字号按 # 级别)/paragraph/list(无序·/有序数字)/code(背景+mono)/blockquote(左色条)/hr(分割线)。
- inline 递归渲染（Text 嵌套 Text）：text/strong(粗)/em(斜)/codespan(mono)/link(主题色+onPress `Linking.openURL`)/br。
- `useTheme` 注入颜色与字号，对齐项目主题。
- 空字符串/纯文本安全降级（直接渲染段落）。

## 3. 新增 `src/utils/markdown.ts`
- `stripMarkdown(md: string): string`：正则去除 `#` `**` `*` `` ` `` `[]()` `>` `-` `1.` 等语法符号，返回纯文本，供卡片单行预览。

## 4. 新增 `src/components/MarkdownToolbar/index.tsx`
- 编辑工具栏：按钮 `H`(行首 `# `)、`B`(`**` 包裹)、`I`(`*` 包裹)、`•`(行首 `- `)、`<>`(`` ` ` 包裹)、`🔗`(`[文字](url)`)。
- 通过 `onSelectionChange` 维护 selectionRef，在光标处/选区插入；行首类按钮定位到当前行首插入。
- props：`value`、`onChange`、`selectionRef`。

## 5. `src/screens/TaskDetailScreen/index.tsx`
- 描述区改为「编辑 | 预览」切换（两个小 tab）：
  - 编辑态：`MarkdownToolbar` + 现有 `Input multiline`（输入原始 markdown）。
  - 预览态：`MarkdownRenderer` 渲染（空内容时显示占位提示）。
- 默认编辑态（保持 existingTask 可直接编辑的当前行为）。
- 维护 `descSelectionRef` 传给 toolbar 与 Input。

## 6. `src/components/TaskItem/index.tsx`
- 卡片描述预览改用 `stripMarkdown(task.description)`，仍 `numberOfLines={1}`，保持卡片整洁（卡片不完整渲染 markdown，仅纯文本首行预览）。

## 7. 导出/导入
- description 仍为字符串，`export.ts`/`import.ts` 无需改动。

## 边界
- 纯文本旧数据：无 markdown 语法的描述正常渲染为段落。
- 链接 onPress：用 `expo-linking`（已有依赖）或 `Linking` 打开。
- 不支持的语法：MarkdownRenderer default 分支按纯文本回退。
- Web：marked 纯 JS，Web 端同样工作。

## 决策点（推荐，可在批准时调整）
1. 编辑/预览切换：默认编辑态（推荐）。
2. 工具栏：包含（手机输入语法不便，工具栏提升实用性）。
3. 卡片预览：stripMarkdown 纯文本单行（推荐，卡片不渲染完整 markdown）。

## 验证
- `npm run type-check`（含 marked 类型校验）。
- 真机：编辑 `# 标题 **粗** - 列表 [链接](url) \`代码\``、切预览渲染、卡片预览、导出/导入往返。

## 涉及文件
新增：`src/components/MarkdownRenderer/index.tsx`、`src/components/MarkdownToolbar/index.tsx`、`src/utils/markdown.ts`
修改：`package.json`、`src/screens/TaskDetailScreen/index.tsx`、`src/components/TaskItem/index.tsx`
