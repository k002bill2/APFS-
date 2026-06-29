# z-index 규약 — APFS 대시보드

> z-index의 SSOT는 **`tailwind.config.js`의 `zIndex` 스케일(4단)**이다. 떠 있는 오버레이(다이얼로그·시트·드롭다운·툴팁·내비메뉴)는 `z-overlay/z-modal/z-popover/z-tooltip` 유틸로만 소비하고, 셸 chrome(헤더·LNB·FAB)은 그 아래 정수 밴드(44~60)를 쓴다. 임의 정수 z(`z-[999]` 류)는 안티패턴이다 — 스케일 밖 값은 쌓임순서를 예측 불가하게 만들고, 진짜 원인(쌓임맥락 트랩)을 가린다.
>
> ⚠ **z-index를 올려도 안 먹으면 십중팔구 z-index 문제가 아니라 쌓임맥락(stacking context) 트랩이다.** 숫자를 키우기 전에 §2·§3을 먼저 읽어라.
>
> 작업 시 스킬: `.claude/skills/dashboard-ui/SKILL.md` · `.claude/skills/responsive-ui/SKILL.md`

---

## 1. 토큰 스케일 (SSOT) — 두 밴드

z-index는 **두 밴드**로 갈린다. 위 밴드(75~90)는 토큰화돼 있고, 아래 밴드(44~60)는 셸 chrome 인라인 정수다. 설계 의도: **포털 오버레이는 셸 chrome 위에 항상 뜬다**(75 > 60).

### 토큰 밴드 — `tailwind.config.js:36` (정본)

```js
zIndex: { overlay: '75', modal: '80', popover: '85', tooltip: '90' }
```

| 유틸 | 값 | 소비처 (파일:행) | 포털? |
|------|-----|------------------|-------|
| `z-tooltip` | **90** | `ui/tooltip.tsx:20` (Tooltip 콘텐츠) | 포털 |
| `z-popover` | **85** | `ui/dropdown-menu.tsx:26` (DropdownMenu) · `ui/navigation-menu.tsx:62` (NavigationMenuContent 플라이아웃) | 드롭다운=포털 / **내비메뉴=비포털** |
| `z-modal` | **80** | `ui/dialog.tsx:40` · `ui/sheet.tsx:34` · `ui/alert-dialog.tsx:32` (각 콘텐츠) | 포털 |
| `z-overlay` | **75** | `ui/dialog.tsx:23` · `ui/sheet.tsx:19` · `ui/alert-dialog.tsx:17` (각 scrim, `bg-black/55`) | 포털 |

> `tokens.css`/`tweaks.css`에는 **z 관련 CSS 변수가 전혀 없다**(`--z-*` 0건). z 시스템은 전적으로 tailwind `zIndex` 스케일 + 인라인 정수로만 구성된다. 색과 달리 z는 Tweaks로 런타임 조정하지 않으므로 CSS 변수가 불필요하다.

### 셸 chrome 밴드 (인라인 정수, 44~60)

레이아웃 chrome(sticky/fixed)은 토큰을 쓰지 않고 정수 44~60을 쓴다. **토큰(75~90)보다 낮게 두어** 모달·팝오버·툴팁이 항상 셸 위로 뜨게 한 의도적 설계다(인벤토리는 §5).

### ⚠ 주석 drift 경고 (이 문서가 SSOT)

코드 인라인 주석 중 **옛 정수를 나열한 stale 주석**이 있다 — 실제 값과 불일치하니 무시하고 본 문서·`tailwind.config.js:36`을 따른다:

- `ui/dialog.tsx:3` — "셸 raw 정수 chrome(모달 71)" → **71은 현재 코드에 없다**. 현재 셸 최고치는 **60**(FAB·방문기록 패널).
- `tailwind.config.js:35`(스케일 정의 바로 윗줄) — "모달 71 / 백드롭 70 / FAB 60 / 헤더 50 / 플라이아웃 47 / 드롭다운 41" 6항목 중 **4개가 옛 값**: 모달 71→`z-modal` 80, 백드롭 70→`z-overlay` 75, 플라이아웃 47·드롭다운 41→`z-popover` 85. (FAB 60·헤더 50은 현행 셸 chrome과 일치 — `shell.tsx:561`/`:673`.)

### 규칙

