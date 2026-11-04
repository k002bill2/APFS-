/* 유무형자산관리(ACC-017) — 회계 > 고정자산 > 유무형자산관리, route `acct-fixed-asset`.
   설계서 정본: ACC-017 슬라이드 9~15(화면·그리드·상세필터·모달 3종) · 17~26(이벤트 E00~E10).
   골격 정본 = acc/slip/general_journal_manage · suspense_manage(툴바·선택 바·상세필터 드로어·칩·푸터·엑셀) · 탭 = ledger/daily_monthly_manage(TabBar).

   구성(설계서 → 우리 규약)
   - 제목 "유무형자산관리"(메뉴 리프 라벨) · KPI 배지 행 미포함(사용자 결정 → kpis 미전달) · 카드헤더 sub 캡션 없음.
   - 툴바: [상세필터](E01) → [+ 유무형자산 등록](E02 · 총괄 탭만, ⌘⏎) → ⟳ 조회(E10 · ⌥R). 엑셀은 푸터 내보내기(E09 · ⌥D)만,
     새 창·인쇄도 푸터(FooterActions — 회계 화면 공통).
   - 탭 2개(E03 · 공용 TabBar): 총괄 / 변동내역. 전환 시 선택 초기화 · 필터 유지. 활성 탭 그리드만 마운트한다.
   - 그리드 = 설계서 컬럼 순서(총괄 체크박스 + 19 · 변동내역 체크박스 + 15). 계정구분 > 자산유형 그룹 순서로 정렬하고
     계정구분·자산유형 값은 모든 행((계) 포함)에 있고, 화면은 같은 페이지 직전 행과 같은 그룹이면 숨긴다 — 페이지 첫 행은 항상 표시
     (셀 병합 대신 — AG Grid Community rowSpan 은 페이지 경계·선택과 충돌). 엑셀은 모든 행에 값을 채워 내보낸다.
     그룹 끝 (계) 소계 행(본문 안, --muted + 굵게) · 맨 아래 pinned Σ 합계 행. 소계·합계는 선택·더블클릭·링크 제외. 헤더 정렬 끔(소계 위치 고정).
     합계 대상 = 설계서 컬럼 정의 '합산' 표기 컬럼(총괄: 취득원가·전기말장부가액·전기말상각누계액·감가상각누계액·잔존가액 /
     변동내역: 처리수량·매각액·취득가감소액). 코드·텍스트 '중앙' 정렬 → 좌측(표 정렬 규약).
   - 행 선택(E05 — 체크박스만, multiRow) → 선택 바:
       총괄 = [전표생성](E06) · [변동 등록](E04 · 정확히 1건) · [삭제](E07) · [선택 해제]
       변동내역 = [전표생성](E06) · [삭제](E07 = 변동 취소) · [선택 해제]
   - 행 더블클릭/Enter(E08) = 등록/수정 모달(총괄만). 전표번호 셀 = 링크(클릭·Enter) → 일반전표 관리로 이동.
   - 상세필터 6개(즉시 반영 — 값을 바꾸는 순간 목록·칩 반영, [필터 적용]은 닫기만 · account_code_manage 동형):
     기준년월*(PeriodPicker month · 기본 당월 · 비울 수 없음) · 계정구분 · 자산유형(계정구분 종속) · 자산번호 · 자산명 · 취득기간.
     취득기간 시작 > 종료면 그 항목 인라인 오류 '취득기간을 확인해 주세요.' + 범위 조건만 무시. 적용 칩은 값만, 기준년월 칩 × = 당월 복원.
   - 기준년월 이후 취득일로 저장하면 info 토스트 "기준년월(YYYY-MM) 이후 취득 자산이라 목록에 표시되지 않습니다.".
   - 업무 규칙은 fixed_asset_model(+테스트) — 페이지는 배선만.

   결정·가정(PR "설계서와 다른 점"에도 기재)
   - 변동 등록(E04) 진입 = 총괄 탭 선택 바 [변동 등록](1건 선택 시만 노출). 설계서의 "변동내역 탭 툴바 [+ 등록] → 총괄 탭 선택 자산 기준"은
     탭 전환 시 선택 초기화(E03)와 모순이라, 변동내역 탭 툴바에는 등록 버튼을 두지 않는다.
   - 변동내역 행 더블클릭(설계서 "변동 수정")은 수정 항목 명세가 없어 배선하지 않는다.
   - 기준년월 = 그 달 말일까지 취득한 자산 · 그 날까지의 변동만 반영(수량·잔존가액·자산상태 파생). 기준년월별 감가상각 재계산은 데이터 연동 후.
   - 전표번호가 없으면 전표결재상태는 '-'(설계서 "미표시" — 텍스트 N/A 규약).
   - 변동 취소는 같은 자산의 최근 변동부터, 새 변동일은 같은 자산 최근 변동일 이후만(저장 스냅샷 A·B 무결성 — 설계서에 없는 규칙).
   - 처분손익: 변동 등록 모달의 H 는 설계서 산식 H = D − E − G + F 그대로 표시하고, 전표 분개의 처분손익은 차대 균형이 보장되는
     F − E(장부가 − 매각액)로 잡는다 — H(표시)와 분개 처분손익(F − E) 불일치, PM 산식 확정 필요(설계서 샘플: H = −1,054 / 분개 손실 68). */
