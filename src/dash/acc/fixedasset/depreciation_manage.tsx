/* 감가상각비처리(ACC-018) — 회계 > 고정자산 > 감가상각비처리, route `acct-depreciation`. 요구사항 SFR-016-17 / SFR-018-01.
   설계서 정본: ACC-018 slide 9(개요) · 10(화면·그리드·계산 예시) · 11(상세필터) · 12(계정과목 설정) · 14~20(이벤트 E00~E10).

   설계서 → 우리 규약
   - 제목·브레드크럼 = 메뉴 리프 라벨 "감가상각비처리"(설계서 "결산관리 > 결산보정 > 감가상각" 표기는 따르지 않음) · KPI 배지 행 미포함(kpis 미전달).
   - 계정구분(필수) = 툴바 주 필터 칩(GridFrame `filterChips` `required: true`, '전체' 칩 없음, 기본 첫 계정구분 — closing_form_manage 관용구).
   - 기준년월(E01) = **상세필터 드로어에서만** 편집(툴바 날짜칸 없음 — general_journal_manage 기간 관용구). PeriodPicker month + DrawerField plain.
     기본값 현재월 − 1(slide 9 구성1·slide 10 ② — slide 11 상세필터 기본값 '당월'과 모순, 개요·툴바 쪽을 따름).
     드로어는 **즉시 반영**(값을 바꾸는 순간 목록·칩 반영, [필터 적용]은 닫기만 — account_code_manage 관용구, draft 없음). [초기화] = 기본값.
     적용 칩 '2026-10' 은 기본값으로 시작하고, 필수 조건이라 × 는 해제가 아니라 기본값 복원이다. 빈 값으로 지울 수 없다(같은 달 재클릭 무시).
   - 툴바 우: [상세필터] · [저장](E02) · [계정과목 설정](E03) · 조회(E04, IconBtn — 맨 끝). 저장·설정 모두 outline 단독 버튼 —
     설정 화면을 ▾ 안에 숨기던 [저장 │ ▾ 계정과목 설정] SplitButton 은 분리했다(2026-11-09 사용자 결정, apfs-grid "허용 combo ①" =
     같은 1차 액션의 대체 경로만). 저장(덮어쓰기 아님)은 클릭 즉시 반영 + 토스트, 덮어쓰기 확인창의 [확인]은 SaveButton(저장 중 스왑).
   - 그리드 체크박스 + 12열(자산유형 · 자산번호 · 자산명 · 취득일 · 종료일 · 내용년수 · 상각구분 · 전기말상각누계액 · 상각액 · 미상각잔액 · 취득금액 · 저장여부).
     금액·내용년수(수량)는 우측, 나머지 좌측. 저장여부 = 배지(여 success · 부 muted). 합계행 없음(설계서에 없다).
   - 행 선택(E05) 체크박스만(multiRow) → 선택 바 [삭제] · [선택 해제]. 더블클릭(E07)은 조회 전용이라 배선하지 않는다.
   - 푸터 = 새 창(E09) · 내보내기(E10, ⌥D) · 인쇄(푸터 4종 규약). "인쇄·다운로드 권한 보유자만 노출"은 RBAC 미구현이라 항상 노출.

   결정·가정
   - 상각액·전기말 누계·미상각잔액은 조회 때마다 계산한다(depreciation_model). 기준년월 이후 취득 자산은 목록 제외, 종료일이 지난 자산은 상각액 0.
   - 저장·삭제 원장은 기간 키(계정구분 + 기준년월)별 state — 다른 기간으로 갔다 와도 저장여부 '여'·삭제가 유지된다. [조회]는 삭제를 되살리지 않는다.
   - E02 저장 대상 = 현재 조회된 전체 행(선택과 무관 — 설계서 "일괄 저장"). 0건 → "저장할 내역이 없습니다." · 이미 저장된 행이 섞이면 덮어쓰기 확인.
     덮어쓰기 확인은 연 시점의 기간 키·행을 들고 있다(확인 지연 중 조건이 바뀌어도 그 기간에 쓴다).
   - E06 삭제 = 그 기간 계산 결과에서 행 제거(논리삭제). "자산 삭제"인지는 설계서 미결 — PM 확인.
   - 계정과목 설정 매핑은 화면 state(새로고침하면 기본값). 한계: 백엔드가 없어 저장·삭제는 화면 안에서만 유지된다. */
