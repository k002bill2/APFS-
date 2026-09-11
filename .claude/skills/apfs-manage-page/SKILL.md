---
name: apfs-manage-page
description: 현행시스템/KRDS 목업 HTML(+spec.json)을 APFS 관리형 리스트 페이지(검색·2단 헤더 그리드·합계·워크플로우·편집 팝업)로 조립하는 SOP. 목업 변환·관리 화면 생성·구조도 spec 반영·"이 화면 우리 디자인으로" 요청 시 사용. 영역별 규약은 기존 스킬을 참조로 조립하고 새 패턴만 여기 둔다. Use when converting a mockup/spec into an APFS management list page (search + grouped-header grid + totals + stage workflow + edit popups).
---

# apfs-manage-page

목업(KRDS TO-BE HTML + `*_spec.json`) → **APFS 디자인시스템의 관리형 리스트 페이지**. 영역마다 이미 스킬이 있다 — 이 스킬은 **어느 영역을 어느 스킬로 조립하는지**와 **새 패턴 2개**(심사단계 워크플로우·섹션형 모달)만 소유한다. 중복 규약을 만들지 말 것.

- **골드 레퍼런스**: `src/dash/subfund_manage.tsx`(페이지) · `subfund_manage_schemas.ts`(모달 스키마) · `subfund_form_modal.tsx`(섹션형 모달). 출처 목업: 자펀드관리_목업.html(구조도 v1.4).
- 형제 골드: `asset_funding.tsx`(매트릭스 조회형, 워크플로우 없음).

## 0. 트랙 분기 (먼저 결정)
| 목업 특성 | 트랙 |
|-----------|------|
| 단일 헤더 + flat 필드 + 단순 CRUD | **스키마 트랙** → [[apfs-capture-schema]] → `GenericListPage`(코드 0) |
| **2단 헤더·합계행·행 선택→단계별 액션·섹션/반복행 모달** 중 하나라도 | **typed 페이지 트랙(이 스킬)** — `PageSchema.FieldSpec`은 flat이라 못 담는다 |

## 1. 영역 → 스킬 매핑 (조립표)
| 목업 영역 | 우리 구현 | 규약 출처 |
|-----------|-----------|-----------|
| 페이지 골격(제목·KPI·툴바·푸터) | `GridFrame` + `KpiBadge`. **타이틀(`cardTitle`·`title`·crumbs 리프)은 `data.ts` 메뉴 리프 라벨과 일치**(임의 "○○ 목록" 금지) | [[apfs-grid]] "관리형 리스트 툴바·타이틀 규약" |
| 검색박스(인라인 N개 필터) | **주 필터 1개=툴바 `FilterChip`**(예: 심사단계) + 나머지=**상세필터 드로어(Sheet)**, 검색어 최상단 고정, 컬럼 미연동 필터는 `· 데이터 연동 후 적용` 캡션 | [[apfs-detail-filter]] |
| 2단 헤더 그리드 + tfoot 합계 | AG Grid `ColGroupDef`(`marryChildren`) + `pinnedBottomRowData=useMemo([computeTotal(filteredRows)])` | [[apfs-aggrid]] |
| 행 라디오 단일선택 | `rowSelection={{mode:'singleRow',checkboxes:true,enableClickSelection:true}}` + `selectionColumnDef={{pinned:'left'}}` + `getRowId` 안정 id | [[apfs-aggrid]] |
| 심사단계 셀 + 단계별 작업 버튼 + 전이 | **[[apfs-stage-workflow]]** (신규 패턴) | 이 조립표 |
| 편집 팝업(flat ≤ 25필드) | `kind:'form'` PageSchema + `RowFormModal`(단계별 제목은 `title` prop) | [[apfs-form-modal]] |
| 편집 팝업(섹션·반복행·첨부표) | 전용 섹션형 모달 — `SchemaField` 재사용 | [[apfs-form-modal]] "확장: 섹션형·반복행" |
| 사업연도/기준일자 | 드로어·모달 모두 **`PeriodPicker`**(`mode="year"` / `"day"`, `DrawerField plain`) — 연도 `<select>`·네이티브 date 금지 | [[apfs-datepicker]] "PeriodPicker" |
| 적용 필터 칩 | 항목별 개별 칩, **값만**(접두사 없음) + × aria-label에 항목명 | [[apfs-detail-filter]] "typed 페이지 트랙" |
| 엑셀 | SheetJS — 병합/리프 컬럼을 **columnDefs에서 자동 산출**(`flattenForExcel`), 마스크 시 숫자 0·텍스트 ''. **진입=툴바 kebab `MoreMenu` "내보내기 (Excel)" 항목**(독립 "엑셀" 버튼 금지) + 푸터 `IconBtn download` + 단축키 `⌥D`(`HOTKEYS.export`) | [[apfs-aggrid]] · 툴바/kebab=[[apfs-grid]] · 단축키=[[apfs-hotkeys]] |
| 프레임 외관·푸터 | `--frame-bg`(테두리·그림자 없음), `sub` 미사용, 단위 캡션은 `toolbarRight`, 푸터 골드(건수·페이저·뷰 토글·아이콘) | [[apfs-grid]] "프레임 외관 규약" |
| 리스트 ↔ 카드뷰 | 푸터 `SegTabs` + 카드 그리드 + 선택 유지 | **[[apfs-card-view]]** |
| 읽기전용 명세 팝업 | `명세` 버튼 + 더블클릭 → 단위 토글·kv·재무요약·중첩 재무제표 | **[[apfs-spec-popup]]** |
| 그리드 세부(폭·선택색·합계행·배지) | `AUTO_SIZE_CONTENT`+`maxWidth`, `wrapperBorder:false`, 합계 `--muted`+1px, 배지 `lg`/`dot={false}` | [[apfs-aggrid]] "관리형 페이지 그리드 규약" |
| 색·대비 | 토큰만. 상태 텍스트는 `-text` 토큰(StatusBadge 내장) | [[color-tokens]] |