import '../../aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import React, { useState, useRef, useEffect, useCallback, useMemo, useId } from 'react';
import { UI } from '../../components';
import type { Tone } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, AUTO_SIZE_CONTENT, fmt, numStyle } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection } from '../../aggrid_selection';
import { drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, CellStyle, RowSelectionOptions, SelectionChangedEvent, RowDoubleClickedEvent, CellKeyDownEvent, ICellRendererParams, RowClassParams } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../../ui/alert-dialog';
import type { DialogHandle } from '../../ui/dialog';
import { PeriodPicker } from '../../ui/period-picker';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { DrawerSelect } from '../../drawer_select';
import { TabBar, TabPanel } from '../../risk_page_kit';
import { LinkCell } from '../../link_cell';
import { controlMinWidth } from '../../schemas/renderers';
import { PARTNERS, todayStr } from '../slip/general_journal_data';
import type { Partner } from '../slip/general_journal_data';
import { DrawerField, DayRangeField } from '../ledger/ledger_filter_ui';
import { FA_FUNDS, typeNamesOf } from './fixed_asset_data';
import type { AssetChange, FixedAsset, VoucherStatus } from './fixed_asset_data';
import {
  DELETE_MSG, VOUCHER_MSG, assetPasses, effectiveFilter, monthEnd, rangeError, showGroupLabel, cancelChangeGate, changeOpenGate, changeRows, changeTotal, changesUntil, commitAsset, commitChange,
  commitVouchers, defaultFilter, deleteAssetGate, demoFixedAssets, deriveAsset, prepareAcquisition, prepareDisposal, reconcileType,
  summaryRows, summaryTotal,
} from './fixed_asset_model';
import type { AssetPatch, AssetView, ChangeInput, ChangeRow, FaFilter, SummaryRow, VoucherDraft } from './fixed_asset_model';
import { FixedAssetFormModal } from './fixed_asset_form_modal';
import { AssetChangeModal } from './asset_change_modal';
import { AssetVoucherModal } from './asset_voucher_modal';

const { Button, SaveButton, IconBtn, StatusBadge } = UI;

const PAGE_SIZE = 20;
type Tab = 'summary' | 'change';
const TABS: { id: Tab; label: string }[] = [{ id: 'summary', label: '총괄' }, { id: 'change', label: '변동내역' }];
const APPROVAL_TONE: Record<VoucherStatus, Tone> = { 미상신: 'muted', 결재중: 'info', 승인: 'success', 반려: 'danger' };

