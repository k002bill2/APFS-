---
name: apfs-detail-filter
description: APFS 리스트 페이지 "상세 필터"(필터 드로어) 작성·확장 규약. 필터 항목을 라벨 타입에 맞는 값 컨트롤(년도 picker·열거형 select·날짜·텍스트·카테고리 토글)로 렌더하고, 선택값을 filterValues SSOT로 모아 실제 행을 필터링한다. 상세필터·필터 드로어·필터 항목·필터 칩·필터 패널 작업, 새 필터 추가, 체크박스형 필터를 값-컨트롤로 바꿀 때 반드시 사용. Use when building or editing the list detail-filter drawer (type-aware value controls + real row filtering).
---

# apfs-detail-filter

스키마 주도 `GenericListPage`의 상세 필터 = **항목 라벨에 맞는 값 컨트롤 + 그 값으로 실제 행 필터링**.
체크박스 on/off가 아니라 "년도면 year picker, 열거형이면 select, 카테고리면 토글"이 원칙.

## 적용 대상
- 정본: `generic_list.tsx`의 `ListFilterDrawer`(스키마 `filters`를 컨트롤로 노출). 페이지 골격은 [[apfs-grid]].
- `performance.tsx`에도 자체 필터 드로어가 있으나 미통합 — 신규/수정 시 이 패턴을 쓰고, 여력 되면 통합.

## SOP — 새 필터 추가는 보통 한 줄
1. 스키마 `filters: string[]`에 라벨 추가. **라벨을 대응 field/column의 label과 정확일치**시키면 컨트롤·행필터가 자동 해결된다(추가 코드 0). 라벨 출처는 [[apfs-capture-schema]].
2. 끝 — `resolveFilterField`가 타입 도출 → 드로어가 컨트롤 렌더 → `makeRows`가 도메인값 시드 → `rowMatchesFilters`가 행을 거른다.
   별도 컨트롤이 필요한 새 kind를 추가할 때만 아래 정본 파일을 건드린다.
- ⚠️ **정확일치가 안전의 전제 — 비대칭 주의**: 라벨이 field/column과 불일치하면 value 타입(year/enum/date/number/text)은 columnKey 미해결로 **안전하게 no-op+캡션**으로 격하되지만, 매칭이 전혀 안 되면 **tag로 떨어지고**, 그 라벨이 `ROW_CATS`(아래 시드 정합)에 없으면 토글 선택 시 **표가 통째로 비워진다**. value=무해, tag=표 증발 — 이 비대칭이 핵심 함정.

## 예약 라벨 `검색어` — opt-in, 켜지면 드로어 최상단 고정
- 검색어 입력은 **기본 OFF**다. `PageSchema.searchable: true`인 페이지에서만 드로어 **최상단에 고정** 노출된다(2026-09-11, 기존 "상시 고정" 폐기). 켜지면 schema.filters와 무관하게(비어도) 뜨고, 끄면 아예 렌더되지 않는다.
  - 배선: `types.ts`의 `searchable?: boolean`(+zod) → `generic_list.tsx` `ListFilterDrawer`가 `{schema.searchable && (…검색어 label…)}`로 게이트. 검색어 OFF이고 filters도 비면 "설정 가능한 필터가 없습니다"(`filters.length===0 && !schema.searchable`).
  - **필요한 페이지만 opt-in**: 스키마에 `searchable: true` 한 줄. 정본 예시는 자펀드 공고 정보관리.
