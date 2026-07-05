# APFS 대시보드 접근성 감사 보고서

## Executive Summary

- 검증된 위반 **41건**(CONFIRMED 37 + UNCERTAIN 4). Critical 없음, **Major 12건 / Minor 25건**. 대부분이 소수 공유 컴포넌트에서 발원하는 **체계적 패턴 5종**으로, 원인 파일 몇 개만 고치면 다수가 일괄 해소된다.
- 영향이 가장 큰 것은 **키보드 완전 차단**: `charts.tsx` Treemap 셀이 div+onClick 주 컨트롤이라 산업별 드릴다운에 키보드/AT 사용자가 도달 불가(대체 경로 없음). 그리고 `tweaks-panel.tsx` 라디오는 키보드로 값 변경 자체가 안 된다.
- 가장 광범위한 패턴은 **정보 차트 SVG 텍스트 대안 전무**(`charts.tsx` 프리미티브 1곳 → 8개 화면 전파)와 **토글 상태 aria-pressed 누락**(`components.tsx` FilterChip/IconBtn → 6개 화면 전파). 둘 다 공유 프리미티브 레벨에서 근본 수정 가능.
- 폼 영역에서 **검증 실패가 스크린리더에 전혀 통지되지 않는** 결함(`generic_list_modal.tsx`)이 Major로 확인됨 — 저장 실패 시 SR 사용자는 아무 안내를 받지 못한다.
- placeholder만으로 접근名을 대신하는 입력이 5개 화면에 반복되며, 그중 `designsystem.tsx`는 정본 데모라 소비처 복제 시 결함이 전파된다.

---

## A. 즉시 고칠 High-confidence 항목 (CONFIRMED 37건)

### Major (12건)

#### 체계적 패턴 1 — 정보 차트 SVG에 텍스트 대안 전무 (img-alt · 근본 원인 Major)
공유 차트 프리미티브가 `role`/`aria-label`/`<title>`을 방출하지 않아, 수치가 SVG 도형과 hover 툴팁에만 존재한다. 비시각 사용자에게 데이터가 완전히 누락된다(WCAG 1.1.1).

- **근본 원인 — `charts.tsx:147`** (Major): ComposedBars·LineTrend·GroupedBars·Gauge·Sparkline 전부 텍스트 대안 없음. (Donut·HBars는 소비처가 DOM 텍스트 레전드를 렌더해 제외됨)
- 처방: 각 데이터 차트 `<svg>`에 `role="img"` + 요약 `aria-label`(또는 `<title>/<desc>`)을 주고, 소비처에서 `aria-label`을 주입할 prop을 연다. 장식용 Sparkline은 `aria-hidden` 명시.
- **전파처(모두 Minor)**: `report.tsx:417`, `accounting.tsx:411`, `risk.tsx:360`(LineTrend), `asset.tsx:242`, `report_main.tsx:293`, `gallery_charts.tsx:101`(DualSeries·레전드 자체 부재)·`:126`(PieLabeled)·`:36`(ColumnTrack) — `charts.tsx`에 옵셔널 `ariaLabel`/`summary` prop을 추가하면 전 화면 일괄 적용.

#### 체계적 패턴 2 — 키보드 조작 불가 (keyboard)
- **`charts.tsx:323` / `main_widgets.tsx:86`** (Major): Treemap 셀이 순수 `<div onClick>`(role/tabIndex/onKeyDown/aria-label 전무)인데 `onNav("performance")` 드릴다운의 유일 컨트롤. Donut과 달리 IndustryCard에는 키보드 대체(레전드 버튼)가 없음. 작은 셀은 라벨조차 안 그려 목적지도 미노출.
  - 처방: `onCell` 존재 시 셀을 `role="button" tabIndex={0}` + `onKeyDown`(Enter/Space) + `aria-label={`${c.name} ${pct}%`}`로 렌더하거나 `<button>` 래핑.
