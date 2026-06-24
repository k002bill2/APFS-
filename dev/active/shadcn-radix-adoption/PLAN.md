# shadcn/ui + Radix UI 도입 — 현황 분석 및 구축 계획

> 작성: 2026-06-22 · 브랜치: `feat/tailwind-token-migration`
> 근거: 4-에이전트 워크플로우(context7 요구사항 리서치 + 손짠 상호작용 프리미티브 인벤토리 + opacity 모디파이어 빌드 검증 + 적대적 비평) 결과 종합. 빌드 검증·비평가 정정은 **경험적 사실**이므로 추측과 구분해 표기.

---

## 0. 한 줄 요약

**shadcn/ui와 Radix는 별개 도입이 아니다** — shadcn/ui는 Radix 프리미티브 위에 Tailwind 스타일을 입힌 **복붙 컴포넌트**다. 이 프로젝트에서 가치는 "UI 교체"가 아니라 **손으로 짠(혹은 없는) 상호작용 프리미티브의 a11y 공백 메우기**다. 표시용(Button/Card/StatCard/차트/배지)은 유지하고, Dialog·DropdownMenu·Popover·Tooltip·Command·AlertDialog·Toast 등만 Radix로 도입한다.

---

## 1. 현황 (As-Is)

### 1.1 스택
| 항목 | 현재 |
|------|------|
| 빌드 | Vite 5 + React 18.3 + TypeScript(strict:false) |
| 스타일 | Tailwind 3.4, `darkMode:'class'`, **`corePlugins.preflight:false`** |
| 토큰 | `tokens.css` CSS 변수(**hex/rgba 직접값**), `:root` + `.dark` |
| config 매핑 | `colors`를 `hsl()` 래핑 없이 **bare `var(--x)`** 직접 매핑 |
| 컴포넌트 | 자체 `UI` 객체(`components.tsx`) — Button/Card/StatCard/ChartCard/StatusBadge/SegTabs/FilterChip/IconBtn 등 |
| 아이콘 | 자체 `Icon`(`icons.tsx`) + vanilla `lucide`(lucide-react 아님) |
| 차트 | 자체 SVG 프리미티브(`charts.tsx`) |
| 런타임 토큰 조정 | Tweaks 패널 — **`data-accent/surface/cardtone` 속성 토글 + tweaks.css 정적 규칙**, localStorage엔 **무드 키만** 저장 |
| 유틸 | 자체 `cx() = a.filter(Boolean).join(' ')` (tailwind-merge 없음) |
| 의존성 | react, react-dom, lucide, zod. **Radix/cva/clsx/tailwind-merge/lucide-react 전무** |
| 경로 별칭 | **`@/` 미설정**(tsconfig paths·vite alias 둘 다 없음) |

### 1.2 상호작용 프리미티브 인벤토리 (모두 손짠 구현, Radix 전무)

**모달 (공통 결함: focus trap·초기 포커스·포커스 복귀 전무)**
- `RowFormModal`(generic_list) — 🔴 **최약체**: `role=dialog`/`aria-modal`/Escape 자체가 없음. 주 CRUD 폼. → `Dialog` (삭제확인은 `AlertDialog`)
- `ListFilterDrawer`(generic_list) — role/aria/inert 있음, portal 사용. → `Dialog`(Sheet 패턴)
- `포트폴리오 상세필터 드로어`(performance) — portal 미사용(클리핑 취약). → `Dialog`
- `CenterModal`/`NotifCenter`/`RegisterModal`/`MenuPickerModal` — aria-modal·focus 관리 부분/전무. → `Dialog`(+ `Tabs`)

**드롭다운 (공통 결함: 마우스 전용, aria-haspopup/menuitem 없음)**
- `MoreMenu`(performance+generic_list **중복 정의**) — 🔴 키보드 불가. → `DropdownMenu`
- `UserMenu`/`RoleSwitch`(shell) — 키보드 불가. → `DropdownMenu`(RadioGroup 항목) 또는 `Select`

**네비게이션 (🔴 주 네비가 키보드 비접근)**
- `Lnb 접힘-레일 호버 플라이아웃`(shell) — onMouseEnter 전용, 키보드 진입 경로 전무. → `NavigationMenu`
- `RailNav 라벨 툴팁`(shell) — 호버 전용 손짠 툴팁(포커스 시 안 뜸). → `Tooltip`

