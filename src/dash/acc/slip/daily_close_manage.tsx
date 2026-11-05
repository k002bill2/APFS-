/* 일마감(ACC-007) — 회계 > 전표관리 > 일마감, route `acct-daily-close`. 요구사항 SFR-016-06 / SFR-018-01.
   출처: ACC-007 화면설계서 v1.0(slide 9 개요 · 10~16 화면·모달 · 18~27 이벤트 E00~E12) → APFS 디자인시스템(같은 중분류 suspense_manage 골격).

   구성(설계서 → 우리 규약)
   - 제목 "일마감"(메뉴 리프 라벨) · KPI 배지 행 미포함 · 상세필터 없음(설계서 구성3 — 툴바 조건 3개).
   - 툴바 좌: 계정구분 *(select, '전체' 없음 — 미선택 상태가 없다) · 회기 기수(select) · 년월 ‹ [PeriodPicker month] › [오늘]
     (주간 뷰는 ‹ MM.DD ~ MM.DD › [오늘]). 회기 기간 밖으로는 ‹ › 비활성.
     계정구분 이름이 길어(최대 15자) 필수 칩(closing_form_manage 선례)으로 두면 회기·년월 컨트롤과 한 줄에 못 들어가 select 로 뒀다.
   - 툴바 우: [기간 일괄 마감] · [마감이력] · ⟳ 조회(맨 끝). 1100px 이하에선 두 버튼이 아이콘만(라벨은 sr-only) — 툴바가 한 줄이라 조건이 잘린다.
   - 뷰 전환 [월간|주간|목록](SegTabs — 설계서의 보기 방식이다. 폐기된 '리스트|카드뷰' 토글과 다르다)은 설계서의 툴바 대신 본문 머리(범례 줄) 우측.
     툴바에 두면 768px 대에서 툴바 좌측(조회 조건)이 0폭으로 눌려 사라졌다(실측) — 설계서와 다른 점.
   - 월간 = 7열 캘린더(daily_close_calendar — 기존 schedule CalendarView 는 재사용 불가, 사유는 그 파일 머리 주석) · 주간 = 7열 보드 · 목록 = AG Grid 11열.
   - 목록: 체크박스는 마감 행만(E08) → 선택 바 "N건 선택됨 · [마감 취소] · [선택 해제]"(E09) · 더블클릭/Enter = 상태별 모달(E07).
   - 모달 4종 + 확인창: 일마감 처리(13p) · 일마감 상세/취소(14p) · 기간 일괄 마감(15p) · 일마감 처리이력(16p) · 마감 취소 확인.
   - 하단: 월/주 집계 문장(목록은 "총 N건 중 N건 표시") + 푸터 새 창·내보내기·인쇄(⌥D·⌘P — 모달이 열린 동안 끔).
   결정·가정
   - 회기·영업일/휴일·전표 집계(SFR-016-04/05)는 daily_close_data 데모 값. 마감 원장 키 = 계정구분+마감일자(일자는 회기 하나에만 속한다).
   - "계정구분을 선택해 주세요."(E02·13p 0·15p 0)는 select 에 빈 값이 없어 화면에서 도달하지 않는다(검증 함수에는 남김).
   - 마감 일자 전표 등록 차단(SFR-016-15)은 ACC-003 수정이 필요해 이 화면 범위 밖 — 미구현.
   - 권한(등록·수정·삭제 / 인쇄·다운로드)별 노출은 RBAC 미구현이라 항상 노출.
   - 오늘(today)은 마운트 시점에 고정한다(데모). 자정을 넘겨 화면을 열어 두면 진행중/예정 판정·미래 일자 차단·일괄 마감 상한이
     전날 기준으로 남는다(처리일시 nowStamp 는 실시간) — 다시 진입하면 맞춰진다.
   - [비고 저장]은 값이 그대로여도 '저장되었습니다.'(14p 에 '변경 없음' 문구가 없다) — 이력만 남기지 않는다.
   - 설계서와 다른 점(PM 확인 대기): 뷰 전환 위치(툴바 → 본문 머리) · 계정구분 select(칩 아님) · 회기 글자 라벨 생략 ·
     1100px 이하 [기간 일괄 마감]·[마감이력] 아이콘화. */
