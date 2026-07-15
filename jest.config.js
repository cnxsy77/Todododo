module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/test/**/*.test.ts', '**/test/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  // marked / date-fns 等含 ESM 的包需经 babel 转换
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|marked|date-fns)',
  ],
};