1. 떠 있는 오버레이는 **반드시** `z-overlay/z-modal/z-popover/z-tooltip` 토큰 유틸을 쓴다. 새 정수 z를 도입하지 않는다.
2. 셸 chrome에 새 정수가 꼭 필요하면 **44~60 밴드 안**에서, 토큰(75)을 넘지 않게 둔다.
3. 페이지/위젯 로컬 z(차트 툴팁·타임라인 노드 등)는 **부모 카드 내부 순서용 한 자리 수**로만 쓰고 셸/오버레이와 경쟁시키지 않는다.

## 2. 쌓임맥락 5분 입문

z-index는 **숫자가 큰 게 무조건 위가 아니다.** 같은 **쌓임맥락(stacking context)** 안에서만 z끼리 비교된다. 다른 맥락에 속한 두 요소는, 각자 z가 아무리 커도 **맥락 루트끼리의 순서**로 칠해진다.

### 무엇이 쌓임맥락을 만드는가

다음 속성을 가진 요소는 새 쌓임맥락을 만들고, 그 자손의 z-index를 자기 안에 가둔다:

- `position: fixed` / `sticky` — **무조건** 생성(현대 브라우저)
- `transform` — `none`이 아닌 모든 값. **⚠ 여기 항등행렬 함정이 있다(§3).**
- `filter` (blur·drop-shadow) · `backdrop-filter` (blur)
- `opacity < 1`
- `will-change` (transform/opacity 등) · `isolation: isolate`
- `position` ≠ `static` **이면서** `z-index` ≠ `auto` (= 양수 z를 준 positioned 요소)

### 핵심 한 줄

> **`fixed`는 컨테이닝블록(레이아웃 기준 박스)만 뷰포트로 탈출한다. 쌓임맥락은 box-tree 조상을 따른다.**

즉 `position:fixed; z-index:85`인 요소라도, box-tree 조상에 쌓임맥락을 만드는 요소(예: `sticky` nav)가 있으면 **그 85는 조상 맥락 "안"에서만 해석**된다. 화면엔 뷰포트 기준으로 떠 있지만, 페인팅 순서는 조상에 종속된다. 이 괴리가 §3 트랩의 메커니즘이다.

### context ≠ bug (중요)

**쌓임맥락 생성 자체는 거의 다 무해하다.** 코드의 수많은 `opacity<1` 아이콘/칩, 장식용 `transform`/`filter` 타일, `main_widgets.tsx:438`(QuickTasksBar dashFade 래퍼), `shell.tsx:565`(즐겨찾기 팝업) 등은 모두 맥락을 만들지만 **가둘 positioned 자손이 없는 리프**라 트랩이 아니다. 버그는 **조건의 곱**일 때만 난다:

> **쌓임맥락 생성 + 그 안에 갇힌 비포털 positioned(특히 fixed) 자손 = 버그.**

그래서 transform/opacity를 무조건 제거하려 들면 안 된다. **포털 여부**(`document.body`로 탈출하는가)가 면역 판별자다(§3).

## 3. ★ 트랩 패턴 & 처방

### 트랩 — 비포털 오버레이가 조상 맥락에 갇힌다

셸 안에 인라인 렌더되는 오버레이(Radix `NavigationMenuContent`, 직접 만든 드롭다운)는 `position:fixed; z-popover(85)`를 선언해도, **조상 nav가 쌓임맥락을 만들면** 그 85가 nav 맥락에 갇힌다. nav가 `z-auto`이고 형제 `<main>` 컬럼도 `z-auto`면, 둘은 **공유 flex 부모(`shell.tsx:879` `flex flex-1 items-start` / `881` `<main>`)** 안에서 **DOM 순서**로 칠해진다 → main이 nav보다 뒤 → main 안의 카드가 플라이아웃을 덮는다.

**핵심 구분 — 선언 z vs 실효 z**: 비포털 오버레이의 실효 상한은 선언값(85)이 아니라 **자기 맥락 루트의 z**(nav 48, 또는 dashFade auto)다. 이 괴리가 곧 버그다.

### 처방 1 — 소비처 nav에 양수 z-index (정본 수정)

`shell.tsx:157`(데스크톱 Lnb nav)·`shell.tsx:275`(Rail nav)에 **`zIndex: 48`** 부여.

