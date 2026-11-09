/* 계정별보조부 — 조회 전용 원장 화면 (회계 > 장부조회 > 계정별보조부, route acct-subledger, 화면ID ACC-010, 설계서 slide 9~17).
   출처: ACC-010 화면설계서 → APFS 디자인시스템(ACC-004 deleted_journal_manage 골격).

   구성(설계서 → 우리 규약):
   - 툴바: [상세필터](E01) → 조회(E02, 항상 맨 끝 · 토스트 "조회되었습니다"). 등록·선택 체크박스·선택 바 없음(조회 전용).
   - 그리드 17열(slide 10): 작성자·전표일·순번·분개번호·적요·코드·계정과목·거래처·차변금액·대변금액·잔액·계좌번호·손익부서·손익사원·
       전표번호·최초등록자·최종수정자. 계정마다 첫 행 [전잔](기간 시작일 이전 누계) → 명세(누적 잔액) → [소계](명세 합 · 마지막 잔액).
       금액 3열만 우측, 나머지 좌측. 누적잔액 순서를 지키려고 헤더 정렬은 끈다. 계산은 공용 ledger_model.subledger(화면 매핑은 subledger_model).
   - 상세필터 드로어 8개(slide 11 ②): 계정구분(셀렉트 — 검색창은 옵션 10개 이상일 때 자동, searchable 미지정 2026-11-03) · 기간(시작~종료) · 작성계정과목만(기본 여) · 미결재포함(기본 부) ·
       작성자 · 계정과목 · 거래처 · 적요(모두 텍스트 부분일치 — 설계서 정의대로 [검색] 팝업 없음, 2026-11-04 사용자 결정). 즉시 반영 — 고르는·타이핑하는 즉시 applied 반영, [필터 적용] = 닫기.
       기간 시작 > 종료 = 기간 칸 빨간 테두리 + 아래 안내, 결과 0건(2026-11-03 사용자 지시, 정본 privacy_access_log).
       [초기화] = 기본값 복원. 적용 조건 = 칩(값만, × 개별 해제 — 여/부 플래그는 기본값과 다를 때만 ×).
       적용 범위(slide 11 ③): 작성자·거래처·적요는 명세 행만 거르고 전잔은 그대로(subledger_model.test 고정).
   - 행 더블클릭 / Enter(E03) = 전표상세(ACC-003 JournalEntryScreen readOnly — [닫기]만). [전잔]·[소계] 행 무반응.
   - 푸터 = FooterActions: 전체보기 · 새 창(E04, 현재 route 새 탭) · 내보내기(E05, SheetJS · 금액 숫자 셀 · 토스트) · 인쇄.

   결정·가정(PM 확인 필요):
   - 설계서 하단 도구는 [새 창]·[내보내기] 2개지만 푸터 4종 상시 노출 규약(2026-09-17)으로 전체보기·인쇄(그리드 인쇄, ⌘P)도 둔다.
   - 작성계정과목만·미결재포함 = FlagCheck(체크박스 — 설계서대로, 2026-11-03 사용자 지시).
   - 결산전표포함은 이 화면 조건에 없어(③ 표에만 등장) 전부 포함으로 고정.
   - [소계]는 계정마다 항상 표시(설계서 "필요 시" 조건 미정).
   - 권한 기반 노출([내보내기] = 인쇄·다운로드 권한)은 RBAC 미구현이라 항상 노출. */
import '../../aggrid_shared.css';
import { useState, useRef, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, CellKeyDownEvent, RowDoubleClickedEvent, CellStyle, RowClassRules } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, numFmt, numStyle } from '../../aggrid_theme';
import { drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import { DrawerSelect } from '../../drawer_select';
import { FUND_ACCOUNTS } from '../slip/general_journal_data';
import { JournalEntryScreen } from '../slip/journal_entry_screen';   // 전표상세 = ACC-003 전표 화면 readOnly
import type { EntryState } from '../slip/general_journal_model';
import { demoLedger, todayStr } from './ledger_data';
import { MSG } from './ledger_model';
import type { SubledgerRow } from './ledger_model';
import { entryOf } from './ledger_journal_view';
import { DrawerField, DayRangeField, FlagCheck } from '../ledger_filter_ui';
import { SUBLEDGER_DEFAULT, subledgerRows, slipNoOf, validateFilter } from './subledger_model';
import type { SubledgerFilter } from './subledger_model';

const { Button, IconBtn } = UI;

const PAGE_SIZE = 20;
const COL_DEF: ColDef = { ...DEFAULT_COL_DEF, sortable: false };   // 누적잔액 순서 — 헤더 정렬 끔
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const tabular: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };
/* display:flex 셀은 기본 말줄임이 안 걸린다 → truncate span */
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const ROW_CLASS: RowClassRules<SubledgerRow> = { 'font-semibold': (p) => p.data?.kind !== 'entry' };
type LineKey = keyof NonNullable<SubledgerRow['line']>;
const lv = (k: LineKey) => (p: { data?: SubledgerRow }) => (p.data?.line ? p.data.line[k] : '');

