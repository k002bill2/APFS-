/* 조합원정보조회 — 관리형 리스트 페이지 (투자자산관리 > 자펀드 관리 > 조합원정보조회).
   출처: S1_15_조합원정보등록.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(모펀드 1항목)  → 상세필터 드로어 1항목. 목업 그리드에 모펀드 열이 없어 **행 필터와 미연동**이라
       `DrawerField noop`(· 데이터 연동 후 적용). 연동 항목이 0개라 External Filter
       (`isExternalFilterPresent`/`doesExternalFilterPass`)를 배선하지 않는다 — 항상 true인 술어는 죽은 코드다.
       따라서 **필터 결과 집합 === rows** 이고, 적용 칩도 생기지 않는다(드로어는 열리되 적용될 값이 없다).
   - 목록 그리드(NO·조합원·사업자번호/주민번호·주소·전화번호·비고·상세조회) → AG Grid 단일 헤더.
       금액 컬럼이 없어 합계행 없음. 선언 폭 합(1168)이 프레임(1280)보다 좁아 `FIT_GRID_WIDTH`로 채우고,
       **주소만 maxWidth 없이** 두어 잉여를 흡수시킨다(apfs-aggrid 폭 규약).
   - 행 클릭 선택 → [등록][수정][삭제] 노출(목업) → **선택 UI 없이** APFS 단건 CRUD 관례로 치환
       (2026-09-12 자펀드 공고 정보관리 사용자 결정 — apfs-grid `hideRowSelection` 절):
         등록 = 툴바 RegisterCombo(1차 액션 상시 노출, ⌘⏎) · 수정 = 셀 더블클릭·셀 Enter·우클릭 메뉴 ·
         삭제 = 우클릭 메뉴(→ AlertDialog 확인) 또는 수정 모달 안 2단계 삭제.
   - 등록/수정 단일 폼 2모드(목업 openMember) → `member_info_form_modal.tsx`(커스텀).
       RowFormModal로는 중복확인 버튼·자동 하이픈 서식·라벨 전환(사업자번호↔주민번호)을 표현할 수 없다.
   - 상세조회 팝업(목업 openDetail, S1_16 흡수) → `member_info_detail_modal.tsx`.
       진입 3경로: 상세조회 셀 버튼 · 그 셀에서 Enter · 우클릭 메뉴 항목.
   - 삭제 확인 alertdialog(기본 포커스 취소, 위험 버튼) → Radix AlertDialog(Cancel 기본 포커스 내장).
   - 엑셀(목업 '엑셀' 버튼) → RegisterCombo ⌄ 항목 + 푸터 download + ⌥D. 상세조회 액션 열은 값이 아니라 제외.
   - KPI 배지 행 미포함 · 카드뷰 없음 · 금액 단위 토글은 **목록에 미적용**(목업 설계메모: 등록/수정 있는
       CRUD 관리화면이라 규칙상 미적용, 읽기전용 상세조회 팝업에만 적용).

   한계·가정:
   - `mf`(모펀드)는 그리드 컬럼이 아니지만 **등록/수정 폼 1번 항목**이라 행에 왕복 저장한다(목록 표시·필터 대상 아님).
   - 전화번호·비고는 목업 샘플이 공란이라 muted '-'로 표시한다(없는 값 창작 금지).
   ⚠검토필요 마커 1건 이식 — 수정 모달의 식별번호 라벨(member_info_form_modal.tsx). 목업 검색박스·그리드 헤더엔 0건.
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유). */
import './aggrid_shared.css';   // 공유 보정 CSS(헤더 sticky·마스크 헤더 바 — 합계행은 없지만 전 그리드 공통)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, FIT_GRID_WIDTH, DEFAULT_COL_DEF } from './aggrid_theme';
import { controlMinWidth } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, CellKeyDownEvent, CellContextMenuEvent, CellDoubleClickedEvent, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { RowContextMenu } from './row_context_menu';   // 우클릭 컨텍스트 메뉴(Community 대체, 공유)
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { MemberInfoFormModal } from './member_info_form_modal';
import { MemberInfoDetailModal } from './member_info_detail_modal';

