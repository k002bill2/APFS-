/* ESLint(2026-10-14 도입). 기본 = js/ts recommended + react-hooks recommended, 위반 0건 상태로 전부 error.
   - no-explicit-any: off — tsconfig strict:false·Phase 3(타입화) 전이라 any 는 의도된 상태.
   - React Compiler 전용 규칙 4종: off — 이 프로젝트는 Compiler 를 쓰지 않는다. 걸리는 곳 다수가 의도된 패턴
     (렌더 중 ref 읽기로 지연 언마운트하는 dialog-exit 등)이라 리팩터링 이득 없이 회귀 위험만 크다.
     Compiler 를 도입할 때 다시 켠다.
   - no-unused-vars: `_` 접두·rest 형제(`const { id: _id, ...rest } = r`)는 의도된 버림으로 본다. */
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
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
);
