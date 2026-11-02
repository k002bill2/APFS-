/* 전표검색 — 조회 전용 리스트 페이지 (회계 > 전표관리 > 전표검색, route acct-journal-search, 화면ID ACC-008).
   출처: ACC-008 화면설계서 slide 9~17 → APFS 디자인시스템(ACC-004 deleted_journal_manage 골격).

   구성(설계서 → 우리 규약):
   - 툴바: [상세필터](E01) → 조회(E02, 항상 맨 끝). 등록 버튼·선택 체크박스·선택 바 없음(조회 전용).
   - 그리드 20열(slide 10 순서) — 분개 라인 1줄 = 1행(분개번호·코드·계정과목·세목명·차변·대변이 라인 단위라서).
       차변·대변만 우측(금액), 순번·날짜·코드·번호 포함 나머지 좌측. 20열 내용 폭 합이 프레임보다 넓어 AUTO_SIZE_CONTENT,
       잔여폭 흡수 = 적요 1개, 긴 텍스트(계정구분·적요·계정과목·거래처)는 truncate span.
       작성일 내림차순·분개번호 오름차순(모델 정렬). 행 더블클릭 / Enter(조합키·IME 조합 중 제외) = 전표상세(E03).
       행 선택 기능이 없는 조회 그리드라 "행 강조"는 포커스 셀 행 표시로 갈음한다(setSelected 미사용).
   - 상세필터 드로어 = slide 11 정의표 20개 전부(No.1~20, 정의표 순서). draft 를 편집하고 [필터 적용](또는 텍스트 Enter)에서만
       커밋 — 기간 시작 > 종료 → 금액 최소 > 최대 → 금액(외화) 최소 > 최대 순으로 검사해 toast.error + 드로어 유지 + 두 칸 invalid. 닫기(X·Esc·바깥)는 draft 폐기.
       기간 기본 = 당월 1일~말일(첫 진입부터 칩), 칩 × = 기간 해제(전 기간), [초기화] = 당월 복원.
       계정구분 기본 '전체', 나머지 셀렉트 기본 '선택해 주세요'(= 미적용). 적요 = 분개 라인 적요, 상단적요 = 전표 대표 적요.
       금액 = 라인 금액(차변 또는 대변). 금액(외화) = 원 전표 외화금액(원화 전표는 조건 시 제외 — 전표 단위라 라인이 함께 걸린다).
       증빙구분·증빙파일명·통화는 원 전표(journal) 값으로 거른다. 증빙미첨부사유 = 전표 사유(부분일치, 사유 없는 전표 제외).
       거래처 사업자등록번호 = 라인 거래처의 사업자번호(숫자만 부분일치 — 하이픈 무시, 번호 없는 라인 제외).
       계정과목 = 텍스트(부분일치) + [검색] → 회계 공용 AccountSearchModal 로 값 채움.
   - 전표상세(E03) = ACC-003 전표 화면(JournalEntryScreen) readOnly + hideGridTools(분개 그리드 도구 미노출) + onCopy([복사]·[닫기]) —
       slide 12·16. 닫으면 목록 조건·더블클릭 행 유지(그 행 셀로 포커스 복귀, 재조회 없음).
       [복사] = 상세가 exit 로 닫힌 뒤(onClose) 같은 전표로 ACC-003 복사 등록(mode 'copy' — 전표등록 [복사]와 같은 EntryState)을 연다.
       복사 등록 저장은 데모 — 이 화면은 조회 전용 원장이라 목록에 반영하지 않는다(토스트 + 화면 닫기, ACC-003 원장과 공유 안 함).
   - 하단: 새 창(E04 — FooterActions 내장) · 내보내기(E05, ⌥D — 표시 중 행 20열, 차변·대변은 숫자 셀) · 전체보기 · 인쇄.

   결정·가정(설계서와 다른 점 — PM 확인 필요)
   - 조회조건 개수가 설계서 안에서 충돌한다 — slide 11 정의표·slide 15 와이어프레임은 20개, slide 9 구성3·slide 14 E01 이벤트표는 6개.
     정의표 20개를 모두 구현했다. 원장(ACC-003 demoJournals)에 없는 값은 이 화면 더미에서 파생한다(journal_search_data 머리 주석):
       No.13·14 통화·금액(외화) — 일부 전표만 외화(달러·유로·엔)로 바꾼 데모. 공용 원장은 전부 원화.
       No.19 증빙미첨부사유 — 원장(JournalRow)에 사유 필드가 없어(증빙미첨부 여부 boolean 뿐) 일부 전표에 가상 사유.
       No.20 거래처 사업자등록번호 — 라인 거래처를 PARTNERS 에 조인, 원본에 bizNo 가 없어 법인 거래처에 가상 번호. 백엔드·코드관리 확정 시 교체.
   - E00 비고 "필터 없음 전체 조회" 와 slide 10·11 "기본 필터 = 당월" 이 충돌 — 당월 기본을 따른다. 기간 기준 필드 = 작성일(그리드 표시값).
   - [복사]로 연 복사 등록에서 저장해도 전표검색 목록·ACC-003 전표등록 목록에 새 전표가 생기지 않는다(원장 미공유 데모) — PM 확인.
   - 거래처 원장은 화면마다 로컬 state(ACC-003·ACC-005 각자 useState([...PARTNERS]))라 공유할 원장이 없다 — 상세는 기본 PARTNERS.
   - 기본 기간 = 당월이라 월초에는 초기 목록이 거의 빈다(더미 = ACC-003 demoJournals, 오늘−0~27일). 기본값·더미 분산은 PM·ACC-003 소유자 확인.
   - '오늘'은 마운트 시점 1회(기본 기간·더미 모두). 자정을 넘겨 열어 둔 탭은 기본 기간이 전날 기준으로 남는다 — 프로토타입 한계.
   - 푸터 '총 N건' 의 N 은 분개 라인 행 수(전표 건수 아님), '표시' 는 현재 페이지 행 수. 순번(전표일 내 일련)은 라인마다 반복된다 — PM 확인.
   - "인쇄·다운로드 권한 보유자만 노출"(E05) — RBAC 미구현이라 항상 노출.
   - 세목명·작성부서·전표구분(취소·정정)은 원장에 없는 값이라 데모 파생(journal_search_data 머리 주석). */
