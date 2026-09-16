# APFS 개발환경

> 실측: 2026-09-16 · 대상: 이 저장소(`APFS-` 공유 체크아웃)
>
> **이 문서는 참고용 요약이다. 정본은 항상 오른쪽 "정본" 열의 파일이다.**
> 값이 의심되면 "재측정" 명령을 돌려 대조한다 — 손으로 적은 실측값은 환경이 움직이면 조용히 거짓이 된다.
> (같은 이유로 `docs/APFS_SETUP_NOTES.md` A-4의 모델 ID는 이미 낡았다.)

## 1. 런타임

| 항목 | 값 | 정본 | 재측정 |
|---|---|---|---|
| Node | v25.6.0 | `package.json` `engines.node: ">=22"` | `node -v` |
| npm | 11.8.0 | `package.json` `packageManager: "npm@11.8.0"` | `npm -v` |

- `engines`의 상한을 두지 않는 이유: Vercel은 LTS 짝수 메이저(18/20/22/24)만 빌드 이미지로 제공한다.
  `">=25"`로 못 박으면 로컬은 맞지만 배포가 죽는다. 하한만 두어 로컬 25와 Vercel 22/24를 동시에 만족시킨다.
- `engines`는 기본적으로 강제되지 않는다(경고조차 없음). 강제하려면 `.npmrc`에 `engine-strict=true`.
  `packageManager`는 다르다 — Corepack이 이 값을 읽어 해당 npm을 실제로 내려받아 실행한다.

## 2. 빌드 · 스크립트

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | Vite dev 서버 (**포트 5273 고정**, `strictPort`) |
| `npm run build` | `vite build` → `dist/` |
| `npm run preview` | 빌드 산출물 미리보기 (**포트 4273 고정**) |
| `npm test` | `vitest run` (테스트 파일 21개) |
| `npm run test:watch` | `vitest` watch |

- 번들러: **Vite** + `@vitejs/plugin-react`. JSX 변환은 빌드타임(esbuild).
- 별칭 `@/` → `src/`. **`vite.config.ts`의 `resolve.alias`와 `tsconfig.json`의 `paths` 양쪽 모두** 필요하다.
- 포트 5273인 이유: agent-system이 5173을 점유해 충돌을 피한 고정값이다.
- dev 서버 워처는 `.claude/worktrees/`를 **이 설정 파일 기준 절대경로**로 제외한다.
  상대 glob으로 바꾸면 워크트리 안에서 dev를 띄웠을 때 자기 자신을 무시해 HMR이 죽는다.

## 3. TypeScript

`tsconfig.json` — 의도적으로 느슨하다(Phase 0 미타입 코드 허용).

- `strict: false`, `noImplicitAny: false`, `skipLibCheck: true`
- `target/lib: ES2020` · `module: ESNext` · `moduleResolution: bundler` · `jsx: react-jsx` · `noEmit: true`
- **`tsc --noEmit`은 현재 타입 에러를 다수 보고한다.** esbuild는 타입체크를 하지 않으므로 `vite build`는 green이다.
  즉 타입 에러는 빌드 게이트가 아니다 — 통과했다고 타입이 맞는 것은 아니다.

## 4. 배포

`vercel.json` — `framework: vite` · `buildCommand: vite build` · `outputDirectory: dist`.
`main` 브랜치 갱신 시 Vercel 자동 배포. **백엔드·API 없음** — 모든 데이터는 `src/dash/data.ts`의 `APFS_DATA` 더미다.

## 5. 브랜치 작업 = 워크트리

공유 체크아웃(`APFS-`)은 **`main` 고정**. 브랜치 작업은 워크트리에서 한다.
공유 체크아웃에서 `git switch`를 하면 같은 디렉터리를 보는 다른 세션의 dev 서버가 다른 커밋의 소스를 서빙한다.

| 명령 | 하는 일 |
|---|---|
| `bash scripts/wt.sh new <branch>` | 워크트리 생성(base `origin/main`) + `node_modules` CoW 복제 + 포트 배정 |
| `bash scripts/wt.sh dev <branch>` | 배정된 포트로 dev 서버 실행 |
| `bash scripts/wt.sh ls` / `rm <branch>` | 목록 / 제거(미커밋 변경 있으면 거부) |

- 포트는 브랜치명 해시로 **5300~5389에 고정 배정**(배정표 `.claude/worktrees/.ports`). 충돌 시 풀 안에서 순환한다.
- `node_modules`는 APFS clonefile(`cp -c`) 복제 — 심볼릭 링크로 공유하면 `node_modules/.vite` 캐시가 브랜치 간에 섞인다.
- `scripts/block-main-write.sh` 가드가 공유 체크아웃의 직접 쓰기를 차단한다. 가드 수정 시 `bash scripts/block-main-write.test.sh`.

## 6. 주요 스택

React 18 · AG Grid Community · Plate(리치텍스트) · Radix UI · Tailwind(`preflight: false`) ·
자체 SVG 차트(`src/dash/charts.tsx`) · SheetJS(`xlsx`, 쓰기 전용) · zod · Motion · FilePond · lucide

## 관련 문서

| 문서 | 내용 |
|---|---|
| `CLAUDE.md` (루트) | 프로젝트 규약 정본 — 모듈 구조·워크트리·편집 규칙 |
| `docs/APFS_SETUP_NOTES.md` | Claude Code 하네스 **설치 감사기록** (개발환경 문서가 아니다) |
| `docs/HARNESS_CHANGELOG.md` | 에이전트·스킬·훅 변경 이력 |
| `docs/COLOR_TOKENS.md` · `docs/Z_INDEX.md` · `docs/A11Y.md` | UI 규약 |
