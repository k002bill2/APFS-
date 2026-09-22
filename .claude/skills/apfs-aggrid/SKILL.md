---
name: apfs-aggrid
description: APFS 대시보드의 AG Grid 본체(테이블 알맹이) 작성 규약 — 공유 테마 apfsTheme, 2단 그룹헤더(ColGroupDef)·pinned 합계행·행 선택(단일/다중선택 — 체크박스로만 on/off, 행 본문 클릭 선택 없음)·외부필터(Community)·더블클릭 수정·Excel(SheetJS) 내보내기·셀 마스킹. 정본 예시는 "모태펀드 조성·출자 현황표"(asset_funding.tsx). AgGridReact·컬럼정의·pinned행·합계행·정렬·엑셀 내보내기·셀 렌더러 작업 시 사용(바깥 양식 골격은 apfs-grid). Use when building or editing the AgGridReact table body itself (columns, theme, pinned rows, sorting, excel export, cell rendering).
---

# apfs-aggrid Skill

## 컨텍스트
`apfs-grid`(GridFrame)는 페이지의 **바깥 양식**(헤더·KPI·툴바·푸터)을 소유한다. 이 스킬은 그 안에 들어가는 **AG Grid 본체**(`AgGridReact` — 컬럼·테마·고정행·선택·필터·내보내기)를 소유한다. "양식은 apfs-grid, 알맹이는 apfs-aggrid."

- **정본 예시(골드 레퍼런스)**: `src/dash/asset_funding.tsx` — "모태펀드 조성·출자 현황표". 2단 그룹헤더 + pinned 합계행 + flex 컬럼폭 + 정렬·상세필터(External Filter)·페이지네이션·Excel·우클릭 메뉴의 완성형.
  ⚠️ **선택·CRUD 툴바의 정본은 여기가 아니다** — 이 화면은 2026-09-17 결정으로 `rowSelection` 자체가 없다(아래 "행 선택" 절). 선택·다중선택·선택 액션 툴바를 베낄 때는 `src/dash/generic_list.tsx` 를 본다.
- **공유 인프라(SSOT)**: `src/dash/aggrid_theme.ts`(`apfsTheme`·`fmt`·`numFmt`·`numStyle`·모듈등록), `src/dash/aggrid_shared.css`(합계행 버그 보정).
- 버전: AG Grid Community **v35.3.1**(v33+ Theming API). 다른 정본 트랙: 리스트형은 `generic_list.tsx`(스키마 주도).

## 핵심 계약 (CRITICAL — 어기면 blank grid·다크 깨짐·합계행 사라짐)
1. **모듈 1회 등록.** `aggrid_theme.ts`가 `ModuleRegistry.registerModules([AllCommunityModule])`를 1회 수행한다. 새 그리드는 **반드시 `aggrid_theme.ts`에서 `apfsTheme`를 import**(=등록 공유). 직접 등록 추가 금지. 미등록 시 런타임 **빈 그리드**.
2. **레거시 CSS import 금지.** `ag-grid.css`·`ag-theme-*.css`를 import하지 말 것 — v33+ Theming API와 충돌. 테마는 오직 `theme={apfsTheme}` prop.
3. **회색 행선택은 `selectedRowBackgroundColor`로 격리.** `apfsTheme`가 `selectedRowBackgroundColor: var(--row-selected)`(중립 회색 토큰)로 칠한다. **`accentColor`(포커스링·정렬표시)는 건드리지 말 것** — 바꾸면 선택색이 그 크롬까지 물든다.
4. **pinned 합계행은 참조가 안정해야 한다(매 렌더 인라인 `[total]` 금지).** `pinnedBottomRowData`에 매 렌더 **새 배열**을 넘기면 AG Grid가 고정행을 재생성해 **행 애니메이션이 매번 재발**한다. 데이터 가변성에 따라 갈라라:
   - **정적 데이터** → 모듈 스코프 상수: `const PINNED_BOTTOM = [TOTAL_ROW];`
   - **가변 행(삭제·추가로 합계 재계산 필요)** → `const pinned = useMemo(() => [computeTotal(rows)], [rows]);` — 렌더 간 참조 안정 + 데이터 변할 때만 새 배열.
   - ⚠️ 골드 예시 `asset_funding.tsx`는 우클릭 행 삭제를 지원하면서도 `PINNED_BOTTOM=[TOTAL_ROW]`(하드코딩 합계)를 쓴다 → **행 변경 후 합계가 stale**(프로토타입 더미라 미수정). 실데이터·가변 행이면 반드시 `useMemo` 재계산 쪽을 따를 것.