**폼 컨트롤**
- `RowCheck`(performance) — 🔴 **실제 키보드 버그**: `role=checkbox`+tabIndex인데 `onKeyDown` 없어 Space/Enter 토글 불가. → `Checkbox`
- `SegTabs`(components) — `tablist/tab` 시맨틱 없음, 화살표키 없음. 콘텐츠 탭 → `Tabs` / 뷰 토글 → `ToggleGroup`
- 네이티브 `<select>` 다수 — **이미 접근가능**(a11y 사유 교체 대상 아님, 스타일 일관성 한정 저우선)

**유지 대상(Radix 불필요)**: UI.Button/Card/ChartCard/StatCard/StatusBadge/DeltaBadge/CountPill/ColorChip/IconBtn/FilterChip/EmptyState, Charts.*, Icon, PageHeader/브레드크럼, tweaks-panel 내부 컨트롤.

### 1.3 도입 가치 큰 신규 프리미티브 (현재 아예 없음)
| 프리미티브 | 근거 |
|-----------|------|
| **Toast**(=sonner) | save/delete/bulkDelete/addRow 등 **모든 CRUD가 피드백 0**. 가치 최대 |
| **Command 팔레트**(cmdk) | GNB가 `/` `<kbd>` 힌트만 렌더, 실제 팔레트 없음. 137개 리프 메뉴 이동에 최적 |
| **Tooltip** | RailNav 라벨·IconBtn title 의존(키보드/모바일 약함) |
| **AlertDialog** | 파괴적 삭제가 인라인 2단계 또는 확인 없이 즉시 실행 |

---

## 2. 핵심 판정 (워크플로우 검증 결과)

### 2.1 ✅ 토큰 "형식" 충돌은 없다
이 프로젝트의 bare `var(--x)` 매핑은 2026-04 shadcn CLI **PR #10264로 공식 지지된 패턴**(CSS 변수가 hex/rgb/oklch면 `hsl(var())` 대신 `var()` 직접 참조). shadcn 컴포넌트는 이 매핑 위에서 정상 렌더된다. 진짜 작업은 형식이 아니라 **네이밍 갭 + 의미 갭** 메우기.

### 2.2 🔴 [경험적 증명] opacity 모디파이어는 무음 실패한다
2회 production 빌드(둘 다 green) + 대조군으로 **결정적 증명**:
- `bg-primary/80`, `bg-card/60`, `text-foreground/70`, `border-border/50`, `ring-ring/40` → **CSS 규칙 0개 생성**(무음 드롭)
- 대조군 `bg-red-500/80` → `#ef4444cc` 정상 / `mt-[123px]` 스캔 witness 정상 → 메커니즘은 작동, **원인은 `var()` full-color 포맷에 한정**
- bare 유틸은 정상: `.bg-primary{background-color:var(--primary)}`

**함의**: shadcn이 ship하는 `hover:bg-primary/90`(Button), `/80`·`/50`(Badge/Alert/Dropdown) 등이 **전부 no-op**. 빌드 에러·경고 0이라 발견이 늦다. → **토큰 전략의 핵심 분기점**(§3.2).

### 2.3 🔴 [비평가 정정] Tweaks는 채널 마이그레이션에 안전하지 않다(단 비용은 다른 곳)
브리프의 "Tweaks가 런타임 setProperty로 full-color hex 영속"은 **사실 오류**. 실제: `documentElement`에 `data-*` 속성만 토글, 색은 **tweaks.css의 ~30개 정적 hex 규칙**, localStorage엔 무드 키만.
- **옵션1(full-color 유지)** → Tweaks **완전 무손상**
- **옵션2(채널 마이그레이션)** → 비용은 "persisted state 마이그레이션"이 아니라 **tweaks.css ~30개 hex를 채널 트리플로 재작성** + tokens.css 전 토큰 재정의 + config `rgb(var()/<alpha-value>)` 래핑의 **조율된 변경**

