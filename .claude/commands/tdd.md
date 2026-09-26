---
description: 테스트 먼저 작성하고 코드 구현 (RED → GREEN → REFACTOR).
argument-hint: [구현할 기능/버그]
---

# TDD Command

`superpowers:test-driven-development` 스킬을 호출해 테스트 주도로 진행합니다.

## 절차

1. **인터페이스 정의** — 순수 함수/모델(`*_model.ts` 등)로 판정 로직을 분리
2. **실패 테스트 작성** (RED) — 실행해서 **실제로 실패**하는지 확인
3. **최소 구현** (GREEN)
4. **리팩토링** (REFACTOR) — 테스트 유지
5. **버그 수정이면 Red-Green 검증** — 수정 되돌리기 → FAIL → 복원 → PASS

## APFS 테스트 환경

- 위치: `src/dash/**/*.test.ts` (`vitest.config.ts` 의 include — `.tsx` 테스트는 수집되지 않음)
- environment: `node` (DOM 없음) → 렌더 결과가 아니라 **로직·데이터·소스 규약**을 테스트한다
  - 예: `auth_model.test.ts`(판정 로직), `no_demo_mask.test.ts`·`applied_filters.test.ts`(소스 가드)
- 실행: `npx vitest run <파일>` / 전체 `npx vitest run`
- 화면 동작은 테스트 대신 ego-browser 실측으로 검증

## 커버리지

coverage provider(`@vitest/coverage-*`)가 설치돼 있지 않아 **수치 측정 불가**. 80% 같은 수치를 주장하지 않는다 — 분기별 케이스를 테스트 목록으로 열거해 대신한다. provider 도입은 별도 결정(의존성 추가).

## 다음 단계

| 구현 완료 후 | 커맨드 |
|:------------|:-------|
| 빌드/검증 + Codex 게이트 | `/verify-loop` |
| 커밋·PR | `/commit-push-pr` |
