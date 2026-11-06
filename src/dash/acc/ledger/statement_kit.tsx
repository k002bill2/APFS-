/* 결산서 공용 페이지 골격 — 재무상태표(ACC-012)·손익계산서(ACC-013). 화면 설정(StatementConfig)은 각 페이지 파일이 넘긴다
   (CLAUDE.md: 공용 골격은 중분류 루트, 설정은 화면 파일마다).

   설계서 → 우리 규약
   - 툴바: [상세필터] · ⟳ 조회(E02). 선택 체크박스 없음(조회 전용).
   - 그리드 6열: 계정코드 · 계정과목명(레벨 들여쓰기) · 제N(당)기[세부금액|합계금액] · 제N-1(전)기[세부금액|합계금액] 2단 헤더.
     입력계정·파생 세부 = 세부금액 열, 집계·계산·총계 = 합계금액 열. 계정코드 '중앙' → 좌측(정렬 규약). 헤더 정렬 끔(계층 순서).
   - 상세필터 6개(slide 11 · E01 기준 — slide 15 의 기간형·체크박스형 변형은 따르지 않는다): 계정구분 · 당기기준일* · 전기기준일* ·
     미결재포함(체크박스) · 모든계정포함(체크박스 — 2026-11-03 사용자 지시) · 결산전표포함(체크박스 — 체크 = 전부포함). 즉시 반영 — 고르는 즉시 applied 반영,
     [필터 적용] = 닫기. 검증 실패(기준일 미입력 → 그 기준일 칸 · 전기 ≥ 당기 → 전기기준일 칸) = 칸 빨간 테두리 + 아래 안내, 결과 0건
     (2026-11-03 사용자 지시, 정본 privacy_access_log). 기준일 칩은 필수라 × 없음.
     계정구분: 설계서 '선택 필요·필수' 와 E00 '필터 없음 전체 조회' 가 충돌 → 기본 전체(빈 값)로 두고 × 로 해제 가능(PM 확인).
   - 행 더블클릭 / Enter(E03) = 「계정별 상세내역」(입력계정 행만 — 집계·계산·총계 행은 무반응, 설계서 "소계·합계 행 처리 확인 필요").
     기준일 = 당기 회기 시작일 ~ 당기기준일.
   - 푸터: 새 창 · 내보내기(⌥D) · 인쇄 combo [🖨 │ ⌄ ○○ 출력]. 본체·⌘P = 그리드 인쇄(printGrid 가드), ⌄ = 리포트 뷰어(E07)
     — 설계서는 [인쇄] = 뷰어지만 프로젝트 규약(푸터 인쇄 combo ②)으로 둔다(PM 확인). 조회 결과 0건이면 뷰어 대신 "조회 결과가 없습니다.".
     권한 기반 노출(인쇄·다운로드)은 RBAC 미구현이라 항상 노출.

   사용(페이지 파일):
     const CONFIG: StatementConfig = { route: 'acct-balance-sheet', title: '재무상태표', build: balanceSheet,
       printTitle: '재 무 상 태 표', periodLines: (t) => [...] };
     export function BalanceSheetManage({ onNav }) { return <StatementKit config={CONFIG} onNav={onNav} />; } */
import '../../aggrid_shared.css';
import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellKeyDownEvent, CellStyle, ColDef, ColGroupDef, RowClassParams, RowDoubleClickedEvent, ValueFormatterParams } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, fmt, numFmt, numStyle } from '../../aggrid_theme';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import { DrawerSelect } from '../../drawer_select';
import { FUND_ACCOUNTS } from '../slip/general_journal_data';
import { demoLedger, todayStr } from './ledger_data';
import type { LedgerLine } from './ledger_data';
import { DEFAULT_COND, fiscalEnd, fiscalNo, fiscalStart, fundLabel, validateStatementDates, MSG } from './ledger_model';
import type { LedgerCond, StatementRow } from './ledger_model';
import { DrawerField, DayField, FlagCheck, flagChips } from '../ledger_filter_ui';
import { AccountDetailModal } from './account_detail_modal';
import { LedgerReportViewer, paginate } from '../ledger_report_viewer';

