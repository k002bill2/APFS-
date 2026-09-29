# APFS × shadcn/ui 정렬 검토 리포트

> 작성: 2026-07-03 · 브랜치: `feat/aggrid-context-menu`
> 방법: 4-에이전트 병렬 감사(커버리지 · fidelity 1조 · fidelity 2조 · CSS/토큰) + 종합 에이전트 재검증 + 수동 실측.
> 판정 라벨: **INTENTIONAL**(보존) / **DRIFT**(조치) / **GAP**(미도입).
> 근거 스냅샷: shadcn 카탈로그 64개(2026-07 fetch), `src/dash/ui/*.tsx` 12개, `tokens.css` / `tailwind.config.js` / `index.html`.

---

## 1. 한 줄 총평

**구조적으로는 shadcn에 충실, 표피적으로는 의도적으로 발산 — 정렬도 최상급이며 활성 DRIFT는 단 1건(초기 페인트 색 튐, 저위험)뿐이다.** "동일하게 맞추기"가 부분적으로만 옳은 이유: 이 저장소의 색 토큰이 **hsl 채널이 아니라 full-color(hex/rgba)** 이고 **Tailwind 3.4 + preflight:false + 커스텀 z 스케일** 위에 올라가 있어서, 정본 shadcn 스니펫을 그대로 복붙하면 `/NN` opacity 무음 드롭·`z-50` 가림·이중 포커스 링 같은 **검증된 버그가 부활**한다. 지금의 발산은 "덜 맞춰진 것"이 아니라 "이 스택에 맞게 이미 고쳐진 것".

---

## 2. 커버리지 (카탈로그 64개 그룹핑)

### 2-A. 정본형 보유 `have-ui` (12개) — 전부 발산 규약 준수, DRIFT 0

| 컴포넌트 | 파일 | 준수 규약 |
|---|---|---|
| Dialog / Alert Dialog / Sheet | `ui/dialog.tsx` `alert-dialog.tsx` `sheet.tsx` | z-overlay(75)/z-modal(80), bg-card, ring 제거, `bg-black/55`(네이티브 black=유효) |
| Popover | `ui/popover.tsx` | z-popover(85), bg-popover(=card-raised 별칭), p-0/w-auto |
| Dropdown Menu | `ui/dropdown-menu.tsx` | z-popover, highlight=bg-accent-surface, checked=`color-mix(primary 10%)` |
| Tooltip | `ui/tooltip.tsx` | 반전 표면, z-tooltip(90) |
| Command | `ui/command.tsx` | 우리 Dialog 위 구성, highlight=accent-surface, 입력 14px |
| Calendar / Date Picker | `ui/calendar.tsx` `date-picker.tsx` | react-day-picker v10, KST 'YYYY-MM-DD' 계약, non-modal Popover |
| Navigation Menu | `ui/navigation-menu.tsx` | 레일 플라이아웃, fixed 탈출 + 소비처 nav z-48 |
| Checkbox | `ui/checkbox.tsx` | Radix, brand-blue — ⚠️ 미배선(경미 GAP) |
| Sonner | `ui/sonner.tsx` | 토큰 인라인 테마 — ⚠️ theme 기본값 없음(GAP) |

### 2-B. 커스텀 등가물 `have-custom` — "missing" 아님

Button/IconBtn · Card/ChartCard/StatCard · Badge군(StatusBadge/DeltaBadge/CountPill/FilterChip) · Breadcrumb(PageHeader) · Sidebar(Shell Lnb/RailNav) · Tabs/Toggle/ToggleGroup(SegTabs) · Pagination · Progress · Separator · Label · Kbd · EmptyState · Avatar(ColorChip) · Collapsible · Combobox(부품 보유) · Typography(토큰 클래스). **도입 불필요.**