5. **합계행 버그 보정 CSS.** `import './aggrid_shared.css'` 필수 — 안 하면 floating(합계)행이 `opacity:0` stuck으로 **안 보인다**(`!important`라 getRowStyle로 못 고침, CSS로만). 합계행 강조 틴트도 여기서 공유.
6. **객체 prop은 전부 참조가 안정해야 한다 — 인라인 `{{…}}` 금지. 특히 `defaultColDef`·`autoSizeStrategy`.**
   인라인 리터럴은 렌더마다 새 객체가 되고, AG Grid는 그때 컬럼을 재생성하면서 폭을 **`colDef.width`(선언 폭)로 되돌린다.**
   `autoSizeStrategy`는 **최초 렌더 1회만** 적용되므로 한 번 되돌아가면 **복구되지 않는다.**
   - 증상: 상태가 바뀌는 **아무 클릭**(필터 칩·셀 버튼·모달 개폐)에서 컬럼이 갑자기 좁아지고 우측에 빈 여백이 생긴다.
     모달과 무관하다 — 오버레이 없는 필터 칩만으로도 재현된다(스크롤바 보정 가설은 실측으로 기각: 뷰포트 폭은 그대로).
   - 실측(2026-09-12): 수시보고 컨테이너 `1513→1232px`(제목 465→330), 자펀드관리 합계폭 `1831→1788`(fn 279→240, no 80→68).
   - 정본: **`aggrid_theme.ts`의 공용 상수** `DEFAULT_COL_DEF` · `AUTO_SIZE_CONTENT` · `FIT_GRID_WIDTH`를 import해 쓴다.
     페이지 고유 객체(`rowSelection`·`selectionColumnDef`)는 **모듈 스코프 상수로 호이스팅**한다.
   - `columnDefs`가 클로저를 캡처해야 하면(셀 버튼이 setState 호출 등) `useMemo(() => makeColumns(setX), [])` —
     `useState` 세터는 안정하므로 deps `[]`가 성립한다. **`columnDefs`만 고정하고 `defaultColDef`를 인라인으로 두면 소용없다.**
   - 검증: 폭을 재고 → 필터 칩 클릭 → 다시 재서 **같은 값**인지 확인(빌드 green으로는 절대 안 잡힌다).
7. **가로 스크롤은 children 책임이지만 AG Grid는 내부 스크롤을 가진다.** `domLayout="autoHeight"`를 쓰면 세로는 콘텐츠에 맞고 가로는 AG Grid 자체 뷰포트가 스크롤한다. 수제 `<table>`을 쓸 때만 `overflow-x-auto`+`min-width` 래퍼가 필요(→[[apfs-grid]] 계약1). 토큰만 사용(하드코딩 hex 금지, →[[color-tokens]]).
8. **행선택 체크박스 = DS `Checkbox`(2026-09-18 사용자 결정 "모두 통일").** `selectionColumnDef` 는 페이지마다 리터럴을 쓰지 않고 **`aggrid_selection.tsx` 의 `SELECTION_COL`** 한 상수를 넘긴다(`pinned:'left'·width 44` + DS 체크박스 셀 렌더러 + multiRow 3상태 헤더). `rowSelection` 은 그대로 둔다(`checkboxes:true` 가 선택 컬럼을 만들고, 내장 ag-checkbox 는 `aggrid_selection.css` 가 숨긴다). 테마 `checkbox*` 파라미터로 색만 맞추는 방식은 크기(iconSize 16)·표식 pop 이 달라 폐기했다. ⚠ 이중 토글 방지는 클래스가 아니라 AG Grid 이벤트 플래그(`_stopPropagationForAgGrid`, 래퍼에 **네이티브** click/dblclick 리스너) — React onClick 에서 세우면 행 리스너가 먼저 지나가 늦다.
   `main-internal` export 는 **semver 비보장** — 모듈 로드 시 `typeof` 어서션으로 사라지면 시끄럽게 실패한다(조용한 no-op 방지). multiRow 소비처는 `headerCheckbox:false` + `selectAll:'filtered'`(DS 헤더와 범위 일치, 내장 SelectAllFeature 끔). pinned 합계행·`selectable:false` 행은 렌더러가 `null` 을 그린다(내장 동작과 동일).

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