- **`tweaks-panel.tsx:399`** (Major): TweakRadio 버튼에 onClick/onKeyDown 없이 값 변경이 부모 div의 `onPointerDown`에만 의존 → 키보드 Enter/Space는 click만 발생시키므로 값이 절대 안 바뀜.
  - 처방: 각 버튼에 `onClick={() => onChange(o.value)}` 추가. 화살표키 roving tabIndex 권장.

#### 체계적 패턴 3 — placeholder-only 입력 (accessible-name)
`<div className="relative">`로만 감싸이고 `<label>` 래핑·aria-label이 없어 접근名이 placeholder뿐. placeholder는 입력 시 사라져 지속 접근名으로 인정 안 됨(WCAG 4.1.2/3.3.2).

- **`subfund.tsx:250`** (Major): 자펀드 검색 입력. 처방: `aria-label="자펀드 검색"`.
- **`designsystem.tsx:146`** (Major): InputGroup 정본 데모의 검색 입력 — 소비처 복제 시 결함 전파. 처방: InputGroupInput에 `aria-label` 또는 시각 숨김 `<label htmlFor>`.
- **`fields:173`** (Major): 리치텍스트 링크/이미지 URL `<input type="url">`. 처방: `aria-label={pMode==='image'?'이미지 URL':'링크 URL'}`.
- (Minor 전파: `gp_health.tsx:274` 운용사 select, `:315` 정산기간 select — 각 `aria-label` 추가)

#### 개별 Major
- **`tweaks-panel.tsx:329`** (accessible-name): TweakToggle `role=switch` 버튼이 `<i/>`뿐, 라벨은 형제 div. SR은 이름 없이 'switch on/off'만 낭독. 처방: `aria-label={label}` 또는 라벨 span id + `aria-labelledby`.
- **`tweaks-panel.tsx:305`** (accessible-name): TweakRow가 라벨을 `<div>`로 렌더 → 자식 Slider(range)/Select/Text 입력 접근名 전무. 처방: 루트를 `<label>`로 바꾸거나 `useId`로 htmlFor/id 배선, 최소 각 입력 `aria-label`.
- **`components.tsx:128`** (color-only · FilterChip 근본): raw `<button>`에 `aria-pressed`/role 없어 active 상태가 색으로만 노출(1.4.1/4.1.2). dot을 안 넘기는 소비처(main_widgets/subfund/performance 등) 다수. 처방: `aria-pressed={!!active}` 추가 + dot 없는 소비처에 상시 비색상 단서(체크 아이콘 등).
- **`schedule.tsx:153`** (color-only): 캘린더 날짜 토글 버튼 선택 상태가 배경/테두리 색으로만 표현, aria 전무. 처방: `aria-pressed={isSelected}`.
- **`generic_list_modal.tsx:53`** (form-error): 필수 검증 실패가 SR에 능동 전달 안 됨 — 오류 span에 role/aria-live 없음, `aria-invalid` 미설정, 실패 필드로 포커스 미이동(WCAG 3.3.1/4.1.3). 처방: 오류 span에 `role="alert"` + 고유 id, 입력에 `aria-describedby` 연결, SchemaField에 `aria-invalid`, submit() 후 실패 필드 `ref.focus()`.

### Minor (25건)

#### 체계적 패턴 4 — 토글 active 상태 aria-pressed 누락 (semantic/color-only)
공유 버튼이 눌림 상태를 색으로만 표시. 텍스트 라벨은 있어 무엇인지는 식별 가능하므로 Minor.
- **`asset_funding.tsx:326`**: '전체보기' IconBtn — `aria-pressed={active}` 필요(공유 IconBtn은 aria-pressed 미방출).
- **`risk.tsx:340`**, **`risk_manage.tsx:238`**: FilterChip active — `components.tsx:128` 근본 수정으로 동시 해소.
- **`main.tsx:158`**: 레이아웃 시안 토글 — 바로 아래 형제 네비 토글(`:170`)은 `aria-pressed`를 쓰는데 이것만 누락. 처방: `aria-pressed={variant===v.id}`.