- 정본: `generic_list.tsx`의 `SEARCH_LABEL`("검색어"). `rowMatchesFilters`가 **resolveFilterField보다 먼저 특수 처리** — 행의 전 컬럼 부분일치(OR) + `row.category`, 다른 필터와는 AND. OFF일 때는 드로어가 값을 세팅하지 않아 이 경로가 자연히 무발동(별도 가드 불필요).
- ⚠️ **휴리스틱에 태우지 말 것**: "검색어"는 ③ 휴리스틱에서 **tag로 오판**된다 → ROW_CATS에 없으니 표 증발. 칩 파생(chipItems)도 같은 이유로 `label !== SEARCH_LABEL` 가드로 값-칩을 강제한다.
- **typed 페이지(자체 드로어)도 동일하게 기본 OFF**: PageSchema를 안 쓰므로 `searchable` 대신 **로컬 `const SEARCHABLE = false`**(모듈/컴포넌트 상수)로 검색어 블록을 게이트한다 — 필요한 페이지만 `true`. 정본: `asset_funding.tsx`(`SEARCHABLE` 플래그가 드로어 검색어 `<label>`을 감쌈, 상태 `fText`/chip은 유지되나 입력이 숨겨져 값이 `''`로 고정→자연 무발동). performance는 `applied.q` 배선이라 같은 방식으로 게이트 가능.
- ⚠️ **적용 누락 함정**: GenericListPage만 고치고 typed 페이지를 빠뜨리면 그 페이지에서 검색어가 계속 노출된다(2026-09-11 실제 발생 — asset_funding). "검색어 opt-in"은 **드로어를 가진 모든 표면**(generic_list + 각 typed 페이지)에서 각각 게이트해야 완결된다.

## 타입 도출 — `resolveFilterField(label, schema)` 우선순위
- **① field 매칭**(label 정확일치, 가장 정확): `select`·`radio`·`switch`→enum(field.options, `isEnumControl` — 2026-09-24 radio·switch 추가) · `date`→date · 년도라벨→year · `number`→number · 그외→text.
- **② column 매칭**: 년도라벨→year · `date`→date · `status`→enum(statusDomain) · amount/number/rate→number · 그외→text.
- **③ 휴리스틱**(무매칭): `년도|연도`→year · `일자|날짜|~일`→date · `구분|유형|종류|상태|기준`(도메인 없음)→text · 그외→**tag**(카테고리 on/off).
- 반환 `{label, kind, options, columnKey}`. **columnKey는 행필터의 키** — ①(field.key가 행에 시드됨)·②가 columnKey로 행을 거르고, ③ tag는 `row.category`로 거른다. **데모(자펀드 공고)의 사업연도·정기/수시가 바로 ① 경로**(field 매칭, 키가 columns에도 존재)라 표가 실제로 줄어든다. 같은 스키마의 **모펀드는 columns엔 없지만 `sample` 리터럴 행이 값을 실어** 역시 ① 경로로 걸러진다(2026-09-12). columnKey 없는 경우(어디에도 시드되지 않는 field-only 키·휴리스틱 비-tag date/text)는 칩만 뜨고 행은 안 걸러진다(no-op, 아래 캡션 규약).

## 컨트롤 매핑 (DrawerFilterControl / DrawerCheckRow)
| kind | 컨트롤 |
|------|--------|
| year · enum | 공용 **`DrawerSelect`**(drawer_select.tsx) — 첫 옵션 `전체`(="" = 미적용) + options. enum 옵션 **10개 이상이면 검색형**(운용사 16~23개 등), year 는 `searchable={false}` 로 네이티브 유지 |
| date | `<input type=date>` |
| number · text | `<input type=number/text>` |
| tag | 토글 버튼(체크 아이콘) — 다중선택 |

## 상태·필터링
- **SSOT = `filterValues: Record<라벨, 값>`**(부모 보유, 빈 값/부재 = 비활성). 칩·행필터·KPI 모두 여기서 파생. 라벨↔값을 "라벨: 값" 문자열로 합치지 말 것(`정기/수시`의 `/`가 깨진다).
- **행필터**(`rowMatchesFilters`): 값-필터는 전부 AND(text/number=부분일치, year/enum/date=정확일치), 태그끼리는 합집합(OR, `row.category`). columnKey 없는 값-필터는 건너뜀(no-op).
- 적용 시 `setPage(1)` 리셋. 드로어는 draft 사본을 편집하고 적용 때 부모에 반영, 열릴 때 `applied`로 재동기화.

