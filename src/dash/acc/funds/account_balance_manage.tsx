/* 계좌잔액 — 회계 > 자금관리 > 계좌잔액 (route acct-account-balance, 화면ID ACC-020 · SFR-016-08). 조회 전용.
   출처: 화면설계서 ACC-020(2026.10.26 v1.0) slide 9~17(화면 9~11 · 이벤트 13~17). 업무 규칙 = account_balance_model(+테스트).

   설계서 → 우리 규약
   - ① 브레드크럼·제목(메뉴 리프 '계좌잔액')·☆ 즐겨찾기·[메인으로] = GridFrame 규약. KPI 배지 행 없음.
   - ② 툴바 우: 단위 캡션 · [상세필터](E02) · [Σ 소계표시](E01 표시 옵션 토글 — UI.Button pressed(aria-pressed), 재클릭 해제) ·
     ⟳ 조회(E03 — 재조회 + 토스트 "조회되었습니다"). 선택 체크박스 없음(조회 전용).
   - ③ 그리드 14열(설계서 순서): 계정구분·계좌번호·통화·예금종류(= 계정과목)·전잔·기간증가·기간감소·잔액·개설일·금융기관·적요·만기일·이자율·개설목적.
     금액 4열·이자율만 우측, 나머지 좌측. 계정구분 순 → 계좌번호 순. 헤더 정렬 끔(소계 위치 고정). 페이지 나눔 없음(계좌 수가 적다).
     소계표시 ON = 계정구분 그룹 끝 소계 행(--muted + 굵게, 계정구분 칸 '소계'). 맨 아래 pinned 합계 행(계좌 행만 합산).
     행 더블클릭 / Enter(E04) = 계좌거래상세 팝업(account_txn_detail_modal). 소계·합계 행은 무반응.
   - 상세필터 9개(slide 11) 즉시 반영([필터 적용] = 닫기): 계정구분(검색 셀렉트) · 기준기간(기본 전월 1일 ~ 오늘) · 사용여부(기본 여) ·
     만기여부(기본 부) · 수시입출금여부 · 미결재포함 · 개설기간 · 만기기간 · 잔액여부. 기간 3종은 각각 시작 > 종료면 그 칸 invalid +
     '시작일은 종료일보다 늦을 수 없습니다.' + 결과 0건. 기본값 칩은 진입부터 표시 — × = 전체/전 기간, [초기화] = 기본값.
   - ④ 푸터: 새 창(E05) · 내보내기(E06 ⌥D — '계좌잔액.xlsx', 소계 행은 켜져 있을 때만 + 합계 행, 금액 숫자 셀) ·
     인쇄(E07) = SplitButton [인쇄(⌘P) = 화면 그리드 printGrid │ ▾ 예금명세서 출력 = 리포트 뷰어(계정구분마다 쪽 · '계정구분 : X' · '기준일 : from - to' · 순·계정과목·금융기관·지점·계좌번호·잔액·이율·만기일 ·
     계정과목별 〈 소계 〉 · 절 끝 합 계)]. 자금일보(daily_cash_manage) 동형 — ⌘P·푸터 인쇄 본체 = printGrid 는 인쇄 진입점 가드(print_grid_guard) 규약.
     조회 결과 0건이면 내보내기·인쇄·예금명세서 출력 모두 "조회 결과가 없습니다.".

   결정·가정
   - 소계표시 위치: 설계서는 [상세필터] 왼쪽 버튼. 행을 거르지 않는 표시 옵션이라 필터 칩 줄이 아니라 툴바 우측 토글로 둔다
     (2026-11-09 사용자 결정 — 출자금현황 [Σ 합계]와 같은 모양, 순서는 상세필터 → 토글 → 조회).
   - 미결재포함·잔액여부: 미결재 거래 데이터·잔액여부 의미가 없어 상태만 두고 거르지 않는다(캡션 '· 데이터 연동 후 적용'). 거르지 않으므로 적용 칩도 만들지 않는다(apfs-detail-filter — no-op 항목 칩 없음).
   - 만기여부 판정 기준일 = 데모 기준일(DEMO_TODAY). 만기일 없는 계좌는 '만기 전'. 만기기간을 지정하면 만기일 없는 계좌는 빠진다.
   - 기준기간을 비우면(× · 직접 삭제) 전 기간 — 전잔 0, 기간증감 = 전체 누계.
   - 예금명세서 합 계 = 계정구분(쪽 묶음)별 합계 — 설계서 샘플(합 계 = 그 계정구분 소계 합)대로. 전체 총계는 두지 않는다.
   - 권한 기반 노출(내보내기·인쇄·팝업 인쇄/엑셀)은 RBAC 미구현이라 항상 노출. 설계서 "새 창" 팝업·뷰어는 프로젝트 팝업 규약(Dialog). */
