---
name: apfs-aggrid
description: APFS 대시보드의 AG Grid 본체(테이블 알맹이) 작성 규약 — 공유 테마 apfsTheme, 2단 그룹헤더(ColGroupDef)·pinned 합계행·회색 행선택·외부필터(Community)·더블클릭 수정·Excel(SheetJS) 내보내기·셀 마스킹. 정본 예시는 "모태펀드 조성·출자 현황표"(asset_funding.tsx). AgGridReact·컬럼정의·pinned행·합계행·정렬·엑셀 내보내기·셀 렌더러 작업 시 사용(바깥 양식 골격은 apfs-grid). Use when building or editing the AgGridReact table body itself (columns, theme, pinned rows, sorting, excel export, cell rendering).
---

# apfs-aggrid Skill

## 컨텍스트
`apfs-grid`(GridFrame)는 페이지의 **바깥 양식**(헤더·KPI·툴바·푸터)을 소유한다. 이 스킬은 그 안에 들어가는 **AG Grid 본체**(`AgGridReact` — 컬럼·테마·고정행·선택·필터·내보내기)를 소유한다. "양식은 apfs-grid, 알맹이는 apfs-aggrid."

- **정본 예시(골드 레퍼런스)**: `src/dash/asset_funding.tsx` — "모태펀드 조성·출자 현황표". 2단 그룹헤더 + pinned 합계행 + 정렬·행선택·등록·상세필터(External Filter)·페이지네이션·Excel·뷰토글을 모두 포함한 완성형.
- **공유 인프라(SSOT)**: `src/dash/aggrid_theme.ts`(`apfsTheme`·`fmt`·`numFmt`·`numStyle`·모듈등록), `src/dash/aggrid_shared.css`(합계행 버그 보정).
- 버전: AG Grid Community **v35.3.1**(v33+ Theming API). 다른 정본 트랙: 리스트형은 `generic_list.tsx`(스키마 주도).

## 핵심 계약 (CRITICAL — 어기면 blank grid·다크 깨짐·합계행 사라짐)
1. **모듈 1회 등록.** `aggrid_theme.ts`가 `ModuleRegistry.registerModules([AllCommunityModule])`를 1회 수행한다. 새 그리드는 **반드시 `aggrid_theme.ts`에서 `apfsTheme`를 import**(=등록 공유). 직접 등록 추가 금지. 미등록 시 런타임 **빈 그리드**.
2. **레거시 CSS import 금지.** `ag-grid.css`·`ag-theme-*.css`를 import하지 말 것 — v33+ Theming API와 충돌. 테마는 오직 `theme={apfsTheme}` prop.
3. **회색 행선택은 `selectedRowBackgroundColor`로 격리.** `apfsTheme`가 `selectedRowBackgroundColor: var(--row-selected)`(중립 회색 토큰)로 칠한다. **`accentColor`(체크박스·포커스링·정렬표시)는 건드리지 말 것** — 바꾸면 선택색이 그 크롬까지 물든다.
4. **pinned 합계행은 참조가 안정해야 한다(매 렌더 인라인 `[total]` 금지).** `pinnedBottomRowData`에 매 렌더 **새 배열**을 넘기면 AG Grid가 고정행을 재생성해 **행 애니메이션이 매번 재발**한다. 데이터 가변성에 따라 갈라라:
   - **정적 데이터** → 모듈 스코프 상수: `const PINNED_BOTTOM = [TOTAL_ROW];`
   - **가변 행(삭제·추가로 합계 재계산 필요)** → `const pinned = useMemo(() => [computeTotal(rows)], [rows]);` — 렌더 간 참조 안정 + 데이터 변할 때만 새 배열.
   - ⚠️ 골드 예시 `asset_funding.tsx`는 삭제/등록을 지원하면서도 `PINNED_BOTTOM=[TOTAL_ROW]`(하드코딩 합계)를 쓴다 → **행 변경 후 합계가 stale**(프로토타입 더미라 미수정). 실데이터·가변 행이면 반드시 `useMemo` 재계산 쪽을 따를 것.
