/* 개인정보 접속관리 — 조회 전용 페이지 (관리자 > 감사·기록 > 개인정보 접속관리, route privacy-access-log, 화면ID ADM-010).
   출처: 개인정보 접속관리.html(관리자 KRDS TO-BE, SFR-023-07) → APFS 디자인시스템. 골격은 같은 중분류 골드 audit_log.tsx.

   구성(목업 → 우리 규약):
   - 탭 [접근기록 | 통계] → risk_page_kit TabBar/TabPanel(WAI-ARIA 탭, 활성 패널만 마운트). 툴바·조회 조건은 두 탭 공통(목업 "두 탭 공통").
   - 조회 조건(개인정보 관련메뉴·기간·행위자·IP + [초기화][조회]) →
       툴바 칩 무리 없음 — 조건 4개 전부 상세필터 드로어(개인정보 관련메뉴 select · 기간 PeriodPicker day ×2 · 행위자 · IP), 적용 조건은 값 칩.
       (2026-11-02 사용자 결정: 메뉴마다 칩 1개씩 = 8칩은 과하다 → 주 필터 칩 삭제, 메뉴 조건은 드로어 select 로 옮김)
       드로어는 고르는 즉시 반영 — 같은 중분류 골드 audit_log 와 같다([필터 적용]은 닫기). 2026-11-02 초안(draft) 방식 폐기: 메뉴를 고르고
       X·Esc·바깥 클릭으로 닫으면 선택이 버려져 '메뉴 필터가 안 된다'로 보였다. 시작 > 종료면 기간 칸 빨간 테두리 + 아래 안내(목업 문구), 결과 0건.
       기간은 기본값(2026-09-28 ~ 2026-10-28 = 목업 defCond)으로 시작: 칩 × = 전 기간, 드로어 [초기화] = 기본값. 툴바 [조회] = 기본 조건 복원 + 토스트(관리자 골드와 같다).
   - 접근기록 그리드(No·일시·행위자·메뉴명·행위·IP, 일시 최신순, 목업 15건 페이지) → AG Grid 단일 헤더 + 페이지 20(프로젝트 상수) + 푸터 이전/다음·전체보기.
   - 통계(기간별 추이 일/주/월 · 메뉴별 접근 현황 · 사용자별 접근 현황) → privacy_access_stats.tsx(추이 = 선 차트, 나머지 = ReadGrid ×2). 집계는 조회 결과에서 파생(model).
   - 하단 [새 창][내보내기][인쇄] → 푸터 FooterActions(새 창 ⌥O 는 공용 부품에 이미 있다 · 내보내기 ⌥D · 인쇄 ⌘P). 내보내기 = 활성 탭(접근기록 1시트 / 통계 3시트).
   결정·가정:
   - 메뉴 select 는 목업 첫 조건이라 드로어 맨 위에 둔다. 통계 메뉴별 표도 이 값으로 좁혀진다. 행위 필터는 목업 조회 조건에 없어 넣지 않는다(넣으면 발명).
   - 목업의 "기간을 입력하세요"(기간 필수)는 이식하지 않았다 — 프로젝트의 '기본값으로 시작하는 기간' 규약(× = 전 기간)을 따른다. 전 기간이면 추이 표는 결과 행의 최소~최대 날짜로 버킷을 만든다.
   - IP 는 앞부분 일치(목업 스크립트 `indexOf===0`), 행위자는 대소문자 무시 부분일치(목업 그대로).
   - 메뉴명은 평문 — 목업의 메뉴명 링크는 다른 목업 파일로 가는 href 라 옮기지 않았다(행 상세·이동 없음). 행 선택·더블클릭 상세 없음(조회 전용, 목업에 없다).
   - 통계 탭의 KPI 박스(방문자수·페이지뷰)는 넣지 않는다(사용자 결정 — KPI 배지 행 미포함). 페이지뷰 총계는 메뉴별 표 합계 행, 방문자 수는 사용자별 표 행 수로 보인다.
   - 행위는 평문(목업도 평문 — 배지 톤을 새로 정하지 않는다). 목업 GNB/LNB·설계 메모·검토필요(!) 마커·RFP 경고는 옮기지 않는다.
   ⚠ 실제 접속 로그 수집이 아니다 — 데모 행을 로컬로 조회만 한다. */