> ⚠ **오해 금지**: 이 48은 **쌓임맥락을 만드는 게 아니다** — `sticky`가 이미 맥락을 만들었다. 48은 nav를, **공유 flex 부모(`shell.tsx:879`/`881`) 안에서 `z-auto`인 main 컬럼 "위"로 칠해지게 하는 순서 보정**이다. main 컬럼의 dashFade 서브맥락이 카드를 끌어올리고 있었으니, nav에 양수 z를 줘 그 위로 올린다. "z:48이 플라이아웃을 끄집어낸다"는 잘못된 요약이다 — 플라이아웃의 z-85는 여전히 nav 맥락 안이고, 우리가 올리는 건 nav 전체다.

`RailNav`는 **처음부터 `zIndex:48`**이라 같은 버그가 안 났다 — 결정적 대조군이다.

### 처방 2 — 가능하면 Portal로 body 탈출 (면역)

`document.body`로 포털하는 오버레이는 box-tree 조상을 벗어나므로 **이 트랩에 면역**이다. Radix `Dialog`/`DropdownMenu`/`Tooltip`은 기본으로 body 포털한다.

| 면역 (body 포털) | 종속 (비포털, 조상 맥락에 갇힘) |
|------------------|--------------------------------|
| NotifCenter·CenterModal·MenuCommand (=Dialog) | `NavigationMenuContent` 플라이아웃(Lnb·Rail) |
| UserMenu·RoleSwitch (=DropdownMenu) | HistoryMenu 방문기록 드롭다운 |
| MenuPickerModal (=Dialog, FAB의 z:60 컨테이너를 탈출) | FavoritesFab 내부 팝업 |

> `NavigationMenuContent`(`ui/navigation-menu.tsx:62`)는 Radix Viewport를 **쓰지 않아** 각 Item 안에 인라인 렌더된다 — **포털되지 않는 유일한 Radix 오버레이**이자 이 트랩의 정본 피해자다.

### dashFade 항등행렬 함정 (근본원인)

`animation: dashFade ... both`의 키프레임은 `to { transform: none }`(`tokens.css:222`)이다. `fill:both`로 끝상태가 고정되는데, **브라우저는 `transform:none`을 키워드가 아니라 항등행렬 `matrix(1,0,0,1,0,0)`로 계산한다** → 영속 쌓임맥락 생성. (`transform:none`은 맥락을 안 만들지만, 애니메이션이 굳힌 항등행렬은 만든다.) 해당 래퍼: `main.tsx:178`(대시보드 variant 래퍼, 카드 묶음을 자기 맥락으로 끌어올린 §4 근본원인), `main_widgets.tsx:438`, `shell.tsx:565` 등. 앞 둘은 가둘 fixed 자손이 없어 무해하고, `main.tsx:178`만 트랩에 기여했다.

### ⚠ 잠재 함정 패턴 (앞으로 조심)

- **FavoritesFab 컨테이너**(`shell.tsx:561`, `position:fixed; z:60`)에 **비포털 fixed 오버레이를 새로 넣으면** z:60 / 컨테이닝블록에 갇힌다. 현재 내부 `MenuPickerModal`은 Dialog 포털이라 안전. 새 오버레이를 여기 달 땐 반드시 포털을 쓴다.
- **HistoryMenu 클릭아웃 백드롭**(`shell.tsx:784`, `fixed inset-0; z:59`) — 미해결 후보(중대도 낮음). PRD 페이지들이 콘텐츠를 dashFade 같은 transform 래퍼로 감싸면 백드롭의 컨테이닝블록이 그 조상으로 바뀌어 **뷰포트가 아닌 페이지 박스만 덮는다** → 클릭아웃 닫기 범위 축소(경미한 UX, 카드-위-오버레이 가림 버그는 아님). 드롭다운 패널 자체(`shell.tsx:790`, `absolute; z:60`)는 `relative inline-flex` 앵커(`shell.tsx:781`, z 없음=맥락 미생성)에 붙어 공유 맥락 내 양수 z로 우세 → 견고.

## 4. 사례 연구 — 접힌 LNB 플라이아웃이 카드에 가려진 버그

**증상**: 펼친 LNB의 접힘 플라이아웃(`NavigationMenuContent`, `position:fixed; z-popover=85`)이, 분명히 z-85인데도 메인 대시보드 카드에 가려졌다. 이 문서·규약의 동기가 된 실제 버그다.

