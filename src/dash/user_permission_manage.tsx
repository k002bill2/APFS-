/* 사용자 권한 관리 — 관리형 리스트 페이지 (관리자 > 사용자 관리 > 사용자 권한 관리).
   출처: S0_102_권한관리.html(AFIT 공통관리 KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스 없음(목업 원본)                 → 원래는 필터를 두지 않았으나 **사용자 지시(2026-09-15 "상세필터 추가해줘")로
       상세필터 드로어를 추가**했다. 항목은 그리드 컬럼에서만 파생(명칭·사용자 구분·사용여부·최종수정일) — 컬럼에 없는
       조건은 여전히 발명하지 않는다(apfs-detail-filter). 주 필터 FilterChip 줄은 두지 않는다(행 5건 규모라 과하다):
       적용값은 툴바 좌측 개별 칩으로만 보이고, 선택 행이 있으면 그 자리는 selbar 가 가져간다(메뉴 관리와 동일).
   - 권한 목록 그리드(No·명칭·사용자 구분·설명·최종수정·최종수정일·사용여부·사용자수) → AG Grid 단일 헤더(apfs-aggrid).
   - 행 선택 → [수정][복사][삭제] 활성(목업 gate)  → 라디오 단일선택 + 툴바 좌 selbar 컨텍스트 액션(apfs-stage-workflow 선택 SSOT).
       삭제는 **배정 사용자 0명**일 때만(목업) — 아니면 toast 로 사유를 알린다. 수정 진입 보조 경로 = 행 더블클릭·셀 Enter·우클릭 메뉴.
   - 권한 설정 모달(명칭·사용자 구분·설명·사용여부 + 메뉴별 기능 권한 매트릭스) → 전용 `UserPermissionModal`
       (flat 스키마 밖 — 매트릭스). 등록/수정/복사 3모드, 복사는 명칭 뒤 ' (복사)' + 사용자수 0.
   - 매트릭스 메뉴 트리 = LNB 정본(`admin_menu_tree.ts`) — 목업 "제안서 기능구성도" 대신 현행 메뉴 구조표.
   - 엑셀(목업 없음이지만 리스트 공통 규약) → RegisterCombo ⌄ 항목 + 푸터 download + ⌥D. 마스크 ON이면 텍스트 ''·숫자 0.
   - KPI 배지 행 미포함(사용자 확정) · 카드뷰 없음 · 명세 팝업 없음 · ⚠검토필요 마커 없음(목업 원문 0건).
   ⚠ 실제 인가/RBAC 이 아니다 — 백엔드 없이 화면 로컬 더미 상태만 바꾼다(브리프). 목업의 설계 메모(.note)·GNB/LNB 는 이식하지 않는다. */
import './aggrid_shared.css';   // 공유 보정 CSS(헤더 sticky·마스크 헤더 바)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { format } from 'date-fns';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF } from './aggrid_theme';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent, CellStyle, RowSelectionOptions } from 'ag-grid-community';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { PeriodPicker } from './ui/period-picker';
import { controlMinWidth } from './schemas/renderers';
import { RowContextMenu } from './row_context_menu';
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { buildMenuRows, UTYPES } from './admin_menu_tree';
import { UseBadge, UTypeBadge } from './admin_shared';
import { UserPermissionModal } from './user_permission_modal';
import type { PermRow, PermPatch, PermMode } from './user_permission_modal';
import { matrixRows, grant, PERM_KEYS, permNameTaken } from './user_permission_model';
import type { PermMap } from './user_permission_model';

const { Button, IconBtn } = UI;

/* ──────────────────────────────
   데모 데이터 — 목업 rows 5건 그대로 + 권한 시드(목업 ROLES 를 LNB 대분류에 매핑)
────────────────────────────── */
const MENU_ROWS = buildMenuRows();               // 매트릭스 트리(정적 — LNB 정본)
const MX = matrixRows(MENU_ROWS);
const by = (...daes: string[]) => (r: { dae: string }) => daes.includes(r.dae);
/* 목업 ROLES: 투자팀=투자자산·조기경보·보고·수탁·부처·감사 조회 + 자펀드 등록/수정/다운로드 + 보고 다운로드,
   운용사=자펀드 조회 + 보고 전권(관리자 제외), 수탁=자펀드 조회 + 수탁보고 전권(관리자 제외), 부처=부처보고 조회·다운로드 */
