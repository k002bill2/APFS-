/* 회계거래처관리 — 관리형 리스트 페이지 (회계 > 설정 > 회계거래처관리, route acct-partner, 화면ID ACC-026).
   출처: ACC-026 화면설계서(slide 9 개요 · 10 목록 · 11 상세필터 · 12 등록/수정 모달 · 14~20 이벤트 E00~E08)
   → APFS 디자인시스템(골드 acc/baseinfo/account_code_manage 골격).

   설계서 → 우리 규약:
   - 툴바: [상세필터](E01) → [회계거래처 등록](E02, ⌘⏎) → 조회(E03, IconBtn refresh 맨 끝). 주 필터칩 없음.
   - 그리드 10열(거래처번호·내부거래처코드·거래처유형·거래처명·사업자등록번호·대표자명·관리번호·국내/해외·국가·대표회사전화번호)
     + 선택 체크박스. 거래처번호 오름차순, getRowId=거래처번호.
     기본 정렬 표시 없음(데이터 순서로 오름차순 — filterPartners 가 sortByNo, 사용자 지적 2026-11-06). 헤더 클릭 정렬은 그대로.
     거래처명 = 잔여폭 흡수 컬럼(flex:1, AUTO_SIZE_CONTENT 규약 ②).
     코드·번호·여부 모두 좌측 정렬(표 정렬 규약 — 가운데 정렬 없음).
   - 상세필터 드로어 6개(거래처유형·거래처명·대표자명·사업자등록번호·국내/해외·국가) — 즉시 반영, [초기화], 적용 칩(값만, × 개별 해제).
   - 선택은 체크박스로만 → 선택 바 "N건 선택됨 · [수정] · [삭제] · [선택 해제]"(E04). 행 더블클릭/Enter/[수정] = 「회계거래처 수정」(E06).
     [수정]은 1건 선택일 때만 활성(2건 이상이면 비활성 — 숨기지 않음).
   - 삭제(E05) = 게이트(연결 전표 1건이라도 → 토스트 후 전체 중단) → AlertDialog 「삭제 확인」 → 논리삭제(목록에서 제거).
   - 새 창(E07)·내보내기(E08, 엑셀 ⌥D) = 푸터 FooterActions.
   - KPI 배지 행 미포함(사용자 확정) · 카드헤더 sub 캡션 없음 · 카드뷰 없음 · 명세 팝업 없음.

   결정·가정:
   - 연결 전표 여부 = seed `hasJournal` 플래그(데모 — 실제는 전표 테이블 조회). 전표등록 거래처 10건 중 6건 true.
   - 논리삭제분(deletedRows)은 화면에 보이지 않지만 채번(최댓값+1)·사업자번호 중복 판정에 포함한다 — 삭제한 번호·사업자번호 재사용 방지.
   - 거래처번호 = 저장 시 채번 P000NNN(모달엔 '자동채번' 표시). 관리번호는 모달 입력 항목이 아니라 신규 등록은 '-'.
   - 저장 검증 = 항목별(설계서 12p ② "저장 시 이 순서(위→아래)대로 검증" · ③ "첫 번째 미충족 항목 안내" — 업무 규칙 우선).
     ② 표 순서 거래처유형 → 사업자등록번호(국내: 필수·형식·중복) → 법인등록번호 → 국내/해외 → 국가 → 해외등록번호(해외) → 거래처명
     → 계좌 행 → 주계좌(2개 이상 / 계좌 있는데 0개)를 한 항목씩 보고 첫 실패에서 멈춘다. 그래서 거래처명이 비고 사업자번호 형식이
     틀리면 사업자번호 형식 문구가 먼저다. 모달 칸 배치(2단)와 ② 표 순서가 달라 포커스가 위아래로 오갈 수 있다. 필수 문구는 설계서 표기 '을(를)' 그대로.
   - 사업자등록번호는 000-00-00000 으로 정규화해 저장(해외 '-'). 국내면 국가 대한민국 고정·해외등록번호 '-', 개인이면 법인등록번호 '-'.
   - 변경 이력 = 수정 저장 시 거래처명(trim) 또는 사업자번호(숫자)가 바뀌면 오늘(로컬 일자)로 1행 자동 추가.
   - 저장 성공 → 모달 닫힘 · 목록 갱신 · 저장 행 선택(selIdsRef 선반영 → onRowDataUpdated restoreSelection).
   - 필터를 바꾸면 선택 전부 해제(apfs-detail-filter 2026-10-27).

   설계서와 다른 점(PM 확인 대기):
   ① 상세필터 [필터 적용] 버튼 방식 → 즉시 반영(2026-11-03 전 화면 통일). [필터 적용]은 닫기만 한다.
   ② 툴바 [등록] → [회계거래처 등록](도메인 액션명 — 축약 금지 규약).
   ③ 모달 제목 단일 → 「회계거래처 등록」/「회계거래처 수정」 분리.
   ④ E04 '다건 선택 시 허용 안함' vs E05 '다건 선택 시 전체 중단' 모순 → 다건 선택 허용 + 게이트 전체 중단으로 구현.
   ⑤ 연결 전표 판정 = seed 플래그(백엔드 없음).
   ⑥ '권한 보유자만 노출' — RBAC 데모가 없어 버튼·삭제를 항상 노출.
   ⑦ 그 외: 그리드 컬럼 수 표기 불일치(개요 11열 vs 목록 10열 — ☐ 포함 여부 차이로 보고 10열 + 선택 체크박스로 구현) ·
      툴팁형 검증 → 필드 에러(빨간 테두리 + 인라인 + 토스트 + 포커스) · 첨부 드롭존 안내 문구는 공용 DocumentsField 문구
      ('파일을 끌어다 놓거나 찾아보기')를 따르며 설계서 문구('업로드하실 파일을 이곳으로 드래그하시거나 클릭해주세요')와 다름 ·
      주계좌는 행 라디오라 2개 이상 지정이 UI 로는 불가(검증 함수엔 남김) ·
      [추가 규칙] 계좌가 1개 이상인데 주계좌가 없으면 저장 중단 '주계좌를 지정해 주세요.' + 주계좌 행을 삭제하면 남은 첫 행을 주계좌로 승격(설계서에 없음) · 입력 중 닫기 확인 문구 「작성 중인 내용이 사라집니다. 닫으시겠습니까?」.
   ⑧ 선택 바 [수정] 추가(사용자 지정 2026-11-06, 설계서는 [삭제]만).
   ⑨ 모달 계좌 정보 도구 = 제목 옆 좌측(apfs-form-modal 규약 7), [삭제]는 선택 시에만·danger.
   ⚠ 백엔드가 없어 등록·수정·삭제는 화면 로컬 상태만 바꾼다. */