**근본원인 — 2중 쌓임맥락 트랩**:
1. `main.tsx:178` variant 래퍼의 `dashFade`(`fill:both`)가 끝상태 `transform:none`을 **항등행렬 `matrix(1,0,0,1,0,0)`로 굳혀** 카드 묶음에 쌓임맥락을 만들었다.
2. 접힌 Lnb `<nav>`가 `position:sticky`(`shell.tsx:157`)라 쌓임맥락을 만들어, 자손 `fixed` 플라이아웃의 z-85를 **nav 맥락 안에 가뒀다**. `fixed`는 컨테이닝블록만 뷰포트로 탈출하고, 쌓임맥락은 box-tree 조상(nav)을 따르기 때문이다.

당시 nav와 main이 **둘 다 `z-auto`**(루트 6단계 동률)라, 공유 flex 부모(`shell.tsx:879`/`881`) 안에서 **DOM 순서**로 칠해졌다 → main이 나중 → 카드가 플라이아웃 위로.

**수정**: `shell.tsx`의 Lnb 데스크톱 `sticky` 분기에 `zIndex:48` 추가. (맥락 생성이 아니라 nav를 main의 z-auto 맥락 위로 올리는 순서 보정 — §3 처방 1.) `RailNav`는 이미 `zIndex:48`이라 무사했던 게 결정적 대조군이었다.

**검증법**: `document.elementsFromPoint(x, y)`로 겹침 좌표의 최상단을 본다 — **카드면 버그, 플라이아웃 패널이면 정상**(§6).

## 5. 현재 코드 z-index 인벤토리 (감사 기반)

| 값 | 위치 (파일:행) | 무엇 | position / 비고 |
|-----|----------------|------|------------------|
| **2147483646** | `tweaks-panel.tsx:63` | Tweaks 패널 (`.twk-panel`) | `fixed` — int 최대 근처, 모든 것 위로 강제 노출(개발용 의도된 예외) |
| **90** | `ui/tooltip.tsx:20` | Tooltip 콘텐츠 | `z-tooltip` · 포털 |
| **85** | `ui/dropdown-menu.tsx:26` | DropdownMenu 콘텐츠 | `z-popover` · 포털 |
| **85** | `ui/navigation-menu.tsx:62` | NavigationMenuContent 플라이아웃 | `z-popover` · **비포털**(인라인) — §3 트랩 피해자 |
| **80** | `ui/dialog.tsx:40` · `sheet.tsx:34` · `alert-dialog.tsx:32` | 모달/시트 콘텐츠 | `z-modal` · 포털 (sheet/alert-dialog는 셸 미사용) |
| **75** | `ui/dialog.tsx:23` · `sheet.tsx:19` · `alert-dialog.tsx:17` | 오버레이 scrim (`bg-black/55`) | `z-overlay` · 포털 |
| **60** | `shell.tsx:561` | FavoritesFab 컨테이너 | `fixed` right-6 bottom-6 · 셸 chrome 최고치 |
| **60** | `shell.tsx:790` | 방문기록 드롭다운 패널 | `absolute` · `relative inline-flex` 앵커에 종속 |
| **59** | `shell.tsx:784` | 방문기록 클릭아웃 백드롭 | `fixed inset-0` · §3 미해결 후보 |
| **50** | `shell.tsx:673` | GNB 헤더 | `sticky top-0` · h58 · `backdrop-blur` (강한 chrome 맥락, 자손은 전부 포털→안전) |
| **48** | `shell.tsx:157` | 데스크톱 Lnb nav | `sticky top:58` · ★ **트랩 수정 지점**(§4) |
| **48** | `shell.tsx:275` | Rail nav | `sticky`(데스크톱)/`fixed`(모바일) top:58 w64 · 대조군(처음부터 48) |
| **45** | `shell.tsx:154` | 모바일 Lnb 드로어 nav | `fixed top:58` · translateX 슬라이드 |
| **44** | `index.html:70` | lnb-backdrop (모바일 드로어 딤) | `fixed inset:58 0 0 0` · `rgba(0,0,0,.42)` |
| **20** | `grid_frame.tsx:92` | GridFrame sticky 푸터 툴바 | `sticky bottom:0` · 주석(`:90`)에 "FAB(60)보다 낮게 둬 클릭성 침범 방지" 명시 |
| **10** | `accounting.tsx:333` | 감사로그 타임라인 노드 아이콘 | `z-10` · 같은 행 세로선 위로 |
| **5** | `charts.tsx:52` | 차트 hover 툴팁 | `absolute` · 차트 위 |
| **3** | `main_widgets.tsx:338` | 위젯 일러스트 SVG | `relative` · span 내부 순서용 |
| **1** | `tweaks-panel.tsx:119` | Tweaks 세그먼트 버튼 (`.twk-seg button`) | `relative` · 슬라이딩 인디케이터 위 라벨 |
| **-1** | `shell.tsx:564` | FavoritesFab 클릭아웃 백드롭 | `fixed inset-0` · FAB 컨테이너 내부 스택에서 팝업 뒤로 |

