import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { marked, type Token, type Tokens } from 'marked';
import { useTheme, ThemeColors } from '../../theme';

interface MarkdownRendererProps {
  md: string;
  style?: object;
}

// 标题字号按 # 级别递减
const headingSize = (depth: number): number => {
  switch (depth) {
    case 1: return 22;
    case 2: return 20;
    case 3: return 18;
    case 4: return 16;
    default: return 15;
  }
};

const openUrl = async (url: string) => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
  } catch {
    // 忽略无法打开的链接
  }
};

// 用 marked 解析 Markdown 为 token，递归渲染为 RN 组件。
// 纯 JS（无 native），支持主题色注入。不支持的语法走 default 纯文本回退。
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ md, style }) => {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const tokens = useMemo(() => {
    try {
      return marked.lexer(md || '');
    } catch {
      return [] as Token[];
    }
  }, [md]);

  // 递归渲染 inline token 为 Text spans（Text 可嵌套 Text 实现混合样式）
  const renderInline = (inl?: Token[], keyPrefix = ''): React.ReactNode => {
    if (!inl || inl.length === 0) return null;
    return inl.map((tok, i) => {
      const key = `${keyPrefix}${i}`;
      switch (tok.type) {
        case 'strong':
          return <Text key={key} style={styles.bold}>{renderInline((tok as Tokens.Strong).tokens, key)}</Text>;
        case 'em':
          return <Text key={key} style={styles.italic}>{renderInline((tok as Tokens.Em).tokens, key)}</Text>;
        case 'del':
          return <Text key={key} style={styles.strike}>{renderInline((tok as Tokens.Del).tokens, key)}</Text>;
        case 'codespan':
          return <Text key={key} style={styles.inlineCode}>{(tok as Tokens.Codespan).text}</Text>;
        case 'link': {
          const link = tok as Tokens.Link;
          return (
            <Text key={key} style={styles.link} onPress={() => openUrl(link.href)}>
              {renderInline(link.tokens, key)}
            </Text>
          );
        }
        case 'image':
          // 纯文本渲染不展示图片本体，显示 alt 文本
          return <Text key={key} style={styles.link}>{(tok as Tokens.Image).text || '[图片]'}</Text>;
        case 'br':
          return <Text key={key}>{'\n'}</Text>;
        case 'text':
          // text token 可能含嵌套 tokens（marked 进一步解析的结果）
          if ((tok as Tokens.Text).tokens) {
            return <Text key={key}>{renderInline((tok as Tokens.Text).tokens, key)}</Text>;
          }
          return <Text key={key}>{(tok as Tokens.Text).text}</Text>;
        default:
          return <Text key={key}>{(tok as { text?: string; raw?: string }).text || (tok as { raw?: string }).raw || ''}</Text>;
      }
    });
  };

  const renderBlock = (tok: Token, i: number): React.ReactNode => {
    switch (tok.type) {
      case 'heading': {
        const h = tok as Tokens.Heading;
        return (
          <Text key={i} style={[styles.heading, { fontSize: headingSize(h.depth) }]}>
            {renderInline(h.tokens, `${i}-`)}
          </Text>
        );
      }
      case 'paragraph': {
        const p = tok as Tokens.Paragraph;
        return <Text key={i} style={styles.paragraph}>{renderInline(p.tokens, `${i}-`)}</Text>;
      }
      case 'list': {
        const list = tok as Tokens.List;
        const start = typeof list.start === 'number' ? list.start : 1;
        return (
          <View key={i} style={styles.list}>
            {list.items.map((item, j) => (
              <View key={j} style={styles.listItem}>
                <Text style={styles.listBullet}>{list.ordered ? `${start + j}.` : '•'}</Text>
                <Text style={styles.listItemText}>{renderInline(item.tokens, `${i}-${j}-`)}</Text>
              </View>
            ))}
          </View>
        );
      }
      case 'code': {
        const c = tok as Tokens.Code;
        return (
          <View key={i} style={styles.codeBlock}>
            <Text style={styles.codeText}>{c.text}</Text>
          </View>
        );
      }
      case 'blockquote': {
        const b = tok as Tokens.Blockquote;
        return (
          <View key={i} style={styles.blockquote}>
            <Text style={styles.blockquoteText}>{renderInline(b.tokens, `${i}-`)}</Text>
          </View>
        );
      }
      case 'hr':
        return <View key={i} style={styles.hr} />;
      case 'space':
        return null;
      default:
        return <Text key={i} style={styles.paragraph}>{(tok as { text?: string; raw?: string }).text || (tok as { raw?: string }).raw || ''}</Text>;
    }
  };

  if (!md || !md.trim()) return null;

  return <View style={[styles.container, style]}>{tokens.map((tok, i) => renderBlock(tok, i))}</View>;
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {},
    heading: {
      fontWeight: '700',
      color: c.text,
      marginTop: 8,
      marginBottom: 4,
    },
    paragraph: {
      color: c.text,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 8,
    },
    bold: { fontWeight: '700' },
    italic: { fontStyle: 'italic' },
    strike: { textDecorationLine: 'line-through' },
    inlineCode: {
      fontFamily: 'monospace',
      fontSize: 13,
      backgroundColor: c.surfaceSecondary,
      color: c.primary,
      paddingHorizontal: 4,
      borderRadius: 3,
    },
    link: {
      color: c.primary,
      textDecorationLine: 'underline',
    },
    list: {
      marginBottom: 8,
      gap: 4,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    listBullet: {
      color: c.textSecondary,
      marginRight: 8,
      fontSize: 15,
      lineHeight: 22,
    },
    listItemText: {
      flex: 1,
      color: c.text,
      fontSize: 15,
      lineHeight: 22,
    },
    codeBlock: {
      backgroundColor: c.surfaceSecondary,
      borderRadius: 6,
      padding: 10,
      marginBottom: 8,
    },
    codeText: {
      fontFamily: 'monospace',
      fontSize: 13,
      color: c.text,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
      paddingLeft: 10,
      marginBottom: 8,
    },
    blockquoteText: {
      color: c.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      fontStyle: 'italic',
    },
    hr: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: 8,
    },
  });