const SEED: Record<string, PermMap> = {
  '전산(관리자)': grant({}, MX, () => true, PERM_KEYS),
  '투자팀': grant(grant(grant({}, MX, by('대시보드', '투자자산관리', '조기경보', '자펀드 보고', '수탁보고', '부처보고'), ['v']), MX, by('투자자산관리'), ['d', 'c']), MX, by('자펀드 보고'), ['d']),
  '운용사': grant(grant({}, MX, by('대시보드', '투자자산관리'), ['v']), MX, by('자펀드 보고'), ['v', 'd', 'c']),
  '수탁': grant(grant({}, MX, by('대시보드', '투자자산관리'), ['v']), MX, by('수탁보고'), ['v', 'd', 'c']),
  '부처': grant(grant({}, MX, by('대시보드'), ['v']), MX, by('부처보고'), ['v', 'd']),
};
const DEMO: PermRow[] = [
  { id: 'p-1', no: 1, name: '전산(관리자)', utype: '농금원', desc: '전산 시스템 관리자(최고책임자)', by: 'admin', at: '2026-07-24', use: true, users: 1, perms: SEED['전산(관리자)'] },
  { id: 'p-2', no: 2, name: '투자팀', utype: '농금원', desc: '농금원 투자팀 권한', by: 'admin', at: '2026-08-04', use: true, users: 6, perms: SEED['투자팀'] },
  { id: 'p-3', no: 3, name: '운용사', utype: '운용사', desc: '운용사(GP) 권한', by: 'admin', at: '2026-08-04', use: true, users: 12, perms: SEED['운용사'] },
  { id: 'p-4', no: 4, name: '수탁', utype: '수탁', desc: '수탁기관 권한', by: 'admin', at: '2026-08-04', use: true, users: 4, perms: SEED['수탁'] },
  { id: 'p-5', no: 5, name: '부처', utype: '부처', desc: '부처(농식품부·해양수산부) 권한', by: 'admin', at: '2026-08-26', use: true, users: 2, perms: SEED['부처'] },
];
const PAGE_SIZE = 20;
const today = () => format(new Date(), 'yyyy-MM-dd');

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 순서 그대로. 폭 prop 은 aggrid_theme 공용 상수만(인라인 금지 — 그 파일 주석)
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };

const columnDefs: ColDef<PermRow>[] = [
  { field: 'no', headerName: 'No', width: 64, maxWidth: 64, cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  { field: 'name', headerName: '명칭', width: 170, minWidth: 130, maxWidth: 260, cellStyle: flexCenter,
    cellRenderer: (p: any) => <span className="font-semibold"><MT>{p.value}</MT></span> },
  { field: 'utype', headerName: '사용자 구분', width: 116, maxWidth: 116, cellStyle: flexMid,
    cellRenderer: (p: any) => <UTypeBadge value={p.value} /> },
  /* 설명이 남는 폭을 흡수한다 — flex:1 인 유일한 컬럼(aggrid_theme: autoSizeStrategy 대신 flex) */
  { field: 'desc', headerName: '설명', flex: 1, width: 300, minWidth: 200, cellStyle: flexCenter, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'by', headerName: '최종수정', width: 112, maxWidth: 112, cellStyle: muted, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'at', headerName: '최종수정일', width: 126, maxWidth: 126, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' }, valueFormatter: (p) => mn(p.value) },
  { field: 'use', headerName: '사용여부', width: 96, maxWidth: 96, cellStyle: flexMid, cellRenderer: (p: any) => <UseBadge use={p.value} /> },
  { field: 'users', headerName: '사용자수', width: 96, maxWidth: 96, type: 'rightAligned', cellStyle: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
    valueFormatter: (p) => mn(String(p.value)) },
];
/* 라디오 단일선택 — 모듈 상수(인라인 리터럴은 렌더마다 컬럼 재생성 → 폭 되돌림, apfs-aggrid ⑦) */
const ROW_SELECTION: RowSelectionOptions<PermRow> = { mode: 'singleRow', checkboxes: true, enableClickSelection: true };
const SELECTION_COL = { pinned: 'left' as const, width: 44, maxWidth: 44 };

type XCol = { header: string; get: (r: PermRow) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: 'No', get: (r) => r.no }, { header: '명칭', get: (r) => r.name }, { header: '사용자 구분', get: (r) => r.utype },
  { header: '설명', get: (r) => r.desc }, { header: '최종수정', get: (r) => r.by }, { header: '최종수정일', get: (r) => r.at },
  { header: '사용여부', get: (r) => (r.use ? '여' : '부') }, { header: '사용자수', get: (r) => r.users },
];

/* 드로어 입력 — 폭 fit-content + 타입별 하한(controlMinWidth SSOT). ⚠ font(단축) 먼저 → fontSize 뒤(키 순서로 14px 보존) */
const inputStyle = (kind?: string): CSSProperties => ({
  width: 'fit-content', minWidth: controlMinWidth(kind), maxWidth: '100%', boxSizing: 'border-box', padding: '9px 11px', font: 'inherit', fontSize: 14,
  border: '1px solid var(--input)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)',
});
/* plain=true → <label> 대신 <div>: PeriodPicker 트리거는 <button>이라 <label> 암묵 연결이 안 되고(ariaLabel 로 명명),
   <label> 안 버튼 클릭이 라벨 활성화와 겹쳐 2회 토글되는 것을 막는다(apfs-detail-filter) */
function DrawerField({ label, hint, plain, children }: { label: string; hint?: string; plain?: boolean; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}{hint && <span className="font-normal text-caption" style={{ fontSize: 12 }}> · {hint}</span>}
      </span>
      {children}
    </Wrap>
  );
}
function DrawerSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  // 래퍼도 fit-content — block 100% 래퍼면 절대배치 chevron 이 드로어 오른쪽 끝으로 떨어진다(형제 드로어와 동일)
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        <option value="">전체</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
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