## 6. 검증 레시피 — `elementsFromPoint` before/after

```js
// ① 겹침 좌표(오버레이와 카드가 겹치는 지점)의 최상단 요소 확인
//    → 카드/콘텐츠면 트랩(버그), 오버레이 패널이면 정상
document.elementsFromPoint(x, y)[0]

// ② 의심 조상이 쌓임맥락을 만드는지 computed로 확인
const n = document.querySelector('nav');           // 또는 dashFade 래퍼
getComputedStyle(n).transform   // 'none'이 아니면(matrix 포함) 맥락 생성
getComputedStyle(n).position    // 'sticky'/'fixed'면 맥락 생성
getComputedStyle(n).opacity     // '1' 미만이면 맥락 생성
getComputedStyle(n).filter      // 'none'이 아니면 맥락 생성

// ③ 오버레이가 body로 포털됐는지(면역 여부) 확인
overlayEl.closest('nav, [class*="dash-main"]')  // null이면 body 포털(안전), 잡히면 셸 안(종속)
```

- 수정 **전/후**로 ①을 같은 좌표에서 비교해 최상단이 카드→패널로 바뀌는지 확인한다.
- `grep`로 임의 z 잔여 점검: `grep -rnE 'zIndex: *[0-9]{3,}|z-\[[0-9]+\]' src/dash --include='*.tsx'` — **현재 0건(green)**이어야 한다. (Tweaks 패널 max-int은 하이픈형 CSS `z-index:`라 이 camelCase 패턴에 안 잡힌다.)
- `npm run build`는 통과해도 z 순서를 검증하지 못한다(esbuild 타입체크·런타임 페인팅 무관). **반드시 브라우저에서 라이트/다크·데스크톱/모바일로 실제 겹침을 확인**한다(Chrome MCP).

## 7. 체크리스트 — 새/수정 오버레이 (Portal-first 결정 트리)

이 순서대로 판단한다:

1. **새 떠 있는 오버레이인가?** → 가능하면 **Radix `Dialog`/`DropdownMenu`/`Tooltip`**(body 포털)을 쓴다 → §3 트랩 면역, 끝.
2. **비포털(인라인) 오버레이여야 하나?**(예: `NavigationMenuContent`) → 조상에 **`sticky`/`fixed`/`transform`/`filter`/`opacity<1`/`backdrop-filter`** 가 있는지 본다.
   - 있으면, **소비처 컨테이너(nav 등)에 양수 z-index**(셸이면 48)를 줘 공유 맥락 안에서 형제 위로 올린다(§3 처방 1). z를 그냥 키우는 게 아니다.
3. **z를 올려도 안 먹나?** → 숫자를 더 키우지 말고 §6 `elementsFromPoint` + `getComputedStyle(...).transform/position`으로 **갇힌 맥락 루트를 찾는다.**
4. **z 값은 밴드를 지켰나?** → 오버레이=토큰 유틸(`z-overlay/modal/popover/tooltip`), 셸 chrome=44~60, 로컬=한 자리 수. 임의 정수·토큰 초과 금지.
5. **`fixed inset-0` 클릭아웃 백드롭을 추가했나?** → 조상에 transform 래퍼(dashFade 등)가 있으면 뷰포트가 아닌 페이지 박스만 덮을 수 있다(§3 HistoryMenu 사례). 포털하거나 백드롭을 맥락 밖에 둔다.
6. **양 테마·양 디바이스에서 실제 겹침 확인**(빌드 green ≠ z 검증).

## 관련 문서/스킬
- 스킬: `dashboard-ui`(UI/셸 전반), `responsive-ui`(반응형 — 모바일 드로어·플라이아웃 검증)
- 토큰 스케일 SSOT: `tailwind.config.js:36` · 사례 연구 소스: `src/dash/shell.tsx`, `src/dash/ui/navigation-menu.tsx`, `src/dash/main.tsx`
- 색 토큰 규약: `docs/COLOR_TOKENS.md`
- 이력: 2026-06-30 접힘 LNB 측면 플라이아웃이 메인 카드에 가려진 버그(sticky/transform 조상 2중 쌓임맥락 트랩) 수정에서 규약 정립