5. **합계행 버그 보정 CSS.** `import './aggrid_shared.css'` 필수 — 안 하면 floating(합계)행이 `opacity:0` stuck으로 **안 보인다**(`!important`라 getRowStyle로 못 고침, CSS로만). 합계행 강조 틴트도 여기서 공유.
6. **가로 스크롤은 children 책임이지만 AG Grid는 내부 스크롤을 가진다.** `domLayout="autoHeight"`를 쓰면 세로는 콘텐츠에 맞고 가로는 AG Grid 자체 뷰포트가 스크롤한다. 수제 `<table>`을 쓸 때만 `overflow-x-auto`+`min-width` 래퍼가 필요(→[[apfs-grid]] 계약1). 토큰만 사용(하드코딩 hex 금지, →[[color-tokens]]).

## 컬럼 정의 (정본 패턴)
```tsx
// 숫자 컬럼 팩토리 — 우측정렬 + 공유 포매터/스타일. strong=합계·강조열
const numCol = (field: string, header: string, strong?: boolean): ColDef<Row> => ({
  field: field as keyof Row, headerName: header, flex: 1, minWidth: 92,
  valueFormatter: numFmt, cellStyle: numStyle(strong) as any, type: 'rightAligned',
});

const columnDefs: (ColDef<Row> | ColGroupDef<Row>)[] = [
  { field: 'y', headerName: '구분', pinned: 'left', width: 120, cellStyle: { fontWeight: 600 } },
  { headerName: '조성현황', headerClass: 'apfs-grp-co', marryChildren: true,    // 2단 그룹헤더
    children: [numCol('c0', '합계', true), numCol('c1', '농특회계')/* … */] },
  { headerName: '출자현황', headerClass: 'apfs-grp-in', marryChildren: true,
    children: [numCol('u0', '조합수'), numCol('u1', '출자금액')] },
];
```
- **2단 헤더**: `ColGroupDef` + `children` + `marryChildren: true`(그룹 열 묶음 유지). 그룹 라벨 `headerClass`(예: `apfs-grp-co`/`apfs-grp-in`)는 **현재 CSS 규칙이 없는 placeholder 훅**(=시각 효과 없음). 톤 분리가 필요하면 `aggrid_shared.css`에 `.apfs-grp-*` 규칙을 직접 추가하라.
- **첫 열 고정**: 구분/연도 등 행 식별 열은 `pinned: 'left'`.
- **숫자 셀**: `valueFormatter: numFmt`(마스킹·콤마·소수 내장 — 공유 `fmt`는 정수=콤마/비정수=소수1자리, **자체 포매터 재구현 금지**), `cellStyle: numStyle(strong)`, `type: 'rightAligned'`. ⚠️ `numStyle(strong)`은 **셀마다 호출되는 함수를 반환**한다(정적 스타일 객체 아님) — 0=muted·pinned/strong=bold·tabular-nums 자동.

## 그리드 본체 (정본 props)
```tsx
<AgGridReact<Row>
  theme={apfsTheme}                 // ① 공유 테마 (레거시 CSS 금지)
  rowData={rows} columnDefs={columnDefs}
  pinnedBottomRowData={PINNED_BOTTOM}        // ④ 모듈 상수
  domLayout="autoHeight"
  defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
  rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
  pagination paginationPageSize={PAGE_SIZE} suppressPaginationPanel   // 페이저는 GridFrame 푸터에서 커스텀
  isExternalFilterPresent={isExternalFilterPresent}                   // 상세필터(Community)
  doesExternalFilterPass={doesExternalFilterPass}
  onGridReady={(e)=>{ apiRef.current = e.api; }}
  onSelectionChanged={(e)=>setSelCount(e.api.getSelectedRows().length)}
  onRowDoubleClicked={editable ? (e)=>e.data && setModal({mode:'edit', row:e.data}) : undefined}
/>
```

## 자주 쓰는 동작 (정본 — asset_funding.tsx)
| 동작 | 방법 |
|------|------|
| 정렬 | `defaultColDef.sortable: true` (헤더 클릭) |
| 행 선택→삭제 | `rowSelection` multiRow, `api.getSelectedRows()`로 삭제 후 `deselectAll()` |
| 페이지네이션 | `pagination`+`suppressPaginationPanel` 후 `paginationGoToPage` 등으로 GridFrame 푸터에 커스텀 페이저 |
| 상세필터 | **External Filter**(Community): `isExternalFilterPresent`/`doesExternalFilterPass` + 값 변경 시 `apiRef.current?.onFilterChanged()`. 드로어 UI·필터칩은 →[[apfs-detail-filter]] |
| 수정 진입 | `onRowDoubleClicked` → 스키마 모달(→[[apfs-form-modal]]) |
| Excel 내보내기 | SheetJS(아래) — Community엔 `exportDataAsExcel` 없음 |

