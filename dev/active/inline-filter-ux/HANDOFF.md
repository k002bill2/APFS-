# HANDOFF — 자펀드정보관리 인라인 필터·칩 UX (2026-11-10)

> **1차 완료(2026-11-10)** — PR **#424** `ecfc971` main 머지, 공유 체크아웃 ff 완료, 워크트리 제거.
> 사용자 화면 확인: 11-10 "잘 보여".
> **2차 완료(2026-11-13)** — 사용자 "1 모두 2 응" → 아래 남은 일 2건 **둘 다 구현**. PR **#429** `b971da3` main 머지
> (커밋 `0c99829` 포커스 링 · `408d580` 드롭다운 칩), 공유 체크아웃 ff 완료, 워크트리·브랜치 제거. **이 작업은 남은 일 없음.**
> ① 범위 질문에 "전체 있는 필터 칩만" → 18파일·19화면 `filterChipsMenu`(보기 전환 9·조기경보 등급 복수 선택은 칩 유지),
>   `SubFundExt.stageMenu` 삭제(자펀드 관리도 드롭다운), 가드 `filter_chip_menu_rule.test.ts`, 회귀 테스트 뒤집음.
> ② `filter_field_jump.ts` `focusField` 에 `focusVisible: true` + 테스트.
> 검증: lint 0 · `vite build` 0 · vitest 143파일/2817건(기준선 142/2813) · Codex working-tree 지적 0 · ego-browser 8화면 실측(라이트·다크·600px).

## 위치·상태
| 항목 | 값 |
|---|---|
| 머지 | 1차 #424 `ecfc971`(커밋 `14083db`) · 2차 #429 `b971da3`(커밋 `0c99829`·`408d580`) — base main |
| 워크트리 | 없음(제거). 새로 이어가려면 `bash scripts/wt.sh new <새 브랜치>` |
| 로컬 브랜치 | 없음(`feat/inline-filter-placeholder`·`feat/filter-chip-menu` 삭제) |
| 미커밋 | 없음 |

## 반영된 것(#424) — 화면 `#/asset-fund-info-manage`
| # | 사용자 요청 | 구현 위치 |
|---|---|---|
| 1 | 값을 골라도 placeholder 고정(공용 컴포넌트 수정 금지) | `iam/sfund/subfund_filter_panel.tsx` — select·PeriodPicker 10칸 `value=""` |
| 2 | 칩 안 생기는 5칸 툴팁이 안 보임 | 같은 파일 `Cell` + DS Tooltip. 포털(기준일자 달력)발 이벤트는 `skipPortal` 로 무시 → 달력 Esc 1회 |
| 2b | (Codex P2) 닫힌 select 방향키가 값을 바로 바꿈(Win/Linux) | `openListOnNavKey` — `showPicker()` 성공 시에만 `preventDefault` |
| 3 | `+N` 메뉴 칩: 툴팁·×로만 삭제·클릭=해당 필터로 이동 | `applied_filters.tsx` `OverflowMenu`(값 항목+× 항목 2 menuitem, 닫힌 뒤 `onJump`) · `MenuChipTip` |
| 4 | 사업연도 칩 클릭 뒤 포커스 링 안 보임 | `filter_field_jump.ts:89` `focusPanelField` 에 `focusVisible: true` |
| 5 | 심사단계 기본 칩 5개가 공간 과다 → **드롭다운 칩 1개 · 이 화면만** | `applied_filters.tsx` `FilterChipMenu` ← `grid_frame.tsx` `filterChipsMenu?: string`(opt-in) ← `subfund_manage.tsx` `SubFundExt.stageMenu` ← `iam/asct/asset_fund_info_manage.tsx` `EXT.stageMenu: true`. 310px → 112px |

검증(머지 전): lint 0 · `vite build` 0 · vitest 138파일/2762건 · Codex working-tree 지적 0 · ego-browser 실측 · fresh-context `/verify` PASS.
테스트: `iam/asset_fund_info_filter_panel.test.ts` · `applied_filters_overflow.test.ts`(jsdom 폭 0 → 칩 전부 `+N` 로 접힘을 이용) · `filter_field_jump_dom.test.ts`.

## 남은 일 — ✅ 2건 모두 완료(2026-11-13, #429). 아래는 당시 기록
1. ✅ **드롭다운 칩을 다른 화면으로 확대할지** → '전체' 있는 단일 선택 필터 19화면 전부(보기 전환 9·조기경보 등급은 칩 유지, 가드 `filter_chip_menu_rule.test.ts`). 아래 "값 4개 이상만 후보"·"subfund 칩 유지"는 폐기됨 (메모리 `base-chips-dropdown-menu-decision`)
   - 기본 칩을 쓰는 화면 32곳(11-10 실측). bespoke 28파일:
     `grep -rl --include='*.tsx' --include='*.ts' 'filterChips=' src/dash | grep -v '\.test\.'`
   - 적용법: 그 화면 `<GridFrame filterChipsMenu="항목명" …>` 한 줄 + 'all' 칩 label 을 값만('전체')으로. 값 2~3개(사용여부·결과)짜리는 칩이 더 짧을 수 있어 **값 4개 이상만 후보**.
   - 회귀 주의: 자펀드 관리(`subfund`)는 같은 컴포넌트지만 칩 유지 — 회귀 테스트가 고정해 둠.
2. ✅ **상세 필터 드로어 경로에도 포커스 링** → `focusField` 에 `focusVisible: true` + 테스트. (당시 제안:) `filter_field_jump.ts:73` `focusField` 의 `control?.focus({ preventScroll: true })` 에 `focusVisible: true` 추가 여부(미답 제안). 인라인 패널 경로(:89)와 같은 이유: 마우스 클릭 뒤 버튼형 컨트롤엔 `:focus-visible` 이 안 켜짐(Chrome). 테스트는 `filter_field_jump_dom.test.ts` 의 `objectContaining({ focusVisible: true })` 패턴 재사용.

## 함정(재발 방지 — 메모리에 기록됨)
- 팝오버 품은 칸을 `TooltipTrigger` 로 감싸면 포털 초점이 툴팁을 열어 Esc 를 먹음 → `radix-tooltip-layer-eats-esc`
- ego-browser 는 창이 뒤면 rAF 가 멈춤 → 애니메이션 타이밍 말고 `aria-expanded`·`data-state` 로 판정, viewport override 는 스크립트마다 재적용 → `ego-browser-timing-throttle-trap`
- `wt.sh new` 워크트리의 업스트림은 `origin/main` → 첫 push 는 반드시 `git push -u origin HEAD`

## 다음 세션 시작
이 작업은 끝났다 — 이어서 할 일 없음. 보기 전환 칩·조기경보 등급을 드롭다운으로 바꾸자는 제안은 사용자 요청 없이 하지 않는다.
