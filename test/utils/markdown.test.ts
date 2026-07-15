import { stripMarkdown } from '../../src/utils/markdown';

describe('stripMarkdown', () => {
  it('空字符串直接返回空', () => {
    expect(stripMarkdown('')).toBe('');
  });

  it('纯文本原样返回', () => {
    expect(stripMarkdown('普通文本')).toBe('普通文本');
  });

  it('去除标题标记', () => {
    expect(stripMarkdown('# 一级标题')).toBe('一级标题');
    expect(stripMarkdown('## 二级标题')).toBe('二级标题');
    expect(stripMarkdown('###### 六级标题')).toBe('六级标题');
  });

  it('去除粗体标记', () => {
    expect(stripMarkdown('**粗体**')).toBe('粗体');
    expect(stripMarkdown('__粗体__')).toBe('粗体');
  });

  it('去除斜体标记', () => {
    expect(stripMarkdown('*斜体*')).toBe('斜体');
    expect(stripMarkdown('_斜体_')).toBe('斜体');
  });

  it('去除删除线标记', () => {
    expect(stripMarkdown('~~删除线~~')).toBe('删除线');
  });

  it('去除行内代码标记', () => {
    expect(stripMarkdown('`code`')).toBe('code');
    expect(stripMarkdown('含 `代码` 文本')).toBe('含 代码 文本');
  });

  it('去除代码块围栏保留内容', () => {
    expect(stripMarkdown('```\nconsole.log(1)\n```')).toBe('console.log(1)');
    // 带语言标识
    expect(stripMarkdown('```js\nfoo()\n```')).toBe('foo()');
  });

  it('去除链接保留文本', () => {
    expect(stripMarkdown('[链接](http://example.com)')).toBe('链接');
  });

  it('去除图片保留 alt 文本', () => {
    expect(stripMarkdown('![图片](http://example.com/x.png)')).toBe('图片');
    // 无 alt 的图片返回空
    expect(stripMarkdown('![](http://example.com/x.png)')).toBe('');
  });

  it('去除无序列表标记', () => {
    expect(stripMarkdown('- 项')).toBe('项');
    expect(stripMarkdown('* 项')).toBe('项');
    expect(stripMarkdown('+ 项')).toBe('项');
  });

  it('去除有序列表标记', () => {
    expect(stripMarkdown('1. 第一')).toBe('第一');
    expect(stripMarkdown('12. 第十二')).toBe('第十二');
  });

  it('去除引用标记', () => {
    expect(stripMarkdown('> 引用内容')).toBe('引用内容');
  });

  it('去除水平线', () => {
    expect(stripMarkdown('---')).toBe('');
    expect(stripMarkdown('***')).toBe('');
  });

  it('多行混合并压缩空白', () => {
    const md = '# 标题\n- 项一\n- 项二';
    expect(stripMarkdown(md)).toBe('标题 项一 项二');
  });

  it('复杂混合语法', () => {
    const md = '# **标题** [链接](http://x) 和 `代码`';
    expect(stripMarkdown(md)).toBe('标题 链接 和 代码');
  });
});
