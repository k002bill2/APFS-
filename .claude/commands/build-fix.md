---
allowed-tools: Bash(npm:*), Bash(npx:*), Bash(git:*), Read, Edit, Grep, Glob
description: 빌드(vite build)·타입(tsc) 에러를 최소 diff로 점진 수정합니다.
argument-hint: [--build|--types|--all]
---

# Build Fix

APFS 빌드 에러를 최소 변경으로 점진 수정합니다. 백엔드 없음 — 대상은 루트 Vite 앱 하나입니다.

## 1단계: 빌드 실행

| 옵션 | 명령 (저장소 루트) | 성격 |
|------|-------------------|------|
| `--build` (기본) | `npm run build` | **게이트** — esbuild 번들, 실패하면 배포(Vercel) 불가 |
| `--types` | `npx tsc --noEmit` | 보조 — esbuild 는 타입체크를 안 하므로 build 가 green 이어도 tsc 에러는 남을 수 있다 |
| `--all` | 위 둘 다 | |

## 2단계: 에러 수집 & 분류

- import/export·모듈 해석(`@/` 별칭은 `vite.config.ts`·`tsconfig.json` 양쪽에 필요)
- 정의 누락·오타
- 타입 에러(tsc 만)
- 설정 오류(vite/tailwind/postcss)

**tsc 기준선:** 에러가 이번 변경 파일에 있는지부터 가른다. 변경 파일 = 커밋분 + staged + unstaged + untracked 전부:

```bash
{ git diff --name-only origin/main...HEAD; git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u
```
 변경하지 않은 파일의 기존 에러(예: 2026-09-26 기준 `shell.tsx:61` 1건)는 이번 수정 대상이 아니다 — **이번 변경이 만든 에러만** 고친다.

## 3단계: 점진적 수정

- 에러 1건 → 수정 → 재실행. 진행 상황 출력: "X/Y 에러 수정됨"
- 타입 어노테이션·null 체크·import 수정 수준으로 끝낸다

## 4단계: 검증

```bash
npm run build          # exit 0
npx vitest run         # 회귀 없음
```

## 규칙

- 최소 diff (리팩토링·인접 코드 "개선" 금지 — Surgical Changes)
- 로직 변경 금지, 아키텍처 변경 금지
- 의존성 추가가 필요하면 멈추고 사용자에게 묻는다
- 같은 수정 2회 실패 → 멈추고 근본 원인 분석(`superpowers:systematic-debugging`)
