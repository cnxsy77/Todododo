import { uuid } from '../../src/utils/uuid';

describe('uuid', () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('符合 UUID v4 格式', () => {
    for (let i = 0; i < 100; i++) {
      expect(uuid()).toMatch(UUID_RE);
    }
  });

  it('版本位为 4（第 3 段首位）', () => {
    for (let i = 0; i < 50; i++) {
      expect(uuid()[14]).toBe('4');
    }
  });

  it('变体位为 8/9/a/b（第 4 段首位）', () => {
    for (let i = 0; i < 50; i++) {
      expect(uuid()[19]).toMatch(/^[89ab]$/);
    }
  });

  it('生成 1000 次均唯一', () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      set.add(uuid());
    }
    expect(set.size).toBe(1000);
  });

  it('长度固定为 36（含 4 个连字符）', () => {
    expect(uuid()).toHaveLength(36);
    expect(uuid().split('-')).toHaveLength(5);
  });

  it('默认导出与具名导出一致', () => {
    const { default: defaultExport } = require('../../src/utils/uuid');
    expect(defaultExport).toBe(uuid);
  });
});
