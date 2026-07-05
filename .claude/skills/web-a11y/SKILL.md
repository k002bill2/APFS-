---
name: web-a11y
description: APFS 대시보드 웹 접근성(a11y·KWCAG/WCAG) 규약·체크리스트·검증 프로토콜. 페이지·위젯·모달·폼·리스트·셸 등 화면을 새로 만들거나 수정할 때 접근성 누락(접근名 없는 아이콘 버튼, placeholder만 있는 입력, 키보드 조작 불가, 대비 부족, 초점 소실, 라이브리전 누락)을 막기 위해 사용. 사용자가 "접근성/aria/스크린리더/키보드/대비/WCAG"를 직접 말하지 않아도 화면을 만들거나 고칠 때마다 함께 사용. Use whenever creating or editing any page, widget, modal, form, table, or shell so accessibility (keyboard, accessible names, focus, contrast, live regions) is never missed.
---

# Web Accessibility (a11y) Skill

APFS는 **React 인라인 `style` + 스키마 주도 폼 + shadcn/Radix 프리미티브** 구성이다. 그래서 접근성은 "raw `<img alt>` / `<form><label for>`" 식의 정적 HTML 조언이 아니라 **이 코드베이스가 이미 세운 패턴을 재사용**하는 방식으로 확보한다. 화면을 만들 때 이 스킬의 **체크리스트를 todo로 펼쳐** 하나씩 확인한다.

근거 기준: **KWCAG(한국형 웹 콘텐츠 접근성 지침, WCAG 2.1 기반)** — 4대 원칙(인식·운용·이해·견고).

## 이미 전역으로 처리된 것 — 재발명 금지
새 코드에서 다시 만들거나 덮어쓰지 말고 **그대로 얹혀 간다**:
- **초점 링**: `tokens.css`의 `:focus-visible{outline:3px solid …--ring…}` 전역 규칙. → 커스텀 컨트롤에서 `outline:none`으로 **지우지 마라**. 굳이 바꿀 땐 `:focus-visible`로만, `--ring` 토큰 사용.
- **모션 축소**: `tokens.css`의 `@media (prefers-reduced-motion:reduce){*{animation-duration:.001ms!important}}` 전역 kill. → 새 keyframe도 자동 무력화되지만, JS 기반 자동 이동/자동재생(캐러셀·자동 페이지네이션)은 이 규칙이 못 잡으니 직접 `matchMedia('(prefers-reduced-motion:reduce)')`로 가드.
- **아이콘**: `Icon`(icons.tsx)은 이미 `aria-hidden={true}`. 장식 아이콘은 SR에서 자동 침묵.
- **대비/색**: 라이트·다크 전경 대비는 `tokens.css` 토큰이 이미 튜닝. → 색은 **color-tokens 스킬**을 따르고 hex 하드코딩 금지. 4.5:1(본문)·3:1(대형/비텍스트)은 거기 규약.
- **터치 타깃 24px**: **responsive-ui 스킬** 체크리스트 10에 있음. 여기서 재정의하지 않는다.

