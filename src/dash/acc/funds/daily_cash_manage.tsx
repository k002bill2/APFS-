/* 자금일보 — 조회 전용 리포트 + 전자결재 상신 (회계 > 자금관리 > 자금일보, route acct-daily-cash, 화면ID ACC-021).
   출처: ACC-021 화면설계서 v1.0 slide 9~14(화면) · 16~21(이벤트 E00~E06).

   설계서 → 우리 규약
   - 브레드크럼·제목·☆·[메인으로] = GridFrame(favRoute acct-daily-cash).
   - 툴바(apfs-grid): [상세필터](E01) → [자금일보 전자결재](E04) → [결재라인설정](E05) → ⟳ 조회(E02, 맨 끝 · ⌥R). 둘 다 outline 단독 버튼 —
     설정 화면을 ▾ 안에 숨기던 SplitButton 은 분리했다(2026-11-09 사용자 결정, apfs-grid "허용 combo ①" = 같은 1차 액션의 대체 경로만).
     설계서 툴바의 기준일자 칸은 상세필터 드로어로 옮겼다(기간·일자 조건은 툴바에 두지 않는다).
   - 본문 = 그리드 1개(slide 10 — 2026-11-05 사용자 결정 "한 표로 가자") — 계정구분 제목 행·계좌 행·소계 행, 고정 하단 = 미출자자산 합계.
     2단 헤더 구분 | 거래은행{은행·이율(%)·상품명·개시일·만기일·계좌번호} | 기초시재 | 입금 | 출금 | 마감시재.
     행 = FUNDS_ACCOUNT_TYPES 순서로 [제목 행(구분 칸 colSpan = 전체) → 계좌 행 → 소계 행](daily_cash_model.buildGridRows).
     고정 하단(pinned bottom) = '농식품모태펀드 미출자자산 합계'(구분~계좌번호 colSpan 7 + 금액 4종) — 계정구분 전체일 때만.
     계층 순서라 정렬·행 선택·더블클릭 없음(statement_kit 동형). 제목·소계·합계 행 = 굵게 + var(--muted) 배경.
   - 상세필터(E01) = 기준일자(PeriodPicker day) · 계정구분(DrawerSelect). 즉시 반영([필터 적용] = 닫기), [초기화] = 오늘 · 전체.
     칩: 기준일자(필수 — × 없음) · 계정구분(× → 전체).
   - 푸터: 새 창 · 내보내기(E06, ⌥D — 한 시트에 섹션별 제목·2단 헤더·행·소계 + 합계) · 인쇄(E03) = SplitButton
     [인쇄(⌘P) = 화면 그리드 printGrid │ ▾ 자금일보 출력 = 출력 화면(slide 13)을 LedgerReportViewer 로 — PRINT·SAVE]. 재무상태표(statement_kit) 동형.
     ⌘P·푸터 인쇄 본체를 printGrid 로 두는 것은 프로젝트 인쇄 진입점 가드(print_grid_guard) 규약.
   - 규칙(daily_cash_model + 테스트): 기준일자 기본 = 오늘(DEMO_TODAY) · 미래 일자 = '기준일자는 오늘 이후로 선택할 수 없습니다.'
     (DatePicker 에 max 가 없어 선택 자체를 막지 못한다 → 칸 invalid + 안내 + 결과 0건) · 2025년 이후 = 농안기금 섹션·합계·옵션 제외
     · 0건 = '조회된 데이터가 없습니다'.

   결정·가정(PM 확인 필요)
   - 상품명 = 계좌별칭(구분 = 계정과목과 겹치지 않게). 이율 = 계좌 이자율(소수 2자리).
   - 행 = 개설일 ≤ 기준일 AND (그날 금액이 하나라도 있거나 사용 중·만기 미도래 계좌). 만기 해지·미사용 후 잔액 0 계좌는 빠진다.
   - 미출자자산 합계는 계정구분 '전체'일 때만 표시(단일 계정구분 조회면 그 섹션 소계가 곧 합계).
   - '먼저 조회해 주세요.'(E04 규칙 2)는 진입 시 자동 조회라 도달 불가 → 기준일자 오류 상태에서 상신·인쇄·내보내기를 막는 것으로 대체.
   - 결재라인설정 [확인] = 페이지 수명 동안의 기본 결재라인 저장(저장 API 없음). 상신 이력(SFR-018-01)은 화면 로컬 배열에만 쌓고 표시하지 않는다.
   - 권한 기반 노출('인쇄·다운로드' 권한자만)은 RBAC 미구현이라 항상 노출. */