const { Button, IconBtn } = UI;

/* ──────────────────────────────
   도메인 타입 · 데모 데이터
────────────────────────────── */
export interface MemberRow {
  id: string; no: number;
  name: string;    // 조합원(법인명 또는 성명)
  biz: string;     // 사업자번호/주민번호(개인=13자리, 법인=10자리) — pii
  addr: string;
  tel: string;     // '' = 없음 → 화면 '-'
  memo: string;    // '' = 없음 → 화면 '-'
  ptype: '개인' | '법인';
  region: '국내' | '해외';
  mf: string;      // 모펀드 — 폼 1번 항목(목록 컬럼 아님, 위 주석 참조)
}

/* 목업 DATA 그대로(1행) — "원본 샘플 데이터(1행) — 없는 값은 생성하지 않음". tel·memo는 원본 공란 유지 */
const DEMO: MemberRow[] = [
  { id: 'mi-1', no: 1, name: '마그나인베스트먼트(주)', biz: '120-87-54252', addr: '서울 강남구 테헤란로98길 15 대치동, 송강빌딩 14층', tel: '', memo: '', ptype: '법인', region: '국내', mf: '농식품모태펀드' },
];

/* 모펀드 옵션 — 목업 검색박스/등록폼 select 2종 그대로 */
const MF_OPTIONS = ['농식품모태펀드', 'MOAF'];

const PAGE_SIZE = 20;

/* ──────────────────────────────
   컬럼 정의 — 목업 thead 순서 그대로:
     NO · 조합원 · 사업자번호/주민번호 · 주소 · 전화번호 · 비고 · 상세조회
   ⚠ 폭 관련 그리드 prop(`autoSizeStrategy`·`defaultColDef`)은 aggrid_theme.ts 공용 상수만 쓴다(인라인 금지 이유는 그 파일 주석).
   ⚠ 가운데 정렬은 목업 `th.c/td.c`(NO·전화번호·상세조회)와 동일하게 맞춘다.
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* 고정폭(내용 맞춤 불필요·헤더 라벨 폭이 하한) — 잉여는 maxWidth 없는 주소 컬럼이 흡수한다 */
const fixed = (width: number) => ({ width, maxWidth: width, minWidth: width });

/* 값 없음 표시 — 목업 `<span class="muted">-</span>`(전화번호·비고 공통) */
const Dash = () => <span style={{ color: 'var(--muted-foreground)' }}>-</span>;

/* 상세조회 셀 — 셀 안 버튼. 라벨 '상세조회'는 액션이라 비마스킹, 대상 조합원명은 sr-only로 덧붙여 행마다 접근名을
   구분한다(목업 `aria-label="<조합원명> 상세조회"`). UI.Button은 rest props가 없어 aria-label을 못 받으므로 children으로 보강.
   ⚠ 조합원명은 <MT> — 마스크 경계는 엑셀·툴팁·접근名까지다(마스크 ON이면 이름이 빠지고 '상세조회'만 남는다). */
function DetailCell({ row, onDetail }: { row: MemberRow; onDetail: (r: MemberRow) => void }) {
  return (
    <Button variant="outline" size="sm" onClick={() => onDetail(row)}>
      <span className="sr-only"><MT>{row.name}</MT> </span>상세조회
    </Button>
  );
}