## 규약 체크리스트 (CRITICAL — 모르면 재발하는 함정)
- [ ] **컨트롤 박스 = 등록 모달과 동일(34px) — 페이지 로컬 복제 금지**: 드로어 입력은 `renderers.tsx`의 **`drawerInputStyle(kind)`** 를 import 해 쓴다(`import { drawerInputStyle as inputStyle } from './schemas/renderers'`). 높이 토큰은 모달 `base`와 공유하는 **`CONTROL_BOX`** 한 곳이 SSOT(`padding:'7px 11px' · fontSize:13.5 · lineHeight:'20px' · height/minHeight:34`). ⚠ 페이지마다 `const inputStyle = …` 로 복사하면 드리프트한다 — 실제로 24개 드로어가 `9px/14px`(≈40px)로 굳어 모달보다 6px 높아졌다(2026-09-17 사용자 지적 → 공용 export로 통합). 패밀리는 **`fontFamily`** 로만 상속(단축 `font`는 `fontSize`·`lineHeight`까지 리셋해 34px 클램프를 깬다).
- [ ] **columnKey 불변식**: columnKey는 **행에 그 키가 실제로 시드될 때만** 부여(`filter_field.ts`의 `seeded`/`colKey` 가드). 시드 경로는 둘 — ① `schema.columns`(makeRows 합성) ② `schema.sample`(목업 리터럴 행은 컬럼이 아닌 필드 키도 싣는다, 2026-09-12). 어느 쪽에도 없으면 침묵 0건 대신 no-op+캡션으로 안전 격하된다 — 가드를 우회해 직접 columnKey를 주지 말 것. ⚠️ sample 경로는 **`sample` 있는 스키마에만** 성립한다(현재 자펀드 공고 1종) — sample 없는 스키마의 field-only 키는 종전대로 격하.
- [ ] **빈 `<select>` 금지**: options/statusDomain이 비면 enum 대신 **text로 격하**(선택지 없는 드롭다운 = 고장처럼 보임).
- [ ] **columnKey 없는 값-필터**: `· 데이터 연동 후 적용` 캡션으로 no-op을 사용자에게 신호(무신호 무효 필터 금지).
- [ ] **시드 정합**: `makeRows`가 컬럼에 도메인값을 심어야 value 필터가 매칭됨 — 년도라벨→YEAR_OPTIONS 순환, select·radio·switch 필드 옵션→options 순환. **tag는 예외**: `row.category`로 매칭되는데 이는 schema가 아니라 `generic_list.tsx`의 하드코딩 `ROW_CATS`에서 시드된다 → 새 tag 라벨이 `ROW_CATS`에 없으면 토글 선택 시 **표가 통째로 비워진다**(value의 안전 no-op과 다른 비대칭). 새 tag 필터는 `ROW_CATS`에 같은 라벨을 추가하거나 `ROW_CATS` 중 하나와 정확일치시킬 것.
- [ ] **토큰·테마**: 색은 `var(--...)`만(하드코딩 hex 금지 — 다크 양립). 태그 토글에 `aria-pressed={checked}`.

