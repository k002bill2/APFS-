/* 연동 모니터링 — 조회 전용 2탭 리스트 페이지 (관리자 > 외부연동 > 연동 모니터링, route integration-monitor, 화면ID ADM-005).
   출처: `연동 모니터링.html`(관리자(ADM) · 외부연동 · KRDS TO-BE) → APFS 디자인시스템으로 변형.
   데이터 `integration_monitor_data.ts`(목업 리터럴) · 규칙 `integration_monitor_model.ts`(+test) · 컬럼·엑셀 `integration_monitor_columns.tsx`
   · 상세 팝업 `integration_detail_modal.tsx` · 배지 `integration_badges.tsx`. 이 파일은 배선만 한다.

   목업 → 우리 규약
   - `.tabsw` 탭 2개(송수신이력 / 연계처리이력) → `TabBar`·`TabPanel`(risk_page_kit — WAI-ARIA Tabs, ←/→·Home/End).
     본문 첫머리에 두고 **활성 탭 그리드만 마운트**(숨은 패널의 AG Grid 는 폭 0 으로 초기화된다). 탭마다 필터 state 를 따로 두고
     탭을 바꿔도 각자 유지한다(목업 `activeT`·`activeP` 동형). 툴바 칩·적용 칩·드로어·푸터 건수·엑셀은 전부 활성 탭 것.
   - 송수신이력 검색박스(연계기관·연계방식·송수신·응답코드·요청기간) → 주 필터 = 응답코드 FilterChip(`응답코드: 전체`·성공·오류, facet 건수)
     + 상세필터 드로어(연계기관·연계방식·송수신·요청기간(PeriodPicker day ×2)).
   - 연계처리이력 검색박스(대상테이블·처리상태·발생기간) → 주 필터 = 처리상태 FilterChip(`처리상태: 전체`+5상태, facet 건수)
     + 상세필터 드로어(대상테이블·발생기간).
   - 목업 [조회]·[엑셀] 버튼 → 필터 즉시 반영 · 툴바 ⟳ 조회(활성 탭 필터를 기본값으로) · 엑셀은 푸터 내보내기 아이콘 + ⌥D(활성 탭 화면 행).
   - 송수신이력 행 클릭 → 더블클릭 / Enter / 우클릭 '상세' → 송수신이력 상세 팝업(요청·응답 kv · 연계처리이력 · 연계첨부파일).
     팝업 안 원연계일련번호 링크 = 재전송 건의 최초 건으로 바로 이동(목업 동작).
   - 연계처리이력 연계일련번호 링크 → 송수신이력 탭으로 바꾸고 그 건 상세를 연다(목업 `selectTab('trsm');openDetail(sn)`).
     같은 동작을 행 더블클릭 / Enter / 우클릭 '송수신이력 상세' 에도 건다(목업엔 처리이력 행 단위 진입이 없어 추가 — 다른 점에 기록).
   - 목업 GNB/LNB·출처시스템 메뉴·설계 메모는 옮기지 않는다(셸 소유). KPI 배지 행 미포함(사용자 결정) · 카드뷰 없음 · 합계행 없음.

   결정·가정
   - 주 필터 선택 근거: 모니터링 화면의 첫 질문은 "무엇이 실패했나"다 — 송수신은 응답코드(성공/오류) 2값, 처리이력은 처리상태(5값)가
     그 질문에 바로 답하고 값 수도 칩에 맞다. 나머지 항목(기관·방식·방향·테이블·기간)은 범위 좁히기라 드로어로 보낸다.
   - **재처리(Retry) 수동 버튼은 만들지 않는다** — 설계 메모는 "건별/선택 재처리 버튼"이지만 목업 표 caption 은 "재처리는 자동 재전송
     이력으로만 표시(수동 트리거 없음)"이고 스크립트도 횟수 열(`N회`)만 그린다 → 스크립트(실제 동작)를 따른다. 그래서 두 탭 모두
     조회 전용이고 `rowSelection` 을 두지 않는다(선택이 만드는 액션이 없다 — apfs-aggrid "조회 전용").
   - 배지 톤: 처리상태·응답코드는 목업 tag 색(g/b/a/d/n)을 success/info/warning/danger/muted 로 1:1(model `STTS_TONE`·`cdTone`).
     송수신은 목업 수신 파랑·송신 초록이지만 초록이 '성공'과 겹쳐 송신 = primary. 연계기관은 목업 회색 tag 이나 정보가 없는 장식이라 평문.
   - 기간 기본값 2026-09-28 ~ 2026-10-28(목업 검색박스 초기값, 두 탭 같음) — 첫 진입부터 칩이 뜨고 ×=전 기간, [초기화]=기본값.
   - 검색어 입력 없음(목업 검색박스에 없다 — SEARCHABLE opt-in 규약).
   ⚠ 실제 외부연동 송수신·배치 반영 모니터링이 아니다 — 데모 행을 로컬로 조회만 한다. 연계기관·인터페이스ID·오류코드는 목업 예시값. */
