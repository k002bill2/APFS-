/* ESLint(2026-10-14 도입). 실버그 규칙(rules-of-hooks 등)은 error, Phase 0 코드와 충돌하는 규칙은 완화.
   - no-explicit-any: off — tsconfig strict:false·Phase 3(타입화) 전이라 any 는 의도된 상태.
   - 아래 warn 목록: 도입 시점 기존 위반이 있어 error 로 두면 lint 가 처음부터 빨갛다. 기존 화면은 지시 없이
     고치지 않는 규약이라 warn 으로 가시화만 한다 — 고칠 때 해당 줄을 정리하고, 0건이 되면 error 로 올린다. */
import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default defineConfig(
  globalIgnores(['dist', 'node_modules', '.claude', '.design-sync', 'docs', 'scripts']),
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-empty': 'warn',
      'no-useless-escape': 'warn',
      'no-useless-assignment': 'warn',
      'no-control-regex': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
);
