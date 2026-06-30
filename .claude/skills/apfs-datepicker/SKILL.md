---
name: apfs-datepicker
description: APFS 대시보드 일자선택 규약 — 네이티브 <input type="date"> 대신 shadcn Radix Calendar + Popover(DatePicker)를 전 화면 공용으로 쓴다. 날짜입력·일자선택·달력·date picker·DatePicker·Popover 달력을 만들거나 수정할 때, 값이 하루 어긋나거나(타임존) 달력 셀 크기가 무너지거나 팝오버가 모달 뒤에 가리거나 모달/드로어 안에서 년·월 드롭다운이 안 열리고 날짜가 선택 안 될 때 사용. Use when adding or editing date selection (calendar/date-picker/Popover) anywhere in the dashboard, or when a date is off-by-one, calendar cells collapse, the popover hides behind a modal, or the year/month dropdown won't open inside a dialog/drawer.
---

# apfs-datepicker Skill

## 컨텍스트
APFS는 네이티브 `<input type="date">`를 쓰지 않는다. 전 화면 일자선택은 **shadcn Radix Calendar + Popover** 조합인 `DatePicker`로 통일돼 있다(PR `feat/shadcn-radix-datepicker`, 2026-06-30).

- **정본 컴포넌트**: `src/dash/ui/date-picker.tsx`(`DatePicker`) + `calendar.tsx` + `popover.tsx`.
- **소비처는 단 2곳** — 모든 `control:'date'`/`kind:'date'`/`type:'date'` 메타가 이 둘로 수렴:
  - `schemas/renderers.tsx` `SchemaField` `case 'date'` (폼 모달 — →[[apfs-form-modal]])
  - `generic_list.tsx` 필터 드로어 `kind === 'date'` (상세 필터 — →[[apfs-detail-filter]])
- **의존성**: `react-day-picker@10.0.1` · `date-fns@4.4.0` · `@radix-ui/react-popover@1.1.17`.

## 핵심 계약 (CRITICAL)
1. **값 계약 = `'YYYY-MM-DD'` 문자열**(빈 문자열 = 미선택). `DatePicker`의 `value`/`onChange`는 **반드시 `string`** 시그니처를 보존하라 — 필터 정확일치(`rv === value`)·zod·Excel 내보내기·데이터 마스크가 모두 이 포맷에 의존한다. `Date` 객체를 흘리지 마라.
2. **🔴 타임존(KST)**: `toISOString()` **절대 금지**(KST에서 하루 빠진다 — off-by-one). 로컬 자정 `Date` ↔ 문자열 변환은 date-fns `format(d, 'yyyy-MM-dd')`(로컬)·`parseISO('YYYY-MM-DD')`(로컬 자정)로만. **검증: 15일 클릭 → `2026-06-15`(14 아님).**
3. **트리거 accname**: 트리거가 `<button>`이라 감싸는 `<label>`로 명명되지 않는다(accname 규칙: label은 input류만 암묵 연결). 네이티브 input이 받던 필드명을 보존하려면 소비처가 **`ariaLabel` prop으로 필드 라벨을 넘긴다**(`field.label`/`ff.label`).
4. **Popover 부유**: Popover는 body 포털 + `z-popover`(85) > `z-modal`(80)이라 Dialog(폼 모달)·Sheet(필터 드로어) **양쪽 안에서 오버레이 위로 정상 부유**한다. 임의 z 숫자로 추월하지 마라(→[[z-index]] · 비포털 트랩 [[lnb-flyout-stacking-trap]]).
5. **🔴 Dialog/Sheet 안에서는 Popover에 `modal` 필수**: `DatePicker`의 Popover는 `modal`로 연다(`date-picker.tsx`). 안 그러면 **부모 Radix Dialog/Sheet의 focus-trap이, body로 포털된 캘린더 안 네이티브 년/월 `<select>`가 받아야 할 포커스를 즉시 빼앗아**(activeElement→body) **드롭다운이 안 열린다**. 날짜 버튼은 클릭 즉발이라 멀쩡해 보이는데 년/월만 안 되는 게 증상. `modal` Popover는 자체 focus scope를 스택 위에 얹어 부모 트랩을 일시중지시켜 `<select>`가 포커스를 유지한다. **검증 필수**: 모달/드로어 안에서 년 드롭다운 열기 + 닫은 뒤 `getComputedStyle(document.body).pointerEvents`가 `none`으로 안 남는지(modal 중첩의 pointer-events 누수 — 누수 시 폼이 클릭 불가). 양 consumer(Dialog·Sheet) 모두 확인.
6. **🔴 `calendar.tsx`의 `components`(Root/Chevron/WeekNumber)는 모듈 스코프로 호이스팅 — 인라인 금지**: react-day-picker는 `components.*`를 **컴포넌트 타입**으로 받는다. 렌더마다 인라인 화살표(`components={{ Root: ()=>… }}`)면 매 렌더 새 함수 정체성 → React가 `rdp-root`를 **언마운트→리마운트**(전체 DOM 교체). 평소엔 무해(1회)지만 #5의 `modal` 트랩 안에서 네이티브 `<select>`를 열면(그 순간 `activeElement===body`) 이 리마운트의 `removedNodes`를 **Radix `FocusScope`의 MutationObserver가 "focus 이탈"로 오판→컨테이너로 focus 복귀→RDP focus state 변경→재렌더→또 리마운트**… 무한루프가 돌며 **OS 드롭다운이 "열렸다 즉시 닫힌다"**(#5의 `modal`만으론 못 막는 **별개 근본원인, 같은 증상**). Calendar props를 클로저로 잡지 않는 Root/Chevron/WeekNumber를 `DEFAULT_CN`처럼 모듈 스코프 `function`으로 빼 정체성을 영구 고정하라(`DayButton`은 이미 모듈 함수). **검증(결정적·계측)**: 캘린더 안 `.z-popover`에 `MutationObserver({childList,subtree})`를 걸고 년 `<select>` 클릭 → `removedNodes` 발생 mutation 수가 **수백→0**이어야 함(0이 아니면 다른 정체성 소스나 `autoFocus`/`CalendarDayButton`의 `modifiers.focused` effect를 의심). 양 consumer(Dialog·Sheet) 모두.