### 헤더에 ⚠검토필요 마커 달기 (2026-09-12 `occasional_report_manage`에서 정립)
규약 정본은 [[apfs-grid]]("검토필요 마커") — 여기엔 **AG Grid 배선 함정**만 둔다.
```tsx
import { reviewInnerHeader } from './review_marker';
// 모듈 스코프에서 한 번만 만든다 — 렌더마다 새 컴포넌트 타입이면 AG Grid 가 헤더를 통째로 remount 한다.
// 원문 문구가 역할별로 다르면(S1_04: 심사담당/리스크담당) 하나로 합치지 말고 갈라 만든다.
const CONFIRM_HEADER: Record<Role, ReturnType<typeof reviewInnerHeader>> = {
  js: reviewInnerHeader(CONFIRM_NOTE('js')), rs: reviewInnerHeader(CONFIRM_NOTE('rs')),
};
{ field: 'jsBy', headerName: '심사담당', width: 146, maxWidth: 146, sortable: true,
  headerComponentParams: { innerHeaderComponent: CONFIRM_HEADER[role] },      // headerName 은 그대로 SSOT(params.displayName)
  suppressHeaderKeyboardEvent: (p) => p.event.key === 'Tab' }                 // 키보드 도달용
```
- **`headerComponent`가 아니라 `headerComponentParams.innerHeaderComponent`** — 전자로 갈아끼우면 정렬 화살표·메뉴를 직접 다시 만들어야 한다.
- 📌 "React 위임 핸들러는 AG Grid 네이티브 리스너보다 늦어 정렬이 걸린다"는 지적이 Codex 리뷰에서 반복해 나오지만,
  **실측으로는 재현되지 않는다**(2026-09-12, 클릭 3연타·Enter·Space 각각에서 `aria-sort='none'` 유지, 정렬된 헤더 0개,
  행 순서 문자열 동일). 다시 지적받으면 코드를 고치기 전에 같은 계측(행 순서 before/after)을 먼저 돌릴 것.
- ⚠️ 마커 클릭이 헤더로 버블링되면 **정렬이 걸린다** → 트리거 버튼에서 `click`·`pointerdown`·`mousedown`을 `stopPropagation`(`ReviewMarker`에 내장). 헤더 라벨 클릭 정렬은 그대로 살아 있어야 한다(둘 다 실측할 것).
- ⚠️ **Tab이 마커에 닿지 않는다** — AG Grid가 Tab을 가로채 다음 헤더 셀로 옮긴다(2026-09-12 실측). `suppressHeaderKeyboardEvent: (p) => p.event.key === 'Tab'`로 브라우저 기본 순서에 돌려주면 헤더 → 마커 → 다음 마커 → 그리드 본문 순으로 흐른다.
- ⚠️ 마커를 단 컬럼은 헤더가 길어진다 — `width`/`maxWidth`가 같은 값으로 고정된 컬럼이면 **둘 다** 올린다(124→146). 남는 폭 흡수 컬럼(`maxWidth` 없는 컬럼)이 여전히 잉여를 먹는지 확인.
- ⚠️ **마스크 ON이면 헤더 스켈레톤 바가 마커를 덮는다** — `aggrid_shared.css`가 `:root[data-mask=on] .ag-header-cell-text::after`로
  텍스트 노드 전폭에 절대배치 바를 그리는데, innerHeader 마커도 그 안에 산다. 마커는 데이터가 아니라 항상 보여야 하므로
  트리거에 `position:relative; z-index:1`(`ReviewMarker`에 내장). 검증은 `mask.tsx`의 `_on=true`로 실제 토글해 볼 것 —
  DOM에서 `data-mask` 속성만 바꾸면 규칙이 잡히지 않아 오탐이 난다(2026-09-12 실측).
- AG Grid의 React 커스텀 헤더는 **첫 페인트보다 늦게 붙는다** — 로드 직후 스냅샷하면 헤더 텍스트가 빈 문자열로 보인다(2026-09-12 오탐). 검증 스크립트는 2초 이상 대기 후 질의.

