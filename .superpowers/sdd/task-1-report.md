# Task 1 Report: 테스트 인프라 + 스키마 타입/zod

## 변경/생성 파일

| 파일 | 동작 |
|------|------|
| `vitest.config.ts` | 신규 생성 |
| `package.json` | scripts에 `test`/`test:watch` 추가; zod→deps, vitest→devDeps |
| `package-lock.json` | 자동 갱신 |
| `src/dash/schemas/types.ts` | 신규 생성 (PageSchema, ColumnSpec, FieldSpec 등 타입 + PageSchemaZ + parsePageSchema) |
| `src/dash/schemas/types.test.ts` | 신규 생성 (TDD RED→GREEN 테스트 3개) |

## 실행 명령 및 출력

### Step 1: vitest + zod 설치
```
npm install -D vitest@^2   → vitest@2.1.9 설치 완료
npm install zod            → zod@4.4.3 설치 완료
```

### Step 5 (RED): npm test 실패 확인
```
FAIL src/dash/schemas/types.test.ts
Error: Failed to load url ./types — Does the file exist?
Test Files: 1 failed / Tests: no tests
```
— 예상대로 실패 확인.

### Step 7 (GREEN): npm test 통과
```
✓ src/dash/schemas/types.test.ts (3 tests) 3ms
Test Files: 1 passed (1) / Tests: 3 passed (3)
Duration: 434ms
```

### npm run build
```
vite v5.4.21 building for production...
✓ 1603 modules transformed.
✓ built in 1.66s
```
— exit 0, green.

### tsc --noEmit (스키마 파일 에러 없음)
```
npx tsc --noEmit 2>&1 | grep "schemas/"  → No errors in schemas files
```
레거시 에러(generic_list.tsx): 2개 — 기존 파일, Task 1 무관.

## 각 스텝 결과

| Step | 결과 |
|------|------|
| 1: vitest 설치 | ✓ vitest@2.1.9 devDeps 추가 |
| 2: test 스크립트 추가 | ✓ test/test:watch scripts 추가 |
| 3: vitest.config.ts 작성 | ✓ include: ['src/dash/schemas/**/*.test.ts'] |
| 4: 실패 테스트 작성 | ✓ types.test.ts 3 tests (parsePageSchema) |
| 5: RED 확인 | ✓ types.ts 없어서 실패 확인 |
| 6: types.ts 구현 | ✓ zod v4 + 타입 인터페이스 완성 |
| 7: GREEN 확인 | ✓ 3 tests passed |
| 8: 커밋 | ✓ b15a337 |

## Self-Review 발견/수정 사항

1. **zod 버전 확인**: 설치된 zod는 v4.4.3 (최신). `z.enum(const array)` API가 zod v4에서 동작하는지 node 직접 테스트 후 확인.
2. **tsc standalone 에러**: `--jsx` 없이 단독 파일로 tsc 실행 시 JSX 에러 발생 → 프로젝트 tsconfig로 `npx tsc --noEmit` 실행 후 schemas 필터링으로 검증.
3. **Tone import**: `../components.tsx`에 `export type Tone = "primary"|"success"|...` 확인 후 타입 import 유지.

## 커밋 해시

`b15a337` — feat(schemas): PageSchema 타입 + zod 검증 + vitest 인프라

---

# Task 1 리뷰 이슈 수정 보고

## 수정 내용

### 이슈 1 (Important): 타입-런타임 경계 불일치 수정

- `src/dash/schemas/types.ts` line 10: `TONE_VALUES = ['primary','success','warning','danger','info','cyan'] as const` 추가 (CELL_TYPES/FIELD_CONTROLS 패턴 일관성 유지)
- `PageSchemaZ` statusDomain의 `tone: z.string()` → `tone: z.enum(TONE_VALUES)` 교체 (line 39)
  - 이제 잘못된 tone 값(e.g., `"bogus"`)은 zod parse 시 즉시 거부됨

### 이슈 2 (Minor): 불필요 캐스트 제거

- `parsePageSchema`의 `as PageSchema` 캐스트 제거 (line 44)
- `z.infer<typeof PageSchemaZ>` tone이 `Tone` 유니언과 정확히 일치하므로 컴파일러가 타입 정합성을 직접 강제
- tsc 에러 없음 확인 (schemas clean)

## 검증 결과

### npm test
```
✓ src/dash/schemas/types.test.ts (3 tests) 4ms
Test Files  1 passed (1)
     Tests  3 passed (3)
  Duration  515ms
```

### tsc --noEmit (schemas 필터)
```
schemas clean
```

### npm run build
```
vite v5.4.21 building for production...
✓ 1603 modules transformed.
✓ built in 1.68s
```
— exit 0

## 커밋 해시

`6180138` — fix(schemas): TONE_VALUES const + z.enum으로 타입-런타임 경계 정합 강제
