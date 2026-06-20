# AGENTS.md

이 파일은 이 저장소에서 Codex(및 `AGENTS.md` 규약을 읽는 도구)가 따라야 하는 작업 하네스입니다.

## 단일 정본

제품/업무/번들 규약은 `CLAUDE.md`가 단일 정본입니다. 이 파일은 제품 사실을 복제하지 않고, Codex가 어떤 순서와 검증 기준으로 작업해야 하는지만 고정합니다.

작업 전 `CLAUDE.md`의 다음 섹션을 읽으세요.

- 프로젝트 개요 / 파일 구조
- 모듈 아키텍처
- 실행 방법
- 편집 시
- 디자인 토큰 / 브랜드
- 도메인 컨텍스트

## 현재 정본 구현

- 정본 편집 표면은 `src/` 아래 Vite + React 18 + TypeScript 소스입니다.
- 배포 산출물은 `npm run build`로 생성되는 `dist/`입니다.
- 루트의 `농식품모태펀드 대시보드*.html` 파일은 Vite 전환 전 레거시 오프라인 번들입니다. 사용자가 명시적으로 요청하지 않는 한 직접 편집하지 마세요.

## Codex 작업 규칙

- 변경 전 실제 파일과 현재 Git 상태를 확인합니다.
- 사용자가 요청한 범위에 직접 필요한 파일만 수정합니다.
- 기존 사용자 변경을 되돌리지 않습니다.
- UI 변경은 `tokens.css`, `tweaks.css`, 공통 컴포넌트, 기존 Tailwind 유틸 패턴을 우선 사용합니다.
- 메뉴/라우트 변경은 `src/dash/data.ts`의 `APFS_DATA.MENU`와 `src/dash/app.tsx` 라우트 분기를 함께 검토합니다.
- 더미 데이터는 백엔드/API가 아니라 `src/dash/data.ts`의 `APFS_DATA`에서 관리합니다.

## 검증 기준

기본 검증:

```bash
npm run build
```

참고:

- `tsc --noEmit`은 현재 Phase 0 미타입 코드 때문에 알려진 타입 오류가 있을 수 있습니다.
- 빌드 확인 후 `git status --short --branch`로 수정 범위와 사전 존재 변경을 구분합니다.

## 하네스 자산

- `.agents/skills/apfs-dashboard-workflow/` — APFS 대시보드 UI/라우트/데이터 변경 workflow.
- `.codex/hooks.json` + `scripts/codex-guard.sh` — 레거시 번들 직접 편집 같은 고위험 작업을 막는 Codex hook 설정.
- `docs/codex-harness.md` — 이 저장소에 적용된 Codex 하네스 레이어 설명.

## Claude Code 전용

`CLAUDE.md` 후반의 Claude Code 통합 시스템, `.claude/`, `dev/`, Workflow 도구 설명은 Claude Code 전용입니다. Codex 작업에는 직접 적용하지 않습니다. 단, 그 섹션이 인용하는 제품 사실이 앞쪽 공유 섹션과 일치하는 경우 제품 이해 자료로만 참고할 수 있습니다.