#### 체계적 패턴 5 — 캘린더/일정 색 점 (color-only/semantic)
날짜/일정 상태가 장식 색 점·title 속성으로만 전달, 버튼 접근名은 숫자뿐.
- **`schedule.tsx:162`**: 일정 유무 → 버튼 aria-label에 건수 포함 또는 sr-only.
- **`schedule.tsx:158`**: '오늘' 배경색만 → `aria-current="date"`.
- **`schedule.tsx:246`**: 알림 읽음/안읽음 색+점만 → sr-only '읽지 않음' 또는 aria-label.
- **`accounting.tsx:119`**: 캘린더 일정이 비대화형 `<span>` title+색만(키보드 도달 불가, 일정명은 title에만). 처방: 각 점에 `role="img"`+aria-label 또는 날짜별 일정 목록 sr-only.

#### tweaks-panel 라벨 미연결 (dev 전용 패널이나 렌더 위반은 사실)
- **`tweaks-panel.tsx:458`** (TweakNumber `<input type=number>`), **`:496`** (TweakColor `<input type=color>` 폴백) — 각 `aria-label={label}`.

#### 폼 모달 라디오/첨부 시맨틱
- **`generic_list_modal.tsx:48`** / **`schemas-renderers:52`** (semantic): radio가 complex 예외에서 빠져 Field `<label>`로 감싸짐 → **중첩 label**(HTML 무효) + 그룹 헤더가 첫 라디오에만 암묵 연결. 처방: `complex = ... || f.control==='radio'`로 `<div>` 래핑 + 컨테이너에 `role="radiogroup" aria-label={field.label}`.
- **`generic_list_modal.tsx:105`** (accessible-name): filepond 필드는 DocumentsField에 label 미전달 → 라벨 span orphan(richtext와 비대칭). 처방: DocumentsField에 label prop 받아 `aria-label` 지정.

#### 차트 hover-only 값 (keyboard)
- **`charts.tsx:168`**: ComposedBars/LineTrend/GroupedBars 정확 수치가 onMouseEnter 툴팁에만 — 키보드/터치 도달 불가. 처방: hover 대상에 tabIndex+onFocus/onBlur 병행 또는 패턴 1의 aria-label 요약.

#### 앱 셸 (app.tsx)
- **`app.tsx:78`** (reduced-motion): `window.scrollTo({behavior:'smooth'})`가 prefers-reduced-motion 미존중(JS 명령형이라 전역 CSS 억제로 안 잡힘, WCAG 2.3.3). 처방: `matchMedia('(prefers-reduced-motion: reduce)')` 분기로 behavior='auto'.
- **`app.tsx:115`** (live-region): 라우트 전환/PageSkeleton 스왑이 SR에 미통지(`<main>`에 aria-busy/live/포커스 이동 없음, WCAG 4.1.3). 처방: `<main>`에 `aria-busy={loading}` + 전환 시 tabIndex=-1 프로그램적 포커스 이동.

#### 기타 개별 Minor
- **`shell.tsx:314` / `:391`** (color-only): 알림 행 StatusBadge label이 전각 공백뿐 → tone(위험/주의/정보)이 색으로만 전달, SR엔 상태 소실. 처방: `label={tag}` 또는 sr-only/aria-label로 상태명 부여.
- **`main.tsx:104`** (semantic): onNav 없는 IRR HeroStat이 `onClick=undefined`인 포커스 가능 `<button>`이 되어 무동작. 처방: onNav 있을 때만 `<button>`, 없으면 `<div>` 또는 aria-disabled.
- **`report_bucheo.tsx:71`** (color-only): 승인 스텝퍼 현재/완료 단계가 aria-current 없이 tone·aria-hidden check로만 구분. 처방: 활성 단계 `aria-current="step"` + 단계별 상태 sr-only 텍스트.
- **`report_main.tsx:277`** (color-only): NavCard badgeUrgent가 CountPill 빨간 배경색만으로 '긴급' 전달. 처방: `aria-label={`긴급 ${count}건`}` 또는 sr-only/아이콘.
- **`components.tsx:164`** (accessible-name): IconBtn badge(알림 unread 수)가 시각만, 접근名 미반영(소비처 `shell.tsx:705` bell). 처방: `aria-label={badge>0 ? `${label} (${badge>99?'99+':badge})` : label}`.
- **`ui-radix`(dropdown-menu.tsx):63** (color-only): DropdownMenuRadioItem 선택 상태를 배경 틴트+텍스트 색만으로 구분(ItemIndicator 없음). Radix가 aria-checked는 제공하므로 저시력 한정. 처방: `ItemIndicator`(Check/Circle) 복원 또는 '현재' 표식.

