---
name: apfs-detail-filter
description: APFS 리스트 페이지 "상세 필터" 작성·확장 규약 — 2026-11-17부터 상세필터는 드로어가 아니라 칩 줄 위 인라인 패널(GridFrame filterPanel + 공용 filter_panel.tsx)이다. 필터 항목을 라벨 타입에 맞는 칸(select·다중 선택·연도/월/일 PeriodPicker·범위·텍스트·체크)으로 렌더하고, 선택값을 filterValues SSOT로 모아 실제 행을 필터링하며, 고른 값은 아래 적용 칩에만 보인다. 상세필터·필터 패널·필터 드로어·필터 항목·필터 칩·검색 조건 작업, 새 필터 추가, 드로어를 패널로 바꿀 때 반드시 사용. Use when building or editing the list detail filter (inline filter panel above the chip row, type-aware cells, real row filtering).
---

# apfs-detail-filter

리스트 화면의 상세 필터 = **항목 라벨에 맞는 값 칸 + 그 값으로 실제 행 필터링**.
체크박스 on/off가 아니라 "년도면 연도 picker, 열거형이면 select, 카테고리면 체크"가 원칙.

## ★ 위치 = 칩 줄 위 인라인 패널 (2026-11-17 사용자 지시 — 상세필터 드로어 폐기)
"자펀드정보관리 페이지를 참고해서 모든 페이지의 상세필터를 페이지 위치로 이동". 정본 화면 = **자펀드정보관리**
(`iam/asct/asset_fund_info_manage` → `iam/sfund/subfund_filter_panel`, 2026-11-09~10 사용자 조정이 전부 들어 있다).
- **상세필터 드로어(`Sheet`)·`[상세필터]` 버튼·`filterOpen` state 를 만들지 않는다.** 필터 칸은 GridFrame **`filterPanel`** 슬롯
  (카드헤더 아래·툴바 칩 줄 **위**, `data-filter-panel`)에 `<FilterPanel>` 로 넘긴다. 패널 왼쪽 끝 = 그리드 왼쪽 끝선.
- 칸은 공용 **`src/dash/filter_panel.tsx`** 조각으로만 그린다 — 화면에서 칸 모양(폭·placeholder·키 처리)을 다시 만들지 않는다.
  사후 조정(폭·값 표시 여부 등)은 그 파일 한 곳에서 끝나야 한다(예: 칸에 값 보이기 = `FIXED_PLACEHOLDER` 한 줄).
- 즉시 반영·SSOT·칩 규칙·행필터 로직(아래 절들)은 드로어 시절 그대로다 — 바뀐 것은 **칸을 그리는 위치와 모양**뿐이다.

### 칸 모양 (filter_panel 머리말이 정본)
- **캡션 없음 — 항목명 = placeholder = `aria-label` = 적용 칩 `label`**(정확일치). 칩 클릭 이동(`focusPanelField`)이 aria-label 로 칸을 찾는다.
- **폭 120px 고정**(항목명이 더 길면 그 길이만큼 — `cellStyle` 이 CSS 변수 `--cell-w` 로), ≤640px 2열, `flex-wrap`(줄 수는 화면 폭이 정한다).
- **고른 값은 칸에 남지 않는다 — 아래 적용 칩에만**(2026-11-09/10 사용자 "선택해도 placeholder 가 다시 보이게 — 선택항목은 아래 필터칩에 들어가기 때문").
  그래서 **값 숨김 칸은 칩이 필수**다(칩 없는 칸은 골라도 아무 신호가 없다). 예외: 직접 치는 칸(검색어·텍스트·텍스트 범위)·체크 칸은 값이 보인다.
- 닫힌 네이티브 select 의 방향키는 값 대신 목록을 연다(`openListOnNavKey` — 칸이 늘 '' 라 Windows 방향키 값 변경이 첫 옵션만 걸리는 문제).
- 미연동 칸(`noop`)은 DS Tooltip '데이터 연동 후 적용'(포털발 이벤트 `skipPortal`). 새 미연동 칸은 만들지 않는다(아래 체크리스트).

