/* 감사로그 — 조회 전용 리스트 페이지 (관리자 > 감사·기록 > 감사로그, route audit-log).
   출처: S0_104_감사로그.html(AFIT 공통관리 KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(기간·결과·행위자·검색어) → 주 필터 1개 = 결과 FilterChip(툴바 좌) + 상세필터 드로어(검색어·기간(PeriodPicker day ×2)·유형·행위자).
       유형(접속·계정·권한변경·비정상 접근)은 브리프의 "접속·권한변경·비정상 접근 행" 구분 — 행위 문자열에서 파생(audit_log_model.kindOf).
   - 그리드(No·일시·행위자·유형·행위·대상·IP·결과) → AG Grid 단일 헤더, 결과 배지(정상 success·실패 warning·차단 danger).
   - 행 상세(브리프) → 라디오 단일선택 + [상세] · 더블클릭/Enter → 읽기 전용 kv 다이얼로그. 목업은 선택 없음이었으나 상세 요구로 추가.
   - 등록 없음 → 툴바 kebab 단독. 엑셀·인쇄 = kebab + 푸터 download + ⌥D(목업 '엑셀 다운로드'·'인쇄'는 반출 통제 문구만 — 실제 통제 없음).
   - KPI 배지 행 미포함(사용자 확정) · 카드뷰 없음.
   ⚠ 실제 접근 로그·보안 이벤트·정책 판정이 아니다 — 데모 행을 로컬로 조회만 한다(브리프). 실명 아님. */
import './aggrid_shared.css';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF } from './aggrid_theme';
import { controlMinWidth } from './schemas/renderers';
import { PeriodPicker } from './ui/period-picker';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent, CellStyle, RowSelectionOptions } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { RowContextMenu } from './row_context_menu';
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { demoLogs, filterLogs, resultCounts, AUDIT_RESULTS, AUDIT_KINDS, RESULT_TONE, KIND_TONE, DEMO_RANGE } from './audit_log_model';
import type { AuditRow, AuditResult, AuditKind } from './audit_log_model';

const { Button, IconBtn, StatusBadge, FilterChip } = UI;

const SEARCHABLE = true;
const DEMO: AuditRow[] = demoLogs();   // 정적 데모(조회 전용)

const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };

const columnDefs: ColDef<AuditRow>[] = [
  { headerName: 'No', width: 60, maxWidth: 60, cellStyle: centerNum, sortable: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
  { field: 'ts', headerName: '일시', width: 170, maxWidth: 170, cellStyle: centerNum, sort: 'desc', valueFormatter: (p) => mn(p.value) },
  { field: 'actor', headerName: '행위자', width: 120, maxWidth: 140, cellStyle: { ...flexCenter, fontVariantNumeric: 'tabular-nums' }, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'kind', headerName: '유형', width: 110, maxWidth: 120, cellStyle: flexMid, cellRenderer: (p: any) => <StatusBadge tone={KIND_TONE[p.value as AuditKind]} label={p.value} size="md" dot={false} /> },
  { field: 'action', headerName: '행위', width: 200, minWidth: 150, maxWidth: 260, cellStyle: flexCenter, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'target', headerName: '대상', width: 240, minWidth: 180, maxWidth: 320, cellStyle: flexCenter, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'ip', headerName: 'IP', width: 122, maxWidth: 122, cellStyle: { ...muted, fontVariantNumeric: 'tabular-nums' }, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'result', headerName: '결과', width: 92, maxWidth: 92, cellStyle: flexMid, cellRenderer: (p: any) => <StatusBadge tone={RESULT_TONE[p.value as AuditResult]} label={p.value} size="lg" dot={false} /> },
];
const ROW_SELECTION: RowSelectionOptions<AuditRow> = { mode: 'singleRow', checkboxes: true, enableClickSelection: true };
const SELECTION_COL = { pinned: 'left' as const, width: 44 };
const RESULT_CHIPS = ['', ...AUDIT_RESULTS] as const;

type XCol = { header: string; get: (r: AuditRow) => string };
const EXPORT_COLS: XCol[] = [
  { header: '일시', get: (r) => r.ts }, { header: '행위자', get: (r) => r.actor }, { header: '유형', get: (r) => r.kind },
  { header: '행위', get: (r) => r.action }, { header: '대상', get: (r) => r.target }, { header: 'IP', get: (r) => r.ip }, { header: '결과', get: (r) => r.result },
];

const inputStyle = (kind?: string): CSSProperties => ({
  width: 'fit-content', minWidth: controlMinWidth(kind), maxWidth: '100%', boxSizing: 'border-box', padding: '9px 11px', font: 'inherit', fontSize: 14,
  border: '1px solid var(--input)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)',
});
function DrawerField({ label, children, plain }: { label: string; children: React.ReactNode; plain?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </Wrap>
  );
}
function DrawerSelect({ value, onChange, options, all = '전체' }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; all?: string | null }) {
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        {all != null && <option value="">{all}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}
const dayWrap: CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };

function MoreMenuItems({ onExport }: { onExport: () => void }) {
  return (
    <>
      <DropdownMenuItem onSelect={onExport}>
        <Icon name="download" size={17} className="shrink-0 text-muted-foreground" />내보내기 (Excel)
        <DropdownMenuShortcut>{HOTKEYS.export.hint}</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => window.print()}>
        <Icon name="file" size={17} className="shrink-0 text-muted-foreground" />인쇄
        <DropdownMenuShortcut>{HOTKEYS.print.hint}</DropdownMenuShortcut>
      </DropdownMenuItem>
    </>
  );
}
function MoreMenu({ onExport, size = 34 }: { onExport: () => void; size?: number }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <DropdownMenuTrigger aria-label="더보기"
              className="inline-flex items-center justify-center rounded-card-sm bg-transparent border-0 text-muted-foreground transition-colors hover:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
              style={{ width: size, height: size }}>
              <Icon name="more" size={20} stroke={2} />
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>더보기</TooltipContent>
      </Tooltip>
      <DropdownMenuContent><MoreMenuItems onExport={onExport} /></DropdownMenuContent>
    </DropdownMenu>
  );
}

/* 행 상세 — 읽기 전용 kv(한글 가로 배열 규약) */
function AuditDetailModal({ row, onClose }: { row: AuditRow; onClose: () => void }) {
  const items: [string, React.ReactNode][] = [
    ['일시', <MT>{row.ts}</MT>], ['행위자', <MT>{row.actor}</MT>], ['유형', <StatusBadge tone={KIND_TONE[row.kind]} label={row.kind} size="md" dot={false} />],
    ['행위', <MT>{row.action}</MT>], ['대상', <MT>{row.target}</MT>], ['IP', <MT>{row.ip}</MT>], ['결과', <StatusBadge tone={RESULT_TONE[row.result]} label={row.result} size="md" dot={false} />],
  ];
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[560px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">감사로그 상세</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0"><MT>{row.action}</MT></DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <dl className="grid m-0 border border-border rounded-[8px] overflow-hidden" style={{ gridTemplateColumns: '110px minmax(0,1fr)', fontSize: 13 }}>
            {items.map(([l, v]) => (
              <div key={l} className="contents">
                <dt className="bg-muted font-bold text-muted-foreground m-0" style={{ padding: '8px 12px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{l}</dt>
                <dd className="m-0 min-w-0" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-caption m-0 mt-3" style={{ fontSize: 12, lineHeight: 1.5 }}>조회 전용 데모 행입니다 — 실제 보안 이벤트 여부·후속 조치(관제 연계·계정 잠금)는 이 화면이 판정하지 않습니다.</p>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function AuditLog({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<AuditRow> | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const [ctx, setCtx] = useState<CtxMenuState>(null);
  const masked = useMask();

  const [filterOpen, setFilterOpen] = useState(false);
  const [fResult, setFResult] = useState<typeof RESULT_CHIPS[number]>('');
  const [fFrom, setFFrom] = useState<string>(DEMO_RANGE[0]);
  const [fTo, setFTo] = useState<string>(DEMO_RANGE[1]);
  const [fKind, setFKind] = useState('');
  const [fActor, setFActor] = useState('');
  const [fText, setFText] = useState('');
  const clearFilters = () => { setFResult(''); setFFrom(DEMO_RANGE[0]); setFTo(DEMO_RANGE[1]); setFKind(''); setFActor(''); setFText(''); };

  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setTopMoreVisible(false); return; }
    const el = topMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTopMoreVisible(e.isIntersecting), { root: null, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const visible = useMemo(() => filterLogs(DEMO, { from: fFrom, to: fTo, result: fResult, kind: fKind, actor: fActor, kw: fText }), [fFrom, fTo, fResult, fKind, fActor, fText]);
  const counts = useMemo(() => resultCounts(visible), [visible]);

  const onGridReady = useCallback((e: GridReadyEvent<AuditRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<AuditRow>) => { setSelId(e.api.getSelectedRows()[0]?.id ?? null); }, []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<AuditRow>) => { if (e.data && !e.rowPinned) setDetailId(e.data.id); }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<AuditRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    setDetailId(e.data.id);
  }, []);
  const handleCellContextMenu = (e: CellContextMenuEvent<AuditRow>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [
      { label: '상세', icon: 'eye', onSelect: () => setDetailId(row.id) },
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  const selected = selId ? visible.find((r) => r.id === selId) ?? null : null;
  const detail = detailId ? DEMO.find((r) => r.id === detailId) ?? null : null;
  const refresh = () => { apiRef.current?.deselectAll(); clearFilters(); toast.success('새로고침했습니다'); };

  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => (masked ? '' : c.get(r))));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '대상' || c.header === '행위' ? 30 : 16 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '감사로그');
    XLSX.writeFile(wb, '감사로그.xlsx');
    toast.success('Excel로 내보냈습니다 — 다운로드 행위도 감사로그에 기록됩니다 (목업)');
  };

  const chips: [string, string, () => void][] = [
    ['기간', fFrom || fTo ? `${fFrom || '…'} ~ ${fTo || '…'}` : '', () => { setFFrom(''); setFTo(''); }],
    ['유형', fKind, () => setFKind('')],
    ['행위자', fActor.trim(), () => setFActor('')],
    ['검색어', fText.trim(), () => setFText('')],
  ];

  return (
    <GridFrame
      crumbs={['홈', '관리자', '감사·기록', '감사로그']}
      title="감사로그"
      favRoute="audit-log"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={selected ? (
        <>
          <StatusBadge tone={RESULT_TONE[selected.result]} label={selected.result} size="lg" dot={false} />
          <Button variant="primary" size="sm" leadingIcon="eye" onClick={() => setDetailId(selected.id)}>상세</Button>
          <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
        </>
      ) : (
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {RESULT_CHIPS.map((r) => <FilterChip key={r || 'all'} active={fResult === r} onClick={() => setFResult(r)}>{r || '전체'}</FilterChip>)}
          {chips.filter(([, v]) => v).map(([label, value, clear]) => (
            <span key={label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              <MT>{value}</MT>
              <button type="button" onClick={clear} aria-label={label + ' 필터 제거'} className="inline-flex items-center justify-center border-0 cursor-pointer" style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          ))}
        </>
      )}
      toolbarRight={<>
        <span className="text-caption" style={{ fontSize: 12 }} aria-live="polite">정상 {mn(String(counts['정상']))} · 실패 {mn(String(counts['실패']))} · 차단 {mn(String(counts['차단']))}</span>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
        <span ref={topMoreRef} className="inline-flex"><MoreMenu onExport={exportExcel} /></span>
      </>}
      footerLeft={<span>{'총 ' + mn(String(DEMO.length)) + '건 중 ' + mn(String(visible.length)) + '건 표시 중 · 접속기록 2년 · 권한변경 3년 보관(목업 문구)'}</span>}
      footerRight={<>
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
        {!topMoreVisible && <MoreMenu size={32} onExport={exportExcel} />}
      </>}>

      <div>
        <AgGridReact<AuditRow>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          preventDefaultOnContextMenu
          onGridReady={onGridReady}
          onSelectionChanged={onSelectionChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          onCellContextMenu={handleCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다. 기간·조건을 변경해 주세요.</span>'}
        />
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">감사로그를 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {SEARCHABLE && (
              <DrawerField label="검색어">
                <input type="text" value={fText} onChange={(e) => setFText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="행위 · 대상" style={inputStyle('text')} />
              </DrawerField>
            )}
            <DrawerField label="기간" plain>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={dayWrap}><PeriodPicker mode="day" value={fFrom} onChange={setFFrom} ariaLabel="기간 시작일" /></div>
                <span className="text-caption">~</span>
                <div style={dayWrap}><PeriodPicker mode="day" value={fTo} onChange={setFTo} ariaLabel="기간 종료일" /></div>
              </div>
            </DrawerField>
            <DrawerField label="유형"><DrawerSelect value={fKind} onChange={setFKind} options={AUDIT_KINDS.map((k) => ({ value: k, label: k }))} /></DrawerField>
            <DrawerField label="행위자"><input type="text" value={fActor} onChange={(e) => setFActor(e.target.value)} placeholder="로그인 아이디" style={inputStyle('text')} /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {detail && <AuditDetailModal row={detail} onClose={() => setDetailId(null)} />}
    </GridFrame>
  );
}