### 2.4 🔴 [확정] 이중 포커스 링
`tokens.css:183`의 `:focus-visible{outline:3px}`가 **`@layer` 밖(unlayered)**이라 캐스케이드상 `@layer utilities`(shadcn `focus-visible:outline-none`)를 **항상 무력화**. 모든 shadcn 요소가 outline 3px + ring 2px 이중 링. → **`:where(:focus-visible)`로 specificity 0화**.

### 2.5 🔴 z-index 충돌
셸이 Tailwind z 스케일(max 50) 밖 **raw 정수** 광범위 사용: 모달 71 / 백드롭 70 / 레일 툴팁 70 / FAB 60 / GNB 헤더 50 / 플라이아웃 47 / 드롭다운 41. shadcn은 portal에 **z-50** ship. → 헤더 메뉴 동률 충돌, 기존 NotifCenter(71) 위 shadcn Dialog(50) 깔림. **통일 z 스케일 필요**(혼재 기간이 최대 위험).

### 2.6 🟢 안전 확인 (조치 불필요, 단 주의)
- **portal 토큰 상속**: `.dark`·`data-*`가 `documentElement`에 → body portal이 정상 상속(브리프 우려 반증). 영속 ancestor transform 없음.
- **다크모드**: 양쪽 `.dark` 기반으로 메커니즘 합치(단 신규 토큰은 `:root`/`.dark` **쌍으로** 정의해야 대비 유지).
- **preflight:false**: `index.html:29`의 border 리셋 + `tokens.css:163`의 box-sizing이 shadcn 베이스라인을 이미 보정. → **유지가 정답, 켜는 것은 금물**(기존 커스텀 CSS 캐스케이드 광범위 파손). 두 규칙은 **삭제 금지 load-bearing**.

---

## 3. 전략 결정

### 3.1 도입 방식: **Manual install (shadcn init 자동 실행 금지)**
`shadcn init`은 tailwind.config/globals를 재작성해 수작업 bare-var colors·hex 토큰·Tweaks 시스템을 덮어쓸 위험. → `lib/utils.ts`(cn) + `components.json`만 수동 배치, `shadcn add <component>`로 개별 가져오되 생성물 토큰명을 프로젝트 매핑에 맞춰 점검.

### 3.2 토큰 전략: **옵션1 권장 (full-color 유지 + opacity 모디파이어 금지)**
| | 옵션1 (권장) | 옵션2 |
|---|---|---|
| 방식 | full-color 토큰 유지, `/NN` 모디파이어 대신 `-hover` 토큰·`color-mix` 사용 | 토큰을 채널(`--primary:14 150 59`)로 재정의 + config `rgb(var()/<alpha-value>)` |
| opacity 모디파이어 | ❌ 금지(생성물에서 grep 치환) | ✅ 동작 |
| Tweaks | 무손상 | tweaks.css ~30 hex 재작성 필요 |
| 비용 | 낮음 — 누락 토큰 추가 + 생성물 `/NN` 치환 | 높음 — config+tokens+tweaks 조율 변경 |
| 근거 | 프로젝트가 이미 `color-mix`/`--primary-hover` 사용 | opacity 모디파이어가 정말 광범위 필요할 때만 |

> 권장: **옵션1**. shadcn 생성물의 `hover:bg-primary/90` → `hover:bg-primary-hover`(이미 존재) 또는 `hover:bg-[color-mix(in_srgb,var(--primary)_90%,transparent)]`로 치환을 **PR 체크리스트에 고정**.

### 3.3 아이콘: lucide-react로 통일 OR 생성물 import를 자체 Icon으로 치환(번들 절감) — **택1 필요**

---

## 4. 구축 단계

