---
allowed-tools: Read, Grep, Glob, Bash(git:*)
description: 코드베이스를 탐색하여 구조를 파악합니다 (읽기 전용).
argument-hint: [검색어] [--deps] [--scope 경로]
---

# /explore - 코드베이스 탐색

## 0단계: 파라미터 파싱
- 검색어 (필수)
- `--deps`: import 체인 추적
- `--scope 경로`: 탐색 범위 제한 (기본 `src/dash`)

## 1단계: 키워드 확장 (한글 라벨 ↔ 영문 파일명)

| 입력 | 확장 |
|------|------|
| 자펀드 | subfund, SubFundManage, subfund_form_modal, subfund_spec_modal |
| 운용사 / GP | gp_*, gp_spec_modal, gp_contribution_manage, 명세 |
| 조기경보 / 리스크 | risk, early_warning, gp_early_warning, risk_grid, risk_manage |
| 메뉴 / LNB | MENU, data.ts, shell.tsx, 메뉴구성도 |
| 스키마 / 리스트 | PageSchema, schemas/, generic_list, GenericListPage |
| 그리드 | AgGridReact, apfsTheme, aggrid_*, GridFrame |
| 모달 / 폼 | RowFormModal, FIELD_CONTROLS, renderers.tsx, dialog.tsx |
| 로그인 / 온보딩 | auth_model, login_demo, onboarding_issue, onboarding_invite |
| 색 / 테마 | tokens.css, --primary, .dark |

라우트는 메뉴 리프 **한글 label** 이므로(`apfs.route`) 한글 라벨로도 검색한다.

## 2단계: 초기 탐색
- **파일명**: Glob — 한글 파일명은 macOS 가 NFD 로 돌려줄 수 있어 NFC 패턴과 무음 불일치한다. 안 잡히면 영문 키워드·Grep 으로 우회
- **코드 내용**: Grep 으로 정의/사용처
- **Git 히스토리**: `git log --oneline --grep="<검색어>" -10`
- **규약**: 관련 스킬 `.claude/skills/*/SKILL.md`, 이력 `docs/HARNESS_CHANGELOG.md`

## 3단계: 결과 정리

- **파일** / **정의** / **사용처** / **커밋** / **관련 스킬·규약**
- 참조는 `파일:줄` 형식

## 4단계: 의존성 추적 (--deps)

import 체인을 따라 의존성 그래프 구축. 스키마 주도 화면은 `schemas/*.ts` → `generic_list` → 라우트 등록까지 따라간다(스키마가 typed 페이지에 가려져 dead 일 수 있으니 live 라우팅 확인).

넓은 탐색이 필요하면 `code-explorer` 에이전트(읽기 전용)에 위임한다.
