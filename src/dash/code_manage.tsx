/* 공통코드 관리 — master-detail 관리형 페이지 (관리자 > 시스템 관리 > 공통코드 관리).
   출처: S0_106_코드관리.html(공통관리 KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(검색기준+검색어·사용여부)  → 주 필터 1개 = 사용여부 FilterChip(툴바 좌) + 상세필터 드로어(검색어·검색기준). 검색어 opt-in(SEARCHABLE).
   - 좌 코드구분 목록 ⟷ 우 선택 코드구분의 코드상세(master-detail) → GridFrame 하나 안에 2단 그리드(lg 이상 좌 440px / 우 잔여, 좁으면 세로 적층).
       각 패널은 자체 헤더 바(제목·건수·패널 액션)와 AG Grid 를 갖는다. 좌 선택(라디오)이 우측 데이터 소스를 정한다.
       우측은 코드구분 미선택이면 **empty state**(목업 overlay '좌측에서 코드구분을 선택해 주세요.')를 그리드 대신 그린다.
   - 그룹/상세 각각 등록·수정·삭제(목업 lg-·rg- 접두 버튼)  → 툴바 등록 버튼(코드구분 등록, ⌘⏎) + 패널 바 액션(수정·삭제·코드 등록).
       삭제 게이트: 코드상세가 있는 코드구분은 삭제 불가(toast). 확인은 AlertDialog. 보조 경로 = 행 더블클릭·셀 Enter·우클릭 메뉴.
   - 모달 2종(코드구분 5필드 / 코드상세 7필드)  → RowFormModal + 팩토리 스키마(code_manage_schemas.ts). 수정 시 키 필드 readonly.
       중복 검증(코드구분·그룹 내 코드)은 onSave 에서 — 중복이면 toast 로 알리고 모달을 닫지 않는다(목업 '이미 존재하는 …').
       코드상세 저장 시 그룹 안 정렬을 `reseqSiblings` 로 자동 재조정(목업 '저장되었습니다 · 정렬 자동 조정').
   - 엑셀(리스트 공통 규약) → 시트 2장(코드구분 전체 · 선택 코드구분의 코드상세). 마스크 ON이면 텍스트 ''·숫자 0.
   - KPI 배지 행 미포함(사용자 확정) · 카드뷰 없음 · 명세 팝업 없음 · ⚠검토필요 마커 없음(목업 원문 0건) · 페이지네이션 없음(그룹 ≤ 20).
   ⚠ 백엔드가 없어 등록·수정·삭제는 화면 로컬 상태만 바꾼다. 목업의 GNB/LNB·설계 메모는 이식하지 않는다(셸 소유). */
import './aggrid_shared.css';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { format } from 'date-fns';
import { UI } from './components';
import { Icon } from './icons';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, NO_COL_ID, refreshNoColumn } from './aggrid_theme';
import { SELECTION_COL, restoreSelection } from './aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import { drawerInputStyle as inputStyle } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent, CellStyle, RowSelectionOptions } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { RowFormModal } from './generic_list_modal';
import { RowContextMenu } from './row_context_menu';
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { demoGroups, demoDetails, detailId, groupDeleteBlocker } from './code_manage_data';
import type { CodeGroup, CodeDetail } from './code_manage_data';
import { groupSchema, detailSchema, upOption, upCodeOf, UP_NONE } from './code_manage_schemas';
import { reseqSiblings, applyReseq } from './reseq';
import { UseBadge } from './admin_shared';

const { Button, IconBtn, FilterChip, EmptyState, ClearableInput } = UI;

const SEARCHABLE = true;
const SEARCH_FIELDS: { key: 'code' | 'name'; label: string }[] = [{ key: 'code', label: '코드구분' }, { key: 'name', label: '코드구분명' }];
const nowStamp = () => format(new Date(), 'yyyy-MM-dd HH:mm');

