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

## 타입 도출 — `resolveFilterField(label, schema)` 우선순위
- **① field 매칭**(label 정확일치, 가장 정확): `select`→enum(field.options) · `date`→date · 년도라벨→year · `number`→number · 그외→text.
- **② column 매칭**: 년도라벨→year · `date`→date · `status`→enum(statusDomain) · amount/number/rate→number · 그외→text.
- **③ 휴리스틱**(무매칭): `년도|연도`→year · `일자|날짜|~일`→date · `구분|유형|종류|상태|기준`(도메인 없음)→text · 그외→**tag**(카테고리 on/off).
- 반환 `{label, kind, options, columnKey}`. **columnKey는 행필터의 키** — ①(field.key가 columns에 실재)·②가 columnKey로 행을 거르고, ③ tag는 `row.category`로 거른다. **데모(자펀드 공고)의 사업년도·정기/수시가 바로 ① 경로**(field 매칭, 키가 columns에도 존재)라 표가 실제로 줄어든다. columnKey 없는 경우(field-only 키·휴리스틱 비-tag date/text)는 칩만 뜨고 행은 안 걸러진다(no-op, 아래 캡션 규약).

## 컨트롤 매핑 (DrawerFilterControl / DrawerCheckRow)
| kind | 컨트롤 |
|------|--------|
| year · enum | `<select>` — 첫 옵션 `전체`(="" = 미적용) + options |
| date | `<input type=date>` |
| number · text | `<input type=number/text>` |
| tag | 토글 버튼(체크 아이콘) — 다중선택 |

## 상태·필터링
- **SSOT = `filterValues: Record<라벨, 값>`**(부모 보유, 빈 값/부재 = 비활성). 칩·행필터·KPI 모두 여기서 파생. 라벨↔값을 "라벨: 값" 문자열로 합치지 말 것(`정기/수시`의 `/`가 깨진다).
- **행필터**(`rowMatchesFilters`): 값-필터는 전부 AND(text/number=부분일치, year/enum/date=정확일치), 태그끼리는 합집합(OR, `row.category`). columnKey 없는 값-필터는 건너뜀(no-op).
- 적용 시 `setPage(1)` 리셋. 드로어는 draft 사본을 편집하고 적용 때 부모에 반영, 열릴 때 `applied`로 재동기화.

## 규약 체크리스트 (CRITICAL — 모르면 재발하는 함정)
- [ ] **입력 16px + 키 순서**: `font:"inherit"` 먼저, `fontSize:16` **뒤**. (React 인라인은 키 순서대로 직렬화 → `font` 단축속성이 뒤에 오면 font-size를 리셋해 16px이 죽고 iOS 줌 부활.)
- [ ] **columnKey 불변식**: 행은 `schema.columns`로 시드되므로 columnKey는 **columns에 실재하는 키일 때만** 부여(`filter_field.ts`의 colKey 가드). 이 가드 덕에 field-only 키는 침묵 0건이 아니라 no-op+캡션으로 안전 격하된다 — 가드를 우회해 직접 columnKey를 주면 시드 안 돼 침묵 0건이 되므로 가드를 유지할 것.
- [ ] **빈 `<select>` 금지**: options/statusDomain이 비면 enum 대신 **text로 격하**(선택지 없는 드롭다운 = 고장처럼 보임).
- [ ] **columnKey 없는 값-필터**: `· 데이터 연동 후 적용` 캡션으로 no-op을 사용자에게 신호(무신호 무효 필터 금지).
- [ ] **시드 정합**: `makeRows`가 컬럼에 도메인값을 심어야 value 필터가 매칭됨 — 년도라벨→YEAR_OPTIONS 순환, select 필드 옵션→options 순환. **tag는 예외**: `row.category`로 매칭되는데 이는 schema가 아니라 `generic_list.tsx`의 하드코딩 `ROW_CATS`에서 시드된다 → 새 tag 라벨이 `ROW_CATS`에 없으면 토글 선택 시 **표가 통째로 비워진다**(value의 안전 no-op과 다른 비대칭). 새 tag 필터는 `ROW_CATS`에 같은 라벨을 추가하거나 `ROW_CATS` 중 하나와 정확일치시킬 것.
- [ ] **마스크 규약**: 칩은 라벨(평문 UI) + 값(`<MT>` 마스킹). 행 셀은 `Cell`이 마스킹. 단위·헤더·축은 비마스킹.
- [ ] **토큰·테마**: 색은 `var(--...)`만(하드코딩 hex 금지 — 다크 양립). 태그 토글에 `aria-pressed={checked}`.

## 정본 코드 (로직은 여기, 스킬은 규약만)
- `src/dash/schemas/filter_field.ts` — `resolveFilterField` + YEAR_OPTIONS + degrade 가드
- `src/dash/generic_list.tsx` — `DrawerFilterControl` · `ListFilterDrawer` · `rowMatchesFilters` · `makeRows` 시드 · `FilterPill`
- `src/dash/schemas/filter_field.test.ts` — 타입 도출·degrade·columnKey 불변식 회귀 가드

## 검증
1. `npm test`(resolver) + `npm run build` exit 0.
2. 브라우저: 데모(자펀드 공고)에서 년도+열거형 선택 → **표 행 수가 실제로 감소**(호출 분리 측정 — React state flush). 16px·캡션·칩 확인.
3. 라이트/다크 대비 + [[responsive-ui]] 체크(드로어 92vw, 페이지 가로스크롤 없음).

## 참조
- 페이지 골격/툴바 슬롯: [[apfs-grid]] · UI 토큰: [[dashboard-ui]] · 반응형: [[responsive-ui]] · 필터 라벨 출처: [[apfs-capture-schema]]
