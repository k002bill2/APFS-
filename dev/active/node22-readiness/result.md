# APFS Node 22 Readiness — Verification Result

검증일: 2026-08-30 (KST)
Worktree: `/Users/younghwankang/Work/APFS-node22-readiness`
Branch: `chore/apfs-node22-readiness`
Base: `main` at `77d4643`

## 결과

- Node runtime: `v22.23.1`
- npm: `10.9.8`
- `.nvmrc`: `22.23.1`
- `package.json.engines.node`: `>=22 <23`
- `packageManager`: `npm@10.9.8`

## 자동 검증

| 검증 | 결과 | 근거 |
|---|---|---|
| `npm ci --ignore-scripts` | PASS | 504 packages added, exit 0 |
| `npm ls --depth=0` | PASS | `npmProblems=0`, top-level dependencies 77개 |
| `npx tsc --noEmit` | PASS | exit 0 |
| `npm test` | PASS | 7 files, 50 tests passed |
| `npm run build` | PASS | 5,624 modules transformed, Vite build completed |
| `git diff --check` | PASS | exit 0 |

## 변경 사항

- `src/dash/generic_list.tsx`: MENU 트리 타입을 명시해 TypeScript 오류를 최소 수정. 런타임 동작 변경 없음.
- `src/dash/ui/select-editor.tsx`: `usePlateEditor`에 `enabled: true`를 명시해 nullable 타입을 제거. Plate 구현상 `undefined` 기본 동작과 동일.
- `package.json` / `package-lock.json`: Node 22 실행 기준과 npm 버전을 고정하고, non-major 보안 패치 적용.
  - `nanoid` `3.3.12` → `3.3.18`
  - `postcss` `8.5.15` → `8.5.26`
- `.nvmrc`: `22.23.1`

## 보안 검토

Orca Security read-only review: **PASS**

- 변경 diff에서 logic error 없음
- 신규 dependency 또는 의심스러운 registry/integrity 변경 없음
- Node 22 metadata 간 충돌 없음
- `xlsx@^0.18.5`의 기존 high advisory는 미해결 잔여 위험으로 유지

## 잔여 사항

1. Production audit는 `xlsx` high 1건으로 exit 1.
   - `xlsx@^0.18.5`
   - 자동 수정 없음
   - major 강제 수정(`npm audit fix --force`)은 실행하지 않음
   - 실제 소스 사용은 클라이언트 Excel 쓰기(`aoa_to_sheet`, `writeFile`) 중심으로 확인했으나, 의존성 취약점 자체가 해결된 것은 아님
2. Build 경고 2건은 non-blocking:
   - Vite CJS Node API deprecation
   - `RichTextField`의 static/dynamic import 중복으로 인한 code-splitting 경고
3. 변경은 commit/push/deploy하지 않음.