/* ──────────────────────────────
   컬럼 정의 — 좌: 코드구분·코드구분명·상위코드구분·사용여부 / 우: No·코드·코드명·코드명(영문)·정렬·비고·사용여부·최종수정자·최종수정일시
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };

type GroupView = CodeGroup & { upName: string; count: number };
const GROUP_COLS: ColDef<GroupView>[] = [
  { field: 'code', headerName: '코드구분', width: 84, minWidth: 84, maxWidth: 120, cellStyle: flexCenter, cellRenderer: (p: any) => <span className="font-semibold">{p.value}</span> },
  /* 코드구분명이 남는 폭을 흡수(flex:1) */
  { field: 'name', headerName: '코드구분명', flex: 1, width: 150, minWidth: 100, cellStyle: flexCenter, cellRenderer: (p: any) => <>{p.value}</> },
  { field: 'up', headerName: '상위코드구분', width: 118, minWidth: 118, maxWidth: 150, cellStyle: muted,
    cellRenderer: (p: any) => (p.value ? <>{`${p.value} (${p.data.upName})`}</> : <span>-</span>) },
  { field: 'use', headerName: '사용여부', width: 90, minWidth: 90, maxWidth: 90, cellStyle: flexMid, cellRenderer: (p: any) => <UseBadge use={p.value} size="md" /> },
];   // 비-flex 폭 합 292 + 코드구분명 minWidth 100 = 392 ≤ 좌 패널 center 뷰포트(≈395)
     // ⚠ flex 는 flex 컬럼만 늘리고 줄인다 — 나머지는 선언 width 고정이라 합이 넘으면 바로 가로 스크롤