## 그리드 본체 (정본 props)
```tsx
<AgGridReact<Row>
  theme={apfsTheme}                 // ① 공유 테마 (레거시 CSS 금지)
  rowData={rows} columnDefs={columnDefs}
  pinnedBottomRowData={PINNED_BOTTOM}        // ④ 모듈 상수
  domLayout="autoHeight"
  autoSizeStrategy={AUTO_SIZE_CONTENT}       // ⑦ 공용 상수 (FIT_GRID_WIDTH도 동일 — 인라인 리터럴 금지)
  defaultColDef={DEFAULT_COL_DEF}            // ⑦ 공용 상수 (aggrid_theme.ts) — 인라인 `{{…}}` 금지
  rowSelection={ROW_SELECTION}               // ⑦ 모듈 상수로 호이스팅. 항상 `enableClickSelection:false` — 선택은 체크박스로만("체크박스" 절)
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
| 행 선택→삭제(다건) | `rowSelection` multiRow(`checkboxes:true`, `enableClickSelection:false` — 체크박스로만 고른다), `api.getSelectedRows()`로 삭제 후 `deselectAll()`. 정본 `generic_list.tsx` |
| 페이지네이션 | `pagination`+`suppressPaginationPanel` 후 `paginationGoToPage` 등으로 GridFrame 푸터에 커스텀 페이저 |
| 상세필터 | **External Filter**(Community): `isExternalFilterPresent`/`doesExternalFilterPass` + 값 변경 시 `apiRef.current?.onFilterChanged()`. 드로어 UI·필터칩은 →[[apfs-detail-filter]] |
| 수정 진입 | `onRowDoubleClicked` → 스키마 모달(→[[apfs-form-modal]]) |
| Excel 내보내기 | SheetJS(아래) — Community엔 `exportDataAsExcel` 없음 |
| 우클릭 컨텍스트 메뉴 | **Community 대체**(내장 context menu는 Enterprise 전용): `onCellContextMenu`+`preventDefaultOnContextMenu`+공유 `RowContextMenu`(아래) |
| pivot | **불가** — Enterprise 전용. Community 재현 불가(보류) |

## 우클릭 컨텍스트 메뉴 / pivot (Community 경계)
AG Grid의 **내장 context menu(`getContextMenuItems`)·pivot은 Enterprise 전용** — Set Filter/Excel export가 Enterprise라 External Filter/SheetJS로 우회한 것과 같은 갈림길.
- **pivot** → Community 재현 불가(보류). 필요 시 Enterprise 도입뿐.
- **context menu** → 공유 컴포넌트 `src/dash/row_context_menu.tsx`(`RowContextMenu`/`CtxItem`/`CtxMenuState`)로 대체. body Portal + `z-popover`(→[[z-index]] sticky/transform 쌓임맥락 트랩 회피), 뷰포트 가장자리 flip, 닫힘 경로 전부 소유(바깥클릭·Esc·scroll·resize·blur). **항목 폰트 14px**(프로젝트 폼 표준 →[[form-control-height-38-line-height-trap]]), 색은 토큰만(→[[color-tokens]]).

배선(정본: asset_funding·generic_list):
```tsx
const [ctx, setCtx] = useState<CtxMenuState>(null);
const handleCellContextMenu = (e: CellContextMenuEvent<Row>) => {
  (e.event as MouseEvent | undefined)?.preventDefault();
  if (!e.data || e.rowPinned) return;              // ⚠️ pinned 합계행 제외(삭제 무의미 + 합계 stale)
  const ev = e.event as MouseEvent;
  setCtx({ x: ev.clientX, y: ev.clientY, items: [/* 수정·복사·Excel·삭제 — 기존 CRUD 핸들러 재사용 */] });
};
// 그리드 props: preventDefaultOnContextMenu  onCellContextMenu={handleCellContextMenu}   (둘 다 Community 유효)
// 렌더: <RowContextMenu state={ctx} onClose={() => setCtx(null)} />
```
- **필수 가드**: `e.rowPinned`로 pinned 행 제외. `preventDefaultOnContextMenu`(Community grid옵션)가 브라우저 기본 메뉴를 억제(헤더·빈영역도 억제됨 — 허용 범위).
- ⚠️ **행 복사는 마스크 ON시 `mn()`으로 실값 비노출**(Excel 내보내기와 동일 계약 — `valueFormatter`를 안 거치는 화면 밖 출력이라 직접 마스킹, 안 그러면 데이터 무결성 위반). 세부·함정은 →[[aggrid-community-context-menu]] 메모리.

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

## 관리형 페이지 그리드 규약 (2026-09-08 사용자 확정 — 골드 `subfund_manage.tsx`)
공유 인프라에 들어간 것(전 그리드 자동 적용)과 페이지가 켜야 하는 것을 구분한다.

**공유 인프라(이미 적용, 재설정 금지)**
- `apfsTheme`: `wrapperBorder:false`(외곽 테두리만 제거, 컬럼선·행선·헤더선 유지) · `wrapperBorderRadius:0` · `headerHeight:40`(2026-09-09 기본 48→40 축소, 2단 그룹헤더는 ×2=80px. 그룹/리프 공통 — 별도 `groupHeaderHeight` grid 옵션 미설정이라 그룹행도 같은 값. 값 변경은 여기 한 곳).
- `tokens.css --row-selected`: 라이트 `#F3F4F6`(2026-09-09 `#FBFBFB`→상향, `--bg` 흰색 전환 후 구분 불가라. 다크는 brand-gray 60% 유지). ⚠ 마우스가 행 위에 있으면 `rowHoverColor`(primary 8%, AG 기본) 오버레이가 겹쳐 보라빛 — 선택색 측정은 `page.mouse.move(5,5)` 후 `::before` 배경으로.
- `aggrid_shared.css` 합계행: 배경 `var(--muted)` + 상단 `1px solid var(--border-strong)`(이전 primary 9% 틴트·2px primary 선은 제거됨). pinned-left "합 계" 라벨은 primary 굵게 유지.

