> 적용됨: 규칙 본문은 .claude/rules/frontend-design-defaults.md 로 이동(2026-09-27).
# REPORT — Opus 5.5 디자인 기본값 금지 패턴 초안 (APFS)

- 작성: Designer, 2026-09-27 / 브랜치 `k002bill2/design-defaults-opus55`
- 산출물: `frontend-design-defaults.md`(규칙 초안, 39줄) · 이 REPORT · `PROGRESS.md`
- 요약: 금지 패턴 **15개**, 그중 **현재 코드에 실제 존재 6개**(6·7·8·9·10·11번 — 대부분 메인 대시보드 Hero/퀵메뉴·DS 프리뷰, 10번은 셸·도움말 모달 2곳). 나머지 9개는 현재 없음(1개는 이미 폐지+가드 존재).
- 재검증(2026-09-27, RESUME): 인용 근거 전수 grep/sed 재확인 — 틀린 근거 4건 수정(아래 7절), 확인 불가 1건 표기.

## 1. 조사한 디자인 소스

| 구분 | 경로 | 확인 내용 |
|---|---|---|
| 토큰 | `src/dash/tokens.css` (313줄) | 색·상태색(-soft/-text)·radius·shadow·dur·`.t-*` 타이포·`.tabular`·focus 규칙 |
| Tailwind | `tailwind.config.js` | 색 = CSS 변수 매핑, `rounded-card*`, `shadow-sm/md/lg`, `duration-tok*`, `ease-ds`, zIndex 스케일, dialog 키프레임. spacing 확장 없음 |
| 공용 컴포넌트 | `src/dash/components.tsx` | `UI.Button`(:169, variant 5종) · `Card`(:94) · `ChartCard`(:105) · `StatCard`(:67) · `StatusBadge`(:44) · `EmptyState`(:353) |
| shadcn 계열 | `src/dash/ui/*.tsx` | `alert.tsx`(variant default/info/success/warning/destructive) · `skeleton.tsx`(`Skeleton`,`PageSkeleton`) · `spinner.tsx` · dialog/popover/sheet(`shadow-lg`) · `dropdown-menu.tsx` |
| 그리드 | `src/dash/aggrid_theme.ts` · `src/dash/grid_frame.tsx` | `apfsTheme`(:41, tabular-nums :72) · `GridFrame`(:167) · `KpiBadge`(:114) |
| 대표 화면 | `src/dash/main.tsx` · `main_widgets.tsx` · `asset_funding.tsx` · `generic_list.tsx` · `subfund_manage.tsx` · `designsystem.tsx` · `auth_shared.tsx` | 메인 대시보드 Hero·퀵메뉴, AG Grid 정본(조성·출자 현황표), 스키마 리스트, DS 프리뷰, 인증 화면 |
| 기존 규약 | `.claude/skills/dashboard-ui/SKILL.md`(62줄) · `.claude/skills/color-tokens/SKILL.md`(58줄) | 차트·모션·StatusBadge 규칙, hex 금지 규약(중복 서술 금지 대상) |

조사 방법: 패턴별 `grep -rnE`(src, `*.tsx|*.ts|*.css`, `.test.` 제외) 후 히트를 한 줄씩 분류. **raw grep 수 ≠ 위반 수** — 아래 2절의 "오탐 사유" 참조.

## 2. 금지 패턴별 근거·현황