/* ──────────────────────────────
   컬럼 — 금액·수량만 우측, 나머지 좌측. 소계·합계 행의 N/A 는 빈 칸, 데이터 행의 N/A 는 '-'
────────────────────────────── */
type AnyRow = SummaryRow | ChangeRow;
const isItem = (r: AnyRow | undefined) => !!r && (r.kind === 'asset' || r.kind === 'change');
const COL_DEF: ColDef = { ...DEFAULT_COL_DEF, sortable: false };   // 그룹·(계) 소계 위치 고정
const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const SUM_STYLE = { background: 'var(--muted)', fontWeight: 700 };
const rowStyle = <T extends AnyRow>(p: RowClassParams<T>) => (p.data?.kind === 'sub' ? SUM_STYLE : undefined);
const numFmtNA = (p: { value: number | null; data?: AnyRow }) => (p.value == null ? (isItem(p.data) ? '-' : '') : fmt(p.value));
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const badgeCell = (p: ICellRendererParams<AnyRow, VoucherStatus | null>) => {
  if (!isItem(p.data)) return null;
  return p.value ? <StatusBadge tone={APPROVAL_TONE[p.value]} label={p.value} size="lg" /> : <span>-</span>;
};
/* 계정구분·자산유형 — 모든 행에 값이 있고, 같은 페이지 직전 행과 같은 그룹이면 숨긴다(페이지 첫 행은 항상 표시 — 2쪽에서도 그룹이 보이게) */
const groupCell = (p: ICellRendererParams<AnyRow, string>) => {
  if (!p.data || p.node.rowPinned) return null;
  const idx = p.node.rowIndex ?? 0;
  const size = p.api.paginationGetPageSize();
  const prev = idx % size === 0 ? null : (p.api.getDisplayedRowAtIndex(idx - 1)?.data ?? null);
  return showGroupLabel(prev, p.data, p.colDef?.field === 'fund' ? 'fund' : 'assetType') ? <span className="min-w-0 truncate">{p.value}</span> : null;
};
/* 그룹 라벨은 rowIndex·페이지에 달린 값이라 모델·페이지가 바뀌면 다시 그린다(refreshCells 는 모델을 바꾸지 않아 루프 없음) */
const GROUP_COLS = ['fund', 'assetType'];
const refreshGroupCols = (e: { api: GridApi }) => { e.api.refreshCells({ columns: GROUP_COLS, force: true }); };
type SlipCtx = { openSlip: () => void };
/* 전표번호 셀 — COLUMNS 는 모듈 상수라 이동 핸들러를 grid context 로 받는다(suspense_manage 동형) */
const slipCell = (p: ICellRendererParams<AnyRow, string | null, SlipCtx>) => {
  if (!isItem(p.data) || p.node.rowPinned) return null;
  return p.value ? <LinkCell value={p.value} tabular hint="일반전표 관리로 이동" onClick={() => p.context.openSlip()} /> : <span>-</span>;
};
const amountCol = <T extends AnyRow>(field: string, headerName: string): ColDef<T> =>
  ({ field: field as any, headerName, type: 'rightAligned', valueFormatter: numFmtNA as any, cellStyle: numStyle() as any });
const noCol = <T extends AnyRow>(): ColDef<T> => ({
  colId: 'no', headerName: 'No.', width: 64, minWidth: 64, cellStyle: tabNum,
  valueGetter: (p) => (p.data?.kind === 'total' ? '합계' : p.data?.no ?? ''),
});
const groupCol = <T extends AnyRow>(field: 'fund' | 'assetType', headerName: string, maxWidth: number): ColDef<T> =>
  ({ field: field as any, headerName, maxWidth, cellStyle: flexCenter, cellRenderer: groupCell });

/* 자산명 = 잔여폭 흡수 컬럼(apfs-aggrid PR #362 — 프레임이 컬럼 합보다 넓으면 우측이 빈다). suppressAutoSize 가 없으면 fitCellContents 가 flex 폭을 덮어쓴다 */
const NAME_COL: ColDef<AnyRow> = { field: 'name', headerName: '자산명', flex: 1, minWidth: 180, width: 180, suppressAutoSize: true, cellStyle: flexCenter, cellRenderer: textCell };
const SUMMARY_COLS: ColDef<SummaryRow>[] = [
  noCol(),
  groupCol('fund', '계정구분', 220), groupCol('assetType', '자산유형', 140),
  { field: 'assetNo', headerName: '자산번호', cellStyle: tabNum },
  NAME_COL as ColDef<SummaryRow>,
  /* cellDataType 'text' — 첫 행 값으로 dateString 이 추론되면 소계 행 '(계)' 가 빈 칸으로 그려진다(실측) */
  { field: 'acqDate', headerName: '취득일', cellDataType: 'text', cellStyle: tabNum },
  amountCol('cost', '취득원가'),
  amountCol('qty', '수량'),
  amountCol('prevBook', '전기말장부가액'), amountCol('prevAccum', '전기말상각누계액'), amountCol('accum', '감가상각누계액'), amountCol('residual', '잔존가액'),
  { field: 'acqKind', headerName: '취득구분' }, { field: 'status', headerName: '자산상태' }, { field: 'deprKind', headerName: '상각구분' },
  amountCol('life', '내용년수'),
  { field: 'userKind', headerName: '사용자' },
  { field: 'slipNo', headerName: '전표번호', cellStyle: { ...tabNum, ...flexCenter }, cellRenderer: slipCell },
  { field: 'approval', headerName: '전표결재상태', cellStyle: flexCenter, cellRenderer: badgeCell },
];
const CHANGE_COLS: ColDef<ChangeRow>[] = [
  noCol(),
  groupCol('fund', '계정구분', 220), groupCol('assetType', '자산유형', 140),
  { field: 'assetNo', headerName: '자산번호', cellStyle: tabNum },
  NAME_COL as ColDef<ChangeRow>,
  { field: 'date', headerName: '변동일', cellDataType: 'text', cellStyle: tabNum },
  { field: 'chKind', headerName: '변동구분' }, { field: 'proc', headerName: '처리구분' },
  amountCol('qty', '처리수량'), amountCol('sale', '매각액'), amountCol('residual', '잔존가액'), amountCol('remain', '잔여수량'), amountCol('decrease', '취득가감소액'),
  { field: 'slipNo', headerName: '전표번호', cellStyle: { ...tabNum, ...flexCenter }, cellRenderer: slipCell },
  { field: 'approval', headerName: '전표결재상태', cellStyle: flexCenter, cellRenderer: badgeCell },
];