import '../../aggrid_shared.css';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, AUTO_SIZE_CONTENT } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection } from '../../aggrid_selection';
import { drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, RowDoubleClickedEvent, CellStyle, RowSelectionOptions } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '../../ui/alert-dialog';
import { DrawerSelect } from '../../drawer_select';
import { demoPartners, PARTNER_TYPES, REGIONS, COUNTRIES } from './partner_data';
import type { PartnerRow } from './partner_data';
import { filterPartners, sortByNo, nextPartnerNo, appendHistory, localYmd, deleteGate, logicalDelete, DELETE_BLOCKED_MSG } from './partner_model';
import { PartnerFormModal } from './partner_form_modal';
import type { PartnerPatch } from './partner_form_modal';

const { Button, IconBtn } = UI;

const PAGE_SIZE = 20;

/* ──────────────────────────────
   컬럼 정의 — 설계서 slide10 순서. 정렬 규약상 전부 좌측(수량형 숫자 없음)
────────────────────────────── */
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const codeStyle: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };

const columnDefs: ColDef<PartnerRow>[] = [
  { field: 'partnerNo', headerName: '거래처번호', maxWidth: 130, cellStyle: codeStyle },
  { field: 'internalCode', headerName: '내부거래처코드', maxWidth: 140, cellStyle: codeStyle },
  { field: 'type', headerName: '거래처유형', maxWidth: 110, cellStyle: flexCenter },
  { field: 'name', headerName: '거래처명', flex: 1, minWidth: 200, width: 200, suppressAutoSize: true, cellStyle: { ...flexCenter, fontWeight: 600 }, tooltipField: 'name' },
  { field: 'bizNo', headerName: '사업자등록번호', maxWidth: 150, cellStyle: codeStyle },
  { field: 'ceo', headerName: '대표자명', maxWidth: 140, cellStyle: flexCenter },
  { field: 'mgmtNo', headerName: '관리번호', maxWidth: 130, cellStyle: codeStyle },
  { field: 'region', headerName: '국내/해외', maxWidth: 110, cellStyle: flexCenter },
  { field: 'country', headerName: '국가', maxWidth: 110, cellStyle: flexCenter },
  { field: 'phone', headerName: '대표회사전화번호', maxWidth: 170, cellStyle: codeStyle },
];
/* 다중 선택 — 체크박스로만 on/off(행 본문 클릭 선택 없음) */
const ROW_SELECTION: RowSelectionOptions<PartnerRow> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };

