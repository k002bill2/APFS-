# 공통 브리프 — 자펀드 관리 8화면 배치 (모든 worker 필독, 이 파일 → 자기 페이지 브리프 순)

## 0. 환경·범위 (위반 시 실패)
- 작업 디렉터리: `/Users/younghwankang/orca/workspaces/APFS/fund-admin-pages-batch` (git worktree). **다른 경로로 cd 금지.**
- **편집 가능 파일 = 자기 브리프의 "산출 파일" 목록뿐.** `src/dash/data.ts`·`src/dash/app.tsx`·공용 컴포넌트(`components.tsx`·`grid_frame.tsx`·`generic_list_modal.tsx`·`aggrid_theme.ts`·`ui/*`·`schemas/*`)·다른 페이지 파일·원본 HTML·레거시 번들은 **읽기만** 한다. 필요한 공용 변경이 있으면 구현하지 말고 보고서에 적어라.
- **git 명령 금지**(commit·stash·checkout·add 전부). 파일 생성/편집만.
- **`npm run build`·`npm run dev` 금지**(dist·포트 공유 충돌). 검증은 §7의 세 명령만.
- 라우팅(`app.tsx`)·메뉴(`data.ts`)는 코디네이터가 직렬 통합한다. 너는 컴포넌트를 **named export**로 내보내기만 한다.
- 시도 상한: 같은 오류를 2회 못 고치면 멈추고 보고한다. 브리프가 모호하면 추측 확장하지 말고 가장 단순한 해석으로 구현하고 보고서 "가정" 절에 적는다.

## 1. 먼저 읽을 것 (순서대로, 전부)
1. 스킬: `.claude/skills/apfs-manage-page/SKILL.md` → `apfs-grid` → `apfs-aggrid` → `apfs-detail-filter` → `apfs-datepicker` → `apfs-form-modal` → `color-tokens` → `web-a11y` → `responsive-ui` (각 `.claude/skills/<name>/SKILL.md`). 팝업이 있으면 `apfs-spec-popup`, 행 선택 워크플로우면 `apfs-stage-workflow`.
2. 골드 코드(그대로 복사해 쓸 로컬 헬퍼의 원본):
   - `src/dash/regular_report_manage.tsx` — 조회형 리스트 정본: 드로어(DrawerField/DrawerSelect)·MoreMenu kebab·PageBtn·External Filter·엑셀·검토필요 마커(헤더 `reviewInnerHeader` + 드로어 `note`)·셀 안 select.
   - `src/dash/report_form_manage.tsx` — CRUD 정본: `RegisterCombo`·`MoreMenuItems`·우클릭 `RowContextMenu`·더블클릭/Enter 수정·`AlertDialog` 삭제·`RowFormModal` 2모드.
   - `src/dash/general_meeting_manage.tsx` + `general_meeting_detail_modal.tsx` — 셀 링크(`LinkCell`)+Enter → 읽기전용 상세 팝업, `SelectCell`+`suppressKeyboardEvent`, 상세 모달 KvGrid/Section/표 헬퍼.
   - `src/dash/subfund_manage.tsx` — 2단 그룹헤더·pinned 합계행(useMemo)·`flattenForExcel`·`txt/date/amt/num` 컬럼 팩토리·`nullFmt`.
   - `src/dash/fund_cash_forecast_manage.tsx` — 금액 단위 토글(SegTabs + grid `context={{unit}}` + `refreshCells`) + 단위 반영 엑셀.
   - `src/dash/asset_funding.tsx` — 좁은 매트릭스(컬럼 `flex:1`+`minWidth`, autoSizeStrategy 없음).
   - `src/dash/subfund_spec_modal.tsx` — 명세 팝업 골격(UnitSeg·KvGrid·Section·FinGrid·중첩 Dialog). `subfund_form_modal.tsx` — 섹션형 모달·반복행 표(`SchemaField fill`, `tableLayout:'fixed'`).
   - 공용 API: `src/dash/components.tsx`(UI: Button/IconBtn/StatusBadge/FilterChip/SegTabs/Card/EmptyState), `grid_frame.tsx`(GridFrame props), `aggrid_theme.ts`, `review_marker.tsx`, `mask.tsx`, `use-hotkey.ts`, `row_context_menu.tsx`, `ui/dialog.tsx`·`ui/sheet.tsx`·`ui/alert-dialog.tsx`·`ui/period-picker.tsx`·`ui/date-picker.tsx`, `schemas/types.ts`(PageSchema·FieldSpec — **`note?: {rec,dat}` 확장됨**, RowFormModal이 라벨 옆 ⚠마커로 렌더), `schemas/renderers.tsx`(SchemaField·controlMinWidth).