/* 설계서 slide 10 순서. 순번·분개번호·코드·전표번호는 수량이 아니라 좌측 */
const COLUMNS: ColDef<SubledgerRow>[] = [
  { colId: 'writer', headerName: '작성자', valueGetter: lv('writer'), width: 88, cellStyle: flexCenter },
  { colId: 'slipDate', headerName: '전표일', valueGetter: lv('slipDate'), width: 106, cellStyle: tabular },
  { colId: 'seq', headerName: '순번', valueGetter: lv('seq'), width: 72, cellStyle: tabular },
  { colId: 'lineNo', headerName: '분개번호', valueGetter: lv('lineNo'), width: 84, cellStyle: tabular },
  { colId: 'memo', headerName: '적요', valueGetter: lv('memo'), flex: 1, minWidth: 180, width: 180, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'code', headerName: '코드', width: 92, cellStyle: tabular },
  { field: 'accountName', headerName: '계정과목', width: 160, cellStyle: flexCenter, cellRenderer: textCell },
  { colId: 'partner', headerName: '거래처', valueGetter: lv('partner'), width: 140, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'debit', headerName: '차변금액', width: 128, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any },
  { field: 'credit', headerName: '대변금액', width: 128, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any },
  { field: 'balance', headerName: '잔액', width: 140, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any },
  { colId: 'accountNo', headerName: '계좌번호', valueGetter: lv('accountNo'), width: 140, cellStyle: tabular, cellRenderer: textCell },
  { colId: 'plDept', headerName: '손익부서', valueGetter: lv('plDept'), width: 104, cellStyle: flexCenter, cellRenderer: textCell },
  { colId: 'plEmployee', headerName: '손익사원', valueGetter: lv('plEmployee'), width: 96, cellStyle: flexCenter },
  { colId: 'slipNo', headerName: '전표번호', valueGetter: lv('slipNo'), width: 130, cellStyle: tabular },
  { colId: 'createdBy', headerName: '최초등록자', valueGetter: lv('createdBy'), width: 104, cellStyle: muted },
  { colId: 'updatedBy', headerName: '최종수정자', valueGetter: lv('updatedBy'), width: 104, cellStyle: muted },
];

/* 엑셀 = 화면 17열 그대로(원시자료). 금액 3열은 숫자 셀 */
const NUM_COLS = new Set(['debit', 'credit', 'balance']);
const cellOf = (r: SubledgerRow, id: string): string | number => {
  if (id === 'code') return r.code;
  if (id === 'accountName') return r.accountName;
  if (NUM_COLS.has(id)) return r[id as 'debit' | 'credit' | 'balance'];
  const v = r.line ? r.line[id as LineKey] : '';
  return v == null ? '' : String(v);
};

