# HANDOFF — 회계 화면 스킬 규약 점검 2차 (2026-11-09)

> 완료 보관본(2026-11-09, PR #417 머지) — 작업 중엔 워크트리 안 미커밋 인계 문서였다. 3차·후속은 같은 폴더 `HANDOFF.md`.

## 위치·상태
- 워크트리: `.claude/worktrees/fix/acc-skill-audit-2` (base origin/main `d2de79a`), dev 포트 **5350** (`bash scripts/wt.sh dev fix/acc-skill-audit-2`)
- 1차 PR **#416 머지 완료**(선택 해제·페이저 번호(신규 6화면)·no-op 칩·[수정] 숨김·표시 옵션 툴바 토글). 1차 워크트리 제거, 공유 main 최신(#416·#415 포함), 로컬 브랜치 `fix/acc-filter-clears-selection` 은 지시 없어 남김.
- **2차 = 커밋 `c8a498b` · PR #417 생성(2026-11-09, 머지 대기)**. 커밋 직전 `/verify` fresh PASS(vitest 131/2594 · lint 0 · build 0 · 변경 파일 tsc 0 · gen_doc 동일). 아래 "미커밋" 표기는 작성 당시 기준.

## 2차 변경(미커밋)
| 파일 | 내용 |
|---|---|
| `acc/baseinfo/account_code_manage.tsx` · `acc/slip/deleted_journal_manage.tsx` · `missing_evidence_manage.tsx` · `journal_search_manage.tsx` | 푸터 페이저에 로컬 `PageBtn` 번호 버튼(‹ 번호 ›) |
| `acc/closing/fiscal_rollover_manage.tsx` | 직접 둔 IconBtn 2개 → `<FooterActions onExport={exportExcel} />` + `useHotkey(HOTKEYS.print.combo, printGrid, { enabled: listKeys, skipInDialog: true })` (⌘P 가 브라우저 기본 인쇄로 GNB 까지 찍던 것) |
| `acc/acc_skill_rules.test.ts` | ① 단축키 대상에 11-06 5화면 추가 + 합성 enabled 식 안 이름 펼침, ④ 페이저 대상 +4, ⑨ 회계 푸터 = FooterActions 신설 |
| `scripts/uiux-doc/screens_data.py` + `docs/UIUX_기능설명서.html` | 회기생성 푸터 문구 "인쇄 없음" → "인쇄 ⌘P(그리드만)" 재생성 |

## 검증 상태(fresh)
- 가드 Red→Green: ④ 5건·⑨ 1건 실패 → 통과(①은 테스트 해석 한계였고 코드 위반 0)
- 브라우저(:5350): 4화면 번호 클릭 시 aria-current·첫 행 이동, 회기생성 푸터 [새 창·내보내기·인쇄] + ⌘P → window.print 1회
- vitest 131 files / 2594 tests pass · lint exit 0 · vite build exit 0 · 변경 파일 신규 tsc 에러 0(기존 missing_evidence_screen.test.ts 2건은 main 동일) · Codex review 지적 없음
- **커밋 전 남은 것**: 사용자 승인 → `/verify` → 명시적 add(이 HANDOFF.md 제외) → 커밋(트레일러) → push → PR

## ~~결정이 필요한 것~~ → 2026-11-09 해결: 4건 모두 "하자" → 3차 PR #418(워크트리 `fix/acc-skill-audit-3`, base = 이 브랜치 · 스택)
- #417 머지 후: #418 base 를 main 으로 바꾸고, 스쿼시 머지였으면 `git rebase --onto origin/main c8a498b`(메모리 stacked-pr-squash-rebase-onto)
- 남은 결정 1건: 정본 [삭제] 버튼 라이트 대비 2.82:1(흰 글자 on --danger) — `--danger-solid` 류 토큰 신설 여부

(아래는 당시 질문 원문)
1. **보조원장 페이저**: 실데모 ~720행 = 37쪽. 번호 전부 그리면 버튼 37개라 이번에 되돌림('현재 / 전체' 텍스트 유지, ④ 예외 주석). 골드 페이저(generic_list·closing_journal)는 생략 처리 없음 → 많은 쪽용 생략형 페이저(1 … 5 6 7 … 37)를 공용으로 둘지 결정.
2. **주 액션 ▾ 설정 묶음 버튼**: 감가상각 `[저장 ▾ 계정과목 설정]` · 자금일보 `[자금일보 전자결재 ▾ 결재라인설정]`. apfs-grid 허용 combo 는 "같은 1차 액션의 대체 경로"만 → 설정 버튼 분리(outline, 등록 오른쪽·조회 왼쪽) vs 현행 유지.
3. **푸터 건수 문구**: `총 N건 중 M건 · K건 표시 중` / `총 N건 중 M건 표시` / `총 N개 중 M개 항목 표시 중`(골드) 혼재 — 코드베이스 전체도 섞여 있음. 통일안 결정.
4. **선택 바 삭제 버튼 모양**: primary+danger(다수) vs outline(+trash) 혼재 — 통일안 결정.