**페이지가 켜는 것**
- **컬럼 폭 = 그리드 특성으로 고른다.** AG Grid엔 "내용 맞춤 + 남는 공간 채움"을 한 방법으로 하는 수단이 없다:
  - **넓은 다열 테이블**(컬럼 합 > 프레임 폭, 자펀드관리 등) → `autoSizeStrategy={AUTO_SIZE_CONTENT}`(`aggrid_theme.ts` export, `fitCellContents`, 내용 폭·잘림 방지). 긴 텍스트 컬럼은 `maxWidth` 캡(자펀드 360·GP 240). ⚠ 자동 산정 순간 컬럼 가상화가 풀려 전 컬럼을 그린다(35컬럼도 동작, 첫 프레임만 무거움).
  - **좁은 매트릭스/집계 그리드**(컬럼 합 < 프레임 폭 → 우측 빈 공간, 조성·출자현황 등) → `autoSizeStrategy`를 **빼고** 컬럼에 **`flex:1` + `minWidth`**(예: `numCol`에 `flex:1, minWidth:92`). flex가 그리드 폭을 동적으로 채우고(우측 빈 공간 0) 리사이즈에도 자동 재분배한다. 고정폭 컬럼(pinned 구분 등)은 flex 없이 `width` 유지. 좁으면 minWidth 하한→가로 스크롤(반응형 보존).
    - ✗ `autoSizeStrategy={fitGridWidth}`는 쓰지 말 것: `domLayout="autoHeight"`+지연 레이아웃에서 **생성 시점 폭에 1회만** 맞춰 빈 공간이 남는다(2026-09-11 asset_funding 실측 gap 455px). flex를 쓴다.
  - 검증: 잘린 셀 0 — `[...document.querySelectorAll('.ag-cell')].filter(c=>c.scrollWidth>c.clientWidth+1).length===0`. **빈 공간 0**은 `.ag-center-cols-container` 폭이 아니라(pinned 컬럼 제외돼 항상 pinned폭만큼 작게 나옴) **헤더셀 폭 합 ≈ `.ag-root-wrapper` 폭**으로 본다: `Math.abs([...document.querySelectorAll('.ag-header-cell')].reduce((s,h)=>s+h.getBoundingClientRect().width,0) - document.querySelector('.ag-root-wrapper').getBoundingClientRect().width) < 4`.