### 칸 종류 (공용 조각 — 드로어 컨트롤 → 패널 칸 대응표)
| 드로어 시절 | 패널 칸 | 비고 |
|---|---|---|
| 검색어 `ClearableInput` | `<PanelSearch value onChange />` | 맨 앞. 돋보기 아이콘, 친 글자 보임 |
| `<input type=text/number>` | `<PanelText label value onChange [type] />` | 친 값 보임. 드로어의 힌트 placeholder('계정과목명 또는 코드')는 버리고 항목명 |
| `DrawerSelect`(전체 있음) | `<PanelSelect label value onChange options [searchable] />` | '전체' 항목 라벨 = 항목명. `all="선택해 주세요"`·`all="선택"` 같은 빈 값 라벨도 항목명으로 |
| `DrawerSelect`(`noAll`/`all={null}` — 필수·고정 기본값) | `<PanelSelect … required />` | 항목명은 닫힌 상자에만, 목록에선 못 고름. 칩 × 없음 |
| 다른 칸의 뜻을 정하는 수식어 select(검색어의 `검색기준`) | `<PanelSelect … required showValue />` | **칸에 값이 보이고 칩 없음** — 그 자체로 행을 거르지 않아 칩을 두면 검색어 칩('기준: 값')과 같은 말이 두 번 뜬다(2026-11-17, 코드·메뉴·프로그램 관리) |
| `DrawerMultiSelect` | `<PanelMulti label value onChange options />` | 트리거엔 항목명만, 목록 체크는 실제 값. 칩 = '첫 라벨 외 N' |
| `PeriodPicker` 단일(year·month·quarter·half·day…) | `<PanelPeriod label mode value onChange [yearRange] [invalid] />` | **`required` 를 넘기지 않는다**(칸이 늘 비어 빨간 테두리로 그려진다) |
| 범위 `시작 ~ 종료` PeriodPicker 2개 | `<PanelRange label mode from to onFrom onTo [invalid] />` | `role=group aria-label=<항목>` 안 두 칸(`<항목> 시작`/`<항목> 종료`). 칩 하나 = 그룹 |
| 금액 최소~최대 등 텍스트 2칸 | `<PanelTextRange label min max onMin onMax [invalid] [inputMode] [ends] />` | 친 값 보임. `ends` 기본 `['최소','최대']` |
| 라디오(배타 선택 — RiskPage `kind:'radio'`) | `<PanelRadio label value onChange options />` | 고른 값이 칸에 보임(`FilterSpec.chip:false` 는 이렇게 값이 보이는 칸에만) |
| `FlagCheck`·태그 토글(체크박스) | `<PanelCheck label checked onChange />` | 체크 상태가 곧 값 — 칸에 보임 |
| 그 밖(코드+명칭 등 화면 고유 묶음) | `<PanelCell [noop] [wide]>` 안에 직접 + `role=group aria-label=<항목>` | 칩 label = 그룹 aria-label |
| `DrawerField noop`·`· 데이터 연동 후 적용` | 칸 prop `noop` | 툴팁. 캡션 유지 3화면만(memory noop-filter-all-live-decision) |

### 패널 (`<FilterPanel>`)
- `label`(그룹 접근名 — 생략 시 '검색 조건', 화면명 + '조건' 권장) · `children` = 칸들(목업 검색박스 순서 그대로).
- **`onReset`** = [초기화] 버튼(패널 끝, 아이콘 `rotate-ccw` — ⟳ 조회의 `refresh` 와 구분, 2026-11-17 사용자 지시) — **기본값이 빈 값이 아닌 화면만**(예외: `RiskPage` 키트는 화면의 `onReset` 을 ⟳ 조회와 공유해 늘 그린다)(기간 기본값·필수 조건·고정 기본값·체크 플래그 기본값). 드로어의
  `clearFilters`/`resetApplied` 를 그대로 넘긴다. 기본값이 전부 빈 값인 화면은 넘기지 않는다 — 칩 줄 `전체 해제`(칩 2개 이상)와 ⟳ 조회가 같은 일을 한다.
- **`errors`** = 검증 문구 배열(빈 값·false 무시) → 패널 맨 아래 한 줄씩 `role="alert"`. 칸 아래에 두지 않는다(칸 격자가 깨진다).
  드로어 시절 그 칸의 `invalid` 는 그대로 칸 prop `invalid` 로.
- 탭마다 조건이 다르면 `{tab === 'a' ? <>…</> : <>…</>}` 로 children 을 가른다(일/월계표 정본).

