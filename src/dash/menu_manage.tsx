/* 메뉴 관리 — 관리형 리스트 페이지 (관리자 > 시스템 관리 > 메뉴 관리).
   출처: S0_105_메뉴관리.html(공통관리 KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(검색기준+검색어·사용자 구분·레벨·사용여부) → 주 필터 1개 = 사용자 구분 FilterChip(툴바 좌)
       + 나머지 = 상세필터 드로어(검색어·검색기준·레벨·사용여부, apfs-detail-filter). 검색어는 이 화면이 opt-in(SEARCHABLE).
   - 계층형 1~3레벨 트리 그리드(＋/－ 펼침)   → AG Grid Community 엔 Tree Data 가 없다(Enterprise) → 목업처럼 **평탄 행 +
       펼침 상태(expanded Set)로 visibleRows 를 React 에서 계산**한다. 필터가 하나라도 걸리면 평면(전체 매칭) 모드(목업 `searching`).
       펼침 토글은 메뉴명 셀의 버튼(aria-expanded) · 툴바 [전체 펼치기/접기] · 우클릭 메뉴 · 메뉴명 셀 Enter(부모 행).
   - 행 선택 → [수정][삭제] 활성(목업 gate)      → 라디오 단일선택 + 툴바 좌 selbar(+ 하위 메뉴 등록). 삭제는 **하위 메뉴가 없을 때만**(목업).
   - 등록/수정 모달(레벨↔상위메뉴 연동·프로그램 검색·단축번호 중복확인) → 전용 `MenuFormModal`(flat 스키마 밖).
       저장 시 같은 부모 안 정렬을 `reseqSiblings` 로 자동 재조정(목업 "저장되었습니다 · 정렬 자동 조정").
   - 메뉴 데이터 = LNB 정본(`admin_menu_tree.ts`) — 목업 "제안서 기능구성도" 대신 현행 메뉴 구조표. 권한 매트릭스와 동일 데이터.
   - 엑셀(리스트 공통 규약) → 푸터 내보내기 아이콘 + ⌥D. 표시 중인 행(트리 순서)을 내보낸다. 마스크 ON이면 텍스트 ''·숫자 0.
   - 정렬(헤더 클릭)은 끈다 — 계층 순서가 곧 의미라 컬럼 정렬이 트리를 깨뜨린다(목업 defaultColDef sortable:false).
   - 페이지네이션 없음 — 트리에서 자식이 다음 페이지로 넘어가면 계층이 끊긴다. 긴 목록은 sticky 헤더(aggrid_shared.css)가 받친다.
   - KPI 배지 행 미포함(사용자 확정) · 카드뷰 없음 · 명세 팝업 없음 · ⚠검토필요 마커 없음(목업 원문 0건).
   ⚠ 백엔드가 없어 여기서의 등록·수정·삭제는 화면 로컬 상태만 바꾸며 실제 LNB 를 바꾸지 않는다(UI 프로토타입). */
import './aggrid_shared.css';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF } from './aggrid_theme';
import { SELECTION_COL } from './aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import { drawerInputStyle as inputStyle } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import { _stopPropagationForAgGrid } from 'ag-grid-community';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent, CellStyle, RowSelectionOptions } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { RowContextMenu } from './row_context_menu';
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { buildMenuRows, childrenOf, hasChildren, programsOf, rowById, utypeLabel, UTYPES } from './admin_menu_tree';
import type { MenuRow, UType } from './admin_menu_tree';
import { reseqSiblings, applyReseq } from './reseq';
import { UseBadge } from './admin_shared';
import { MenuFormModal } from './menu_form_modal';
import type { MenuPatch, MenuPreset } from './menu_form_modal';

const { Button, IconBtn, StatusBadge, FilterChip, ClearableInput } = UI;

/* 검색어 입력 opt-in(apfs-detail-filter) — 목업 검색박스 첫 항목이 검색기준+검색어라 이 화면은 켠다 */
const SEARCHABLE = true;
const SEARCH_FIELDS: { key: keyof MenuRow; label: string }[] = [
  { key: 'name', label: '메뉴명' }, { key: 'code', label: '메뉴ID' }, { key: 'en', label: '메뉴명(영문)' }, { key: 'pname', label: '프로그램명' },
];
const UTYPE_CHIPS = ['', '공통', ...UTYPES] as const;