import '../../aggrid_shared.css';
import { useState, useRef, useCallback, useMemo } from 'react';
import type { CSSProperties, MutableRefObject, ReactNode } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, NO_COL_ID, refreshNoColumn } from '../../aggrid_theme';
import { controlMinWidth, drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { DrawerSelect } from '../../drawer_select';   // 상세필터 select 공용본(audit_log 와 같은 부품)
import { PeriodPicker } from '../../ui/period-picker';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { TabBar, TabPanel } from '../../risk_page_kit';
import { exportTables } from '../../risk_excel';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { demoAccessRows, PRIVACY_MENUS, DEFAULT_PERIOD } from './privacy_access_data';
import type { AccessRow } from './privacy_access_data';
import { filterAccess, validatePeriod, buildStats, TREND_TABLE, MENU_TABLE, USER_TABLE, TREND_UNITS } from './privacy_access_model';
import type { AccessFilter, AccessStats, TrendUnit } from './privacy_access_model';
import type { AppliedFilter } from '../../applied_filters';
import { PrivacyAccessStats } from './privacy_access_stats';

const { Button, IconBtn } = UI;

const LABEL = '개인정보 접속관리';
const ROUTE = 'privacy-access-log';
const PAGE_SIZE = 20;
const DEMO: AccessRow[] = demoAccessRows();   // 정적 데모(조회 전용)

type Tab = 'list' | 'stats';
const TABS: { id: Tab; label: string }[] = [{ id: 'list', label: '접근기록' }, { id: 'stats', label: '통계' }];

/* 조건 4개(메뉴·기간·행위자·IP) 전부 드로어가 소유 — 고르는 즉시 반영. 툴바 칩 무리 없음 */
const DEFAULT_FILTER: AccessFilter = Object.freeze({ menu: '', ...DEFAULT_PERIOD, actor: '', ip: '' });
const MENU_OPTIONS = PRIVACY_MENUS.map((m) => ({ value: m.id, label: m.label }));
const menuLabel = (id: string) => PRIVACY_MENUS.find((m) => m.id === id)?.label ?? '';

/* ──────────────────────────────
   접근기록 그리드 — 수량형 열 없음(전부 좌측). No 는 표시 순번(정렬 후에도 1부터)
────────────────────────────── */
const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' };
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;

const columnDefs: ColDef<AccessRow>[] = [
  { colId: NO_COL_ID, headerName: 'No', width: 64, maxWidth: 64, cellStyle: tabNum, sortable: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
  { field: 'ts', headerName: '일시', width: 176, maxWidth: 176, cellStyle: tabNum, sort: 'desc' },
  { field: 'actor', headerName: '행위자', width: 220, minWidth: 200, maxWidth: 280, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'menu', headerName: '메뉴명', flex: 1, width: 180, minWidth: 160, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'act', headerName: '행위', width: 104, maxWidth: 110, cellStyle: flexCenter },
  { field: 'ip', headerName: 'IP', width: 136, maxWidth: 150, cellStyle: muted },
];
const NO_ROWS = '<span>조회 조건에 해당하는 접속기록이 없습니다.</span>';

type XCol = { header: string; get: (r: AccessRow) => string; wch: number };
const EXPORT_COLS: XCol[] = [
  { header: '일시', get: (r) => r.ts, wch: 20 }, { header: '행위자', get: (r) => r.actor, wch: 28 },
  { header: '메뉴명', get: (r) => r.menu, wch: 20 }, { header: '행위', get: (r) => r.act, wch: 10 }, { header: 'IP', get: (r) => r.ip, wch: 16 },
];

function exportList(rows: readonly AccessRow[]) {
  const ws = XLSX.utils.aoa_to_sheet([EXPORT_COLS.map((c) => c.header), ...rows.map((r) => EXPORT_COLS.map((c) => c.get(r)))]);
  ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.wch }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '접근기록');
  XLSX.writeFile(wb, `${LABEL}_접근기록.xlsx`);
}

