const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname, {
  // 启用自定义请求解析
  unstable_allowRequireContext: true,
});

// 添加别名配置
config.resolver.extraNodeModules = {
  'expo-sqlite': path.resolve(__dirname, 'src/database/expo-sqlite.mock.js'),
};

// 修复 expo-sqlite 的 Web 端兼容性问题
// 在 Web 端使用 mock 模块代替原生模块
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // 处理 expo-sqlite 的 Web 端导入
  if (moduleName === 'expo-sqlite' && platform === 'web') {
    return {
      filePath: path.resolve(__dirname, 'src/database/expo-sqlite.mock.js'),
    };
  }

  // 处理 @expo/websql 的导入
  if (moduleName === '@expo/websql/custom' && platform === 'web') {
    return {
      filePath: require.resolve('@expo/websql/custom/index.js'),
    };
  }

  // 处理 expo-sqlite 子模块的导入
  if (moduleName.startsWith('expo-sqlite/') && platform === 'web') {
    return {
      filePath: path.resolve(__dirname, 'src/database/expo-sqlite.mock.js'),
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

// 在开发环境中禁用某些警告
if (process.env.NODE_ENV === 'development') {
  // 设置环境变量来禁用 React Native 的某些警告
  process.env.REACT_NATIVE_DISABLE_WARNINGS = '1';

  // 或者尝试禁用特定的警告类别
  process.env.DISABLE_REACT_NATIVE_DEPRECATED_WARNINGS = '1';
}

module.exports = config;