- **행 높이는 테마 기본(42px)** — `rowHeight` 오버라이드 금지(골드와 간격 통일).
- **체크박스는 "선택이 액션을 만들 때"만 만든다(기본값 아님).** 체크로 실행할 것이 있는 화면 — 다건 선택삭제, 단계 전이(→[[apfs-stage-workflow]]), 선택 행 편집 — 만 `checkboxes:true`. **조회 전용(감사·이력·집계)처럼 선택이 아무 것도 못 하는 화면은 `rowSelection` 자체를 두지 않는다**(아래 "조회 전용" 항목). `checkboxes:false` 로 체크박스만 끄고 선택을 남기는 중간 구성은 **없다** — 2026-09-22 부터 선택 수단이 체크박스뿐이라, 체크박스 없는 선택은 만들 수도 풀 수도 없는 죽은 선택이다(구 선례 `risk_manage.tsx` 는 같은 날 `rowSelection`·`onRowClicked`·write-only 였던 `selectedRow` state 를 한 벌로 걷어냈다).
  - **선택은 체크박스로만 on/off 한다 — 행 본문 클릭은 선택을 만들지도 풀지도 않는다(2026-09-22 사용자 결정).**
    모든 `rowSelection` 에 `enableClickSelection: false` 를 **명시**한다(AG Grid 기본값과 같지만, 아래 실사고처럼 "키 누락"이
    "선택 수단 0" 사고로 오독된 이력이 있어 의도를 적는다). `enableSelectionWithoutKeys` 는 클릭 선택 전용 옵션이라 함께 뺀다.
    singleRow(라디오)·multiRow 공통이고, `code_manage` 좌 그리드의 `'enableSelection'` 변형도 `false` 로 내렸다(해제 금지는
    이미 `queueMicrotask` 복원이 담당 — "master-detail" 절). 행 본문 클릭에 남는 동작은 **포커스 이동뿐**이고, 더블클릭=수정 모달·
    우클릭=컨텍스트 메뉴는 그대로다. 체크박스 셀의 `_stopPropagationForAgGrid` 가드(핵심 계약 8)는 click 쪽 실효가 없어졌지만
    dblclick 쪽(체크박스 더블클릭 → 수정 모달 누수 방지)이 살아 있어 **둘 다 유지**한다.
    ```tsx
    const ROW_SELECTION = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered',
      enableClickSelection: false,       // 행 본문 클릭 선택 없음 — 체크박스로만 (2026-09-22)
    } as const;                          // singleRow 도 동일: { mode:'singleRow', checkboxes:true, enableClickSelection:false }
    ```
    - **역사(뒤집힌 결정들 — 다시 켜자는 제안이 오면 이 순서를 먼저 보일 것)**: 2026-09-15 `asset_funding.tsx` 가
      `{mode:'multiRow', checkboxes:false}` 만 두고 주석엔 "행 클릭으로 선택 유지"라 적혀 있어 선택삭제 툴바가 도달 불가로 방치됐다
      (`enableClickSelection` 기본 false) → 그 옵션을 켜 복구. 09-17 사용자가 "체크박스가 없는데 저 액션 필요없다"고 판정해
      그 화면은 선택을 통째로 걷어냈고, 같은 날 multiRow 정본(`generic_list`)에는 "체크박스 칸 44px 을 겨냥하지 않아도 되게"
      `enableClickSelection`+`enableSelectionWithoutKeys` 한 벌을 켰다(전자만 켜면 본문 클릭이 기존 체크를 전부 대체해 3건→1건).
      **09-22 사용자가 이를 뒤집어 전 페이지 체크박스 전용으로 통일** — 본문 클릭이 선택을 바꾸는 것이 오히려 오조작이었다.
  - 화면에 액션이 있어도 **더블클릭·Enter·우클릭 메뉴로 이미 닿는 단일 액션(상세 보기 등)뿐**이라면 체크박스 값이 없다 — 만들지 않는다. "체크했는데 아무 일도 안 일어남"은 그 자체로 UI 결함이다.
  - **단일선택이 필요한 화면은 multiRow 로 올리지 않는다.** 판별 기준은 하나 — **그 액션이 N건에 의미가 있나.**
    - `singleRow` 유지: 단계 전이(→[[apfs-stage-workflow]] — 승인/반려는 한 건씩), master-detail 라디오
      (→ 아래 절 — 좌측 1건이 우측 내용을 정한다), 선택 행 **수정**(모달은 한 건만 연다).
      현행 11개 bespoke 페이지가 전부 여기 속한다(`subfund_manage`·`program_manage`·`user_manage`·`code_manage` …).
    - `multiRow`: **선택 삭제처럼 N건에 그대로 적용되는 액션**이 있는 화면. 현행 정본은 `generic_list.tsx` 하나다.
  - **수정 버튼은 단건 체크일 때만**(`editable && selCount === 1`). 다건 선택에 수정 모달은 의미가 없다 —
    다건이면 `선택 삭제`·`선택 해제`만 남는다(정본: `generic_list.tsx` `selActions`).
  - **조회 전용 화면은 `rowSelection` 자체를 두지 않는다**(2026-09-15 사용자 지시 — 체크박스만 끄는 것보다 한 단계 더). 선택이 만들 액션이 없으면 `rowSelection` prop 을 통째로 지운다(`checkboxes:false` 로 남기지 않는다): 함께 `onSelectionChanged`·선택 state(`selId`)·`selected`·툴바의 `선택 해제` 버튼/선택 배지 분기·`refresh()`의 `deselectAll()`·`apiRef`(다른 용도가 없으면)까지 **한 벌로 사라진다**. `refreshNoColumn`은 자기 이벤트의 `e.api`를 쓰므로 `apiRef`에 의존하지 않는다. 상세 진입은 **더블클릭 / Enter / 우클릭 메뉴** 3경로로 이미 충분하고, 회색 행 강조가 없어지는 것이 "선택 기능 없음"과 일치한다. 선례: `audit_log.tsx`·`permission_history.tsx`.
  - 스키마 주도(`generic_list.tsx`) 페이지는 이 규약을 `schema.hideRowSelection: true` 로 표현한다(→[[apfs-grid]]) — bespoke 페이지만 `rowSelection`을 직접 만진다.