type XCol = { header: string; get: (r: PartnerRow) => string };
const EXPORT_COLS: XCol[] = [
  { header: '거래처번호', get: (r) => r.partnerNo }, { header: '내부거래처코드', get: (r) => r.internalCode }, { header: '거래처유형', get: (r) => r.type },
  { header: '거래처명', get: (r) => r.name }, { header: '사업자등록번호', get: (r) => r.bizNo }, { header: '대표자명', get: (r) => r.ceo },
  { header: '관리번호', get: (r) => r.mgmtNo }, { header: '국내/해외', get: (r) => r.region }, { header: '국가', get: (r) => r.country },
  { header: '대표회사전화번호', get: (r) => r.phone },
];

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null
  | { kind: 'form'; mode: 'create' | 'edit'; no?: string }
  | { kind: 'delete'; ids: string[] };

export function PartnerManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<PartnerRow> | null>(null);
  const [rows, setRows] = useState<PartnerRow[]>(() => demoPartners());
  /* 논리삭제분 — 화면엔 안 보이지만 채번·사업자번호 중복 판정 대상 */
  const [deletedRows, setDeletedRows] = useState<PartnerRow[]>([]);
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);

  /* 상세필터(설계서 slide11 — 6개, 기본 '전체'). 즉시 반영 */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fType, setFType] = useState('');
  const [fName, setFName] = useState('');
  const [fCeo, setFCeo] = useState('');
  const [fBizNo, setFBizNo] = useState('');
  const [fRegion, setFRegion] = useState('');
  const [fCountry, setFCountry] = useState('');
  const clearFilters = () => { setFType(''); setFName(''); setFCeo(''); setFBizNo(''); setFRegion(''); setFCountry(''); };

  /* E02 등록 ⌘⏎ · 인쇄 · E08 내보내기 ⌥D — 모달·드로어가 열려 있지 않을 때만 */
  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'form', mode: 'create' }), { enabled: modal === null && !filterOpen, skipInDialog: true });
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: modal === null && !filterOpen, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: modal === null && !filterOpen, skipInDialog: true });

  /* E00 진입 = 필터 없음 전체 조회 */
  const visible = useMemo(() => filterPartners(rows, { type: fType, name: fName, ceo: fCeo, bizNo: fBizNo, region: fRegion, country: fCountry }), [rows, fType, fName, fCeo, fBizNo, fRegion, fCountry]);

  /* 필터를 바꾸면 선택을 전부 해제한다(2026-10-27 사용자 결정 — apfs-detail-filter) */
  useEffect(() => { apiRef.current?.deselectAll(); }, [fType, fName, fCeo, fBizNo, fRegion, fCountry]);

  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  const onGridReady = useCallback((e: GridReadyEvent<PartnerRow>) => { apiRef.current = e.api; }, []);
  /* E04 체크박스 선택 */
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<PartnerRow>) => {
    setSelIds(e.api.getSelectedRows().map((r) => r.partnerNo));
  }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<PartnerRow> }) => {
    restoreSelection(e.api, selIdsRef.current);
    /* 저장 행이 현재 필터 밖이면 선택이 복원되지 않는다 — 선택 바가 없는 행을 가리키지 않게 그리드 실제 선택으로 맞춘다 */
    setSelIds(e.api.getSelectedRows().map((r) => r.partnerNo));
  }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* E06 행 더블클릭 / Enter / 선택 바 [수정] = 수정 — 열기 함수 하나 */
  const openEdit = useCallback((no: string) => setModal({ kind: 'form', mode: 'edit', no }), []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<PartnerRow>) => { if (e.data && !e.rowPinned) openEdit(e.data.partnerNo); }, [openEdit]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<PartnerRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    openEdit(e.data.partnerNo);
  }, [openEdit]);

  const target = modal?.kind === 'form' && modal.no ? rows.find((r) => r.partnerNo === modal.no) ?? null : null;
  const pool = useMemo(() => [...rows, ...deletedRows], [rows, deletedRows]);

  /* ── E02/E06 저장 — 등록: 채번 · 수정: 변경 이력 자동 기록. 저장 행을 선택해 둔다 ── */
  const save = (patch: PartnerPatch) => {
    if (!modal || modal.kind !== 'form') return;
    let no: string;
    if (modal.mode === 'create') {
      no = nextPartnerNo(pool.map((r) => r.partnerNo));
      const row: PartnerRow = { ...patch, partnerNo: no, mgmtNo: '-', hasJournal: false, history: [] };
      selIdsRef.current = [no]; setSelIds([no]);
      setRows((prev) => sortByNo([...prev, row]));
    } else {
      if (!target) return;   // 수정 대상이 사라졌으면 아무것도 하지 않는다
      no = target.partnerNo;
      const history = appendHistory(target, patch, localYmd(new Date()));
      selIdsRef.current = [no]; setSelIds([no]);
      setRows((prev) => prev.map((r) => (r.partnerNo === no ? { ...r, ...patch, history } : r)));
    }
    /* setModal(null) 은 부르지 않는다 — 모달이 commit 에서 ref.close() 로 exit 애니메이션 후 onClose 를 부른다 */
  };

  /* ── E05 삭제 실행 — 논리삭제. setModal 은 부르지 않는다: 닫기는 AlertDialog onOpenChange 가 맡는다(exit 애니메이션 보존) ── */
  const doDelete = (ids: string[]) => {
    const next = logicalDelete(rows, deletedRows, ids);
    setRows(next.rows);
    setDeletedRows(next.deleted);
    apiRef.current?.deselectAll();
    toast.success('삭제되었습니다');
  };

  /* E05 삭제 요청 — 연결 전표가 있는 거래처가 1건이라도 섞이면 확인창 없이 전체 중단 */
  const requestDelete = () => {
    if (!deleteGate(rows, selIds).ok) { toast.error(DELETE_BLOCKED_MSG); return; }
    setModal({ kind: 'delete', ids: selIds });
  };

  /* E03 조회 — 백엔드가 없어 로컬 상태(등록·수정·삭제·필터)를 유지하고 선택만 푼다 */
  const refresh = () => { apiRef.current?.deselectAll(); toast.success('조회되었습니다'); };

  /* ── E08 Excel — 표시 중인 행 ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => c.get(r)));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '거래처명' ? 30 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '회계거래처관리');
    XLSX.writeFile(wb, '회계거래처관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(visible.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  /* 적용 칩 label = 드로어 캡션 정확일치(칩 클릭 → 그 칸으로 이동) */
  const chips: [string, string, () => void][] = [
    ['거래처유형', fType, () => setFType('')],
    ['거래처명', fName.trim(), () => setFName('')],
    ['대표자명', fCeo.trim(), () => setFCeo('')],
    ['사업자등록번호', fBizNo.trim(), () => setFBizNo('')],
    ['국내/해외', fRegion, () => setFRegion('')],
    ['국가', fCountry, () => setFCountry('')],
  ];

  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      {/* 수정 = 단일 대상 액션(selCount===1 게이트) — 2건 이상이면 숨기지 않고 비활성(missing_evidence_manage 선례), 삭제 = 벌크 */}
      <Button variant="primary" size="sm" disabled={selCount !== 1} onClick={() => { if (selCount === 1) openEdit(selIds[0]); }}>수정</Button>
      <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: 'var(--danger)' }} onClick={requestDelete}>삭제</Button>
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;

  const textKeys = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); };

  return (
    <GridFrame
      crumbs={['홈', '회계', '설정', '회계거래처관리']}
      title="회계거래처관리"
      favRoute="acct-partner"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      contextActions={selActions}
      appliedFilters={chips.map(([label, value, onClear]) => ({ label, value, onClear }))}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'form', mode: 'create' })}>회계거래처 등록</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{'총 ' + String(rows.length) + '건 중 ' + String(visible.length) + '건 · ' + String(Math.min(shown, visible.length)) + '건 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<PartnerRow>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.partnerNo}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          autoSizeStrategy={AUTO_SIZE_CONTENT}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          onGridReady={onGridReady}
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다. 검색 조건을 변경해 주세요.</span>'}
        />
      </div>

      {/* ── E01 상세필터 드로어 — 설계서 6개 조건, 즉시 반영(검색어 opt-in 미사용: 거래처명이 텍스트 조건) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">회계거래처 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="거래처유형"><DrawerSelect value={fType} onChange={setFType} options={[...PARTNER_TYPES].reverse()} ariaLabel="거래처유형" /></DrawerField>
            <DrawerField label="거래처명">
              <input type="text" value={fName} onChange={(e) => setFName(e.target.value)} onKeyDown={textKeys} placeholder="거래처명" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="대표자명">
              <input type="text" value={fCeo} onChange={(e) => setFCeo(e.target.value)} onKeyDown={textKeys} placeholder="대표자명" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="사업자등록번호">
              <input type="text" value={fBizNo} onChange={(e) => setFBizNo(e.target.value)} onKeyDown={textKeys} placeholder="숫자만 입력해도 됩니다" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="국내/해외"><DrawerSelect value={fRegion} onChange={setFRegion} options={[...REGIONS]} ariaLabel="국내/해외" /></DrawerField>
            <DrawerField label="국가"><DrawerSelect value={fCountry} onChange={setFCountry} options={[...COUNTRIES]} ariaLabel="국가" /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── E02 등록 / E06 수정 모달 ── */}
      {modal?.kind === 'form' && (modal.mode === 'create' || target) && (
        <PartnerFormModal mode={modal.mode} initial={modal.mode === 'edit' ? target! : undefined} pool={pool}
          onSave={save} onClose={() => setModal(null)} />
      )}

      {/* ── E05 삭제 확인 — 게이트는 modal.kind(현재 rows 파생값이면 doDelete 직후 동기 언마운트돼 exit 가 사라진다).
             AlertDialogAction 은 Radix 닫기 버튼이라 onClick 직후 onOpenChange(false) 가 따라온다 → 거기서만 비운다. ── */}
      {modal?.kind === 'delete' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'delete' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>삭제 확인</AlertDialogTitle>
              <AlertDialogDescription>선택한 항목을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => doDelete(modal.ids)} style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </GridFrame>
  );
}