| # | 패턴 | 이 제품에 안 맞는 이유 | 현재 코드 | 구분 |
|---|---|---|---|---|
| 1 | 크림·오프화이트 배경 | 금융 표 화면은 중립 흰 표면에서 상태색 대비가 가장 정확 | 현재 없음. `--bg`/`--card` = `#FFFFFF`(tokens.css:29,31). 오탐: grep 히트는 전부 `#FFFFFF` | 신규 규칙 |
| 2 | 헤드라인 이탤릭 강조어 | 에디토리얼/마케팅 문법, 업무 화면 계층을 흐림 | 현재 없음. 오탐: `RichTextField.tsx:428`, `RichTextElements.tsx:101` 은 에디터 기능 | 신규 규칙 |
| 3 | "01/02/03" 섹션 번호 | 랜딩페이지 장식, 업무 흐름 번호와 혼동 | 현재 없음. 오탐: `regular_report_manage.tsx:86-90` 은 월 데이터 키 | 신규 규칙 |
| 4 | 장식용 monospace 라벨 | "개발자 감성" 장식, 한글 가독성 저하 | 현재 없음. 허용 사례: `auth_shared.tsx:462`(인증코드 값), `report.tsx:336`(코드 컬럼), 에디터 고정폭 옵션 | 신규 규칙(코드값 예외) |
| 5 | pill 버튼 | 소비자앱 톤, 버튼 모양이 `UI.Button`(rounded-[9px], components.tsx:192)과 불일치 | 현재 없음. `rounded-full` 30곳은 진행바(`ui/progress.tsx:27`)·점·카운트 배지(components.tsx:243) | 신규 규칙 |
| 6 | 그라데이션 배경/hero 배너 | 데이터보다 장식이 먼저 보임, 다크/라이트 대비 관리 난도↑ | **존재**: `tokens.css:90` `--gradient-hero`, `main.tsx:36`(적용)·`:40`(radial 광택 오버레이), `main_widgets.tsx:292,305,318,326,406` | 기존 화면 → 수정 제안만 |
| 7 | 글래스모피즘 | 반투명+블러는 수치 가독성·성능 저하 | **존재**: `main_widgets.tsx:307` `backdropFilter: blur(4px)`. 확인 필요: `shell.tsx:722` 스티키 헤더 반투명(기능적) | 기존 화면 → 수정 제안만 |
| 8 | 장식 일러스트/3D 타일 | 의미 없는 그림은 밀도를 낮춤 | **존재**: `main_widgets.tsx:264` `QuickIllustration`(회전 타일+광택+blur, :280-330), 사용처 `:421` | 기존 화면 → 수정 제안만 |
| 9 | 인페이지 카드 과한 그림자 | 카드가 떠 보이면 표 격자 정렬감이 깨짐 | **존재**: `main.tsx:33` Hero `shadow-md`. 공용 `Card`/`ChartCard` 는 `shadow-sm`(components.tsx:98,109)로 준수. 예외: 오버레이(`ui/dialog.tsx:73` 등), 인증 카드(`auth_shared.tsx:168`, 디자인 캔버스 정본) | 기존 화면 → 수정 제안만 |
| 10 | 이모지 아이콘 | 공공기관 업무 시스템 톤과 불일치, 플랫폼별 렌더 차이 | **존재 2곳**: `shell.tsx:638` 빈 즐겨찾기 안내 `설정(⚙)`(버튼은 `Icon name="settings"`, :634), `program_help_modal.tsx:98` 이미지 자리표시 `🖼`(aria-hidden). 오탐: 나머지 히트(`⚠` 493건·`★`·`✗`·`🔴` 등)는 주석 | 기존 화면 → 수정 제안만 |
| 11 | uppercase+자간 kicker | 한글 UI에서 무의미, 영문 SaaS 템플릿 흔적 | **존재**: `designsystem.tsx:34`(DS 프리뷰, 저우선). 허용: `ui/dropdown-menu.tsx:138` 단축키 힌트(`tracking-widest`, uppercase 없음) | 기존 화면 → 수정 제안만 |
| 12 | 그라데이션 텍스트 | 장식, 대비 검증 불가 | 현재 없음(`bg-clip-text` 0건) | 신규 규칙 |
| 13 | 색 좌측 스트라이프 카드 | 템플릿형 강조, 상태색 의미 희석 | 현재 없음. `borderLeft` 히트는 전부 1–2px 중립 구분선(`shell.tsx:435`, `confirm_combo.tsx:29`, `custody_confirm_detail_modal.tsx:42`) | 신규 규칙 |
| 14 | hex·rgba 리터럴 색 | 다크모드 추종 불가 | 실질 위반 없음. 비주석 hex 13줄 = 에디터 글자색 팔레트(`RichTextElements.tsx:47-54`)·외부 주소 위젯 테마(`AddressField.tsx:50-51`)·DS 스와치(`designsystem.tsx:182`). 단 6번 Hero의 `rgba(255,255,255,…)`(main.tsx:40,46,49,57 등)는 6번과 함께 처리 | 신규 규칙(`color-tokens` 스킬 참조) |
| 15 | 상태 배지 앞 점 | 2026-09-24 사용자 결정으로 폐지 | 현재 없음(가드 `src/dash/status_badge_no_dot.test.ts`) | 기존 결정 재확인 |

