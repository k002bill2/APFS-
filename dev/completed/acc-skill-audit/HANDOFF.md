# HANDOFF — 회계 화면 스킬 규약 점검 3차 (2026-11-09)

> **완료(2026-11-09)** — #417(`1759913`) · #418(`997b23f`) · #421(`de6c0f2`) 모두 main 머지(머지 커밋). 워크트리 3개 제거, 이 문서는 `dev/completed/acc-skill-audit/` 로 보관(2차 인계 = `HANDOFF_2차.md`).
> ⚠ 남은 연계: 다른 세션의 #419(`feat/row-delete-on-check`)가 `background: var(--danger)` [행삭제] 2개를 추가 — 머지 전 `--danger-fill` 쌍으로 바꿔야 main vitest 가드(`danger_fill.test.ts`)가 통과.


> 완료 보관본(2026-11-09) — 작업 중엔 워크트리 안 미커밋 인계 문서였다. 아래 워크트리·포트 경로는 당시 기준(모두 제거됨). 2차 인계 = 같은 폴더 `HANDOFF_2차.md`.

## 위치·상태
| 항목 | 값 |
|---|---|
| 워크트리 | `.claude/worktrees/fix/acc-skill-audit-3` · dev 포트 **5368** (`bash scripts/wt.sh dev fix/acc-skill-audit-3`) |
| 브랜치 | `fix/acc-skill-audit-3` — `fix/acc-skill-audit-2`(#417) 위에 **스택** |
| PR | **#418** OPEN · base = `fix/acc-skill-audit-2` · Vercel SUCCESS · Codex 지적 없음 |
| 선행 PR | **#417** OPEN(2차 — 페이저 번호 4화면·회기생성 FooterActions) · Vercel SUCCESS · 머지 대기 |
| 미커밋 | 없음(이 HANDOFF.md 만 untracked) |

## 반영된 사항 — 사용자 결정 4건(2026-11-09 "하자")
| # | 결정 | 반영 | 커밋 |
|---|---|---|---|
| 1 | 쪽 많은 화면용 생략형 페이저 **공용화** | `src/dash/grid_pager.tsx` 신설 — 순수 함수 `pageItems(current, total)`(0-based, boundary 1·siblings 1, 8쪽 이상이면 칸 수 7 고정, … 는 2쪽 이상 접을 때만) + `GridPager({current,total,onGo})`(`nav aria-label="페이지 이동"`, 번호 `aria-current`, … `aria-hidden`). 계정별보조부(~720행 = 37쪽)의 '현재 / 전체' 텍스트 → `‹ 1 … 5 6 7 … 37 ›` | `52d2ef9` |
| 2 | 1차 액션 + 설정 묶음 버튼 **분리** | 감가상각비처리 `[저장 │ ▾ 계정과목 설정]` → outline `[저장]` + `[계정과목 설정]` · 자금일보 `[자금일보 전자결재 │ ▾ 결재라인설정]` → outline `[자금일보 전자결재]` + `[결재라인설정]`. 위치 = 1차 액션 오른쪽 · 조회 왼쪽. 저장 동작 불변(SaveButton 전환 안 함) | `1c48dd6` |
| 3 | 푸터 건수 문구 **통일** | `grid_frame.tsx` `footerCount(total, shown, extra?)` 신설 → `총 N개 중 M개 항목 표시 중`(N = 필터 후 행 수, M = 지금 쪽 행 수, 페이저 없으면 M = N, 화면 고유 요약은 ` · ` 뒤). 회계 25화면 + 골드 2곳(generic_list · subfund_manage, 문자열 불변)이 호출. 휴일관리 달력 보기 월 요약은 예외 | `3ce052c` |
| 4 | [삭제] 버튼 모양 **통일** | 회계 outline 4곳(감가상각 · 유무형자산 · 전표관리 · 결산전표) → `variant="primary" leadingIcon="trash" style={{ background: 'var(--danger)' }}`(apfs-form-modal 정본) | `82821d5` |
| — | 문서 | `HARNESS_CHANGELOG` 기록 · GridPager 폭 주석 실측 정정("폭 불변" → "버튼 수 고정, 폭은 자릿수 차만큼 수 px") | `986bea9` |

### 가드(테스트)
- `src/dash/grid_pager.test.ts` — `pageItems` 7케이스(7쪽 이하 전부 · 앞/가운데/뒤 · 칸 수 7 · … 최소 2쪽 · 범위 밖 current)
- `src/dash/footer_count.test.ts` — 문구 · 꼬리 요약 · 골드 2곳 호출
- `src/dash/acc/acc_skill_rules.test.ts`
  - ④ 보조원장 = GridPager + 회계 전 화면 '현재 / 전체' 텍스트 페이저 0
  - ⑩ 회계 툴바 SplitButton 본체·▾ 항목 = 등록|입력|업로드만 + 두 화면 버튼 순서(1차 → 설정 → 조회)
  - ⑪ 회계 footerLeft = footerCount, 파일 안 '건 표시'·'개 항목 표시' 사본 0
  - ⑫ 회계 [삭제] = primary + danger(정규식 `(?:=>|[^>])*` — `[^>]*` 는 `onClick={() =>` 에서 끊겨 2곳을 놓쳤음, 하한 10곳)
- `src/dash/acc/ledger/balance_sheet_manage.test.ts` 기대 문자열 → `footerCount(count, count)`

### 규약 문서
- `.claude/skills/apfs-grid/SKILL.md` — 푸터 골드 절(footerCount · 새 화면 페이저 = GridPager) · combo ① 금지 항목(1차 액션 + 설정 묶음) · 선택 바 [삭제] 정본 예시
- `scripts/uiux-doc/screens_data.py` + `docs/UIUX_기능설명서.html` 재생성 — 보조원장 페이저 · 감가상각/자금일보 툴바 · 일마감/전표검색 푸터 문구
- 메모리 4건: `grid-pager-ellipsis-shared-decision` · `combo-no-settings-bundle-decision` · `footer-count-unify-decision` · `delete-button-primary-danger-decision`

## 검증 상태(fresh, 4건 커밋 후 일괄)
- `npx vitest run` **133 files / 2712 tests pass** · `npm run lint` exit 0 · `vite build` exit 0 · 변경 파일 신규 tsc 에러 0
- 항목별 Red→Green: ④ 2 · pageItems 모듈 · ⑩ 4 · ⑪ 25 + export · ⑫ 4 실패 → 통과
- 브라우저(:5368, ego-browser — 마우스 입력이 CDP 타임아웃이라 DOM `click()` 으로 실측)
  - 보조원장: 5쪽 `1 … 4 [5] 6 … 37` · 6쪽 `1 … 5 [6] 7 … 37` · 37쪽 `1 … 33 34 35 36 [37]` · [이전] → 36, 쪽마다 첫 행 변경 · 푸터 `총 722개 중 20개 항목 표시 중 · 명세 686건`(마지막 쪽 2개) · nav 폭 308↔316px
  - 감가상각 툴바 `상세필터 · 저장 · 계정과목 설정 · 조회` → 계정과목 설정 팝업 / 자금일보 `… 자금일보 전자결재 · 결재라인설정 · 조회` → 결재라인조회 팝업
  - [삭제] 4화면 배경 = `--danger` 계산값 일치 · 푸터 골드 문구
- Codex review(`--base c8a498b`) — "No actionable regressions"(Codex 샌드박스에서 테스트는 못 돌림 — 로컬에서 위처럼 실행)
- 절차 메모: `/verify` 는 커밋마다 돌리지 않고, 4건 커밋 후 같은 게이트(vitest·lint·build·tsc)를 fresh 로 직접 실행

## 가정(PR 본문에 기재)
- 3번 목표 = 스킬 정본 골드. 회계 3수형이 보이던 **필터 전 전체 수는 빠진다**(골드와 같음 — 적용 칩이 필터를 보여 줌).
- 4번 목표 = 다수형·스킬 정본(primary + danger). 사용자가 모양을 지정하지 않음.
- 범위 = 회계(점검 범위).

## ✅ 대비 결정 = (a) → 후속 PR **#421** (2026-11-09)
- 워크트리 `.claude/worktrees/fix/danger-fill-contrast` · dev **5339** · base = `fix/acc-skill-audit-3`(**3단 스택**: #417 ← #418 ← #421)
- `tokens.css` 적응형 쌍 `--danger-fill`(라이트 #C7340F / 다크 #FF7E59) + `--danger-fill-foreground`(#FFF / #10142E) = 5.35 / 7.22:1
- 49곳(33파일) 전환: 선택 바 [삭제] 22 · 확인창 [삭제] 26 · [취소 확인] 1 — 회계 밖 포함. 범위 밖: bg-danger 배지 4 · PDF 배지 2
- 커밋 `73a3512`(코드·가드) · `f0a3026`(color-tokens·COLOR_TOKENS·apfs-grid·apfs-form-modal·CHANGELOG)
- 검증: vitest 134/2716 · lint 0 · build 0 · tsc 변경 0 · 브라우저 Button/SaveButton/AlertDialogAction 라이트 5.35 · 다크 7.22 · Codex 지적 없음
- 머지 순서: #417 → #418 → #421. 각 머지 후 다음 PR base 를 main 으로 + 스쿼시였으면 `rebase --onto origin/main <앞 PR tip>`(#418 tip = 986bea9, #417 tip = c8a498b)

### (당시) 남은 결정 — 정본 [삭제] 버튼 라이트 대비 미달
- 실측: 흰 글자 on `--danger #FF6B42` = **2.82:1**(라이트, AA 4.5:1 미달) · 다크(`#10142E` on `#FF7E59`) 7.22:1 통과. 토큰에 흰 글자용 진한 danger 가 없다(`--danger` · `--danger-soft` · `--danger-text #C7340F` · `--destructive-foreground #FFF` 뿐).
- 이 PR 로 outline(대비 충분) 4곳이 2.82:1 이 됐다 — 정본을 쓰던 회계 6곳 · 회계 밖 11곳도 같은 상태.
- 선택지(사용자에게 제시함):
  - **(a) 추천** — #418 그대로 머지 → 후속 PR 에서 `--danger-solid` 류 토큰 신설 + 삭제 버튼 21곳 일괄 교체(정본 자체를 고침)
  - (b) #418 보류, 지금 토큰 방식으로(회계 밖까지 — PR 커짐)
  - (c) 4번만 outline 으로 되돌림(정본과 어긋남)

## 다음 단계
1. 사용자: 대비 결정 (a)/(b)/(c)
2. 사용자: #417 머지
3. "머지완료" 받으면: `gh pr view 417 --json state` 확인 → #418 base 를 `main` 으로(`gh pr edit 418 --base main`) → 스쿼시 머지였으면 이 워크트리에서 `git rebase --onto origin/main c8a498b` 후 `push --force-with-lease`(메모리 `stacked-pr-squash-rebase-onto`) → 2차 워크트리 제거 + 공유 main `pull --ff-only`(메모리 `post-merge-cleanup-ff-shared-main`)
4. #418 머지 후 이 워크트리 제거(`bash scripts/wt.sh rm fix/acc-skill-audit-3`)

## 범위 밖(요청 시 별도 작업)
- 회계 밖 푸터 문구 직접 조립 약 30곳 → footerCount
- 회계 밖 비정본 [삭제] 약 10곳(outline 4 · outline+빨간 글자 3 · ghost+빨간 글자 3)
- 로컬 `PageBtn` 복사본 39곳 → GridPager 이관

## 이번에 밟은 함정
- GateGuard(Fact-Forcing Gate)가 파일마다 첫 Edit/Write 를 막는다 — 사실 4항목(호출처·API·데이터·지시 원문)을 밝히고 재시도. 다파일 기계 치환은 old 문자열 1회 일치를 확인하는 스크립트로.
- ego-browser 마우스 입력 `Input.dispatchMouseEvent` CDP 타임아웃(창이 뒤에 있을 때) → `page.evaluate` 안 DOM `click()` 으로 대체. 첫 실패 스크립트의 클릭이 실제로는 들어가 상태가 남아 있었다(재진입 시 5쪽에서 시작).
- 가드 정규식 `[^>]*` 는 JSX `onClick={() => …}` 의 `=>` 에서 끊긴다 — 대상 하한(개수)을 함께 걸 것.