## shadcn 소스 이식 함정 (v4 → Tailwind 3.4)
shadcn `new-york` 소스는 **Tailwind v4 문법**이다. 이 프로젝트는 **3.4**라 새 컴포넌트 추가/달력 업그레이드 시 변환 필수 — 안 고치면 **셀 크기가 무너진다**:

| v4 (shadcn 원본) | → 3.4 (이 프로젝트) | 사유 |
|------------------|---------------------|------|
| `h-[--cell-size]` | `h-[var(--cell-size)]` (전부) | 3.4는 `var()` 명시 필요 |
| `**:` · `rtl:` 줄 | 줄 자체 제거 | 3.4 미지원 |
| `has-focus:` | `has-[:focus]:` | 3.4 문법 |
| `shadow-xs` | `shadow-sm` | 3.4엔 `xs` 없음 |
| `today: bg-accent` | `today: bg-accent-surface` | **`accent`=navy 링크색**이라 매핑 안 하면 오늘셀이 navy로 칠해짐 |
| `ring-ring/50` | `ring-ring` (solid) | opacity 모디파이어 무음실패(→[[tailwind-opacity-modifier-broken]]) |

- cva/shadcn `Button`을 보유하지 않으므로 nav/day 버튼은 **인라인 ghost 클래스**로 쓴다(`preflight:false`라 배경/테두리를 명시해야 보인다 → [[color-tokens]]).

## 사용
- **폼/필터에서는 직접 import 불필요** — 스키마에 `control:'date'`(또는 필터 `kind:'date'`)만 선언하면 `SchemaField`/필터 드로어가 자동으로 `DatePicker`를 렌더한다.
- **임의 위치에 직접 둘 때만**:
  ```tsx
  import { DatePicker } from '@/dash/ui/date-picker'; // 경로는 소비처 기준
  <DatePicker value={v} onChange={setV} ariaLabel="기준일" invalid={!!err} />
  // v 는 반드시 'YYYY-MM-DD' 문자열. 빈 문자열 = 미선택.
  ```
- `mode="single"` + `required` 미지정이라 **선택일 재클릭 = 해제**(`onChange('')`)가 유일한 clear 수단이다. 선택/해제 모두 팝오버를 닫는다(일관성).

## 범위/필터 작성 시 (날짜 2개로 기간)
범위는 별도 컴포넌트가 아니라 **단일 `DatePicker` 2개**(시작/종료)로 구성하고 상태를 직접 소유한다. 이때 함정:
- **빈 값 = 열린 경계**: 필터 술어는 `(!start || d >= start) && (!end || d <= end)`. 해제로 빈 문자열이 된 경계를 `d <= ''`로 비교하면 모든 행이 탈락한다(필터가 전부 걸림).
- **사전식 비교는 zero-pad 덕분에만 성립**: `'YYYY-MM-DD'`는 `format`이 항상 0-패딩하므로 문자열 `>=`/`<=`가 곧 시간순. 행의 날짜 필드도 같은 포맷이어야 한다.
- **🔴 `data.ts`는 날짜 포맷 혼용**: 일부는 `'2026-06-16'`(하이픈, 비교가능)·일부는 `'2026.07.02'`(점, **사전식 비교 불가**). 점 구분 필드를 거르려면 먼저 정규화(`d.replace(/\./g,'-')`)하거나 `Date`로 비교. 가정 금지.
- **"오늘"은 클릭 시점에 계산**: `new Date()`를 모듈 스코프 상수로 두지 마라(오래 열린 SPA 탭이 자정 넘기면 stale). 핸들러 안에서 `new Date()` + `format(subDays(now,7),'yyyy-MM-dd')`. (프로토타입에서 더미데이터가 특정 월에 몰려 실-시계 "최근 N일"이 빈 결과면, `schedule.tsx`처럼 고정 기준일을 쓰는 선택지도 있음.)

## 검증
- 15일 클릭 → `2026-06-15`(off-by-one 아님) · 재클릭 → `''`.
- 라이트/다크 모두 셀 크기·대비(→[[responsive-ui]] · [[color-tokens]]).
- Dialog(폼 모달)·Sheet(필터 드로어) **안에서** 팝오버가 오버레이 위로 부유하는지(→[[z-index]]).

## 참조
- 폼 모달 `control:'date'`: [[apfs-form-modal]] · 필터 `kind:'date'`: [[apfs-detail-filter]]
- 레이어/쌓임맥락: [[z-index]] · 색 토큰: [[color-tokens]] · 반응형: [[responsive-ui]]