/* 보조 액션 항목(내보내기·인쇄) — 푸터 폴백 kebab과 툴바 combo가 **같은 조각**을 공유한다 */
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

/* kebab(···) — **푸터 폴백 전용**(등록이 있는 리스트의 툴바에는 RegisterCombo ⌄가 같은 항목을 제공, apfs-grid) */
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

/* 등록 combo(split) 버튼 — generic_list.tsx/subfund_manage.tsx 로컬 복사본(공유 export 아님). 함정 근거는 apfs-grid 스킬. */
function RegisterCombo({ label, onRegister, onExport }: { label: string; onRegister: () => void; onExport: () => void }) {
  return (
    <span className="inline-flex items-stretch rounded-[9px] border border-border-strong bg-card">
      <button type="button" onClick={onRegister}
        className="inline-flex items-center gap-[7px] rounded-l-[9px] border-0 bg-transparent px-[11px] py-1.5 font-[inherit] text-[12.5px] font-semibold text-foreground cursor-pointer transition-colors duration-tok-fast ease-ds hover:text-primary">
        <Icon name="plus" size={14} stroke={2.2} />{label}
      </button>
      <span aria-hidden className="w-px self-stretch bg-border-strong" />
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <DropdownMenuTrigger aria-label="더보기"
                className="inline-flex h-full items-center justify-center rounded-r-[9px] border-0 bg-transparent px-2 text-muted-foreground cursor-pointer transition-colors duration-tok-fast ease-ds hover:text-primary data-[state=open]:text-primary">
                <Icon name="chevron-down" size={14} stroke={2.2} />
              </DropdownMenuTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent>더보기</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end"><MoreMenuItems onExport={onExport} /></DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null | { kind: 'form'; mode: PermMode; id?: string } | { kind: 'delete'; id: string };

export function UserPermissionManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<PermRow> | null>(null);
  const [rows, setRows] = useState<PermRow[]>(DEMO);
  const [selId, setSelId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxMenuState>(null);
  const masked = useMask();

  /* 상세필터 — SSOT=개별 state(빈 값=미적용). 항목은 전부 그리드 컬럼 파생(명칭·사용자 구분·사용여부·최종수정일) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fName, setFName] = useState('');
  const [fUtype, setFUtype] = useState('');
  const [fUse, setFUse] = useState('');
  const [fSince, setFSince] = useState('');            // 최종수정일 **이후**(≥) — 단일 컨트롤로 범위 하한만
  const hasFilter = Boolean(fName.trim() || fUtype || fUse || fSince);
  const firstPage = () => apiRef.current?.paginationGoToFirstPage();
  const clearFilters = () => { setFName(''); setFUtype(''); setFUse(''); setFSince(''); firstPage(); };

  /* 표시 행 — 값-필터는 전부 AND(텍스트=부분일치, 열거형=정확일치, 일자=이상). 그리드·엑셀·푸터가 같은 배열을 본다 */
  const visible = useMemo(() => {
    const kw = fName.trim().toLowerCase();
    return rows.filter((r) => (!kw || r.name.toLowerCase().includes(kw))
      && (!fUtype || r.utype === fUtype)
      && (!fUse || (r.use ? '여' : '부') === fUse)
      && (!fSince || r.at >= fSince));                 // 둘 다 yyyy-MM-dd 고정폭이라 문자열 비교가 곧 날짜 비교
  }, [rows, fName, fUtype, fUse, fSince]);

  /* 적용 중인 필터 = 항목별 개별 칩(값만 표시, 항목명은 × 의 aria-label 로 회수 — apfs-detail-filter) */
  const chips: [string, string, () => void][] = [
    ['명칭', fName.trim(), () => { setFName(''); firstPage(); }],
    ['사용자 구분', fUtype, () => { setFUtype(''); firstPage(); }],
    ['사용여부', fUse, () => { setFUse(''); firstPage(); }],
    ['최종수정일', fSince && `≥ ${fSince}`, () => { setFSince(''); firstPage(); }],
  ];

  // 앱-스코프 단축키: ⌘⏎=권한 등록(모달 열림 중엔 비활성), ⌘P=인쇄, ⌥D=내보내기
  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'form', mode: 'create' }), { enabled: modal === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  useEffect(() => {
    // 미지원 가드는 `if (!el) return`과 분리 — 합치면 초기값 true가 굳어 푸터 폴백 kebab이 영영 안 뜬다(apfs-grid)
    if (typeof IntersectionObserver === 'undefined') { setTopMoreVisible(false); return; }
    const el = topMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTopMoreVisible(e.isIntersecting), { root: null, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* 선택 SSOT = React state(selId). 그리드 라디오는 선택 변경 이벤트로 동기화, 신규 등록 후엔 onRowDataUpdated 로 되맞춘다 */
  const selIdRef = useRef<string | null>(null); selIdRef.current = selId;
  const onGridReady = useCallback((e: GridReadyEvent<PermRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<PermRow>) => { setSelId(e.api.getSelectedRows()[0]?.id ?? null); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<PermRow> }) => {
    const id = selIdRef.current; if (!id) return;
    const node = e.api.getRowNode(id); if (node && !node.isSelected()) node.setSelected(true, true);
  }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<PermRow>) => { if (e.data && !e.rowPinned) setModal({ kind: 'form', mode: 'edit', id: e.data.id }); }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<PermRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    setModal({ kind: 'form', mode: 'edit', id: e.data.id });
  }, []);

  const selected = selId ? rows.find((r) => r.id === selId) ?? null : null;
  const target = modal && modal.id ? rows.find((r) => r.id === modal.id) ?? null : null;

  /* 삭제 게이트(목업): 배정 사용자 0명일 때만. 아니면 사유를 toast 로 */
  const requestDelete = (r: PermRow) => {
    if (r.users > 0) { toast.error(`배정 사용자 ${r.users}명 — 삭제할 수 없습니다.`); return; }
    setModal({ kind: 'delete', id: r.id });
  };
  const handleCellContextMenu = (e: CellContextMenuEvent<PermRow>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [
      { label: '수정', icon: 'file', onSelect: () => setModal({ kind: 'form', mode: 'edit', id: row.id }) },
      { label: '복사', icon: 'layers', onSelect: () => setModal({ kind: 'form', mode: 'copy', id: row.id }) },
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
      'sep',
      { label: '삭제', icon: 'trash', danger: true, onSelect: () => requestDelete(row) },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  /* ── CRUD — 불변 갱신 + toast(목업 회신 문구 유지) ── */
  const save = (patch: PermPatch) => {
    if (!modal || modal.kind !== 'form') return;
    if (permNameTaken(rows, patch.name, modal.mode === 'edit' ? target?.id : undefined)) { toast.error('이미 존재하는 명칭입니다.'); return; }   // 모달 검증의 2차 방어
    if (modal.mode === 'edit' && target) {
      setRows((prev) => prev.map((r) => (r.id === target.id ? { ...r, ...patch, by: 'admin', at: today() } : r)));
    } else {
      const nextNo = rows.reduce((m, r) => Math.max(m, r.no), 0) + 1;
      const row: PermRow = { id: crypto.randomUUID(), no: nextNo, ...patch, by: 'admin', at: today(), users: 0 };
      setRows((prev) => [...prev, row]);
      setSelId(row.id);   // 새 행에 선택을 두면 후속 액션(수정·복사)이 바로 보인다(apfs-stage-workflow 규약 9)
    }
    setModal(null);
    toast.success('권한이 저장되었습니다 · 권한변경 이력 3년 보관 (목업)');
  };
  const doDelete = () => {
    if (!target) return;
    setRows((prev) => prev.filter((r) => r.id !== target.id).map((r, i) => ({ ...r, no: i + 1 })));   // 목업: 삭제 후 No 재번호
    if (selId === target.id) setSelId(null);
    setModal(null);
    toast.success('삭제되었습니다 (목업)');
  };
  const refresh = () => { setRows([...DEMO]); clearFilters(); apiRef.current?.deselectAll(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 단일 헤더. 마스크 ON이면 숫자 0·텍스트 '' ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => { const v = c.get(r); return typeof v === 'number' ? (masked ? 0 : v) : masked ? '' : v; }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === 'No' ? 6 : c.header === '설명' ? 36 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '권한관리');
    XLSX.writeFile(wb, '사용자권한관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '관리자', '사용자·권한 관리', '권한관리']}
      title="권한관리"
      favRoute="user-permission-manage"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={selected ? (
        /* 선택 행 컨텍스트 액션(목업 gate: 수정·복사·삭제). 대상명 캡션은 두지 않는다(선택 행에서 이미 보임) */
        <>
          <UTypeBadge value={selected.utype} />
          <Button variant="primary" size="sm" onClick={() => setModal({ kind: 'form', mode: 'edit', id: selected.id })}>수정</Button>
          <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'form', mode: 'copy', id: selected.id })}>복사</Button>
          <Button variant="outline" size="sm" leadingIcon="trash" style={{ color: 'var(--danger)' }} onClick={() => requestDelete(selected)}>삭제</Button>
          <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
        </>
      ) : (
        <>
          <Icon name="shield-check" size={16} className="text-caption" />
          <span className="text-caption font-semibold" style={{ fontSize: 12.5 }}>권한 {mn(String(visible.length))}건 · 행을 선택하면 수정·복사·삭제</span>
          {chips.filter(([, v]) => v).map(([label, value, clear]) => (
            <span key={label} title={label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
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
        {/* 등록이 있는 리스트라 combo(split) — 좌: 권한 등록 · 우: ⌄ 내보내기·인쇄. topMoreRef 는 combo 래퍼가 든다 */}
        <span ref={topMoreRef} className="inline-flex">
          <RegisterCombo label="권한 등록" onRegister={() => setModal({ kind: 'form', mode: 'create' })} onExport={exportExcel} />
        </span>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + mn(String(rows.length)) + '개 중 ' + mn(String(Math.min(shown, visible.length))) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<>
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="maximize" label="전체보기" size={32} active={showAll} pressed={showAll} onClick={() => setShowAll((v) => !v)} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
        {!topMoreVisible && <MoreMenu size={32} onExport={exportExcel} />}
      </>}>

      <div>
        <AgGridReact<PermRow>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          preventDefaultOnContextMenu
          onGridReady={onGridReady}
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          onCellContextMenu={handleCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">' + (hasFilter ? '조건에 맞는 권한이 없습니다.' : '등록된 권한이 없습니다.') + '</span>'}
        />
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />

      {/* ── 상세필터 드로어 — 목업 검색박스가 없어 항목 순서는 그리드 컬럼 순서(명칭·사용자 구분·사용여부·최종수정일) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">권한 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="명칭">
              <input type="text" value={fName} onChange={(e) => { setFName(e.target.value); firstPage(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }}
                placeholder="권한 명칭 부분일치" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="사용자 구분"><DrawerSelect value={fUtype} onChange={(v) => { setFUtype(v); firstPage(); }} options={UTYPES} /></DrawerField>
            <DrawerField label="사용여부"><DrawerSelect value={fUse} onChange={(v) => { setFUse(v); firstPage(); }} options={['여', '부']} /></DrawerField>
            {/* PeriodPicker 트리거는 w-full 이라 fit-content 래퍼로 감싸 폭 규칙(minW) 적용(apfs-datepicker "폭") */}
            <DrawerField label="최종수정일" hint="선택일 이후" plain>
              <div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}>
                <PeriodPicker mode="day" value={fSince} onChange={(v) => { setFSince(v); firstPage(); }} ariaLabel="최종수정일(선택일 이후)" />
              </div>
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 권한 설정 모달(등록/수정/복사) — 필드 + 메뉴별 기능 권한 매트릭스 ── */}
      {modal?.kind === 'form' && (modal.mode === 'create' || target) && (
        <UserPermissionModal mode={modal.mode} initial={modal.mode === 'create' ? undefined : target!} menuRows={MENU_ROWS} existing={rows}
          onSave={save} onClose={() => setModal(null)} />
      )}

      {/* ── 삭제 확인(배정 사용자 0명 전제) — Radix AlertDialog(Cancel 기본 포커스 내장) ── */}
      {modal?.kind === 'delete' && target && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>권한 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                「<b className="text-foreground"><MT>{target.name}</MT></b>」 권한을 삭제할까요?
                <br />메뉴별 기능 권한 설정이 함께 삭제되며 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setModal(null)}>취소</AlertDialogCancel>
              <AlertDialogAction onClick={doDelete} style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </GridFrame>
  );
}