function exportStats(stats: AccessStats, unit: TrendUnit) {
  const unitLabel = TREND_UNITS.find((u) => u.value === unit)?.label ?? '';
  exportTables(`${LABEL}_통계`, [
    { name: `${TREND_TABLE.title!}(${unitLabel})`, table: TREND_TABLE, rows: stats.trend },
    { name: MENU_TABLE.title!, table: MENU_TABLE, rows: stats.menu },
    { name: USER_TABLE.title!, table: USER_TABLE, rows: stats.user },
  ], null);
}

function AccessGrid({ rows, pageSize, apiRef, onPage }: {
  rows: AccessRow[]; pageSize: number; apiRef: MutableRefObject<GridApi<AccessRow> | null>; onPage: () => void;
}) {
  const onGridReady = useCallback((e: GridReadyEvent<AccessRow>) => { apiRef.current = e.api; }, [apiRef]);
  return (
    <AgGridReact<AccessRow>
      theme={apfsTheme}
      rowData={rows}
      columnDefs={columnDefs}
      getRowId={(p) => p.data.id}
      domLayout="autoHeight"
      defaultColDef={DEFAULT_COL_DEF}
      pagination paginationPageSize={pageSize} suppressPaginationPanel
      onGridReady={onGridReady}
      onPaginationChanged={onPage}
      onModelUpdated={refreshNoColumn}
      overlayNoRowsTemplate={NO_ROWS}
    />
  );
}

/* ──────────────────────────────
   상세필터 드로어 — 개인정보 관련메뉴·기간·행위자·IP. 바꾸는 즉시 applied 에 반영([필터 적용] = 닫기, [초기화] = 기본 조건)
────────────────────────────── */
function DrawerField({ label, children, plain }: { label: string; children: ReactNode; plain?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </Wrap>
  );
}
const dayWrap: CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };

const errText: CSSProperties = { fontSize: 12.5, color: 'var(--danger-text)', margin: '6px 0 0' };

function FilterSheet({ open, onOpenChange, value, onPatch, onReset }: {
  open: boolean; onOpenChange: (o: boolean) => void; value: AccessFilter; onPatch: (p: Partial<AccessFilter>) => void; onReset: () => void;
}) {
  const setD = (k: keyof AccessFilter) => (v: string) => onPatch({ [k]: v });
  const periodErr = validatePeriod(value.from, value.to);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
        <SheetHeader>
          <SheetTitle>상세 필터</SheetTitle>
          <SheetDescription className="sr-only">개인정보 접근기록을 거르는 상세 필터</SheetDescription>
          <IconBtn icon="x" onClick={() => onOpenChange(false)} label="닫기" size={38} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
          <DrawerField label="개인정보 관련메뉴">
            <DrawerSelect value={value.menu} onChange={setD('menu')} options={MENU_OPTIONS} />
          </DrawerField>
          <DrawerField label="기간" plain>
            <div className="flex items-center gap-2 flex-wrap">
              <div style={dayWrap}><PeriodPicker mode="day" value={value.from} onChange={(v) => setD('from')(v || '')} ariaLabel="기간 시작일" invalid={!!periodErr} /></div>
              <span className="text-caption">~</span>
              <div style={dayWrap}><PeriodPicker mode="day" value={value.to} onChange={(v) => setD('to')(v || '')} ariaLabel="기간 종료일" invalid={!!periodErr} /></div>
            </div>
            {periodErr && <p role="alert" style={errText}>{periodErr}</p>}
          </DrawerField>
          <DrawerField label="행위자">
            <input type="text" value={value.actor} onChange={(e) => setD('actor')(e.target.value)} placeholder="로그인 아이디" style={inputStyle('text')} />
          </DrawerField>
          <DrawerField label="IP">
            <input type="text" value={value.ip} onChange={(e) => setD('ip')(e.target.value)} placeholder="예: 10.0.1" style={inputStyle('text')} />
          </DrawerField>
        </div>
        <SheetFooter>
          <Button variant="outline" size="md" onClick={onReset}>초기화</Button>
          <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => onOpenChange(false)}>필터 적용</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* 조회 조건 — applied = 드로어·적용 칩·목록·통계의 SSOT(초안 사본 없음 — 바꾸는 즉시 반영) */