> **⚠️ 2026-07-03 override — Skeleton 정식 도입(위 목록에서 제외).** 당초 이 리포트는 Skeleton을 mask.tsx 등가물로 보고 "도입 불필요"로 분류했으나, 사용자 요청("전체 스켈레톤 적용")으로 정식 shadcn Skeleton을 신설·배선함. 산출물: (1) `ui/skeleton.tsx` — `Skeleton`(animate-pulse+`bg-muted`; 정본 `bg-primary/10`은 full-color 토큰 opacity 무음 드롭이라 금지) + `PageSkeleton`(라우트 로딩용 페이지 골격, responsive-ui 준수). (2) `app.tsx` — 라우트 전환마다 500ms 로딩창 합성(더미데이터라 실 async 없음) → PageSkeleton 노출. (3) mask.tsx MT / aggrid_shared.css 헤더 placeholder를 tokens.css `apfs-mask-pulse`(기저 .28↔중간 .12, reduced-motion 전역 무력화)로 **정적 바→펄스 승격**. 즉 로딩=PageSkeleton, 상시 데이터마스크=펄스 바로 이원화.

### 2-C. 의도적 아키텍처 대체 `missing-substituted` — 갭 아님

| shadcn | 대체 | 근거 |
|---|---|---|
| Data Table / Table | AG Grid (`aggrid_theme.ts`) | 발산#5 |
| Chart | 자체 SVG (`charts.tsx`) | 발산#5 |
| Form / Field / Input / Textarea / Select | 스키마 주도 폼(FIELD_CONTROLS/zod, `renderers.tsx` 네이티브) | 발산#5 |
| Drawer | Sheet | vaul 미도입 |
| Toast | Sonner | shadcn 공식도 Toast deprecated→Sonner |
| Context Menu | `row_context_menu.tsx`(body 포털) | AG Grid Community엔 컨텍스트 메뉴 없음 |

### 2-D. 진짜 갭 `missing-useful` — 도입 우선순위

| 갭 | 우선순위 | 도입 가치 |
|---|:--:|---|
| **Alert** (인라인 콜아웃/배너) | **MED** | 폼 검증 요약·경고 배너에 **대체물 없음**(Badge=뱃지, Toast=일시, EmptyState=빈상태). 유일한 중위험 갭 |
| Accordion | LOW | 키프레임/애니메이션 이미 config에 준비됨. 필터 섹션·상세 접기 |
| Hover Card | LOW | GP/자펀드 미리보기 |
| Input Group | LOW | 접두/접미 어펜던트 재사용 프리미티브(셸 검색은 일회성) |
| Item | LOW | 범용 list-item(실수요는 AG Grid 행/메뉴로 충족) |
| Scroll Area | LOW | 스타일 스크롤바 시각 통일(기능은 네이티브로 충족) |
| Spinner | LOW | 백엔드 없어 로딩 드묾 |

> **high 우선순위 갭 없음.** na 8개(Attachment/Bubble/Marker/Message/Message Scroller/Direction/Aspect Ratio/Input OTP/Menubar/Carousel)는 도메인상 수요 없음.

---

## 3. DRIFT (조치 대상)

### 🔴 D1. `index.html:16` 초기 배경색 불일치 — 유일한 CONFIRMED DRIFT (저위험 FOUC)
- **증상(실측 확인):** 인라인 테마 복원 스크립트가 라이트 초기 배경을 `#FBFCFB`로 하드코딩(`index.html:16`). 그러나 기본 cardtone(`card`, :15 폴백)의 실제 `--bg`는 `#F4F6F2`(`tokens.css:29`). → 기본 라이트 사용자는 첫 페인트에 `#FBFCFB`를 보다가 CSS 로드 후 `#F4F6F2`로 미세 리페인트되는 **색 튐**. (`#FBFCFB`는 seamless 무드의 --bg 값.)
- **조치:** 초기 배경을 기본 cardtone 값(`#F4F6F2`)에 맞추거나 무드별 계산. 다크(`#0F1310`)는 --bg와 일치 → 무관. 5분, 저위험.