## typed 페이지 트랙 (2026-09-08 — 골드 `subfund_manage.tsx`, 스키마 `GenericListPage`가 아닌 전용 페이지)
전용 페이지는 `ListFilterDrawer`를 쓰지 않고 **자체 드로어**를 가진다. 규약은 위와 같되 다음이 다르다:
- **드로어 항목 = 목업 검색박스의 항목·순서 그대로**(자펀드관리: 모펀드·자펀드·계정구분·자펀드구분·사업연도·정기/수시·심사담당자·리스크담당자·심사단계·조합상태·기준일자). ⚠ 검색어는 **기본 OFF opt-in**(위 "예약 라벨 `검색어`" 절 — 상시 아님). 필요한 페이지만 `searchable`/`SEARCHABLE`로 켜고, 켜질 때만 최상단 고정. 행 컬럼과 미연동인 항목은 상태만 두고 `passes`에 넣지 않으며 `DrawerField noop`으로 `· 데이터 연동 후 적용` 캡션.
- **연도/일자 컨트롤 = `PeriodPicker`**(사업연도 `mode="year"`, 기준일자 `mode="day"`) — 연도 `<select>`·네이티브 date 금지(→[[apfs-datepicker]] PeriodPicker 절). 버튼 트리거는 `DrawerField plain`(`<div>` 래퍼, `<label>` 이중 토글 방지) + `ariaLabel`.
  - ⚠️ **폭**: PeriodPicker/DatePicker 트리거는 `w-full`이라 `DrawerField plain`(block 100%)에 **바로 넣으면 드로어 전체 폭으로 늘어난다**(2026-09-09 회귀). 반드시 `<div style={{ width:'fit-content', minWidth: controlMinWidth(year|date), maxWidth:'100%' }}>`로 감싼다 — 네이티브 `DrawerSelect`(자체 fit-content)와 달리 버튼엔 고유 콘텐츠 폭이 없다(검색형 `DrawerSelect` 는 숨은 사이저 스팬으로 최장 옵션 폭을 스스로 잡으므로 래퍼 불필요). 폭 계약 정본은 →[[apfs-datepicker]] "폭" 규칙.