import '../../aggrid_shared.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellStyle, ColDef, GetRowIdParams, GridApi, GridReadyEvent, RowSelectionOptions, SelectionChangedEvent } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, AUTO_SIZE_CONTENT, numFmt } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection } from '../../aggrid_selection';
import { controlMinWidth } from '../../schemas/renderers';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../../ui/alert-dialog';
import { PeriodPicker } from '../../ui/period-picker';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import { todayStr } from '../slip/general_journal_data';
import { DEFAULT_MAPPING, DEPR_ASSETS, DEPR_FUND_ACCOUNTS } from './depreciation_data';
import type { AcctMapping, DeprFundAccount } from './depreciation_data';
import { MSG, buildRows, commitDelete, commitSave, defaultYm, periodKey, saveGate } from './depreciation_model';
import type { DeprRow, PeriodLedger, SavedYn } from './depreciation_model';
import { DepreciationAccountModal } from './depreciation_account_modal';

const { Button, IconBtn, SaveButton, StatusBadge } = UI;
const LABEL = '감가상각비처리';

/* ── 그리드 모듈 상수(렌더마다 새 객체면 컬럼 폭이 되돌아간다 — apfs-aggrid) ── */
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const tabNum: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const SAVED_TONE: Record<SavedYn, 'success' | 'muted'> = { 여: 'success', 부: 'muted' };

const COLUMNS: ColDef<DeprRow>[] = [
  { field: 'assetType', headerName: '자산유형', cellStyle: flexCenter },
  { field: 'assetNo', headerName: '자산번호', cellStyle: tabNum },
  /* 자산명 = 잔여폭 흡수 컬럼(apfs-aggrid PR #362 — acc_skill_rules ②) */
  { field: 'name', headerName: '자산명', flex: 1, minWidth: 180, width: 180, suppressAutoSize: true, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'acqDate', headerName: '취득일', cellStyle: tabNum },
  { field: 'endDate', headerName: '종료일', cellStyle: tabNum },
  { field: 'life', headerName: '내용년수', type: 'rightAligned' },
  { field: 'method', headerName: '상각구분', cellStyle: flexCenter },
  { field: 'priorAccum', headerName: '전기말상각누계액', type: 'rightAligned', valueFormatter: numFmt },
  { field: 'amount', headerName: '상각액', type: 'rightAligned', valueFormatter: numFmt },
  { field: 'remaining', headerName: '미상각잔액', type: 'rightAligned', valueFormatter: numFmt },
  { field: 'cost', headerName: '취득금액', type: 'rightAligned', valueFormatter: numFmt },
  { field: 'saved', headerName: '저장여부', cellStyle: flexCenter, cellRenderer: (p: { value: SavedYn }) => <StatusBadge tone={SAVED_TONE[p.value]} label={p.value} size="lg" /> },
];
const ROW_SELECTION: RowSelectionOptions<DeprRow> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };
const getRowId = (p: GetRowIdParams<DeprRow>) => p.data.id;

/* 엑셀 — 화면 컬럼과 1:1(체크박스 제외). 금액·내용년수는 숫자 셀 */
type XCol = { header: string; get: (r: DeprRow) => string | number; num?: boolean; wch?: number };
const EXPORT_COLS: XCol[] = [
  { header: '자산유형', get: (r) => r.assetType }, { header: '자산번호', get: (r) => r.assetNo }, { header: '자산명', get: (r) => r.name, wch: 26 },
  { header: '취득일', get: (r) => r.acqDate }, { header: '종료일', get: (r) => r.endDate }, { header: '내용년수', get: (r) => r.life, num: true, wch: 9 },
  { header: '상각구분', get: (r) => r.method }, { header: '전기말상각누계액', get: (r) => r.priorAccum, num: true, wch: 18 },
  { header: '상각액', get: (r) => r.amount, num: true, wch: 16 }, { header: '미상각잔액', get: (r) => r.remaining, num: true, wch: 18 },
  { header: '취득금액', get: (r) => r.cost, num: true, wch: 18 }, { header: '저장여부', get: (r) => r.saved, wch: 9 },
];