import '../../aggrid_shared.css';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellStyle, ColDef, ColGroupDef, ColSpanParams, RowClassParams, ValueFormatterParams } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { UI } from '../../components';
import { GridFrame, FooterActions, footerCount } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, numFmt, numStyle } from '../../aggrid_theme';
import { dayWrap } from '../acc_form_helpers';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { PeriodPicker } from '../../ui/period-picker';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { toast } from '../../ui/sonner';
import { printGrid } from '../../print_grid';
import { DrawerSelect } from '../../drawer_select';
import type { AppliedFilter } from '../../applied_filters';
import { LedgerReportViewer } from '../ledger_report_viewer';
import { demoBankAccounts, demoCashTxns } from './funds_data';
import { DEFAULT_LINE_SEED } from './daily_cash_data';
import {
  MSG, TOTAL_TITLE, accountTypeOptions, buildGridRows, changeDate, cloneLine, dailyCashReport, defaultFilter, validateBaseDate, xlsxName,
} from './daily_cash_model';
import type { ApprovalLine, CashAmounts, DailyCashFilter, DailyCashReport, GridRow } from './daily_cash_model';
import { ApprovalSubmitModal } from './approval_submit_modal';
import type { ApprovalSubmission } from './approval_submit_modal';
import { ApprovalLineModal } from './approval_line_modal';
import type { LinePreset } from './approval_line_modal';
import { DailyCashReportPage } from './daily_cash_report';

const { Button, IconBtn } = UI;

/* ── 그리드(모듈 상수) ── */
const COL_DEF: ColDef = { ...DEFAULT_COL_DEF, sortable: false };   // 제목·계좌·소계 계층 순서 고정
const tabular: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const rateFmt = (p: ValueFormatterParams) => (p.value == null ? '' : (p.value as number).toFixed(2));
/* 폭 = 1440 실측(텍스트 + 좌우 패딩 30 + 여유 4) — 고정 폭(잘림 0 우선). 잔여폭 흡수는 상품명 1개(flex).
   합계 ≈1426px > 본문 1117px 이라 1440 에서도 가로 스크롤 1개가 남는다. */
/* 구분 칸 colSpan — 제목·빈 안내 행 = 전체(11), 합계 행 = 구분~계좌번호(7, 긴 라벨 잘림 방지). print_grid 렌더 완료 판정이 aria-colspan 합을 본다 */
const ALL_COLS = 11;
const LABEL_COLS = 7;
function subjectSpan(p: ColSpanParams<GridRow>): number {
  const k = p.data?.kind;
  if (k === 'title' || k === 'empty') return ALL_COLS;
  return k === 'total' ? LABEL_COLS : 1;
}
const amount = (field: keyof CashAmounts, header: string, w: number): ColDef<GridRow> => ({
  field, headerName: header, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle(field === 'closing') as any,
  width: w, minWidth: w,
});
const COLUMNS: (ColDef<GridRow> | ColGroupDef<GridRow>)[] = [
  { field: 'subject', headerName: '구분', width: 108, minWidth: 108, colSpan: subjectSpan },
  { headerName: '거래은행', groupId: 'bank', marryChildren: true, children: [
    { field: 'bank', headerName: '은행', width: 112, minWidth: 112 },
    { field: 'rate', headerName: '이율(%)', width: 84, minWidth: 84, type: 'rightAligned', valueFormatter: rateFmt, cellStyle: tabular },
    { field: 'product', headerName: '상품명', flex: 1, width: 168, minWidth: 168 },
    { field: 'openDate', headerName: '개시일', width: 116, minWidth: 116, cellStyle: tabular },
    { field: 'maturityDate', headerName: '만기일', width: 116, minWidth: 116, cellStyle: tabular,
      valueFormatter: (p) => (p.value == null ? '-' : String(p.value)) },
    { field: 'accountNo', headerName: '계좌번호', width: 166, minWidth: 166, cellStyle: tabular },
  ] },
  amount('opening', '기초시재', 150),
  amount('increase', '입금', 128),
  amount('decrease', '출금', 128),
  amount('closing', '마감시재', 150),
];
const SUM_STYLE = { background: 'var(--muted)', fontWeight: 700 };
const EMPTY_STYLE = { color: 'var(--muted-foreground)' };   // 계좌 없는 계정구분 안내 행
const rowStyle = (p: RowClassParams<GridRow>) => {
  const k = p.data?.kind;
  if (k === 'empty') return EMPTY_STYLE;
  return k === 'title' || k === 'subtotal' || k === 'total' ? SUM_STYLE : undefined;
};

