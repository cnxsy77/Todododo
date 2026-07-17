const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname, {
  // 启用自定义请求解析
  unstable_allowRequireContext: true,
});

// Web 端用 sql.js 适配器替代 expo-sqlite（native 仍走真实 node_modules/expo-sqlite）。
// 适配器实现见 src/database/webSqlite.ts：真实 SQLite 语义 + IndexedDB 持久化，
// 替代原“返回空”的 Web 降级实现。
const WEB_SQLITE = path.resolve(__dirname, 'src/database/webSqlite.ts');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Web 端 expo-sqlite 及其子模块统一指向 webSqlite 适配器
  if (
    platform === 'web' &&
    (moduleName === 'expo-sqlite' || moduleName.startsWith('expo-sqlite/'))
  ) {
    return {
      type: 'sourceFile',
      filePath: WEB_SQLITE,
    };
  }

  // 处理 @expo/websql 的导入
  if (moduleName === '@expo/websql/custom' && platform === 'web') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('@expo/websql/custom/index.js'),
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
