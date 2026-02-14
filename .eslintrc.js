// ESLint配置：基于 Expo 官方的 universe 配置 + TypeScript 支持
// 目标：提供统一的代码风格检查，与 Prettier 配合避免冲突
module.exports = {
  root: true,
  extends: ['universe/native', 'universe/shared/typescript', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    // 可在此根据团队习惯扩展规则
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  ignorePatterns: ['node_modules/', 'dist/'],
};