## 2. 목업에서 **버리는 것** (프로토타입 스캐폴딩 — 셸이 소유)
GNB/LNB 전환 토글(`.opts`) · 상단바/출처시스템 메뉴/서브탭/LNB(`.topbar .sysmenu .subtab .lnb`) · ⚠검토필요 마커(`.review .rpop`) · 설계 메모(`.note`). **이식 대상은 검색필드·목록바·그리드·팝업·워크플로우 JS(STAGE_ACT)뿐.**

## 3. SOP
1. **읽기**: 목업 HTML 전체 + 형제 `*_spec.json`(필드·컬럼·codeRef 정본). 하단 `<script>`의 DATA/STAGE_ACT/팝업 row()가 실제 명세다.
2. **분기**(0절). complex면 계속.
3. **파일·라우트**: 기존 페이지를 덮어쓰지 말고 **새 파일**(`<domain>_manage.tsx`, `export function XxxManage`). `app.tsx` route 분기만 교체(구 파일은 미라우팅으로 두고 삭제는 PR에서 사용자 결정). `data.ts` 리프 `path`가 이미 있으면 유지, `favRoute`=그 path.
4. **모달 스키마**: `<domain>_manage_schemas.ts`에 `kind:'form'` PageSchema들 + 공통코드 옵션 상수. **`schemas/index.ts ALL`에 등록 금지**(라우트 아님) — 대신 모듈 스코프 `parsePageSchema()`로 import 시점 zod 검증. `columns`·`provenance`는 zod 필수라 대표 컬럼만 선언.
5. **페이지 조립**(1절 표대로). 행 타입: **숫자 N/A는 `null`**(문자 `'-'` 금지) → `valueFormatter: p => p.value==null ? '-' : numFmt(p)`(공유 numFmt에 null 가드만, 재구현 금지). 텍스트 N/A는 `'-'`.
6. **검증**: `npm run build` + `npm test` + **aside repl 런타임**(4절). Codex 리뷰 후 커밋.

## 4. 런타임 검증 체크리스트 (빌드 green ≠ 동작)
```js
// aside repl — localStorage apfs.route는 원시 문자열
await page.evaluate(()=>localStorage.setItem('apfs.route','<path>')); await page.reload();
```
- [ ] `.ag-center-cols-container .ag-row` 수 = 더미 행 수(빈 그리드 아님)
- [ ] `.ag-floating-bottom .ag-row` 존재 + `getComputedStyle(...).opacity==='1'`(aggrid_shared.css import 누락 시 0)
- [ ] 2단 헤더: **컬럼 가상화**로 뷰포트 밖 그룹헤더는 DOM에 없다 → `scrollLeft` 후 `.ag-header-group-cell` 재질의
- [ ] 선택: **`.ag-row`가 아니라 `.ag-cell`을 클릭**(행 div 클릭은 AG Grid 셀 리스너를 안 탐) → `.ag-row-selected` ≥1 + 툴바 액션 노출
- [ ] 전이 1회 이상 실제 실행(배지·토스트·액션 재계산·합계 재계산)
- [ ] 섹션형 모달 열림 + `getComputedStyle(select).fontSize==='14px'`
- [ ] 라이트/다크 스크린샷(`./artifacts/` 세션 상대경로만 허용) · 콘솔/페이지 에러 0

## 5. 함정 (골드에서 실제로 맞닥뜨린 것)
- `RowFormModal` 제목은 mode 고정 → 단계별 제목은 **`title` prop**(2026-09-08 추가).
- `pinnedBottomRowData`에 인라인 배열 금지 — 전이/등록으로 행이 변하므로 `useMemo([computeTotal(filteredRows)],[filteredRows])`.
- `onPaginationChanged`는 값 비교 가드로 setState(매 호출 새 객체=렌더 루프, →[[aggrid-onpaginationchanged-render-loop]]).
- AG Grid `cellStyle` 상수는 `CellStyle` 타입(React `CSSProperties` 아님 — 인덱스 시그니처 불일치).
- 신규 등록 후 `setSelId(newId)`로 선택을 새 행에 두면 다음 단계 액션이 즉시 보인다 — 단 그리드 라디오는 `onRowDataUpdated`에서 따로 맞춰야 한다(→[[apfs-stage-workflow]] 규약 9).
- selbar에 **대상명(조합명)·취소 안내 캡션을 넣지 않는다**(2026-09-08 제거). 카드헤더 `sub` 설명 캡션도 넣지 않는다.
- 세분화 스킬 색인(2026-09-08): 프레임 외관 [[apfs-grid]] · 그리드 세부 [[apfs-aggrid]] · 칩/드로어 [[apfs-detail-filter]] · 컨트롤 폭 [[apfs-form-modal]] 계약7 · 기간 선택 [[apfs-datepicker]] · 카드뷰 [[apfs-card-view]] · 명세 팝업 [[apfs-spec-popup]] · 선택 SSOT [[apfs-stage-workflow]] 규약 9.

## 검증
`npm run build`(exit 0) · `npm test` · 4절 런타임 체크 · [[responsive-ui]] 1280/768/400 · [[web-a11y]](라디오 접근名·다이얼로그 트랩은 AG Grid/Radix 내장).

## 참조
[[apfs-grid]] · [[apfs-aggrid]] · [[apfs-form-modal]] · [[apfs-detail-filter]] · [[apfs-datepicker]] · [[apfs-stage-workflow]] · [[apfs-capture-schema]] · [[color-tokens]] · [[dashboard-ui]]
