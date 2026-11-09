/* 합계잔액시산표 — 회계 > 장부조회 > 합계잔액시산표 (route acct-trial-balance, 화면ID ACC-014 · SFR-016-11).
   집계 = ledger_model.trialBalance(기준일까지 누계 · 대차 일치 테스트 고정), 표시·출력 가공 = trial_balance_model.

   설계서 → 우리 규약
   - ① 브레드크럼·제목·☆ 즐겨찾기·[메인으로] = GridFrame 규약.
   - ② 툴바: [상세필터](E01) · ⟳ 조회(E02 — 재조회 + 토스트 "조회되었습니다"). 선택 체크박스 없음(조회 전용).
     설계서 "보기 필터(당기·전기/차대변)" 칩은 두지 않는다 — 2026-11-03 사용자 결정(차변/대변 보기 불필요, 항상 차변·대변 모두 표시).
   - ③ 그리드 7열 2단 헤더: No. · 차변금액[잔액|합계] · 계정코드 · 계정과목(레벨 들여쓰기 · Ⅰ./(1) 명칭) · 대변금액[합계|잔액]
     — 차변이 계정 왼쪽, 대변이 오른쪽. 잔액 = 차−대(또는 대−차)가 양수일 때만, 아니면 0. 하단 고정 합계행(대차 일치).
     설계서 계정코드·계정과목 '중앙' → 좌측(정렬 규약). 헤더 정렬 끔(계층 순서 고정).
   - 행 더블클릭 / Enter(E03) = 「계정별 상세내역」(AccountDetailModal, 기준일 = 당기 회기 시작일 ~ 기준일).
     입력계정 행만 — 집계 행·파생 전기이월이익잉여금 행·합계행은 무반응(설계서 "소계·합계 행 처리 확인 필요").
     그 팝업의 행 더블클릭(E06) = 전표상세(JournalEntryScreen readOnly — 팝업 내부).
   - 상세필터 5개(slide 11 · E01 — slide 15 의 체크박스 변형은 따르지 않는다): 계정구분(셀렉트 · 기본 전체 — 검색창은 옵션 10개 이상 자동) ·
     기준일*(기본 당일) · 미결재포함(체크박스) · 모든계정포함(체크박스) · 결산전표포함(체크박스) — 기본 모두 미체크. 즉시 반영 — 고르는 즉시 applied 반영,
     [필터 적용] = 닫기. 기준일 미입력 = 기준일 칸 빨간 테두리 + "기준일을 입력하세요.", 결과 0건(2026-11-03 사용자 지시, 정본 privacy_access_log).
     적용 칩: 기준일은 필수라 × 없음, 플래그는 기본값과 다를 때만 ×.
   - ④ 푸터: 새 창(E04) · 내보내기(E05 ⌥D — SheetJS, 2단 헤더 병합 · 금액 숫자 셀 · 토스트 "Excel로 내보냈습니다") ·
     인쇄 combo [🖨 │ ⌄ 합계잔액시산표 출력]. 본체·⌘P = 그리드 인쇄(printGrid 가드), ⌄ = 리포트 뷰어(E07)
     — 설계서는 [인쇄] = 뷰어지만 프로젝트 규약(푸터 인쇄 combo ②)으로 둔다(PM 확인). 조회 결과 0건이면 "조회 결과가 없습니다.".
     출력 양식(slide 14): 제목 · 계정구분명 · 기준일 · 구분별 표(■ 자산 · 부채 · 자본 + 손익 — 데모 원장엔 마감분개가 없어 손익 구분 추가,
     PM 확인) · 최하위 계정만 · No. 미출력 · 구분별 합계 · 쪽이 바뀌면 구분 머리(계속) 반복. SAVE = xlsx '합계잔액시산표_계정구분명_기준일'.
     설계서 "새 창" 팝업·뷰어는 프로젝트 팝업 규약(Dialog)으로 연다. 권한 기반 노출(인쇄·다운로드)은 RBAC 미구현이라 항상 노출. */
import '../../aggrid_shared.css';
import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellKeyDownEvent, CellStyle, ColDef, ColGroupDef, RowClassParams, RowDoubleClickedEvent, ValueFormatterParams } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { UI } from '../../components';
import { GridFrame, FooterActions, footerCount } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, fmt, numFmt, numStyle } from '../../aggrid_theme';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import { DrawerSelect } from '../../drawer_select';
import { FUND_ACCOUNTS } from '../slip/general_journal_data';
import { demoLedger, todayStr } from './ledger_data';
import { DEFAULT_COND, fiscalStart, fundLabel, trialBalance, MSG } from './ledger_model';
import type { LedgerCond } from './ledger_model';
import { DrawerField, DayField, FlagCheck, flagChips } from '../ledger_filter_ui';
import { AccountDetailModal } from './account_detail_modal';
import { LedgerReportViewer } from '../ledger_report_viewer';
import { gridRows, printSections, printPages } from './trial_balance_model';
import type { TbGridRow, TbAmounts, TbPrintLine } from './trial_balance_model';