### Phase 0 — 기반 (Foundation) ⏱ 선행 필수
1. **의존성 추가**: `class-variance-authority` `clsx` `tailwind-merge` `lucide-react` `tailwindcss-animate` (+ 이후 프리미티브별 `@radix-ui/react-*`, `cmdk`, `sonner`)
2. **`cn()` 유틸**: `src/lib/utils.ts`에 `cn = twMerge(clsx(...))`. 기존 `cx`는 점진 교체(상위호환).
3. **`@/` 별칭**: `tsconfig.json` paths `{"@/*":["./src/*"]}` **AND** `vite.config.ts` `resolve.alias` **둘 다**(Vite는 tsconfig paths 자동 적용 안 함).
4. **`components.json`**: style=default, rsc=false, tsx=true, tailwind.config 경로 지정, cssVariables=true, aliases를 src 구조에 맞춤(예 `src/dash/ui`).
5. **tailwind.config**: `plugins`에 `require('tailwindcss-animate')`; `keyframes/animation`에 accordion-down/up; `borderRadius`에 lg/md/sm을 `var(--radius)` 기반 추가(현 card/card-lg/card-sm와 별개).
6. **신규 토큰**(`:root`+`.dark` **쌍으로**): `--background`(=`--bg`), `--card-foreground`, `--popover`(+`-foreground`, =card 값), `--destructive`(=`--danger` #FF6B42)+`--destructive-foreground`(#FFFFFF), **`--accent-surface`(+`-foreground`)** 신설. config `colors`에 bare `var()` 매핑 추가.
7. 🔴 **[high] `--accent` 의미 분리**: shadcn `bg-accent`(메뉴 hover 표면)를 **`--accent-surface`로 매핑**, 기존 navy 링크색 `--accent` 유지. Tweaks 무드 블록엔 `--accent-surface` **미포함**(메뉴 hover가 무드에 끌려가지 않게).
8. 🔴 **[high] 이중 포커스 링 해소**: `tokens.css:183` `:focus-visible` → `:where(:focus-visible)`. ring 경로 택 시 `--ring-offset` 배경 토큰 정의.
9. 🔴 **[high] 통일 z 스케일**: `tailwind.config theme.extend.zIndex` 명명 + shadcn 생성물 z-50을 셸 chrome 위로 상향(예 z-[80]).
10. 🟢 `index.html:29` border 리셋 + `tokens.css:163` box-sizing에 **"삭제 금지 load-bearing"** 주석.
11. 🔴 **[high] opacity 모디파이어 금지 규약**: 생성물 `/NN` 모디파이어 전수 grep → 치환(옵션1).

### Phase 1 — 고우선 교체 (a11y 결함 직접 해소)
- `Dialog` 공용 추출 → `RowFormModal`(최약체) 우선, `ListFilterDrawer`/상세필터 드로어(Sheet 패턴)
- `DropdownMenu` → `MoreMenu`(중복 정의 통합)/`UserMenu`/`RoleSwitch`
- `Checkbox` → `RowCheck`(키보드 버그 수정) + generic_list 네이티브와 일관화
- `AlertDialog` → 파괴적 삭제 확인(인라인 2단계 대체)

### Phase 2 — 네비게이션 a11y (키보드 진입 경로 확보)
- `Tooltip`(Provider) → RailNav 라벨/IconBtn title 통일
- `NavigationMenu` → Lnb 접힘-레일 호버 플라이아웃(키보드 경로)

### Phase 3 — 신규 가치 프리미티브
- `Toast`(sonner) → 전 CRUD 피드백 배선
- `Command`(cmdk) → GNB `/` 힌트가 약속한 팔레트(137개 리프 이동)
- `Tabs`/`ToggleGroup` → SegTabs 두 용도 분리(콘텐츠 탭/뷰 토글), NotifCenter·MenuPicker 손짠 탭 통합

### Phase 4 — 저우선
- `Collapsible`(다중오픈) → LNB 서브그룹 펼침
- `Select` → 스타일 일관성(a11y 사유 아님)
- `Calendar`(react-day-picker)/`Pagination` → Radix 외 영역, shadcn 빌드업

---

## 5. 사용자 의사결정 (2026-06-22 확정 ✅)

1. **토큰 전략** → **옵션1 (full-color 유지)**. opacity 모디파이어 금지, 생성물 `/NN` → `-hover` 토큰·`color-mix` 치환. Tweaks 무손상.
2. **아이콘** → **lucide-react 추가**. shadcn 생성물 그대로 사용(자체 Icon + vanilla lucide와 공존).
3. **스코프** → **Phase 0–3**. 기반 + 고우선 a11y 교체 + 네비 a11y + 신규 가치(Toast/Command/Tabs). Phase 4(저우선)는 후속.

---

## 6. 리스크 요약 (실행 전 반드시 처리할 high 4건)
| # | 충돌 | 처리 |
|---|------|------|
| 1 | opacity 모디파이어 무음 드롭 | 옵션1 + `/NN` grep 치환 규약 |
| 2 | `--accent` 의미 충돌 | `--accent-surface` 신설, 무드 미포함 |
| 3 | 이중 포커스 링(확정) | `:where(:focus-visible)` |
| 4 | z-index 충돌 | 통일 z 스케일, 혼재 기간 관리 |

> 검증된 결론: 하이브리드(공백 메우기) 전략은 **타당**하고 a11y 이득(focus trap·키보드·메뉴 시맨틱)이 비용을 정당화. 위 high 4건을 Phase 0에서 선제 처리하면 무음 회귀 없이 도입 가능.

---

## 7. 진행 현황 (2026-06-22)

### ✅ Phase 0 — 기반 (완료, 빌드 green)
- 의존성: `class-variance-authority` `clsx` `tailwind-merge` `lucide-react` `tailwindcss-animate` `@radix-ui/react-dialog` `@types/node` 설치
- `src/lib/utils.ts` — `cn()` 추가
- `@/` 별칭 — `tsconfig.json` paths + `vite.config.ts` resolve.alias 양쪽
- `components.json` — manual install 설정(aliases를 `@/dash/ui` 등으로)
- `tailwind.config.js` — tailwindcss-animate 플러그인, accordion 키프레임/애니메이션, **z-scale(overlay/modal/popover/tooltip)**, 신규 색 토큰(background/card-foreground/popover(+fg)/destructive(+fg)/accent-surface(+fg)/input/secondary-foreground)
- `tokens.css` — shadcn 별칭 토큰(var() 간접참조로 .dark/Tweaks 자동 추종), box-sizing load-bearing 주석
- `index.html` — border 리셋 load-bearing 주석
- high 충돌 처리: ① opacity 금지(별칭+color-mix 규약) ② `--accent-surface` 신설 ③ 포커스링은 컴포넌트에서 shadcn ring 제거→전역 outline 통일 ④ z-scale

### ✅ Phase 1 — 고우선 a11y 프리미티브 (완료, 전부 브라우저 검증)
프리미티브 신규: `src/dash/ui/` 에 `dialog.tsx` `dropdown-menu.tsx` `checkbox.tsx` `alert-dialog.tsx`
설치: `@radix-ui/react-dialog` `react-dropdown-menu` `react-checkbox` `react-alert-dialog`

- **Dialog** → `RowFormModal`(최약체) 교체. 검증: 첫 입력 자동 포커스(focus trap)·**Escape 닫기(기존 미구현)**·포커스 복귀.
- **DropdownMenu** → `MoreMenu`(performance+generic_list **중복 정의 통합**)·`UserMenu`·`RoleSwitch`(RadioGroup) 교체. 검증: **ArrowDown 키보드 내비**·aria-haspopup·menuitem 시맨틱(기존 마우스 전용 해소). 규약: 항목 hover `bg-accent-surface`(브랜드 navy 아님·무드 비종속).
- **Checkbox** → `RowCheck` 교체. 검증: Role=checkbox·aria-label·**Space 키 토글**(aria-checked false→true, 기존 onKeyDown 누락 **버그 수정**).
- **AlertDialog** → performance 일괄삭제(`deleteSelected`, **기존 확인 없이 즉시 삭제**)에 확인 단계 추가. 검증: "선택 항목 삭제" 다이얼로그(취소/삭제 danger)·selCount 반영·Escape 취소.
- 전 과정 라이트/다크 양쪽 정상, **콘솔 경고/에러 0**, 빌드 green(매 단계).

포커스 규약 확정: shadcn 생성물의 `ring-*`/`outline-none` 대신 **tokens.css 전역 `:focus-visible` outline으로 통일**(이중 링 회피, 캐스케이드-안전).

### ✅ Phase 3-a — Toast (sonner) (완료, 브라우저 검증)
- `src/dash/ui/sonner.tsx` — APFS 토큰(popover 표면)으로 테마한 Toaster. 설치 `sonner`.
- `app.tsx` 루트에 `<Toaster theme={theme}/>` 마운트(라이트/다크 연동).
- CRUD 피드백 배선(기존 **피드백 0** → 전부 토스트): generic_list `save`(등록/수정)·`deleteOne`·`bulkDelete`, performance `addRow`·`deleteSelected`.
- **브라우저 검증**: 선택 → 확인(AlertDialog) → 삭제 → 우하단 토스트 "1개 항목을 삭제했습니다"(✓, 토큰 스타일) + 행 삭제 동시 확인. 콘솔 에러 0.

### ✅ Phase 3-b — Command 팔레트 (cmdk) (완료, 브라우저 검증)
- `src/dash/ui/command.tsx` — shadcn Command(cmdk) 위에 우리 Dialog로 CommandDialog 구성. 설치 `cmdk`.
- `shell.tsx` — `flattenMenu(role)`(MENU 3-레벨 → 역할필터 평탄화) + `MenuCommand`. GNB 검색 `<label>`을 팔레트 트리거 `<button>`으로 교체, 전역 `/`·⌘K 키 핸들러.
- **브라우저 검증**: `/` 키로 오픈 · 카테고리 그룹·상위분류 라벨·역할필터 렌더 · 키보드(↓/Enter)+마우스 선택 · **"자펀드 공고 정보관리" 클릭 → 정확히 해당 페이지로 라우팅**(브레드크럼 일치). 콘솔 에러 0. (타이핑 필터는 cmdk 표준 동작이나 자동화 도구의 한글 IME 한계로 미검증.)

### ✅ Phase 2-a — Tooltip (완료, 브라우저 검증)
- `src/dash/ui/tooltip.tsx` — Radix Tooltip(반전 표면 bg-foreground/text-bg, z-tooltip, 호버+포커스 노출). 설치 `@radix-ui/react-tooltip`.
- `app.tsx` 루트에 `<TooltipProvider delayDuration={300}>` 추가.
- **공유 `IconBtn`(components.tsx) 한 곳 수정** → 네이티브 `title` 제거하고 `label` 있을 때 Radix Tooltip으로 래핑 → **앱 전역 모든 아이콘 버튼에 전파**(GNB·FAB·모달 등).
- **브라우저 검증**: GNB 햄버거 호버 → "메뉴 접기/펴기" 툴팁 렌더(반전 표면). 콘솔 에러 0.

### ✅ Phase 3-c — SegTabs → ToggleGroup (완료, 빌드 green)
- `components.tsx`의 공유 `SegTabs` 내부를 `@radix-ui/react-toggle-group`(type=single)로 교체. API(options/value/onChange/size)·비주얼 보존, 활성 재클릭 시 해제 방지. **모든 호출처가 화살표키 내비+roving tabindex** 획득.

### ✅ Phase 1 잔여 모달 → Dialog/Sheet (완료, Sheet 브라우저 검증)
- `src/dash/ui/sheet.tsx` 신규(Radix Dialog 기반 측면 슬라이드, side=right/left, slide 애니메이션). 설치 없음(react-dialog 재사용).
- **Dialog 전환**: `RegisterModal`(performance) · `CenterModal`(shell) · `NotifCenter`(shell, 5-tab) · `MenuPickerModal`(main_widgets).
- **Sheet 전환**: `ListFilterDrawer`(generic_list 상세필터) · `FilterDrawer`(performance 포트폴리오 상세필터). `createPortal` 수동 드로어 제거.
- **브라우저 검증**: 상세필터 → 우측 슬라이드 Sheet(딤 오버레이·전체높이·체크박스/슬라이더/select·초기화/적용), 닫기 X에 Tooltip. 콘솔 에러 0.

### ⏭ 남은 1건 — 의도적 보류
- **Phase 2 NavigationMenu (Lnb 접힘-레일 호버 플라이아웃)** — `shell.tsx`의 hover 타이머+portal+MenuChildren이 얽힌 정교한 동작 코드. Radix NavigationMenu 전면 재작성은 **주 네비게이션 회귀 위험**이 커 별도 집중 작업으로 권장. **핵심 키보드-내비 갭은 Command 팔레트(`/`·⌘K → 137개 리프 전부 키보드 접근)가 이미 대체**하므로 우선순위 낮음. 착수 시: Lnb 상위항목 트리거를 NavigationMenu.Trigger로, 플라이아웃을 NavigationMenu.Content로 재구성 + 포커스 진입/roving 처리.
