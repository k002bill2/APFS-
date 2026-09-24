/* 투심보고 확정 및 승인 — 관리형 리스트 페이지 (투자자산관리 > 사후보고관리 > 투심보고 확정 및 승인).
   출처: S1_01_투자심의관리.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(모펀드·운용사·자펀드·계정구분·담당자·투자심의상태·투자심의기간)
       → 투심상태 FilterChip(툴바 좌) + 상세필터 드로어(Sheet, apfs-detail-filter)
   - 목록 그리드 + 합계행     → AG Grid + pinnedBottom(useMemo 재계산, apfs-aggrid). 투자금액·승인금액 합계
   - 심사단계 워크플로우      → 행 선택 시 툴바 좌에 그 단계의 컨텍스트 액션 → 단계 전이(apfs-stage-workflow)
       ⚠ 목업은 그리드 셀 안 인라인 <select>로 확정/승인을 전이했으나, 규약(인라인 전이 금지)에 따라
         툴바 컨텍스트 액션으로 옮긴다. 두 컬럼(투심일정 확정여부·투심결과 승인여부)은 읽기전용 StatusBadge로 유지.
       파생 단계: 미확정 → 확정(AlertDialog 확인) → 미결 → 가결/부결/조건부/보류, 미확정→투심위취소, 가결/조건부→승인취소.
   - 투자준법감시내역 CRUD    → 별개 엔티티. [준법감시 등록|수정] 1버튼(상태별) + [삭제](있을 때만). RowFormModal(apfs-form-modal)
   - 상세(명세) 팝업          → opt-in(기본 미포함, 2026-09-11 사용자 결정 "필요할 때 생성"). 필요 시 apfs-spec-popup 규약으로 재생성
   - 엑셀                     → SheetJS(단일 헤더)
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭은 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유). */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, numFmt, numStyle, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF } from './aggrid_theme';
import { SELECTION_COL, restoreSelection } from './aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import { controlMinWidth, drawerInputStyle as inputStyle } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, IRowNode, ValueFormatterParams, CellStyle, RowSelectionOptions } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { RowFormModal } from './generic_list_modal';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { PeriodPicker } from './ui/period-picker';
import { COMPLIANCE_SCHEMA } from './investment_review_manage_schemas';
import { INV_REVIEW_ROWS } from './investment_review_data';
import type { Confirm, Result, InvReviewRow } from './investment_review_data';
export type { Confirm, Result, InvReviewRow } from './investment_review_data';

const { Button, IconBtn, StatusBadge, FilterChip } = UI;

/* ──────────────────────────────
   도메인 타입 · 상태 도메인
────────────────────────────── */
const CONFIRM_TONE: Record<Confirm, Tone> = { 미확정: 'info', 확정: 'primary', 투심위취소: 'warning' };
const RES_TONE: Record<string, Tone> = { 미결: 'info', 가결: 'success', 부결: 'danger', 조건부: 'cyan', 보류: 'warning', 승인취소: 'warning' };
const ST_TONE: Record<string, Tone> = { 일정: 'info', 결과: 'success' };
/* 투심상태(일정/결과)는 res에서 파생 — 미결/미입력이면 '일정', 결과가 나오면 '결과'(목업 주석 307행) */
const stOf = (r: InvReviewRow) => (r.res && r.res !== '미결' ? '결과' : '일정');

/* 파생 심사단계 — 액션 맵 키. confirm·res 조합에서 산출(SSOT) */
type Stage = 'pending' | 'cancelled' | 'confirmed' | 'held' | 'approved' | 'rejected' | 'revoked';
const stageOf = (r: InvReviewRow): Stage => {
  if (r.confirm === '투심위취소') return 'cancelled';
  if (r.confirm === '미확정') return 'pending';
  if (!r.res || r.res === '미결') return 'confirmed';
  if (r.res === '보류') return 'held';
  if (r.res === '가결' || r.res === '조건부') return 'approved';
  if (r.res === '부결') return 'rejected';
  if (r.res === '승인취소') return 'revoked';
  return 'confirmed';
};

/* 명세(읽기전용 상세) 팝업은 opt-in — 이 페이지 미포함(2026-09-11 사용자 결정). 포함 시 detail 구조·데이터를
   행에 다시 실어 InvReviewSpecModal을 재생성한다(apfs-spec-popup). 지금은 그리드에 안 쓰이므로 두지 않는다. */