const { Button, IconBtn } = UI;

/* ── 화면 설정 ── */
export interface StatementTerm { no: number; start: string; end: string }   // 제N기 · 회기 시작 ~ 기준일
export interface StatementConfig {
  route: string;                 // favRoute = data.ts 메뉴 path
  title: string;                 // 메뉴 리프 라벨 그대로
  build: (lines: readonly LedgerLine[], cond: LedgerCond, curAsOf: string, prevAsOf: string) => StatementRow[];
  printTitle: string;            // 출력 양식 제목(자간 띄움 표기 — '재 무 상 태 표')
  /** 출력 양식 기간 줄(당기·전기) — 재무상태표 '제 2기 2026년 12월 31일 현재' · 손익계산서 'YYYY년 MM월 DD일 부터 … 까지' */
  periodLines: (cur: StatementTerm, prev: StatementTerm) => string[];
  /** 기본 조건 덮어쓰기(설계서 기본값이 화면마다 다를 때) */
  defaults?: Partial<StatementFilter>;
}

export interface StatementFilter extends LedgerCond { fundAccount: string; cur: string; prev: string }

/** 'YYYY-MM-DD' → 'YYYY년 MM월 DD일' (출력 양식) */
export const krDate = (d: string): string => (d ? `${d.slice(0, 4)}년 ${d.slice(5, 7)}월 ${d.slice(8, 10)}일` : '');
const termOf = (asOf: string): StatementTerm => ({ no: fiscalNo(asOf), start: fiscalStart(asOf), end: asOf });
const PER_PAGE = 34;

/* ── 그리드 ── */
const COL_DEF: ColDef = { ...DEFAULT_COL_DEF, sortable: false };   // 계층 순서 고정
const tabular: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const blankFmt = (p: ValueFormatterParams) => (p.value == null ? '' : numFmt(p));
const strongKinds = new Set<StatementRow['kind']>(['header', 'group', 'total', 'calc']);
const indentOf = (r: StatementRow) => (r.kind === 'total' ? 0 : Math.max(0, r.level - 1) * 16);
function LabelCell(p: { data?: StatementRow }) {
  const r = p.data; if (!r) return null;
  return <span className="min-w-0 truncate" style={{ paddingLeft: indentOf(r), fontWeight: strongKinds.has(r.kind) && r.kind !== 'calc' ? 700 : undefined }}>{r.label}</span>;
}
const getRowStyle = (p: RowClassParams<StatementRow>) =>
  (p.data?.kind === 'total' ? { background: 'var(--muted)', fontWeight: 700 } : undefined);
const amountCol = (period: 'cur' | 'prev', col: 'detail' | 'total', header: string): ColDef<StatementRow> => ({
  colId: `${period}-${col}`, headerName: header, width: 160, minWidth: 140, flex: 1, type: 'rightAligned',
  valueGetter: (p) => (p.data && p.data.col === col ? p.data[period] : null),
  valueFormatter: blankFmt, cellStyle: numStyle(col === 'total') as any,
});
/** 그리드·엑셀 헤더 = 제N(당)기 + 회기기간(회기 시작 ~ 회기 종료일 — 설계서 slide 10 '(2023-01-01~2023-12-31)'). 기준일 '현재' 표기는 출력 양식(periodLines)만 */
export const termHeader = (t: StatementTerm, which: '당' | '전') => `제${String(t.no)}(${which})기 (${t.start} ~ ${fiscalEnd(t.end)})`;
/** 데이터 행 = 입력계정·파생 세부(leaf·calc). 머리·집계·총계 행은 구조라 건수·0건 판정에서 뺀다 */
export const dataRowCount = (rows: readonly StatementRow[]): number => rows.filter((r) => r.kind === 'leaf' || r.kind === 'calc').length;
/** 기준일 칩 — 필수 조건이라 onClear 없음(✕ 미노출) */
export const dateChips = (f: { cur: string; prev: string }) => [
  { label: '당기기준일', value: `당기 ${f.cur}` },
  { label: '전기기준일', value: `전기 ${f.prev}` },
];

