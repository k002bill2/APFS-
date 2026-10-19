/* ESLint(2026-10-14 도입). 기본 = js/ts recommended + react-hooks recommended + jsx-a11y recommended, 위반 0건 상태로 전부 error.
   - no-explicit-any: off — tsconfig strict:false·Phase 3(타입화) 전이라 any 는 의도된 상태.
   - React Compiler 전용 규칙 4종: off — 이 프로젝트는 Compiler 를 쓰지 않는다. 걸리는 곳 다수가 의도된 패턴
     (렌더 중 ref 읽기로 지연 언마운트하는 dialog-exit 등)이라 리팩터링 이득 없이 회귀 위험만 크다.
     Compiler 를 도입할 때 다시 켠다.
   - no-unused-vars: `_` 접두·rest 형제(`const { id: _id, ...rest } = r`)는 의도된 버림으로 본다.
   - eqeqeq smart: `x == null`(null·undefined 동시 판정) 관용구만 허용, 나머지 `==` 금지.
   - jsx-a11y(2026-10-15): 정적 a11y 게이트. 동작 수준(대비·초점 이동·라이브리전)은 web-a11y 스킬이 담당.
     peer 가 eslint ^9 까지라 package.json overrides 로 eslint 10 에 묶었다.
     · no-autofocus: off — 전부 사용자가 연 팝오버·다이얼로그 안의 첫 입력/안전 버튼(취소)이라
       초점 이동이 오히려 APG 요구사항(날짜 선택 다이얼로그 등). 페이지 진입 autoFocus 는 쓰지 않는다.
     · label-has-associated-control: SelectBox 는 내부에 네이티브 <select> 를 렌더 → 컨트롤로 인정.
     · no-noninteractive-element-to-interactive-role: 에디터 표 편집 툴바는 Plate 위치 계산상 <table> 안
       <caption> 이어야 해서 caption→toolbar 를 허용. */
import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default defineConfig(
  globalIgnores(['dist', 'node_modules', '.claude', '.design-sync', 'docs', 'scripts']),
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, jsxA11y.flatConfigs.recommended],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      ...reactHooks.configs.recommended.rules,
      eqeqeq: ['error', 'smart'],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'jsx-a11y/no-autofocus': 'off',
      'jsx-a11y/label-has-associated-control': ['error', { controlComponents: ['SelectBox'] }],
      'jsx-a11y/no-noninteractive-element-to-interactive-role': ['error', { caption: ['toolbar'] }],
    },
  },
);