/* 우측 코드상세는 9컬럼이라 좁은 패널에서는 폭을 넘는다 → 코드명 flex:1 이 잉여를 흡수하고, minWidth 합을 넘으면 그리드 내부 가로 스크롤. 긴 텍스트만 maxWidth 캡 */
const DETAIL_COLS: ColDef<CodeDetail>[] = [
  { colId: NO_COL_ID, headerName: 'No', width: 60, maxWidth: 60, cellStyle: centerNum, sortable: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
  { field: 'code', headerName: '코드', width: 90, maxWidth: 120, cellStyle: flexMid, cellRenderer: (p: any) => <span className="font-semibold">{p.value}</span> },
  { field: 'name', headerName: '코드명', flex: 1, width: 180, minWidth: 170, cellStyle: flexCenter, cellRenderer: (p: any) => <>{p.value}</> },
  { field: 'en', headerName: '코드명(영문)', width: 140, maxWidth: 200, cellStyle: muted, cellRenderer: (p: any) => (p.value ? <>{p.value}</> : <span>-</span>) },
  { field: 'ord', headerName: '정렬', width: 64, maxWidth: 64, cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  { field: 'rem', headerName: '비고', width: 170, maxWidth: 240, cellStyle: muted, cellRenderer: (p: any) => (p.value ? <>{p.value}</> : <span>-</span>) },
  { field: 'use', headerName: '사용여부', width: 88, maxWidth: 88, cellStyle: flexMid, cellRenderer: (p: any) => <UseBadge use={p.value} size="md" /> },
  { field: 'by', headerName: '최종수정자', width: 100, maxWidth: 120, cellStyle: muted, cellRenderer: (p: any) => <>{p.value}</> },
  { field: 'at', headerName: '최종수정일시', width: 140, maxWidth: 150, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' }, valueFormatter: (p) => String(p.value) },
];
/* 좌·우 모두 체크박스로만 선택(행 본문 클릭 선택 해제 — 2026-09-22 사용자 결정). 좌 그리드의 "해제 금지"는
   enableClickSelection:'enableSelection' 이 아니라 onGroupSelection 의 queueMicrotask 복원이 담당한다(apfs-aggrid master-detail 절). */
const GROUP_SELECTION: RowSelectionOptions<GroupView> = { mode: 'singleRow', checkboxes: true, enableClickSelection: false };
/* 우측 코드상세는 일반 리스트 — 다중 선택이 기본(2026-09-23). 단일 액션(수정)은 1건일 때만, 삭제는 다건.
   ⚠ 좌측 GROUP_SELECTION 은 그대로 singleRow(라디오) — 우측 패널이 무엇을 보여줄지 정하는 데이터 소스라 2건 이상이 성립하지 않는다. */
const DETAIL_SELECTION: RowSelectionOptions<CodeDetail> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

/* 패널 헤더 바 — 좌/우 그리드 위의 제목·건수·패널 액션(목업 listbar). 툴바보다 한 단계 낮은 위계(13px, 얇은 하단선) */
function PaneBar({ title, count, children }: { title: React.ReactNode; count: number; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2" style={{ padding: '8px 18px', borderBottom: '1px solid var(--border)', minHeight: 46 }}>
      <h4 className="flex items-center gap-1.5 font-semibold m-0" style={{ fontSize: 13.5 }}>
        {title}<span className="text-primary tabular">{String(count)}</span>
      </h4>
      <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
    </div>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null
  | { kind: 'group'; mode: 'create' | 'edit'; code?: string }
  | { kind: 'detail'; mode: 'create' | 'edit'; id?: string }
  | { kind: 'delGroup'; code: string }
  | { kind: 'delDetail'; ids: string[] };

export function CodeManage({ onNav }: { onNav?: (r: string) => void }) {
  const lApi = useRef<GridApi<GroupView> | null>(null);
  const rApi = useRef<GridApi<CodeDetail> | null>(null);
  const [groups, setGroups] = useState<CodeGroup[]>(() => demoGroups());
  const [details, setDetails] = useState<Record<string, CodeDetail[]>>(() => demoDetails());
  const [curCode, setCurCode] = useState<string | null>(() => demoGroups()[0]?.code ?? null);   // 목업: 첫 코드구분 자동 선택
  /* 코드상세 선택 SSOT — 체크된 id 배열. selDetail·selDCount 는 파생이라 둘이 어긋날 수 없다.
     ⚠ 종전처럼 id 와 카운트를 따로 두면 코드구분을 바꿀 때 id 만 비우고 카운트가 남아, 선택이 0인데
       선택 바가 떠 있고 벌크 삭제가 조용히 아무 것도 안 지운다(Codex 리뷰 2026-09-23). */
  const [selDIds, setSelDIds] = useState<string[]>([]);
  const selDetail = selDIds[0] ?? null;
  const selDCount = selDIds.length;
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxMenuState>(null);

  /* 필터(코드구분 목록) — 사용여부는 툴바 칩, 검색어·검색기준은 드로어 */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fUse, setFUse] = useState<'' | '여' | '부'>('');
  const [fField, setFField] = useState<'code' | 'name'>('code');
  const [fText, setFText] = useState('');
  const clearFilters = () => { setFUse(''); setFField('code'); setFText(''); };

  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'group', mode: 'create' }), { enabled: modal === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  const curG = curCode ? groups.find((g) => g.code === curCode) ?? null : null;
  const groupViews = useMemo<GroupView[]>(() => {
    const kw = fText.trim().toLowerCase();
    return groups
      .filter((g) => (!fUse || (g.use ? '여' : '부') === fUse) && (!kw || String(g[fField]).toLowerCase().includes(kw)))
      .map((g) => ({ ...g, upName: groups.find((x) => x.code === g.up)?.name ?? '', count: (details[g.code] ?? []).length }));
  }, [groups, details, fUse, fField, fText]);
  const curDetails = useMemo(() => (curG ? [...(details[curG.code] ?? [])].sort((a, b) => a.ord - b.ord) : []), [details, curG]);
  const totalDetails = useMemo(() => Object.values(details).reduce((a, l) => a + l.length, 0), [details]);
  /* 단일 대상 액션(수정)은 **정확히 1건** 체크일 때만 — 다건 선택에 수정 모달은 의미가 없다(2026-09-23) */
  const selD = selDCount === 1 && selDetail && curG ? curDetails.find((d) => d.id === selDetail) ?? null : null;

  /* 좌 그리드 — 선택 SSOT = curCode. 초기 자동 선택·필터 후 재마운트에 대비해 ready/rowDataUpdated 에서 라디오를 되맞춘다 */
  const curRef = useRef<string | null>(null); curRef.current = curCode;
  const syncGroupRadio = useCallback((api: GridApi<GroupView>) => {
    const id = curRef.current; if (!id) return;
    const node = api.getRowNode(id); if (node && !node.isSelected()) node.setSelected(true, true);
  }, []);
  const onGroupReady = useCallback((e: GridReadyEvent<GroupView>) => { lApi.current = e.api; syncGroupRadio(e.api); }, [syncGroupRadio]);
  const onGroupRowDataUpdated = useCallback((e: { api: GridApi<GroupView> }) => syncGroupRadio(e.api), [syncGroupRadio]);
  const onGroupSelection = useCallback((e: SelectionChangedEvent<GroupView>) => {
    const code = e.api.getSelectedRows()[0]?.code;
    if (code) { setCurCode(code); setSelDIds([]); return; }
    // 해제는 허용하지 않는다 — 좌 그리드는 "여러 건을 고르는 체크박스"가 아니라 **우 패널이 무엇을 보여줄지 정하는 라디오**다.
    // 빈 선택은 우측이 갈 곳을 잃은 상태이고, 종전엔 `if (code)` 가드에 막혀 curCode 가 남은 채 체크만 풀려
    // "체크는 꺼졌는데 수정·삭제 버튼은 그대로"인 모순이 보였다(2026-09-15 사용자 지적).
    // ⚠️ 되돌리기를 **이 이벤트 안에서 즉시** 하면 안 된다 — 다른 행을 클릭하면 AG Grid 가
    //    '이전 행 해제'(0건) → '새 행 선택' 순으로 selectionChanged 를 두 번 쏜다. 첫 발화만 보고 되살리면
    //    전환 도중을 해제로 오인해 이전 행이 부활하고 새 행까지 선택돼 **2건이 동시에 선택**된다(실측).
    //    배치가 끝난 뒤(microtask) 여전히 0건일 때만 되돌린다 = 진짜 해제.
    queueMicrotask(() => {
      if (e.api.isDestroyed?.()) return;
      if (e.api.getSelectedRows().length === 0) syncGroupRadio(e.api);
    });
  }, [syncGroupRadio]);
  const onGroupDouble = useCallback((e: RowDoubleClickedEvent<GroupView>) => { if (e.data) setModal({ kind: 'group', mode: 'edit', code: e.data.code }); }, []);
  const onGroupKey = useCallback((e: CellKeyDownEvent<GroupView>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    setModal({ kind: 'group', mode: 'edit', code: e.data.code });
  }, []);
  /* 우 그리드 */
  const selDRef = useRef<readonly string[]>([]); selDRef.current = selDIds;
  const onDetailReady = useCallback((e: GridReadyEvent<CodeDetail>) => { rApi.current = e.api; }, []);
  const onDetailSelection = useCallback((e: SelectionChangedEvent<CodeDetail>) => { setSelDIds(e.api.getSelectedRows().map((d) => d.id)); }, []);
  const onDetailRowDataUpdated = useCallback((e: { api: GridApi<CodeDetail> }) => {
    restoreSelection(e.api, selDRef.current);
  }, []);
  const onDetailDouble = useCallback((e: RowDoubleClickedEvent<CodeDetail>) => { if (e.data) setModal({ kind: 'detail', mode: 'edit', id: e.data.id }); }, []);
  const onDetailKey = useCallback((e: CellKeyDownEvent<CodeDetail>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    setModal({ kind: 'detail', mode: 'edit', id: e.data.id });
  }, []);

  /* ── 삭제 게이트 + 컨텍스트 메뉴 ── */
  /* 삭제 게이트: 코드상세 또는 이 코드를 상위로 참조하는 코드구분이 있으면 불가(groupDeleteBlocker). 확인 실행 시 재검사 */
  const requestDelGroup = (g: CodeGroup) => {
    const blocker = groupDeleteBlocker(groups, details, g.code);
    if (blocker) { toast.error(`${blocker}가 있어 삭제할 수 없습니다.`); return; }
    setModal({ kind: 'delGroup', code: g.code });
  };
  const groupCtx = (e: CellContextMenuEvent<GroupView>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const g = e.data; if (!g) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [
      { label: '코드상세 보기', icon: 'eye', onSelect: () => { setCurCode(g.code); setSelDIds([]); } },
      { label: '수정', icon: 'file', onSelect: () => setModal({ kind: 'group', mode: 'edit', code: g.code }) },
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
      'sep',
      { label: '삭제', icon: 'trash', danger: true, onSelect: () => requestDelGroup(g) },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };
  const detailCtx = (e: CellContextMenuEvent<CodeDetail>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const d = e.data; if (!d) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [
      { label: '수정', icon: 'file', onSelect: () => setModal({ kind: 'detail', mode: 'edit', id: d.id }) },
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
      'sep',
      { label: '삭제', icon: 'trash', danger: true, onSelect: () => setModal({ kind: 'delDetail', ids: [d.id] }) },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  /* ── 모달 스키마(팩토리) — 모드·목록별 1회 생성 ── */
  const groupModal = modal?.kind === 'group' ? modal : null;
  const editGroup = groupModal?.mode === 'edit' ? groups.find((g) => g.code === groupModal.code) ?? null : null;
  const gSchema = useMemo(() => (groupModal ? groupSchema(groupModal.mode, groups, editGroup?.code) : null), [groupModal, groups, editGroup?.code]);
  const detailModal = modal?.kind === 'detail' ? modal : null;
  const editDetail = detailModal?.mode === 'edit' ? curDetails.find((d) => d.id === detailModal.id) ?? null : null;
  const dSchema = useMemo(() => (detailModal ? detailSchema(detailModal.mode) : null), [detailModal]);

  /* ── CRUD(코드구분) — 중복이면 toast + 모달 유지 ── */
  const str = (v: unknown) => String(v ?? '').trim();
  const saveGroup = (f: any) => {
    if (!groupModal) return;
    const name = str(f.name), up = upCodeOf(str(f.up)), rem = str(f.rem), use = str(f.use) !== '부';
    if (groupModal.mode === 'edit' && editGroup) {
      setGroups((prev) => prev.map((g) => (g.code === editGroup.code ? { ...g, name, up, rem, use } : g)));
    } else {
      const code = str(f.code);
      if (groups.some((g) => g.code === code)) { toast.error('이미 존재하는 코드구분입니다.'); return; }
      setGroups((prev) => [...prev, { id: code, code, name, up, rem, use }]);
      setDetails((prev) => ({ ...prev, [code]: prev[code] ?? [] }));
      setCurCode(code); setSelDIds([]);
    }
    setModal(null);
    toast.success('저장되었습니다 (목업)');
  };
  const doDelGroup = () => {
    if (modal?.kind !== 'delGroup') return;
    const code = modal.code;
    const blocker = groupDeleteBlocker(groups, details, code);
    if (blocker) { toast.error(`${blocker}가 있어 삭제할 수 없습니다.`); return; }
    setGroups((prev) => prev.filter((g) => g.code !== code));
    setDetails((prev) => { const n = { ...prev }; delete n[code]; return n; });
    if (curCode === code) { setCurCode(null); setSelDIds([]); }
    toast.success('삭제되었습니다 (목업)');
  };
  /* ── CRUD(코드상세) — 그룹 안 중복 검사 + 정렬 재배치 ── */
  const saveDetail = (f: any) => {
    if (!detailModal || !curG) return;
    const g = curG.code;
    const name = str(f.name), en = str(f.en), rem = str(f.rem), use = str(f.use) !== '부';
    const ord = Number(String(f.ord ?? '').replace(/[^\d]/g, '')) || 1;
    const list = details[g] ?? [];
    let next: CodeDetail[]; let movedId: string;
    if (detailModal.mode === 'edit' && editDetail) {
      movedId = editDetail.id;
      next = list.map((d) => (d.id === movedId ? { ...d, name, en, rem, use, ord, by: 'admin', at: nowStamp() } : d));
    } else {
      const code = str(f.code);
      if (list.some((d) => d.code === code)) { toast.error('이미 존재하는 코드입니다.'); return; }
      movedId = detailId(g, code);
      next = [...list, { id: movedId, gcode: g, code, name, en, ord, rem, use, by: 'admin', at: nowStamp() }];
    }
    const reseqed = applyReseq(next, reseqSiblings(next, movedId, ord));
    setDetails((prev) => ({ ...prev, [g]: reseqed }));
    setSelDIds([movedId]);
    setModal(null);
    toast.success('저장되었습니다 · 정렬 자동 조정 (목업)');
  };
  const doDelDetail = () => {
    if (modal?.kind !== 'delDetail' || !curG) return;
    const ids = new Set(modal.ids), g = curG.code;
    setDetails((prev) => ({ ...prev, [g]: (prev[g] ?? []).filter((d) => !ids.has(d.id)) }));
    rApi.current?.deselectAll(); setSelDIds([]);
    toast.success(`${ids.size}건 삭제되었습니다 (목업)`);
  };
  const refresh = () => {
    const gs = demoGroups(); setGroups(gs); setDetails(demoDetails()); setCurCode(gs[0]?.code ?? null); setSelDIds([]); clearFilters();
    toast.success('새로고침했습니다');
  };

  /* ── Excel — 시트 2장(코드구분 전체 · 선택 코드구분의 코드상세). 마스크 ON이면 텍스트 ''·숫자 0 ── */
  const exportExcel = () => {
    const t = (v: string) => (v), n = (v: number) => (v);
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['코드구분', '코드구분명', '상위코드구분', '비고', '사용여부'],
      ...groups.map((g) => [t(g.code), t(g.name), t(g.up), t(g.rem), g.use ? '여' : '부']),
    ]);
    ws1['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 30 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, '코드구분');
    if (curG) {
      const ws2 = XLSX.utils.aoa_to_sheet([
        ['코드구분', '코드', '코드명', '코드명(영문)', '정렬', '비고', '사용여부', '최종수정자', '최종수정일시'],
        ...curDetails.map((d) => [t(d.gcode), t(d.code), t(d.name), t(d.en), n(d.ord), t(d.rem), d.use ? '여' : '부', t(d.by), t(d.at)]),
      ]);
      ws2['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 26 }, { wch: 18 }, { wch: 6 }, { wch: 30 }, { wch: 8 }, { wch: 12 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws2, `코드상세_${curG.code}`.slice(0, 31));
    }
    XLSX.writeFile(wb, '공통코드관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const detailInitial = editDetail
    ? { id: editDetail.id, gcode: `${curG!.code} (${curG!.name})`, code: editDetail.code, name: editDetail.name, en: editDetail.en, ord: editDetail.ord, rem: editDetail.rem, use: editDetail.use ? '여' : '부' }
    : curG ? { gcode: `${curG.code} (${curG.name})`, ord: curDetails.length + 1, use: '여' } : undefined;   // 등록: 정렬 기본값 = 마지막+1(목업)
  const groupInitial = editGroup
    ? { id: editGroup.id, code: editGroup.code, name: editGroup.name, up: editGroup.up ? upOption(groups.find((g) => g.code === editGroup.up) ?? { code: editGroup.up, name: '' } as CodeGroup) : UP_NONE, rem: editGroup.rem, use: editGroup.use ? '여' : '부' }
    : { use: '여' };

  return (
    <GridFrame
      crumbs={['홈', '관리자', '시스템 관리', '코드관리']}
      title="코드관리"
      favRoute="code-manage"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={<>
        <Icon name="filter" size={16} className="text-caption" />
        {(['', '여', '부'] as const).map((u) => <FilterChip key={u || 'all'} active={fUse === u} onClick={() => setFUse(u)}>{u ? `사용 ${u}` : '전체'}</FilterChip>)}
        {fText.trim() && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
            {`${SEARCH_FIELDS.find((f) => f.key === fField)?.label}: ${fText.trim()}`}
            <button type="button" onClick={() => setFText('')} aria-label="검색어 필터 제거" className="inline-flex items-center justify-center border-0 cursor-pointer" style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
              <Icon name="x" size={13} stroke={2.4} />
            </button>
          </span>
        )}
      </>}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'group', mode: 'create' })}>코드구분 등록</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'코드구분 ' + String(groupViews.length) + '개 표시 중 (전체 ' + String(groups.length) + '개) · 코드상세 ' + String(totalDetails) + '건'}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      {/* master-detail 2단 — lg 이상 좌 440px 고정·우 잔여, 미만은 세로 적층(responsive-ui 체크 3). 각 패널은 min-w-0 로 그리드 내부 스크롤을 보존
          두 그리드는 gap-3(12px) 여백으로 갈라둔다(2026-09-15 사용자 지시 — 20px 는 과했다) — 종전엔 맞붙어 우측 표가 좌측 표의 연장처럼 읽혔다.
          여백이 구분자 역할을 하므로 세로 구분선(lg:border-r)·적층 시 가로선(border-t)은 함께 걷어낸다(선+여백 이중 분리는 과하다). */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[440px_minmax(0,1fr)]">
        <section aria-label="코드구분 목록" className="min-w-0">
          <PaneBar title="코드구분 " count={groupViews.length}>
            {curG && (
              <>
                <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'group', mode: 'edit', code: curG.code })}>수정</Button>
                <Button variant="outline" size="sm" leadingIcon="trash" style={{ color: 'var(--danger)' }} onClick={() => requestDelGroup(curG)}>삭제</Button>
              </>
            )}
          </PaneBar>
          <AgGridReact<GroupView>
            theme={apfsTheme}
            rowData={groupViews}
            columnDefs={GROUP_COLS}
            getRowId={(p) => p.data.code}
            domLayout="autoHeight"
            defaultColDef={DEFAULT_COL_DEF}
            rowSelection={GROUP_SELECTION}
            selectionColumnDef={SELECTION_COL}
            preventDefaultOnContextMenu
            onGridReady={onGroupReady}
            onRowDataUpdated={onGroupRowDataUpdated}
            onSelectionChanged={onGroupSelection}
            onRowDoubleClicked={onGroupDouble}
            onCellKeyDown={onGroupKey}
            onCellContextMenu={groupCtx}
            overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다.</span>'}
          />
        </section>

        <section aria-label="코드상세 목록" className="min-w-0">
          <PaneBar title={curG ? <>「{curG.name}」 코드상세 </> : '코드상세 '} count={curDetails.length}>
            {/* 코드 등록은 코드구분 선택 전에는 disabled(목업 rg-new) — 선택하면 즉시 활성 */}
            <Button variant="outline" size="sm" leadingIcon="plus" disabled={!curG} onClick={() => setModal({ kind: 'detail', mode: 'create' })}>코드 등록</Button>
            {selDCount > 0 && (
              <>
                <span className="font-semibold" style={{ fontSize: 13 }}>{String(selDCount)}건 선택됨</span>
                {selD && <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'detail', mode: 'edit', id: selD.id })}>수정</Button>}
                <Button variant="outline" size="sm" leadingIcon="trash" style={{ color: 'var(--danger)' }}
                  onClick={() => { const ids = (rApi.current?.getSelectedRows() ?? []).map((d) => d.id); if (ids.length) setModal({ kind: 'delDetail', ids }); }}>삭제</Button>
              </>
            )}
          </PaneBar>
          {curG ? (
            <AgGridReact<CodeDetail>
              key={curG.code}   // 코드구분이 바뀌면 재마운트 — 선택·스크롤·No 재계산을 깨끗이 리셋
              theme={apfsTheme}
              rowData={curDetails}
              columnDefs={DETAIL_COLS}
              getRowId={(p) => p.data.id}
              domLayout="autoHeight"
              defaultColDef={DEFAULT_COL_DEF}
              rowSelection={DETAIL_SELECTION}
              selectionColumnDef={SELECTION_COL}
              preventDefaultOnContextMenu
              onGridReady={onDetailReady}
              onModelUpdated={refreshNoColumn}
              onRowDataUpdated={onDetailRowDataUpdated}
              onSelectionChanged={onDetailSelection}
              onRowDoubleClicked={onDetailDouble}
              onCellKeyDown={onDetailKey}
              onCellContextMenu={detailCtx}
              overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">표시할 데이터가 없습니다.</span>'}
            />
          ) : (
            /* 코드구분 미선택 — 그리드 대신 empty state(목업 overlay 문구) */
            <EmptyState msg="좌측에서 코드구분을 선택해 주세요." icon="inbox" height={260} />
          )}
        </section>
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />

      {/* ── 상세필터 드로어 — 검색어(opt-in) + 검색기준(코드구분/코드구분명). 사용여부는 툴바 칩 ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">코드구분 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {SEARCHABLE && (
              <DrawerField label="검색어">
                <ClearableInput type="text" value={fText} onValueChange={setFText} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="검색기준 항목에서 부분일치" clearLabel="검색어 지우기" style={inputStyle('text')} />
              </DrawerField>
            )}
            <DrawerField label="검색기준">
              <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
                <select value={fField} onChange={(e) => setFField(e.target.value as 'code' | 'name')} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
                  {SEARCH_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
                <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
              </div>
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 코드구분 등록/수정(RowFormModal, 5필드 1단). 삭제는 패널 액션·우클릭(코드상세 없을 때만) ── */}
      {groupModal && gSchema && (groupModal.mode === 'create' || editGroup) && (
        <RowFormModal mode={groupModal.mode} schema={gSchema} title={gSchema.title} initial={groupInitial as any}
          onSave={saveGroup} onClose={() => setModal(null)}
          onDelete={editGroup ? () => { setModal(null); requestDelGroup(editGroup); } : undefined} />
      )}
      {/* ── 코드상세 등록/수정(RowFormModal, 7필드 2단) ── */}
      {detailModal && dSchema && curG && (detailModal.mode === 'create' || editDetail) && (
        <RowFormModal mode={detailModal.mode} schema={dSchema} title={dSchema.title} initial={detailInitial as any}
          onSave={saveDetail} onClose={() => setModal(null)}
          onDelete={editDetail ? () => setModal({ kind: 'delDetail', ids: [editDetail.id] }) : undefined} />
      )}

      {/* ── 삭제 확인 2종 ── */}
      {modal?.kind === 'delGroup' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>코드구분 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                「<b className="text-foreground">{groups.find((g) => g.code === modal.code)?.name ?? modal.code}</b>」 코드구분을 삭제할까요?
                <br />삭제 후에는 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={doDelGroup} style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {modal?.kind === 'delDetail' && curG && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>코드 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                {modal.ids.length === 1
                  ? <>코드 「<b className="text-foreground">{(() => { const d = curDetails.find((x) => x.id === modal.ids[0]); return d ? `${d.code} ${d.name}` : modal.ids[0]; })()}</b>」 을 삭제할까요?</>
                  : <>선택한 <b className="text-foreground">{String(modal.ids.length)}건</b>의 코드를 삭제할까요?</>}
                <br />삭제 후에는 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={doDelDetail} style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </GridFrame>
  );
}
