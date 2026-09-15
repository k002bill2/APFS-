/* 권한 변경이력 — 조회 전용 리스트 페이지 (관리자 > 감사·기록 > 권한 변경이력, route permission-history).
   출처: S0_107_권한변경이력.html(AFIT 공통관리 KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(기간·대상 사용자·변경유형·행위자·검색어 + [이번 달]) → 주 필터 1개 = 변경유형 FilterChip(툴바 좌)
       + 상세필터 드로어(검색어·기간(PeriodPicker day ×2)·대상 사용자·행위자). [이번 달] = 툴바 ghost 버튼. 기본 기간 = 이번 달(데모 고정 기준일).
   - 그리드(No·일시·변경유형·권한·변경 요약·적용 대상·행위자·발생프로그램) → AG Grid 단일 헤더. 변경 요약 셀 = 추가N·회수M 또는 전→후.
   - 행 선택 → [상세 보기] · 더블클릭/Enter → 상세 다이얼로그(`PermissionHistoryDetailModal`, 읽기 전용 — 편집 액션 없음).
   - 등록 없음(조회 전용) → 툴바 kebab 단독. 엑셀 = kebab + 푸터 download + ⌥D. 툴바 좌 요약 캡션(기간 내 변경 N건 · 유형별).
   - KPI 배지 행 미포함(사용자 확정) · 카드뷰 없음.
   ⚠ 실제 감사 데이터·권한변경 수집이 아니다 — 데모 행을 로컬로 조회만 한다(브리프). 실명 아님. */
import './aggrid_shared.css';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, NO_COL_ID, refreshNoColumn } from './aggrid_theme';
import { controlMinWidth } from './schemas/renderers';
import { PeriodPicker } from './ui/period-picker';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent, CellStyle, RowSelectionOptions } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { RowContextMenu } from './row_context_menu';
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { demoHistory, filterHistory, summaryCounts, summaryText, cntAdd, cntRev, usersOf, monthRange, CT_TONE, CHANGE_TYPES } from './permission_history_model';
import type { HistEntry, ChangeType } from './permission_history_model';
import { PermissionHistoryDetailModal } from './permission_history_detail_modal';

const { Button, IconBtn, StatusBadge, FilterChip } = UI;

const SEARCHABLE = true;
const DEMO: HistEntry[] = demoHistory();          // 정적 데모(조회 전용)
const USER_OPTIONS = usersOf(DEMO);

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 순서 그대로
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };

function SummaryCell({ d }: { d: HistEntry }) {
  if (d.items && d.items.length) {
    const add = cntAdd(d), rev = cntRev(d);
    return (
      <span className="inline-flex items-center gap-1.5 font-bold" style={{ fontSize: 12.5 }}>
        {add > 0 && <span style={{ color: 'var(--success-text)' }}>추가 {mn(String(add))}</span>}
        {add > 0 && rev > 0 && <span className="text-caption">·</span>}
        {rev > 0 && <span style={{ color: 'var(--danger-text)' }}>회수 {mn(String(rev))}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5" style={{ fontSize: 12.5 }}>
      <span style={{ color: 'var(--danger-text)', textDecoration: 'line-through', opacity: .85 }}><MT>{d.before ?? '-'}</MT></span>
      <span className="text-caption" aria-hidden>→</span>
      <b style={{ color: 'var(--success-text)' }}><MT>{d.after ?? '-'}</MT></b>
    </span>
  );
}
function HoldersCell({ d }: { d: HistEntry }) {
  const h = d.holders;
  if (!h.length) return <span className="text-caption">0명</span>;
  const names = h.slice(0, 2).map((x) => x.name).join(', ');
  return <span className="inline-flex items-center gap-1.5 min-w-0"><b>{mn(String(h.length))}명</b><span className="text-caption truncate" style={{ fontSize: 11.5 }}><MT>{names + (h.length > 2 ? ` 외 ${h.length - 2}명` : '')}</MT></span></span>;
}

const columnDefs: ColDef<HistEntry>[] = [
  { colId: NO_COL_ID, headerName: 'No', width: 60, maxWidth: 60, cellStyle: centerNum, sortable: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
  { field: 'ts', headerName: '일시', width: 176, maxWidth: 176, cellStyle: { ...centerNum }, valueFormatter: (p) => mn(p.value) },
  { field: 'ctype', headerName: '변경유형', width: 110, maxWidth: 110, cellStyle: flexMid, cellRenderer: (p: any) => <StatusBadge tone={CT_TONE[p.value as ChangeType]} label={p.value} size="lg" dot={false} /> },
  { field: 'preset', headerName: '권한', width: 130, minWidth: 110, maxWidth: 180, cellStyle: flexCenter, cellRenderer: (p: any) => <span className="font-semibold"><MT>{p.value}</MT></span> },
  { headerName: '변경 요약', width: 200, minWidth: 170, maxWidth: 260, cellStyle: flexCenter, valueGetter: (p) => (p.data ? summaryText(p.data) : ''), cellRenderer: (p: any) => (p.data ? <SummaryCell d={p.data} /> : null) },
  { headerName: '적용 대상(동일 권한 보유)', flex: 1, width: 220, minWidth: 180, cellStyle: flexCenter, valueGetter: (p) => (p.data?.holders ?? []).map((h) => h.name).join(', '), cellRenderer: (p: any) => (p.data ? <HoldersCell d={p.data} /> : null) },
  { field: 'actor', headerName: '행위자', width: 108, maxWidth: 140, cellStyle: muted, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'src', headerName: '발생프로그램', width: 120, maxWidth: 130, cellStyle: { ...flexMid, color: 'var(--muted-foreground)' }, cellRenderer: (p: any) => <MT>{p.value}</MT> },
];
const ROW_SELECTION: RowSelectionOptions<HistEntry> = { mode: 'singleRow', checkboxes: true, enableClickSelection: true };
const SELECTION_COL = { pinned: 'left' as const, width: 44, maxWidth: 44 };
const TYPE_CHIPS = ['', ...CHANGE_TYPES] as const;

type XCol = { header: string; get: (r: HistEntry) => string };
const EXPORT_COLS: XCol[] = [
  { header: '일시', get: (r) => r.ts }, { header: '변경유형', get: (r) => r.ctype }, { header: '권한', get: (r) => r.preset },
  { header: '변경 요약', get: summaryText }, { header: '적용 대상', get: (r) => r.holders.map((h) => h.name).join(', ') },
  { header: '행위자', get: (r) => r.actor }, { header: '발생프로그램', get: (r) => r.src }, { header: 'IP', get: (r) => r.ip }, { header: '사유', get: (r) => r.reason },
];

const inputStyle = (kind?: string): CSSProperties => ({
  width: 'fit-content', minWidth: controlMinWidth(kind), maxWidth: '100%', boxSizing: 'border-box', padding: '9px 11px', font: 'inherit', fontSize: 14,
  border: '1px solid var(--input)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)',
});
/* plain=<div> 래퍼 — PeriodPicker(버튼 트리거)는 <label> 안에서 2회 토글되므로(apfs-datepicker) */
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

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function PermissionHistory({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<HistEntry> | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const [ctx, setCtx] = useState<CtxMenuState>(null);
  const masked = useMask();

  /* 필터 — 변경유형은 툴바 칩, 나머지는 드로어. 기본 기간 = 이번 달(데모 고정 기준일) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fType, setFType] = useState<typeof TYPE_CHIPS[number]>('');
  const [[from0, to0]] = useState(() => monthRange());
  const [fFrom, setFFrom] = useState(from0);
  const [fTo, setFTo] = useState(to0);
  const [fUser, setFUser] = useState('');
  const [fActor, setFActor] = useState('');
  const [fText, setFText] = useState('');
  const clearFilters = () => { setFType(''); setFFrom(from0); setFTo(to0); setFUser(''); setFActor(''); setFText(''); };
  const thisMonth = () => { const [f, t] = monthRange(); setFFrom(f); setFTo(t); };

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

  const visible = useMemo(() => filterHistory(DEMO, { from: fFrom, to: fTo, user: fUser, type: fType, actor: fActor, kw: fText }), [fFrom, fTo, fUser, fType, fActor, fText]);
  const summary = useMemo(() => summaryCounts(visible), [visible]);

  const onGridReady = useCallback((e: GridReadyEvent<HistEntry>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<HistEntry>) => { setSelId(e.api.getSelectedRows()[0]?.id ?? null); }, []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<HistEntry>) => { if (e.data && !e.rowPinned) setDetailId(e.data.id); }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<HistEntry>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    setDetailId(e.data.id);
  }, []);
  const handleCellContextMenu = (e: CellContextMenuEvent<HistEntry>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [
      { label: '상세 보기', icon: 'eye', onSelect: () => setDetailId(row.id) },
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
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '사유' || c.header === '적용 대상' ? 30 : 16 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '권한 변경이력');
    XLSX.writeFile(wb, '권한변경이력.xlsx');
    toast.success('Excel로 내보냈습니다 — 다운로드 행위도 감사로그에 기록됩니다 (목업)');
  };

  const chips: [string, string, () => void][] = [
    ['기간', fFrom || fTo ? `${fFrom || '…'} ~ ${fTo || '…'}` : '', () => { setFFrom(''); setFTo(''); }],
    ['대상 사용자', fUser, () => setFUser('')],
    ['행위자', fActor.trim(), () => setFActor('')],
    ['검색어', fText.trim(), () => setFText('')],
  ];

  return (
    <GridFrame
      crumbs={['홈', '관리자', '감사·기록', '권한 변경이력']}
      title="권한 변경이력"
      favRoute="permission-history"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={selected ? (
        <>
          <StatusBadge tone={CT_TONE[selected.ctype]} label={selected.ctype} size="lg" dot={false} />
          <Button variant="primary" size="sm" leadingIcon="eye" onClick={() => setDetailId(selected.id)}>상세 보기</Button>
          <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
        </>
      ) : (
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {TYPE_CHIPS.map((t) => <FilterChip key={t || 'all'} active={fType === t} onClick={() => setFType(t)}>{t || '전체'}</FilterChip>)}
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
        {/* 요약(목업 #summary) — aria-live 로 필터 결과 통지 */}
        <span className="text-caption" style={{ fontSize: 12 }} aria-live="polite">
          기간 내 변경 <b className="text-foreground">{mn(String(visible.length))}</b>건{summary.map((s) => ` · ${s.type} ${mn(String(s.n))}`).join('')}
        </span>
        <Button variant="ghost" size="sm" leadingIcon="calendar" onClick={thisMonth}>이번 달</Button>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
        <span ref={topMoreRef} className="inline-flex"><MoreMenu onExport={exportExcel} /></span>
      </>}
      footerLeft={<span>{'총 ' + mn(String(DEMO.length)) + '건 중 ' + mn(String(visible.length)) + '건 표시 중 · 권한변경 이력 3년 보관(목업)'}</span>}
      footerRight={<>
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
        {!topMoreVisible && <MoreMenu size={32} onExport={exportExcel} />}
      </>}>

      <div>
        <AgGridReact<HistEntry>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          preventDefaultOnContextMenu
          onGridReady={onGridReady}
          onModelUpdated={refreshNoColumn}
          onSelectionChanged={onSelectionChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          onCellContextMenu={handleCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">해당 기간·조건의 권한 변경 이력이 없습니다.</span>'}
        />
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />

      {/* ── 상세필터 드로어 — 검색어(opt-in) · 기간 · 대상 사용자 · 행위자(변경유형은 툴바 칩) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">권한 변경이력을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {SEARCHABLE && (
              <DrawerField label="검색어">
                <input type="text" value={fText} onChange={(e) => setFText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="메뉴 · 권한" style={inputStyle('text')} />
              </DrawerField>
            )}
            <DrawerField label="기간" plain>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={dayWrap}><PeriodPicker mode="day" value={fFrom} onChange={setFFrom} ariaLabel="기간 시작일" /></div>
                <span className="text-caption">~</span>
                <div style={dayWrap}><PeriodPicker mode="day" value={fTo} onChange={setFTo} ariaLabel="기간 종료일" /></div>
              </div>
            </DrawerField>
            <DrawerField label="대상 사용자"><DrawerSelect value={fUser} onChange={setFUser} options={USER_OPTIONS.map((u) => ({ value: u, label: u }))} /></DrawerField>
            <DrawerField label="행위자"><input type="text" value={fActor} onChange={(e) => setFActor(e.target.value)} placeholder="행위 수행자" style={inputStyle('text')} /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {detail && <PermissionHistoryDetailModal entry={detail} onClose={() => setDetailId(null)} />}
    </GridFrame>
  );
}