### 드로어 → 패널 전환 절차 (화면 1개)
1. `filterPanel={<FilterPanel …>…</FilterPanel>}` 를 GridFrame 에 추가 — 드로어 본문의 `DrawerField` 마다 위 표의 칸 하나. **항목·순서 그대로**, 칸 `label` = 그 화면 `appliedFilters` 칩 `label`(다르면 칩 label 을 칸에 맞춘다 — 칩 클릭 이동의 전제).
2. 드로어(`<Sheet>…</Sheet>`)·`[상세필터]` 버튼·`filterOpen` state·로컬 `DrawerField`/`dayWrap`/`inputStyle` 등 드로어 전용 조각과 그 import 를 지운다.
3. 단축키 `enabled: !filterOpen` 조건을 뺀다(`skipInDialog: true` 는 유지 — 팝업은 그대로 덮는다). `const listKeys = modal === null && !filterOpen` → `modal === null`.
4. 화면 머리말 주석의 '상세필터 드로어'·'[필터 적용] = 닫기' 서술을 '칩 줄 위 인라인 패널'로 고친다.
5. 소스 문자열 테스트가 드로어를 읽으면(`<SheetContent`·`<DrawerField label=`·`setFilterOpen`) `test_src.ts` 의 **`panelSrc(src)`·`panelLabels(src)`** 로 바꾼다 — 단언 의미(항목 순서·검증 배선)는 유지.
6. `npx eslint <파일>`(쓰지 않게 된 import·변수가 error — Vercel 빌드 실패) + 그 화면 테스트.

## 적용 대상
- 스키마 트랙 정본: `generic_list.tsx` 의 `ListFilterPanel`(+`PanelFilterControl` — 스키마 `filters` 를 kind 별 칸으로). 페이지 골격은 [[apfs-grid]].
- typed 트랙(전용 페이지): 화면이 `<FilterPanel>` 을 직접 조립한다(정본 `iam/sfund/subfund_filter_panel` · 회계 `acc/slip/journal_search_manage` · `acc/ledger/daily_monthly_manage`).
- 구 드로어 정본(`ListFilterDrawer`·로컬 `DrawerField` 57벌·`ledger_filter_ui` DrawerField/DayField/DayRangeField/FlagCheck)은 2026-11-17 전부 걷었다 — 다시 만들지 않는다.

## SOP — 새 필터 추가(스키마 트랙)는 보통 한 줄
1. 스키마 `filters: string[]`에 라벨 추가. **라벨을 대응 field/column의 label과 정확일치**시키면 칸·행필터가 자동 해결된다(추가 코드 0). 라벨 출처는 [[apfs-capture-schema]].
2. 끝 — `resolveFilterField`가 타입 도출 → 패널이 칸 렌더 → `makeRows`가 도메인값 시드 → `rowMatchesFilters`가 행을 거른다.
   별도 칸이 필요한 새 kind를 추가할 때만 `PanelFilterControl`·`filter_panel.tsx` 를 건드린다.
- ⚠️ **정확일치가 안전의 전제 — 비대칭 주의**: 라벨이 field/column과 불일치하면 value 타입(year/enum/date/number/text)은 columnKey 미해결로 **안전하게 no-op**(칸 툴팁)으로 격하되지만, 매칭이 전혀 안 되면 **tag로 떨어지고**, 그 라벨이 `ROW_CATS`(아래 시드 정합)에 없으면 체크 시 **표가 통째로 비워진다**. value=무해, tag=표 증발 — 이 비대칭이 핵심 함정.

## 예약 라벨 `검색어` — opt-in, 켜지면 패널 맨 앞 고정
- 검색어 입력은 **기본 OFF**다. `PageSchema.searchable: true`인 페이지에서만 패널 **맨 앞**(`PanelSearch`)에 노출된다(2026-09-11 "상시 고정" 폐기). 켜지면 schema.filters와 무관하게(비어도) 뜬다. 필터도 검색어도 없으면 패널 자체를 넘기지 않는다.
  - 배선: `types.ts`의 `searchable?: boolean`(+zod) → `generic_list.tsx` `ListFilterPanel` 이 `{schema.searchable && <PanelSearch …/>}`로 게이트.
- 정본: `generic_list.tsx`의 `SEARCH_LABEL`("검색어"). `rowMatchesFilters`가 **resolveFilterField보다 먼저 특수 처리** — 행의 전 컬럼 부분일치(OR) + `row.category`, 다른 필터와는 AND.
- ⚠️ **휴리스틱에 태우지 말 것**: "검색어"는 ③ 휴리스틱에서 **tag로 오판**된다 → ROW_CATS에 없으니 표 증발. 칩 파생(chipItems)도 같은 이유로 `label !== SEARCH_LABEL` 가드로 값-칩을 강제한다.
- **typed 페이지도 기본 OFF**: 로컬 `const SEARCHABLE = false` 로 `PanelSearch` 를 게이트한다 — 필요한 페이지만 `true`. 정본 `asset_funding.tsx`.