const makeColumns = (onDetail: (r: MemberRow) => void): ColDef<MemberRow>[] => [
  /* NO는 축(순번)이라 마스킹하지 않는다(골드 동형) */
  { field: 'no', headerName: 'NO', ...fixed(68), pinned: 'left', cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  { field: 'name', headerName: '조합원', width: 200, minWidth: 160, maxWidth: 320, cellStyle: flexCenter,
    cellRenderer: (p: any) => <span className="min-w-0 truncate"><MT>{p.value}</MT></span> },
  /* 식별번호(pii) — 값 그대로 노출하지 않도록 <MT>. 툴팁/`tooltipField`는 두지 않는다(마스크 우회) */
  { field: 'biz', headerName: '사업자번호/주민번호', ...fixed(170), cellStyle: flexCenter,
    cellRenderer: (p: any) => <span className="min-w-0 truncate"><MT>{p.value}</MT></span> },
  /* 주소가 남는 폭을 흡수한다 — maxWidth 없는 유일한 컬럼 + `FIT_GRID_WIDTH`(목업 `td.addr` min-width 280 반영) */
  { field: 'addr', headerName: '주소', width: 320, minWidth: 280, cellStyle: flexCenter,
    cellRenderer: (p: any) => <span className="min-w-0 truncate"><MT>{p.value}</MT></span> },
  { field: 'tel', headerName: '전화번호', ...fixed(130), cellStyle: flexMid,
    cellRenderer: (p: any) => (p.value ? <MT>{p.value}</MT> : <Dash />) },
  { field: 'memo', headerName: '비고', ...fixed(160), cellStyle: flexCenter,
    cellRenderer: (p: any) => (p.value ? <MT>{p.value}</MT> : <Dash />) },
  /* 액션 컬럼 — 값이 아니라 정렬 대상이 아니다. field가 없으므로 colId 명시 */
  { colId: 'detail', headerName: '상세조회', ...fixed(120), sortable: false, cellStyle: flexMid,
    cellRenderer: (p: any) => (p.data ? <DetailCell row={p.data} onDetail={onDetail} /> : null) },
];

/* 엑셀 컬럼 — 화면 컬럼과 1:1(화면=엑셀 불변식). 상세조회 액션 열은 값이 아니라 제외 */
type XCol = { header: string; get: (r: MemberRow) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: 'NO', get: (r) => r.no },
  { header: '조합원', get: (r) => r.name },
  { header: '사업자번호/주민번호', get: (r) => r.biz },
  { header: '주소', get: (r) => r.addr },
  { header: '전화번호', get: (r) => r.tel },
  { header: '비고', get: (r) => r.memo },
];

const inputStyle = (kind?: string): React.CSSProperties => ({
  width: 'fit-content', minWidth: controlMinWidth(kind), maxWidth: '100%', boxSizing: 'border-box', padding: '9px 11px', fontFamily: 'inherit', fontSize: 14,
  border: '1px solid var(--input)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)',
});

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

/* 보조 액션 항목(내보내기·인쇄) — 푸터 폴백 kebab과 툴바 combo가 **같은 조각**을 공유한다(복제하면 힌트가 갈라짐) */
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

/* kebab(···) — **푸터 폴백 전용**. 등록이 있는 리스트의 툴바에는 RegisterCombo ⌄가 같은 항목을 제공한다(apfs-grid 규약) */
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

/* 등록 combo(split) 버튼 — 좌: 1차 액션 즉시 실행 · 우: ⌄ 보조 메뉴. generic_list.tsx/subfund_manage.tsx 로컬 복사본(공유 export 아님).
   UI.Button을 못 쓰는 이유(forwardRef 없음·motion scale 이음매)와 overflow-hidden/.apfs-menu-trigger 금지 근거는 apfs-grid 스킬. */
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
type ModalState = null | { kind: 'create' } | { kind: 'edit'; id: string } | { kind: 'delete'; id: string } | { kind: 'detail'; id: string };