3. 출처 목업 HTML **전체**(하단 `<script>`의 DATA·팝업 템플릿이 실제 명세). 브리프 값과 목업이 다르면 **목업이 정본**이고 보고서에 적어라.

## 2. 페이지 골격 규약 (apfs-grid)
- `GridFrame` 사용. `crumbs={['홈','투자자산관리','자펀드 관리','<메뉴 리프 라벨>']}`, `title="<메뉴 리프 라벨>"`(문자열 그대로, "○○ 목록" 금지), `favRoute="<path>"`, `headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}`. 컴포넌트 시그니처 `export function Xxx({ onNav }: { onNav?: (r: string) => void })`.
- **KPI 배지 행 미포함**(`kpis` prop 자체를 넘기지 않는다). `sub` 캡션 금지. 카드뷰·뷰 토글 금지. 명세 팝업은 브리프가 명시할 때만.
- 툴바 우측 순서: `[단위: 원 캡션(금액 있을 때)] [단위 SegTabs(토글 있을 때)] [상세필터 ghost 버튼(필터 있을 때)] [등록 있으면 RegisterCombo / 없으면 IconBtn refresh + MoreMenu kebab]`. 등록이 있으면 `RegisterCombo`(좌 등록 즉시실행 · 우 ⌄ 내보내기/인쇄) + 뒤에 `IconBtn refresh`, 독립 kebab 없음. `topMoreRef`는 **실제 렌더되는 쪽**(combo 래퍼 span 또는 kebab 래퍼 span)이 든다.
- 툴바 좌측: 브리프의 주 필터 `FilterChip`(전체 + 값들) + **적용 중 드로어 필터의 개별 칩**(값만, `×` 버튼 `aria-label="<항목> 필터 제거"`, 텍스트 값은 `<MT>`, 날짜/숫자는 `mn()`). 행 선택 워크플로우 페이지만 selbar 분기.
- 푸터: `footerLeft` = `'총 ' + mn(String(filtered.length)) + '개 중 ' + mn(String(shown)) + '개 항목 표시 중'` · `footerCenter` = `page.total > 1`일 때 페이저(`IconBtn chevron-left/right` + `PageBtn` 로컬 복사) · `footerRight` = `IconBtn download(엑셀)` · `IconBtn maximize(전체보기, active/pressed=showAll)` · `IconBtn external(새 창)` · `{!topMoreVisible && <MoreMenu size={32} onExport={exportExcel} />}`.
- 단축키: `useHotkey(HOTKEYS.print.combo, () => window.print())`, `useHotkey(HOTKEYS.export.combo, () => exportExcel())`, 등록 있으면 `useHotkey(HOTKEYS.register.combo, () => setModal({kind:'create'}), { enabled: modal === null })`.
- `IntersectionObserver` effect는 골드 그대로(미지원 가드 `setTopMoreVisible(false); return;`을 `if (!el) return`과 분리).