const { Button, IconBtn } = UI;

const ROUTE = 'acct-trial-balance';
const TITLE = '합계잔액시산표';
const PER_PAGE = 36;

interface TbFilter extends LedgerCond { fundAccount: string; asOf: string }
type AmtKey = keyof TbAmounts;

/* ── 그리드 ── */
const COL_DEF: ColDef = { ...DEFAULT_COL_DEF, sortable: false };   // 계층 순서 고정
const tabular: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const indentOf = (r: TbGridRow) => Math.max(0, r.level - 1) * 16;
function LabelCell(p: { data?: TbGridRow; node?: { rowPinned?: string | null } }) {
  const r = p.data; if (!r) return null;
  if (p.node?.rowPinned) return <span className="font-bold">{r.label}</span>;
  return <span className="min-w-0 truncate" style={{ paddingLeft: indentOf(r), fontWeight: r.kind === 'group' ? 700 : undefined }}>{r.label}</span>;
}
const noFmt = (p: ValueFormatterParams<TbGridRow>) => (p.node?.rowPinned ? '' : String(p.value ?? ''));
const getRowStyle = (p: RowClassParams<TbGridRow>) => (p.data?.kind === 'group' && !p.node.rowPinned ? { fontWeight: 600 } : undefined);
const amountCol = (k: AmtKey, header: string): ColDef<TbGridRow> => ({
  field: k, headerName: header, flex: 1, minWidth: 150, width: 150, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any,
});
const SIDE_KEYS: Record<'dr' | 'cr', Record<'balance' | 'total', AmtKey>> = {
  dr: { balance: 'drBalance', total: 'drTotal' }, cr: { balance: 'crBalance', total: 'crTotal' },
};

function makeColumns(): (ColDef<TbGridRow> | ColGroupDef<TbGridRow>)[] {
  /* 차변 = [잔액, 합계], 대변 = [합계, 잔액] — 계정 열을 가운데 두고 대칭 */
  const dr: ColGroupDef<TbGridRow> = { headerName: '차변금액', marryChildren: true, children: [amountCol(SIDE_KEYS.dr.balance, '잔액'), amountCol(SIDE_KEYS.dr.total, '합계')] };
  const cr: ColGroupDef<TbGridRow> = { headerName: '대변금액', marryChildren: true, children: [amountCol(SIDE_KEYS.cr.total, '합계'), amountCol(SIDE_KEYS.cr.balance, '잔액')] };
  return [
    { field: 'no', headerName: 'No.', width: 64, minWidth: 64, maxWidth: 64, cellStyle: tabular, valueFormatter: noFmt },
    dr,
    { field: 'code', headerName: '계정코드', width: 104, minWidth: 96, cellStyle: tabular },
    { field: 'label', headerName: '계정과목', flex: 1.4, minWidth: 240, width: 240, cellRenderer: LabelCell },
    cr,
  ];
}

