// 跨平台的 UUID v4 生成工具
//
// 背景：React Native 的 Hermes 引擎没有全局 `crypto` 对象，直接调用
// `crypto.randomUUID()` 会抛 `ReferenceError: Property 'crypto' doesn't exist`。
// 本项目用 UUID 作为本地 SQLite 表的主键，无需密码学强度的随机源，
// 因此这里用一个不依赖原生模块的纯 JS 实现，同时兼容 Web 端。
//
// 若未来需要密码学安全的随机数（如 token），再引入
// `react-native-get-random-values` + `uuid` 并重新编译原生工程。

const toHex = (n: number): string => n.toString(16).padStart(2, '0');

/**
 * 生成 UUID v4 字符串（不依赖原生 crypto）。
 * 随机性来自 Math.random，作为本地数据库主键足够。
 */
export const uuid = (): string => {
  // 生成 16 字节随机数，拼成 32 位十六进制
  const bytes = new Array<number>(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  // RFC 4122 v4：第 7 字节高 4 位为 0100，第 9 字节高 2 位为 10
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.map(toHex).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export default uuid;
