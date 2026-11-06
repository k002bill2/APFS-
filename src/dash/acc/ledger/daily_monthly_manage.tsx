/* 일/월계표 — 조회 전용 집계 화면 (회계 > 장부조회 > 일/월계표, route acct-daily-monthly, 화면ID ACC-009).
   출처: ACC-009 화면설계서 v1.0(slide 9 개요 · 10 일계표 · 11 월계표 · 12 상세필터 · 14~17 이벤트 E00~E07).

   설계서 → 우리 규약
   - 브레드크럼·제목·☆ 즐겨찾기·[메인으로] = GridFrame(favRoute acct-daily-monthly).
   - 툴바: [상세필터](E01) → ⟳ 조회(E02, 맨 끝 · ⌥R). 단위 캡션 '단위: 원'. 등록·선택 체크박스·선택 바 없음(조회 전용).
   - 탭 2개(E04) = 공용 TabBar(risk_page_kit — role=tablist, 좌우 화살표) · 본문 첫머리. 활성 탭 그리드만 마운트한다
     (숨은 패널의 AG Grid 는 폭 0 으로 초기화된다). 탭 전환은 즉시 반영(드로어를 거치지 않는다).
   - 일계표 그리드 4열: 계정구분 · 차변금액 · 계정과목 · 대변금액(설계서 순서 그대로). 계정구분별 [소계] 행은 본문 안에
     (--muted + 굵게, 계정구분 칸 '소계'), 계정구분이 2개 이상이면 맨 아래 pinned [합계] 행. 집계 = ledger_model dailyStatement.
   - 월계표 그리드: 행 = 월(YYYY-MM, 좌측 고정) · 열 = 계정과목별 [차변|대변] 2단 그룹(조회 결과로 동적 생성) + 마지막 [합계] 그룹,
     맨 아래 pinned 조회기간 합계 행('2026-01 ~ 2026-10'). 집계 = ledger_model monthlyStatement.
   - 두 그리드 모두 헤더 정렬 끔(소계 행·월 순서 고정), 행 선택·더블클릭 없음(설계서 "행 더블클릭: 이벤트 없음" — 전표상세 미사용).
     컬럼 폭 = flex + minWidth(=width) — 좁은 집계 그리드라 내용 맞춤 자동폭은 쓰지 않는다.
   - 상세필터(E01 · slide 12) = 탭별 조건. 즉시 반영 — 고르는 즉시 applied 반영, [필터 적용] = 닫기. 검증 실패 = 그 칸 표시 +
     아래 안내, 결과 0건(2026-11-03 사용자 지시, 정본 privacy_access_log).
       일계표: 계정구분(셀렉트 다중선택 DrawerMultiSelect · 기본 전체) · 기준일*(기본 오늘)
       월계표: 계정구분*(단일 · 기본 미선택) · 기간*(기본 당해 1/1 ~ 현재월 말, 시작 > 종료 → "시작일은 종료일보다 늦을 수 없습니다.")
       공통: 미결재포함 · 모든계정포함 · 결산전표포함(기본 전부 부). [초기화] = 현재 탭 기본값 복원.
   - 탭 전환 규칙(slide 12 ③): 월계표로 → 기간 재설정 · 계정구분 첫 값만 유지(없으면 "계정구분을 선택하세요" — 조회하지 않는다) /
     일계표로 → 기준일 = 오늘 · 계정구분 유지. 규칙은 daily_monthly_model(+테스트).
   - 적용 칩: 계정구분(일계표 다중 = 드롭다운 트리거와 같은 '첫 라벨 외 N') · 기준일/기간(✕ 없음 — 해제 불가) · 플래그 3종(ledger_filter_ui flagChips — 기본값과 다를 때만 칩 + ✕).
   - 푸터 도구: 새 창(E05 · ⌥O, 현재 route 새 탭) · 내보내기(E06 · ⌥D, 화면 표 그대로 + 금액 숫자 셀) · 인쇄(E07 · ⌘P, 그리드만 printGrid).

   결정·가정(PM 확인 필요)
   - 미결재포함·모든계정포함·결산전표포함 = 체크박스(FlagCheck — 2026-11-03 사용자 지시 '~포함 필터는 전부 체크박스').
   - 일계표 계정구분 다중 선택 = 셀렉트형 다중 선택(DrawerMultiSelect → ui/multi-select — 맨 위 '전체 선택' 3상태 · 하단 개수/선택 해제,
     하나도 안 고르면 전체). 설계서는 태그형 다중 셀렉트.
   - 월계표 계정구분 칩은 필수 조건이라 ✕ 없음(설계서 와이어프레임은 ✕ 표기 — E04 '필수 조건 미입력 시 조회 불가'를 따름).
   - 월계표 '계좌번호 필수입력 계정만 집계'(레거시 대응)는 계정과목 데이터에 그 플래그가 없어 미반영 — 사용된 입력계정 전부 집계.
   - 권한 기반 노출(내보내기·인쇄 = "인쇄·다운로드" 권한)은 RBAC 미구현이라 항상 노출. */