- **select = 공용 `DrawerSelect` import 필수 — 페이지 로컬 복제 금지**(2026-09-29 PR #306). 32개 페이지에 복제돼 있던 로컬 `function DrawerSelect`(시그니처 7종)를 `src/dash/drawer_select.tsx` 하나로 합쳤다. props 는 상위 집합: `options: string[] | {value,label}[]` · `all`(기본 `'전체'`, `null`=전체 항목 없음) · `noAll` · `ariaLabel` · `searchable`. 옵션 10개 이상이면 자동으로 검색형 `SearchableSelect`(Popover+cmdk)로 그린다 — 로컬 복제본을 다시 만들면 그 페이지만 검색이 빠진다. 가드 `drawer_select.test.ts`(네이티브 `<select>` 를 직접 그리는 로컬 `DrawerSelect` 가 있으면 실패).
  - 검색형 트리거는 `<button role=combobox>` 하나라 **`DrawerField`(label 래핑) 그대로 둬도 된다** — 라벨 클릭 = 열림 1회(2026-09-29 실측, 이중 토글은 버튼 **2개**짜리 PairControl 문제). `ariaLabel` 을 안 넘기면 감싼 `<label>` 캡션의 첫 텍스트 노드를 접근名으로 쓴다(폴백 도입 전엔 "전체"로 읽혔다) — 그래도 명시 전달이 정석.
  - Popover 는 **non-modal**(DatePicker 와 같은 이유). 열린 상태에서 다른 컨트롤 첫 클릭이 바로 먹는지(포커스 이동·입력 가능) 검증한다. ego-browser `page.click()` 은 실제 pointerdown 을 쏜다(구 aside `locator.click()` 은 안 쏴서 이 검증 자체가 불가했다). 단 2026-10-26 ego 실측(자펀드 관리 상세필터 `기준일자` → 검색 입력 클릭)에서 pointerdown 이 1회 발생하고 포커스도 옮겨갔는데 달력은 열린 채였다(`page.click` 3/3·`page.mouse.click` 1/1) — 달력이 닫히는지는 별도 확인이 필요하다. **열린 목록이 덮지 않는 컨트롤**을 겨냥할 것(목록 위 좌표면 항목이 선택돼 오판).
- **범위(시작~종료) = 한 항목**(2026-09-24 사용자 지시): `DrawerField label="<그룹명>" plain` 하나 안에 `flex items-center gap-2 flex-wrap` 행 → 시작 picker · `<span className="text-caption">~</span>` · 종료 picker(각 fit-content 래퍼, `ariaLabel`은 시작일/종료일로 따로). `…시작`/`…종료` 두 DrawerField로 쪼개지 말 것. 정본 `audit_log.tsx`. **칩도 한 개**: 값 `${fFrom || '…'} ~ ${fTo || '…'}`(한쪽만 있으면 `…`), `×`는 두 끝을 함께 해제, aria-label은 그룹명.
  - **기본값으로 시작하는 기간**(2026-10-29 PR #368, 일반전표 관리 — 전월 1일~오늘): 첫 진입부터 칩이 떠 있다. `×` = 기간 조건 해제(빈 값 = 전 기간), 드로어 **[초기화] = 기본값 복원**(빈 값이 아님). 기본값은 모델 함수(`defaultPeriod(today)`)로 계산하고 테스트한다. 툴바에 날짜칸을 따로 두지 않는다 — 편집은 드로어에서만.
- **적용 방식 2가지 — 기본은 즉시 반영, 설계서가 "적용 시 검증·차단"을 요구하면 초안(draft) 방식**(2026-10-29 회계 전표관리 3화면):
  - 초안 방식: `applied`(칩·목록 SSOT) + `draft`(드로어 사본) 두 state. 열 때 `setDraft(applied)` → [필터 적용](텍스트 칸 Enter 동일)에서 검증 → 통과해야 `setApplied(draft)` + 닫기. **닫기(X·Esc·바깥 클릭)는 draft 폐기.** [초기화]는 draft 만 기본값으로.
  - **범위 검증 = 시작 > 종료 차단**: 모델 순수 함수(`general_journal_model.ts` `validateRange(from, to)` — 둘 다 있고 `from > to` 면 오류 문구 `시작일은 종료일보다 늦을 수 없습니다.`, 삭제전표는 자체 `validatePeriod`)로 판정하고, 실패하면 `toast.error` 후 **드로어를 닫지 않는다.** 칸 표시는 두 가지가 있다:
    - 실시간 파생(삭제전표 관리): `const periodErr = validatePeriod(draft.from, draft.to)` 를 렌더마다 계산해 두 picker 에 `invalid`.
    - 커밋 시 표시(일반전표·미결계정 관리): 실패한 항목을 `draftErr` state(범위 항목 키 유니온 — 일반전표 `'' | 'period' | 'due'`, 미결계정 `'' | 'occur' | 'clear'`)에 적고 그 항목 `DrawerField errMsg`(`<span role="alert" className="text-danger">`)로 보인다. `setD`(값 편집)·열기·[초기화] 때 `setDraftErr('')`. 범위 항목이 둘이면 첫 실패 항목 하나만 표시한다.
  - 정본: `acc/slip/deleted_journal_manage.tsx`(가장 작음) · `general_journal_manage.tsx` · `suspense_manage.tsx`. 범위 picker 묶음(`DayRange`)은 아직 두 화면에 로컬 사본이다 — 같은 중분류(`acc/slip/`) 안이라 세 번째가 생기면 그 폴더 공용 파일로 뺀다.
- **적용 칩은 GridFrame `appliedFilters` 로 넘긴다**(2026-09-24 — 한 줄, 넘치는 만큼만 `+N` 메뉴. 렌더는 `applied_filters.tsx` 단일 소유 → [[apfs-grid]] "필터 툴바" 절). 아래 규칙(개별 칩·값만·×)은 그 컴포넌트가 구현한다 — 페이지에서 칩 마크업을 다시 쓰지 않는다.
- **적용 칩은 항목별 개별 칩**(합쳐서 `A · B · C` 한 칩 금지). 각 칩 = **값만 표시**(항목명 접두사 없음, 2026-09-08 결정) + `×`(`aria-label="<항목> 필터 제거"`, 해당 필터만 해제). no-op 항목은 칩을 만들지 않는다.
  - ✅ **전 트랙 통일(2026-09-09)**: `generic_list.tsx` `FilterPill`·`asset_funding.tsx` 자체 칩 모두 **값만 표시**로 맞췄다(구 `라벨: 값`/합친 한 칩 폐기). 항목명은 DS **Tooltip**(`ChipTip` — 호버·× 포커스, 본문=항목명만, 칩 본문 `cursor-pointer`(help 물음표는 사용자 거절) — 2026-10-26 네이티브 `title` 대체)+`aria-label`로 회수. **필터를 걸면(새 항목·값 변경) 그 칩 툴팁이 바로 3초 떴다 사라진다** — 첫 렌더(페이지 진입 기본값)·해제는 안 띄우고, 모달(드로어)이 열려 있는 동안 바뀐 항목은 모았다가 닫힐 때 띄운다(즉시 반영형 드로어 대응). 3초 안에 칩에 호버하면 커서가 벗어날 때까지 유지, `+N` 안에 접힌 칩·측정용 사본에는 띄우지 않는다. 정본 `FilterChipRow`(`valueSig`·`freshLabels`·`flashing`, 회귀 테스트 `applied_filters.test.ts`). **"값만"은 항목명 제거지 연산자 제거가 아니다** — `출자금액 ≥ 800`은 `≥ 800`으로 남긴다. 태그형(value 없음)은 라벨이 곧 값 토큰이라 라벨을 표시.
- **모드형 조회기준이 있으면 그것이 주 필터다**(2026-09-24 사용자 지시, `invest_recovery_detail.tsx`): 컬럼·데이터를 함께 바꾸는 `조회기준`(투자및회수/전체거래)은 SegTabs 가 아니라 **깔때기 아이콘 바로 뒤 첫 칩 무리** — GridFrame `filterChips` 데이터(건수 = 그 모드 행에 현재 조건을 건 facet)로 넘긴다. 나머지 원문 검색항목(계정구분 등)은 드로어 + 적용 칩(`appliedFilters`)으로만 — 첫 줄에 두 번째 칩 무리를 만들지 않는다.
- 주 필터 1개(심사단계)는 툴바 `FilterChip`(`심사단계: 전체`+단계들 — 전체 칩 라벨 규칙 → [[apfs-grid]])로 노출, 선택 행이 있으면 툴바 좌 슬롯이 selbar로 바뀐다(→[[apfs-stage-workflow]]).
- 상태 SSOT는 `useState` N개 + `clearFilters`(초기화 버튼·전체 해제 공유). `passes`는 `useCallback`, 변경 시 `apiRef.current?.onFilterChanged()`(External Filter).
- **필터를 바꾸면 선택을 전부 해제한다**(2026-10-27 사용자 결정): 외부 필터와 `rowSelection` 을 함께 쓰는 화면은 필터 effect 를 `useEffect(() => { apiRef.current?.onFilterChanged(); apiRef.current?.deselectAll(); }, [passes])` 로 쓴다(`generic_list` 는 `[filterValues]`). External Filter 는 걸러진 행을 숨기기만 하고 선택은 남기며 `selectionChanged` 도 쏘지 않는다 → "N건 선택됨"이 안 보이는 행을 가리켜 삭제·해제등록이 숨은 행에 걸리고, 선택 중엔 GridFrame 이 칩 줄을 감춰(→[[apfs-grid]] "필터 툴바") 걸린 필터도 안 보인다. `deselectAll()` 은 숨은 행까지 풀고 `selectionChanged` 를 쏘므로 선택 state 가 0 이 되어 칩 줄이 돌아온다. "통과한 선택은 남기고 숨은 것만 해제"(`forEachNodeAfterFilter` prune)는 사용자가 거절했다 — 재제안 금지. 정본 `custody_confirm_manage.tsx`, 가드 `src/dash/filter_clears_selection.test.ts`(두 prop 을 함께 쓰는 `.tsx` 를 조건으로 전수 검사 — 새 화면도 자동 포함).
  - **데이터 변경 경로도 같은 규칙**: 그리드에 `onModelUpdated={dropHiddenSelection}`(`aggrid_selection.tsx`)을 함께 건다 — 선택한 행 하나라도 필터 결과에서 빠지면(`!node.displayed`) `deselectAll()`. 선택한 행을 **수정·단계 전이로 조건 밖에 내보내면** 필터 값(`passes`)이 그대로라 위 effect 가 돌지 않아, 표는 0건인데 "1건 선택됨 · 수정 · 삭제"가 남았다(2026-10-27 실측: 운용인력 변동관리 운용사 필터 + 운용사 수정 / 자펀드 관리 `심사단계: 신청` 칩 + `신청취소`). `restoreSelection` 도 저장된 id 중 숨은 행이 있으면 되살리지 않고 전부 푼다 — `onModelUpdated` 의 해제 직후 같은 틱의 `onRowDataUpdated` 가 아직 낡은 `selIdsRef` 로 되살리는 경합 때문. 같은 가드가 `onModelUpdated` 배선도 검사한다.
  - **숨은 선택이 생기는 경로 3가지와 상태**(2026-10-27 브라우저 점검): ① 필터 값 변경 → 해결(필터 effect) ② 데이터 변경으로 조건 이탈 → 해결(`dropHiddenSelection`) ③ **페이지 이동 → 의도적으로 유지** — 1페이지에서 체크하고 2페이지로 가도 "1건 선택됨"이 남는다. 다른 페이지 행도 rowIndex 가 있어(`displayed=true`, 2페이지 row-index 20~22 실측) 가드가 건드리지 않는다. 그 행은 돌아가면 보이므로 숨은 선택이 아니라 일반 그리드 동작으로 둔다.
  - **미결정(사용자 결정 대기)**: 필터를 건 **뒤에** 행을 체크하면 필터가 걸렸다는 표시가 하나도 없다 — 칩 줄은 09-24 결정대로 숨고([[apfs-grid]] "필터 툴바"), 푸터 `총 N개 중 M개` 의 N 도 필터 적용 **후** 건수라 원래 건수와 비교할 수 없다. 개선 후보는 선택 바에 `필터 N개 적용` 같은 작은 표시 — 09-24 결정을 바꾸는 일이라 지시 없이 만들지 않는다.

## 정본 코드 (로직은 여기, 스킬은 규약만)
- `src/dash/schemas/renderers.tsx` — **`CONTROL_BOX`**(모달·드로어 공유 34px 박스) + **`drawerInputStyle`**(드로어 입력 스타일 SSOT) + `controlMinWidth`(폭 하한)
- `src/dash/schemas/filter_field.ts` — `resolveFilterField` + YEAR_OPTIONS + degrade 가드
- `src/dash/generic_list.tsx` — `DrawerFilterControl` · `ListFilterDrawer` · `rowMatchesFilters` · `makeRows` 시드 · `FilterPill`
- `src/dash/schemas/filter_field.test.ts` — 타입 도출·degrade·columnKey 불변식 회귀 가드

## 검증
1. `npm test`(resolver) + `npm run build` exit 0.
2. 브라우저: 데모(자펀드 공고)에서 년도+열거형 선택 → **표 행 수가 실제로 감소**(호출 분리 측정 — React state flush). 캡션·칩 확인.
   - **높이는 산술이 아니라 실측**: 드로어를 열고 `getComputedStyle(el).height` 가 select·input·PeriodPicker/DatePicker 버튼 **모두 `34px`** 인지 본다(등록 모달의 같은 컨트롤과 대조). 2026-09-17 실측: program-manage·subfund 드로어 전 컨트롤 34px.
3. 라이트/다크 대비 + [[responsive-ui]] 체크(드로어 92vw, 페이지 가로스크롤 없음).

## 참조
- 2026-09-24: 검토필요 마커(ReviewMarker·note 필드·*_NOTE)는 전부 삭제됐다. 목업의 `.review`/`.rpop` 은 이식하지 않는다(2026-09-12 '이식' 규약 폐기). 드로어 필드 라벨에 마커를 달지 않는다.

- 페이지 골격/툴바 슬롯: [[apfs-grid]] · UI 토큰: [[dashboard-ui]] · 반응형: [[responsive-ui]] · 필터 라벨 출처: [[apfs-capture-schema]]