## 타입 도출 — `resolveFilterField(label, schema)` 우선순위
- **⓪ filterSpecs 명세**(opt-in): `select`→enum · `multi`→**multi**(다중 선택, 2026-11-03) · 그 외 kind 그대로. select·multi 모두 options 생략 + key 가 sample 에 시드되면 행 값(고유값)이 선택지 — multi 는 셀이 다중 선택 저장값(JSON 배열)이면 펼쳐서 모은다.
- **① field 매칭**(label 정확일치, 가장 정확): `multiselect`→**multi**(field.options, 자동 — 2026-11-03) · `select`·`radio`·`switch`→enum(field.options, `isEnumControl`) · `date`→date · 년도라벨→year · `number`→number · 그외→text. ⚠ `multiselect` 를 `isEnumControl` 에 넣지 않는다(단일 select 필터로 떨어져 JSON 배열 셀과 정확일치가 안 맞는다). `select` 필드는 multi 로 자동 승격하지 않는다 — 단일값 컬럼을 여러 값으로 거르려면 filterSpecs `kind:'multi'` 를 선언한다.
- **② column 매칭**: 년도라벨→year · `date`→date · `status`→enum(statusDomain) · amount/number/rate→number · 그외→text.
- **③ 휴리스틱**(무매칭): `년도|연도`→year · `일자|날짜|~일`→date · `구분|유형|종류|상태|기준`(도메인 없음)→text · 그외→**tag**(카테고리 on/off).
- 반환 `{label, kind, options, columnKey}`. **columnKey는 행필터의 키** — ①(field.key가 행에 시드됨)·②가 columnKey로 행을 거르고, ③ tag는 `row.category`로 거른다. 같은 스키마의 **모펀드는 columns엔 없지만 `sample` 리터럴 행이 값을 실어** 역시 ① 경로로 걸러진다(2026-09-12). columnKey 없는 경우는 칩만 뜨고 행은 안 걸러진다(no-op — 칸 툴팁).

## 칸 매핑 (스키마 트랙 `PanelFilterControl`)
| kind | 칸 |
|------|--------|
| year | `PanelSelect`(YEAR_OPTIONS, `searchable={false}` — 네이티브) |
| enum | `PanelSelect` — enum 옵션 **10개 이상이면 검색형**(운용사 16~23개 등). `allLabel:null` 이면 `required` |
| date · month | `PanelPeriod`(day · month) |
| dayRange · monthRange | `PanelRange` |
| codeName | `PanelCell wide` + `role=group` 안 텍스트 2칸(`<항목> 코드`·`<항목>명`) |
| number · text | `PanelText`(number · text) |
| multi | `PanelMulti` — 값은 JSON 배열 문자열(`parseMulti`/`joinMulti`, 빈 배열 = `''` = 비활성) |
| tag | `PanelCheck` — 다중 선택(태그끼리 OR) |

## 상태·필터링
- **SSOT = `filterValues: Record<라벨, 값>`**(부모 보유, 빈 값/부재 = 비활성). 칩·행필터·KPI 모두 여기서 파생. 라벨↔값을 "라벨: 값" 문자열로 합치지 말 것(`정기/수시`의 `/`가 깨진다).
- **행필터**(`rowMatchesFilters`): 값-필터는 전부 AND(text/number=부분일치, year/enum/date=정확일치, multi=고른 값 중 하나라도 — 셀이 JSON 배열이면 교집합), 태그끼리는 합집합(OR, `row.category`). columnKey 없는 값-필터는 건너뜀(no-op). 칩은 `filterChipText` — multi 는 '첫 라벨 외 N'.
- 값 변경 시 `paginationGoToFirstPage()`. 패널은 상태를 갖지 않는다(부모 `applied` 하나 — 칩 × 로 외부에서 값이 빠져도 재동기화 effect 불필요).