import '../../aggrid_shared.css';
import { useState, useRef, useCallback, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, AUTO_SIZE_CONTENT, numFmt } from '../../aggrid_theme';
import { controlMinWidth, drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, CellKeyDownEvent, RowDoubleClickedEvent, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { PeriodPicker } from '../../ui/period-picker';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { DrawerSelect } from '../../drawer_select';   // 상세필터 select 공용본
import { AccountSearchModal } from '../account_search_modal';
import { CURRENCIES, EVIDENCE_TYPES, FUND_ACCOUNTS, JOURNAL_ORIGINS, PL_DEPTS, PL_EMPLOYEES, todayStr } from './general_journal_data';
import { validateRange } from './general_journal_model';
import { SEARCH_SLIP_KINDS, demoSearchLines } from './journal_search_data';
import type { SearchLine } from './journal_search_data';
import { defaultSearchFilter, filterLines, validateAmountRange, validateForeignAmountRange } from './journal_search_model';
import type { SearchFilter } from './journal_search_model';
import { JournalEntryScreen } from './journal_entry_screen';   // 전표상세 = ACC-003 전표 화면(readOnly — 조회 전용)

const { Button, IconBtn } = UI;

const PAGE_SIZE = 20;

/* ──────────────────────────────
   컬럼 정의 — slide 10 순서. 차변·대변만 우측(수량형), 나머지 좌측(가운데 정렬 없음)
────────────────────────────── */
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const codeStyle: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };
const amountStyle: CellStyle = { fontVariantNumeric: 'tabular-nums' };
/* display:flex 셀은 AG Grid 기본 말줄임이 안 걸린다 → 긴 텍스트는 truncate span 으로 감싸 '…' 로 끝낸다(삭제전표 textCell 과 동형) */
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;