/* 다중 선택 — 체크박스로만. (계) 소계 행은 선택 불가(SelectCell·헤더 3상태가 selectable=false 를 건너뛴다). 모듈 상수(참조 안정) */
const ROW_SELECTION_SUMMARY: RowSelectionOptions<SummaryRow> = {
  mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false,
  isRowSelectable: (n) => n.data?.kind === 'asset',
};
const ROW_SELECTION_CHANGE: RowSelectionOptions<ChangeRow> = {
  mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false,
  isRowSelectable: (n) => n.data?.kind === 'change',
};

/* 엑셀 — 화면 컬럼과 1:1(체크박스 제외) · Σ·(계) 행 포함(E09). 금액·수량만 숫자셀 */
type XCol<T> = { header: string; get: (r: T) => string | number | null };
const noOf = (r: AnyRow) => (r.kind === 'total' ? 'Σ' : r.kind === 'sub' ? '' : r.no ?? '');
const SUMMARY_X: XCol<SummaryRow>[] = [
  { header: 'No.', get: noOf }, { header: '계정구분', get: (r) => r.fund }, { header: '자산유형', get: (r) => r.assetType },
  { header: '자산번호', get: (r) => r.assetNo }, { header: '자산명', get: (r) => r.name }, { header: '취득일', get: (r) => r.acqDate },
  { header: '취득원가', get: (r) => r.cost }, { header: '수량', get: (r) => r.qty }, { header: '전기말장부가액', get: (r) => r.prevBook },
  { header: '전기말상각누계액', get: (r) => r.prevAccum }, { header: '감가상각누계액', get: (r) => r.accum }, { header: '잔존가액', get: (r) => r.residual },
  { header: '취득구분', get: (r) => r.acqKind }, { header: '자산상태', get: (r) => r.status }, { header: '상각구분', get: (r) => r.deprKind },
  { header: '내용년수', get: (r) => r.life }, { header: '사용자', get: (r) => r.userKind },
  { header: '전표번호', get: (r) => (r.kind === 'asset' ? r.slipNo ?? '-' : '') }, { header: '전표결재상태', get: (r) => (r.kind === 'asset' ? r.approval ?? '-' : '') },
];
const CHANGE_X: XCol<ChangeRow>[] = [
  { header: 'No.', get: noOf }, { header: '계정구분', get: (r) => r.fund }, { header: '자산유형', get: (r) => r.assetType },
  { header: '자산번호', get: (r) => r.assetNo }, { header: '자산명', get: (r) => r.name }, { header: '변동일', get: (r) => r.date },
  { header: '변동구분', get: (r) => r.chKind }, { header: '처리구분', get: (r) => r.proc }, { header: '처리수량', get: (r) => r.qty },
  { header: '매각액', get: (r) => r.sale }, { header: '잔존가액', get: (r) => r.residual }, { header: '잔여수량', get: (r) => r.remain },
  { header: '취득가감소액', get: (r) => r.decrease },
  { header: '전표번호', get: (r) => (r.kind === 'change' ? r.slipNo ?? '-' : '') }, { header: '전표결재상태', get: (r) => (r.kind === 'change' ? r.approval ?? '-' : '') },
];

/* ── 로컬 UI 조각(골드에서 복사하는 것이 규약) ── */
function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}
const monthWrap: React.CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('month'), maxWidth: '100%' };