/* ── 출력 양식 한 쪽 ── */
const pnum: CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const pleft: CSSProperties = { textAlign: 'left' };
function PrintHead() {
  return (
    <thead>
      <tr><th colSpan={2} style={pleft}>차변금액</th><th rowSpan={2} style={pleft}>계정코드</th><th rowSpan={2} style={pleft}>계정과목</th><th colSpan={2} style={pleft}>대변금액</th></tr>
      <tr><th style={{ textAlign: 'right' }}>잔액</th><th style={{ textAlign: 'right' }}>합계</th><th style={{ textAlign: 'right' }}>합계</th><th style={{ textAlign: 'right' }}>잔액</th></tr>
    </thead>
  );
}
function TbPrintPage({ first, fund, asOf, lines }: { first: boolean; fund: string; asOf: string; lines: TbPrintLine[] }) {
  /* 구분 머리마다 표를 새로 연다 */
  const blocks: { head: Extract<TbPrintLine, { kind: 'section' }>; body: TbPrintLine[] }[] = [];
  for (const l of lines) {
    if (l.kind === 'section') blocks.push({ head: l, body: [] });
    else blocks[blocks.length - 1]?.body.push(l);
  }
  const amt = (a: TbAmounts) => [a.drBalance, a.drTotal, a.crTotal, a.crBalance].map((v) => fmt(v));
  return (
    <>
      {first && (
        <header style={{ marginBottom: 14, textAlign: 'center' }}>
          <div className="font-bold" style={{ fontSize: 22, marginBottom: 8 }}>{TITLE}</div>
          <div style={{ fontSize: 12.5 }}>{fund}</div>
          <div style={{ fontSize: 12.5 }}>{`기준일 : ${asOf}`}</div>
        </header>
      )}
      {!lines.length && <div style={{ fontSize: 12.5 }}>{MSG.noResult}</div>}
      {blocks.map((b, i) => (
        <section key={`${b.head.cls}-${String(i)}`} style={{ marginBottom: 12 }}>
          <div className="font-bold" style={{ fontSize: 13, margin: '6px 0' }}>{`■ ${b.head.cls}${b.head.cont ? ' (계속)' : ''}`}</div>
          <table>
            <PrintHead />
            <tbody>
              {b.body.map((l) => {
                if (l.kind === 'row') {
                  const [a, bb, c, d] = amt(l.row);
                  return <tr key={l.row.code}><td style={pnum}>{a}</td><td style={pnum}>{bb}</td><td>{l.row.code}</td><td>{l.row.label}</td><td style={pnum}>{c}</td><td style={pnum}>{d}</td></tr>;
                }
                if (l.kind === 'total') {
                  const [a, bb, c, d] = amt(l.total);
                  return <tr key="total" style={{ fontWeight: 700 }}><td style={pnum}>{a}</td><td style={pnum}>{bb}</td><td colSpan={2}>합계</td><td style={pnum}>{c}</td><td style={pnum}>{d}</td></tr>;
                }
                return null;
              })}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   페이지
══════════════════════════════════════════════════════════════ */
export function TrialBalanceManage({ onNav }: { onNav?: (r: string) => void }) {
  const today = useMemo(() => todayStr(), []);
  const src = useMemo(() => demoLedger(today), [today]);
  /* E00 — 필터 없음 전체 조회(계정구분 전체 · 기준일 당일 · 플래그 전부 부) */
  const base = useMemo<TbFilter>(() => ({ ...DEFAULT_COND, includeClosing: false, fundAccount: '', asOf: today }), [today]);

  const [applied, setApplied] = useState<TbFilter>(base);   // 드로어·칩·그리드의 SSOT(초안 사본 없음 — 바꾸는 즉시 반영)
  const [filterOpen, setFilterOpen] = useState(false);
  const [detail, setDetail] = useState<{ code: string; name: string } | null>(null);
  const [viewer, setViewer] = useState(false);

  const patch = (p: Partial<TbFilter>) => setApplied((a) => ({ ...a, ...p }));
  const setD = <K extends keyof TbFilter>(k: K) => (v: TbFilter[K]) => patch({ [k]: v } as Partial<TbFilter>);
  /* 기준일 필수 — 렌더마다 applied 로. 미입력이면 기준일 칸 표시 + 결과 0건(집계하지 않는다) */
  const asOfErr = applied.asOf ? undefined : MSG.dateRequired;

  const tb = useMemo(() => (applied.asOf ? trialBalance(src.lines, applied, applied.asOf) : null), [src, applied]);
  const rows = useMemo(() => (tb ? gridRows(tb) : []), [tb]);
  const pinned = useMemo<TbGridRow[]>(() => (tb && rows.length
    ? [{ code: '', label: '합계', level: 1, kind: 'group', cls: '자산', no: 0, drillable: false, ...tb.total }] : []), [rows.length, tb]);
  const columnDefs = useMemo(() => makeColumns(), []);
  const fund = fundLabel(applied.fundAccount);

  /* 상세필터·팝업이 열린 동안 목록 단축키를 끈다(skipInDialog 와 이중 — 회계 가드 ①) */
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: !filterOpen && !detail && !viewer, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !filterOpen && !detail && !viewer, skipInDialog: true });

  /* E03 — 입력계정 행만 */
  const openDetail = useCallback((r: TbGridRow | undefined, pinnedRow?: string | null) => {
    if (!r?.drillable || pinnedRow) return;
    setDetail({ code: r.code, name: r.label });
  }, []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<TbGridRow>) => openDetail(e.data, e.rowPinned), [openDetail]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<TbGridRow>) => {
    if ((e.event as KeyboardEvent | null)?.key === 'Enter') openDetail(e.data, e.rowPinned);
  }, [openDetail]);

  /* E02 — 현재 조건으로 재조회(백엔드 없음 — 로컬 재계산) */
  const refresh = () => { if (asOfErr) { toast.error(asOfErr); return; } setApplied((a) => ({ ...a })); toast.success('조회되었습니다'); };

  /* E05 — 화면 표 그대로(2단 헤더 병합 · 금액 숫자 셀 · 합계행). 원시자료 7열 전부(SFR-021) */
  const exportExcel = () => {
    if (!tb || !rows.length) { toast.error(MSG.noResult); return; }   // 0건 = 인쇄(openViewer)와 같이 막는다
    const h1 = ['No.', '차변금액', '', '계정코드', '계정과목', '대변금액', ''];
    const h2 = ['', '잔액', '합계', '', '', '합계', '잔액'];
    const body: (string | number)[][] = rows.map((r) => [r.no, r.drBalance, r.drTotal, r.code, ' '.repeat(indentOf(r) / 8) + r.label, r.crTotal, r.crBalance]);
    if (rows.length) body.push(['', tb.total.drBalance, tb.total.drTotal, '', '합계', tb.total.crTotal, tb.total.crBalance]);
    const ws = XLSX.utils.aoa_to_sheet([h1, h2, ...body]);
    body.forEach((_, ri) => [1, 2, 5, 6].forEach((ci) => { const c = ws[XLSX.utils.encode_cell({ r: ri + 2, c: ci })]; if (c && c.t === 'n') c.z = '#,##0'; }));
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } }, { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
      { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } }, { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } },
    ];
    ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 18 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, TITLE);
    XLSX.writeFile(wb, `${TITLE}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  /* E07 — 출력 양식(구분별 · 최하위 계정만) */
  const sections = useMemo(() => (tb ? printSections(tb) : []), [tb]);
  const pages = useMemo(() => printPages(sections, PER_PAGE).map((lines, i) => (
    <TbPrintPage key={i} first={i === 0} fund={fund} asOf={applied.asOf} lines={lines} />
  )), [sections, fund, applied.asOf]);
  const openViewer = () => { if (!sections.length) { toast.error(MSG.noResult); return; } setViewer(true); };
  /* 뷰어 SAVE — 파일명 '합계잔액시산표_계정구분명_기준일'(형식 확인 필요 → 데모 xlsx) */
  const saveReport = (fileName: string) => {
    const aoa: (string | number)[][] = [[TITLE], [fund], [`기준일 : ${applied.asOf}`]];
    for (const s of sections) {
      aoa.push([], [`■ ${s.cls}`], ['차변잔액', '차변합계', '계정코드', '계정과목', '대변합계', '대변잔액']);
      for (const r of s.rows) aoa.push([r.drBalance, r.drTotal, r.code, r.label, r.crTotal, r.crBalance]);
      aoa.push([s.total.drBalance, s.total.drTotal, '합계', '', s.total.crTotal, s.total.crBalance]);
    }
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), TITLE);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    toast.success('저장했습니다');
  };

  const chips = [
    { label: '계정구분', value: applied.fundAccount, onClear: () => patch({ fundAccount: '' }) },
    { label: '기준일', value: applied.asOf },
    ...flagChips(applied, base, patch),
  ];

  return (
    <GridFrame
      crumbs={['홈', '회계', '장부조회', TITLE]}
      title={TITLE}
      favRoute={ROUTE}
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={chips}
      toolbarRight={<>
        <span className="text-caption" style={{ fontSize: 12 }}>단위: 원</span>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{footerCount(rows.length, rows.length)}</span>}
      footerRight={<FooterActions onExport={exportExcel} printItems={[{ label: `${TITLE} 출력`, icon: 'file', onSelect: openViewer }]} />}>

      <div>
        <AgGridReact<TbGridRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={COL_DEF}
          getRowId={(p) => (p.data.no ? p.data.code : 'total')}
          getRowStyle={getRowStyle}
          pinnedBottomRowData={pinned}
          domLayout="autoHeight"
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={MSG.noResult}
        />
      </div>

      {/* ── 상세필터(E01) — 바꾸는 즉시 applied 반영([필터 적용] = 닫기) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">{`${TITLE} 조회 조건`}</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="계정구분">
              <DrawerSelect value={applied.fundAccount} onChange={setD('fundAccount')} options={[...FUND_ACCOUNTS]} ariaLabel="계정구분" />
            </DrawerField>
            <DayField label="기준일" required value={applied.asOf} onChange={setD('asOf')} errMsg={asOfErr} />
            <FlagCheck label="미결재포함" value={applied.includeUnapproved} onChange={setD('includeUnapproved')} />
            <FlagCheck label="모든계정포함" value={applied.includeAll} onChange={setD('includeAll')} />
            <FlagCheck label="결산전표포함" value={applied.includeClosing} onChange={setD('includeClosing')} />
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => setApplied(base)}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {detail && (
        <AccountDetailModal src={src} cond={applied} account={detail} from={fiscalStart(applied.asOf)} to={applied.asOf} onClose={() => setDetail(null)} />
      )}
      {viewer && (
        <LedgerReportViewer title={TITLE} pages={pages} fileName={`${TITLE}_${fund}_${applied.asOf}`}
          info={[['계정구분', fund], ['기준일', applied.asOf], ['미결재포함', applied.includeUnapproved ? '여' : '부'],
            ['모든계정포함', applied.includeAll ? '여' : '부'], ['결산전표포함', applied.includeClosing ? '여' : '부']]}
          onSave={saveReport} onClose={() => setViewer(false)} />
      )}
    </GridFrame>
  );
}