## 3. AG Grid 규약 (apfs-aggrid)
- `import './aggrid_shared.css';` 첫 줄. `theme={apfsTheme}` · `defaultColDef={DEFAULT_COL_DEF}` · `autoSizeStrategy={AUTO_SIZE_CONTENT}`(넓은 다열) 또는 컬럼 `flex:1,minWidth`(좁은 표, 그때는 autoSizeStrategy prop 없음) — **전부 `aggrid_theme.ts`의 export 상수**, 인라인 객체 리터럴 금지. `rowSelection`·`selectionColumnDef`·`columnDefs`는 모듈 상수 또는 안정 deps `useMemo`.
- `getRowId={(p) => p.data.id}` · `domLayout="autoHeight"` · `pagination paginationPageSize={pageSize} suppressPaginationPanel` (`PAGE_SIZE=20`, `showAll`이면 전체 행 수) · `onPaginationChanged`는 **값 비교 가드 setState**(골드 복사) · `overlayNoRowsTemplate` 한글 문구.
- 숫자: `valueFormatter`는 공유 `numFmt`/`fmt` 기반(`null → '-'`는 `nullFmt` 얇은 래퍼), `cellStyle: numStyle(strong)`, `type:'rightAligned'`. 텍스트 셀 `cellRenderer: <MT>{value}</MT>`(flex 셀은 `min-w-0 truncate` span). 날짜·순번 라벨은 `mn()`(단 순번 No는 축이라 비마스킹 `String(p.value)`). 헤더·배지·단위·축은 비마스킹. **`tooltipField`/`title`에 값 넣기 금지**(마스크 우회).
- 2단/3단 헤더: `ColGroupDef` + `children` + `marryChildren: true`(중첩 가능). `headerHeight`는 테마 40px×단수 자동. 행 높이 오버라이드 금지.
- pinned 합계행: `pinnedBottomRowData={useMemo(() => [computeTotal(filteredRows)], [filteredRows])}`(인라인 배열 금지). 합계행 셀 렌더러는 `p.node.rowPinned` 분기(텍스트 셀 null, No 셀 '합 계' 등). 합계 없는 금액(비율·잔액)은 `null → '-'`.
- 배지: `StatusBadge tone=… size="lg" dot={false}`. 톤은 `Record<…, Tone>` 맵. 음수 금액 텍스트는 `color: var(--danger-text)`.
- `cellStyle` 상수 타입은 `CellStyle`(ag-grid-community), React `CSSProperties` 아님.
- 셀 안 `<select>`: 골드 `SelectCell`(general_meeting_manage) 복사 — `aria-label="<컬럼명> N행"`, `fontFamily:'inherit'` + `fontSize:14`, `suppressKeyboardEvent: suppressFromSelect`, `onCellKeyDown` Enter → select focus.
- 셀 안 링크: 골드 `LinkCell`(general_meeting_manage) 복사 — `<button>` + `style={{font:'inherit',…}}` + `<MT>`; `onCellKeyDown` Enter로 같은 동작.
- 셀 안 버튼: `Button variant="outline" size="sm"` + 접근名 보강은 `<span className="sr-only">`(UI.Button은 aria-label 불가).
- 우클릭 메뉴(CRUD 페이지): `preventDefaultOnContextMenu` + `onCellContextMenu` + `RowContextMenu`(rowPinned 제외).
- 엑셀: SheetJS `XLSX.utils.aoa_to_sheet`, 헤더 병합은 `flattenForExcel(columnDefs)` 계열(다단이면 재귀로 깊이 N 지원), 숫자 셀은 숫자 + `z` 서식(`'#,##0'`/`'#,##0.0'`), **마스크 게이트 필수**: `const masked = useMask();` → 숫자 `masked ? 0 : v`, 텍스트 `masked ? '' : v`. 파일명 `<메뉴 리프 라벨>.xlsx`, `toast.success('Excel로 내보냈습니다')`. 화면 렌더 소스 배열 수 == 엑셀 직렬화 배열 수(화면=엑셀 불변식).

## 4. 상세필터 드로어 (apfs-detail-filter · apfs-datepicker)
- `Sheet side="right" hideClose className="w-[408px] max-w-[92vw]"` + 골드 헤더/푸터(초기화·필터 적용). 항목 = **목업 검색박스 순서 그대로**. 검색어 입력은 OFF(만들지 않는다).
- 컨트롤: 열거형 → `DrawerSelect`(첫 옵션 '전체'=''), 연도/월/일 → `PeriodPicker`(`DrawerField plain` + `ariaLabel` + `<div style={{ width:'fit-content', minWidth: controlMinWidth('date'|'year'|'select'), maxWidth:'100%' }}>` 래퍼), 칩 그룹(계정구분 등) → `DrawerSelect`로 표현. 네이티브 `<input type=date>`·연도 `<select>` 금지.
- 행 컬럼과 미연동인 항목은 state만 두고 `passes`에 넣지 않으며 `DrawerField noop`(캡션 `· 데이터 연동 후 적용`). 옵션이 원문에 없는 항목은 **옵션을 지어내지 않는다**(`options={[]}` + 마커).
- **목업 기본값(날짜 range 등)을 필터 초기값으로 적용하지 않는다**(`''` = 열린 경계). 날짜 비교는 `'YYYY-MM-DD'` 사전식.
- `passes` = `useCallback`, `useEffect(() => { apiRef.current?.onFilterChanged(); }, [passes])`, `isExternalFilterPresent`/`doesExternalFilterPass`. (그룹/소계 행이 있는 페이지는 브리프 지시대로 React 쪽 필터링.)
- 검토필요 마커: 드로어 라벨 `DrawerField note={…}`, 그리드 헤더 `headerComponentParams:{ innerHeaderComponent: <모듈 스코프 reviewInnerHeader(note)> }` + `suppressHeaderKeyboardEvent: (p) => p.event.key === 'Tab'`, 툴바/모달 라벨 옆은 `<ReviewMarker rec dat label />`. **문구는 목업 `data-rec`/`data-dat` 원문 그대로**(창작·합치기 금지). 마스킹·엑셀 대상 아님.