import '../../aggrid_shared.css';
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, AUTO_SIZE_CONTENT } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection } from '../../aggrid_selection';
import { controlMinWidth } from '../../schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, CellStyle, RowSelectionOptions, SelectionChangedEvent, RowDoubleClickedEvent, CellKeyDownEvent } from 'ag-grid-community';
import { PeriodPicker } from '../../ui/period-picker';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { DrawerSelect } from '../../drawer_select';
import { FUND_ACCOUNTS, CURRENT_USER, todayStr } from './general_journal_data';
import type { FundAccount } from './general_journal_data';
import { demoDailyClose, termLabel, termShort } from './daily_close_data';
import type { Closing, HistoryEntry } from './daily_close_data';
import {
  CANCEL_MSG, CLOSE_MSG, DOW, REMARK_SAVED, TODAY_OUT_OF_TERM,
  bulkDefault, bulkPreview, canShift, clampToTerm, closeChecks, commitCancel, commitClose, commitRemark, currentTerm, dayInfo, inTerm, isClickable,
  monthDates, monthGrid, nowStamp, shiftAnchor, summarize, summaryText, termsOf, validateBulk, validateCancel, validateClose, weekDates, weekLabel,
} from './daily_close_model';
import type { CloseChecks, DayInfo, DayStatus, ViewMode } from './daily_close_model';
import { ViewBar, MonthCalendar, StatusTag, WeekBoard } from './daily_close_calendar';
import { DailyCloseProcessModal } from './daily_close_process_modal';
import { DailyCloseDetailModal } from './daily_close_detail_modal';
import { DailyCloseBulkModal } from './daily_close_bulk_modal';
import { DailyCloseHistoryModal } from './daily_close_history_modal';
import { CancelConfirmDialog } from './daily_close_cancel_dialog';

const { Button, IconBtn, SegTabs } = UI;

const VIEWS = [{ value: 'month', label: '월간' }, { value: 'week', label: '주간' }, { value: 'list', label: '목록' }];

/* ── 목록 뷰 그리드 — 설계서 11컬럼(체크박스 포함). 건수만 우측, 나머지 좌측 ── */
interface ListRow {
  id: string;              // 계정구분|마감일자
  account: string;
  date: string;
  dow: string;
  dayKind: '영업일' | '휴일';
  status: DayStatus;
  approved: number | null;   // 예정 일자 = null('-')
  unapproved: number | null;
  closedBy: string;
  closedAt: string;        // 'YYYY-MM-DD HH:mm'
  remark: string;
}
const toRow = (account: string, d: DayInfo): ListRow => ({
  id: `${account}|${d.date}`, account, date: d.date, dow: DOW[d.dow], dayKind: d.holiday ? '휴일' : '영업일', status: d.status,
  approved: d.status === '예정' ? null : d.approved, unapproved: d.status === '예정' ? null : d.unapproved,
  closedBy: d.closing?.closedBy ?? '', closedAt: d.closing ? d.closing.closedAt.slice(0, 16) : '', remark: d.closing?.remark ?? '',
});

const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
/* display:flex 셀은 AG Grid 기본 말줄임이 안 걸린다 → 긴 텍스트는 truncate span */
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const statusCell = (p: { value: DayStatus }) => (p.value ? <StatusTag status={p.value} size="lg" /> : null);
const countFmt = (p: { value: number | null }) => (p.value == null ? '-' : String(p.value));
const unapprovedStyle = (p: { value: number | null }) => ({ fontVariantNumeric: 'tabular-nums', ...(p.value ? { color: 'var(--danger-text)', fontWeight: 700 } : null) });

const COLUMNS: ColDef<ListRow>[] = [
  { field: 'account', headerName: '계정구분', maxWidth: 220, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'date', headerName: '마감일자', cellStyle: tabNum },
  { field: 'dow', headerName: '요일' },
  { field: 'dayKind', headerName: '영업일구분', cellStyle: (p) => (p.value === '휴일' ? { color: 'var(--danger-text)' } : null) },
  { field: 'status', headerName: '마감상태', cellStyle: flexCenter, cellRenderer: statusCell },
  { field: 'approved', headerName: '승인전표', type: 'rightAligned', cellStyle: tabNum, valueFormatter: countFmt },
  { field: 'unapproved', headerName: '미승인전표', type: 'rightAligned', cellStyle: unapprovedStyle as any, valueFormatter: countFmt },
  { field: 'closedBy', headerName: '마감자' },
  { field: 'closedAt', headerName: '마감일시', cellStyle: tabNum },
  /* 비고 = 잔여폭 흡수 컬럼(apfs-aggrid PR #362) — suppressAutoSize 가 없으면 fitCellContents 가 flex 폭을 덮어쓴다 */
  { field: 'remark', headerName: '비고', flex: 1, minWidth: 180, width: 180, suppressAutoSize: true, cellStyle: flexCenter, cellRenderer: textCell },
];