const columnDefs: ColDef<SearchLine>[] = [
  { field: 'fundAccount', headerName: '계정구분', maxWidth: 200, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'writtenDate', headerName: '작성일', cellStyle: codeStyle },
  { field: 'seq', headerName: '순번', cellStyle: codeStyle },
  { field: 'journalNo', headerName: '분개번호', cellStyle: codeStyle },
  /* 적요 = 잔여폭 흡수 컬럼(apfs-aggrid PR #362) — 프레임이 컬럼 합보다 넓으면 우측이 비지 않게. fitCellContents 가 덮지 않도록 자동 맞춤 제외 */
  { field: 'memo', headerName: '적요', flex: 1, minWidth: 200, width: 200, suppressAutoSize: true, cellStyle: { ...flexCenter, fontWeight: 600 }, cellRenderer: textCell },
  { field: 'accountCode', headerName: '코드', cellStyle: codeStyle },
  { field: 'accountName', headerName: '계정과목', maxWidth: 160, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'subItem', headerName: '세목명', cellStyle: flexCenter },
  { field: 'debit', headerName: '차변금액', type: 'rightAligned', valueFormatter: numFmt, cellStyle: amountStyle },
  { field: 'credit', headerName: '대변금액', type: 'rightAligned', valueFormatter: numFmt, cellStyle: amountStyle },
  { field: 'partner', headerName: '거래처', maxWidth: 180, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'dept', headerName: '작성부서', cellStyle: flexCenter },
  { field: 'writer', headerName: '작성자', cellStyle: flexCenter },
  { field: 'slipKind', headerName: '전표구분', cellStyle: flexCenter },
  { field: 'origin', headerName: '전표발생구분', cellStyle: flexCenter },
  { field: 'slipNo', headerName: '전표번호', cellStyle: codeStyle },
  { field: 'plDept', headerName: '손익부서', cellStyle: flexCenter },
  { field: 'plEmployee', headerName: '손익사원', cellStyle: flexCenter },
  { field: 'createdBy', headerName: '최초등록자', cellStyle: muted },
  { field: 'updatedBy', headerName: '최종수정자', cellStyle: muted },
];

/* 엑셀 — 화면 20열과 1:1(원시자료, SFR-021). 차변·대변만 숫자 셀 */
type XCol = { header: string; get: (r: SearchLine) => string | number | null; num?: boolean; wch?: number };
const EXPORT_COLS: XCol[] = [
  { header: '계정구분', get: (r) => r.fundAccount, wch: 24 }, { header: '작성일', get: (r) => r.writtenDate }, { header: '순번', get: (r) => r.seq },
  { header: '분개번호', get: (r) => r.journalNo, wch: 18 }, { header: '적요', get: (r) => r.memo, wch: 30 }, { header: '코드', get: (r) => r.accountCode },
  { header: '계정과목', get: (r) => r.accountName, wch: 16 }, { header: '세목명', get: (r) => r.subItem },
  { header: '차변금액', get: (r) => r.debit, num: true, wch: 16 }, { header: '대변금액', get: (r) => r.credit, num: true, wch: 16 },
  { header: '거래처', get: (r) => r.partner, wch: 22 }, { header: '작성부서', get: (r) => r.dept }, { header: '작성자', get: (r) => r.writer },
  { header: '전표구분', get: (r) => r.slipKind }, { header: '전표발생구분', get: (r) => r.origin }, { header: '전표번호', get: (r) => r.slipNo, wch: 16 },
  { header: '손익부서', get: (r) => r.plDept }, { header: '손익사원', get: (r) => r.plEmployee },
  { header: '최초등록자', get: (r) => r.createdBy }, { header: '최종수정자', get: (r) => r.updatedBy },
];