## 규약 체크리스트 (CRITICAL — 모르면 재발하는 함정)
- [ ] **칸 박스 = 등록 모달과 동일(34px)**: 패널 칸은 `filter_panel.tsx` 가 `renderers.tsx` 의 **`drawerInputStyle(kind)`**(→ `CONTROL_BOX` SSOT `padding:'7px 11px' · fontSize:13.5 · lineHeight:'20px' · height 34`)로 그린다. 화면에서 `const inputStyle = …` 로 박스를 복사하지 않는다(2026-09-17 24개 드로어가 40px 로 드리프트한 전례). 패밀리는 `fontFamily` 로만 상속(단축 `font`는 34px 클램프를 깬다).
- [ ] **칸 label = 칩 label 정확일치**: 칸 `aria-label`(= placeholder)과 그 화면 `appliedFilters` 의 칩 `label` 이 다르면 칩 클릭이 칸을 못 찾는다(폴백 없음 — 아무 일도 안 일어남). 범위·묶음은 그룹 aria-label.
- [ ] **값 숨김 칸은 칩 필수**: select·다중 선택·PeriodPicker·범위 칸은 고른 값이 칸에 안 보인다 → 그 항목은 반드시 적용 칩을 만든다(예외: no-op 3화면 · `showValue` 수식어 select).
- [ ] **기본값으로 걸린 조건도 칩 상시**(2026-11-17 사용자 결정 (a) — 종전 "기본값과 다를 때만 칩" 관례 폐기, 재제안 금지): 기준일(자)·기준년월·고정 기본 모펀드처럼 값이 늘 있는 조건은 기본값이어도 칩을 띄우고, × 는 **기본값과 다를 때만**(`onClear: v !== DEFAULT ? () => set(DEFAULT) : undefined` — × = 기본값 복원). 정본 `custody_confirm_manage`·`custody_verify_manage`·`fund_stats`·`early_warning_manage`. 예외: 체크 플래그(`flagChips` — 칸에 체크 상태가 보여 기본값이면 칩 없음).
- [ ] **columnKey 불변식**: columnKey는 **행에 그 키가 실제로 시드될 때만** 부여(`filter_field.ts`의 `seeded`/`colKey` 가드). 시드 경로는 ① `schema.columns`(makeRows 합성) ② `schema.sample`(목업 리터럴 행). 어느 쪽에도 없으면 침묵 0건 대신 no-op 으로 안전 격하된다 — 가드를 우회해 직접 columnKey를 주지 말 것.
- [ ] **빈 `<select>` 금지**: options/statusDomain이 비면 enum 대신 **text로 격하**(선택지 없는 드롭다운 = 고장처럼 보임).
- [ ] **미연동 필터를 새로 만들지 않는다(2026-11-16 사용자 지시 "데이터 연동 후 적용을 전부 동작하게")**: 원문 검색 항목이 행에 칸이 없으면 **숨은 행 속성을 시드**하고 `key` 로 거른다(그리드 컬럼은 늘리지 않는다). 분류별 처리 — ① 행 속성 select: 기본 '전체'면 기존 행에 결정적으로 나눠 싣고(한 상위 개체에 속한 행이면 같은 값 — 다른 선택지 0건이 정상), 고정 기본값(allLabel null)이면 기존 행=기본값 + 다른 선택지용 더미 행 2~3건 ② 조회 시점(기준일자·기준년월·기준년도): 누적형은 `filterSpecs.mode:'asOf'`/FilterDef `mode:'asOf'`(셀 ≤ 값, `onOrBefore`), 스냅샷형은 eq + 직전 시점 더미 행 ③ 계산 기준 선택기(데이터기준·연도기준 등): 행을 줄이지 않고 수치를 기준별로 재계산 ④ **불변식: 기본 상태(마운트·초기화 직후) 행 수·합계·KPI 는 시드 전과 같다.** `noop` 칸 툴팁은 의미를 정할 근거가 없는 '판단 보류' 항목에만 허용한다.
- [ ] **시드 정합**: `makeRows`가 컬럼에 도메인값을 심어야 value 필터가 매칭됨 — 년도라벨→YEAR_OPTIONS 순환, select·radio·switch 필드 옵션→options 순환. **tag는 예외**: `row.category`로 매칭되는데 이는 `generic_list.tsx`의 하드코딩 `ROW_CATS`에서 시드된다 → 새 tag 라벨이 `ROW_CATS`에 없으면 체크 시 **표가 통째로 비워진다**.
- [ ] **토큰·테마**: 색은 `var(--...)`만(하드코딩 hex 금지 — 다크 양립).