---

## B. 판단 필요 항목 (UNCERTAIN 4건)

각각 실렌더 사실은 맞으나 WCAG 하드 위반 확정이 어려워 보류. 개선은 권장, 우선순위 낮음.

- **`main.tsx:78`** (img-alt · GaugeLight): svg에 role/aria-label 없으나 78% 값이 실제 `<text>` 노드로 존재. 현대 SR이 인라인 SVG text를 노출하는 경우가 많아 '값 손실' 확정 불가. → 선택적 강화: `role="img"`+aria-label(마스크 규약 준수), 원호 path는 aria-hidden.
- **`row_context_menu.tsx:56`** (keyboard): `role="menu"` 선언했으나 포커스 이동/화살표 roving 없음. 단 항목이 native `<button>`이라 Tab+Enter+Esc로 조작 가능 → 2.1.1은 충족, ARIA best-practice 미달(포커스가 원 셀에 orphan). → 열림 시 컨테이너/첫 항목에 focus, ArrowUp/Down + Home/End, 닫힘 시 트리거로 포커스 복원.
- **`charts.tsx:109`** (keyboard · Donut 조각): 조각 `<path>`는 키보드 비접근이나, 소비처 StatusDonut(`main_widgets.tsx:61-70`)이 동일 setActive를 수행하는 진짜 `<button>` 레전드를 병존 렌더 → 기능은 키보드 완전 조작 가능. (Treemap과 결정적 차이). → 일관성 위해 조각에 role/tabIndex/aria-label 추가 가능하나 우선순위 낮음.
- **`schemas-renderers:40`** (form-error): native 컨트롤에 aria-invalid/aria-required 부재. 단 오류는 색만이 아니라 errMsg 텍스트로 전달되고 `<label>` 래핑으로 프로그램적 연결됨(음성출력됨). 남는 결핍은 속성의 문자 그대로의 부재뿐. → 선택적: `aria-invalid={!!invalid}`, 필수에 `aria-required` 보완.

---

## 근본 수정 우선순위 (전파 효과 큰 순)

1. **`charts.tsx`** — 프리미티브에 `ariaLabel`/`summary` prop 추가 → 패턴 1(img-alt 8건) + 패턴 5 일부 + hover-only 해소.
2. **`components.tsx`** FilterChip/IconBtn에 `aria-pressed` → 토글 상태 6건 해소.
3. **`charts.tsx` Treemap** 키보드 배선 → Major 드릴다운 차단 해소.
4. **`tweaks-panel.tsx`** 라벨 `<label>` 전환 → accessible-name 5건 해소.
5. **`generic_list_modal.tsx`** 폼 오류 라이브리전+포커스 → 폼 접근성 Major 해소.

*Critical 등급 없음. 검증 스코프 내 데이터 손상/보안 위험 항목 없음. 파일명이 `fields`·`schemas-renderers`·`ui-radix`로 표기된 3건은 원 JSON의 논리적 파일 라벨로, 실제 경로는 각각 리치텍스트 필드 컴포넌트·renderers.tsx·dropdown-menu.tsx 계열임.*