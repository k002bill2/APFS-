/* 프로그램관리 — 관리형 리스트 페이지 (관리자 > 시스템 관리 > 프로그램관리, route program-manage).
   출처: S0_108_프로그램관리.html(공통관리 KRDS TO-BE) → APFS 디자인시스템으로 변형. (구 읽기 전용 목록은 S0_108 원본 확보로 대체됨.)

   구성(목업 → 우리 규약):
   - 검색박스(검색기준+검색어·도움말·사용여부) + 구분(브리프) → 주 필터 1개 = 사용여부 FilterChip(전체/사용 여/사용 부, 툴바 좌)
     (2026-09-15 사용자 지시로 도움말↔사용여부 교대 — 도움말은 드로어로 내려갔다. 주 필터와 드로어 항목은 배타다: 같은 필터를 양쪽에 두지 않는다)
       + 상세필터 드로어(검색기준+검색어 한 줄·구분(대분류)·도움말). 검색어 opt-in(SEARCHABLE).
   - 그리드(No·프로그램ID·프로그램명·구분·사용여부·메뉴연결·최종수정일시·최종수정자·도움말·도움말 수정일시·도움말 수정자) → AG Grid, 내용 맞춤 + 내부 가로 스크롤.
   - 행 선택 → [수정][도움말][삭제](목업 gate) → 라디오 단일선택 + 툴바 좌 selbar. 더블클릭·Enter·우클릭 = 수정.
       삭제 게이트: **메뉴에 연결된 프로그램(linked)은 삭제 불가**(목업 subAlert 문구를 toast 로) — 미연결 임시 프로그램만 AlertDialog 확인 후 삭제.
   - 프로그램 등록/수정(프로그램ID*·프로그램명*·사용여부) → RowFormModal + 팩토리 스키마(program_manage_schemas). 등록 = 미연결(linked:false).
   - 도움말 편집(개요·캡처·항목·절차·FAQ·유의사항·첨부) → 전용 `ProgramHelpModal`. 저장 시 도움말 수정자·일시 갱신.
   - 데이터 = LNB 정본(`admin_menu_tree.programCatalog`) 파생(`program_manage_model.demoPrograms`) — 메뉴관리·권한 매트릭스와 같은 소스.
   - 엑셀(리스트 공통 규약) → 푸터 내보내기 아이콘 + ⌥D. 마스크 ON이면 텍스트 ''.
   - KPI 배지 행 미포함(사용자 확정) · 카드뷰 없음 · 명세 팝업 없음 · 페이지네이션 20건.
   ⚠ 백엔드 없음 — 등록·수정·삭제·도움말 저장은 화면 로컬 상태만 바꾼다. 실제 LNB·메뉴 연결은 바뀌지 않는다. */
import './aggrid_shared.css';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { format } from 'date-fns';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF, NO_COL_ID, refreshNoColumn } from './aggrid_theme';
import { SELECTION_COL } from './aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import { drawerInputStyle as inputStyle } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent, CellStyle, RowSelectionOptions } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Info } from 'lucide-react';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { RowFormModal } from './generic_list_modal';
import { RowContextMenu } from './row_context_menu';
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { buildMenuRows } from './admin_menu_tree';
import { UseBadge } from './admin_shared';
import { demoPrograms, filterPrograms, gubunOptions, deleteBlocker, programPidTaken, emptyHelpDoc } from './program_manage_model';
import type { ProgramRow, ProgramField, HelpDoc } from './program_manage_model';
import { programSchema } from './program_manage_schemas';
import { ProgramHelpModal } from './program_help_modal';

const { Button, IconBtn, StatusBadge, FilterChip } = UI;

const SEARCHABLE = true;
const PAGE_SIZE = 20;
const SEARCH_FIELDS: { key: ProgramField; label: string }[] = [{ key: 'pid', label: '프로그램ID' }, { key: 'pname', label: '프로그램명' }];
const USE_CHIPS = [['', '전체'], ['여', '사용 여'], ['부', '사용 부']] as const;
const nowStamp = () => format(new Date(), 'yyyy-MM-dd HH:mm');
const seedPrograms = () => demoPrograms(buildMenuRows());

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 순서 + 구분(브리프)
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };
const mono: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const dash = <span style={{ color: 'var(--muted-foreground)' }}>-</span>;