/* ── Excel ── */
const HEAD1 = ['구분', '거래은행', '', '', '', '', '', '기초시재', '입금', '출금', '마감시재'];
const HEAD2 = ['', '은행', '이율(%)', '상품명', '개시일', '만기일', '계좌번호', '', '', '', ''];
const AMOUNT_COLS = [7, 8, 9, 10];
type Cell = string | number;
const amountsOf = (a: CashAmounts): Cell[] => [a.opening, a.increase, a.decrease, a.closing];
function buildSheet(report: DailyCashReport, showTotal: boolean): XLSX.WorkSheet {
  const aoa: Cell[][] = [['자금일보 — 일일 자금시재표'], [`기준일자 ${report.date}`, '', '', '', '', '', '', '', '', '', '단위 : 원']];
  const merges: XLSX.Range[] = [];
  const numRows: number[] = [];
  const rateRows: number[] = [];   // 이율 = 숫자 셀(0.00) — 그리드처럼 우측
  for (const s of report.sections) {
    aoa.push([]);
    aoa.push([`${s.type} 일일 자금시재표`]);
    const h = aoa.length;
    aoa.push(HEAD1, HEAD2);
    merges.push({ s: { r: h, c: 1 }, e: { r: h, c: 6 } }, { s: { r: h, c: 0 }, e: { r: h + 1, c: 0 } },
      ...AMOUNT_COLS.map((c) => ({ s: { r: h, c }, e: { r: h + 1, c } })));
    for (const r of s.rows) {
      numRows.push(aoa.length);
      rateRows.push(aoa.length);
      aoa.push([r.subject, r.bank, r.rate, r.product, r.openDate, r.maturityDate ?? '-', r.accountNo, ...amountsOf(r)]);
    }
    if (!s.rows.length) aoa.push([MSG.empty]);
    numRows.push(aoa.length);
    aoa.push(['소계', '', '', '', '', '', '', ...amountsOf(s.subtotal)]);
  }
  if (showTotal) {
    aoa.push([]);
    numRows.push(aoa.length);
    aoa.push([TOTAL_TITLE, '', '', '', '', '', '', ...amountsOf(report.total)]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  for (const r of numRows) for (const c of AMOUNT_COLS) {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    if (cell && cell.t === 'n') cell.z = '#,##0';
  }
  for (const r of rateRows) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 2 })];
    if (cell && cell.t === 'n') cell.z = '0.00';
  }
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 9 }, { wch: 26 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
  return ws;
}

/* ── 상세필터 칸 ── */
function DrawerField({ label, children, plain, errMsg, required }: { label: string; children: ReactNode; plain?: boolean; errMsg?: string | null; required?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}{required && <><span aria-hidden className="text-foreground" style={{ marginLeft: 2 }}>*</span><span className="sr-only"> 필수</span></>}
      </span>
      {children}
      {errMsg && <p role="alert" className="m-0 mt-1 text-danger" style={{ fontSize: 12 }}>{errMsg}</p>}
    </Wrap>
  );
}

const TOOLBAR_LINE_PRESET: LinePreset = { kind: 'approval', step: 1 };

/* ══════════════════════════════════════════════════════════════
   페이지
══════════════════════════════════════════════════════════════ */
type Modal = null | 'submit' | 'line' | 'viewer';