/* 그리드 행 = 메뉴 행 + 화면 파생값(펼침·자식 유무·상위메뉴명·평면 모드). 렌더러가 data 에서 읽어 columnDefs 를 고정한다 */
type MenuView = MenuRow & { hasKids: boolean; expanded: boolean; parentName: string; flat: boolean };

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 순서(메뉴명·메뉴ID·영문·프로그램명·단축번호·레벨·정렬·사용자 구분·사용여부) + 브리프 보존 항목(프로그램ID·상위메뉴)
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const mono: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' };
const NOSORT = { sortable: false } as const;   // 트리 순서 보존 — 헤더 정렬 금지

/* 메뉴명 셀 — 레벨 들여쓰기 + 펼침 버튼(부모 행·트리 모드). 버튼 클릭이 행 선택으로 번지지 않게 AG Grid 전용 플래그를 세운다
   (React onClickCapture 는 루트 capture 단계라 행의 네이티브 bubble 리스너보다 먼저 돈다). */
function NameCell({ data, toggle }: { data: MenuView; toggle: (id: string) => void }) {
  const mark = (e: { nativeEvent: Event }) => _stopPropagationForAgGrid(e.nativeEvent);
  return (
    <span className="inline-flex items-center gap-1 min-w-0" style={{ paddingLeft: data.flat ? 0 : (data.lvl - 1) * 18 }}>
      {data.hasKids && !data.flat ? (
        <button type="button" aria-expanded={data.expanded} aria-label={`${data.name} 하위 메뉴 ${data.expanded ? '접기' : '펼치기'}`}
          onClickCapture={mark} onDoubleClickCapture={mark} onClick={() => toggle(data.id)}
          className="inline-flex items-center justify-center shrink-0 border-0 bg-transparent cursor-pointer text-muted-foreground rounded-[6px] transition-colors duration-tok-fast ease-ds hover:text-primary hover:bg-muted"
          style={{ width: 24, height: 24, padding: 0 }}>
          <Icon name={data.expanded ? 'chevron-down' : 'chevron-right'} size={15} stroke={2.2} />
        </button>
      ) : <span aria-hidden className="inline-block shrink-0" style={{ width: 24 }} />}
      <span className={data.lvl === 1 ? 'font-semibold' : data.lvl === 2 ? 'font-medium' : ''} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><MT>{data.name}</MT></span>
    </span>
  );
}