function makeColumns(cur: StatementTerm, prev: StatementTerm): (ColDef<StatementRow> | ColGroupDef<StatementRow>)[] {
  const groups: ColGroupDef<StatementRow>[] = [
    { headerName: termHeader(cur, '당'), marryChildren: true, children: [amountCol('cur', 'detail', '세부금액'), amountCol('cur', 'total', '합계금액')] },
    { headerName: termHeader(prev, '전'), marryChildren: true, children: [amountCol('prev', 'detail', '세부금액'), amountCol('prev', 'total', '합계금액')] },
  ];
  return [
    { field: 'code', headerName: '계정코드', width: 104, minWidth: 96, cellStyle: tabular },
    { field: 'label', headerName: '계정과목명', flex: 1.4, minWidth: 260, width: 260, cellRenderer: LabelCell },
    ...groups,
  ];
}

/* ── 출력 양식 한 쪽 ── */
const pth: CSSProperties = { textAlign: 'left' };
const pnum: CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
function StatementPage({ first, cfg, cur, prev, fund, rows }: { first: boolean; cfg: StatementConfig; cur: StatementTerm; prev: StatementTerm; fund: string; rows: StatementRow[] }) {
  const cell = (r: StatementRow, period: 'cur' | 'prev', col: 'detail' | 'total') => (r.col === col && r[period] != null ? fmt(r[period] as number) : '');
  return (
    <>
      {first && (
        <header style={{ marginBottom: 14 }}>
          <div className="font-bold" style={{ fontSize: 22, textAlign: 'center', marginBottom: 8 }}>{cfg.printTitle}</div>
          {cfg.periodLines(cur, prev).map((l) => <div key={l} style={{ textAlign: 'center', fontSize: 12.5 }}>{l}</div>)}
          <div className="flex justify-between" style={{ marginTop: 14, fontSize: 12.5 }}>
            <span>{fund}</span><span>(단위 : 대한민국 (원))</span>
          </div>
        </header>
      )}
      <table>
        <thead>
          <tr><th rowSpan={2} style={pth}>계정과목</th><th colSpan={2} style={pth}>{`제 ${String(cur.no)}(당) 기`}</th><th colSpan={2} style={pth}>{`제 ${String(prev.no)}(전) 기`}</th></tr>
          <tr><th style={{ textAlign: 'right' }}>세부</th><th style={{ textAlign: 'right' }}>합계</th><th style={{ textAlign: 'right' }}>세부</th><th style={{ textAlign: 'right' }}>합계</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={r.kind === 'total' ? { fontWeight: 700 } : undefined}>
              <td style={{ paddingLeft: 8 + indentOf(r), fontWeight: r.kind === 'header' || r.kind === 'group' ? 700 : undefined }}>{r.label}</td>
              <td style={pnum}>{cell(r, 'cur', 'detail')}</td><td style={pnum}>{cell(r, 'cur', 'total')}</td>
              <td style={pnum}>{cell(r, 'prev', 'detail')}</td><td style={pnum}>{cell(r, 'prev', 'total')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   페이지 골격
══════════════════════════════════════════════════════════════ */
export function StatementKit({ config, onNav }: { config: StatementConfig; onNav?: (r: string) => void }) {
  const today = useMemo(() => todayStr(), []);
  const src = useMemo(() => demoLedger(today), [today]);
  const base = useMemo<StatementFilter>(() => {
    const y = Number(today.slice(0, 4));
    return { ...DEFAULT_COND, fundAccount: '', cur: `${String(y)}-12-31`, prev: `${String(y - 1)}-12-31`, ...config.defaults };
  }, [today, config.defaults]);

  const [applied, setApplied] = useState<StatementFilter>(base);   // 드로어·칩·그리드의 SSOT(초안 사본 없음 — 바꾸는 즉시 반영)
  const [filterOpen, setFilterOpen] = useState(false);
  const [detail, setDetail] = useState<{ code: string; name: string } | null>(null);
  const [viewer, setViewer] = useState(false);

  const patch = (p: Partial<StatementFilter>) => setApplied((a) => ({ ...a, ...p }));
  const setD = <K extends keyof StatementFilter>(k: K) => (v: StatementFilter[K]) => patch({ [k]: v } as Partial<StatementFilter>);
  /* 기준일 검증 — 렌더마다 applied 로. 실패면 그 칸 표시 + 결과 0건(미입력 = 그 칸 · 전기 ≥ 당기 = 전기기준일 칸) */
  const dateErr = validateStatementDates(applied.cur, applied.prev);
  const curErr = !applied.cur ? MSG.dateRequired : undefined;
  const prevErr = !applied.prev ? MSG.dateRequired : dateErr === MSG.prevOrder ? MSG.prevOrder : undefined;

  const rows = useMemo(() => (dateErr ? [] : config.build(src.lines, applied, applied.cur, applied.prev)), [dateErr, config, src, applied]);
  /* 0건 판정 하나로 그리드·푸터·뷰어를 맞춘다 — 결산서는 머리·총계 행을 늘 만들어 rows 가 비지 않는다 */
  const hasData = rows.some((r) => (r.kind === 'leaf' || r.kind === 'calc') && (r.cur || r.prev));
  const gridRows = hasData ? rows : [];
  const count = dataRowCount(gridRows);
  /* 헤더 회기 = 기준일이 비면 기본값으로(빈 날짜로 '제-2024기' 같은 헤더가 나오지 않게 — 결과는 0건) */
  const cur = useMemo(() => termOf(applied.cur || base.cur), [applied.cur, base.cur]);
  const prev = useMemo(() => termOf(applied.prev || base.prev), [applied.prev, base.prev]);
  const columnDefs = useMemo(() => makeColumns(cur, prev), [cur, prev]);
  const fund = fundLabel(applied.fundAccount);

  /* 상세필터·팝업이 열린 동안 목록 단축키를 끈다(skipInDialog 와 이중 — 회계 가드 ①) */
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: !filterOpen && !detail && !viewer, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !filterOpen && !detail && !viewer, skipInDialog: true });

  /* E03 — 입력계정 행만 */
  const openDetail = useCallback((r: StatementRow | undefined) => {
    if (!r?.drillable) return;
    setDetail({ code: r.code, name: r.label });
  }, []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<StatementRow>) => openDetail(e.data), [openDetail]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<StatementRow>) => { if ((e.event as KeyboardEvent | null)?.key === 'Enter') openDetail(e.data); }, [openDetail]);

  /* E02 — 현재 조건으로 재조회(백엔드 없음 — 로컬 재계산) */
  const refresh = () => { if (dateErr) { toast.error(dateErr); return; } setApplied((a) => ({ ...a })); toast.success('조회되었습니다'); };

  /* E05 — 화면 표 그대로(2단 헤더 병합 · 금액 숫자 셀) */
  const exportExcel = () => {
    if (!hasData) { toast.error(MSG.noResult); return; }
    const h1 = ['계정코드', '계정과목명', termHeader(cur, '당'), '', termHeader(prev, '전'), ''];
    const h2 = ['', '', '세부금액', '합계금액', '세부금액', '합계금액'];
    const pick = (r: StatementRow, p: 'cur' | 'prev', c: 'detail' | 'total') => (r.col === c && r[p] != null ? r[p] : '');
    const body = rows.map((r) => [r.code, ' '.repeat(indentOf(r) / 8) + r.label, pick(r, 'cur', 'detail'), pick(r, 'cur', 'total'), pick(r, 'prev', 'detail'), pick(r, 'prev', 'total')]);
    const ws = XLSX.utils.aoa_to_sheet([h1, h2, ...body]);
    body.forEach((_, ri) => [2, 3, 4, 5].forEach((ci) => { const c = ws[XLSX.utils.encode_cell({ r: ri + 2, c: ci })]; if (c && c.t === 'n') c.z = '#,##0'; }));
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, { s: { r: 0, c: 2 }, e: { r: 0, c: 3 } }, { s: { r: 0, c: 4 }, e: { r: 0, c: 5 } }];
    ws['!cols'] = [{ wch: 12 }, { wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, config.title);
    XLSX.writeFile(wb, `${config.title}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };
  /* E07 뷰어 SAVE — 설계서 파일명 '문서명_계정구분명_당기기준일'(형식 확인 필요 → 데모 xlsx) */
  const saveReport = (fileName: string) => {
    const aoa = [[config.printTitle.replace(/\s/g, '')], ...config.periodLines(cur, prev).map((l) => [l]), [fund, '', '', '', '(단위 : 대한민국 (원))'],
      ['계정과목', `제 ${String(cur.no)}(당) 기`, '', `제 ${String(prev.no)}(전) 기`, ''],
      ['', '세부', '합계', '세부', '합계'],
      ...rows.map((r) => [r.label, r.col === 'detail' ? r.cur ?? '' : '', r.col === 'total' ? r.cur ?? '' : '', r.col === 'detail' ? r.prev ?? '' : '', r.col === 'total' ? r.prev ?? '' : ''])];
    /* 출력 양식과 같은 2단 헤더 — 계정과목 세로 병합 · 당기(1~2열)·전기(3~4열) 가로 병합 */
    const head = aoa.length - rows.length - 2;
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = [{ s: { r: head, c: 0 }, e: { r: head + 1, c: 0 } }, { s: { r: head, c: 1 }, e: { r: head, c: 2 } }, { s: { r: head, c: 3 }, e: { r: head, c: 4 } }];
    rows.forEach((_, ri) => [1, 2, 3, 4].forEach((ci) => { const c = ws[XLSX.utils.encode_cell({ r: head + 2 + ri, c: ci })]; if (c && c.t === 'n') c.z = '#,##0'; }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, config.title);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    toast.success('저장했습니다');
  };
  const openViewer = () => { if (!hasData) { toast.error(MSG.noResult); return; } setViewer(true); };
  const pages = useMemo(() => paginate(rows, PER_PAGE).map((chunk, i) => (
    <StatementPage key={i} first={i === 0} cfg={config} cur={cur} prev={prev} fund={fund} rows={chunk} />
  )), [rows, config, cur, prev, fund]);

  const chips = [
    { label: '계정구분', value: applied.fundAccount, onClear: () => patch({ fundAccount: '' }) },
    ...dateChips(applied),
    ...flagChips(applied, base, patch),
  ];

  return (
    <GridFrame
      crumbs={['홈', '회계', '장부조회', config.title]}
      title={config.title}
      favRoute={config.route}
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={chips}
      toolbarRight={<>
        <span className="text-caption" style={{ fontSize: 12 }}>단위: 원</span>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{`총 ${String(count)}건 중 ${String(count)}건 표시`}</span>}
      footerRight={<FooterActions onExport={exportExcel} printItems={[{ label: `${config.title} 출력`, icon: 'file', onSelect: openViewer }]} />}>

      <div>
        <AgGridReact<StatementRow>
          theme={apfsTheme}
          rowData={gridRows}
          columnDefs={columnDefs}
          defaultColDef={COL_DEF}
          getRowId={(p) => p.data.id}
          getRowStyle={getRowStyle}
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
            <SheetDescription className="sr-only">{`${config.title} 조회 조건`}</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="계정구분">
              <DrawerSelect value={applied.fundAccount} onChange={setD('fundAccount')} options={[...FUND_ACCOUNTS]} ariaLabel="계정구분" />
            </DrawerField>
            <DayField label="당기기준일" required value={applied.cur} onChange={setD('cur')} errMsg={curErr} />
            <DayField label="전기기준일" required value={applied.prev} onChange={setD('prev')} errMsg={prevErr} />
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
        <AccountDetailModal src={src} cond={applied} account={detail} from={fiscalStart(applied.cur)} to={applied.cur} onClose={() => setDetail(null)} />
      )}
      {viewer && (
        <LedgerReportViewer title={config.title} pages={pages} fileName={`${config.title}_${fund}_${applied.cur}`}
          info={[['계정구분', fund], ['당기기준일', applied.cur], ['전기기준일', applied.prev]]}
          onSave={saveReport} onClose={() => setViewer(false)} />
      )}
    </GridFrame>
  );
}