/* 목록 행 = 원문 S1_01 `var DATA` 3건(investment_review_data.ts — 합성 행 없음). 새로고침은 이 원본으로 되돌린다 */
const DEMO: InvReviewRow[] = [...INV_REVIEW_ROWS];

/* 합계 대상(가산 가능한 금액만) — 투자금액·승인금액 */
const SUM_KEYS = ['inv', 'appr'] as const;
function computeTotal(rows: InvReviewRow[]): InvReviewRow {
  const t: any = { id: '__total', no: 0, gp: '', fn: '', co: '', dt: '', ty: '', ob: '', sm: '', ag: '', confirm: '미확정', pay: '', res: '' };
  for (const k of SUM_KEYS) t[k] = rows.reduce((a, r) => a + (r[k] ?? 0), 0);
  return t as InvReviewRow;
}
const PAGE_SIZE = 20;
/* 라디오 단일선택 — 체크박스로만 on/off(행 본문 클릭 선택 해제, 2026-09-22 사용자 결정). 모듈 상수로 호이스팅(apfs-aggrid 계약 6 — 인라인 리터럴은 렌더마다 컬럼 재생성→폭 되돌림). */
/* 다중 선택이 기본(2026-09-23 사용자 결정 — 전 리스트 공통). 단일 대상 액션은 selCount===1 에서만 노출한다.
   행 본문 클릭 선택 해제 — 체크박스로만 on/off (2026-09-22, apfs-aggrid "체크박스" 절) */
const ROW_SELECTION: RowSelectionOptions<InvReviewRow> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };
const today = () => format(new Date(), 'yyyy-MM-dd');   // 로컬 달력일(toISOString은 KST 00~09시 전날, apfs-datepicker 계약)

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 순서 그대로(단일 헤더). No·운용사·자펀드 좌측 고정
────────────────────────────── */
const nullFmt = (p: ValueFormatterParams) => (p.value == null ? '-' : numFmt(p));
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

const txt = (field: keyof InvReviewRow, header: string, width: number, center?: boolean): ColDef<InvReviewRow> => ({
  field, headerName: header, width, cellStyle: center ? flexMid : flexCenter,
  cellRenderer: (p: any) => (p.node.rowPinned ? null : p.value),
});
const date = (field: keyof InvReviewRow, header: string, width = 128): ColDef<InvReviewRow> => ({
  field, headerName: header, width, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' },
  valueFormatter: (p) => (p.node?.rowPinned ? '' : String(p.value)),
});
const amt = (field: keyof InvReviewRow, header: string, strong?: boolean, width = 150): ColDef<InvReviewRow> => ({
  field, headerName: header, width, type: 'rightAligned', valueFormatter: nullFmt, cellStyle: numStyle(strong) as any,
});
/* 상태 배지 컬럼(읽기전용) — 전이는 툴바 액션에서만(apfs-stage-workflow 규약 1) */
const badge = (field: keyof InvReviewRow, header: string, width: number, toneMap: Record<string, Tone>, fallback = ''): ColDef<InvReviewRow> => ({
  field, headerName: header, width, cellStyle: flexMid, sortable: true,
  cellRenderer: (p: any) => {
    if (p.node.rowPinned) return null;
    const val = (p.value as string) || fallback;
    if (!val) return null;
    return <StatusBadge tone={toneMap[val] ?? 'info'} label={val} size="lg" />;
  },
});

const columnDefs: ColDef<InvReviewRow>[] = [
  { field: 'no', headerName: 'No', width: 68, pinned: 'left', cellStyle: centerNum,
    valueFormatter: (p) => (p.node?.rowPinned ? '합 계' : String(p.value)) },
  { ...txt('gp', '운용사', 180), maxWidth: 240, pinned: 'left' },
  { ...txt('fn', '자펀드', 220), maxWidth: 320, pinned: 'left', cellRenderer: (p: any) => (p.node.rowPinned ? null : <span className="font-semibold">{p.value}</span>) },
  { ...txt('co', '투자기업', 160), maxWidth: 240 },
  { colId: 'st', headerName: '투심상태', width: 96, cellStyle: flexMid, sortable: true,
    valueGetter: (p) => (p.data ? stOf(p.data) : ''),
    cellRenderer: (p: any) => (p.node.rowPinned ? null : <StatusBadge tone={ST_TONE[p.value] ?? 'info'} label={p.value} size="lg" />) },
  date('dt', '투심일자'),
  amt('inv', '투자금액', true),
  txt('ty', '투자유형', 120, true),
  txt('ob', '의무투자', 92, true), txt('sm', '일정규모 이하투자', 128, true), txt('ag', '농어업투자', 100, true),
  badge('confirm', '투심일정 확정여부', 132, CONFIRM_TONE),
  amt('appr', '승인금액', false),
  date('pay', '투자금납입 예정일', 140),
  badge('res', '투심결과 승인여부', 132, RES_TONE, '미결'),
];