import '../../aggrid_shared.css';
import { useCallback, useId, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellKeyDownEvent, CellStyle, ColDef, RowClassParams, RowDoubleClickedEvent, ValueFormatterParams } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { UI } from '../../components';
import { GridFrame, FooterActions, footerCount } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, fmt, numFmt, numStyle } from '../../aggrid_theme';
import { drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { Checkbox } from '../../ui/checkbox';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import { DrawerSelect } from '../../drawer_select';
import type { AppliedFilter } from '../../applied_filters';
import { DrawerField, DayRangeField } from '../ledger_filter_ui';
import { LedgerReportViewer } from '../ledger_report_viewer';
import { demoBankAccounts, demoCashTxns, DEMO_TODAY, FUNDS_ACCOUNT_TYPES } from './funds_data';
import type { BankAccount } from './funds_data';
import {
  defaultFilter, filterErrors, buildBalanceRows, withSubtotals, totals, accountCount,
  buildDepositStatement, statementPages, periodLabel, rateLabel, YES_NO,
} from './account_balance_model';
import type { BalanceFilter, BalanceRow, StatementPage, YesNo } from './account_balance_model';
import { AccountTxnDetailModal } from './account_txn_detail_modal';

const { Button, IconBtn } = UI;

const ROUTE = 'acct-account-balance';
const TITLE = '계좌잔액';
const REPORT_TITLE = '예금명세서';
const PER_PAGE = 34;
const NO_RESULT = '조회 결과가 없습니다.';
const NOOP_CAPTION = '· 데이터 연동 후 적용';
const RATE_FMT = '0.00"%"';   // 이자율 숫자 셀(엑셀 우측 정렬)

/* ──────────────────────────────
   그리드 — 금액·이자율만 우측. 소계·합계 행의 N/A 는 빈 칸, 계좌 행의 N/A 는 '-'
────────────────────────────── */
const COL_DEF: ColDef = { ...DEFAULT_COL_DEF, sortable: false };   // 소계 위치 고정
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const tabular: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const SUM_STYLE = { background: 'var(--muted)', fontWeight: 700 };
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const isAccountRow = (p: { data?: BalanceRow; node?: { rowPinned?: string | null } | null }) => p.data?.kind === 'account' && !p.node?.rowPinned;
/* 계좌 행 빈 값 = '-', 소계·합계 = 빈 칸 */
const dashFmt = (p: ValueFormatterParams<BalanceRow>) => (isAccountRow(p) ? (p.value ? String(p.value) : '-') : String(p.value ?? ''));
const amountCol = (field: 'opening' | 'increase' | 'decrease' | 'closing', headerName: string): ColDef<BalanceRow> => ({
  field, headerName, width: 150, minWidth: 130, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any,
});
const COLUMNS: ColDef<BalanceRow>[] = [
  { colId: 'accountType', headerName: '계정구분', width: 200, minWidth: 180, cellStyle: flexCenter, cellRenderer: textCell,
    valueGetter: (p) => (p.node?.rowPinned ? '합계' : p.data?.kind === 'subtotal' ? '소계' : p.data?.accountType ?? '') },
  { field: 'accountNo', headerName: '계좌번호', width: 160, cellStyle: tabular },
  { field: 'currency', headerName: '통화', width: 76, cellStyle: flexCenter },
  { field: 'subject', headerName: '예금종류', width: 112, cellStyle: flexCenter },
  amountCol('opening', '전잔'), amountCol('increase', '기간증가'), amountCol('decrease', '기간감소'), amountCol('closing', '잔액'),
  { field: 'openDate', headerName: '개설일', width: 108, cellDataType: 'text', cellStyle: tabular },
  { field: 'bank', headerName: '금융기관', width: 120, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'memo', headerName: '적요', width: 220, minWidth: 160, flex: 1, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'maturityDate', headerName: '만기일', width: 108, cellDataType: 'text', cellStyle: tabular, valueFormatter: dashFmt },
  { colId: 'rate', headerName: '이자율', width: 88, type: 'rightAligned', cellStyle: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
    valueGetter: (p) => (p.data?.kind === 'account' && !p.node?.rowPinned ? rateLabel(p.data.rate) : '') },
  { field: 'purpose', headerName: '개설목적', width: 200, minWidth: 160, cellStyle: flexCenter, cellRenderer: textCell },
];
const rowStyle = (p: RowClassParams<BalanceRow>) => (p.data?.kind === 'subtotal' && !p.node.rowPinned ? SUM_STYLE : undefined);

/* ──────────────────────────────
   예금명세서 한 쪽(E07)
────────────────────────────── */
const pnum: CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const pleft: CSSProperties = { textAlign: 'left' };
function StatementPrintPage({ page, index, count, period }: { page: StatementPage; index: number; count: number; period: string }) {
  return (
    <>
      <header style={{ marginBottom: 12 }}>
        <div className="font-bold" style={{ fontSize: 22, textAlign: 'center', marginBottom: 10 }}>{REPORT_TITLE}</div>
        <div className="flex justify-between" style={{ fontSize: 12.5 }}>
          <span>{`계정구분 : ${page.accountType}`}</span>
          <span className="tabular-nums">{`PAGE : ${String(index + 1)}/${String(count)}`}</span>
        </div>
        <div style={{ fontSize: 12.5 }}>{`기준일 : ${period}`}</div>
      </header>
      <table>
        <thead>
          <tr>
            <th style={pleft}>순</th><th style={pleft}>계정과목</th><th style={pleft}>금융기관</th><th style={pleft}>지점</th><th style={pleft}>계좌번호</th>
            <th style={{ textAlign: 'right' }}>잔액</th><th style={{ textAlign: 'right' }}>이율</th><th style={pleft}>만기일</th>
          </tr>
        </thead>
        <tbody>
          {page.lines.map((l, i) => (l.kind === 'row'
            ? <tr key={`r${String(l.no)}`}><td className="tabular-nums">{l.no}</td><td>{l.subject}</td><td>{l.bank}</td><td>{l.branch}</td><td className="tabular-nums">{l.accountNo}</td>
              <td style={pnum}>{fmt(l.closing)}</td><td style={pnum}>{rateLabel(l.rate)}</td><td className="tabular-nums">{l.maturityDate}</td></tr>
            : <tr key={`s${String(i)}`} style={{ fontWeight: 700 }}><td /><td /><td /><td /><td>〈 소계 〉</td><td style={pnum}>{fmt(l.closing)}</td><td /><td /></tr>))}
          {page.last && (
            <tr style={{ fontWeight: 700 }}><td colSpan={5}>합 계</td><td style={pnum}>{fmt(page.total)}</td><td /><td /></tr>
          )}
        </tbody>
      </table>
    </>
  );
}

/* 여/부 칩 값 — 칩은 값만 보이므로 값 자체가 뜻을 담게 */
const YN_TEXT: Record<'active' | 'matured' | 'freeWithdraw', Record<'여' | '부', string>> = {
  active: { 여: '사용', 부: '미사용' },
  matured: { 여: '만기', 부: '만기 전' },
  freeWithdraw: { 여: '수시입출금', 부: '수시입출금 아님' },
};

/* 데이터 연동 전 항목 캡션 — 칩 jump 가 캡션 자신의 텍스트로 찾으므로 안쪽 span 으로 둔다 */
function NoopLabel({ label }: { label: string }) {
  return <>{label}<span className="text-caption font-normal" style={{ fontSize: 12, marginLeft: 6 }}>{NOOP_CAPTION}</span></>;
}

type ModalState = null | { kind: 'detail'; account: BankAccount };

/* ══════════════════════════════════════════════════════════════
   페이지
══════════════════════════════════════════════════════════════ */
export function AccountBalanceManage({ onNav }: { onNav?: (r: string) => void }) {
  const accounts = useMemo(() => demoBankAccounts(), []);
  const txns = useMemo(() => demoCashTxns(accounts), [accounts]);
  const base = useMemo(() => defaultFilter(DEMO_TODAY), []);

  /* E00 — 기본 조건(기준기간 전월 1일 ~ 오늘 · 사용 · 만기 전)으로 진입 */
  const [applied, setApplied] = useState<BalanceFilter>(base);   // 드로어·칩·그리드 SSOT(즉시 반영)
  const [filterOpen, setFilterOpen] = useState(false);
  const [showSubtotal, setShowSubtotal] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [viewer, setViewer] = useState(false);

  const patch = (p: Partial<BalanceFilter>) => setApplied((a) => ({ ...a, ...p }));
  const setD = <K extends keyof BalanceFilter>(k: K) => (v: BalanceFilter[K]) => patch({ [k]: v } as Partial<BalanceFilter>);
  const errs = filterErrors(applied);

  const rows = useMemo(() => buildBalanceRows(accounts, txns, applied, DEMO_TODAY), [accounts, txns, applied]);
  const gridRows = useMemo(() => (showSubtotal ? withSubtotals(rows) : rows), [rows, showSubtotal]);
  const pinned = useMemo<BalanceRow[]>(() => (rows.length ? [{
    id: '__total', kind: 'subtotal', accountId: '', accountType: '', accountNo: '', currency: '', subject: '', ...totals(rows),
    openDate: '', bank: '', branch: '', memo: '', maturityDate: '', rate: null, purpose: '',
  }] : []), [rows]);
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  /* 상세필터·팝업·뷰어가 열린 동안 목록 단축키를 끈다(skipInDialog 와 이중) */
  const keysOn = !filterOpen && !modal && !viewer;
  /* E07 인쇄 본체(⌘P·푸터) = 화면 그리드 printGrid — 0건이면 안내 */
  const printIfReady = () => { if (!rows.length) { toast.error(NO_RESULT); return; } printGrid(); };
  useHotkey(HOTKEYS.print.combo, printIfReady, { enabled: keysOn, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: keysOn, skipInDialog: true });

  /* E04 — 계좌 행만(소계·합계 무반응). 계좌 스냅샷을 넘긴다 */
  const openDetail = useCallback((r: BalanceRow | undefined, pinnedRow?: string | null) => {
    if (!r || r.kind !== 'account' || pinnedRow) return;
    const acc = accountById.get(r.accountId);
    if (acc) setModal({ kind: 'detail', account: acc });
  }, [accountById]);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<BalanceRow>) => openDetail(e.data, e.rowPinned), [openDetail]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<BalanceRow>) => {
    if ((e.event as KeyboardEvent | null)?.key === 'Enter') openDetail(e.data, e.rowPinned);
  }, [openDetail]);

  /* E03 — 현재 조건으로 재조회(백엔드 없음 — 로컬 재계산) */
  const refresh = () => { setApplied((a) => ({ ...a })); toast.success('조회되었습니다'); };

  /* E06 — 화면 표 그대로(소계 행은 켜져 있을 때만) + 합계 행. 금액 숫자 셀 */
  const exportExcel = () => {
    if (!rows.length) { toast.error(NO_RESULT); return; }
    const head = COLUMNS.map((c) => c.headerName as string);
    const line = (r: BalanceRow, label?: string): (string | number)[] => {
      const acc = r.kind === 'account';
      return [label ?? (acc ? r.accountType : '소계'), r.accountNo, r.currency, r.subject, r.opening, r.increase, r.decrease, r.closing,
        r.openDate, r.bank, r.memo, acc ? r.maturityDate || '-' : '', acc && r.rate != null ? r.rate : '', r.purpose];
    };
    const body = [...gridRows.map((r) => line(r)), line(pinned[0], '합계')];
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    body.forEach((_, ri) => [4, 5, 6, 7].forEach((ci) => { const c = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })]; if (c && c.t === 'n') c.z = '#,##0'; }));
    body.forEach((_, ri) => { const c = ws[XLSX.utils.encode_cell({ r: ri + 1, c: 12 })]; if (c && c.t === 'n') c.z = RATE_FMT; });
    ws['!cols'] = head.map((h) => ({ wch: h === '계정구분' || h === '적요' || h === '개설목적' ? 26 : h === '계좌번호' ? 20 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, TITLE);
    XLSX.writeFile(wb, `${TITLE}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  /* E07 ▾ '예금명세서 출력' — 리포트 뷰어(계정구분마다 쪽) */
  const sections = useMemo(() => buildDepositStatement(rows), [rows]);
  const reportPeriod = periodLabel(applied.from, applied.to, ' - ');
  const pages = useMemo(() => {
    const ps = statementPages(sections, PER_PAGE);
    return ps.map((p, i) => <StatementPrintPage key={i} page={p} index={i} count={ps.length} period={reportPeriod} />);
  }, [sections, reportPeriod]);
  const openViewer = () => { if (!sections.length) { toast.error(NO_RESULT); return; } setViewer(true); };
  const saveReport = (fileName: string) => {
    const aoa: (string | number)[][] = [[REPORT_TITLE], [`기준일 : ${reportPeriod}`]];
    for (const s of sections) {
      aoa.push([], [`계정구분 : ${s.accountType}`], ['순', '계정과목', '금융기관', '지점', '계좌번호', '잔액', '이율', '만기일']);
      for (const l of s.lines) {
        if (l.kind === 'row') aoa.push([String(l.no), l.subject, l.bank, l.branch, l.accountNo, l.closing, l.rate ?? '', l.maturityDate]);
        else aoa.push(['', '', '', '', '〈 소계 〉', l.closing, '', '']);
      }
      aoa.push(['합 계', '', '', '', '', s.total, '', '']);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    aoa.forEach((row, ri) => {
      if (row[0] === '순' || typeof row[5] !== 'number') return;
      const amt = ws[XLSX.utils.encode_cell({ r: ri, c: 5 })]; if (amt) amt.z = '#,##0';
      const rate = ws[XLSX.utils.encode_cell({ r: ri, c: 6 })]; if (rate && rate.t === 'n') rate.z = RATE_FMT;
    });
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, REPORT_TITLE);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    toast.success('저장했습니다');
  };

  /* 적용 칩 — label = 드로어 캡션(칩 클릭 jump). 기본값 칩은 진입부터 표시, × = 전체/전 기간 */
  const range = (from: string, to: string) => (from || to ? `${from || '…'} ~ ${to || '…'}` : '');
  const ynChip = (k: 'active' | 'matured' | 'freeWithdraw', label: string): AppliedFilter =>
    ({ label, value: applied[k] ? YN_TEXT[k][applied[k] as '여' | '부'] : '', onClear: () => patch({ [k]: '' } as Partial<BalanceFilter>) });
  const chips: AppliedFilter[] = [
    { label: '계정구분', value: applied.accountType, onClear: () => patch({ accountType: '' }) },
    { label: '기준기간', value: range(applied.from, applied.to), onClear: () => patch({ from: '', to: '' }) },
    ynChip('active', '사용여부'), ynChip('matured', '만기여부'), ynChip('freeWithdraw', '수시입출금여부'),
    { label: '개설기간', value: range(applied.openFrom, applied.openTo), onClear: () => patch({ openFrom: '', openTo: '' }) },
    { label: '만기기간', value: range(applied.maturityFrom, applied.maturityTo), onClear: () => patch({ maturityFrom: '', maturityTo: '' }) },
  ];

  const ynSelect = (k: 'active' | 'matured' | 'freeWithdraw', label: string) => (
    <DrawerField label={label}>
      <DrawerSelect value={applied[k]} onChange={(v) => patch({ [k]: v as YesNo } as Partial<BalanceFilter>)} options={[...YES_NO]} ariaLabel={label} />
    </DrawerField>
  );

  const shownAccounts = accountCount(gridRows);
  return (
    <GridFrame
      crumbs={['홈', '회계', '자금관리', TITLE]}
      title={TITLE}
      favRoute={ROUTE}
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={chips}
      toolbarRight={<>
        <span className="text-caption" style={{ fontSize: 12 }}>단위: 원</span>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        {/* E01 소계표시 — 표시 옵션 토글(aria-pressed), 재클릭 = 해제. 필터가 아니라 칩 줄에 두지 않는다(2026-11-09 사용자 결정) */}
        <Button variant="outline" size="sm" leadingIcon="sigma" pressed={showSubtotal} onClick={() => setShowSubtotal((v) => !v)}>소계표시</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={keysOn ? HOTKEYS.refresh : undefined} />
      </>}
      footerLeft={<span>{footerCount(shownAccounts, shownAccounts)}</span>}
      footerRight={<FooterActions onExport={exportExcel} onPrint={printIfReady} printItems={[{ label: '예금명세서 출력', icon: 'file', onSelect: openViewer }]} />}>

      <div>
        <AgGridReact<BalanceRow>
          theme={apfsTheme}
          rowData={gridRows}
          columnDefs={COLUMNS}
          defaultColDef={COL_DEF}
          getRowId={(p) => p.data.id}
          getRowStyle={rowStyle}
          pinnedBottomRowData={pinned}
          domLayout="autoHeight"
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다. 검색 조건을 변경해 주세요.</span>'}
        />
      </div>

      {/* ── 상세필터(E02) — 9개 조건, 바꾸는 즉시 applied 반영([필터 적용] = 닫기) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">{`${TITLE} 조회 조건`}</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="계정구분">
              <DrawerSelect value={applied.accountType} onChange={setD('accountType')} options={[...FUNDS_ACCOUNT_TYPES]} ariaLabel="계정구분" searchable />
            </DrawerField>
            <DayRangeField label="기준기간" from={applied.from} to={applied.to} onFrom={setD('from')} onTo={setD('to')} errMsg={errs.period ?? undefined} />
            {ynSelect('active', '사용여부')}
            {ynSelect('matured', '만기여부')}
            {ynSelect('freeWithdraw', '수시입출금여부')}
            <NoopCheck label="미결재포함" value={applied.includeUnapproved} onChange={setD('includeUnapproved')} />
            <DayRangeField label="개설기간" from={applied.openFrom} to={applied.openTo} onFrom={setD('openFrom')} onTo={setD('openTo')} errMsg={errs.open ?? undefined} />
            <DayRangeField label="만기기간" from={applied.maturityFrom} to={applied.maturityTo} onFrom={setD('maturityFrom')} onTo={setD('maturityTo')} errMsg={errs.maturity ?? undefined} />
            <label className="block mb-4">
              <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}><NoopLabel label="잔액여부" /></span>
              <input type="text" inputMode="numeric" value={applied.balance} onChange={(e) => setD('balance')(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="금액" style={inputStyle('text')} />
            </label>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => setApplied(base)}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* E04 계좌거래상세 — 기준기간 = 화면 조회조건 */}
      {modal?.kind === 'detail' && (
        <AccountTxnDetailModal account={modal.account} txns={txns} from={applied.from} to={applied.to} onClose={() => setModal(null)} />
      )}
      {viewer && (
        <LedgerReportViewer title={REPORT_TITLE} pages={pages} fileName={`${REPORT_TITLE}_${applied.accountType || '전체'}_${periodLabel(applied.from, applied.to, '_')}`}
          info={[['계정구분', applied.accountType || '전체'], ['기준일', reportPeriod], ['소계표시', showSubtotal ? '여' : '부']]}
          onSave={saveReport} onClose={() => setViewer(false)} />
      )}
    </GridFrame>
  );
}

/* 미결재포함 — DS Checkbox + htmlFor 라벨(ledger FlagCheck 동형) + 데이터 연동 캡션 */
function NoopCheck({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2 mb-4">
      <Checkbox id={id} checked={value} onCheckedChange={(c) => onChange(c === true)} />
      <label htmlFor={id} className="font-semibold text-muted-foreground cursor-pointer select-none" style={{ fontSize: 14 }}><NoopLabel label={label} /></label>
    </div>
  );
}