/* 다중 선택 — 체크박스로만, 마감 행만 선택 가능(E08). 모듈 상수(참조 안정) */
const ROW_SELECTION: RowSelectionOptions<ListRow> = {
  mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false,
  isRowSelectable: (n) => n.data?.status === '마감',
};

/* 엑셀 — 월간·주간 = 일자별 마감 현황, 목록 = 그리드 컬럼(같은 컬럼 구성). 건수만 숫자 셀 */
type XCol = { header: string; get: (r: ListRow) => string | number; wch?: number };
const EXPORT_COLS: XCol[] = [
  { header: '계정구분', get: (r) => r.account, wch: 26 }, { header: '마감일자', get: (r) => r.date }, { header: '요일', get: (r) => r.dow, wch: 6 },
  { header: '영업일구분', get: (r) => r.dayKind }, { header: '마감상태', get: (r) => r.status },
  { header: '승인전표', get: (r) => r.approved ?? '' }, { header: '미승인전표', get: (r) => r.unapproved ?? '' },
  { header: '마감자', get: (r) => r.closedBy }, { header: '마감일시', get: (r) => r.closedAt, wch: 18 }, { header: '비고', get: (r) => r.remark, wch: 30 },
];

/* ‹ › 아이콘 전용 버튼 — 툴바 한 줄(1440 기준)에 맞추려 좌우 패딩만 줄인다 */
const NAV_BTN: React.CSSProperties = { paddingLeft: 8, paddingRight: 8 };
const monthWrap: React.CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('month'), maxWidth: '100%' };
const fromButton = (ev: Event | null | undefined) => !!(ev?.target as Element | null)?.closest?.('button');