**금지하지 않은 것(의도적 선택으로 판단)**: `PopNumber`/`CountUp`/`TextsReveal`(`src/styles/transitions.css:128-129` 주석 · `src/dash/motion/count-up.tsx`; "사용자 도입" 여부는 확인 필요), `dialog-in` 3D 플립+blur(tailwind.config.js 주석, 2026-09-08/18 사용자 리포트 기반 조정), 인증 화면 `--radius-2xl`·`shadow-md`(claude.ai/design 캔버스 정본), 오버레이 `shadow-lg`.

## 3. 기존 코드 위반 현황과 수정 제안 (수행하지 않음)

| 우선 | 위치 | 제안 |
|---|---|---|
| 중 | `main.tsx:28-60` `HeroAUM`(시안 B) | 그라데이션+광택+`shadow-md` → `UI.Card`(`--card`, `shadow-sm`) + `.t-display` 수치. `--gradient-hero`·`--on-gradient-*` 토큰은 소비처 소멸 시 삭제 검토 |
| 중 | `main_widgets.tsx:264-330,421` `QuickIllustration` | 3D 타일·blur·광택 → `Icon` + `--muted` 배경 정사각 아이콘 칩(`rounded-card-sm`) |
| 하 | `designsystem.tsx:34` kicker | `.t-label`(uppercase 없이)로 교체 |
| 하 | `shell.tsx:638` `설정(⚙)` · `program_help_modal.tsx:98` `🖼` | 텍스트는 `설정`만 또는 인라인 `Icon name="settings"`, 자리표시는 `Icon name="image"` 류(아이콘 이름 실존 확인 필요) |
| 확인 | `shell.tsx:722` 헤더 `backdropFilter` | 스크롤 시 콘텐츠 비침은 기능적 — 유지 여부 사용자 판단 |

메인 대시보드는 "3개 레이아웃 시안"(CLAUDE.md) 중 하나라, 시안 자체를 유지할지가 먼저 결정돼야 한다.

## 4. 적용 제안 (다음 단계, Developer 몫)

`.claude/rules/` 디렉터리는 이 저장소에 **아직 없다**(조사 시 `ls .claude/rules` 실패). 권장안은 `.claude/rules/frontend-design-defaults.md` 로 신설하는 것이다 — `dashboard-ui` 스킬은 키워드 트리거라 항상 로드되지 않고, 그 스킬 58행이 "중복 금지"를 명시하므로 병합하면 색 규칙이 `color-tokens` 와 겹친다. 다만 프로젝트 `.claude/rules/*.md` 가 자동 로드되는지는 확인 필요 — 자동 로드가 안 되면 CLAUDE.md 포인터가 유일한 진입점이 된다. CLAUDE.md "편집 시" 절 포인터 문안:

> - **UI 신규 작업 전 `.claude/rules/frontend-design-defaults.md` 를 읽는다** — 금지 패턴 15개(그라데이션·글래스·pill 버튼·장식 일러스트 등)와 대체 토큰·컴포넌트. 기존 화면 위반은 지시 없이 고치지 않는다.