### 🟡 D2/D3 (강등) — calendar / date-picker 포커스 링: **DRIFT 아님으로 재판정**
fidelity-2조가 `calendar.tsx:136`의 `group-data-[focused=true]:ring-2`를 이중 링 DRIFT로 태깅했으나 **실측 재검증 결과 false positive**. 해당 `<button>`은 같은 요소에 `ghostBtn`(`:130`)의 `focus-visible:outline-none`을 이미 가지며, 전역 outline이 켜지는 바로 그 `:focus-visible` 조건에서 이 유틸이 outline을 투명 오버라이드. 특이도(0,2,0)>(0,1,0), 소스순서로도 유틸 승. **어떤 포커스 경로에서도 이중 링 렌더 불가.** → §4-B로 흡수. 잔여는 "화면 간 포커스 표현 스타일 불일치"(국소 ring vs 전역 outline)뿐, 렌더 버그 아님.

> **활성 DRIFT = D1 단 1건.**

---

## 4. INTENTIONAL (보존) — "shadcn과 맞추려" 건드리면 버그 부활

### 4-A. Opacity modifier 무음 드롭 회피 — 최우선 보존
색 토큰이 full-color라 `bg-primary/90`·`ring-ring/50` 같은 `/NN`은 **CSS 규칙 자체가 생성 안 됨(무음 no-op)**. 실측: `ui/*.tsx` 전수에서 토큰 색 `/NN` 잔존 **0건**. 대체 3방식 — (1) `-hover` 토큰(`--primary-hover`), (2) `color-mix(in srgb,var(--x) N%,transparent)`, (3) 백드롭 `bg-black/55`(네이티브 black이라 정상).
> ⚠️ 정본 복붙 시 `hover:bg-primary/90`·`bg-destructive/90`은 반드시 `-hover` 토큰/`color-mix`로 치환.

### 4-B. Focus ring 통일 — 보존 (D2/D3 포함)
전역 `:focus-visible{outline:3px color-mix(--ring 45%);offset:2px}`(`tokens.css:211`)로 통일. 촘촘한 달력 셀은 국소 `ring-2 ring-ring`을 쓰되 **반드시 `focus-visible:outline-none` 동반**해 이중 링 회피.
> ⚠️ 컴포넌트별 shadcn `ring-2/ring-offset`를 outline-none 없이 추가 금지.

### 4-C. Z-scale 토큰 — 보존
포털 오버레이가 raw `z-50` 대신 config zIndex 토큰(overlay:75/modal:80/popover:85/tooltip:90)만 사용. 실측 `z-50` 잔존 **0건**. 셸 chrome(모달71/헤더50/플라이아웃47/드롭다운41) 위 정상 적층.
> ⚠️ 신규 오버레이도 z 토큰만, raw 정수 금지.

### 4-D. 그 외 보존
- **full-color 토큰 + bare var() 매핑** = shadcn CLI PR#10264 공식 지지 패턴. 형식 결함 아님.
- **별칭 토큰**: `--background=--bg`, `--card-foreground=--foreground`, `--popover=--card-raised`, `--destructive=--danger`, `--accent-surface=--muted`. var() 간접참조라 Tweaks 자동 추종·오염 없음.
- **accent 의미 분기**: `--accent`=navy 링크색 유지, 표면 의미는 `--accent-surface`(=muted). 정본 복붙 시 `bg-accent`→`bg-accent-surface` 치환 필수.
- **preflight:false + index.html border 리셋 + tokens.css box-sizing** = load-bearing. preflight 켜기 금물.
- **date-picker non-modal Popover 강제 / toISOString 금지** = KST 하루밀림·모달 2-click 회귀 방지 계약.

---

## 5. CSS / 토큰 판정