/* plain=<div> 래퍼 — PeriodPicker·[검색] 버튼이 <label> 안에서 2회 토글되지 않게(apfs-datepicker) */
function DrawerField({ label, children, plain }: { label: string; children: ReactNode; plain?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </Wrap>
  );
}
const dayWrap: CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };
/* 금액 최소~최대 한 칸 — 두 칸이 한 줄에 들어가게 폭을 줄이고, invalid 면 테두리만 danger */
const amountInput = (invalid: boolean): CSSProperties => ({ ...inputStyle('text'), width: 140, minWidth: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums', ...(invalid ? { border: '1px solid var(--danger)' } : {}) });
/* '선택해 주세요' 기본 셀렉트(slide 11 No.8~17) — '' = 미적용 */
const PICK = '선택해 주세요';

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null | { kind: 'detail' | 'copy'; row: SearchLine };

export function JournalSearchManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<SearchLine> | null>(null);
  /* E00 메뉴 진입 — 원장(분개 라인) 로드. 조회 전용이라 화면 수명 동안 불변 */
  const [rows] = useState<SearchLine[]>(() => demoSearchLines());
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);

  /* 상세필터 — applied = 적용된 조건(칩·목록의 SSOT, 첫 진입 = 당월), draft = 드로어에서 편집 중인 사본 */
  const initial = useMemo(() => defaultSearchFilter(todayStr()), []);
  const [filterOpen, setFilterOpen] = useState(false);
  const [applied, setApplied] = useState<SearchFilter>(initial);
  const [draft, setDraft] = useState<SearchFilter>(initial);
  const [acctPick, setAcctPick] = useState(false);
  const setD = <K extends keyof SearchFilter>(k: K) => (v: SearchFilter[K]) => setDraft((d) => ({ ...d, [k]: v }));
  /* E01 [상세필터] — 열 때 적용값으로 재동기화 */
  const openFilter = () => { setDraft(applied); setFilterOpen(true); };
  /* E01-3 [필터 적용] — 기간(시작 ≤ 종료) → 금액(최소 ≤ 최대) → 금액(외화)(최소 ≤ 최대) 순으로 검증, 실패면 드로어를 닫지 않는다 */
  const commitFilter = () => {
    const err = validateRange(draft.from, draft.to) ?? validateAmountRange(draft.amountMin, draft.amountMax)
      ?? validateForeignAmountRange(draft.foreignAmountMin, draft.foreignAmountMax);
    if (err) { toast.error(err); return; }
    setApplied(draft);
    setFilterOpen(false);
  };
  /* 편집 중 범위 오류 — 두 칸에 invalid 표시(커밋 시 toast 는 그대로) */
  const periodErr = validateRange(draft.from, draft.to);
  const amountErr = validateAmountRange(draft.amountMin, draft.amountMax);
  const fxErr = validateForeignAmountRange(draft.foreignAmountMin, draft.foreignAmountMax);
  const clearApplied = (patch: Partial<SearchFilter>) => setApplied((a) => ({ ...a, ...patch }));

  /* 인쇄·내보내기는 상세·드로어·계정과목 검색이 열려 있지 않을 때만 */
  const listKeys = modal === null && !filterOpen && !acctPick;
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: listKeys, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: listKeys, skipInDialog: true });

  const visible = useMemo(() => filterLines(rows, applied), [rows, applied]);

  const onGridReady = useCallback((e: GridReadyEvent<SearchLine>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* E03 행 더블클릭 / Enter — 전표상세(조회 전용). 해당 행의 원 전표 1건(전표번호 기준) */
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<SearchLine>) => {
    if (!e.data || e.rowPinned) return;
    setModal({ kind: 'detail', row: e.data });
  }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<SearchLine>) => {
    const ev = e.event as KeyboardEvent | null;
    if (ev?.key !== 'Enter' || !e.data || e.rowPinned) return;
    if (ev.isComposing || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;   // IME 조합·조합키 Enter 는 상세를 열지 않는다
    setModal({ kind: 'detail', row: e.data });
  }, []);
  /* E03-3 [닫기] — 목록 복귀(조건 유지·재조회 없음). 더블클릭한 행 셀로 포커스를 되돌린다 */
  const closeDetail = (id: string) => {
    setModal(null);
    requestAnimationFrame(() => {
      const api = apiRef.current; const node = api?.getRowNode(id);
      if (!api || !node || node.rowIndex == null) return;
      api.ensureNodeVisible(node);
      api.setFocusedCell(node.rowIndex, 'memo');
    });
  };

  /* E03 [복사] — 상세의 [복사]는 의도만 기록한다(상세 exit 중 state 를 바꾸면 애니메이션이 사라진다). 상세 onClose(exit 종료 뒤)에서
     복사 등록을 열고, 아니면 목록 복귀 */
  const copyPendingRef = useRef(false);
  const afterDetailClose = (row: SearchLine) => {
    if (copyPendingRef.current) { copyPendingRef.current = false; setModal({ kind: 'copy', row }); return; }
    closeDetail(row.id);
  };

  /* E02 조회 — "현재 조건으로 재조회". 백엔드가 없어 로컬 상태(필터)를 유지한다(오늘·기본 기간은 다시 읽지 않음 — 머리 주석) */
  const refresh = () => { toast.success('조회되었습니다'); };

  /* ── E05 Excel — 표시 중인 행. 차변·대변은 숫자 셀(천단위 서식)이라 Excel 에서도 우측 정렬, 값 없음은 빈칸 ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => c.get(r) ?? ''));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    EXPORT_COLS.forEach((c, ci) => {
      if (!c.num) return;
      body.forEach((row, ri) => {
        const cell = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
        if (cell && typeof row[ci] === 'number') { cell.t = 'n'; cell.z = '#,##0'; }
      });
    });
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.wch ?? 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '전표검색');
    XLSX.writeFile(wb, '전표검색.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(visible.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const chips: [string, string, () => void][] = [
    ['계정구분', applied.fundAccount, () => clearApplied({ fundAccount: '' })],
    ['기간', applied.from || applied.to ? `${applied.from || '…'} ~ ${applied.to || '…'}` : '', () => clearApplied({ from: '', to: '' })],
    ['작성자', applied.writer.trim(), () => clearApplied({ writer: '' })],
    ['계정과목', applied.account.trim(), () => clearApplied({ account: '' })],
    ['거래처', applied.partner.trim(), () => clearApplied({ partner: '' })],
    ['적요', applied.memo.trim(), () => clearApplied({ memo: '' })],
    ['전표번호', applied.slipNo.trim(), () => clearApplied({ slipNo: '' })],
    ['작성부서', applied.dept, () => clearApplied({ dept: '' })],
    ['전표구분', applied.slipKind, () => clearApplied({ slipKind: '' })],
    ['전표발생구분', applied.origin, () => clearApplied({ origin: '' })],
    ['상단적요', applied.headMemo.trim(), () => clearApplied({ headMemo: '' })],
    ['금액', applied.amountMin.trim() || applied.amountMax.trim() ? `${applied.amountMin.trim() || '…'} ~ ${applied.amountMax.trim() || '…'}` : '', () => clearApplied({ amountMin: '', amountMax: '' })],
    ['통화', applied.currency, () => clearApplied({ currency: '' })],
    ['금액(외화)', applied.foreignAmountMin.trim() || applied.foreignAmountMax.trim() ? `${applied.foreignAmountMin.trim() || '…'} ~ ${applied.foreignAmountMax.trim() || '…'}` : '', () => clearApplied({ foreignAmountMin: '', foreignAmountMax: '' })],
    ['손익부서', applied.plDept, () => clearApplied({ plDept: '' })],
    ['손익사원', applied.plEmployee, () => clearApplied({ plEmployee: '' })],
    ['증빙구분', applied.evidenceType, () => clearApplied({ evidenceType: '' })],
    ['증빙파일명', applied.evidenceFile.trim(), () => clearApplied({ evidenceFile: '' })],
    ['증빙미첨부사유', applied.noEvidenceReason.trim(), () => clearApplied({ noEvidenceReason: '' })],
    ['거래처 사업자등록번호', applied.partnerBizNo.trim(), () => clearApplied({ partnerBizNo: '' })],
  ];
  const enterCommits = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) commitFilter(); };

  return (
    <GridFrame
      crumbs={['홈', '회계', '전표관리', '전표검색']}
      title="전표검색"
      favRoute="acct-journal-search"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={chips.map(([label, value, onClear]) => ({ label, value, onClear }))}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={openFilter}>상세필터</Button>
        {/* 전표상세가 열려 있으면 뒤 목록 단축키(⌥R) 바인딩을 끈다 — IconBtn 은 enabled prop 이 없어 hotkey 를 조건부로 */}
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={listKeys ? HOTKEYS.refresh : undefined} />
      </>}
      footerLeft={<span>{'총 ' + String(visible.length) + '건 중 ' + String(Math.min(shown, visible.length)) + '건 표시'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<SearchLine>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          autoSizeStrategy={AUTO_SIZE_CONTENT}   // 컬럼 폭=내용 폭(잘림 방지). 계정구분·계정과목·거래처는 maxWidth 캡, 적요가 잔여폭 흡수
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다. 검색 조건을 변경해 주세요.</span>'}
        />
      </div>

      {/* ── E01 상세필터 드로어 — slide 11 정의표 순서(No.1~20). draft 편집 → [필터 적용]에서만 커밋 ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">전표검색 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="계정구분"><DrawerSelect value={draft.fundAccount} onChange={setD('fundAccount')} options={[...FUND_ACCOUNTS]} ariaLabel="계정구분" searchable /></DrawerField>
            <DrawerField label="기간" plain>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={dayWrap}><PeriodPicker mode="day" value={draft.from} onChange={(v) => setD('from')(v || '')} ariaLabel="기간 시작일" invalid={!!periodErr} /></div>
                <span className="text-caption">~</span>
                <div style={dayWrap}><PeriodPicker mode="day" value={draft.to} onChange={(v) => setD('to')(v || '')} ariaLabel="기간 종료일" invalid={!!periodErr} /></div>
              </div>
            </DrawerField>
            <DrawerField label="작성자">
              <input type="text" value={draft.writer} onChange={(e) => setD('writer')(e.target.value)} onKeyDown={enterCommits} placeholder="작성자" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="계정과목" plain>
              <div className="flex items-center gap-2">
                <input type="text" value={draft.account} onChange={(e) => setD('account')(e.target.value)} onKeyDown={enterCommits} placeholder="계정과목명 또는 코드" aria-label="계정과목" style={inputStyle('text')} />
                <Button variant="outline" size="sm" leadingIcon="search" onClick={() => setAcctPick(true)}>검색</Button>
              </div>
            </DrawerField>
            <DrawerField label="거래처">
              <input type="text" value={draft.partner} onChange={(e) => setD('partner')(e.target.value)} onKeyDown={enterCommits} placeholder="거래처" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="적요">
              <input type="text" value={draft.memo} onChange={(e) => setD('memo')(e.target.value)} onKeyDown={enterCommits} placeholder="적요" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="전표번호">
              <input type="text" value={draft.slipNo} onChange={(e) => setD('slipNo')(e.target.value)} onKeyDown={enterCommits} placeholder="전표번호" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="작성부서"><DrawerSelect value={draft.dept} onChange={setD('dept')} options={[...PL_DEPTS]} all={PICK} ariaLabel="작성부서" /></DrawerField>
            <DrawerField label="전표구분"><DrawerSelect value={draft.slipKind} onChange={setD('slipKind')} options={[...SEARCH_SLIP_KINDS]} all={PICK} ariaLabel="전표구분" /></DrawerField>
            <DrawerField label="전표발생구분"><DrawerSelect value={draft.origin} onChange={setD('origin')} options={[...JOURNAL_ORIGINS]} all={PICK} ariaLabel="전표발생구분" /></DrawerField>
            <DrawerField label="상단적요">
              <input type="text" value={draft.headMemo} onChange={(e) => setD('headMemo')(e.target.value)} onKeyDown={enterCommits} placeholder="전표 대표 적요" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="금액" plain>
              <div className="flex items-center gap-2">
                <input type="text" inputMode="numeric" value={draft.amountMin} onChange={(e) => setD('amountMin')(e.target.value)} onKeyDown={enterCommits}
                  placeholder="최소" aria-label="금액 최소" aria-invalid={!!amountErr || undefined} style={amountInput(!!amountErr)} />
                <span className="text-caption">~</span>
                <input type="text" inputMode="numeric" value={draft.amountMax} onChange={(e) => setD('amountMax')(e.target.value)} onKeyDown={enterCommits}
                  placeholder="최대" aria-label="금액 최대" aria-invalid={!!amountErr || undefined} style={amountInput(!!amountErr)} />
              </div>
            </DrawerField>
            <DrawerField label="통화"><DrawerSelect value={draft.currency} onChange={setD('currency')} options={[...CURRENCIES]} all={PICK} ariaLabel="통화" /></DrawerField>
            <DrawerField label="금액(외화)" plain>
              <div className="flex items-center gap-2">
                <input type="text" inputMode="decimal" value={draft.foreignAmountMin} onChange={(e) => setD('foreignAmountMin')(e.target.value)} onKeyDown={enterCommits}
                  placeholder="최소" aria-label="금액(외화) 최소" aria-invalid={!!fxErr || undefined} style={amountInput(!!fxErr)} />
                <span className="text-caption">~</span>
                <input type="text" inputMode="decimal" value={draft.foreignAmountMax} onChange={(e) => setD('foreignAmountMax')(e.target.value)} onKeyDown={enterCommits}
                  placeholder="최대" aria-label="금액(외화) 최대" aria-invalid={!!fxErr || undefined} style={amountInput(!!fxErr)} />
              </div>
            </DrawerField>
            <DrawerField label="손익부서"><DrawerSelect value={draft.plDept} onChange={setD('plDept')} options={[...PL_DEPTS]} all={PICK} ariaLabel="손익부서" /></DrawerField>
            <DrawerField label="손익사원"><DrawerSelect value={draft.plEmployee} onChange={setD('plEmployee')} options={[...PL_EMPLOYEES]} all={PICK} ariaLabel="손익사원" /></DrawerField>
            <DrawerField label="증빙구분"><DrawerSelect value={draft.evidenceType} onChange={setD('evidenceType')} options={[...EVIDENCE_TYPES]} all={PICK} ariaLabel="증빙구분" searchable /></DrawerField>
            <DrawerField label="증빙파일명">
              <input type="text" value={draft.evidenceFile} onChange={(e) => setD('evidenceFile')(e.target.value)} onKeyDown={enterCommits} placeholder="첨부 파일명" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="증빙미첨부사유">
              <input type="text" value={draft.noEvidenceReason} onChange={(e) => setD('noEvidenceReason')(e.target.value)} onKeyDown={enterCommits} placeholder="증빙미첨부사유" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="거래처 사업자등록번호">
              <input type="text" inputMode="numeric" value={draft.partnerBizNo} onChange={(e) => setD('partnerBizNo')(e.target.value)} onKeyDown={enterCommits} placeholder="000-00-00000" style={inputStyle('text')} />
            </DrawerField>
          </div>
          <SheetFooter>
            {/* E01-2 [초기화] = 기본값 복원(기간 = 당월) */}
            <Button variant="outline" size="md" onClick={() => setDraft(defaultSearchFilter(todayStr()))}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={commitFilter}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 계정과목 검색 — 고른 계정과목명을 draft 에 채운다(집계 계정도 조회 조건으론 허용) */}
      {acctPick && (
        <AccountSearchModal open onOpenChange={(o) => { if (!o) setAcctPick(false); }}
          onSelect={(a) => setD('account')(a.name)} initialKeyword={draft.account} />
      )}

      {/* ── E03 전표상세(조회 전용) — 게이트는 modal state(행 스냅샷) ── */}
      {modal?.kind === 'detail' && (
        <JournalEntryScreen key="detail" entry={{ mode: 'edit', source: modal.row.journal }} readOnly hideGridTools onSave={(j) => j}
          onCopy={() => { copyPendingRef.current = true; }} onClose={() => afterDetailClose(modal.row)} />
      )}
      {/* ── E03 [복사] → ACC-003 복사 등록(데모 저장 — 목록 미반영). 닫으면 원래 행으로 포커스 복귀 ── */}
      {modal?.kind === 'copy' && (
        <JournalEntryScreen key="copy" entry={{ mode: 'copy', source: modal.row.journal }} onSave={(j) => j}
          onClose={() => closeDetail(modal.row.id)} />
      )}
    </GridFrame>
  );
}