import '../../aggrid_shared.css';
import { useState, useCallback, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import type { AppliedFilter, FilterChipItem } from '../../applied_filters';
import { apfsTheme, DEFAULT_COL_DEF, AUTO_SIZE_CONTENT, refreshNoColumn } from '../../aggrid_theme';
import { controlMinWidth } from '../../schemas/renderers';
import { PeriodPicker } from '../../ui/period-picker';
import { AgGridReact } from 'ag-grid-react';
import type { CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import { RowContextMenu } from '../../row_context_menu';
import type { CtxMenuState } from '../../row_context_menu';
import { DrawerSelect } from '../../drawer_select';   // 상세필터 select 공용본
import { TabBar, TabPanel } from '../../risk_page_kit';
import { TRSM, PRCS, INSTS, METHODS, DIRECTIONS, PRCS_STATUSES, TBLS, DEMO_RANGE } from './integration_monitor_data';
import type { TrsmRow, PrcsRow, PrcsStatus } from './integration_monitor_data';
import { filterTrsm, filterPrcs, cdCounts, sttsCounts, trsmBySn, CD_FILTERS, CD_LABEL } from './integration_monitor_model';
import type { CdFilter } from './integration_monitor_model';
import { TRSM_COLS, PRCS_COLS, exportTrsm, exportPrcs } from './integration_monitor_columns';
import type { PrcsGridCtx } from './integration_monitor_columns';
import { IntegrationDetailModal } from './integration_detail_modal';

const { Button, IconBtn } = UI;

type TabId = 'trsm' | 'prcs';
const TABS: { id: TabId; label: string }[] = [{ id: 'trsm', label: '송수신이력' }, { id: 'prcs', label: '연계처리이력' }];
const ID_BASE = 'intg';
const TRSM_TAB_ID = `${ID_BASE}-tab-trsm`;   // TabBar 버튼 id 규칙(`${idBase}-tab-${id}`)

/* 탭별 필터 — 상태 객체 하나씩(부분 갱신은 항상 새 객체) */
type TrsmF = { inst: string; mth: string; trrc: string; cd: CdFilter | ''; from: string; to: string };
type PrcsF = { tbl: string; stts: PrcsStatus | ''; from: string; to: string };
const TRSM_F0: TrsmF = Object.freeze({ inst: '', mth: '', trrc: '', cd: '', from: DEMO_RANGE[0], to: DEMO_RANGE[1] });
const PRCS_F0: PrcsF = Object.freeze({ tbl: '', stts: '', from: DEMO_RANGE[0], to: DEMO_RANGE[1] });

const CD_CHIPS = ['', ...CD_FILTERS] as const;
const STTS_CHIPS = ['', ...PRCS_STATUSES] as const;

const rangeText = (from: string, to: string) => (from || to ? `${from || '…'} ~ ${to || '…'}` : '');
const toApplied = (rows: [string, string, () => void][]): AppliedFilter[] => rows.map(([label, value, onClear]) => ({ label, value, onClear }));

/* plain=<div> 래퍼 — PeriodPicker(버튼 트리거)는 <label> 안에서 2회 토글되므로(apfs-datepicker) */
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

function DayRange({ label, from, to, onFrom, onTo }: { label: string; from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <DrawerField label={label} plain>
      <div className="flex items-center gap-2 flex-wrap">
        <div style={dayWrap}><PeriodPicker mode="day" value={from} onChange={onFrom} ariaLabel={`${label} 시작일`} /></div>
        <span className="text-caption">~</span>
        <div style={dayWrap}><PeriodPicker mode="day" value={to} onChange={onTo} ariaLabel={`${label} 종료일`} /></div>
      </div>
    </DrawerField>
  );
}

function TrsmFields({ f, set }: { f: TrsmF; set: (p: Partial<TrsmF>) => void }) {
  return (<>
    <DrawerField label="연계기관"><DrawerSelect value={f.inst} onChange={(v) => set({ inst: v })} options={INSTS} /></DrawerField>
    <DrawerField label="연계방식"><DrawerSelect value={f.mth} onChange={(v) => set({ mth: v })} options={METHODS} /></DrawerField>
    <DrawerField label="송수신"><DrawerSelect value={f.trrc} onChange={(v) => set({ trrc: v })} options={DIRECTIONS} /></DrawerField>
    <DayRange label="요청기간" from={f.from} to={f.to} onFrom={(v) => set({ from: v })} onTo={(v) => set({ to: v })} />
  </>);
}

function PrcsFields({ f, set }: { f: PrcsF; set: (p: Partial<PrcsF>) => void }) {
  return (<>
    <DrawerField label="대상테이블"><DrawerSelect value={f.tbl} onChange={(v) => set({ tbl: v })} options={TBLS} /></DrawerField>
    <DayRange label="발생기간" from={f.from} to={f.to} onFrom={(v) => set({ from: v })} onTo={(v) => set({ to: v })} />
  </>);
}

/* 송수신이력 탭 상태 — 화면 행 · 응답코드 칩(facet) · 적용 칩 */
function useTrsmTab() {
  const [f, setF] = useState<TrsmF>(TRSM_F0);
  const set = useCallback((p: Partial<TrsmF>) => setF((cur) => ({ ...cur, ...p })), []);
  const visible = useMemo(() => filterTrsm(TRSM, f), [f]);
  const facet = useMemo(() => filterTrsm(TRSM, { ...f, cd: '' }), [f]);   // 칩이 거는 응답코드만 뺀 모집단
  const counts = cdCounts(facet);
  const chips: FilterChipItem[] = CD_CHIPS.map((k) => ({
    key: k || 'all', label: k ? CD_LABEL[k] : '응답코드: 전체', count: String(k ? counts[k] : facet.length), active: f.cd === k, onSelect: () => set({ cd: k }),
  }));
  const applied = toApplied([
    ['요청기간', rangeText(f.from, f.to), () => set({ from: '', to: '' })],
    ['연계기관', f.inst, () => set({ inst: '' })],
    ['연계방식', f.mth, () => set({ mth: '' })],
    ['송수신', f.trrc, () => set({ trrc: '' })],
  ]);
  return { f, set, reset: () => setF(TRSM_F0), visible, chips, applied };
}

/* 연계처리이력 탭 상태 — 화면 행 · 처리상태 칩(facet) · 적용 칩 */
function usePrcsTab() {
  const [f, setF] = useState<PrcsF>(PRCS_F0);
  const set = useCallback((p: Partial<PrcsF>) => setF((cur) => ({ ...cur, ...p })), []);
  const visible = useMemo(() => filterPrcs(PRCS, f), [f]);
  const facet = useMemo(() => filterPrcs(PRCS, { ...f, stts: '' }), [f]);   // 칩이 거는 처리상태만 뺀 모집단
  const counts = sttsCounts(facet);
  const chips: FilterChipItem[] = STTS_CHIPS.map((s) => ({
    key: s || 'all', label: s || '처리상태: 전체', count: String(s ? counts[s] : facet.length), active: f.stts === s, onSelect: () => set({ stts: s }),
  }));
  const applied = toApplied([
    ['발생기간', rangeText(f.from, f.to), () => set({ from: '', to: '' })],
    ['대상테이블', f.tbl, () => set({ tbl: '' })],
  ]);
  return { f, set, reset: () => setF(PRCS_F0), visible, chips, applied };
}

type Detail = { sn: number; fromPrcs: boolean };

/* 그리드 상세 진입 3경로(더블클릭 · Enter · 우클릭) — 탭별 핸들러 */
function useGridEntry(openTrsm: (sn: number) => void, openLinked: (sn: number) => void, exportExcel: () => void, setCtx: (s: CtxMenuState) => void) {
  const trsmDbl = useCallback((e: RowDoubleClickedEvent<TrsmRow>) => { if (e.data && !e.rowPinned) openTrsm(e.data.sn); }, [openTrsm]);
  const prcsDbl = useCallback((e: RowDoubleClickedEvent<PrcsRow>) => { if (e.data && !e.rowPinned) openLinked(e.data.linkSn); }, [openLinked]);
  const trsmKey = useCallback((e: CellKeyDownEvent<TrsmRow>) => {
    if ((e.event as KeyboardEvent | null)?.key === 'Enter' && e.data && !e.rowPinned) openTrsm(e.data.sn);
  }, [openTrsm]);
  const prcsKey = useCallback((e: CellKeyDownEvent<PrcsRow>) => {
    if ((e.event as KeyboardEvent | null)?.key === 'Enter' && e.data && !e.rowPinned) openLinked(e.data.linkSn);
  }, [openLinked]);
  const menu = (e: CellContextMenuEvent<any>, label: string, open: () => void) => {
    const ev = e.event as MouseEvent | undefined;
    ev?.preventDefault();
    if (!e.data || e.rowPinned || !ev) return;
    setCtx({ x: ev.clientX, y: ev.clientY, items: [
      { label, icon: 'eye', onSelect: open },
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
    ] });
  };
  const trsmMenu = (e: CellContextMenuEvent<TrsmRow>) => menu(e, '상세', () => e.data && openTrsm(e.data.sn));
  const prcsMenu = (e: CellContextMenuEvent<PrcsRow>) => menu(e, '송수신이력 상세', () => e.data && openLinked(e.data.linkSn));
  return { trsmDbl, prcsDbl, trsmKey, prcsKey, trsmMenu, prcsMenu };
}
type GridEntry = ReturnType<typeof useGridEntry>;

/* 탭별 그리드 — 활성 탭 것만 마운트된다(부모 분기). 조회 전용: rowSelection 없음 */
function TrsmGrid({ rows, entry }: { rows: TrsmRow[]; entry: GridEntry }) {
  return (
    <AgGridReact<TrsmRow>
      theme={apfsTheme}
      rowData={rows}
      columnDefs={TRSM_COLS}
      getRowId={(e) => String(e.data.sn)}
      domLayout="autoHeight"
      defaultColDef={DEFAULT_COL_DEF}
      autoSizeStrategy={AUTO_SIZE_CONTENT}
      preventDefaultOnContextMenu
      onModelUpdated={refreshNoColumn}
      onRowDoubleClicked={entry.trsmDbl}
      onCellKeyDown={entry.trsmKey}
      onCellContextMenu={entry.trsmMenu}
      overlayNoRowsTemplate="조회된 송수신이력이 없습니다."
    />
  );
}

function PrcsGrid({ rows, entry, ctx }: { rows: PrcsRow[]; entry: GridEntry; ctx: PrcsGridCtx }) {
  return (
    <AgGridReact<PrcsRow>
      theme={apfsTheme}
      rowData={rows}
      columnDefs={PRCS_COLS}
      getRowId={(e) => String(e.data.sn)}
      domLayout="autoHeight"
      defaultColDef={DEFAULT_COL_DEF}
      autoSizeStrategy={AUTO_SIZE_CONTENT}
      context={ctx}
      preventDefaultOnContextMenu
      onModelUpdated={refreshNoColumn}
      onRowDoubleClicked={entry.prcsDbl}
      onCellKeyDown={entry.prcsKey}
      onCellContextMenu={entry.prcsMenu}
      overlayNoRowsTemplate="조회된 연계처리이력이 없습니다."
    />
  );
}

/* 상세필터 드로어 — 본문은 활성 탭의 항목만(송수신: 연계기관·연계방식·송수신·요청기간 / 처리이력: 대상테이블·발생기간).
   필터는 즉시 반영, [초기화] = 활성 탭 기본값(기간 포함) 복원 */
function FilterDrawer({ open, onOpenChange, tabLabel, onReset, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; tabLabel: string; onReset: () => void; children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
        <SheetHeader>
          <SheetTitle>상세 필터</SheetTitle>
          <SheetDescription className="sr-only">{`${tabLabel}을 거르는 상세 필터`}</SheetDescription>
          <IconBtn icon="x" onClick={() => onOpenChange(false)} label="닫기" size={38} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>{children}</div>
        <SheetFooter>
          <Button variant="outline" size="md" onClick={onReset}>초기화</Button>
          <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => onOpenChange(false)}>필터 적용</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function IntegrationMonitor({ onNav }: { onNav?: (r: string) => void }) {
  const [tab, setTab] = useState<TabId>('trsm');
  const [filterOpen, setFilterOpen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [ctx, setCtx] = useState<CtxMenuState>(null);
  const t = useTrsmTab();
  const p = usePrcsTab();
  const isT = tab === 'trsm';
  const cur = isT ? t : p;
  const tabLabel = isT ? TABS[0].label : TABS[1].label;

  const openTrsm = useCallback((sn: number) => setDetail({ sn, fromPrcs: false }), []);
  /* 연계처리이력 → 그 송수신 건: 목업처럼 탭을 송수신이력으로 바꾸고 상세를 연다 */
  const openLinked = useCallback((sn: number) => { setTab('trsm'); setDetail({ sn, fromPrcs: true }); }, []);
  const prcsCtx = useMemo<PrcsGridCtx>(() => ({ openLinked }), [openLinked]);

  const exportExcel = () => {
    if (isT) exportTrsm(t.visible); else exportPrcs(p.visible);
    toast.success('Excel로 내보냈습니다');
  };
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: !filterOpen, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !filterOpen, skipInDialog: true });
  const entry = useGridEntry(openTrsm, openLinked, exportExcel, setCtx);
  const refresh = () => { cur.reset(); toast.success('조회되었습니다'); };

  const detailRow = detail ? trsmBySn(detail.sn) : null;
  const total = isT ? TRSM.length : PRCS.length;

  return (
    <GridFrame
      crumbs={['홈', '관리자', '외부연동', '연동 모니터링']}
      title="연동 모니터링"
      favRoute="integration-monitor"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      filterChips={cur.chips}
      appliedFilters={cur.applied}
      filterScope={tab}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span aria-live="polite">{`${tabLabel} 총 ${String(total)}건 중 ${String(cur.visible.length)}건 표시 중`}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      <TabBar tabs={TABS} value={tab} onChange={(id) => setTab(id as TabId)} idBase={ID_BASE} label="연동 모니터링 하위 화면" />
      <TabPanel idBase={ID_BASE} value={tab}>
        {isT ? <TrsmGrid rows={t.visible} entry={entry} /> : <PrcsGrid rows={p.visible} entry={entry} ctx={prcsCtx} />}
      </TabPanel>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />

      <FilterDrawer open={filterOpen} onOpenChange={setFilterOpen} tabLabel={tabLabel} onReset={cur.reset}>
        {isT ? <TrsmFields f={t.f} set={t.set} /> : <PrcsFields f={p.f} set={p.set} />}
      </FilterDrawer>

      {detail && detailRow && (
        <IntegrationDetailModal
          row={detailRow}
          onClose={() => setDetail(null)}
          onOpenSn={(sn) => setDetail((d) => (d ? { ...d, sn } : d))}
          returnFocus={detail.fromPrcs ? () => document.getElementById(TRSM_TAB_ID) : undefined}
        />
      )}
    </GridFrame>
  );
}
