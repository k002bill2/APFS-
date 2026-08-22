# APFS 디자인 시스템 — 정본 지도

> 농림수산식품모태펀드 투자자산관리시스템(APFS) 대시보드의 **디자인 시스템 우산 문서**.
> 이 문서는 "무엇이 어디에 정의돼 있는가(SSOT)"와 **다른 문서가 다루지 않는 규격**(타이포 스케일·폼 컨트롤 높이·모션·컴포넌트 계층·데이터 마스크)을 다룬다.
> 색·z-index·접근성·반응형은 **각각의 정본 문서/스킬로 위임**한다 — 여기에 값을 중복 기재하면 drift가 된다.

## 이 문서의 전제 (읽기 전 확인)

| 항목 | 내용 |
|------|------|
| 파일 위치 | 저장소 문서 관례(`docs/COLOR_TOKENS.md`·`A11Y.md`·`Z_INDEX.md`)에 맞춰 **`docs/DESIGN.md`** 로 배치 |
| 팔레트 해석 | 작성 시 제시된 `:root` 블록은 **현행 팔레트의 내보내기**로 해석했다(적용할 변경분이 아님). 값 대조 결과 `--primary`·`--gradient-hero`·`--chart-1…19`·radius/shadow/ease 모두 `src/dash/tokens.css`와 **일치** |
| ⚠ 불일치 1건 | 내보내기에만 있는 **`--brand: oklch(.623 .214 259.815)`** 는 `tokens.css`에 대응 토큰이 없다. 이 값은 `#2B7FFF` = **Tailwind CSS v4의 `blue-500` 기본값**으로, 디자인 툴 스타일시트의 잔재로 보인다(APFS 브랜드색 `--brand-blue #6366F1`·`--accent #3B82F6` 어느 쪽과도 다름). **도입 불필요 — 무시**한다. 정말 새 브랜드색을 원한다면 별도 결정 사항 |
| ⚠ stale 경고 | 루트 `CLAUDE.md`의 "디자인 토큰 / 브랜드" 절은 아직 **forest-green**(`--primary:#0E963B` 등)을 적고 있다 — 2026-06-29 인디고 전환 이전 값이다. **`tokens.css`가 정본** |

---

## 1. SSOT 지도 — "X를 바꾸려면 어디를 여는가"

| 바꾸려는 것 | 정본 파일 | 규약 문서 | 강제 스킬 |
|-------------|-----------|-----------|-----------|
| 색 값(라이트/다크/무드) | `src/dash/tokens.css` | [COLOR_TOKENS.md](COLOR_TOKENS.md) | `color-tokens` |
| 타이포 스케일 | `src/dash/tokens.css` (`.t-*`) | 본 문서 §4 | `dashboard-ui` |
| radius / shadow / ease | `src/dash/tokens.css` | 본 문서 §5 | `dashboard-ui` |
| 모션·키프레임 | `src/dash/tokens.css` | 본 문서 §6 | `dashboard-ui` |
| Tailwind 유틸 별칭 | `tailwind.config.js` | 본 문서 §3 | `color-tokens` |
| z-index / 쌓임맥락 | `tailwind.config.js:36` + 셸 인라인 정수 | [Z_INDEX.md](Z_INDEX.md) | `z-index` |
| 접근성 | 컴포넌트 구현 | [A11Y.md](A11Y.md) | `web-a11y` |
| 반응형 | 컴포넌트 인라인 style | — | `responsive-ui` |
| 리스트/그리드 페이지 골격 | `src/dash/grid_frame.tsx` | — | `apfs-grid` · `apfs-aggrid` |
| CRUD 폼 모달 | `src/dash/schemas/renderers.tsx` | 본 문서 §9 | `apfs-form-modal` |
| 일자 선택 | `src/dash/ui/date-picker.tsx` | — | `apfs-datepicker` |
| 런타임 무드 조정 | `src/dash/tweaks.css` + `tweaks-panel.tsx` | [COLOR_TOKENS.md](COLOR_TOKENS.md) §1 | `color-tokens` |

**원칙**: 값은 항상 CSS 변수(`tokens.css`)에 두고, 컴포넌트는 `var(--…)`로만 소비한다. 문서에는 **이름·용도·규칙**만 적고 값은 적지 않는다.

---

## 2. 브랜드 & 톤

