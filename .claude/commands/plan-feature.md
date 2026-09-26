---
description: 코드 작성 전 구현 계획 수립. 사용자 확인 후 코딩 시작.
argument-hint: [기능/변경 설명]
---

# Plan Feature

(내장 plan mode(`/plan`)와 혼동을 피해 `/plan-feature`.)

구현 전에 계획을 세우고 **사용자 승인 전에는 코딩하지 않는다**.

## 절차

1. **요구사항 재정리** — 무엇을 만들지, 모호한 점은 가정으로 명시하고 질문
2. **현황 파악** — 관련 화면·스키마·스킬 확인
   - 메뉴 정본은 `docs/source/` xlsx 「메뉴구성도」(리프 임의 추가·삭제 금지)
   - 해당 영역 프로젝트 스킬(`ls .claude/skills`) — 그리드면 `apfs-grid`/`apfs-aggrid`, 폼이면 `apfs-form-modal` 등
3. **리스크 식별** — 기존 규약 충돌, 공용 컴포넌트 영향 범위, 라이트/다크·반응형·a11y
4. **단계별 계획** — 3~6 단계, 각 단계의 검증 방법 포함
5. **확인 대기**

## 사용 시점

기준은 파일 수가 아니라 **불확실성**이다(HARD-GATE 는 2026-08-09 폐지). 범위가 명확하면 바로 진행해도 된다.

- 새 화면/기능, 공용 컴포넌트·셸 변경, 규약 변경이 따르는 작업

## 도구

- 설계 검토: `code-architect` 에이전트 (읽기 전용)
- 계획 문서화: `superpowers:writing-plans` → `docs/superpowers/plans/` (진행 중만 둠, 없으면 생성 · 완료 시 `completed/` 로 `git mv`)
- 대규모 작업 컨텍스트 유지: `/dev-docs <task>` → `dev/active/<task>/`

## 다음 단계

| 계획 확정 후 | 커맨드 |
|:------------|:-------|
| 워크트리 생성 | `bash scripts/wt.sh new <branch>` |
| 테스트하면서 구현 | `/tdd` |
| 빌드/검증 | `/verify-loop` |