export function MemberInfoManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<MemberRow> | null>(null);
  const [rows, setRows] = useState<MemberRow[]>(DEMO);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxMenuState>(null);
  const masked = useMask();

  /* 상세필터 — 목업 검색박스는 모펀드 1항목뿐이고 그리드 컬럼과 미연동이라 state만 둔다(no-op).
     연동 항목이 0개이므로 External Filter를 배선하지 않는다 → 표시 집합 === rows(파일 상단 주석). */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fMf, setFMf] = useState('');
  const clearFilters = () => setFMf('');

  const openDetail = useCallback((r: MemberRow) => setModal({ kind: 'detail', id: r.id }), []);
  /* openDetail은 useCallback(deps [])로 안정 → 컬럼 정의 고정(매 렌더 새 배열이면 그리드가 컬럼을 재생성하며 폭을 되돌린다) */
  const columnDefs = useMemo(() => makeColumns(openDetail), [openDetail]);

  // 앱-스코프 단축키: ⌘⏎=조합원정보 등록(모달 열림 중엔 비활성 → 이중 열림 방지), ⌘P=인쇄, ⌥D=내보내기
  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'create' }), { enabled: modal === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  useEffect(() => {
    // 미지원 가드는 `if (!el) return`과 분리한다 — 합치면 초기값 true가 굳어 푸터 폴백 kebab이 영영 안 뜬다(apfs-grid)
    if (typeof IntersectionObserver === 'undefined') { setTopMoreVisible(false); return; }
    const el = topMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTopMoreVisible(e.isIntersecting), { root: null, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onGridReady = useCallback((e: GridReadyEvent<MemberRow>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* 수정 진입 3경로 — 셀 더블클릭 · 셀 Enter(상세조회 셀은 상세 팝업) · 우클릭 메뉴.
     ⚠ `onRowDoubleClicked`가 아니라 `onCellDoubleClicked`를 쓴다 — 상세조회 버튼을 더블클릭하면
        1클릭에 상세 팝업이 열리고 행 이벤트로 수정 모달까지 겹쳐 뜬다. 컬럼을 알아야 그 열만 제외할 수 있다. */
  const onCellDoubleClicked = useCallback((e: CellDoubleClickedEvent<MemberRow>) => {
    if (!e.data || e.rowPinned || e.column.getColId() === 'detail') return;
    setModal({ kind: 'edit', id: e.data.id });
  }, []);
  /* AG Grid의 Tab은 **셀 단위**로만 움직여 셀 안 button에 초점이 닿지 않는다 → Enter 분기가 키보드 접근을 보장한다 */
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<MemberRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    if (e.column.getColId() === 'detail') { setModal({ kind: 'detail', id: e.data.id }); return; }
    setModal({ kind: 'edit', id: e.data.id });
  }, []);
  const handleCellContextMenu = (e: CellContextMenuEvent<MemberRow>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [
      { label: '수정', icon: 'file', onSelect: () => setModal({ kind: 'edit', id: row.id }) },
      { label: '상세조회', icon: 'search', onSelect: () => setModal({ kind: 'detail', id: row.id }) },
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
      'sep',
      { label: '삭제', icon: 'trash', danger: true, onSelect: () => setModal({ kind: 'delete', id: row.id }) },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  const target = modal && modal.kind !== 'create' ? rows.find((r) => r.id === modal.id) ?? null : null;

  /* ── CRUD — 불변 갱신. 등록/수정 toast는 모달이 낸다(mode를 아는 쪽) ── */
  const saveCreate = (patch: Omit<MemberRow, 'id' | 'no'>) => {
    const nextNo = rows.reduce((m, r) => Math.max(m, r.no), 0) + 1;   // 삭제 후 재번호 없음(저장된 no 유지)
    setRows((prev) => [...prev, { ...patch, id: crypto.randomUUID(), no: nextNo }]);
    setModal(null);
  };
  const saveEdit = (patch: Omit<MemberRow, 'id' | 'no'>) => {
    if (!target) return;
    setRows((prev) => prev.map((r) => (r.id === target.id ? { ...r, ...patch } : r)));
    setModal(null);
  };
  const doDelete = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setModal(null);
    toast.success('삭제되었습니다 (목업)');
  };

  const refresh = () => { setRows([...DEMO]); clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 단일 헤더(합계행 없음). 마스크 ON이면 숫자 0·텍스트 ''(식별번호·주소 포함) ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = rows.map((r) => EXPORT_COLS.map((c) => {
      const v = c.get(r);
      if (typeof v === 'number') return masked ? 0 : v;
      return masked ? '' : v;
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === 'NO' ? 6 : c.header === '주소' ? 44 : c.header === '조합원' ? 28 : 22 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '조합원정보조회');
    XLSX.writeFile(wb, '조합원정보조회.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '자펀드 관리', '조합원정보조회']}
      title="조합원정보조회"
      favRoute="member-info"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 — 주 필터 칩이 없는 화면이다(검색박스 유일 항목인 모펀드가 행과 미연동).
         목업 listbar의 `총 N건` 캡션을 건수 컨텍스트로 옮겼다(report_form_manage 동형) */
      toolbarLeft={<>
        <Icon name="filter" size={16} className="text-caption" />
        <span className="text-caption font-semibold" style={{ fontSize: 12.5 }}>조합원 {mn(String(rows.length))}건</span>
      </>}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        {/* 등록이 있는 리스트라 combo(split) 버튼 — 좌: 조합원정보 등록 · 우: ⌄ 내보내기·인쇄(apfs-grid 규약). 툴바 독립 kebab은 두지 않는다.
            ⚠️ topMoreRef는 combo 래퍼가 들고 있어야 한다 — ref가 비면 푸터 폴백이 영원히 안 뜬다 */}
        <span ref={topMoreRef} className="inline-flex">
          <RegisterCombo label="조합원정보 등록" onRegister={() => setModal({ kind: 'create' })} onExport={exportExcel} />
        </span>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + mn(String(rows.length)) + '개 중 ' + mn(String(Math.min(shown, rows.length))) + '개 항목 표시 중'}</span>}
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
        <AgGridReact<MemberRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={FIT_GRID_WIDTH}   // 선언 폭 합이 프레임보다 좁다 → 잉여는 maxWidth 없는 주소 컬럼이 흡수
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          preventDefaultOnContextMenu
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onCellDoubleClicked={onCellDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          onCellContextMenu={handleCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">등록된 조합원이 없습니다.</span>'}
        />
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />

      {/* ── 상세필터 드로어 — 목업 검색박스 항목 그대로(모펀드 1개). 검색어는 미사용(OFF).
             모펀드는 그리드 컬럼과 미연동이라 noop 캡션(apfs-detail-filter) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">조합원 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={MF_OPTIONS} /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 등록/수정 — 단일 폼 2모드(목업 openMember). 수정 모달 안 2단계 삭제는 모달이 소유하고 onDelete로 확정한다 ── */}
      {modal?.kind === 'create' && (
        <MemberInfoFormModal mode="create" onSave={saveCreate} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'edit' && target && (
        <MemberInfoFormModal mode="edit" initial={target} onSave={saveEdit} onClose={() => setModal(null)}
          onDelete={() => doDelete(target.id)} />
      )}

      {/* ── 읽기전용 상세조회 팝업(S1_16 흡수) — 상세조회 버튼 · 그 셀 Enter · 우클릭 메뉴가 연다 ── */}
      {modal?.kind === 'detail' && target && <MemberInfoDetailModal row={target} onClose={() => setModal(null)} />}

      {/* ── 삭제 확인(목업 alertdialog — 기본 포커스 취소·위험 버튼). Radix AlertDialog는 Cancel 기본 포커스 내장 ── */}
      {modal?.kind === 'delete' && target && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>조합원 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                <b className="text-foreground"><MT>{target.name}</MT></b> 조합원 정보를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setModal(null)}>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => doDelete(target.id)} style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </GridFrame>
  );
}