적용 후 1회차 UI 작업 결과에서 목록 밖의 기본 스타일(예: 새 장식 패턴)이 나오면 구체 패턴으로 추가한다(가이드의 반복 절차).

## 5. 확인 필요

1. `--muted #F0F3EE`·`--bg-deep #ECEFEA`(tokens.css:35,30)는 초록 틴트 중립색 — 1번 "오프화이트" 금지의 예외로 볼지(현재 판단: 예외, 페이지 배경이 아니라 보조 표면).
2. 간격(spacing) 토큰 부재 — 신설할지, Tailwind 기본 스케일을 공식화할지.
3. `shell.tsx:722` 반투명 헤더 유지 여부.
4. 메인 Hero 시안(B) 유지 여부 → 3절 수정 제안의 전제.
5. 프로젝트 `.claude/rules/` 자동 로드 여부.

## 6. 검증

- 규칙 초안 줄 수: `wc -l docs/design-rules/frontend-design-defaults.md` → 39 (목표 60 이하).
- 인용 이름 실존 확인: `apfsTheme`(aggrid_theme.ts:41), `DropdownMenuShortcut`(ui/dropdown-menu.tsx:137), `PageSkeleton`(ui/skeleton.tsx:67), `Alert` variant(ui/alert.tsx:15-22), `UI.Button` variant(components.tsx:169).
- 범위: `git diff --name-only main..HEAD | grep -vc '^docs/design-rules/'` → `0` (grep 은 매치 0건이라 exit 1 — 정상).
- **Codex 검증 미실행**: 전역 규칙상 Codex 리뷰가 완료 게이트이나, BRIEF 5절이 네트워크 호출을 금지해 실행하지 않았다. 문서 전용 변경이라 코드 게이트(tsc·lint·test)도 해당 없음.

## 7. 재검증 기록 (RESUME, 2026-09-27)

틀렸던 근거 4건(수정 완료):
1. `--muted` 위치 `tokens.css:36` → **:35** (36행은 `--muted-foreground`).
2. Hero rgba 인용 `main.tsx:45` → **:46**(45행엔 rgba 없음). 49·57행 추가.
3. 10번 이모지 "현재 없음" → **존재 2곳**(`shell.tsx:638`, `program_help_modal.tsx:98`). 기존 "452건 전부 주석" 서술도 틀림(현재 `⚠` 493건 + 기타 기호, 비주석 2곳).
4. `transitions.css:129` → 실제 경로 `src/styles/transitions.css`, 주석은 PopNumber만 언급 — `CountUp` 은 `src/dash/motion/count-up.tsx` 로 보강.

확인 불가 1건: 위 "사용자 도입" 서술(코드 주석에 근거 없음) → "확인 필요"로 표기.

그대로 확인된 근거: tokens.css:29,30,31,90 · components.tsx:44,67,94,98,105,109,169,192,243,353 · aggrid_theme.ts:41,72 · grid_frame.tsx:114,167 · ui/progress.tsx:27 · ui/dialog.tsx:73 · ui/dropdown-menu.tsx:137-138 · ui/skeleton.tsx:67 · ui/alert.tsx:15-22 · main.tsx:28-60,33,36,40 · main_widgets.tsx:264,292,305,307,318,326,406,421 · designsystem.tsx:34,182 · shell.tsx:435,722 · confirm_combo.tsx:29 · custody_confirm_detail_modal.tsx:42 · auth_shared.tsx:168,462 · report.tsx:336 · regular_report_manage.tsx:86-90 · fields/RichTextField.tsx:428 · fields/RichTextElements.tsx:47-54,101 · fields/AddressField.tsx:50-51 · dashboard-ui SKILL.md:58(62줄)·color-tokens SKILL.md(58줄) · `rounded-full` 30곳 · `bg-clip-text` 0건 · `.claude/rules` 부재 · tailwind `rounded-card*`/`duration-tok*`/`ease-ds` · `UI` export(components.tsx:371, `EmptyState` 포함) · `Spinner`(ui/spinner.tsx:26).
