# HANDOFF — fix/perm-matrix-ds-checkbox (2026-09-18)

## 상태
- 워크트리: `.claude/worktrees/fix/perm-matrix-ds-checkbox`, 브랜치 `fix/perm-matrix-ds-checkbox`, **10커밋(+이 문서)**, 작업 트리 clean, **미푸시·PR 없음**.
- dev 서버: `bash scripts/wt.sh dev fix/perm-matrix-ds-checkbox` → :5350 (사용자는 :5273=main 을 보고 있을 수 있음 — URL 명시할 것).
- build ✓ · vitest 412/412 ✓ · 브라우저 실측 완료(권한관리 매트릭스·폼 스위치/라디오·AG Grid 선택 컬럼 3화면·로그인).

## 결정(사용자, 되돌리지 말 것)
1. 폼 '여/부'(control:'switch') = **DS Switch**(오전 #202 의 체크박스 렌더는 폐기, 커밋 789e4af).
2. 라디오 = DS RadioGroup(`ui/radio-group.tsx`), 복수선택·권한 매트릭스·AG Grid 행선택·로그인 아이디 저장 = DS Checkbox — "모두 통일".
3. AG Grid 는 테마 `checkbox*` 파라미터가 아니라 `aggrid_selection.tsx` `SELECTION_COL` 로 직접 렌더(pinned 행은 null, 단일선택엔 헤더 전체체크 없음 — 설계).

## 게이트
- Codex: 한도 소진(9/19 17:22 재개) → **미통과**. 재개 후 `node ~/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs review --wait --scope branch --base origin/main` 재실행 권장.
- 대체 독립 Opus 리뷰: 커밋 1~7 LGTM(Major 1·Minor 14 전부 반영). 커밋 8~10(선택 컬럼 정렬 수정·라디오 점 p-0)은 리뷰 안 받음 — 작은 CSS/클래스 변경.

## 다음 단계
1. (사용자 지시 시) 푸시·PR: `commit-push-pr` 스킬, 이 워크트리에서. PR 본문에 결정 1~3 과 게이트 상태 명시. 머지 전 HANDOFF.md 삭제.
2. 로그인 화면 정본(claude.ai/design 캔버스)의 "아이디 저장" 체크를 DS Checkbox 로 동기(코드 선반영, `login_demo.tsx` 헤더 참조).
3. 후속 후보: SSR 회귀 테스트(vitest 설정 변경 동반), 단일선택 화면에 전체체크 요구 시 multiRow 전환 결정.

## 함정(메모리에도 기록)
- 메모리 `switch-checkbox-radio-decision`, `preflight-off-ua-margin-trap`(버튼 패딩 판) 참조. Radix RadioGroup 방향키 자동화 검증은 keyboard.down→80ms→up.
