---
name: responsive-ui
description: APFS 대시보드 반응형(모바일/태블릿/데스크톱) 규약·체크리스트·검증 프로토콜. 페이지·위젯·모달·리스트·테이블·셸 등 화면을 새로 만들거나 수정할 때 반응형 누락을 막기 위해 사용. Use whenever creating or editing any page, widget, modal, table, or layout so responsive behavior is never missed.
---

# Responsive UI Skill

APFS 대시보드는 **인라인 React `style`** 위주다. **인라인 스타일에는 `@media` 미디어쿼리를 쓸 수 없다.** 따라서 반응형은 아래 "내재적(intrinsic) CSS"로만 표현하고, className을 쓰는 경우에만 Tailwind 반응형 접두사를 쓴다. 화면을 만들 때 이 스킬의 **체크리스트를 todo로 펼쳐** 하나씩 확인한다.

## 반응형 도구 (인라인에서 가능한 것만)
- `clamp(min, 선호, max)` — 미디어쿼리 없는 "뷰포트 비례 축소" (padding/gap/font 등)
- `min()` / `max()` — `width: min(250px, 100%)` 류 상한·하한
- `flexWrap: "wrap"` + **`flexBasis`** — 좁아지면 다음 줄로 적층
- `display: grid` + `gridTemplateColumns: repeat(auto-fill, minmax(min(NNNpx,100%), 1fr))`
- `%` / `fr` / `vw` / `vh`
- `overflowX: "auto"` (테이블 가로 스크롤)
- className 사용 시: Tailwind `sm:`/`md:`/`lg:` (preflight:false라 input에도 적용 가능), 또는 `index.html`의 `@media` 클래스(예: `.gnb-search`/`.dash-main`)

## 페이지/위젯 만들 때 체크리스트 (누락 금지)
1. **루트 컨테이너**: 고정 `width` 금지 → `maxWidth` + `margin:"0 auto"` (좁으면 자연 축소). 컨벤션 폭은 `max-w-[1320px] mx-auto`.
2. **가로로 나열되는 모든 묶음**(헤더·툴바·KPI 배지·액션 버튼군·푸터·카드행)에 `flexWrap:"wrap"`. **외곽뿐 아니라 내부 묶음에도** 빠짐없이.
3. **2단 레이아웃**(예: 캘린더+리스트, 좌우 카드)은 좁을 때 적층되게 → `flexWrap` + 각 칸 `flexBasis` 부여. `flex:1`만 쓰면 적층 안 되고 찌부러진다(→ 쿡북 B).
4. **테이블**: 카드 내부에서만 가로 스크롤. `Card overflow:hidden` → 래퍼 `overflowX:"auto"` → `table { minWidth: NNNpx }`. 셀 div는 `minWidth:0`(말줄임). 진입 최소폭은 **table의 minWidth 하나로만** 통제.
5. **입력 폰트 ≥ 16px**: 모든 `input`/`select`/`textarea` 글자크기 16px 이상(미만이면 iOS Safari 포커스 시 자동 확대 → 레이아웃 붕괴). 공유 스타일 객체에 `fontSize:16` 한 곳.
6. **오버레이/모달**: Portal(`createPortal(node, document.body)`)로 body 직계 렌더 + 충분한 z-index. 세로는 `alignItems:"flex-start"` + `padding:"6vh ..."` + 오버레이 `overflowY:"auto"` + 카드 `maxHeight: ~86vh`. 폭은 `width:"100%"` + `maxWidth` + `boxSizing:"border-box"`. 패딩은 `clamp(8px,3vw,24px)`.
7. **플라이아웃/팝오버**(절대배치): `maxHeight: window.innerHeight - top - 16` + `overflowY:"auto"`. 고정 높이 가정·매직넘버 금지.
8. **고정(fixed) 요소**(FAB·헤더 우측군): 폭 합이 좁은 화면을 넘지 않게 `clamp` 패딩/gap. 1px라도 넘으면 페이지 전체 가로 스크롤.
9. **큰 숫자/금액**: `fontSize: clamp(...)` + `overflowWrap:"anywhere"` + 부모 `minWidth:0` (실데이터 연동 시 자릿수 오버플로 대비).
10. **터치 타깃**: 핵심 조작 요소 ≥ 24px(WCAG AA), 가능하면 44px 권장. 체크박스 ≥ 17px.
11. **테마 양립**: 색은 `tokens.css` CSS 변수(`var(--...)`/`color-mix`). 하드코딩 hex 금지(다크에서 깨짐·대비 불량).