## typed 페이지 트랙 (골드 `subfund_manage.tsx` + `subfund_filter_panel.tsx`)
전용 페이지는 `ListFilterPanel` 을 쓰지 않고 `<FilterPanel>` 을 직접 조립한다. 규약은 위와 같되 다음이 다르다:
- **패널 항목 = 목업 검색박스의 항목·순서 그대로, 단 툴바 칩으로 올린 항목은 뺀다**(자펀드관리: 검색어·모펀드·자펀드·계정구분·자펀드구분·사업연도·정기/수시·심사담당자·리스크담당자·조합상태·기준일자 — 목업의 심사단계는 칩이라 제외. 아래 "주 필터 칩 ↔ 패널 중복 금지").
- **연도/일자 = `PanelPeriod`**(사업연도 `mode="year"`, 기준일자 `mode="day"`) — 연도 `<select>`·네이티브 date 금지(→[[apfs-datepicker]] PeriodPicker 절). 폭은 칸이 정한다(드로어 시절 fit-content 래퍼 불필요).
- **select = `PanelSelect`**(내부가 공용 `DrawerSelect` — 옵션 10개 이상이면 검색형). 페이지 로컬 select 복제 금지(가드 `drawer_select.test.ts`).
- **열거형 다중 선택 = `PanelMulti` — 멀티 셀렉트가 기본**(2026-11-03 사용자 지시 "화면 생성시나 필터에도 멀티 셀렉트가 적용되게"). 설계서·목업이 '다중 선택'·'복수 선택'·`<select multiple>`·같은 이름 체크박스 나열인 열거형 항목은 체크박스를 늘어놓지 않고 이것을 쓴다. 정본 일/월계표 일계표 탭(`acc/ledger/daily_monthly_manage.tsx`).
  - 계약: `value: string[]`(옵션 순서) · **빈 배열 = 전체(조건 없음)**. 칩 값 = '첫 라벨 외 N'(`multiSelectSummary`), `×` = `[]`. 맨 위 '전체 선택'(3상태)·하단 'N개 선택'·[선택 해제]는 컴포넌트가 그린다.
  - 필수·단일이어야 하는 항목(월계표 계정구분처럼 집계가 한 값만 받는 경우)은 `PanelSelect`.
  - **스키마 트랙은 filter kind `multi`** — 폼 필드가 `control:'multiselect'` 면 자동, 단일 select 컬럼을 여러 값으로 거르려면 `filterSpecs: { 계정구분: { kind:'multi', key:'fundAccount' } }`.