const columnDefs: ColDef<ProgramRow>[] = [
  { colId: NO_COL_ID, headerName: 'No', width: 60, maxWidth: 60, cellStyle: centerNum, sortable: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
  { field: 'pid', headerName: '프로그램ID', width: 120, maxWidth: 140, cellStyle: mono, cellRenderer: (p: any) => <span className="font-semibold"><MT>{p.value}</MT></span> },
  { field: 'pname', headerName: '프로그램명', width: 220, minWidth: 160, maxWidth: 320, cellStyle: flexCenter, cellRenderer: (p: any) => <span className="font-semibold"><MT>{p.value}</MT></span> },
  { field: 'gubun', headerName: '구분', width: 120, maxWidth: 140, cellStyle: muted, cellRenderer: (p: any) => (p.value ? <MT>{p.value}</MT> : dash) },
  { field: 'use', headerName: '사용여부', width: 92, maxWidth: 92, cellStyle: flexMid, cellRenderer: (p: any) => <UseBadge use={p.value} size="md" /> },
  { field: 'linked', headerName: '메뉴연결', width: 100, maxWidth: 100, cellStyle: flexMid, valueFormatter: (p) => (p.value ? '연결' : '미연결'),
    cellRenderer: (p: any) => <StatusBadge tone={p.value ? 'info' : 'primary'} label={p.value ? '연결' : '미연결'} size="md" dot={false} /> },
  { field: 'menuPath', headerName: '연결 메뉴', width: 260, minWidth: 180, maxWidth: 360, cellStyle: muted,
    cellRenderer: (p: any) => (p.value ? <MT>{p.value}</MT> : dash) },
  { field: 'at', headerName: '최종수정일시', width: 150, maxWidth: 150, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' }, valueFormatter: (p) => mn(p.value) },
  { field: 'by', headerName: '최종수정자', width: 110, maxWidth: 120, cellStyle: muted, cellRenderer: (p: any) => (p.value ? <MT>{p.value}</MT> : dash) },
  { field: 'help', headerName: '도움말', width: 92, maxWidth: 92, cellStyle: flexMid, valueFormatter: (p) => (p.value ? '있음' : '없음'),
    cellRenderer: (p: any) => (p.value ? <StatusBadge tone="success" label="있음" size="md" dot={false} /> : dash) },
  { field: 'helpAt', headerName: '도움말 수정일시', width: 150, maxWidth: 150, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' }, valueFormatter: (p) => (p.value ? mn(p.value) : '-') },
  { field: 'helpBy', headerName: '도움말 수정자', width: 120, maxWidth: 130, cellStyle: muted, cellRenderer: (p: any) => (p.value ? <MT>{p.value}</MT> : dash) },
];
const ROW_SELECTION: RowSelectionOptions<ProgramRow> = { mode: 'singleRow', checkboxes: true, enableClickSelection: false };   // 행 본문 클릭 선택 해제 — 체크박스로만 on/off (2026-09-22 사용자 결정, apfs-aggrid "체크박스" 절)

type XCol = { header: string; get: (r: ProgramRow) => string };
const EXPORT_COLS: XCol[] = [
  { header: '프로그램ID', get: (r) => r.pid }, { header: '프로그램명', get: (r) => r.pname }, { header: '구분', get: (r) => r.gubun }, { header: '연결 메뉴', get: (r) => r.menuPath },
  { header: '사용여부', get: (r) => (r.use ? '여' : '부') }, { header: '메뉴연결', get: (r) => (r.linked ? '연결' : '미연결') }, { header: '최종수정일시', get: (r) => r.at }, { header: '최종수정자', get: (r) => r.by },
  { header: '도움말', get: (r) => (r.help ? '있음' : '없음') }, { header: '도움말 수정일시', get: (r) => r.helpAt }, { header: '도움말 수정자', get: (r) => r.helpBy },
];

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}
function DrawerSelect({ value, onChange, options, all = '전체', ariaLabel }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; all?: string | null; ariaLabel?: string }) {
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        {all != null && <option value="">{all}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}
function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer motion-safe:active:scale-[.97]"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}
/* 삭제 버튼 — 메뉴에 연결된 프로그램(linked)일 때의 "삭제 불가" 변형.
   ⓘ 아이콘을 삭제 버튼 **안**에 항상 띄우고(사유가 있다는 사실 자체가 상시 단서),
   마우스를 올리면 사유 팝오버가 열린다.

   ⚠ disabled 버튼은 브라우저가 마우스 이벤트를 아예 발생시키지 않아 자신도 조상도 hover 를 못 받는다.
     그래서 Button 에 pointerEvents:'none' 을 주고, hover·키보드·팝오버 트리거를 **바깥 span** 이 소유한다.
     disabled 버튼은 초점도 못 받으므로 키보드 경로도 이 span(role=button, tabIndex 0)이 대신 연다.
   여닫기 규약은 review_marker.tsx 와 동일(그쪽에서 실측으로 다듬은 패턴):
     - 닫기는 140ms 유예 + 팝오버 콘텐츠도 같은 핸들러 → 트리거→콘텐츠로 포인터가 넘어가도 안 닫힌다
     - 포인터 클릭은 **열기 전용**(토글 아님) — hover 로 이미 열린 걸 클릭이 곧바로 닫아버린다
     - 초점 이동은 **키보드로 열었을 때만** — hover 로 열 때 초점을 뺏으면 작업 중 초점이 튄다
   z-index/포털은 ui/popover 가 소유(z-popover + PortalContainer) — 여기서 z 를 다시 손대지 않는다. */
function DeleteBlockedButton() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const openNow = () => { window.clearTimeout(closeTimer.current); setOpen(true); };
  const closeSoon = () => { window.clearTimeout(closeTimer.current); closeTimer.current = window.setTimeout(() => setOpen(false), 140); };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  const viaKeyboard = useRef(false);
  const openByPointer = (e: React.SyntheticEvent) => { e.preventDefault(); viaKeyboard.current = false; openNow(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    viaKeyboard.current = true;
    window.clearTimeout(closeTimer.current);
    setOpen((o) => !o);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label="삭제 불가 — 이유 보기"
          onClick={openByPointer}
          onMouseEnter={() => { viaKeyboard.current = false; openNow(); }}
          onMouseLeave={closeSoon}
          onKeyDown={onKey}
          className="group inline-flex rounded-[9px] cursor-help outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Button variant="outline" size="sm" leadingIcon="trash" disabled style={{ color: 'var(--danger)', pointerEvents: 'none' }}>
            삭제
            <Info size={14} strokeWidth={2.2} aria-hidden
              className="opacity-70 transition-opacity duration-tok-fast group-hover:opacity-100 group-data-[state=open]:opacity-100" />
          </Button>
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label="삭제할 수 없는 이유"
        onMouseEnter={openNow} onMouseLeave={closeSoon}
        /* 키보드로 연 경우에만 Radix 의 초점 이동·복귀를 살린다(포인터로 열 땐 초점을 건드리지 않는다) */
        onOpenAutoFocus={(e) => { if (!viaKeyboard.current) e.preventDefault(); }}
        onCloseAutoFocus={(e) => { if (!viaKeyboard.current) e.preventDefault(); }}
        className="max-w-[300px] px-[13px] py-[11px] text-[12.5px] leading-[1.6] text-muted-foreground">
        <div className="mb-[5px] flex items-center gap-1.5 font-bold text-foreground">
          <Icon name="alert-triangle" size={13} stroke={2.4} />삭제할 수 없습니다
        </div>
        메뉴에 연결된 프로그램은 삭제할 수 없습니다. 먼저 <b className="font-semibold text-foreground">메뉴관리</b>에서 이 프로그램의 연결(프로그램ID)을 해제한 뒤 삭제하세요.
      </PopoverContent>
    </Popover>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null | { kind: 'form'; mode: 'create' | 'edit'; id?: string } | { kind: 'help'; id: string } | { kind: 'delete'; id: string };

export function ProgramManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<ProgramRow> | null>(null);
  const [rows, setRows] = useState<ProgramRow[]>(seedPrograms);
  const [selId, setSelId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxMenuState>(null);
  const masked = useMask();

  /* 필터 — 사용여부는 툴바 칩, 나머지(검색어·검색기준·구분·도움말)는 드로어 */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fHelp, setFHelp] = useState<'' | 'y' | 'n'>('');
  const [fField, setFField] = useState<ProgramField>('pid');
  const [fText, setFText] = useState('');
  const [fGubun, setFGubun] = useState('');
  const [fUse, setFUse] = useState<'' | '여' | '부'>('');
  const clearFilters = () => { setFHelp(''); setFField('pid'); setFText(''); setFGubun(''); setFUse(''); };

  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'form', mode: 'create' }), { enabled: modal === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  const gubuns = useMemo(() => gubunOptions(rows), [rows]);
  const visible = useMemo(() => filterPrograms(rows, { field: fField, kw: fText, help: fHelp, use: fUse, gubun: fGubun }), [rows, fField, fText, fHelp, fUse, fGubun]);

  const selIdRef = useRef<string | null>(null); selIdRef.current = selId;
  const onGridReady = useCallback((e: GridReadyEvent<ProgramRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<ProgramRow>) => { setSelId(e.api.getSelectedRows()[0]?.id ?? null); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<ProgramRow> }) => {
    const id = selIdRef.current; if (!id) return;
    const node = e.api.getRowNode(id); if (node && !node.isSelected()) node.setSelected(true, true);
  }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<ProgramRow>) => { if (e.data && !e.rowPinned) setModal({ kind: 'form', mode: 'edit', id: e.data.id }); }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<ProgramRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    setModal({ kind: 'form', mode: 'edit', id: e.data.id });
  }, []);

  const selected = selId ? rows.find((r) => r.id === selId) ?? null : null;
  const target = modal && modal.kind !== 'form' ? rows.find((r) => r.id === modal.id) ?? null : modal?.kind === 'form' && modal.id ? rows.find((r) => r.id === modal.id) ?? null : null;

  /* 삭제 게이트(목업): 메뉴 연결 프로그램은 불가 — 사유 toast. 미연결만 확인 다이얼로그 */
  const requestDelete = (r: ProgramRow) => {
    const blocker = deleteBlocker(r);
    if (blocker) { toast.error(blocker); return; }
    setModal({ kind: 'delete', id: r.id });
  };
  const handleCellContextMenu = (e: CellContextMenuEvent<ProgramRow>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [
      { label: '수정', icon: 'file', onSelect: () => setModal({ kind: 'form', mode: 'edit', id: row.id }) },
      { label: '도움말 편집', icon: 'memo', onSelect: () => setModal({ kind: 'help', id: row.id }) },
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
      'sep',
      { label: row.linked ? '삭제 (메뉴 연결 — 불가)' : '삭제', icon: 'trash', danger: true, onSelect: () => requestDelete(row) },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  /* ── CRUD — 불변 갱신 + toast(목업 회신 문구). 중복 프로그램ID는 toast + 모달 유지 ── */
  const str = (v: unknown) => String(v ?? '').trim();
  const saveProgram = (f: any) => {
    if (!modal || modal.kind !== 'form') return;
    const pname = str(f.pname), use = str(f.use) !== '부', at = nowStamp();
    if (modal.mode === 'edit' && target) {
      setRows((prev) => prev.map((r) => (r.id === target.id ? { ...r, pname, use, by: '전산관리', at } : r)));
    } else {
      const pid = str(f.pid);
      if (programPidTaken(rows, pid)) { toast.error('이미 존재하는 프로그램ID입니다.'); return; }
      const row: ProgramRow = { id: `tmp-${crypto.randomUUID()}`, pid, pname, gubun: '', menuPath: '', use, linked: false, help: false, helpDoc: emptyHelpDoc(), helpBy: '', helpAt: '', by: '전산관리', at };
      setRows((prev) => [...prev, row]);
      setSelId(row.id);
    }
    setModal(null);
    toast.success('저장되었습니다 (목업)');
  };
  const saveHelp = (on: boolean, doc: HelpDoc) => {
    if (modal?.kind !== 'help') return;
    const id = modal.id;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, help: on, helpDoc: doc, helpBy: '전산관리', helpAt: nowStamp() } : r)));
    setModal(null);
    toast.success('도움말이 저장되었습니다 (목업)');
  };
  const doDelete = () => {
    if (modal?.kind !== 'delete' || !target) return;
    if (deleteBlocker(target)) { toast.error(deleteBlocker(target)!); return; }
    setRows((prev) => prev.filter((r) => r.id !== target.id));
    if (selId === target.id) setSelId(null);
    toast.success('삭제되었습니다 (목업)');
  };
  const refresh = () => { setRows(seedPrograms()); apiRef.current?.deselectAll(); clearFilters(); toast.success('새로고침했습니다'); };

  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => (masked ? '' : c.get(r))));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '프로그램명' || c.header === '연결 메뉴' ? 34 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '프로그램관리');
    XLSX.writeFile(wb, '프로그램관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const formModal = modal?.kind === 'form' ? modal : null;
  const schema = useMemo(() => (formModal ? programSchema(formModal.mode) : null), [formModal?.mode]);   // eslint-disable-line react-hooks/exhaustive-deps
  const formInitial = formModal?.mode === 'edit' && target ? { id: target.id, pid: target.pid, pname: target.pname, use: target.use ? '여' : '부' } : { use: '여' };
  const pageSize = showAll ? Math.max(visible.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const chips: [string, string, () => void][] = [
    ['검색어', fText.trim() && `${SEARCH_FIELDS.find((f) => f.key === fField)?.label}: ${fText.trim()}`, () => setFText('')],
    ['구분', fGubun, () => setFGubun('')],
    ['도움말', fHelp && (fHelp === 'y' ? '도움말 있음' : '도움말 없음'), () => setFHelp('')],
  ];

  /* 선택 컨텍스트 액션 — GridFrame 이 툴바 좌측과 하단 플로팅 바 **중 한 곳에만** 렌더한다
     (contextActions 슬롯). 그래서 선택 시 toolbarLeft 는 비워 둔다 — 둘 다 넘기면 탭 스톱이 2벌 된다. */
  const selActions = selected ? (
    <>
      <StatusBadge tone={selected.linked ? 'info' : 'primary'} label={selected.linked ? '메뉴 연결' : '미연결'} size="lg" dot={false} />
      <Button variant="primary" size="sm" onClick={() => setModal({ kind: 'form', mode: 'edit', id: selected.id })}>수정</Button>
      <Button variant="outline" size="sm" leadingIcon="memo" onClick={() => setModal({ kind: 'help', id: selected.id })}>도움말</Button>
      {/* 삭제 — 연결 프로그램은 비활성 + 버튼 안 ⓘ(hover)로 사유 팝오버(목업 subAlert "삭제 불가"를 UI 로 표현) */}
      {selected.linked
        ? <DeleteBlockedButton />
        : <Button variant="outline" size="sm" leadingIcon="trash" style={{ color: 'var(--danger)' }} onClick={() => requestDelete(selected)}>삭제</Button>}
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;
  return (
    <GridFrame
      crumbs={['홈', '관리자', '시스템 관리', '프로그램관리']}
      title="프로그램관리"
      favRoute="program-manage"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={selected ? null : (
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {USE_CHIPS.map(([v, l]) => <FilterChip key={v || 'all'} active={fUse === v} onClick={() => setFUse(v)}>{l}</FilterChip>)}
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
      contextActions={selActions}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'form', mode: 'create' })}>프로그램 등록</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + mn(String(rows.length)) + '개 프로그램 중 ' + mn(String(visible.length)) + '개 · ' + mn(String(Math.min(shown, visible.length))) + '개 표시 중 · 도움말은 프로그램 단위로 관리'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<ProgramRow>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          preventDefaultOnContextMenu
          onGridReady={onGridReady}
          onModelUpdated={refreshNoColumn}
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          onCellContextMenu={handleCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다.</span>'}
        />
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />

      {/* ── 상세필터 드로어 — 검색기준(opt-in, 라벨 위 + select·검색어 한 줄) · 구분 · 도움말(사용여부는 툴바 칩) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">프로그램 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {/* 검색기준(라벨 위) 아래로 기준 select + 검색어 input 을 한 줄에 — 목업 검색박스와 같은 배열.
                <label> 은 컨트롤 하나만 소유하므로 <div> 래퍼 + 각 컨트롤 aria-label 로 접근명을 준다. */}
            {SEARCHABLE && (
              <div className="block mb-4">
                <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>검색기준</span>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <div className="shrink-0">
                    <DrawerSelect value={fField} onChange={(v) => setFField(v as ProgramField)} options={SEARCH_FIELDS.map((f) => ({ value: f.key, label: f.label }))} all={null} ariaLabel="검색기준" />
                  </div>
                  <input type="text" value={fText} onChange={(e) => setFText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }}
                    aria-label="검색어" placeholder="검색어" style={{ ...inputStyle('text'), width: 'auto', minWidth: 96, flex: 1 }} />
                </div>
              </div>
            )}
            <DrawerField label="구분"><DrawerSelect value={fGubun} onChange={setFGubun} options={gubuns.map((g) => ({ value: g, label: g }))} /></DrawerField>
            <DrawerField label="도움말"><DrawerSelect value={fHelp} onChange={(v) => setFHelp(v as '' | 'y' | 'n')} options={[{ value: 'y', label: '있음' }, { value: 'n', label: '없음' }]} /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 프로그램 등록/수정(RowFormModal, 3필드 1단). 삭제는 selbar·우클릭(연결 프로그램 불가) ── */}
      {formModal && schema && (formModal.mode === 'create' || target) && (
        <RowFormModal mode={formModal.mode} schema={schema} title={schema.title} initial={formInitial as any}
          onSave={saveProgram} onClose={() => setModal(null)}
          onDelete={formModal.mode === 'edit' && target && !target.linked ? () => { setModal(null); requestDelete(target); } : undefined} />
      )}
      {/* ── 도움말 편집 ── */}
      {modal?.kind === 'help' && target && <ProgramHelpModal program={target} onSave={saveHelp} onClose={() => setModal(null)} />}
      {/* ── 삭제 확인(미연결 프로그램 전제) ── */}
      {modal?.kind === 'delete' && target && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>프로그램 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                프로그램 「<b className="text-foreground"><MT>{`${target.pid} ${target.pname}`}</MT></b>」 을 삭제할까요?
                <br />삭제 후에는 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={doDelete} style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </GridFrame>
  );
}