import '../../aggrid_shared.css';
import { useId, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellStyle, ColDef, ColGroupDef, RowClassParams } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, numFmt, numStyle } from '../../aggrid_theme';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import { DrawerSelect, DrawerMultiSelect } from '../../drawer_select';
import { multiSelectSummary } from '../../ui/multi-select';
import { TabBar, TabPanel } from '../../risk_page_kit';
import type { AppliedFilter } from '../../applied_filters';
import { FUND_ACCOUNTS } from '../slip/general_journal_data';
import { demoLedger, todayStr } from './ledger_data';
import { dailyStatement, fundLabel, monthlyStatement, MSG } from './ledger_model';
import type { DailyRow, LedgerCond, MonthRow } from './ledger_model';
import { DrawerField, DayField, DayRangeField, FlagCheck, flagChips } from '../ledger_filter_ui';
import { condOf, defaultFilter, errorField, resetFilter, switchTab, validateFilter } from './daily_monthly_model';
import type { DmFilter, DmTab } from './daily_monthly_model';

const { Button, IconBtn } = UI;

const TABS: { id: DmTab; label: string }[] = [{ id: 'daily', label: '일계표' }, { id: 'monthly', label: '월계표' }];
const TAB_LABEL: Record<DmTab, string> = { daily: '일계표', monthly: '월계표' };

/* ── 그리드 공통 ── */
const COL_DEF: ColDef = { ...DEFAULT_COL_DEF, sortable: false };   // 소계 행·월 순서 고정
const tabular: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const SUM_STYLE = { background: 'var(--muted)', fontWeight: 700 };

/* ── 일계표 ── */
type DayRow = Omit<DailyRow, 'kind'> & { kind: DailyRow['kind'] | 'total' };
const dayAmount = (field: 'debit' | 'credit', header: string): ColDef<DayRow> => ({
  field, headerName: header, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any,
  flex: 1, minWidth: 150, width: 150,
});
const DAY_COLUMNS: ColDef<DayRow>[] = [
  { colId: 'fund', headerName: '계정구분', flex: 1.2, minWidth: 200, width: 200,
    valueGetter: (p) => (p.data?.kind === 'line' ? p.data.fundAccount : p.data?.kind === 'subtotal' ? '소계' : '합계') },
  dayAmount('debit', '차변금액'),
  { colId: 'account', headerName: '계정과목', flex: 1.2, minWidth: 200, width: 200,
    valueGetter: (p) => (p.data?.kind === 'line' ? p.data.name : '') },
  dayAmount('credit', '대변금액'),
];
const dayRowStyle = (p: RowClassParams<DayRow>) => (p.data?.kind === 'subtotal' ? SUM_STYLE : undefined);