/* plain=<div> 래퍼 — PeriodPicker(버튼 트리거)는 <label> 안에서 2회 토글된다(apfs-datepicker) */
function DrawerField({ label, plain, children }: { label: string; plain?: boolean; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </Wrap>
  );
}
const monthWrap: React.CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('month'), maxWidth: '100%' };

type ModalState = null
  | { kind: 'overwrite'; key: string; rows: DeprRow[] }
  | { kind: 'delete'; key: string; ids: string[] }
  | { kind: 'account' };

export function DepreciationManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<DeprRow> | null>(null);
  const [account, setAccount] = useState<DeprFundAccount>(DEPR_FUND_ACCOUNTS[0]);
  const baseYm = useMemo(() => defaultYm(todayStr()), []);
  const [ym, setYm] = useState(baseYm);
  const [filterOpen, setFilterOpen] = useState(false);
  const [saved, setSaved] = useState<PeriodLedger>({});
  const [deleted, setDeleted] = useState<PeriodLedger>({});
  const [mapping, setMapping] = useState<readonly AcctMapping[]>(DEFAULT_MAPPING);
  const [modal, setModal] = useState<ModalState>(null);
  const [selIds, setSelIds] = useState<string[]>([]);
  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;

  const key = periodKey(account, ym);
  /* E00·E04 — 조건(계정구분·기준년월)으로 계산. 그 기간의 저장·삭제 원장을 반영한다 */
  const rows = useMemo(() => buildRows(DEPR_ASSETS, account, ym, saved, deleted), [account, ym, saved, deleted]);

  /* 선택 해제 — ref 도 즉시 비운다(같은 틱 setRows 뒤 restoreSelection 이 낡은 선택을 되살리지 않게) */
  const clearSel = () => { selIdsRef.current = []; setSelIds([]); apiRef.current?.deselectAll(); };
  /* 조건 변경 = 선택 전부 해제(2026-10-27 사용자 결정 — filter_clears_selection) */
  useEffect(() => { selIdsRef.current = []; setSelIds([]); apiRef.current?.deselectAll(); }, [account, ym]);

  const onGridReady = useCallback((e: GridReadyEvent<DeprRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<DeprRow>) => { setSelIds(e.api.getSelectedRows().map((r) => r.id)); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<DeprRow> }) => { restoreSelection(e.api, selIdsRef.current); }, []);

  /* 계정구분 칩(필수) — active 칩 재클릭은 무시 */
  const changeAccount = (a: DeprFundAccount) => { if (a !== account) setAccount(a); };
  /* E01 기준년월(상세필터, 즉시 반영) — 같은 달 재클릭(빈 값)은 무시해 항상 값이 있다 */
  const changeYm = (v: string) => { if (v) setYm(v); };
  const resetYm = () => setYm(baseYm);   // 드로어 [초기화] · 적용 칩 × = 기본값(필수 조건이라 해제 없음)

  /* E04 조회 — 현재 조건으로 재계산(rows 는 조건·원장에서 파생). 삭제한 행은 되살리지 않는다 */
  const refresh = () => { clearSel(); toast.success(MSG.queried); };

  /* E02 저장 — 0건 = 안내 · 저장된 행 포함 = 덮어쓰기 확인 · 그 밖 = 즉시 저장 */
  const commitGridSave = (k: string, rs: readonly DeprRow[]) => {
    setSaved((s) => commitSave(s, k, rs));
    toast.success(MSG.saved);
  };
  const saveGrid = () => {
    const gate = saveGate(rows);
    if (gate === 'empty') { toast.info(MSG.emptySave); return; }
    if (gate === 'overwrite') { setModal({ kind: 'overwrite', key, rows }); return; }
    commitGridSave(key, rows);
  };

  /* E06 삭제 — 선택 행 다건 허용, 확인 후 그 기간 계산 결과에서 논리삭제 */
  const askDelete = () => { if (selIds.length) setModal({ kind: 'delete', key, ids: [...selIds] }); };
  const runDelete = (k: string, ids: string[]) => () => {
    setSaved((s) => commitDelete(s, {}, k, ids).saved);       // 함수형 갱신 — 삭제 지연(400ms) 사이 원장 변화를 덮지 않게
    setDeleted((d) => commitDelete({}, d, k, ids).deleted);
    clearSel();
    setModal(null);
    toast.success(MSG.deleted);
  };

  /* E10 내보내기 — 현재 조회 결과. 금액은 숫자 셀(t:'n' + 천단위 서식) */
  const exportExcel = () => {
    if (!rows.length) { toast.error(MSG.noResult); return; }   // 0건 — 회계 장부조회와 같은 가드·문구(ledger_model MSG.noResult)
    const head = EXPORT_COLS.map((c) => c.header);
    const body = rows.map((r) => EXPORT_COLS.map((c) => c.get(r)));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    EXPORT_COLS.forEach((c, ci) => {
      if (!c.num) return;
      body.forEach((_, ri) => {
        const cell = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
        if (cell) { cell.t = 'n'; cell.z = '#,##0'; }
      });
    });
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.wch ?? 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, ym);
    XLSX.writeFile(wb, `${LABEL}_${ym}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };
  /* 모달·확인창·상세필터가 덮고 있으면 뒤 그리드 인쇄·내보내기 단축키를 끈다(⌘P 는 입력창에서도 발화) */
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: modal === null && !filterOpen, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: modal === null && !filterOpen, skipInDialog: true });

  const selActions = selIds.length > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selIds.length)}건 선택됨</span>
      <Button variant="outline" size="sm" leadingIcon="trash" onClick={askDelete}>삭제</Button>
      <Button variant="ghost" size="sm" onClick={clearSel}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '회계', '고정자산', LABEL]}
      title={LABEL}
      favRoute="acct-depreciation"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 주 필터 칩(계정구분, 필수라 '전체' 없음 · 칩 안 `*` 필수 표시) */
      filterChips={DEPR_FUND_ACCOUNTS.map((a) => ({ key: a, label: a, active: account === a, onSelect: () => changeAccount(a), required: true }))}
      contextActions={selActions}
      /* 기준년월 칩 — 기본값으로 시작. × = 기본값 복원(필수 조건) */
      appliedFilters={[{ label: '기준년월', value: ym, onClear: resetYm }]}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <Button variant="outline" size="sm" leadingIcon="check" onClick={saveGrid}>저장</Button>
        <Button variant="outline" size="sm" leadingIcon="settings" onClick={() => setModal({ kind: 'account' })}>계정과목 설정</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={modal || filterOpen ? undefined : HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{`총 ${String(rows.length)}건 중 ${String(rows.length)}건 표시`}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      <div>
        <AgGridReact<DeprRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={COLUMNS}
          defaultColDef={DEFAULT_COL_DEF}
          getRowId={getRowId}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}
          suppressColumnVirtualisation   // 13열이 프레임보다 넓다 — 가상화하면 화면 밖 열이 내용 맞춤에서 빠져 기본 폭(200)으로 남는다(실측). 행 ≤ 12건이라 비용 없음
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          onGridReady={onGridReady}
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">상각 대상 자산이 없습니다. 계정구분·기준년월을 바꿔 조회하세요.</span>'}
        />
      </div>

      {/* ── E01 상세필터 — 조건 1개(기준년월). 즉시 반영, [필터 적용] = 닫기 ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">감가상각 계산 기준년월을 고르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="기준년월" plain>
              <div style={monthWrap}><PeriodPicker mode="month" value={ym} onChange={changeYm} ariaLabel="기준년월" /></div>
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={resetYm}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── E02 덮어쓰기 확인 — 확인 시 클릭 시점 기간에 재계산 결과로 갱신 ── */}
      {modal?.kind === 'overwrite' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'overwrite' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>덮어쓰기 확인</AlertDialogTitle>
              <AlertDialogDescription>{MSG.overwriteConfirm}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <SaveButton busyLabel="저장 중" onSubmit={() => () => { commitGridSave(modal.key, modal.rows); setModal(null); }}>확인</SaveButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── E06 삭제 확인 ── */}
      {modal?.kind === 'delete' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'delete' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>삭제 확인</AlertDialogTitle>
              <AlertDialogDescription>{MSG.deleteConfirm}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <SaveButton leadingIcon="trash" busyLabel="삭제 중" style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }} onSubmit={() => runDelete(modal.key, modal.ids)}>삭제</SaveButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── E03 계정과목 설정 ── */}
      {modal?.kind === 'account' && (
        <DepreciationAccountModal initial={mapping} onSave={setMapping} onClose={() => setModal(null)} />
      )}
    </GridFrame>
  );
}