- **범위(시작~종료) = 한 항목 `PanelRange`**(2026-09-24 사용자 지시 — `…시작`/`…종료` 두 항목으로 쪼개지 말 것). **칩도 한 개**: 값 `${from || '…'} ~ ${to || '…'}`(한쪽만 있으면 `…`), `×`는 두 끝을 함께 해제. 정본 `audit_log.tsx`.
  - **기본값으로 시작하는 기간**(2026-10-29 PR #368, 일반전표 관리 — 전월 1일~오늘): 첫 진입부터 칩이 떠 있다. `×` = 기간 조건 해제(빈 값 = 전 기간), 패널 **[초기화](`onReset`) = 기본값 복원**. 기본값은 모델 함수(`defaultPeriod(today)`)로 계산하고 테스트한다. 툴바에 날짜칸을 따로 두지 않는다.
- **적용 방식 = 전 화면 즉시 반영**(2026-11-03 사용자 지시 — 초안(draft)·[필터 조회] 버튼 방식 재도입 금지):
  - state 는 `applied` 하나. 칸이 바로 patch → 칩·목록 즉시 반영. [초기화] = 기본값 복원. 텍스트 칸 Enter 커밋 없음(타이핑 즉시 반영).
  - **검증(시작 > 종료·필수값 미입력)은 막지 않고 표시만**: 모델 순수 함수(`validateRange`·`validatePeriod`·장부조회 `validateFilter` 등, 설계서 문구 그대로)를 렌더마다 `applied` 로 계산 → 그 칸 `invalid` + **패널 `errors`**(맨 아래 `role="alert"`), **결과는 0건**. 토스트 차단 없음.
  - 정본: `sys/audit/privacy_access_log.tsx` · 회계 `acc/slip/*_manage.tsx` · `acc/ledger/*_manage.tsx`.
- **적용 칩은 GridFrame `appliedFilters` 로 넘긴다**(2026-09-24 — 한 줄, 넘치는 만큼만 `+N` 메뉴. 렌더는 `applied_filters.tsx` 단일 소유 → [[apfs-grid]] "필터 툴바" 절). 페이지에서 칩 마크업을 다시 쓰지 않는다.
- **적용 칩은 항목별 개별 칩**(합쳐서 `A · B · C` 한 칩 금지). 각 칩 = **값만 표시**(항목명 접두사 없음, 2026-09-08 결정) + `×`(`aria-label="<항목> 필터 제거"`, 해당 필터만 해제). no-op 항목은 칩을 만들지 않는다(숨은 속성으로 동작하는 항목은 칩 필수).
  - 항목명은 DS **Tooltip**(`ChipTip` — 호버·× 포커스, 본문=항목명만, 칩 본문 `cursor-pointer`(help 물음표는 사용자 거절))+`aria-label`로 회수. **필터를 걸면 그 칩 툴팁이 바로 3초 떴다 사라진다**(첫 렌더·해제는 안 띄움). 정본 `FilterChipRow`(`valueSig`·`freshLabels`·`flashing`, 회귀 `applied_filters.test.ts`). **"값만"은 항목명 제거지 연산자 제거가 아니다** — `출자금액 ≥ 800`은 `≥ 800`. 태그형(value 없음)은 라벨을 표시.
- **적용 칩 클릭 = 패널의 그 칸으로 초점**(2026-11-02 사용자 요청 "칩을 누르면 해당 필터 영역으로 이동" → 2026-11-09 패널 경로 → 11-17 전 화면). 칩 값은 `<button>`(aria `"<항목>: <값> — 필터에서 변경"`, GridFrame 이 `filterPanel` 이 있으면 `jumpHint` 를 넘긴다), × 는 형제 버튼이라 해제만 한다. 정본 `src/dash/filter_field_jump.ts` `focusPanelField` — 같은 GridFrame 의 `[data-filter-panel]` 안에서 aria-label **정확일치** 칸, 없으면 `role=group aria-label` 정확일치 그룹의 첫 칸. **강조 표시는 두지 않는다**(배경색·테두리 링 모두 2026-11-02 사용자 거절, 재제안 금지). 초점은 `focus({ preventScroll: true, focusVisible: true })` — 버튼형 칸(PeriodPicker·다중 선택 트리거)에도 초점 링이 보이게(2026-11-10 사용자 지적). 회귀 `filter_field_jump_dom.test.ts`.
  - **묶음 칩**(칩 하나가 여러 칸을 대표)만 `AppliedFilter.jumpTo` 로 첫 칸 label 을 지정한다(투자기업정보(통합) `조회 대상` → `모펀드`). 단일 항목은 `jumpTo` 대신 **칩 label 을 칸 label 과 같게** 바꾼다.
  - `+N` 메뉴의 적용 칩도 **같은 규칙**(2026-11-10 사용자 "x 로만 삭제, 칩 클릭은 그 필터 선택 컴포넌트로 초점"): 한 행 = 값 menuitem(그 칸으로 이동 — 메뉴가 닫힌 뒤 `onCloseAutoFocus` 에서) + × menuitem(해제). 항목명은 행 DS 툴팁(`MenuChipTip`). 회귀 `applied_filters_overflow.test.ts`.
  - 전수 점검 방법(칸·칩을 대량으로 바꿨을 때): route 마다 GridFrame 루트 fiber 의 `appliedFilters` 라벨(빈 값 포함)을 읽고, 페이지 안에서 `await import('/src/dash/filter_field_jump.ts')` 로 실제 함수를 불러 라벨마다 판정, 초점 칸의 aria-label 이 라벨과 같은지(범위는 `<라벨> 시작`) 기록한다. 가드 `src/dash/filter_panel_labels.test.ts` 가 소스에서 칩 label ⊂ 칸 label 을 정적으로 본다.
  - 검증(ego-browser): 칩 클릭 후 `document.activeElement` 가 그 칸인지. ⚠ 창이 뒤면 rAF ~1~4fps — 2.5초 이상 기다리거나 idle 프레임부터 잰다.
- **모드형 조회기준이 있으면 그것이 주 필터다**(2026-09-24 사용자 지시, `invest_recovery_detail.tsx`): 컬럼·데이터를 함께 바꾸는 `조회기준`(투자및회수/전체거래)은 SegTabs 가 아니라 **깔때기 아이콘 바로 뒤 첫 칩 무리** — GridFrame `filterChips` 로 넘긴다. 나머지 원문 검색항목은 패널 + 적용 칩으로만.
  - **목업 조회기준 select 가 두 축을 섞으면 나눈다**(2026-11-06 사용자 결정, `apfs_contribution_manage.tsx`): 칩 = 행 모양을 바꾸는 **형태 축만**(모드형, 전체 없음), 행을 거르는 축은 원문 컬럼명(`거래구분`)으로 패널 `PanelSelect` + 적용 칩. 칩 값이 6개 이상이면 통째로 패널에 넣기 전에 **축이 섞였는지 먼저 본다**. 가드 `iam/sfund/apfs_contribution_manage.test.ts`.
- 주 필터 1개(심사단계)는 툴바 기본 칩(`filterChips` + `filterChipsMenu` 드롭다운 — [[apfs-grid]])로 노출, 선택 행이 있으면 툴바 좌 슬롯이 selbar로 바뀐다(→[[apfs-stage-workflow]]).
- **주 필터 칩 ↔ 패널 중복 금지**(2026-11-05 사용자 지시 "투자심의상태가 기본으로 있는데 상세필터에도 있어 — 상세필터에서 제거"): `filterChips` 로 툴바에 올린 차원은 패널 칸으로 **다시 두지 않는다**. 목업 검색박스에 그 항목이 있어도 칩이 그 자리를 대신한다. 가드 `src/dash/filter_chip_drawer_dup.test.ts`(칩 `active: <state> ===` 의 state 를 패널 칸 `value={<state>}` 로 다시 쓰면 실패).
- 상태 SSOT는 `useState` N개 + `clearFilters`(초기화·⟳ 조회 공유). `passes`는 `useCallback`, 변경 시 `apiRef.current?.onFilterChanged()`(External Filter).
- **필터를 바꾸면 선택을 전부 해제한다**(2026-10-27 사용자 결정): 외부 필터와 `rowSelection` 을 함께 쓰는 화면은 필터 effect 를 `useEffect(() => { apiRef.current?.onFilterChanged(); apiRef.current?.deselectAll(); }, [passes])` 로 쓴다(`generic_list` 는 `[filterValues]`). "통과한 선택은 남기고 숨은 것만 해제"(`forEachNodeAfterFilter` prune)는 사용자가 거절했다 — 재제안 금지. 정본 `custody_confirm_manage.tsx`, 가드 `src/dash/filter_clears_selection.test.ts`.
  - **사전 필터형(`rowData={visible}`) + `onRowDataUpdated={restoreSelection(api, selIdsRef.current)}` 화면은 effect 에서 ref 를 먼저 비운다**(2026-11-09): `useEffect(() => { selIdsRef.current = []; apiRef.current?.deselectAll(); }, [필터 deps])`. 정본 `sys/board/board_manage.tsx`, 가드 같은 파일 두 번째 describe.
  - **데이터 변경 경로도 같은 규칙**: 그리드에 `onModelUpdated={dropHiddenSelection}`(`aggrid_selection.tsx`) — 선택한 행 하나라도 필터 결과에서 빠지면 `deselectAll()`. 같은 가드가 배선도 검사한다.
  - **페이지 이동은 의도적으로 선택 유지**(다른 페이지 행은 `displayed=true`). 필터를 건 **뒤에** 체크하면 칩 줄이 숨어 필터 표시가 없다 — 개선은 사용자 결정 대기(지시 없이 만들지 않는다).
- **단축키**: 드로어가 없으므로 `enabled: !filterOpen` 조건은 없다. 인쇄·내보내기·등록 단축키는 `skipInDialog: true`(팝업이 덮는 동안 끔)만 유지(→[[apfs-hotkeys]]).

## 정본 코드 (로직은 여기, 스킬은 규약만)
- `src/dash/filter_panel.tsx` — **패널·칸 조각**(`FilterPanel` · `PanelSearch/Text/Select/Multi/Period/Range/TextRange/Radio/Check/Cell`) + `FIXED_PLACEHOLDER` · `PANEL_CELL` · `openListOnNavKey` · noop 툴팁
- `src/dash/schemas/renderers.tsx` — **`CONTROL_BOX`**(모달·패널 공유 34px 박스) + **`drawerInputStyle`** + `controlMinWidth`
- `src/dash/schemas/filter_field.ts` — `resolveFilterField` + YEAR_OPTIONS + degrade 가드
- `src/dash/generic_list.tsx` — `PanelFilterControl` · `ListFilterPanel` · `rowMatchesFilters` · `makeRows` 시드
- `src/dash/filter_field_jump.ts` — 칩 → 칸 초점(`focusPanelField`)
- `src/dash/test_src.ts` — `panelSrc`·`panelLabels`(소스 문자열 테스트용)
- 가드: `filter_field.test.ts`(타입 도출) · `applied_filters.test.ts`(드로어·[상세필터] 없음 + 패널 필수) · `filter_panel_labels.test.ts`(칩 label ⊂ 칸 label) · `filter_chip_drawer_dup.test.ts`

## 검증
1. `npm test` + `npm run lint` + `npm run build` exit 0.
2. 브라우저: 칸에서 고르면 **표 행 수가 실제로 감소** + 칩이 뜨고 칸은 항목명으로 돌아간다. 칩 클릭 → 그 칸 초점. 칸 높이 `getComputedStyle(el).height` = **34px**.
3. 라이트/다크 대비 + [[responsive-ui]](375px 에서 2열·가로 스크롤 없음).

## 참조
- 2026-09-24: 검토필요 마커(ReviewMarker·note 필드·*_NOTE)는 전부 삭제됐다. 패널 칸에 마커를 달지 않는다.
- 페이지 골격/툴바 슬롯: [[apfs-grid]] · UI 토큰: [[dashboard-ui]] · 반응형: [[responsive-ui]] · 필터 라벨 출처: [[apfs-capture-schema]]