export function SubledgerManage({ onNav }: { onNav?: (r: string) => void }) {
  const src = useMemo(() => demoLedger(todayStr()), []);
  const apiRef = useRef<GridApi<SubledgerRow> | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [view, setView] = useState<EntryState | null>(null);

  /* 상세필터 — applied = 드로어·칩·목록의 SSOT(초안 사본 없음 — 바꾸는 즉시 반영) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [applied, setApplied] = useState<SubledgerFilter>(SUBLEDGER_DEFAULT);
  const clearApplied = (patch: Partial<SubledgerFilter>) => setApplied((a) => ({ ...a, ...patch }));
  const setD = <K extends keyof SubledgerFilter>(k: K) => (v: SubledgerFilter[K]) => clearApplied({ [k]: v } as Partial<SubledgerFilter>);
  /* 기간 순서 검증 — 렌더마다 applied 로. 실패면 기간 칸 표시 + 결과 0건 */
  const periodErr = validateFilter(applied) ?? undefined;

  /* 인쇄·내보내기 — 드로어·전표상세가 열려 있지 않을 때만 */
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: !filterOpen && view === null, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !filterOpen && view === null, skipInDialog: true });

  /* E00 — 기본 조건(필터 없음) 전체 조회 */
  const rows = useMemo(() => (periodErr ? [] : subledgerRows(src.lines, applied)), [periodErr, src, applied]);
  const entryCount = useMemo(() => rows.filter((r) => r.kind === 'entry').length, [rows]);

  const onGridReady = useCallback((e: GridReadyEvent<SubledgerRow>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);

  /* E03 — 명세 행만 전표상세. [전잔]·[소계] 무반응 */
  const openSlip = useCallback((r: SubledgerRow | undefined) => {
    const no = slipNoOf(r);
    if (!no) return;
    const e = entryOf(src, no);
    if (e) setView(e); else toast.error('전표를 찾을 수 없습니다.');
  }, [src]);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<SubledgerRow>) => { if (!e.rowPinned) openSlip(e.data); }, [openSlip]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<SubledgerRow>) => {
    if ((e.event as KeyboardEvent | null)?.key === 'Enter' && !e.rowPinned) openSlip(e.data);
  }, [openSlip]);

  /* E02 — 현재 조건으로 재조회(백엔드 없음 — 조건 유지) */
  const refresh = () => { if (periodErr) { toast.error(periodErr); return; } toast.success('조회되었습니다'); };

  /* E05 — Excel. 금액은 숫자 셀(t:'n' + 천단위)이라 Excel 에서도 우측 */
  const exportExcel = () => {
    if (periodErr) { toast.error(periodErr); return; } // 검증 실패 = 0건 — 헤더만 있는 파일을 받지 않게
    const ids = COLUMNS.map((c) => (c.colId ?? c.field) as string);
    const head = COLUMNS.map((c) => c.headerName as string);
    const body = rows.map((r) => ids.map((id) => cellOf(r, id)));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ids.forEach((id, ci) => {
      if (!NUM_COLS.has(id)) return;
      body.forEach((_, ri) => { const c = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })]; if (c) { c.t = 'n'; c.z = '#,##0'; } });
    });
    ws['!cols'] = head.map((h) => ({ wch: h === '적요' || h === '계정과목' || h === '거래처' ? 24 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '계정별보조부');
    XLSX.writeFile(wb, '계정별보조부.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const D = SUBLEDGER_DEFAULT;
  const chips = [
    { label: '계정구분', value: applied.fundAccount, onClear: () => clearApplied({ fundAccount: '' }) },
    { label: '기간', value: applied.from || applied.to ? `${applied.from || '…'} ~ ${applied.to || '…'}` : '', onClear: () => clearApplied({ from: '', to: '' }) },
    /* 여/부 플래그 = 기본값이면 칩 없음(초기 진입 = 칩 없음) · 바꿔 적용했을 때만 표시 · × = 기본값 복원 — 공용 flagChips 와 같은 규약(2026-11-02 사용자 지시) */
    ...(applied.writtenOnly !== D.writtenOnly ? [{ label: '작성계정과목만', value: applied.writtenOnly ? '작성계정과목만' : '전체 계정과목', onClear: () => clearApplied({ writtenOnly: D.writtenOnly }) }] : []),
    ...(applied.includeUnapproved !== D.includeUnapproved ? [{ label: '미결재포함', value: applied.includeUnapproved ? '미결재 포함' : '미결재 제외', onClear: () => clearApplied({ includeUnapproved: D.includeUnapproved }) }] : []),
    { label: '작성자', value: applied.writer.trim(), onClear: () => clearApplied({ writer: '' }) },
    { label: '계정과목', value: applied.account.trim(), onClear: () => clearApplied({ account: '' }) },
    { label: '거래처', value: applied.partner.trim(), onClear: () => clearApplied({ partner: '' }) },
    { label: '적요', value: applied.memo.trim(), onClear: () => clearApplied({ memo: '' }) },
  ].filter((c) => c.value);
  const textField = (k: 'writer' | 'account' | 'partner' | 'memo', label: string, ph: string) => (
    <DrawerField label={label}>
      <input type="text" value={applied[k]} onChange={(e) => setD(k)(e.target.value)} placeholder={ph} style={inputStyle('text')} />
    </DrawerField>
  );

  return (
    <GridFrame
      crumbs={['홈', '회계', '장부조회', '계정별보조부']}
      title="계정별보조부"
      favRoute="acct-subledger"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={chips}
      toolbarRight={<>
        <span className="text-caption" style={{ fontSize: 12 }}>단위: 원</span>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{'총 ' + String(rows.length) + '개 중 ' + String(shown) + '개 항목 표시 중 · 명세 ' + String(entryCount) + '건'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          <span className="tabular-nums" style={{ fontSize: 13 }}>{String(page.current + 1) + ' / ' + String(page.total)}</span>
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<SubledgerRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={COLUMNS}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={COL_DEF}
          rowClassRules={ROW_CLASS}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={MSG.empty}
        />
      </div>

      {/* ── 상세필터 드로어(E01) — 설계서 8개 조건. 바꾸는 즉시 applied 반영([필터 적용] = 닫기) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">계정별보조부를 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="계정구분"><DrawerSelect value={applied.fundAccount} onChange={setD('fundAccount')} options={[...FUND_ACCOUNTS]} ariaLabel="계정구분" /></DrawerField>
            <DayRangeField label="기간" from={applied.from} to={applied.to} onFrom={setD('from')} onTo={setD('to')} errMsg={periodErr} />
            <FlagCheck label="작성계정과목만" value={applied.writtenOnly} onChange={setD('writtenOnly')} />
            <FlagCheck label="미결재포함" value={applied.includeUnapproved} onChange={setD('includeUnapproved')} />
            {textField('writer', '작성자', '작성자')}
            {textField('account', '계정과목', '계정코드 또는 계정과목명')}
            {textField('partner', '거래처', '거래처')}
            {textField('memo', '적요', '적요')}
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => setApplied(SUBLEDGER_DEFAULT)}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* E03 전표상세(조회 전용 · [닫기]만) */}
      {view && <JournalEntryScreen entry={view} readOnly hideGridTools onSave={(j) => j} onClose={() => setView(null)} />}
    </GridFrame>
  );
}
