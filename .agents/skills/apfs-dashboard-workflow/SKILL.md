---
name: apfs-dashboard-workflow
description: Use when changing the APFS dashboard UI, routes, menu data, dashboard widgets, visual design, Vite build behavior, or Korean fund-domain dummy data in this repository.
---

# APFS Dashboard Workflow

Use this skill for APFS dashboard work in `/Users/younghwankang/Work/APFS`.

## Required Context

Before editing, read these sections in `CLAUDE.md`:

1. 프로젝트 개요
2. 파일 구조
3. 모듈 아키텍처
4. 실행 방법
5. 편집 시
6. 디자인 토큰 / 브랜드
7. 도메인 컨텍스트

## Canonical Edit Surface

- Edit Vite/React source files under `src/`.
- Do not directly edit `농식품모태펀드 대시보드*.html` unless the user explicitly asks for legacy bundle work.
- Treat `src/dash/data.ts` as the local dummy-data source.
- Treat `src/dash/app.tsx` as the route switch.
- Treat `src/dash/shell.tsx` and `src/dash/data.ts` together when changing navigation.
- Prefer shared UI from `src/dash/components.tsx` and charts from `src/dash/charts.tsx`.

## Workflow

1. Check current state with `git status --short --branch`.
2. Read the smallest relevant source files before proposing edits.
3. If adding a route, update both `APFS_DATA.MENU` and `App` route rendering.
4. If adding a visual module, follow the existing React 18 + TypeScript style. Existing files use a mix of JSX and `React.createElement`-era patterns; match the surrounding file.
5. Use CSS variables from `src/dash/tokens.css` and existing utility classes before introducing new hard-coded colors.
6. Keep Korean domain labels precise and consistent with existing menu terminology.
7. Run the verification steps in `references/verification.md`.
8. Report pre-existing dirty files separately from your own changes.

## Design Rules

- Preserve light and dark theme compatibility.
- Avoid nested card layouts unless the surrounding component already uses that pattern.
- Keep dense operational screens scannable; APFS is an internal investment asset management dashboard, not a marketing site.
- Use existing icon names from `src/dash/icons.tsx` before adding new icon primitives.

## Completion Criteria

- `npm run build` succeeds.
- The changed route or component is reachable through the app's existing navigation model when applicable.
- No unrelated user edits are reverted.