/* 엑셀 컬럼(단일 헤더) — 그리드 cellRenderer와 분리해 값 추출을 명시(파생 st·미결 fallback 포함) */
type XCol = { header: string; get: (r: InvReviewRow) => string | number | null; num?: boolean };
const EXPORT_COLS: XCol[] = [
  { header: 'No', get: (r) => r.no },
  { header: '운용사', get: (r) => r.gp }, { header: '자펀드', get: (r) => r.fn }, { header: '투자기업', get: (r) => r.co },
  { header: '투심상태', get: (r) => stOf(r) }, { header: '투심일자', get: (r) => r.dt },
  { header: '투자금액', get: (r) => r.inv, num: true }, { header: '투자유형', get: (r) => r.ty },
  { header: '의무투자', get: (r) => r.ob }, { header: '일정규모 이하투자', get: (r) => r.sm }, { header: '농어업투자', get: (r) => r.ag },
  { header: '투심일정 확정여부', get: (r) => r.confirm }, { header: '승인금액', get: (r) => r.appr, num: true },
  { header: '투자금납입 예정일', get: (r) => r.pay }, { header: '투심결과 승인여부', get: (r) => r.res || '미결' },
];

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer motion-safe:active:scale-[.97]"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

function DrawerField({ label, noop, plain, children }: { label: string; noop?: boolean; plain?: boolean; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}{noop && <span className="font-normal text-caption" style={{ fontSize: 12 }}> · 데이터 연동 후 적용</span>}
      </span>
      {children}
    </Wrap>
  );
}
function DrawerSelect({ value, onChange, options, all = '전체' }: { value: string; onChange: (v: string) => void; options: string[]; all?: string }) {
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        <option value="">{all}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}

/* 투심결과 입력 드롭다운 — 확정·미결/보류 단계에서 결과를 하나 고른다(툴바 1곳 규약, 버튼 폭발 방지).
   ⚠ UI.Button은 ...rest/forwardRef가 없어 <DropdownMenuTrigger asChild><Button>이 Radix의 onPointerDown·ref를
     못 받아 메뉴가 안 열린다(2026-09-11 런타임 확인). 골드 MoreMenu처럼 트리거에 스타일을 직접 얹는다.
   className은 UI.Button `size="sm" variant="primary"`와 **완전히 동일**(px-[11px] py-1.5 text-[12.5px] gap-[7px])하게
   맞춰 옆 버튼들과 높이가 정렬된다(고정 height 금지 — 패딩+라인하이트로 29px, motion만 없음). */