## Excel(.xlsx) 내보내기 — SheetJS (community)
AG Grid Community엔 Excel export가 없어 `xlsx`(SheetJS **@0.18.5**, **쓰기 전용** — `XLSX.read` 미사용 → 알려진 파싱 CVE 비해당)로 직접 생성한다. 화면 2단 헤더(병합 `!merges`)·합계행을 재현하고, **우측정렬 숫자 컬럼은 실제 숫자 셀(`t:'n'` + 숫자서식 `z`)** 로 써서 Excel이 화면과 같게 자동 우측정렬한다(커뮤니티 xlsx는 정렬 '스타일'을 못 쓴다 → 숫자 셀로 정렬을 얻음). **마스크 ON이면 값을 `0`으로 기록**(실값 비노출, 표시 모양은 `z` 서식이 담당). 최소 골격:
```tsx
const masked = useMask();                       // ← 마스크 분기(필수). MASK_ON 상수 없음
const head1 = ['지역구분','출자현황','','회수현황',''];   // 그룹행
const head2 = ['','건수','금액','건수','금액'];           // 세부행
const body  = [...rows, TOTAL_ROW].map(r => [r.region, ...numKeys.map(k => masked ? 0 : r[k])]);
const ws = XLSX.utils.aoa_to_sheet([head1, head2, ...body]);
numKeys.forEach((k,j) => body.forEach((_,i) => {     // 숫자 셀에 z 서식
  const a = XLSX.utils.encode_cell({ r: i+2, c: j+1 }); if (ws[a]) ws[a].z = '#,##0';
}));
ws['!merges'] = [
  { s:{r:0,c:0}, e:{r:1,c:0} },                 // 지역구분 세로병합
  { s:{r:0,c:1}, e:{r:0,c:2} },                 // 출자현황 가로병합
  { s:{r:0,c:3}, e:{r:0,c:4} },                 // 회수현황 가로병합
];
const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '지역별출자현황');
XLSX.writeFile(wb, '지역별출자현황.xlsx');
```
정수/소수 혼합 `z` 서식·열폭 등 상세는 골드 주석(asset_funding.tsx `exportExcel`, →[[excel-export-sheetjs]] 메모리).

## 마스킹 ("축은 두고 데이터는 가린다")
- 마스크 API(SSOT): `import { mn, MT, useMask } from './mask';`. **`MASK_ON` 같은 상수 export는 없다** — 화면 표시는 `mn()`/`<MT>`가, 분기 판단은 훅 `const masked = useMask();`가 담당. 전역 토글은 `mask.tsx`의 `_on` 한 줄(현재 `true`).
- 숫자 셀: `valueFormatter: numFmt` — `mn()` 내장(자동 마스킹). 텍스트 셀: cellRenderer에서 `<MT>{value}</MT>`.
- **비마스킹**: 헤더·그룹명·단위·StatusBadge·축(연도 등)·KPI 라벨은 가리지 않는다.
- ⚠️ **Excel 등 화면 밖 출력은 `valueFormatter`를 안 거치므로 직접 마스킹**해야 한다(아래) — 안 그러면 마스크 ON인데도 파일에 실값이 새어나간다(데이터 무결성 위반).

## 검증
- `npm run build`(exit 0) + `npm test`(스키마 zod 26개 green) + 기존 그리드(generic_list 등) 무변경 회귀.
- 브라우저: 라이트/다크 + 1280/768/400px — 빈 그리드 아님, 합계행 보임, 회색 행선택(틴트는 `.ag-row-selected::before` 오버레이에서 확인), 가로 오버플로 없음(→[[responsive-ui]] 프로토콜).

## 참조
- 바깥 양식(GridFrame): [[apfs-grid]] — `import { GridFrame, KpiBadge } from './grid_frame';`. props: `crumbs·title·cardTitle·kpis·toolbarLeft/Right·footerLeft/Center/Right`(toolbar/pager prop을 발명하지 말 것).
- 수정/등록 모달: [[apfs-form-modal]]
- 상세필터 드로어: [[apfs-detail-filter]]
- 색 토큰: [[color-tokens]] · 반응형: [[responsive-ui]] · 캡처→스키마: [[apfs-capture-schema]]