- **도메인 톤**: 인디고 / 블루 / 틸 (indigo–blue–teal). *과거 forest-green 팔레트는 2026-06-29에 전환됨 — 레거시 이름 `--brand-forest`, `data-accent="forest"`만 남아 있고 값은 현행 base다.*
- **브랜드 원색**(테마 고정, `.dark` 미재정의): `--brand-blue` `--brand-cyan` `--brand-forest` `--brand-lime` `--brand-gray`
- **역할색**(테마 적응형): `--primary` `--secondary` `--accent` `--ring`
- **폰트**: Pretendard — `--font-sans`. `tokens.css`가 400/500/600/700/800 5종을 jsDelivr CDN에서 `font-display:swap`으로 적재한다.
- **본문 조판**: `body { word-break: keep-all }` — 한국어 어절 단위 줄바꿈. 숫자 정렬은 `.tabular`(`font-variant-numeric: tabular-nums`).

---

## 3. 컬러 — → [COLOR_TOKENS.md](COLOR_TOKENS.md)

값·규칙 전문은 정본 문서에 있다. 여기서는 **디자인 관점 요약**만 둔다.

- 색은 3레이어 캐스케이드로 결정된다: `:root`(라이트) → `.dark`(다크) → `[data-accent]`(Tweaks 무드).
- **★ 핵심 함정 (adaptive-bg trap)**: `--primary`는 다크에서 **밝아진다**. 따라서 `var(--primary)` 배경 위엔 반드시 짝 전경 `var(--primary-foreground)`를 쓰고, **하드코딩 흰색을 쓰면 다크에서 대비가 깨진다**(~2.7:1). 고정 솔리드/그라디언트 표면 위에는 `--on-brand-solid`, 데이터색 칠 위에는 `--on-chart-fill`.
- Tailwind 소비: config에 named 유틸이 있으면 `bg-primary`·`text-primary-foreground`, 없으면 arbitrary `text-[color:var(--on-brand-solid)]`.
- ❌ `bg-primary/80` 류 **opacity 모디파이어는 토큰 색에 무음 실패**한다 → `color-mix(in srgb, var(--primary) 80%, transparent)`.

---

## 4. 타이포그래피 스케일 (정본: `tokens.css:225-231`)

유틸 클래스로 제공된다. **인라인 `fontSize` 하드코딩보다 이 클래스를 우선**한다.

| 클래스 | size / line-height / weight | 용도 |
|--------|------------------------------|------|
| `.t-display` | 34px / 1.08 / 800 (`ls -.02em`) | Hero AUM 등 대표 수치 |
| `.t-h1` | 23px / 1.3 / 700 (`ls -.02em`) | 페이지 제목 |
| `.t-h2` | 18px / 1.4 / 700 (`ls -.01em`) | 섹션 제목 |
| `.t-cardtitle` | 15px / 1.4 / 600 | 카드 헤더 |
| `.t-body` | 14px / 1.6 / 400 | 본문·표 셀 |
| `.t-label` | 12.5px / 1.4 / 600 · `--muted-foreground` | 폼 라벨·범례 |
| `.t-caption` | 11.5px / 1.4 / 500 · `--caption` | 보조 설명·단위 |

- `.t-label`/`.t-caption`은 **색까지 포함**한다 — 별도 `color` 지정은 중복이다.
- 큰 숫자는 `fontSize: clamp(...)` + `overflowWrap:"anywhere"` + 부모 `minWidth:0`으로 자릿수 오버플로에 대비한다(`responsive-ui` 체크리스트 9).

---

## 5. 형태 — radius · elevation · easing

| 토큰 | 용도 |
|------|------|
| `--radius-sm` / `--radius` / `--radius-lg` | 칩·배지 / 카드·입력(기본) / 대형 카드·모달 |
| `--shadow-sm` / `--shadow-md` / `--shadow-lg` | 정적 카드 / hover·드롭다운 / 모달·플라이아웃 |
| `--ease` | 전 UI 공통 이징 (`cubic-bezier(.4,0,.2,1)`) |

- Tailwind 별칭: `rounded-card-sm|card|card-lg`, `shadow-sm|md|lg`, `ease-ds`.
- 그림자는 **라이트/다크가 다른 값**이다(`.dark`에서 검정 알파로 재정의) — 인라인 `boxShadow` 하드코딩 금지.
- 간격(spacing)에는 전용 토큰이 없다. Tailwind 기본 4px 스케일 또는 인라인 `gap`/`padding`을 쓰되, **가로 묶음은 `clamp(6px,1.5vw,12px)`** 류로 좁은 화면을 짜낸다(`responsive-ui` 쿡북 A).