- **5-A. 토큰 계약 충족도 = 사실상 완전.** shadcn 필수 토큰 전부 존재(리터럴 또는 정상 별칭). 유일 부재 `--sidebar-*`(Sidebar 미사용 → 갭 아님).
- **5-B. borderRadius `rounded-md/lg/sm` 폴백 = preventive GAP(활성 버그 아님).** config는 `card/card-lg/card-sm`만 extend(`:31`), Tailwind 기본 `rounded-md/lg/sm`은 고정 rem으로 폴백돼 `var(--radius)`·Tweaks 반경을 추종 못 함. 현재 ui/* 전 컴포넌트가 `rounded-card*`만 사용(`rounded-(md|lg|sm)` 0건)이라 무해하나, 향후 복붙 사고 방어를 위해 config에 `borderRadius:{lg:'var(--radius)',md:'calc(var(--radius) - 2px)',sm:'calc(var(--radius) - 4px)'}` 추가 권장.
- **5-C. Focus ring specificity = 정상.** 전역 `:focus-visible`(0,1,0) < 유틸 `outline-none`(0,2,0), Tailwind v3 `@layer` 미출력 → 컴포넌트 오버라이드 정상 작동.
- **5-D.** tailwindcss-animate + accordion 키프레임 이미 준비(`config:37-44`) → Accordion 도입 시 재정의 불필요.

---

## 6. 권고 로드맵 (코드 변경은 제안만)

### 🟢 지금 고칠 것 (DRIFT, 1건)
1. **`index.html:16`** 초기 배경을 기본 cardtone(`#F4F6F2`)에 맞춤 — 색 튐 제거.

### 🔵 예방적 배선 (paste-time 함정 방어)
2. **config borderRadius**에 `lg/md/sm` 체인 추가(5-B) — 급하지 않음.

### 🟣 진짜 갭 도입 순서
3. **Alert (MED, 먼저)** — 인라인 콜아웃/경고 배너. 유일한 중위험 갭.
4. **checkbox.tsx 배선** — 폼이 네이티브 checkbox 사용 중, 통일 시 renderers.tsx에서 소비.
5. **dropdown-menu 파트 보강** — CheckboxItem/Sub/Shortcut/Portal, 소비처 요구 시.
6. **sonner theme 기본값** — 누락 시 폴백 문서화.
7. **Accordion / Hover Card / Input Group / Item / Scroll Area / Spinner (LOW)** — 실수요 발생 시.

### ⛔ 절대 "shadcn과 맞추려" 건드리지 말 것
`/NN` opacity(→-hover/color-mix 유지) · z 토큰(75/80/85/90) · 전역 outline+국소 ring(outline-none 동반) · `bg-accent`→`bg-accent-surface` · `toISOString` 금지 · non-modal Popover · preflight:false.

---

**결론:** near-zero drift. 발산은 전부 의도적·문서화됨. **정본 shadcn을 그대로 복붙하는 행위 자체가 opacity/z/ring 버그를 재도입하는 경로.** 실익의 대부분은 index.html 색 튐 1건 + 예방적 borderRadius 배선 + Alert 도입.

---

## 7. 조치 이력 (2026-07-03)

### ✅ D1 해소 — `index.html:16` 초기 배경 색 튐
인라인 테마 복원 스크립트가 라이트에 무조건 `#FBFCFB`(seamless 값)를 쓰던 것을, 복원된 `cardtone × theme`의 실제 `--bg` 리터럴 맵으로 교체.
```js
var BG = { card:{light:"#F4F6F2",dark:"#0F1310"}, seamless:{light:"#FBFCFB",dark:"#121613"}, tint:{light:"#E8F0E5",dark:"#0C140E"} };
r.style.background = (BG[cardtone]||BG.card)[dark?"dark":"light"];
```
`--bg`는 cardtone에만 의존(accent/surface 불변) → 3 cardtone × 2 theme = 6값으로 완결. tokens.css(:29,125)+tweaks.css(:56,59,66,68)와 1:1 동기화. 기본(card) 라이트 튐 제거 + tint 무드 튐까지 부수 해소. tokens/tweaks의 --bg 변경 시 여기도 갱신하라는 주석 부착.

### ✅ Alert 도입 — `src/dash/ui/alert.tsx` (신규)
cva 기반(정본 구조) + APFS 규약: variant 색을 `-soft` 배경 토큰 + 솔리드 전경 토큰 + `color-mix` 테두리로 구성(정본의 `text-destructive/90` 같은 `/NN` opacity 모디파이어 회피 — 빌드 CSS로 5개 테두리 클래스 생성 확인, 무음 드롭 없음). variant 5종: default/info/success/warning/destructive. shadcn ring 없음(비대화형). `rounded-card`(토큰 반경). 아이콘은 자체 `Icon`(currentColor→`[&>svg]:text-*`로 색). `designsystem.tsx §3-1`에 쇼케이스 배선. **브라우저 검증: 라이트/다크 양쪽 5 variant 정상 렌더·대비 확보, 빌드 green.**

### ✅ 진짜 갭 6개 전량 도입 (2026-07-03 추가)
사용자 요청으로 §2-D의 미도입 갭 6종을 모두 정본형으로 이식. 설치: `@radix-ui/react-accordion` `react-hover-card` `react-scroll-area` `react-slot`(Item asChild용). 신규 파일 `src/dash/ui/`: `accordion.tsx` `hover-card.tsx` `scroll-area.tsx` `spinner.tsx` `input-group.tsx` `item.tsx`.

| 컴포넌트 | 의존성 | 적용 규약 / 적응 |
|---|---|---|
| Accordion | Radix | config의 accordion-down/up 키프레임 그대로, 트리거 전역 outline, border-border |
| Hover Card | Radix | z-popover, bg-popover, rounded-card, Portal(조상 쌓임맥락 탈출), outline만 |
| Scroll Area | Radix | 썸 bg-border-strong(네이티브 스크롤바 색과 일치), /NN 없음 |
| Spinner | 없음 | 정본 그대로(lucide LoaderIcon + animate-spin) |
| Input Group | 없음 | **v4→3.4 적응**: public API(align/size/variant) 유지, 내부는 flex+order+38px 폼표준+토큰. focus-within 그룹 표시 |
| Item | 없음(+react-slot) | **v4→3.4 적응**: cva variant(default/outline/muted)·size(default/sm/xs)·ItemMedia variant(default/icon/image), asChild=Slot, rounded-card |

**검증**: 빌드 green(신규 클래스 `animate-accordion-*`·`animate-spin` CSS 생성 확인). `designsystem.tsx §3-2`에 6종 쇼케이스 배선. 브라우저 라이트/다크 양쪽 렌더 + 인터랙션(Accordion 펼침·Hover Card 팝오버) 정상. Accordion 다크 트리거 대비는 computed color 실측 `#E6EBE2`로 확인(스크린샷 흐림은 압축 아티팩트).

> **커버리지 갱신**: `ui/` 정본형 13 → **19개**. §2-D 진짜 갭 잔여 **0**. (커스텀 등가물·의도적 대체는 정본화 안 함 — 회귀 위험.)

### ⏸️ borderRadius 예방 배선 — 의식적 보류 (config 변경 안 함)
config `borderRadius`에 `lg/md/sm` = `var(--radius)` 체인을 추가하면 **기존 `rounded-lg/md/sm` 사용처 14곳(risk·performance·report·asset·components FilterChip·richtext.css)의 반경이 전부 바뀌는 시각 회귀**가 발생(`lg` 8→12px 등). 가상의 미래 복붙 버그 방어 < 현재 14건 회귀 → **config 변경 대신 규약으로 해결**: shadcn 생성물 복붙 시 `rounded-(lg|md|sm)` → `rounded-card*` 치환을 체크리스트로. (실제 정본 도입 시점에 해당 파일만 국소 조치.)