/* ── 월계표 ── */
const monthAmount = (colId: string, header: string, get: (r: MonthRow) => number, strong?: boolean): ColDef<MonthRow> => ({
  colId, headerName: header, type: 'rightAligned', valueGetter: (p) => (p.data ? get(p.data) : null),
  valueFormatter: numFmt, cellStyle: numStyle(strong) as any, flex: 1, minWidth: strong ? 168 : 144, width: strong ? 168 : 144,
});
function monthColumns(accounts: readonly { code: string; name: string }[]): (ColDef<MonthRow> | ColGroupDef<MonthRow>)[] {
  return [
    { field: 'month', headerName: '월', pinned: 'left', width: 184, minWidth: 184, cellStyle: tabular },
    ...accounts.map((a): ColGroupDef<MonthRow> => ({
      headerName: a.name, groupId: a.code, marryChildren: true,
      children: [
        monthAmount(`${a.code}-d`, '차변', (r) => r.cells[a.code]?.debit ?? 0),
        monthAmount(`${a.code}-c`, '대변', (r) => r.cells[a.code]?.credit ?? 0),
      ],
    })),
    { headerName: '합계', groupId: 'sum', marryChildren: true,
      children: [monthAmount('sum-d', '차변', (r) => r.debit, true), monthAmount('sum-c', '대변', (r) => r.credit, true)] },
  ];
}

/* ── Excel 숫자 셀 서식(금액 = 숫자 셀 → Excel 이 우측 정렬) ── */
function numberFormat(ws: XLSX.WorkSheet, fromRow: number, rows: number, cols: number[]) {
  for (let r = fromRow; r < fromRow + rows; r++) for (const c of cols) {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    if (cell && cell.t === 'n') cell.z = '#,##0';
  }
}