function useAccessFilter() {
  const [applied, setApplied] = useState<AccessFilter>(DEFAULT_FILTER);
  const [open, setOpen] = useState(false);
  const patch = (p: Partial<AccessFilter>) => setApplied((a) => ({ ...a, ...p }));
  const reset = () => setApplied(DEFAULT_FILTER);
  return { applied, open, setOpen, patch, reset };
}

/* 적용 조건 칩(값만, × 개별 해제) — 드로어 순서 그대로 */
function appliedChips(a: AccessFilter, patch: (p: Partial<AccessFilter>) => void): AppliedFilter[] {
  return [
    { label: '개인정보 관련메뉴', value: menuLabel(a.menu), onClear: () => patch({ menu: '' }) },
    { label: '기간', value: a.from || a.to ? `${a.from || '…'} ~ ${a.to || '…'}` : '', onClear: () => patch({ from: '', to: '' }) },
    { label: '행위자', value: a.actor.trim(), onClear: () => patch({ actor: '' }) },
    { label: 'IP', value: a.ip.trim(), onClear: () => patch({ ip: '' }) },
  ];
}
/* 통계 탭 푸터 — 건수는 푸터에만(apfs-multi-grid: `표제목 N건 · …`) */
const statsFooter = (s: AccessStats) =>
  `${TREND_TABLE.title!} ${String(s.trend.length)}구간 · ${MENU_TABLE.title!} ${String(s.menu.length)}건 · ${USER_TABLE.title!} ${String(s.user.length)}건`;

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function PrivacyAccessLog({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<AccessRow> | null>(null);
  const [tab, setTab] = useState<Tab>('list');
  const [unit, setUnit] = useState<TrendUnit>('d');
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const f = useAccessFilter();
  const { applied } = f;

  const visible = useMemo(() => filterAccess(DEMO, applied), [applied]);
  const stats = useMemo(() => buildStats(visible, applied, unit), [visible, applied, unit]);

  const exportExcel = () => {
    if (tab === 'list') exportList(visible); else exportStats(stats, unit);
    toast.success('Excel로 내보냈습니다');
  };
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: !f.open, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !f.open, skipInDialog: true });

  const onPage = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));   // 값 비교 가드(렌더 루프 방지)
  }, []);
  const refresh = () => { f.reset(); toast.success('조회되었습니다'); };

  const pageSize = showAll ? Math.max(visible.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize), visible.length);
  const footerText = tab === 'list'
    ? `총 ${String(DEMO.length)}건 중 ${String(visible.length)}건 · ${String(shown)}건 표시 중`
    : statsFooter(stats);

  return (
    <GridFrame
      crumbs={['홈', '관리자', '감사·기록', LABEL]}
      title={LABEL}
      favRoute={ROUTE}
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={appliedChips(applied, f.patch)}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => f.setOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{footerText}</span>}
      footerCenter={tab === 'list' && page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={tab === 'list' ? () => setShowAll((v) => !v) : undefined} />}>

      <TabBar tabs={TABS} value={tab} onChange={(id) => setTab(id as Tab)} idBase="privacy" label={LABEL} />
      <TabPanel idBase="privacy" value={tab}>
        {tab === 'list'
          ? <div><AccessGrid rows={visible} pageSize={pageSize} apiRef={apiRef} onPage={onPage} /></div>
          : <PrivacyAccessStats stats={stats} unit={unit} onUnit={setUnit} />}
      </TabPanel>

      <FilterSheet open={f.open} onOpenChange={f.setOpen} value={applied} onPatch={f.patch} onReset={f.reset} />
    </GridFrame>
  );
}