## 5. 모달 규약 (apfs-form-modal · apfs-spec-popup)
- 편집(flat ≤ 25필드): `RowFormModal({ mode, initial, schema, title, onSave, onClose, onDelete })` + `<domain>_manage_schemas.ts`(`parsePageSchema`로 모듈 스코프 검증, `columns` 대표 컬럼·`provenance` 필수, **`schemas/index.ts ALL`에 등록 금지**). create 저장 시 `id: crypto.randomUUID()` 직접 부여. `select/radio`는 첫 옵션 시드. 필드 라벨 옆 마커는 `note:{rec,dat}`.
- 섹션형/반복행/커스텀 컨트롤: Radix `Dialog` `max-w-[880px] max-h-[88vh]` + `onInteractOutside={(e)=>e.preventDefault()}`, `DialogHeader/DialogFooter className="px-[46px]"`, 본문 `overflow-y-auto p-[46px]`, 섹션 `<fieldset><legend className="w-full flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mb-3">`, 개별 컨트롤은 `SchemaField`(표 안은 `fill`), 표는 `tableLayout:'fixed'` + `overflow-x-auto` 래퍼 + `minWidth`.
- 읽기전용 상세: `subfund_spec_modal.tsx`/`general_meeting_detail_modal.tsx` 골격 복사 — 제목+대상명은 `<div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">` 래퍼, `DialogTitle` 크기 재지정 금지, `Section`(h3 `text-lg font-bold border-b-2 …`), `KvGrid`(dt 13px/dd 14px, `150px minmax(0,1fr)`), 값 없음 `-`, 텍스트 `<MT>`·금액 `mn()`, 단위 토글은 `UnitSeg`(SegTabs) + `money(won, unit)`. 푸터는 목업 버튼 구성 그대로.
- 삭제 확인: `ui/alert-dialog`(report_form_manage 복사), Action 스타일 `{ background:'var(--danger)', color:'var(--destructive-foreground)' }`.
- 모달 열림 상태 유니온 `type ModalState = null | {kind:…}` + 조건부 마운트(`open` prop 없음).

## 6. 스타일·접근성·코드 규약
- 색은 `var(--…)`/`color-mix` 토큰만. hex·`text-white` 금지. 배지 텍스트 색은 `-text` 토큰(StatusBadge 내장). 다크 양립.
- `preflight:false` 함정: `h1~h6/p/ul`엔 `margin:0`(또는 Tailwind `m-0`). 인라인 스타일에서 `font` 단축 속성 뒤에 `fontSize` 두지 말 것 — 패밀리는 `fontFamily:'inherit'`. 입력/셀렉트 14px.
- 클릭 요소는 `<button type="button">`, 아이콘 버튼은 `IconBtn label`. 모든 입력에 프로그램적 라벨. 동적 알림은 `toast`(sonner). 초점 링 제거 금지.
- 가로 나열 묶음 `flexWrap`, 수제 표는 `overflow-x-auto` + `minWidth`. AG Grid는 자체 스크롤.
- Immutability(setRows 함수형·spread), `console.log` 금지, 데이터는 목업 DATA **값 그대로**(창작 금지 — 없는 값은 `null`/`'-'`), 한국어 UI 문구. 컴포넌트 파일 800줄 이내(넘으면 모달을 별 파일로).
- 파일 상단 주석(골드 동형): `/* <메뉴 리프 라벨> — … 출처: <목업 파일명> → APFS 디자인시스템으로 변형. 구성(목업 → 우리 규약): … 한계·가정: … ⚠검토필요 마커 N건 이식 … */`. 비자명한 결정마다 이유 주석.

## 7. 자체 검증 (완료 보고 전 필수 — 출력 그대로 보고)
```bash
cd /Users/younghwankang/orca/workspaces/APFS/fund-admin-pages-batch
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"      # 반드시 0 (기준선 0)
for f in <산출 .tsx/.ts 파일들>; do npx esbuild "$f" --bundle --platform=browser --format=esm --jsx=automatic --outfile=/dev/null --loader:.css=empty --loader:.svg=dataurl --log-level=error && echo "OK $f"; done
npm test 2>&1 | tail -4                                          # 54+ passed
grep -nE '#[0-9A-Fa-f]{3,8}\b|text-white' <산출 파일들>            # 0건
```
런타임(브라우저) 검증은 코디네이터가 한다 — 너는 하지 않는다. 대신 코드로 §2~§6 체크리스트를 스스로 대조하고 미충족 항목을 보고서에 적어라.

## 8. 완료 보고 형식
1. 산출 파일 목록(경로·줄 수) 2. 구성 요약(목업 영역 → 구현) 3. 가정·한계·브리프와 다르게 한 점(이유) 4. §7 명령 출력 그대로 5. 남긴 공용 변경 요청(있으면). 원본 전체 덤프 금지.