/* ══════════════════════════════════════════════════════════════
   페이지
══════════════════════════════════════════════════════════════ */
export function DailyMonthlyManage({ onNav }: { onNav?: (r: string) => void }) {
  const today = useMemo(() => todayStr(), []);
  const src = useMemo(() => demoLedger(today), [today]);
  const base = useMemo(() => defaultFilter(today), [today]);
  const idBase = useId();

  const [tab, setTab] = useState<DmTab>('daily');                 // E00 — 첫 번째 탭(일계표) 활성
  const [applied, setApplied] = useState<DmFilter>(base);         // E00 — 필터 없음 전체 조회(계정구분 전체 · 기준일 오늘). 드로어·칩·그리드의 SSOT(초안 사본 없음)
  const [filterOpen, setFilterOpen] = useState(false);

  const patch = (p: Partial<DmFilter>) => setApplied((a) => ({ ...a, ...p }));
  const setD = <K extends keyof DmFilter>(k: K) => (v: DmFilter[K]) => patch({ [k]: v } as Partial<DmFilter>);
  /* flagChips 의 ✕ 는 플래그 3종만 되돌린다 — LedgerCond.fundAccount(string|배열)는 DmFilter(string[])와 달라 플래그만 골라 넘긴다 */
  const patchCond = ({ includeUnapproved, includeClosing, includeAll }: Partial<LedgerCond>) =>
    patch(Object.fromEntries(Object.entries({ includeUnapproved, includeClosing, includeAll }).filter(([, v]) => v !== undefined)));

  /* 조회 가능 여부 — 렌더마다 applied 로. 실패면 그 칸 표시 + 집계하지 않는다(결과 0건 · 빈 값 = 전체로 새지 않게) */
  const blocked = validateFilter(tab, applied);
  const errField = errorField(tab, applied);
  const cond = useMemo(() => condOf(tab, applied), [tab, applied]);
  const daily = useMemo(() => (tab === 'daily' && !blocked ? dailyStatement(src.lines, cond, applied.date) : null),
    [tab, blocked, src, cond, applied.date]);
  const monthly = useMemo(() => (tab === 'monthly' && !blocked ? monthlyStatement(src.lines, cond, applied.from, applied.to) : null),
    [tab, blocked, src, cond, applied.from, applied.to]);

  const dayRows = useMemo<DayRow[]>(() => daily?.rows ?? [], [daily]);
  const dayPinned = useMemo<DayRow[]>(() => {
    if (!daily || daily.rows.filter((r) => r.kind === 'subtotal').length < 2) return [];
    return [{ id: 'total', kind: 'total', fundAccount: '', code: '', name: '합계', ...daily.total }];
  }, [daily]);
  const monthCols = useMemo(() => monthColumns(monthly?.accounts ?? []), [monthly]);
  const monthPinned = useMemo<MonthRow[]>(() => (monthly && monthly.months.length ? [monthly.total] : []), [monthly]);

  /* E04 탭 전환 — 조건 변환(slide 12 ③) 후 즉시 조회 */
  const changeTab = (id: string) => {
    const next = id as DmTab;
    if (next === tab) return;
    const f = switchTab(applied, next, today);
    setTab(next);
    setApplied(f);
    if (next === 'monthly' && !f.fundAccount[0]) toast.info(MSG.fundRequired);
  };

  /* [초기화] — 현재 탭 기본값(일계표: 전체·오늘 / 월계표: 첫 계정구분·1/1~현재월 말). 다른 탭 칸은 건드리지 않는다 */
  const resetApplied = () => setApplied((a) => resetFilter(a, tab, base));

  /* E02 조회 — 필수 조건이 비면 조회 불가 */
  const refresh = () => {
    if (blocked) { toast.error(blocked); return; }
    setApplied((a) => ({ ...a }));
    toast.success('조회되었습니다');
  };

  /* E06 내보내기 — 화면 표 그대로(일계표 4열 + 소계·합계 / 월계표 2단 헤더 병합 + 기간 합계) */
  const exportExcel = () => {
    if (blocked) { toast.error(blocked); return; }
    const wb = XLSX.utils.book_new();
    let name: string;
    if (tab === 'daily') {
      const body = [...dayRows, ...dayPinned].map((r) => [
        r.kind === 'line' ? r.fundAccount : r.kind === 'subtotal' ? '소계' : '합계', r.debit, r.kind === 'line' ? r.name : '', r.credit]);
      const ws = XLSX.utils.aoa_to_sheet([['계정구분', '차변금액', '계정과목', '대변금액'], ...body]);
      numberFormat(ws, 1, body.length, [1, 3]);
      ws['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 28 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws, '일계표');
      name = `일계표_${fundLabel(applied.fundAccount)}_${applied.date}`;
    } else {
      const accts = monthly?.accounts ?? [];
      const h1 = ['월', ...accts.flatMap((a) => [a.name, '']), '합계', ''];
      const h2 = ['', ...accts.flatMap(() => ['차변', '대변']), '차변', '대변'];
      const body = [...(monthly?.months ?? []), ...monthPinned].map((r) => [
        r.month, ...accts.flatMap((a) => [r.cells[a.code]?.debit ?? 0, r.cells[a.code]?.credit ?? 0]), r.debit, r.credit]);
      const ws = XLSX.utils.aoa_to_sheet([h1, h2, ...body]);
      const amountCols = Array.from({ length: accts.length * 2 + 2 }, (_, i) => i + 1);
      numberFormat(ws, 2, body.length, amountCols);
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
        ...Array.from({ length: accts.length + 1 }, (_, i) => ({ s: { r: 0, c: 1 + i * 2 }, e: { r: 0, c: 2 + i * 2 } }))];
      ws['!cols'] = [{ wch: 20 }, ...amountCols.map(() => ({ wch: 16 }))];
      XLSX.utils.book_append_sheet(wb, ws, '월계표');
      name = `월계표_${applied.fundAccount[0]}_${applied.from}_${applied.to}`;
    }
    XLSX.writeFile(wb, `${name}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  /* E07 인쇄 = 그리드만(printGrid) · E06 ⌥D — 상세필터가 열린 동안 끈다(회계 가드 ①) */
  /* 조회 불가(blocked) 상태면 내보내기와 같이 막는다 — 빈 그리드·오류 문구를 인쇄하지 않게 */
  /* 조회 불가(월계표 계정구분 미선택 등)면 내보내기처럼 막는다 — 그 외엔 그리드만 인쇄(print_grid_guard: ⌘P 콜백 → printGrid) */
  const printIfReady = () => { if (blocked) { toast.error(blocked); return; } printGrid(); };
  useHotkey(HOTKEYS.print.combo, printIfReady, { enabled: !filterOpen, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !filterOpen, skipInDialog: true });

  /* 적용 칩 — 기준일·기간은 필수라 ✕ 없음, 월계표 계정구분도 필수라 ✕ 없음 */
  const chips: AppliedFilter[] = tab === 'daily'
    ? [
      { label: '계정구분', value: multiSelectSummary(FUND_ACCOUNTS.filter((f) => applied.fundAccount.includes(f)), '전체'), onClear: applied.fundAccount.length ? () => patch({ fundAccount: [] }) : undefined },
      { label: '기준일', value: applied.date },
      ...flagChips(applied, base, patchCond),
    ]
    : [
      ...(applied.fundAccount[0] ? [{ label: '계정구분', value: applied.fundAccount[0] }] : []),
      { label: '기간', value: `${applied.from || '…'} ~ ${applied.to || '…'}` },
      ...flagChips(applied, base, patchCond),
    ];

  const count = tab === 'daily' ? dayRows.filter((r) => r.kind === 'line').length : (monthly?.months.length ?? 0);

  return (
    <GridFrame
      crumbs={['홈', '회계', '장부조회', '일/월계표']}
      title="일/월계표"
      favRoute="acct-daily-monthly"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={chips}
      toolbarRight={<>
        <span className="text-caption" style={{ fontSize: 12 }}>단위: 원</span>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{`총 ${String(count)}건 중 ${String(count)}건 표시`}</span>}
      footerRight={<FooterActions onExport={exportExcel} onPrint={printIfReady} />}>

      <TabBar tabs={TABS} value={tab} onChange={changeTab} idBase={idBase} label="일/월계표 구분" />
      <TabPanel idBase={idBase} value={tab}>
        {tab === 'daily' ? (
          <AgGridReact<DayRow>
            key="daily"
            theme={apfsTheme}
            rowData={dayRows}
            columnDefs={DAY_COLUMNS}
            defaultColDef={COL_DEF}
            getRowId={(p) => p.data.id}
            getRowStyle={dayRowStyle}
            pinnedBottomRowData={dayPinned}
            domLayout="autoHeight"
            overlayNoRowsTemplate={blocked ?? MSG.empty}
          />
        ) : (
          <AgGridReact<MonthRow>
            key="monthly"
            theme={apfsTheme}
            rowData={monthly?.months ?? []}
            columnDefs={monthCols}
            defaultColDef={COL_DEF}
            getRowId={(p) => p.data.month}
            pinnedBottomRowData={monthPinned}
            domLayout="autoHeight"
            overlayNoRowsTemplate={blocked ?? MSG.empty}
          />
        )}
      </TabPanel>

      {/* ── 상세필터(E01) — 현재 탭 조건. 바꾸는 즉시 applied 반영([필터 적용] = 닫기) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">{`${TAB_LABEL[tab]} 조회 조건`}</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {tab === 'daily' ? (
              <>
                <DrawerField label="계정구분" plain>
                  <DrawerMultiSelect value={applied.fundAccount} onChange={setD('fundAccount')} options={[...FUND_ACCOUNTS]} ariaLabel="계정구분" />
                </DrawerField>
                <DayField label="기준일" required value={applied.date} onChange={setD('date')} errMsg={errField === 'date' ? MSG.dateRequired : undefined} />
              </>
            ) : (
              <>
                <DrawerField label="계정구분" required errMsg={errField === 'fund' ? MSG.fundRequired : undefined}>
                  <DrawerSelect value={applied.fundAccount[0] ?? ''} onChange={(v) => setD('fundAccount')(v ? [v] : [])} options={[...FUND_ACCOUNTS]} all="선택" ariaLabel="계정구분" />
                </DrawerField>
                <DayRangeField label="기간" required from={applied.from} to={applied.to} onFrom={setD('from')} onTo={setD('to')}
                  errMsg={errField === 'period' ? (blocked ?? undefined) : undefined} />
              </>
            )}
            <FlagCheck label="미결재포함" value={applied.includeUnapproved} onChange={setD('includeUnapproved')} />
            <FlagCheck label="모든계정포함" value={applied.includeAll} onChange={setD('includeAll')} />
            <FlagCheck label="결산전표포함" value={applied.includeClosing} onChange={setD('includeClosing')} />
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={resetApplied}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </GridFrame>
  );
}