const makeColumns = (toggle: (id: string) => void): ColDef<MenuView>[] => [
  { field: 'name', headerName: '메뉴명', flex: 1, width: 300, minWidth: 220, ...NOSORT, cellStyle: flexCenter,
    cellRenderer: (p: any) => (p.data ? <NameCell data={p.data} toggle={toggle} /> : null) },
  { field: 'code', headerName: '메뉴ID', width: 96, ...NOSORT, cellStyle: mono, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'en', headerName: '메뉴명(영문)', width: 240, maxWidth: 240, ...NOSORT, cellStyle: { ...flexCenter, color: 'var(--muted-foreground)' },
    cellRenderer: (p: any) => (p.value ? <MT>{p.value}</MT> : <span>-</span>) },
  { field: 'pid', headerName: '프로그램ID', width: 110, ...NOSORT, cellStyle: mono, cellRenderer: (p: any) => (p.value ? <MT>{p.value}</MT> : <span>-</span>) },
  { field: 'pname', headerName: '프로그램명', width: 200, maxWidth: 280, ...NOSORT, cellStyle: flexCenter,
    cellRenderer: (p: any) => (p.value ? <MT>{p.value}</MT> : <span style={{ color: 'var(--muted-foreground)' }}>-</span>) },
  { field: 'short', headerName: '단축번호', width: 92, ...NOSORT, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' }, valueFormatter: (p) => (p.value ? mn(p.value) : '-') },
  { field: 'lvl', headerName: '레벨', width: 68, ...NOSORT, cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  { field: 'parentName', headerName: '상위메뉴', width: 150, maxWidth: 220, ...NOSORT, cellStyle: { ...flexCenter, color: 'var(--muted-foreground)' },
    cellRenderer: (p: any) => (p.value ? <MT>{p.value}</MT> : <span>-</span>) },
  { field: 'ord', headerName: '정렬', width: 68, ...NOSORT, cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  { field: 'utypes', headerName: '사용자 구분', width: 150, maxWidth: 220, ...NOSORT, cellStyle: flexCenter,
    valueFormatter: (p) => utypeLabel(p.value ?? []),
    cellRenderer: (p: any) => {
      const u: UType[] = p.value ?? [];
      if (!u.length) return <span style={{ color: 'var(--muted-foreground)' }}>공통</span>;
      return <span className="inline-flex items-center gap-1 flex-wrap">{u.map((x) => <StatusBadge key={x} tone="info" label={x} size="md" dot={false} />)}</span>;
    } },
  { field: 'use', headerName: '사용여부', width: 92, ...NOSORT, cellStyle: flexMid, cellRenderer: (p: any) => <UseBadge use={p.value} /> },
];
const ROW_SELECTION: RowSelectionOptions<MenuView> = { mode: 'singleRow', checkboxes: true, enableClickSelection: false };   // 행 본문 클릭 선택 해제 — 체크박스로만 on/off (2026-09-22 사용자 결정, apfs-aggrid "체크박스" 절)

type XCol = { header: string; get: (r: MenuView) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: '메뉴ID', get: (r) => r.code }, { header: '메뉴명', get: (r) => r.name }, { header: '메뉴명(영문)', get: (r) => r.en },
  { header: '프로그램ID', get: (r) => r.pid }, { header: '프로그램명', get: (r) => r.pname }, { header: '단축번호', get: (r) => r.short },
  { header: '레벨', get: (r) => r.lvl }, { header: '상위메뉴', get: (r) => r.parentName }, { header: '정렬', get: (r) => r.ord },
  { header: '사용자 구분', get: (r) => utypeLabel(r.utypes) }, { header: '사용여부', get: (r) => (r.use ? '여' : '부') },
];

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
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

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null | { kind: 'create'; preset?: MenuPreset } | { kind: 'edit'; id: string } | { kind: 'delete'; id: string };

export function MenuManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<MenuView> | null>(null);
  const [rows, setRows] = useState<MenuRow[]>(() => buildMenuRows());
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [selId, setSelId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxMenuState>(null);
  const masked = useMask();

  /* 필터 — 사용자 구분은 툴바 칩, 나머지는 드로어. SSOT=개별 state(빈 값=미적용) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fUtype, setFUtype] = useState<typeof UTYPE_CHIPS[number]>('');
  const [fField, setFField] = useState<keyof MenuRow>('name');
  const [fText, setFText] = useState('');
  const [fLvl, setFLvl] = useState('');
  const [fUse, setFUse] = useState('');
  const clearFilters = () => { setFUtype(''); setFField('name'); setFText(''); setFLvl(''); setFUse(''); };
  const searching = Boolean(fUtype || fText.trim() || fLvl || fUse);   // 목업: 필터가 하나라도 걸리면 평면 모드

  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'create' }), { enabled: modal === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  const programs = useMemo(() => programsOf(rows), [rows]);
  const match = useCallback((r: MenuRow) => {
    if (fLvl && String(r.lvl) !== fLvl) return false;
    if (fUse && (r.use ? '여' : '부') !== fUse) return false;
    if (fUtype) { if (fUtype === '공통') { if (r.utypes.length) return false; } else if (!r.utypes.includes(fUtype as UType)) return false; }
    const kw = fText.trim().toLowerCase();
    if (kw && !String(r[fField] ?? '').toLowerCase().includes(kw)) return false;
    return true;
  }, [fLvl, fUse, fUtype, fText, fField]);

  /* 표시 행 — 트리 모드는 펼친 노드의 자식만, 평면 모드는 전체 매칭. 파생값을 행에 실어 렌더러가 data 만 본다 */
  const visible = useMemo<MenuView[]>(() => {
    const view = (r: MenuRow, flat: boolean): MenuView => ({ ...r, hasKids: hasChildren(rows, r.id), expanded: expanded.has(r.id), parentName: rowById(rows, r.parentId)?.name ?? '', flat });
    if (searching) return rows.filter(match).map((r) => view(r, true));
    const out: MenuView[] = [];
    const walk = (r: MenuRow) => { out.push(view(r, false)); if (expanded.has(r.id)) childrenOf(rows, r.id).forEach(walk); };
    childrenOf(rows, null).forEach(walk);
    return out;
  }, [rows, expanded, searching, match]);

  const toggle = useCallback((id: string) => setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  const columnDefs = useMemo(() => makeColumns(toggle), [toggle]);   // toggle 안정 → 컬럼 고정(폭 되돌림 방지)
  const parentIds = useMemo(() => rows.filter((r) => hasChildren(rows, r.id)).map((r) => r.id), [rows]);
  const allExpanded = parentIds.length > 0 && parentIds.every((id) => expanded.has(id));
  const toggleAll = () => setExpanded(allExpanded ? new Set() : new Set(parentIds));

  /* 선택 SSOT = selId. 새로 만든 행은 onRowDataUpdated 에서 라디오를 되맞춘다 */
  const selIdRef = useRef<string | null>(null); selIdRef.current = selId;
  const onGridReady = useCallback((e: GridReadyEvent<MenuView>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<MenuView>) => { setSelId(e.api.getSelectedRows()[0]?.id ?? null); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<MenuView> }) => {
    /* 펼침 화살표는 셀 '값'(name)이 아니라 data 파생(expanded)이라, getRowId 기반 immutable 갱신에서는
       값 비교 리프레시를 건너뛰어 화살표·aria-expanded 가 얼어붙는다 → 메뉴명 컬럼만 강제 리프레시.
       refreshCells 는 모델을 바꾸지 않으므로 onRowDataUpdated 가 재발화하지 않는다(렌더 루프 없음). */
    e.api.refreshCells({ columns: ['name'], force: true });
    const id = selIdRef.current; if (!id) return;
    const node = e.api.getRowNode(id); if (node && !node.isSelected()) node.setSelected(true, true);
  }, []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<MenuView>) => { if (e.data && !e.rowPinned) setModal({ kind: 'edit', id: e.data.id }); }, []);
  /* Enter — 메뉴명 셀의 부모 행은 펼침 토글(트리 활성화), 그 외는 수정(키보드로 펼침·수정 모두 도달) */
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<MenuView>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    if (e.column.getColId() === 'name' && e.data.hasKids && !e.data.flat) { toggle(e.data.id); return; }
    setModal({ kind: 'edit', id: e.data.id });
  }, [toggle]);

  const selected = selId ? rows.find((r) => r.id === selId) ?? null : null;
  const target = modal && modal.kind !== 'create' ? rows.find((r) => r.id === modal.id) ?? null : null;

  const requestDelete = (r: MenuRow) => {
    if (hasChildren(rows, r.id)) { toast.error('하위 메뉴가 있어 삭제할 수 없습니다.'); return; }
    setModal({ kind: 'delete', id: r.id });
  };
  const handleCellContextMenu = (e: CellContextMenuEvent<MenuView>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [
      { label: '수정', icon: 'file', onSelect: () => setModal({ kind: 'edit', id: row.id }) },
      ...(row.hasKids && !row.flat ? [{ label: row.expanded ? '하위 접기' : '하위 펼치기', icon: row.expanded ? 'chevron-right' : 'chevron-down', onSelect: () => toggle(row.id) } as CtxItem] : []),
      ...(row.lvl < 3 ? [{ label: '하위 메뉴 등록', icon: 'plus', onSelect: () => setModal({ kind: 'create', preset: { lvl: (row.lvl + 1) as MenuRow['lvl'], parentId: row.id } }) } as CtxItem] : []),
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
      'sep',
      { label: '삭제', icon: 'trash', danger: true, onSelect: () => requestDelete(row) },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  /* ── CRUD — 불변 갱신 + 형제 정렬 재배치(reseq) ── */
  const save = (patch: MenuPatch) => {
    if (!modal || modal.kind === 'delete') return;
    if (modal.kind === 'edit' && target) {
      const next = rows.map((r) => (r.id === target.id ? { ...r, ...patch } : r));
      const sibs = childrenOf(next, patch.parentId);
      setRows(applyReseq(next, reseqSiblings(sibs, target.id, patch.ord)));
    } else {
      const row: MenuRow = { id: crypto.randomUUID(), ...patch };
      const next = [...rows, row];
      setRows(applyReseq(next, reseqSiblings(childrenOf(next, patch.parentId), row.id, patch.ord)));
      if (patch.parentId) setExpanded((prev) => new Set([...prev, patch.parentId!]));   // 목업: 부모를 펼쳐 새 행을 보여준다
      setSelId(row.id);
    }
    setModal(null);
    toast.success('저장되었습니다 · 정렬 자동 조정 (목업)');
  };
  const doDelete = () => {
    if (!target) return;
    setRows((prev) => prev.filter((r) => r.id !== target.id));
    if (selId === target.id) setSelId(null);
    toast.success('삭제되었습니다 (목업)');
  };
  const refresh = () => { setRows(buildMenuRows()); setExpanded(new Set()); apiRef.current?.deselectAll(); clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel — 표시 중인 행(트리/평면 순서 그대로). 마스크 ON이면 텍스트 ''·숫자 0 ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => { const v = c.get(r); return typeof v === 'number' ? (masked ? 0 : v) : masked ? '' : v; }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '메뉴명' || c.header === '프로그램명' ? 30 : 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '메뉴 관리');
    XLSX.writeFile(wb, '메뉴관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const chips: [string, string, () => void][] = [
    ['검색어', fText.trim() && `${SEARCH_FIELDS.find((f) => f.key === fField)?.label}: ${fText.trim()}`, () => setFText('')],
    ['레벨', fLvl && `레벨 ${fLvl}`, () => setFLvl('')],
    ['사용여부', fUse, () => setFUse('')],
  ];

  /* 선택 컨텍스트 액션 — GridFrame 이 툴바 좌측과 하단 플로팅 바 **중 한 곳에만** 렌더한다
     (contextActions 슬롯). 그래서 선택 시 toolbarLeft 는 비워 둔다 — 둘 다 넘기면 탭 스톱이 2벌 된다. */
  const selActions = selected ? (
    <>
      <StatusBadge tone="info" label={`레벨 ${selected.lvl}`} size="lg" dot={false} />
      <Button variant="primary" size="sm" onClick={() => setModal({ kind: 'edit', id: selected.id })}>수정</Button>
      {selected.lvl < 3 && <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'create', preset: { lvl: (selected.lvl + 1) as MenuRow['lvl'], parentId: selected.id } })}>하위 메뉴 등록</Button>}
      <Button variant="outline" size="sm" leadingIcon="trash" style={{ color: 'var(--danger)' }} onClick={() => requestDelete(selected)}>삭제</Button>
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '관리자', '시스템 관리', '메뉴관리']}
      title="메뉴관리"
      favRoute="menu-manage"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={selected ? null : (
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {UTYPE_CHIPS.map((u) => <FilterChip key={u || 'all'} active={fUtype === u} onClick={() => setFUtype(u)}>{u || '전체'}</FilterChip>)}
          {/* 적용 중인 상세필터 — 항목별 개별 칩(값만 표시, 항목명은 × aria-label) */}
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
        {/* 전체 펼치기/접기 — 평면(검색) 모드에서는 의미가 없어 비활성 */}
        <Button variant="ghost" size="sm" leadingIcon={allExpanded ? 'collapse-v' : 'expand-v'} disabled={searching} onClick={toggleAll}>{allExpanded ? '전체 접기' : '전체 펼치기'}</Button>
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'create' })}>메뉴 등록</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + mn(String(rows.length)) + '개 메뉴 중 ' + mn(String(visible.length)) + '개 표시 중' + (searching ? ' · 검색 결과(평면)' : '')}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      <div>
        <AgGridReact<MenuView>
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
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          onCellContextMenu={handleCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 메뉴가 없습니다.</span>'}
        />
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />

      {/* ── 상세필터 드로어 — 검색어(opt-in) 최상단 + 검색기준 · 레벨 · 사용여부(목업 검색박스 순서, 사용자 구분은 툴바 칩) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">메뉴 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {SEARCHABLE && (
              <DrawerField label="검색어">
                <ClearableInput type="text" value={fText} onValueChange={setFText} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="검색기준 항목에서 부분일치" clearLabel="검색어 지우기" style={inputStyle('text')} />
              </DrawerField>
            )}
            <DrawerField label="검색기준"><DrawerSelect value={fField as string} onChange={(v) => setFField(v as keyof MenuRow)} options={SEARCH_FIELDS.map((f) => ({ value: f.key as string, label: f.label }))} all={null} /></DrawerField>
            <DrawerField label="레벨"><DrawerSelect value={fLvl} onChange={setFLvl} options={['1', '2', '3'].map((v) => ({ value: v, label: v }))} /></DrawerField>
            <DrawerField label="사용여부"><DrawerSelect value={fUse} onChange={setFUse} options={['여', '부'].map((v) => ({ value: v, label: v }))} /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 등록/수정 모달 — 전용(레벨↔상위·프로그램 검색·단축번호 중복확인) ── */}
      {modal?.kind === 'create' && (
        <MenuFormModal mode="create" preset={modal.preset} rows={rows} programs={programs} onSave={save} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'edit' && target && (
        <MenuFormModal mode="edit" initial={target} rows={rows} programs={programs} onSave={save} onClose={() => setModal(null)}
          onDelete={() => { setModal(null); requestDelete(target); }} />
      )}

      {/* ── 삭제 확인(하위 메뉴 없음 전제) ── */}
      {modal?.kind === 'delete' && target && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>메뉴 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                「<b className="text-foreground"><MT>{target.name}</MT></b>」 메뉴를 삭제할까요?
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