## 기법 쿡북 (실패 모드 → 처방)
- **A. 가로 오버플로(고정 항목 꽉 찬 행)** → `gap: "clamp(6px,1.5vw,12px)"`, `padding: "0 clamp(8px,2vw,16px)"`로 모바일에서 짜낸다.
- **B. 2단이 안 접히고 찌부러짐** → `flex:1`(basis 0%)이 원인. 옆칸에 `flexBasis:"min(100%,300px)", flexGrow:1`을 주면 그 폭이 안 나올 때 `flexWrap`이 비로소 다음 줄로 내린다. 고정칸은 `width:"min(250px,100%)"`.
- **C. 그리드 초협폭 블리드** → `minmax(240px,1fr)` 대신 `minmax(min(240px,100%),1fr)`.
- **D. 2열↔1열 경계 떨림(jitter)** → flex-basis 합을 타깃 BP보다 충분히 작게(예: 300+260+gap=576 → 768에서 안정). 또는 className grid `grid-cols-1 lg:grid-cols-[1.4fr_1fr]`로 BP 명시.
- **E. 모달이 화면 밖/잘림** → Portal + `flex-start` + `vh` 패딩 + `overflowY:auto`(쿡북 6).
- **F. iOS 입력 줌** → 입력 폰트 16px(체크리스트 5).

## 검증 프로토콜 (완료 선언 전 필수)
1. `npm run build` → exit 0.
2. 브라우저에서 **1280 / 768 / 400(데스크톱 창은 ~500까지 클램프됨)** 폭으로 측정:
   - **페이지 가로 스크롤 없음** — `document.documentElement.scrollWidth <= innerWidth`. 넘으면 아래 탐지기로 **클리핑 조상이 없는** 진짜 원인 요소를 식별(클립된 테이블은 가짜 양성).
   - **레이아웃 전환** — 2단/카드행이 좁을 때 적층되는지(요소 `getBoundingClientRect().top` 비교).
   - **입력 폰트** — `getComputedStyle(input).fontSize === "16px"`.
3. 폼이 있으면 **CRUD/제출 스모크** 1회(공유 입력 스타일 변경이 폼을 깨지 않았는지).

```js
// 진짜 가로-오버플로 요소 탐지 (overflow:hidden/auto 조상에 클립된 것은 제외)
const vw = innerWidth;
const clipped = el => { let p = el.parentElement; while (p) { const o = getComputedStyle(p);
  if (/(auto|hidden|scroll)/.test(o.overflowX + o.overflow)) return true; p = p.parentElement; } return false; };
const hits = [...document.querySelectorAll('body *')]
  .filter(el => { const r = el.getBoundingClientRect(); return r.right > vw + 0.5 && !clipped(el); })
  .map(el => ({ tag: el.tagName, aria: el.getAttribute('aria-label'), right: Math.round(el.getBoundingClientRect().right) }));
console.log({ vw, scrollW: document.documentElement.scrollWidth, hits });
```

## 흔한 함정 (이번에 실제로 겪음)
| 증상 | 진짜 원인 | 처방 |
|------|-----------|------|
| iOS에서 입력 포커스 시 화면 확대 | 입력 폰트 < 16px | 공유 `inputStyle.fontSize: 16` |
| 캘린더 옆 리스트가 30~70px로 뭉개짐 | 리스트가 `flex:1`(basis 0) | `flexBasis:"min(100%,300px)"`+`flexGrow:1`+부모 `flexWrap` |
| 페이지 전체 4px 가로 스크롤 | 고정 헤더 우측군이 뷰포트 초과 | 헤더 `padding`/`gap` `clamp` |
| 탐지기가 테이블을 원인으로 오인 | 테이블은 `overflow:hidden` 카드에 클립됨 | 탐지기에서 클리핑 조상 검사로 제외 |
| 모달이 세로로 길면 안 보임 | 중앙 정렬 + 트랩된 fixed | Portal + `flex-start` + `overflowY:auto` |

## 참조
- UI/디자인 시스템 전반: [[dashboard-ui]]
- 마스크 규약(`mn`/`MT`)·토큰: `CLAUDE.md`, `tokens.css`
- 정본 패턴 예: `generic_list.tsx`(테이블/카드행/그리드), `generic_list_modal.tsx`(모달), `shell.tsx`(GNB clamp·플라이아웃 maxHeight)