---

## 6. 모션 (정본: `tokens.css:233-245`)

| 키프레임 | 용도 |
|----------|------|
| `dashFade` | 대시보드 위젯 진입(7px 상승) |
| `dashPop` | 카드/패널 팝인(페이드 + scale .97) |
| `railSlide` | LNB 레일 슬라이드인 |
| `ncFade` / `ncPop` | 알림센터 배경 / 패널 |
| `drawline` | SVG 라인 차트 그리기(`--len` stroke-dashoffset) |
| `apfs-mask-pulse` | **데이터 마스크 전용** 펄스 |

- **★ 마스크 펄스 규칙**: Tailwind 코어 `animate-pulse`는 중간 opacity `.5`로 **밝아진다**. 마스크 바는 기저 `.28`로 은은히 떠 있어야 하므로 `.12`로 **어두워지는** 전용 키프레임을 쓴다. 저opacity 바에 `animate-pulse`를 붙이면 튄다.
- **전역 감속**: `@media (prefers-reduced-motion:reduce){*{animation-duration:.001ms!important}}` — 개별 컴포넌트에서 다시 처리할 필요 없다.
- `dashFade`는 `transform`만 애니메이트한다. ⚠ 이 때문에 **항등 행렬이라도 쌓임맥락을 만든다** — 플라이아웃이 카드에 가려지는 트랩의 원인이다([Z_INDEX.md](Z_INDEX.md)).
- `growbar`는 현재 from/to가 동일한 **no-op**이다(막대 애니메이션 비활성 상태).

---

## 7. 레이어(z-index) — → [Z_INDEX.md](Z_INDEX.md)

- SSOT는 `tailwind.config.js:36`의 4단 스케일: `z-overlay(75) / z-modal(80) / z-popover(85) / z-tooltip(90)`.
- 셸 chrome(헤더·LNB·FAB)은 그 **아래** 정수 밴드(44~60)를 쓴다 — 포털 오버레이가 항상 셸 위에 뜨도록 한 의도적 설계.
- ⚠ `tailwind.config.js:35`의 주석과 `ui/dialog.tsx:3`의 주석은 **옛 정수를 나열한 stale**이다. 값은 `Z_INDEX.md`와 스케일 정의만 신뢰한다.
- ⚠ **z를 올려도 안 먹으면 z 문제가 아니라 쌓임맥락 트랩**이다. 임의 정수(`z-[999]`)는 안티패턴.

---

## 8. 컴포넌트 3계층 — 무엇을 먼저 집는가

| 계층 | 위치 | 내용 | 언제 |
|------|------|------|------|
| **① shadcn/Radix 프리미티브** | `src/dash/ui/*` (27종) | dialog · sheet · popover · dropdown-menu · calendar · date-picker · tooltip · select-editor · command · accordion · alert · skeleton · spinner · sonner · scroll-area · context-menu · navigation-menu · input-group · editor … | 오버레이·포커스 트랩·키보드 조작이 필요한 **동작 있는** 컨트롤 |
| **② APFS 자체 UI** | `src/dash/components.tsx:197` → `UI.*` | `ColorChip` `StatusBadge` `DeltaBadge` `StatCard` `Card` `ChartCard` `SegTabs` `FilterChip` `Button` `IconBtn` `EmptyState` `CountPill` | 대시보드 표현 요소 — 카드·배지·탭·버튼 |
| **③ 자체 SVG 차트** | `src/dash/charts.tsx:425` → `Charts.*` | `Sparkline` `Donut` `ComposedBars` `GroupedBars` `LineTrend` `Treemap` `HBars` `Gauge` (+ `useMeasure` `fmtEok`) | 모든 시각화 |

**선택 순서**: ① 있으면 ① → 없으면 ② 확장 → 새 표현이면 ③ 확장.

### ★ 차트 정책 (사용자 확정)
- 시각화는 **`charts.tsx` 자체 SVG 확장이 유일한 경로**다.
- **외부 차트 라이브러리 도입은 에이전트 권한 밖** — 사용자 재승인 사항.
- Highcharts · amCharts · AG Charts Enterprise · FusionCharts는 **라이선스 문제로 후보 영구 제외**. 재검토 시 MIT/Apache/ISC만.

### 페이지 골격
- 리스트/그리드/매트릭스 페이지는 `grid_frame.tsx`의 **`GridFrame`** 으로 골격(PageHeader · 카드헤더+KPI · 툴바 · 푸터)을 통일하고, KPI는 `KpiBadge`를 쓴다.
- 테이블 본체는 AG Grid Community + 공유 테마 `aggrid_theme.ts`(`apfs-aggrid` 스킬).