- **라디오 단일선택(체크박스가 필요한 경우)**: 모듈 상수 `ROW_SELECTION = {mode:'singleRow',checkboxes:true,enableClickSelection:false}` + `selectionColumnDef={SELECTION_COL}`(`aggrid_selection.tsx`, 핵심 규약 8) + `getRowId`. 선택 SSOT는 React state(→[[apfs-stage-workflow]] 규약 9).
- **단계/상태 배지 셀**: `StatusBadge size="lg" dot={false}`(13px, 앞 점 없음 — 배지가 촘촘히 반복되는 열).
- **엑셀**: 2단 헤더 병합·리프 키를 손으로 적지 말고 `flattenForExcel(columnDefs)`(골드 로컬 헬퍼, `ColGroupDef` 순회 → `head1/head2/keys/merges`)로 **columnDefs에서 자동 산출**. 마스크 시 숫자 0·텍스트 ''.
- 읽기전용 명세는 [[apfs-spec-popup]]. (카드뷰 토글 규약은 2026-09-11 폐기 — 리스트 뷰 단일 표현.)

## master-detail 좌 그리드 = 라디오 (2026-09-15 `code_manage.tsx` 실측)
좌(master)에서 고른 행이 우(detail) 그리드의 내용을 정하는 화면은, 좌측이 **"여러 건을 고르는 체크박스"가 아니라 "우측이 무엇을 보여줄지 정하는 라디오"**다. 빈 선택은 유효한 상태가 아니라 우측이 갈 곳을 잃은 상태다.

- **해제를 막는다.** `onSelectionChanged`에서 선택이 0건이면 직전 선택을 되돌린다. 종전 `if (code) {…}` 가드만 두면 해제 시 **아무 일도 안 해서** `curCode`가 남고, "체크는 꺼졌는데 수정·삭제 버튼은 그대로"인 모순이 보인다.
- ⚠️ **되돌리기를 그 이벤트 안에서 즉시 하면 안 된다.** 다른 행을 클릭하면 AG Grid는 `'이전 행 해제'(0건)` → `'새 행 선택'` 순으로 `selectionChanged`를 **두 번** 쏜다. 첫 발화만 보고 되살리면 전환 도중을 해제로 오인해 이전 행이 부활하고 새 행까지 선택돼 2건이 된다. **배치가 끝난 뒤(`queueMicrotask`) 여전히 0건일 때만** 되돌린다 = 진짜 해제.
```tsx
const onGroupSelection = useCallback((e: SelectionChangedEvent<Row>) => {
  const code = e.api.getSelectedRows()[0]?.code;
  if (code) { setCurCode(code); setSelDetail(null); return; }
  queueMicrotask(() => {                       // 전환 중간 발화와 진짜 해제를 가르는 지점
    if (e.api.isDestroyed?.()) return;
    if (e.api.getSelectedRows().length === 0) syncRadio(e.api);   // 직전 선택 복원
  });
}, [syncRadio]);
// syncRadio: curRef.current 의 rowNode 를 찾아 !isSelected() 면 setSelected(true, true).
// ready / rowDataUpdated 에도 같이 물려 초기 자동선택·필터 후 재마운트를 되맞춘다.
```