## APFS 정본 패턴 — 새 UI는 이 배선을 따른다
| 상황 | 정본 패턴 (따라 쓸 것) | 근거 위치 |
|------|----------------------|-----------|
| **아이콘만 있는 버튼** | `IconBtn`의 `label` prop → `aria-label` + Tooltip 자동. 절대 bare `<div onClick>`+`<Icon>` 금지 | components.tsx `IconBtn` |
| **폼 입력의 라벨** | `Field`가 컨트롤을 `<label>`로 감싸 **암묵 연결**. 새 필드는 이 래핑 안에 둔다 | generic_list_modal.tsx `Field` |
| **모달/다이얼로그** | shadcn/**Radix Dialog** 사용 → focus trap·Escape·`aria-modal`·포커스 복귀 자동 제공. 손수 오버레이 만들지 말 것 | generic_list_modal.tsx `RowFormModal` |
| **날짜 입력** | `DatePicker`(Popover+Calendar), `ariaLabel` 필수 전달 | apfs-datepicker 스킬, renderers.tsx:48 |
| **비동기 상태 알림** | `Alert`(`role="alert"`)·`Skeleton`(`aria-live="polite"`·`aria-busy`)·`Spinner`(`role="status"`) 재사용. 토스트/조회완료/저장성공도 이 라이브리전으로 알린다 | ui/alert.tsx·skeleton.tsx·spinner.tsx |
| **토글/확장 버튼** | `IconBtn`의 `expanded` prop → `aria-expanded`·`aria-haspopup="menu"` 자동. LNB 접기·메뉴 등 | components.tsx `IconBtn` |
| **의미 구조** | 클릭 요소는 `<button>`, 내비는 `<nav>`, 제목은 `<h1>~<h6>`. `<div onClick>`로 버튼 흉내 금지(포커스·엔터·SR 역할 전부 손실) | 전역 |

## 함정 쿡북 (이 저장소에서 실제로 밟은/밟을 함정)
- **A. placeholder는 접근名이 아니다.** `<span>라벨</span>` 없이 `<input placeholder="값 입력">`만 두면 SR엔 이름이 없다(placeholder는 값 입력 시 사라지고, 라벨 대체로 인정 안 됨). → 보이는 라벨이 있으면 그 라벨과 함께 `<label>`로 감싸고(암묵 연결), 없으면 `aria-label`을 준다. **주의: `<input>`을 `<label>`로 감싸면 `for`/`id` 없이도 첫 labelable 자손과 자동 연결된다** — 정본 예: 상세필터 드로어 `generic_list.tsx:229·271`이 `<label><span>{ff.label}</span>{control}</label>` 구조로 이미 접근名을 갖는다(브라우저 실측 `input.labels==1`). 즉 이런 래핑이 있으면 `aria-label`을 **덧붙이지 마라**(중복·WCAG 2.5.3 Label-in-Name 위반 위험). `aria-label`은 보이는 라벨이 **정말 없을 때만**.
- **B. 복합 컨트롤을 `<label>`로 감싸면 오작동.** Plate 리치텍스트·FilePond처럼 내부에 자체 버튼을 품은 컨트롤을 `<label>`로 감싸면, 암묵 연결이 라벨 불가한 본문(`div[role=textbox]`)을 건너뛰고 **툴바 첫 버튼(B/굵게)** 과 연결된다 → 본문 클릭이 `toggleBold` 발화(빈 문단에 bold 박힘). → `Field`의 `plain` 옵션(div 래핑) + **컨트롤이 자체 `aria-label` 보유**. 네이티브 단일 컨트롤(input·select)만 `<label>` 암묵 연결을 쓴다. (근거: generic_list_modal.tsx:41-46)
- **C. 초점 링을 지우지 마라.** `outline:none`(또는 `:focus`에 outline 제거)은 KWCAG "초점 이동" 위반. 전역 `:focus-visible`가 이미 링을 그린다 — 커스텀 스타일이 이걸 덮지 않는지 확인.
- **D. SPA 라우트/모달 전환 시 초점 소실.** 라우트가 바뀌거나 모달이 열릴 때 초점이 `<body>`에 남으면 SR·키보드 사용자가 맥락을 잃는다. Radix Dialog는 이걸 자동 처리(트리거로 복귀). **직접 만든** 오버레이/탭 전환은 새 영역의 제목이나 첫 컨트롤로 `.focus()` 이동, 닫힐 때 여는 요소로 복귀시킬 것.
- **E. 데이터 마스크(MT/mn)와 SR.** `MT`는 빈 회색 바(SR에 아무것도 안 읽힘), `mn()`은 숫자를 "0"으로 치환(SR이 "영"으로 읽음). 마스크는 실데이터 연동 전 placeholder라 의도된 동작이지만, **차트 축·표 헤더·카드 제목은 마스킹하지 않는다**(mask 규약과 동일) — 구조 라벨이 사라지면 접근성까지 무너진다.
- **F. 색만으로 정보 전달 금지.** StatusBadge·경고는 색+**텍스트/아이콘** 병행(색맹 대응). tone만 다르고 라벨이 같으면 구분 불가.

## 페이지/위젯 만들 때 체크리스트 (누락 금지)
1. **모든 아이콘 전용 조작요소**에 접근名 — `IconBtn label` 또는 `aria-label`. bare 클릭 div 금지.
2. **모든 입력**(input/select/textarea/커스텀)에 프로그램적 라벨 — `Field` 래핑 또는 `aria-label`. **placeholder만 두지 말 것**(함정 A).
3. **키보드 단독 조작** — 마우스 없이 Tab/Shift+Tab/Enter/Space/Esc/화살표로 전 기능 도달·실행 가능. 커스텀 드롭다운·플라이아웃·탭은 화살표+Esc, `role`/`aria-expanded` 부여(또는 Radix 프리미티브 사용).
4. **초점 순서·가시성** — DOM 순서가 논리적, 초점 이동이 시각적으로 보임(전역 링 유지). 모달 열림 시 트랩·닫힘 시 복귀(Radix면 자동).
5. **의미 태그** — `<button>`/`<nav>`/`<h_>`/`<ul>`. div로 흉내 금지.
6. **이미지/차트** — `<img>`엔 `alt`(장식은 `alt=""`). 정보 차트는 인접 텍스트/표로 대체 정보 제공(SVG 차트는 SR이 못 읽음).
7. **동적 상태 알림** — 조회완료·저장·에러·로딩을 `Alert`/`Skeleton`/`Spinner` 라이브리전으로 SR에 전달(함정 D 아님, 별개).
8. **색+텍스트 병행**(함정 F), **대비**는 color-tokens 준수, **모션**은 전역 reduced-motion에 얹되 JS 자동이동은 직접 가드.
9. **확대/리플로우** — 브라우저 400% 확대(=폭 320px 상당)에서 가로 스크롤 없이 읽힘. responsive-ui 검증과 겹치니 함께 확인.
10. **폼 오류** — 어느 필드가 왜 틀렸는지 텍스트로(색만 X), 오류 요소로 초점 이동 가능. `Field`의 `errMsg` 사용.

## 검증 프로토콜 (완료 선언 전)
1. `npm run build` → exit 0.
2. **키보드 단독 워크스루**: 마우스 치우고 Tab만으로 새 화면의 모든 조작요소 도달→실행, 모달 열고 Esc로 닫기, 초점이 항상 보이는지.
3. **접근名 실측**(브라우저 콘솔):
   ```js
   // 접근名 없는 조작요소 탐지 (버튼/링크/입력)
   [...document.querySelectorAll('button,a,input,select,textarea,[role="button"]')]
     .filter(el => { const n = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title')
       || (el.labels && el.labels.length) || el.getAttribute('placeholder')?'(placeholder만)':'').toString().trim();
       return !n || n === '(placeholder만)'; })
     .map(el => ({ tag: el.tagName, type: el.type, ph: el.placeholder }));
   // → placeholder만 있는 입력은 접근名 미달로 잡힘(함정 A)
   ```
4. **자동 검사**: Chrome DevTools **Lighthouse(Accessibility)** 또는 **axe DevTools** 확장 — 라이트·다크 **양 테마 모두** 실행(대비는 테마별로 다름).
5. **대비**: color-tokens 규약 기준 통과 확인(본문 4.5:1).

## 흔한 함정 요약표
| 증상 | 진짜 원인 | 처방 |
|------|----------|------|
| SR이 아이콘 버튼을 "버튼"으로만 읽음 | 접근名 없음 | `IconBtn label` / `aria-label` |
| SR이 입력을 "편집, 비어 있음"으로만 읽음 | placeholder만 있음(함정 A) | `Field` 래핑 or `aria-label` |
| 리치텍스트 본문 클릭 시 굵게가 켜짐 | `<label>`이 툴바 첫 버튼과 암묵 연결(함정 B) | `plain`+자체 aria-label |
| Tab이 요소를 건너뜀 | `<div onClick>` (포커스 불가) | `<button>` 사용 |
| 초점이 어디 있는지 안 보임 | `outline:none`로 링 제거(함정 C) | 전역 `:focus-visible` 복원 |
| 모달 뒤 배경으로 Tab이 샘 | 손수 오버레이(트랩 없음) | Radix/shadcn Dialog |
| 조회 결과가 SR에 안 알려짐 | 라이브리전 없음 | `Alert`/`Skeleton`/`Spinner` |

## 크로스링크 (중복 금지 — 저기서 관리)
- **색·대비·다크모드 전경**: `color-tokens` 스킬 / `docs/COLOR_TOKENS.md`
- **터치 타깃·400% 리플로우·모바일**: `responsive-ui` 스킬
- **오버레이가 카드에 가려질 때**: `z-index` 스킬
- **날짜 선택**: `apfs-datepicker` 스킬
- **CRUD 폼 모달 골격**: `apfs-form-modal` 스킬
- **원칙 원문/개발 체크리스트**: `docs/A11Y.md`