---

## 9. 폼 컨트롤 규격 — 38px / 14px (정본: `schemas/renderers.tsx:44`)

모달·드로어의 모든 입력 컨트롤은 **높이 38px · 폰트 14px** 로 통일한다.

```ts
width:'100%', boxSizing:'border-box', padding:'8px 11px',
fontSize:14, lineHeight:'20px', height:38, minHeight:38, fontFamily:'inherit'
```

- **★ `lineHeight`와 `minHeight` 둘 다 필요하다.** Chrome UA 스타일시트가 `select`에 `line-height:normal`을 강제해 인라인 `lineHeight`를 무시하므로, `lineHeight:20`(input용)과 `minHeight:38`(select 플로어 가드)이 **함께** 있어야 input/select/DatePicker 버튼/radio 높이가 어긋나지 않는다. 이 불일치는 `getComputedStyle` 실측으로만 잡힌다.
- `textarea`는 `rows`로 커져야 하므로 `height:'auto'`로 되돌린다.
- radio 그룹은 `minHeight:38`로 라인을 맞춘다.
- **14px는 의도적 선택**이다. iOS Safari는 <16px 입력에서 포커스 시 자동 확대되지만, 데스크톱 우선 업무화면이라 폼 폰트 14px 통일을 우선해 이 트레이드오프를 수용한다. 모바일 Safari가 1차 타깃인 화면에서만 16px로 상향.
- 일자 입력은 네이티브 `<input type="date">`가 아니라 **Radix Calendar + Popover(`DatePicker`)** 로 통일한다(`apfs-datepicker` 스킬).

---

## 10. 레이아웃 & 반응형 — → `responsive-ui` 스킬

이 코드베이스는 **인라인 React `style` 위주**라 `@media`를 쓸 수 없다. 반응형은 내재적(intrinsic) CSS로만 표현한다.

- 도구: `clamp()` · `min()`/`max()` · `flexWrap:"wrap"` + `flexBasis` · `grid` + `repeat(auto-fill, minmax(min(NNNpx,100%),1fr))` · `overflowX:"auto"`
- 컨벤션 폭: `max-w-[1320px] mx-auto` — 고정 `width` 금지.
- 검증 폭: **1280 / 768 / 400**. 완료 선언 전 `document.documentElement.scrollWidth <= innerWidth` 확인.
- ⚠ `flex:1`만 주면 2단이 접히지 않고 찌부러진다 → `flexBasis:"min(100%,300px)", flexGrow:1`.

---

## 11. 데이터 마스크 (정본: `src/dash/mask.tsx:12`)

실데이터 연동 전 상태를 표현하는 **프로젝트 고유 표시 계층**이다. 화면을 처음 보는 사람이 반드시 알아야 한다.

- 스위치 `const _on = true` **하나가 SSOT**다. 실데이터 연동 시점에 `false`로 바꾸면 전 화면 마스크가 해제된다. `_on`은 `documentElement.dataset.mask`로 투영돼 AG Grid 헤더 placeholder까지 함께 제어한다.
- **적용 규칙**: 숫자·금액·날짜는 `mn(v)`(숫자를 `0`으로 치환), 텍스트(인명·코드 등)는 `<MT>{...}</MT>`.
- **★ 원칙 — "축은 두고 데이터는 가린다"**: 표 헤더 · 카드 제목 · 탭 · 단위 · StatusBadge · 차트 축 · 달력 날짜는 **가리지 않는다**.
- 마스크 바는 `.apfs-mask-pulse`를 쓴다(§6 — 코어 `animate-pulse` 금지).
- 로딩 상태는 마스크와 **다른 것**이다: 로딩 = shadcn `Skeleton`(`app.tsx`가 500ms 합성), 상시 마스크 = 펄스 바.

---

## 12. 접근성 — → [A11Y.md](A11Y.md) · `web-a11y` 스킬

기준은 **KWCAG(WCAG 2.1 기반) 4대 원칙**. 디자인 단계에서 반드시 지킬 것:

- **색만으로 정보 전달 금지** — StatusBadge는 tone(색) + 라벨 텍스트 병행.
- **명도 대비** 텍스트 4.5:1 / 비텍스트 UI 3:1 — **라이트·다크 양 테마 모두** 확인.
- **아이콘 버튼에 접근名** — `IconBtn`의 `label`이 `aria-label`로 간다. placeholder는 접근名이 아니다.
- **초점 가시성** — 전역 `:focus-visible`이 `--ring` 45% 3px outline을 준다. 개별 컴포넌트에서 `outline:none`으로 지우지 않는다.
- **자체 SVG 차트는 스크린리더가 못 읽는다** — 인접 텍스트/표로 대체 정보를 제공한다.
- 터치 타깃 ≥ 24px(가능하면 44px), 체크박스 ≥ 17px.

---

## 13. 테마 & Tweaks

- 테마는 `documentElement.classList`의 `dark` 클래스로 전환하고 `localStorage`에 영속화한다. `index.html`의 인라인 스크립트가 부팅 시 복원해 FOUC를 막는다.
- **Tweaks 패널**(`tweaks-panel.tsx` + `tweaks.css`)은 `data-*` 속성으로 무드(`data-accent="ocean"|"harvest"`)와 밀도를 런타임 조정한다. 효과는 **전부 CSS 변수 재정의**로 구현된다 — 그래서 컴포넌트가 `var(--…)`를 쓰지 않으면 Tweaks에 반응하지 않는다.
- `data-accent="forest"`는 **오버라이드 없음 = base**(현재 인디고). 이름은 레거시.

---

## 14. 안티패턴 요약

| ❌ | ✅ |
|----|-----|
| hex 하드코딩 (`#fff`·`text-white`·`fill="#fff"`) | `var(--…)` 토큰 |
| `var(--primary)` 배경 + 하드코딩 흰 글자 | 짝 전경 `var(--primary-foreground)` |
| `bg-primary/80` (opacity 모디파이어) | `color-mix(in srgb, var(--primary) 80%, transparent)` |
| 임의 z 정수 `z-[999]` | `z-overlay/modal/popover/tooltip` 토큰 |
| 인라인 `fontSize` 하드코딩 | `.t-*` 타이포 클래스 |
| 저opacity 마스크 바에 `animate-pulse` | `.apfs-mask-pulse` |
| 고정 `width` 레이아웃 | `maxWidth` + `margin:"0 auto"` |
| 네이티브 `<input type="date">` | Radix `DatePicker` |
| 외부 차트 라이브러리 설치 | `charts.tsx` 확장 (도입은 사용자 재승인) |
| 팔레트 통째 교체 | 값만 외과적 이식 |

**정당한 hex 예외**: 로고 SVG 코퍼릿 마크 · `tweaks.css` 무드 정의 · `index.html` 부트/스플래시(CSS 변수 이전 실행) · 디자인시스템 표시용 hex 라벨 · scrim `rgba(0,0,0,.x)`.

---

## 15. 검증 체크리스트

```bash
# ① 컴포넌트에 raw 색 잔여 점검
grep -rnE '#[0-9A-Fa-f]{3,8}\b|text-white|fill: *"#fff"' src/dash --include='*.tsx' | grep -viE 'tokens.css|tweaks'

# ② 빌드 (esbuild는 타입체크를 하지 않는다 — green이 곧 디자인 검증은 아니다)
npm run build
```

- ③ **라이트/다크 양쪽** 렌더 + 대비 확인.
- ④ 신규 `var(--…)`가 빈 값으로 풀리지 않는지 확인:
  `getComputedStyle(document.documentElement).getPropertyValue('--brand-solid')`
- ⑤ 폼 컨트롤 실측: `getComputedStyle(el).height === "38px"` · `fontSize === "14px"`(input **과 select 둘 다**).
- ⑥ 1280 / 768 / 400 폭에서 **페이지 가로 스크롤 없음**.

---

## 관련 문서 / 스킬

| 분야 | 문서 | 스킬 |
|------|------|------|
| 색 토큰 | [docs/COLOR_TOKENS.md](COLOR_TOKENS.md) | `color-tokens` |
| z-index·쌓임맥락 | [docs/Z_INDEX.md](Z_INDEX.md) | `z-index` |
| 접근성 | [docs/A11Y.md](A11Y.md) | `web-a11y` |
| UI 전반 | — | `dashboard-ui` |
| 반응형 | — | `responsive-ui` |
| 리스트 골격 / 그리드 본체 | — | `apfs-grid` · `apfs-aggrid` |
| CRUD 폼 모달 / 일자선택 / 상세필터 | — | `apfs-form-modal` · `apfs-datepicker` · `apfs-detail-filter` |