type ModalState = null
  | { kind: 'process'; info: DayInfo; checks: CloseChecks }   // 열 때 스냅샷(반영 후 exit 동안 내용 유지)
  | { kind: 'detail'; info: DayInfo }
  | { kind: 'bulk'; initial: [string, string] }
  | { kind: 'history' }
  | { kind: 'listCancel'; dates: string[] };

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function DailyCloseManage({ onNav }: { onNav?: (r: string) => void }) {
  const today = useMemo(() => todayStr(), []);
  const seed = useMemo(() => demoDailyClose(today), [today]);
  const terms = seed.terms;

  /* E00 진입 — 계정구분 = 목록 첫 항목 · 회기 = 현재 회기 · 년월 = 당월 · 월간 */
  const [account, setAccount] = useState<FundAccount>(FUND_ACCOUNTS[0]);
  const [termId, setTermId] = useState(() => currentTerm(terms, FUND_ACCOUNTS[0], today)?.id ?? '');
  const term = terms.find((t) => t.id === termId) ?? terms[0];
  const [anchor, setAnchor] = useState(today);   // 기준일 — 월간 = 그 달, 주간 = 그 주(뷰 전환 시 유지)
  const [view, setView] = useState<ViewMode>('month');
  const ym = anchor.slice(0, 7);

  const [closings, setClosings] = useState<Record<string, Closing>>(seed.closings);
  const closingsRef = useRef(closings); closingsRef.current = closings;
  const [history, setHistory] = useState<HistoryEntry[]>(seed.history);
  const [modal, setModal] = useState<ModalState>(null);

  const apiRef = useRef<GridApi<ListRow> | null>(null);
  const [selIds, setSelIds] = useState<string[]>([]);
  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  const clearSel = useCallback(() => { selIdsRef.current = []; setSelIds([]); apiRef.current?.deselectAll(); }, []);

  /* 모달이 열린 동안 뒤 화면 인쇄·내보내기를 끈다(상세필터가 없는 화면 — 가드 ①의 !filterOpen 해당 없음) */
  const listKeys = modal === null;
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: listKeys, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: listKeys, skipInDialog: true });

  /* ── 조회 결과(선택 조건으로 파생) ── */
  const monthDays = useMemo(() => monthDates(ym).map((d) => dayInfo(account, d, today, closings)), [ym, account, today, closings]);
  const weekDays = useMemo(() => weekDates(anchor).map((d) => dayInfo(account, d, today, closings)), [anchor, account, today, closings]);
  const dayMap = useMemo(() => Object.fromEntries([...monthDays, ...weekDays].map((d) => [d.date, d])), [monthDays, weekDays]);
  const rows = useMemo(() => monthDays.map((d) => toRow(account, d)), [monthDays, account]);
  const weekInTerm = weekDays.filter((d) => inTerm(term, d.date));

  /* 조건(계정구분·회기·년월/주·뷰)이 바뀌면 선택 해제 */
  useEffect(() => { clearSel(); }, [account, termId, ym, view, clearSel]);

  const apply = (r: { closings: Record<string, Closing>; logs?: HistoryEntry[]; log?: HistoryEntry }) => {
    closingsRef.current = r.closings;
    setClosings(r.closings);
    const logs = r.logs ?? (r.log ? [r.log] : []);
    if (logs.length) setHistory((h) => [...logs, ...h]);
  };
  const actor = () => ({ user: CURRENT_USER, at: nowStamp() });

  /* ── E01 조회 조건 ── */
  const changeAccount = (v: string) => {
    const acc = v as FundAccount;
    const t = currentTerm(terms, acc, today);
    setAccount(acc);
    if (t) { setTermId(t.id); setAnchor((a) => clampToTerm(t, a)); }   // 회기 목록 갱신 → 현재 회기 · 년월 유지
  };
  const changeTerm = (id: string) => {
    const t = terms.find((x) => x.id === id);
    if (!t) return;
    setTermId(id);
    setAnchor(inTerm(t, today) && today.slice(0, 7) === t.start.slice(0, 7) ? today : t.start);   // 년월 = 회기 시작월
  };
  const pickMonth = (v: string) => {
    if (!v) return;   // 같은 달 재클릭 = 해제 — 년월은 항상 하나
    const next = today.slice(0, 7) === v ? today : `${v}-01`;
    if (!inTerm(term, next)) { toast.error('회기 기간 밖의 년월은 선택할 수 없습니다.'); return; }
    setAnchor(next);
  };
  const shift = (dir: -1 | 1) => setAnchor((a) => shiftAnchor(view, a, term, dir, today));
  /* [오늘] = 오늘이 속한 회기로 기수까지 바꾸고 오늘로 이동(2026-11-03 사용자 지시). 그 계정에 오늘을 품은 회기가 없을 때만 안내 */
  const goToday = () => {
    const t = terms.find((x) => x.account === account && inTerm(x, today));
    if (!t) { toast.error(TODAY_OUT_OF_TERM); return; }
    setTermId(t.id);
    setAnchor(today);
  };
  /* E02 조회 — 현재 조건으로 재조회(로컬 상태가 곧 원장) */
  const refresh = () => { clearSel(); toast.success('조회되었습니다'); };

  /* ── E04·E05·E07 일자 열기 — 마감 = 상세/취소, 미마감·진행중 = 처리, 예정 = 무반응 ── */
  const openDay = useCallback((d: DayInfo) => {
    if (!isClickable(d)) return;
    if (!inTerm(term, d.date)) { toast.error(CLOSE_MSG.term); return; }
    if (d.status === '마감') setModal({ kind: 'detail', info: d });
    else setModal({ kind: 'process', info: d, checks: closeChecks(terms, d, account, closingsRef.current) });
  }, [term, terms, account]);
  const openRow = useCallback((r: ListRow) => openDay(dayInfo(account, r.date, today, closingsRef.current)), [openDay, account, today]);

  /* ── 목록 그리드 이벤트 ── */
  const onGridReady = useCallback((e: GridReadyEvent<ListRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<ListRow>) => { setSelIds(e.api.getSelectedRows().map((r) => r.id)); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<ListRow> }) => { restoreSelection(e.api, selIdsRef.current); }, []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<ListRow>) => {
    if (!e.data || e.rowPinned || fromButton(e.event as Event | null)) return;
    openRow(e.data);
  }, [openRow]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<ListRow>) => {
    const ev = e.event as KeyboardEvent | null;
    if (ev?.key !== 'Enter' || !e.data || fromButton(ev)) return;
    openRow(e.data);
  }, [openRow]);

  /* ── E09 목록 [마감 취소] — 역순·연속·년마감 판정 → 확인창(사유) ── */
  const askListCancel = () => {
    const dates = rows.filter((r) => selIds.includes(r.id)).map((r) => r.date);
    const c = validateCancel({ account, dates, terms, closings, reason: null });
    if (c.ok === false) { toast.error(c.message); return; }
    setModal({ kind: 'listCancel', dates });
  };
  const doCancel = (dates: readonly string[], reason: string) => {
    apply(commitCancel(closingsRef.current, terms, account, dates, reason, actor()));
    clearSel();
    toast.success(CANCEL_MSG.success);
  };

  /* E06 점검 결과 — 참조 안정(모달 rows memo 가 매 렌더 무효화되지 않게) */
  const bulkPlanFor = useCallback((f: string, t: string) => bulkPreview(term, terms, account, f, t, today, closings), [term, terms, account, today, closings]);

  /* ── E10·E11 내보내기 — 월간: 당월 일자별 현황 · 주간: 그 주(회기 안) · 목록: 그리드 컬럼 ── */
  const exportExcel = () => {
    const src = view === 'week' ? weekInTerm.map((d) => toRow(account, d)) : rows;
    const head = EXPORT_COLS.map((c) => c.header);
    const body = src.map((r) => EXPORT_COLS.map((c) => c.get(r)));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    [5, 6].forEach((ci) => body.forEach((row, ri) => {
      const cell = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
      if (cell && typeof row[ci] === 'number') { cell.t = 'n'; cell.z = '#,##0'; }
    }));
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.wch ?? 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '일마감');
    XLSX.writeFile(wb, '일마감.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const summary = view === 'week'
    ? `${account} · ${termShort(term)} · ${weekDays[0].date.replace(/-/g, '.')} ~ ${weekDays[6].date.slice(5).replace('-', '.')} · ${summaryText(summarize(weekInTerm))}`
    : `${account} · ${termShort(term)} · ${ym} · ${summaryText(summarize(monthDays))}`;

  const selCount = selIds.length;
  const selActions = view === 'list' && selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      <Button variant="outline" size="sm" leadingIcon="x" onClick={askListCancel}>마감 취소</Button>
      <Button variant="ghost" size="sm" onClick={clearSel}>선택 해제</Button>
    </>
  ) : null;

  const termOptions = termsOf(terms, account).map((t) => ({ value: t.id, label: termLabel(t) }));
  const navUnit = view === 'week' ? '주' : '달';
  const toolbarLeft = selActions ? null : (
    <div className="flex items-center gap-x-2 gap-y-1 flex-wrap min-w-0" style={{ padding: '3px 0', whiteSpace: 'normal' }}>
      <span className="inline-flex items-center gap-1.5">
        <span className="font-semibold text-muted-foreground" style={{ fontSize: 12.5 }}>계정구분<span aria-hidden="true" className="text-foreground"> *</span></span>
        <DrawerSelect value={account} onChange={changeAccount} options={FUND_ACCOUNTS} noAll ariaLabel="계정구분(필수)" />
      </span>
      <DrawerSelect value={termId} onChange={changeTerm} options={termOptions} noAll ariaLabel="회기 기수" />
      <span className="inline-flex items-center gap-1">
        <Button variant="ghost" size="sm" leadingIcon="chevron-left" style={NAV_BTN} disabled={!canShift(view, anchor, term, -1)} onClick={() => shift(-1)}><span className="sr-only">이전 {navUnit}</span></Button>
        {view === 'week'
          ? <span className="font-semibold tabular-nums" style={{ fontSize: 13.5, minWidth: 110, textAlign: 'center' }} aria-live="polite">{weekLabel(anchor)}</span>
          : <div style={monthWrap}><PeriodPicker mode="month" value={ym} onChange={pickMonth} ariaLabel="년월" yearRange={[term.year, term.year]} /></div>}
        <Button variant="ghost" size="sm" leadingIcon="chevron-right" style={NAV_BTN} disabled={!canShift(view, anchor, term, 1)} onClick={() => shift(1)}><span className="sr-only">다음 {navUnit}</span></Button>
        <Button variant="outline" size="sm" onClick={goToday}>오늘</Button>
      </span>
    </div>
  );

  return (
    <GridFrame
      crumbs={['홈', '회계', '전표관리', '일마감']}
      title="일마감"
      favRoute="acct-daily-close"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      contextActions={selActions}
      toolbarLeft={toolbarLeft}
      toolbarRight={<>
        <Button variant="outline" size="sm" leadingIcon="calendar" onClick={() => setModal({ kind: 'bulk', initial: bulkDefault(term, today, closingsRef.current) })}><span className="max-[1100px]:sr-only">기간 일괄 마감</span></Button>
        <Button variant="outline" size="sm" leadingIcon="history" onClick={() => setModal({ kind: 'history' })}><span className="max-[1100px]:sr-only">마감이력</span></Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{view === 'list' ? `총 ${String(rows.length)}건 중 ${String(rows.length)}건 표시` : summary}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      <ViewBar legend={view !== 'list'}><SegTabs size="sm" options={VIEWS} value={view} onChange={(v: ViewMode) => setView(v)} /></ViewBar>
      {view === 'month' && <MonthCalendar grid={monthGrid(ym)} days={dayMap} today={today} onOpen={openDay} />}
      {view === 'week' && <WeekBoard dates={weekDays.map((d) => d.date)} days={dayMap} inTermDate={(d) => inTerm(term, d)} today={today} onOpen={openDay} />}
      {view === 'list' && (
        <div>
          <AgGridReact<ListRow>
            theme={apfsTheme}
            rowData={rows}
            columnDefs={COLUMNS}
            getRowId={(p) => p.data.id}
            domLayout="autoHeight"
            defaultColDef={DEFAULT_COL_DEF}
            autoSizeStrategy={AUTO_SIZE_CONTENT}
            rowSelection={ROW_SELECTION}
            selectionColumnDef={SELECTION_COL}
            onGridReady={onGridReady}
            onGridPreDestroyed={() => { apiRef.current = null; }}
            onSelectionChanged={onSelectionChanged}
            onRowDataUpdated={onRowDataUpdated}
            onRowDoubleClicked={onRowDoubleClicked}
            onCellKeyDown={onCellKeyDown}
            overlayNoRowsTemplate="조회 조건에 해당하는 일자가 없습니다."
          />
        </div>
      )}

      {/* ── E04 일마감 처리 ── */}
      {modal?.kind === 'process' && (
        <DailyCloseProcessModal info={modal.info} account={account} termLabel={termLabel(term)} checks={modal.checks}
          validate={(remark) => validateClose({ account, term, date: modal.info.date, today, terms, closings: closingsRef.current, remark })}
          onSave={(remark) => { apply(commitClose(closingsRef.current, term, [modal.info.date], remark, actor())); toast.success(CLOSE_MSG.success); }}
          onAbort={(c) => { toast.error(c.message); if (c.code === 'closed') refresh(); }}
          onClose={() => setModal(null)} />
      )}

      {/* ── E05 일마감 상세/취소 ── */}
      {modal?.kind === 'detail' && (
        <DailyCloseDetailModal info={modal.info} account={account} termLabel={termLabel(term)}
          onSaveRemark={(remark) => {
            const r = commitRemark(closingsRef.current, term, modal.info.date, remark, actor());
            if (r) apply(r);   // 변경 없음 = 이력 생략, 안내는 같게
            toast.success(REMARK_SAVED);
          }}
          validateCancel={(reason) => validateCancel({ account, dates: [modal.info.date], terms, closings: closingsRef.current, reason })}
          onCancel={(reason) => doCancel([modal.info.date], reason)}
          onClose={() => setModal(null)} />
      )}

      {/* ── E06 기간 일괄 마감 ── */}
      {modal?.kind === 'bulk' && (
        <DailyCloseBulkModal account={account} termLabel={termLabel(term)} initial={modal.initial}
          plan={bulkPlanFor}
          validate={(f, t, remark) => validateBulk({ account, term, from: f, to: t, today, terms, closings: closingsRef.current, remark })}
          onSave={(dates, remark, message) => { apply(commitClose(closingsRef.current, term, dates, remark, actor())); toast.success(message); }}
          onAbort={(m) => toast.error(m)} onInfo={(m) => toast.info(m)}
          onClose={() => setModal(null)} />
      )}

      {/* ── E12 일마감 처리이력 ── */}
      {modal?.kind === 'history' && <DailyCloseHistoryModal log={history} account={account} today={today} onClose={() => setModal(null)} />}

      {/* ── E09 목록 마감 취소 확인(사유 입력) — [취소]/✕ 는 선택 유지 ── */}
      {modal?.kind === 'listCancel' && (
        <CancelConfirmDialog account={account} dates={modal.dates} withReason
          onConfirm={(reason) => doCancel(modal.dates, reason)} onClose={() => setModal(null)} />
      )}
    </GridFrame>
  );
}