function ResultMenu({ options, onPick }: { options: Result[]; onPick: (v: Result) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="ui-btn ui-primary inline-flex items-center justify-center gap-[7px] cursor-pointer font-[inherit] font-semibold rounded-[9px] whitespace-nowrap border border-transparent transition-colors duration-tok-fast ease-ds px-[11px] py-1.5 text-[12.5px] bg-primary text-primary-foreground hover:opacity-90 data-[state=open]:opacity-90">
        투심결과 입력
        <Icon name="chevron-down" size={14} stroke={2.2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((o) => <DropdownMenuItem key={o} onSelect={() => onPick(o)}>{o}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null | { kind: 'complianceReg' } | { kind: 'complianceEdit' } | { kind: 'complianceDelete' } | { kind: 'confirmSchedule' };

export function InvestmentReviewManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<InvReviewRow> | null>(null);
  const [rows, setRows] = useState<InvReviewRow[]>(DEMO);
  /* 선택 SSOT — 체크된 행 id 배열. selId(첫 행)·selCount 는 파생이라 둘이 어긋날 수 없다(Codex 리뷰 2026-09-23) */
  const [selIds, setSelIds] = useState<string[]>([]);
  const selId = selIds[0] ?? null;      // 단일 액션 대상(선택 1건일 때만 쓴다)
  const selCount = selIds.length;       // 단일/다건 분기의 SSOT
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const [modal, setModal] = useState<ModalState>(null);
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  /* 필터 — 투심상태(일정/결과)는 툴바 칩, 나머지는 드로어. SSOT=개별 state(빈 값=미적용) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fState, setFState] = useState<'' | '일정' | '결과'>('');
  const [fGp, setFGp] = useState('');
  const [fFund, setFFund] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fMf, setFMf] = useState('');        // 모펀드 — 행 컬럼 아님(no-op)
  const [fAg, setFAg] = useState('');        // 계정구분 — 행 컬럼 아님(no-op)
  const [fMgr, setFMgr] = useState('');      // 담당자 — 동적 사용자 데이터(no-op)
  const clearFilters = () => { setFState(''); setFGp(''); setFFund(''); setFFrom(''); setFTo(''); setFMf(''); setFAg(''); setFMgr(''); };

  const passes = useCallback((r: InvReviewRow) => {
    if (fState && stOf(r) !== fState) return false;
    if (fGp && r.gp !== fGp) return false;
    if (fFund && r.fn !== fFund) return false;
    if (fFrom && r.dt < fFrom) return false;
    if (fTo && r.dt > fTo) return false;
    return true;
  }, [fState, fGp, fFund, fFrom, fTo]);
  const filterActive = Boolean(fState || fGp || fFund || fFrom || fTo);
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<InvReviewRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);
  const pinnedBottom = useMemo(() => [computeTotal(filteredRows)], [filteredRows]);
  const gpOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.gp))), [rows]);
  const fundOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.fn))), [rows]);

  /* 선택 SSOT = selIds(배열). multiRow 라 복원도 **선택 전체**를 되돌린다 — 첫 id 만 되살리면 clearSelection 이
     나머지 체크를 지워 사용자가 아무것도 안 했는데 다건 선택이 1건으로 줄어든다(Codex 리뷰 2026-09-23). */
  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  const onGridReady = useCallback((e: GridReadyEvent<InvReviewRow>) => {
    apiRef.current = e.api;
    restoreSelection(e.api, selIdsRef.current);
  }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<InvReviewRow>) => {
    setSelIds(e.api.getSelectedRows().map((r) => r.id));
  }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<InvReviewRow> }) => {
    restoreSelection(e.api, selIdsRef.current);
  }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);

  /* 단일 대상 액션은 **정확히 1건** 체크일 때만 — 다건 선택에 단건 모달·전이는 의미가 없다(2026-09-23) */
  const single = selCount === 1 && selId ? rows.find((r) => r.id === selId) ?? null : null;
  const patchRow = (id: string, patch: Partial<InvReviewRow>) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  /* ── 심사단계 워크플로우: 전이는 오직 컨텍스트 액션으로(apfs-stage-workflow) ── */
  const stage = single ? stageOf(single) : null;
  const setConfirm = (v: Confirm) => { if (single) patchRow(single.id, { confirm: v, ...(v !== '확정' ? { res: '' as Result } : {}) }); };
  const confirmSchedule = () => {   // AlertDialog '확정' 확인 후
    if (!single) return;
    patchRow(single.id, { confirm: '확정', res: '미결' });
    toast.success('투심일정이 확정되었습니다');
  };
  const setResult = (v: Result) => { if (single) { patchRow(single.id, { res: v }); toast.success(`투심결과가 '${v}'(으)로 반영되었습니다`); } };
  const cancelReview = () => { if (single) { patchRow(single.id, { confirm: '투심위취소', res: '' }); toast.success('투심위가 취소되었습니다'); } };
  const revokeApproval = () => { if (single) { patchRow(single.id, { res: '승인취소' }); toast.success('승인이 취소되었습니다'); } };
  const unconfirm = () => { if (single) { setConfirm('미확정'); toast.success('확정이 해제되었습니다'); } };

  /* 선택 해제 — React selId가 SSOT(stage-workflow 규약 9). 카드뷰에선 그리드가 unmount라 apiRef가 stale →
     deselectAll만으론 onSelectionChanged가 안 깨워져 selId가 남는다(Codex P2). selId를 직접 비우고 그리드는 따라오게 한다. */
  const clearSelection = () => { setSelIds([]); apiRef.current?.deselectAll(); };
  const refresh = () => { setRows([...DEMO]); setSelIds([]); apiRef.current?.deselectAll(); clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 단일 헤더, 합계행 재현 ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const src = [...filteredRows, pinnedBottom[0]];
    const body = src.map((r, i) => EXPORT_COLS.map((c) => {
      if (c.header === 'No') return i === src.length - 1 ? '합 계' : r.no;
      const v = c.get(r);
      if (c.num) return v == null ? '' : v;
      return (v ?? '');
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    src.forEach((r, i) => EXPORT_COLS.forEach((c, j) => {
      if (!c.num) return; const v = c.get(r); if (v == null) return;
      const a = XLSX.utils.encode_cell({ r: i + 1, c: j });
      if (ws[a]) ws[a].z = '#,##0';
    }));
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '자펀드' ? 30 : c.num ? 16 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '투심보고 확정 및 승인');
    XLSX.writeFile(wb, '투심보고 확정 및 승인.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  /* ── 준법감시내역 저장(등록/수정 공용) ── */
  const saveCompliance = (rec: any) => {
    if (!single) return;
    const isNew = !single.compliance;
    patchRow(single.id, { compliance: rec });
    setModal(null);
    toast.success(isNew ? '투자준법감시내역이 등록되었습니다' : '수정되었습니다');
  };
  const deleteCompliance = () => { if (single) { patchRow(single.id, { compliance: null }); toast.success('삭제되었습니다'); } };
  const complianceInitial = single
    ? { ...(single.compliance ?? {}), gp: single.gp, fn: single.fn, ...(single.compliance ? {} : { co: single.co, baseDate: today() }) }
    : undefined;

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  /* 선택 컨텍스트 액션 — GridFrame 이 툴바 좌측과 하단 플로팅 바 **중 한 곳에만** 렌더한다
     (contextActions 슬롯). 그래서 선택 시 toolbarLeft 는 비워 둔다 — 둘 다 넘기면 탭 스톱이 2벌 된다. */
  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      {single && <>
      {/* 확정여부 배지 + (확정 시)결과 배지 — 상태 표시. 전이는 아래 액션 버튼 */}
      <StatusBadge tone={CONFIRM_TONE[single.confirm]} label={single.confirm} size="lg" />
      {single.confirm === '확정' && <StatusBadge tone={RES_TONE[single.res || '미결'] ?? 'info'} label={single.res || '미결'} size="lg" />}
      {/* 파생 단계별 전이 액션 */}
      {stage === 'pending' && <>
        <Button variant="primary" size="sm" onClick={() => setModal({ kind: 'confirmSchedule' })}>투심일정 확정</Button>
        <Button variant="outline" size="sm" onClick={cancelReview}>투심위 취소</Button>
      </>}
      {stage === 'confirmed' && <>
        <ResultMenu options={['가결', '부결', '조건부', '보류']} onPick={setResult} />
        <Button variant="outline" size="sm" onClick={unconfirm}>확정 해제</Button>
      </>}
      {stage === 'held' && <ResultMenu options={['가결', '부결', '조건부']} onPick={setResult} />}
      {stage === 'approved' && <Button variant="outline" size="sm" onClick={revokeApproval}>승인 취소</Button>}
      {/* 투자준법감시내역 CRUD — 별개 엔티티. 상태별 1버튼 + 삭제(있을 때만) */}
      <Button variant="outline" size="sm" leadingIcon={single.compliance ? 'shield' : 'plus'}
        onClick={() => setModal({ kind: single.compliance ? 'complianceEdit' : 'complianceReg' })}>
        {single.compliance ? '준법감시 수정' : '준법감시 등록'}
      </Button>
      {single.compliance && <Button variant="ghost" size="sm" leadingIcon="trash" style={{ color: 'var(--danger)' }} onClick={() => setModal({ kind: 'complianceDelete' })}>준법감시 삭제</Button>}
      </>}
      <Button variant="ghost" size="sm" onClick={clearSelection}>선택 해제</Button>
    </>
  ) : null;
  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '사후보고관리', '투심보고 확정 및 승인']}
      title="투심보고 확정 및 승인"
      cardTitle="투심보고 확정 및 승인"
      favRoute="investment-review"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={selCount > 0 ? null : (
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {(['' as const, '일정' as const, '결과' as const]).map((s) => (
            <FilterChip key={s || 'all'} active={fState === s} onClick={() => setFState(s)}>{s || '투자심의상태: 전체'}</FilterChip>
          ))}
        </>
      )}
      appliedFilters={[
        { label: '운용사', value: fGp, onClear: () => setFGp('') },
        { label: '자펀드', value: fFund, onClear: () => setFFund('') },
        { label: '투자심의기간', value: fFrom || fTo ? `${fFrom || '…'} ~ ${fTo || '…'}` : '', onClear: () => { setFFrom(''); setFTo(''); } },
      ]}
      contextActions={selActions}
      toolbarRight={<>
        <span className="text-caption font-semibold whitespace-nowrap" style={{ fontSize: 12, marginRight: 6 }}>단위: 원</span>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + String(filteredRows.length) + '개 중 ' + String(Math.min(shown, filteredRows.length)) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
          <AgGridReact<InvReviewRow>
            theme={apfsTheme}
            rowData={rows}
            columnDefs={columnDefs}
            getRowId={(p) => p.data.id}
            pinnedBottomRowData={pinnedBottom}
            domLayout="autoHeight"
            autoSizeStrategy={AUTO_SIZE_CONTENT}
            defaultColDef={DEFAULT_COL_DEF}
            rowSelection={ROW_SELECTION}
            selectionColumnDef={SELECTION_COL}
            pagination paginationPageSize={pageSize} suppressPaginationPanel
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
            onGridReady={onGridReady}
            onSelectionChanged={onSelectionChanged}
            onRowDataUpdated={onRowDataUpdated}
            onPaginationChanged={onPaginationChanged}
            overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 투자심의 건이 없습니다.</span>'}
          />
        </div>

      {/* ── 상세필터 드로어 — 검색어는 미사용(OFF). 컬럼 미연동 필터는 caption으로 no-op(apfs-detail-filter) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">투자심의 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {/* 검색어 입력은 기본 OFF(apfs-detail-filter opt-in 규약) — 이 페이지는 미사용이라 렌더하지 않는다.
                목업 검색박스 항목 순서: 모펀드·운용사·자펀드·계정구분·담당자·투자심의상태·투자심의기간.
                그리드 컬럼과 미연동인 항목(모펀드·계정구분·담당자)은 noop 캡션. 기간은 PeriodPicker day 2개(apfs-datepicker) */}
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={['농식품모태펀드', 'MOAF']} /></DrawerField>
            <DrawerField label="운용사"><DrawerSelect value={fGp} onChange={setFGp} options={gpOptions} /></DrawerField>
            <DrawerField label="자펀드"><DrawerSelect value={fFund} onChange={setFFund} options={fundOptions} /></DrawerField>
            <DrawerField label="계정구분" noop><DrawerSelect value={fAg} onChange={setFAg} options={['농식품', '수산']} /></DrawerField>
            <DrawerField label="담당자" noop><DrawerSelect value={fMgr} onChange={setFMgr} options={['양한솔', '이성훈']} /></DrawerField>
            <DrawerField label="투자심의상태"><DrawerSelect value={fState} onChange={(v) => setFState(v as '' | '일정' | '결과')} options={['일정', '결과']} /></DrawerField>
            <DrawerField label="투자심의기간" plain>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}><PeriodPicker mode="day" value={fFrom} onChange={setFFrom} ariaLabel="투자심의기간 시작일" /></div>
                <span className="text-caption">~</span>
                <div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}><PeriodPicker mode="day" value={fTo} onChange={setFTo} ariaLabel="투자심의기간 종료일" /></div>
              </div>
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 투자준법감시내역 등록/수정 — 스키마 주도(apfs-form-modal). 제목은 상태별 title ── */}
      {modal?.kind === 'complianceReg' && single && (
        <RowFormModal mode="create" schema={COMPLIANCE_SCHEMA} title="투자준법감시내역 등록"
          initial={complianceInitial as any} onSave={saveCompliance} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'complianceEdit' && single && (
        <RowFormModal mode="edit" schema={COMPLIANCE_SCHEMA} title="투자준법감시내역 수정"
          initial={complianceInitial as any} onSave={saveCompliance} onClose={() => setModal(null)} />
      )}

      {/* ── 투심일정 확정 확인(목업 클라이언트 회신 명시 UX — toast로 격하 금지) ── */}
      {modal?.kind === 'confirmSchedule' && single && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>투심일정 확정</AlertDialogTitle>
              <AlertDialogDescription>투심일정을 확정하시겠습니까? 확정 후 투심결과 승인여부를 입력할 수 있습니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSchedule}>확정</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── 준법감시내역 삭제 확인 ── */}
      {modal?.kind === 'complianceDelete' && single && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>투자준법감시내역 삭제</AlertDialogTitle>
              <AlertDialogDescription><b className="text-foreground">{single.co}</b> · {single.fn} 건의 투자준법감시내역을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={deleteCompliance} style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </GridFrame>
  );
}