type ModalState = null
  | { kind: 'form'; id?: string }
  /* 변동 대상·원장은 열 때 고정 — 저장 후 exit 동안 미리보기(A·B)가 바뀌어 보이지 않게 */
  | { kind: 'change'; asset: AssetView; changes: AssetChange[] }
  | { kind: 'voucher'; source: '총괄' | '변동내역'; excluded: number; drafts: VoucherDraft[] }
  /* 삭제 대상은 열 때 고정 — 반영 후 다시 구하면 exit 애니메이션 전에 문구가 바뀐다 */
  | { kind: 'delete'; tab: Tab; ids: string[] };

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function FixedAssetManage({ onNav }: { onNav?: (r: string) => void }) {
  const today = useMemo(() => todayStr(), []);
  const base = useMemo(() => defaultFilter(today), [today]);
  const seed = useMemo(() => demoFixedAssets(), []);
  const idBase = useId();
  const apiRef = useRef<GridApi<AnyRow> | null>(null);
  const [assets, setAssets] = useState<FixedAsset[]>(seed.assets);
  const [changes, setChanges] = useState<AssetChange[]>(seed.changes);
  const assetsRef = useRef(assets); assetsRef.current = assets;
  const changesRef = useRef(changes); changesRef.current = changes;
  const [tab, setTab] = useState<Tab>('summary');                 // E00 — 총괄 탭
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);
  const deleteRef = useRef<DialogHandle>(null);
  /* 거래처 원장 — 등록 모달 거래처 검색의 간편추가분이 페이지 수명 동안 남는다 */
  const [partners, setPartners] = useState<Partner[]>(() => [...PARTNERS]);
  const addPartner = useCallback((p: Partner) => setPartners((ps) => (ps.some((x) => x.custNo === p.custNo) ? ps : [...ps, p])), []);

  /* 필터 SSOT(E01) — 상세필터는 즉시 반영(드로어 값을 바꾸는 순간 목록·칩 반영, [필터 적용]은 닫기만 — account_code_manage 동형).
     취득기간 시작 > 종료면 그 항목 인라인 오류 + 범위 조건만 무시(effectiveFilter). 기준년월은 필수 — 비울 수 없다 */
  const [f, setF] = useState<FaFilter>(base);
  const [filterOpen, setFilterOpen] = useState(false);
  const setFv = <K extends keyof FaFilter>(k: K, v: FaFilter[K]) => setF((x) => reconcileType({ ...x, [k]: v }));
  const clearF = (patch: Partial<FaFilter>) => setF((x) => reconcileType({ ...x, ...patch }));
  const rangeErr = rangeError(f);
  const ef = useMemo(() => effectiveFilter(f), [f]);

  /* 파생 — 기준년월 말까지의 변동을 반영한 현재 상태 · 그리드 행(그룹 + 소계) · Σ */
  const shownChanges = useMemo(() => changesUntil(changes, f.ym), [changes, f.ym]);
  const views = useMemo(() => assets.filter((a) => assetPasses(a, ef)).map((a) => deriveAsset(a, shownChanges)), [assets, ef, shownChanges]);
  const sumRows = useMemo(() => summaryRows(views), [views]);
  const sumPinned = useMemo(() => [summaryTotal(sumRows)], [sumRows]);
  const chRows = useMemo(() => {
    const ok = new Set(views.map((v) => v.id));
    return changeRows(shownChanges.filter((c) => ok.has(c.assetId)), assets);
  }, [shownChanges, views, assets]);
  const chPinned = useMemo(() => [changeTotal(chRows)], [chRows]);
  /* 게이트·수정 모달은 전체 변동 기준(기준년월 이후 변동도 수량을 줄인다) */
  const allViews = useMemo(() => assets.map((a) => deriveAsset(a, changes)), [assets, changes]);

  const rows: AnyRow[] = tab === 'summary' ? sumRows : chRows;
  const itemCount = rows.filter(isItem).length;

  /* 선택 SSOT = selIds. 데이터 갱신 후 선택 복원 */
  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  const clearSel = useCallback(() => { selIdsRef.current = []; setSelIds([]); apiRef.current?.deselectAll(); }, []);
  /* 필터 변경 = 선택 전부 해제(2026-10-27 사용자 결정 — 외부 필터 대신 rowData 를 다시 만들므로 여기서 직접 푼다) */
  useEffect(() => { clearSel(); }, [ef, clearSel]);
  const onGridReady = useCallback((e: GridReadyEvent<AnyRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<AnyRow>) => { setSelIds(e.api.getSelectedRows().map((r) => r.id)); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<AnyRow> }) => { restoreSelection(e.api, selIdsRef.current); }, []);
  const onPaginationChanged = useCallback((e: { api: GridApi<AnyRow> }) => {
    const api = e.api;
    refreshGroupCols(e);   // 페이지 크기·쪽이 바뀌면 그룹 라벨(페이지 첫 행 규칙)을 다시 그린다
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);

  /* E03 탭 전환 — 필터 유지 · 선택 초기화 */
  const changeTab = (id: string) => {
    const next = id as Tab;
    if (next === tab) return;
    clearSel();
    setPage({ current: 0, total: 1, rowCount: 0 });   // 새 그리드가 첫 쪽부터 — 이전 탭 쪽 번호로 건수를 세지 않게
    setTab(next);
  };

  /* 전표번호 셀(클릭·Enter) → 일반전표 관리 */
  const openSlip = useCallback(() => { onNav?.('acct-journal'); }, [onNav]);
  const gridContext = useMemo<SlipCtx>(() => ({ openSlip }), [openSlip]);
  /* E08 — 총괄 데이터 행 더블클릭/Enter = 수정. (계)·Σ 무시 */
  const openEdit = useCallback((r: AnyRow | undefined) => { if (r?.kind === 'asset') setModal({ kind: 'form', id: r.id }); }, []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<AnyRow>) => { if (!e.rowPinned) openEdit(e.data); }, [openEdit]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<AnyRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data || e.rowPinned || !isItem(e.data)) return;
    const col = e.column.getColId();
    if (col.startsWith('ag-Grid-SelectionColumn')) return;   // 체크 토글 몫
    if (col === 'slipNo') { if (e.data.slipNo) openSlip(); return; }
    openEdit(e.data);
  }, [openEdit, openSlip]);

  /* E02 등록 · E08 수정 저장 */
  const saveAsset = (patch: AssetPatch, editId?: string) => {
    const res = commitAsset(assetsRef.current, patch, editId, { hasChanges: !!editId && changesRef.current.some((c) => c.assetId === editId) });
    assetsRef.current = res.assets;
    setAssets(res.assets);
    if (res.saved.acqDate > monthEnd(f.ym)) toast.info(`기준년월(${f.ym}) 이후 취득 자산이라 목록에 표시되지 않습니다.`);
  };
  /* E04 변동 등록 — 1건 · 잔여수량 > 0 */
  const askChange = () => {
    const g = changeOpenGate(allViews, selIds);
    if (g.ok === false) { toast.error(g.message); return; }
    setModal({ kind: 'change', asset: g.asset, changes: [...changes] });
  };
  const saveChange = (assetId: string) => (input: ChangeInput) => {
    const a = assetsRef.current.find((x) => x.id === assetId);
    if (!a) return;
    const res = commitChange(changesRef.current, deriveAsset(a, changesRef.current), input);
    changesRef.current = res.changes;
    clearSel();
    setChanges(res.changes);
  };
  /* E06 전표생성 — 선택 중 미생성 건만 계정구분별 */
  const askVoucher = () => {
    const ids = [...selIds];
    const r = tab === 'summary' ? prepareAcquisition(allViews, ids) : prepareDisposal(changes, assets, ids);
    if (r.ok === false) { toast.error(r.message); return; }
    if (r.excluded) toast.info(VOUCHER_MSG.excluded(r.excluded));
    setModal({ kind: 'voucher', source: tab === 'summary' ? '총괄' : '변동내역', excluded: r.excluded, drafts: r.drafts });
  };
  const createVouchers = (drafts: VoucherDraft[]) => {
    const res = commitVouchers(assetsRef.current, changesRef.current, drafts);
    assetsRef.current = res.assets; changesRef.current = res.changes;
    clearSel();
    setAssets(res.assets); setChanges(res.changes);
    toast.success(VOUCHER_MSG.done(res.slipNos.length));
  };
  /* E07 삭제 — 게이트는 클릭 시점 1회 평가, 조건 밖 건이 하나라도 있으면 전체 중단 */
  const askDelete = () => {
    const ids = [...selIds];
    const msg = tab === 'summary' ? deleteAssetGate(assets, changes, ids) : cancelChangeGate(changes, ids);
    if (msg) { toast.error(msg); return; }
    setModal({ kind: 'delete', tab, ids });
  };
  const commitDelete = (t: Tab, ids: string[]) => () => {
    const del = new Set(ids);
    if (t === 'summary') {
      const next = assetsRef.current.filter((a) => !del.has(a.id));
      assetsRef.current = next; clearSel(); setAssets(next);
    } else {
      const next = changesRef.current.filter((c) => !del.has(c.id));   // 변동 취소 → 총괄 수량·잔존가액 원복(파생)
      changesRef.current = next; clearSel(); setChanges(next);
    }
    toast.success(DELETE_MSG.done);
    deleteRef.current?.close();
  };

  /* E10 조회 — 현재 조건 그대로 재조회 흉내(선택 해제 + 토스트) */
  const refresh = () => { clearSel(); toast.success('조회되었습니다'); };

  /* E09 내보내기 — 현재 탭·조건, Σ·(계) 포함 */
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const sheet = <T extends AnyRow>(cols: XCol<T>[], body: T[], name: string) => {
      const ws = XLSX.utils.aoa_to_sheet([cols.map((c) => c.header), ...body.map((r) => cols.map((c) => c.get(r) ?? ''))]);
      ws['!cols'] = cols.map((c) => ({ wch: c.header === '계정구분' ? 28 : c.header === '자산명' ? 22 : 14 }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    };
    if (tab === 'summary') sheet(SUMMARY_X, [...sumRows, ...sumPinned], '총괄');
    else sheet(CHANGE_X, [...chRows, ...chPinned], '변동내역');
    XLSX.writeFile(wb, `유무형자산관리_${tab === 'summary' ? '총괄' : '변동내역'}_${f.ym}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  /* 모달·드로어가 열려 있으면 뒤 목록 단축키를 끈다(⌘P 는 입력창에서도 발화) */
  const listKeys = modal === null && !filterOpen;
  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'form' }), { enabled: listKeys && tab === 'summary', skipInDialog: true });
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: listKeys, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: listKeys, skipInDialog: true });

  /* 푸터 건수 — 데이터 행만(소계 제외). 현재 페이지 조각에서 센다 */
  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = rows.slice(page.current * pageSize, page.current * pageSize + pageSize).filter(isItem).length;
  const rangeLabel = (a: string, b: string) => (a || b ? `${a || '…'} ~ ${b || '…'}` : '');

  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      <Button variant="primary" size="sm" leadingIcon="file-check" onClick={askVoucher}>전표생성</Button>
      {tab === 'summary' && selCount === 1 && <Button variant="outline" size="sm" leadingIcon="refresh" onClick={askChange}>변동 등록</Button>}
      <Button variant="outline" size="sm" leadingIcon="trash" onClick={askDelete}>삭제</Button>
      <Button variant="ghost" size="sm" onClick={clearSel}>선택 해제</Button>
    </>
  ) : null;

  const editTarget: AssetView | undefined = modal?.kind === 'form' && modal.id ? allViews.find((v) => v.id === modal.id) : undefined;
  const typeOptions = typeNamesOf(f.fund);
  const closeOnEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); };

  return (
    <GridFrame
      crumbs={['홈', '회계', '고정자산', '유무형자산관리']}
      title="유무형자산관리"
      favRoute="acct-fixed-asset"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      contextActions={selActions}
      appliedFilters={[
        /* 기준년월 — 필수. × = 당월 복원(이미 당월이면 × 없음) */
        { label: '기준년월', value: f.ym, onClear: f.ym !== base.ym ? () => clearF({ ym: base.ym }) : undefined },
        { label: '계정구분', value: f.fund, onClear: () => clearF({ fund: '' }) },
        { label: '자산유형', value: f.assetType, onClear: () => clearF({ assetType: '' }) },
        { label: '자산번호', value: f.assetNo.trim(), onClear: () => clearF({ assetNo: '' }) },
        { label: '자산명', value: f.name.trim(), onClear: () => clearF({ name: '' }) },
        { label: '취득기간', value: rangeLabel(ef.from, ef.to), onClear: () => clearF({ from: '', to: '' }) },   // 범위 오류면 조건이 무시되므로 칩도 없다
      ]}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        {tab === 'summary' && <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'form' })}>유무형자산 등록</Button>}
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={modal ? undefined : HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{'총 ' + String(itemCount) + '건 중 ' + String(Math.min(shown, itemCount)) + '건 표시'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <TabBar tabs={TABS} value={tab} onChange={changeTab} idBase={idBase} label="유무형자산 구분" />
      <TabPanel idBase={idBase} value={tab}>
        {tab === 'summary' ? (
          <AgGridReact<SummaryRow>
            key="summary"
            theme={apfsTheme}
            rowData={sumRows}
            columnDefs={SUMMARY_COLS}
            getRowId={(p) => p.data.id}
            domLayout="autoHeight"
            defaultColDef={COL_DEF}
            autoSizeStrategy={AUTO_SIZE_CONTENT}
            rowSelection={ROW_SELECTION_SUMMARY}
            selectionColumnDef={SELECTION_COL}
            getRowStyle={rowStyle}
            pinnedBottomRowData={sumPinned}
            pagination paginationPageSize={pageSize} suppressPaginationPanel
            onGridReady={onGridReady as any}
            onSelectionChanged={onSelectionChanged as any}
            onRowDataUpdated={onRowDataUpdated as any}
            onPaginationChanged={onPaginationChanged as any}
            onModelUpdated={refreshGroupCols as any}
            onRowDoubleClicked={onRowDoubleClicked as any}
            context={gridContext}
            onCellKeyDown={onCellKeyDown as any}
            overlayNoRowsTemplate="조회 조건에 해당하는 자산이 없습니다."
          />
        ) : (
          <AgGridReact<ChangeRow>
            key="change"
            theme={apfsTheme}
            rowData={chRows}
            columnDefs={CHANGE_COLS}
            getRowId={(p) => p.data.id}
            domLayout="autoHeight"
            defaultColDef={COL_DEF}
            autoSizeStrategy={AUTO_SIZE_CONTENT}
            rowSelection={ROW_SELECTION_CHANGE}
            selectionColumnDef={SELECTION_COL}
            getRowStyle={rowStyle}
            pinnedBottomRowData={chPinned}
            pagination paginationPageSize={pageSize} suppressPaginationPanel
            onGridReady={onGridReady as any}
            onSelectionChanged={onSelectionChanged as any}
            onRowDataUpdated={onRowDataUpdated as any}
            onPaginationChanged={onPaginationChanged as any}
            onModelUpdated={refreshGroupCols as any}
            context={gridContext}
            onCellKeyDown={onCellKeyDown as any}
            overlayNoRowsTemplate="조회 조건에 해당하는 변동내역이 없습니다."
          />
        )}
      </TabPanel>

      {/* ── E01 상세필터 6개 — 즉시 반영(값을 바꾸는 순간 목록·칩 반영). [필터 적용]은 닫기만, [초기화]는 기본값(당월·나머지 해제) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">유무형자산 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="기준년월" plain required>
              {/* 필수 — 같은 달 재클릭(해제)은 무시해 비지 않게 한다 */}
              <div style={monthWrap}><PeriodPicker mode="month" value={f.ym} onChange={(v) => { if (v) setFv('ym', v); }} ariaLabel="기준년월" required /></div>
            </DrawerField>
            <DrawerField label="계정구분"><DrawerSelect value={f.fund} onChange={(v) => setFv('fund', v)} options={FA_FUNDS} ariaLabel="계정구분" /></DrawerField>
            <DrawerField label="자산유형"><DrawerSelect value={f.assetType} onChange={(v) => setFv('assetType', v)} options={typeOptions} ariaLabel="자산유형" /></DrawerField>
            <DrawerField label="자산번호">
              <input type="text" value={f.assetNo} onChange={(e) => setFv('assetNo', e.target.value)} onKeyDown={closeOnEnter} placeholder="자산번호 일부" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="자산명">
              <input type="text" value={f.name} onChange={(e) => setFv('name', e.target.value)} onKeyDown={closeOnEnter} placeholder="자산명 일부" style={inputStyle('text')} />
            </DrawerField>
            <DayRangeField label="취득기간" from={f.from} to={f.to} onFrom={(v) => setFv('from', v || '')} onTo={(v) => setFv('to', v || '')}
              errMsg={rangeErr ?? undefined} />
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => setF(base)}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── E02 등록 · E08 수정 ── */}
      {modal?.kind === 'form' && (!modal.id || editTarget) && (
        <FixedAssetFormModal initial={editTarget} partners={partners} onAddPartner={addPartner} onSave={saveAsset} onClose={() => setModal(null)} />
      )}

      {/* ── E04 변동 등록 ── */}
      {modal?.kind === 'change' && (
        <AssetChangeModal asset={modal.asset} changes={modal.changes} today={today} onSave={saveChange(modal.asset.id)} onClose={() => setModal(null)} />
      )}

      {/* ── E06 전표생성 ── */}
      {modal?.kind === 'voucher' && (
        <AssetVoucherModal source={modal.source} excluded={modal.excluded} drafts={modal.drafts} onCreate={createVouchers} onClose={() => setModal(null)} />
      )}

      {/* ── E07 삭제 확인 — 실행 = SaveButton, 닫기 = 핸들 close(exit 애니메이션 후 onOpenChange) ── */}
      {modal?.kind === 'delete' && (
        <AlertDialog ref={deleteRef} open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'delete' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>삭제 확인</AlertDialogTitle>
              <AlertDialogDescription>
                {`선택한 ${String(modal.ids.length)}건을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.`}
                {modal.tab === 'change' && <span className="block mt-2">변동내역 삭제는 변동 취소입니다 — 총괄의 수량·잔존가액이 원래대로 돌아갑니다.</span>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <SaveButton leadingIcon="trash" busyLabel="삭제 중" style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }} onSubmit={() => commitDelete(modal.tab, modal.ids)}>삭제</SaveButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </GridFrame>
  );
}