## ⚠️ 선택 건수를 DOM 으로 세지 말 것 (오탐 함정, 2026-09-15 실측)
`.ag-row-selected`를 `querySelectorAll`로 세면 **한 행이 2건으로 잡힌다** — AG Grid가 체크박스(선택) 열을 `.ag-pinned-left-cols-container`에, 나머지를 `.ag-center-cols-container`에 **따로 렌더**하므로 같은 행의 조각이 양쪽에 하나씩 존재한다. 이걸 모르면 멀쩡한 단일선택을 "중복 선택 버그"로 오진하고 없는 버그를 고치게 된다.
- 세는 법: `new Set([...els].map(r => r.getAttribute('row-id'))).size` — 또는 애초에 DOM 대신 `api.getSelectedRows().length`.
- 같은 이유로 "선택된 행의 셀 텍스트"를 집을 때도 pinned 쪽 조각이 먼저 잡혀 **빈 문자열**이 나온다(`.ag-center-cols-container` 안에서 찾을 것).

## 마스킹 ("축은 두고 데이터는 가린다")
- 마스크 API(SSOT): `import { mn, MT, useMask } from './mask';`. **`MASK_ON` 같은 상수 export는 없다** — 화면 표시는 `mn()`/`<MT>`가, 분기 판단은 훅 `const masked = useMask();`가 담당. 전역 토글은 `mask.tsx`의 `_on` 한 줄(현재 `true`).
- 숫자 셀: `valueFormatter: numFmt` — `mn()` 내장(자동 마스킹). 텍스트 셀: cellRenderer에서 `<MT>{value}</MT>`.
- **비마스킹**: 헤더·그룹명·단위·StatusBadge·축(연도 등)·KPI 라벨은 가리지 않는다.
- ⚠️ **Excel 등 화면 밖 출력은 `valueFormatter`를 안 거치므로 직접 마스킹**해야 한다(아래) — 안 그러면 마스크 ON인데도 파일에 실값이 새어나간다(데이터 무결성 위반).

## 검증
- `npm run build`(exit 0) + `npm test`(스키마 zod 26개 green) + 기존 그리드(generic_list 등) 무변경 회귀.
- 브라우저: 라이트/다크 + 1280/768/400px — 빈 그리드 아님, 합계행 보임, 회색 행선택(틴트는 `.ag-row-selected::before` 오버레이에서 확인), 가로 오버플로 없음(→[[responsive-ui]] 프로토콜).
- **행 선택(체크박스 전용) 회귀 5종**(2026-09-22 실측, aside repl): ① 본문 클릭 → 선택 0 유지 ② 체크박스 클릭 → 1, 다시 → 0 ③ multiRow 3건 체크 후 본문 클릭 → 3 유지 ④ 본문 더블클릭 → 수정 모달 열림 / 체크박스 더블클릭 → 모달 **안** 열림·선택 원복 ⑤ master 라디오(`code_manage`)의 체크된 행을 다시 눌러도 선택 복원, 본문 클릭은 무반응.
  - 키보드: 포커스된 본문 셀에서 **Space 는 여전히 선택을 토글**한다 — AG Grid 는 `source==='rowClicked'` 만 `enableClickSelection` 으로 막고 `spaceKey` 는 통과시킨다(`inferNodeSelections`). 접근성 경로 그대로.
  - ⚠️ 자동화 함정: aside/Playwright `keyboard.press(' ')`·`type(' ')` 는 `key:""`·`code:"Space"` 로 도착해 AG Grid(`event.key===' '`)가 무시한다 → **오탐 0건**. 키보드 검증은 `activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true}))` 로. 체크박스 클릭도 aside `locator.click()` 은 "checked 가 안 바뀌면 throw"(라디오 복원 케이스에서 터진다) → `page.mouse.click(중심좌표)` 로.
  - 선택 건수는 `new Set(row-id)` 로 센다(아래 "DOM 으로 세지 말 것"). `page.goto` 로 같은 해시 URL 재진입은 리로드가 아니라 열려 있던 모달이 남는다 — 케이스 사이에 Escape 를 넣는다.

## 참조
- 바깥 양식(GridFrame): [[apfs-grid]] — `import { GridFrame, KpiBadge } from './grid_frame';`. props: `crumbs·title·cardTitle·kpis·toolbarLeft/Right·footerLeft/Center/Right`(toolbar/pager prop을 발명하지 말 것).
- 수정/등록 모달: [[apfs-form-modal]]
- 상세필터 드로어: [[apfs-detail-filter]]
- 색 토큰: [[color-tokens]] · 반응형: [[responsive-ui]] · 출처→스키마: [[apfs-capture-schema]]
