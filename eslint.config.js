const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

const files = ['**/*.{js,jsx,ts,tsx}'];
const ignores = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.expo/**',
  '**/.expo-shared/**',
  '**/android/**',
  '**/ios/**',
  '**/eslint.config.js',
];

module.exports = [
  { ignores },
  {
    files,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-console': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];
