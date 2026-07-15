// Markdown 相关工具函数

/**
 * 去除 Markdown 语法符号，返回纯文本。
 * 用于卡片单行预览等不需要格式化渲染的场景。
 */
export const stripMarkdown = (md: string): string => {
  if (!md) return '';
  return md
    // 代码块 ```lang\n...```：去掉围栏保留内容
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '$1')
    // 行内代码 `code`
    .replace(/`([^`]+)`/g, '$1')
    // 图片 ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 链接 [text](url)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // 标题 # ## ### 行首
    .replace(/^#{1,6}\s*/gm, '')
    // 粗体 **text** / __text__
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // 斜体 *text* / _text_
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // 删除线 ~~text~~
    .replace(/~~([^~]+)~~/g, '$1')
    // 引用 >
    .replace(/^>\s*/gm, '')
    // 无序列表 - * + 行首
    .replace(/^\s*[-*+]\s+/gm, '')
    // 有序列表 1. 行首
    .replace(/^\s*\d+\.\s+/gm, '')
    // 水平线 --- ***
    .replace(/^[-*]{3,}$/gm, '')
    // 压缩多余空白为单空格
    .replace(/\s+/g, ' ')
    .trim();
};