export function DailyCashManage({ onNav }: { onNav?: (r: string) => void }) {
  const accounts = useMemo(() => demoBankAccounts(), []);
  const txns = useMemo(() => demoCashTxns(accounts), [accounts]);

  /* E00 — 기준일자 = 오늘 · 계정구분 전체로 자동 조회. applied = 드로어·칩·표의 SSOT(초안 사본 없음) */
  const [applied, setApplied] = useState<DailyCashFilter>(defaultFilter);
  const [filterOpen, setFilterOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [defaultLine, setDefaultLine] = useState<ApprovalLine>(() => cloneLine(DEFAULT_LINE_SEED));
  const [, setHistory] = useState<ApprovalSubmission[]>([]);   // 상신 이력(SFR-018-01 — 표시 없음)

  const dateErr = validateBaseDate(applied.date);
  const report = useMemo(() => dailyCashReport(accounts, txns, applied), [accounts, txns, applied]);
  const showTotal = !applied.accountType;
  /* 한 표 {rows, pinned} — report 가 바뀔 때만 새 배열(렌더마다 만들지 않는다) */
  const grid = useMemo(() => buildGridRows(report, showTotal), [report, showTotal]);

  /* E01 — 기준일자 변경 = 즉시 재조회(2025년 이후로 넘어가면 농안기금 선택은 전체로) */
  const setDate = (d: string) => setApplied((f) => changeDate(f, d));
  const setType = (t: string) => setApplied((f) => ({ ...f, accountType: t as DailyCashFilter['accountType'] }));

  /* 기준일자 오류면 상신·인쇄·내보내기를 막는다(설계서 '먼저 조회해 주세요.'의 도달 가능한 대체) */
  const guard = (): boolean => { if (dateErr) { toast.error(dateErr); return false; } return true; };

  /* E02 조회 */
  const refresh = () => { if (!guard()) return; setApplied((f) => ({ ...f })); toast.success('조회되었습니다'); };

  /* E06 내보내기 */
  const exportExcel = useCallback(() => {
    if (dateErr) { toast.error(dateErr); return; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, buildSheet(report, showTotal), '자금일보');
    XLSX.writeFile(wb, xlsxName(applied.date));
    toast.success('Excel로 내보냈습니다');
  }, [dateErr, report, showTotal, applied.date]);

  /* E03 인쇄 — 푸터 [인쇄]·⌘P = 화면 그리드(printGrid · 인쇄 진입점 가드), ▾ '자금일보 출력' = 출력 화면(리포트 뷰어 PRINT) */
  const printIfReady = () => { if (guard()) printGrid(); };
  const openViewer = () => { if (guard()) setModal('viewer'); };
  /* E04 자금일보 전자결재 */
  const openSubmit = () => { if (guard()) setModal('submit'); };
  /* E05 결재라인설정 */
  const openLine = () => setModal('line');

  useHotkey(HOTKEYS.print.combo, printIfReady, { enabled: !filterOpen && modal === null, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !filterOpen && modal === null, skipInDialog: true });

  const closeModal = (o: boolean) => { if (!o) setModal(null); };

  const chips: AppliedFilter[] = [
    { label: '기준일자', value: applied.date },
    { label: '계정구분', value: applied.accountType, onClear: applied.accountType ? () => setType('') : undefined },
  ];

  const overlay = dateErr ?? MSG.empty;
  const gridKey = dateErr ? 'err' : 'ok';   // 빈 상태 오버레이는 마운트 때 문구를 읽는다 — 문구가 바뀌면 다시 만든다

  return (
    <GridFrame
      crumbs={['홈', '회계', '자금관리', '자금일보']}
      title="자금일보"
      favRoute="acct-daily-cash"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={chips}
      toolbarRight={<>
        <span className="text-caption" style={{ fontSize: 12 }}>단위: 원</span>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <Button variant="outline" size="sm" leadingIcon="file-check" onClick={openSubmit}>자금일보 전자결재</Button>
        <Button variant="outline" size="sm" leadingIcon="users" onClick={openLine}>결재라인설정</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={!filterOpen && modal === null ? HOTKEYS.refresh : undefined} />
      </>}
      footerLeft={<span>{footerCount(report.rowCount, report.rowCount)}</span>}
      footerRight={<FooterActions onExport={exportExcel} onPrint={printIfReady} printItems={[{ label: '자금일보 출력', icon: 'file', onSelect: openViewer }]} />}>

      <div>
        <AgGridReact<GridRow>
          key={gridKey}
          theme={apfsTheme}
          rowData={grid.rows}
          columnDefs={COLUMNS}
          defaultColDef={COL_DEF}
          getRowId={(p) => p.data.id}
          getRowStyle={rowStyle}
          pinnedBottomRowData={grid.pinned}
          domLayout="autoHeight"
          overlayNoRowsTemplate={overlay}
        />
      </div>

      {/* ── 상세필터(E01) — 바꾸는 즉시 applied 반영([필터 적용] = 닫기) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">자금일보 조회 조건</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="기준일자" plain required errMsg={dateErr}>
              <div style={dayWrap}><PeriodPicker mode="day" value={applied.date} onChange={setDate} ariaLabel="기준일자" invalid={!!dateErr} required /></div>
            </DrawerField>
            <DrawerField label="계정구분" plain>
              <DrawerSelect value={applied.accountType} onChange={setType} options={accountTypeOptions(applied.date)} ariaLabel="계정구분" />
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => setApplied(defaultFilter())}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* E04 상신 — 초기 결재선 = 기본 결재라인 */}
      <ApprovalSubmitModal open={modal === 'submit'} onOpenChange={closeModal} date={applied.date} defaultLine={defaultLine}
        onSubmitted={(s) => setHistory((h) => [...h, s])} />

      {/* E05 결재라인설정 — [확인] = 기본 결재라인 저장 */}
      <ApprovalLineModal open={modal === 'line'} onOpenChange={closeModal} line={defaultLine} preset={TOOLBAR_LINE_PRESET}
        onConfirm={(l) => { setDefaultLine(l); toast.success(MSG.saved); }} />

      {/* E03 자금일보 출력 화면 */}
      {modal === 'viewer' && (
        <LedgerReportViewer title="자금일보" fileName={`자금일보_${applied.date}`}
          pages={[<DailyCashReportPage key="p1" report={report} showTotal={showTotal} />]}
          info={[['기준일자', applied.date], ['계정구분', applied.accountType || '전체']]}
          onSave={() => exportExcel()} onClose={() => setModal(null)} />
      )}
    </GridFrame>
  );
}
