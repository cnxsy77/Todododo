// 将 sql.js 的 wasm 文件拷贝到 expo web 静态资源目录 public/，
// 供 Web 端 SQLite 适配器运行时通过 /sql-wasm.wasm 加载。
// 由 package.json 的 postinstall 钩子触发；sql.js 未安装时静默跳过。
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const destDir = path.resolve(__dirname, '..', 'public');
const dest = path.join(destDir, 'sql-wasm.wasm');

if (!fs.existsSync(src)) {
  // sql.js 尚未安装（如部分安装），跳过
  console.log('[copy-sql-wasm] sql.js wasm 未找到，跳过');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('[copy-sql-wasm] 已拷贝 sql-wasm.wasm -> public/');
