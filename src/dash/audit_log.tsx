/* 감사로그 — 조회 전용 리스트 페이지 (관리자 > 감사·기록 > 감사로그, route audit-log).
   출처: S0_104_감사로그.html(공통관리 KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(기간·결과·행위자·검색어) → 주 필터 1개 = 결과 FilterChip(툴바 좌) + 상세필터 드로어(검색어·기간(PeriodPicker day ×2)·유형·행위자).
       유형(접속·계정·권한변경·비정상 접근)은 브리프의 "접속·권한변경·비정상 접근 행" 구분 — 행위 문자열에서 파생(audit_log_model.kindOf).
   - 그리드(No·일시·행위자·유형·행위·대상·IP·결과) → AG Grid 단일 헤더, 결과 배지(정상 success·실패 warning·차단 danger).
   - 행 상세(브리프) → 더블클릭/Enter(또는 우클릭 메뉴 '상세') → 읽기 전용 kv 다이얼로그. 목업은 선택 없음이었으나 상세 요구로 추가.
   - 등록 없음 → 툴바 kebab 단독. 엑셀·인쇄 = kebab + 푸터 download + ⌥D(목업 '엑셀 다운로드'·'인쇄'는 반출 통제 문구만 — 실제 통제 없음).
   - KPI 배지 행 미포함(사용자 확정) · 카드뷰 없음.
   ⚠ 실제 접근 로그·보안 이벤트·정책 판정이 아니다 — 데모 행을 로컬로 조회만 한다(브리프). 실명 아님. */
import './aggrid_shared.css';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, NO_COL_ID, refreshNoColumn } from './aggrid_theme';
import { controlMinWidth, drawerInputStyle as inputStyle } from './schemas/renderers';
import { PeriodPicker } from './ui/period-picker';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';
import { useHotkey, HOTKEYS } from './use-hotkey';
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
  { colId: NO_COL_ID, headerName: 'No', width: 60, maxWidth: 60, cellStyle: centerNum, sortable: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
  { field: 'ts', headerName: '일시', width: 176, maxWidth: 176, cellStyle: centerNum, sort: 'desc', valueFormatter: (p) => mn(p.value) },
  { field: 'actor', headerName: '행위자', width: 120, maxWidth: 140, cellStyle: { ...flexCenter, fontVariantNumeric: 'tabular-nums' }, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'kind', headerName: '유형', width: 110, maxWidth: 120, cellStyle: flexMid, cellRenderer: (p: any) => <StatusBadge tone={KIND_TONE[p.value as AuditKind]} label={p.value} size="lg" dot={false} /> },
  { field: 'action', headerName: '행위', width: 200, minWidth: 150, maxWidth: 260, cellStyle: flexCenter, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'target', headerName: '대상', flex: 1, width: 240, minWidth: 180, cellStyle: flexCenter, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'ip', headerName: 'IP', width: 122, maxWidth: 122, cellStyle: { ...muted, fontVariantNumeric: 'tabular-nums' }, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'result', headerName: '결과', width: 92, maxWidth: 92, cellStyle: flexMid, cellRenderer: (p: any) => <StatusBadge tone={RESULT_TONE[p.value as AuditResult]} label={p.value} size="lg" dot={false} /> },
];
// 조회 전용(audit-read-only) — 행 선택 자체를 두지 않는다(체크박스도, 클릭 선택도).
// 선택으로 실행할 액션(일괄삭제·단계전이·선택 행 편집)이 없어 선택은 죽은 상태값이었다.
// 상세 진입은 더블클릭 / Enter / 우클릭 메뉴 3경로로 충분하다.
const RESULT_CHIPS = ['', ...AUDIT_RESULTS] as const;

type XCol = { header: string; get: (r: AuditRow) => string };
const EXPORT_COLS: XCol[] = [
  { header: '일시', get: (r) => r.ts }, { header: '행위자', get: (r) => r.actor }, { header: '유형', get: (r) => r.kind },
  { header: '행위', get: (r) => r.action }, { header: '대상', get: (r) => r.target }, { header: 'IP', get: (r) => r.ip }, { header: '결과', get: (r) => r.result },
];

function DrawerField({ label, children, plain }: { label: string; children: ReactNode; plain?: boolean }) {
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

/* 행 상세 — 읽기 전용 kv(한글 가로 배열 규약) */
function AuditDetailModal({ row, onClose }: { row: AuditRow; onClose: () => void }) {
  const items: [string, ReactNode][] = [
    ['일시', <MT>{row.ts}</MT>], ['행위자', <MT>{row.actor}</MT>], ['유형', <StatusBadge tone={KIND_TONE[row.kind]} label={row.kind} size="md" dot={false} />],
    ['행위', <MT>{row.action}</MT>], ['대상', <MT>{row.target}</MT>], ['IP', <MT>{row.ip}</MT>], ['결과', <StatusBadge tone={RESULT_TONE[row.result]} label={row.result} size="md" dot={false} />],
  ];
  const dlgRef = useRef<DialogHandle>(null);
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
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
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function AuditLog({ onNav }: { onNav?: (r: string) => void }) {
  const [detailId, setDetailId] = useState<string | null>(null);
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

  const visible = useMemo(() => filterLogs(DEMO, { from: fFrom, to: fTo, result: fResult, kind: fKind, actor: fActor, kw: fText }), [fFrom, fTo, fResult, fKind, fActor, fText]);
  /* 결과 칩의 건수는 "결과만 빼고" 나머지 필터를 적용한 모집단 기준(facet count).
     visible 로 세면 한 칩을 누른 순간 나머지 칩이 전부 0이 된다. */
  const facet = useMemo(() => filterLogs(DEMO, { from: fFrom, to: fTo, kind: fKind, actor: fActor, kw: fText }), [fFrom, fTo, fKind, fActor, fText]);
  const counts = useMemo(() => resultCounts(facet), [facet]);
  const chipCount = (r: string) => mn(String(r ? counts[r as AuditResult] ?? 0 : facet.length));
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

  const detail = detailId ? DEMO.find((r) => r.id === detailId) ?? null : null;
  const refresh = () => { clearFilters(); toast.success('새로고침했습니다'); };

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
      toolbarLeft={(
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {RESULT_CHIPS.map((r) => <FilterChip key={r || 'all'} active={fResult === r} onClick={() => setFResult(r)} count={chipCount(r)}>{r || '전체'}</FilterChip>)}
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
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + mn(String(DEMO.length)) + '건 중 ' + mn(String(visible.length)) + '건 표시 중'}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      <div>
        <AgGridReact<AuditRow>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          preventDefaultOnContextMenu
          onModelUpdated={refreshNoColumn}
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
