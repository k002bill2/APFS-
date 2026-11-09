/* IR정보 조회 — 조회 전용 리스트 페이지 (회계 > 농식품경영체 > IR정보 조회, route acct-ir-info, 화면ID ACC-024).
   출처: ACC-024 화면설계서(목록·조회조건 정의 표·IR 상세 팝업 슬라이드) → APFS 디자인시스템(ACC-004 deleted_journal_manage 골격).

   구성(설계서 → 우리 규약):
   - 툴바: [상세필터] → 조회(항상 맨 끝). 등록 버튼·선택 바 없음.
   - 그리드 9열(운용사·자펀드·IR명·IR일자·장소·주관·참가수·등록자·등록일). 참가수만 우측(건수), 나머지 좌측(가운데 없음).
       IR명 = 굵게·말줄임·잔여폭 흡수. 참가수 = 참가경영체 배열 길이(데이터에 숫자를 적지 않는다). IR일자 내림차순(모델 정렬).
   - 상세필터 드로어 6개(설계서 조건 정의 표 순서: IR명·운용사·자펀드·IR일자·장소·사용여부). 즉시 반영 — [필터 적용] = 닫기.
       자펀드 = 운용사를 고르면 그 운용사 자펀드만, 운용사가 바뀌면(칩 × 해제 포함) 자펀드를 비운다(모델 withGp).
       IR일자 시작 > 종료 = 두 칸 invalid + 아래 안내 + 결과 0건(삭제전표 기간과 같은 문구·동작).
       사용여부는 그리드 열이 없지만 행 데이터 useYn 으로 거른다. 적용 조건 = 칩(값만, × 개별 해제).
   - 행 더블클릭 / Enter = IR 상세보기(2탭 — ir_detail_modal). 참가경영체 기업명 링크 → 경영체 상세보기 중첩.
   - 내보내기·새 창·인쇄 = 푸터 FooterActions. 엑셀 파일·시트명 'IR정보 조회', 참가수는 숫자 셀.
   결정·가정
   - 이벤트 ID 는 설계서가 정의한 것만 주석으로 단다(E03 조회 · E04 상세 · E06/E07 푸터). 024 는 E01 이 없다.
     E00(화면 진입)·E02·E05 는 이 브리프가 의미를 받지 못해 지어내지 않는다 — 진입 시 전체 목록 표시가 E00 에 해당한다고 가정.
   - 백엔드가 없어 조회는 현재 조건 재조회 토스트만 띄운다. */
import '../../aggrid_shared.css';
import { useState, useRef, useCallback, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, numFmt, numStyle } from '../../aggrid_theme';
import { controlMinWidth, drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, CellKeyDownEvent, RowDoubleClickedEvent, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { PeriodPicker } from '../../ui/period-picker';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { DrawerSelect } from '../../drawer_select';
import { demoEntities, demoIrs, GPS, YN } from './bizorg_data';
import type { AgriEntity, IrEvent } from './bizorg_data';
import { filterIrs, validatePeriod, fundOptions, withGp, participantCount, EMPTY_IR_FILTER } from './bizorg_model';
import type { IrFilter } from './bizorg_model';
import { IrDetailModal } from './ir_detail_modal';

const { Button, IconBtn } = UI;

/* 페이지 번호 버튼 — apfs-grid 푸터 골드(‹ 이전 · 번호 · 다음 ›). 공유 export 가 아니라 골드에서 복사하는 로컬 헬퍼 */
function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

const PAGE_SIZE = 20;
const TITLE = 'IR정보 조회';
const COUNT_COL = 'participantCount';

/* ──────────────────────────────
   컬럼 정의 — 설계서 순서. 참가수만 우측(건수), 나머지 좌측(가운데 정렬 없음)
────────────────────────────── */
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const codeStyle: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;

const columnDefs: ColDef<IrEvent>[] = [
  { field: 'gp', headerName: '운용사', width: 168, minWidth: 150, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'fund', headerName: '자펀드', width: 196, minWidth: 170, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'name', headerName: 'IR명', flex: 1, width: 240, minWidth: 220, cellStyle: { ...flexCenter, fontWeight: 600 }, cellRenderer: textCell },
  { field: 'date', headerName: 'IR일자', width: 108, maxWidth: 116, cellStyle: codeStyle },
  { field: 'place', headerName: '장소', width: 180, minWidth: 150, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'host', headerName: '주관', width: 84, maxWidth: 96, cellStyle: flexCenter },
  { colId: COUNT_COL, headerName: '참가수', valueGetter: (p) => (p.data ? participantCount(p.data) : null), width: 84, maxWidth: 96,
    type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any },
  { field: 'regBy', headerName: '등록자', width: 96, maxWidth: 110, cellStyle: muted },
  { field: 'regAt', headerName: '등록일', width: 108, maxWidth: 116, cellStyle: { ...muted, fontVariantNumeric: 'tabular-nums' } },
];

type XCol = { header: string; get: (r: IrEvent) => string | number; num?: boolean; wch?: number };
const EXPORT_COLS: XCol[] = [
  { header: '운용사', get: (r) => r.gp, wch: 20 }, { header: '자펀드', get: (r) => r.fund, wch: 26 }, { header: 'IR명', get: (r) => r.name, wch: 30 },
  { header: 'IR일자', get: (r) => r.date }, { header: '장소', get: (r) => r.place, wch: 26 }, { header: '주관', get: (r) => r.host },
  { header: '참가수', get: (r) => participantCount(r), num: true, wch: 8 }, { header: '등록자', get: (r) => r.regBy }, { header: '등록일', get: (r) => r.regAt },
];

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

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null | { kind: 'detail'; row: IrEvent };

export function IrInfoManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<IrEvent> | null>(null);
  const [rows] = useState<IrEvent[]>(() => demoIrs());
  const [entities] = useState<AgriEntity[]>(() => demoEntities());
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);

  /* 상세필터 — applied = 드로어·칩·목록의 SSOT(즉시 반영) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [applied, setApplied] = useState<IrFilter>(EMPTY_IR_FILTER);
  const setD = <K extends keyof IrFilter>(k: K) => (v: IrFilter[K]) => setApplied((a) => ({ ...a, [k]: v }));
  /* 운용사는 모델 withGp 로만 바꾼다 — 바뀌면 자펀드 리셋 */
  const setGp = (gp: string) => setApplied((a) => withGp(a, gp));
  const clearApplied = (patch: Partial<IrFilter>) => setApplied((a) => ({ ...a, ...patch }));
  const periodErr = validatePeriod(applied.from, applied.to);

  /* 인쇄·내보내기는 모달·드로어가 열려 있지 않을 때만 */
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: modal === null && !filterOpen, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: modal === null && !filterOpen, skipInDialog: true });

  const visible = useMemo(() => (periodErr ? [] : filterIrs(rows, applied)), [rows, applied, periodErr]);

  const onGridReady = useCallback((e: GridReadyEvent<IrEvent>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* E04 행 더블클릭 → IR 상세보기 */
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<IrEvent>) => {
    if (!e.data || e.rowPinned) return;
    setModal({ kind: 'detail', row: e.data });
  }, []);
  /* E04 Enter → IR 상세보기(더블클릭 키보드 동치) */
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<IrEvent>) => {
    const ev = e.event as KeyboardEvent | null;
    if (ev?.key !== 'Enter' || !e.data) return;
    setModal({ kind: 'detail', row: e.data });
  }, []);

  /* E03 조회 — 현재 조건으로 재조회(백엔드 없음) */
  const refresh = () => { toast.success('조회되었습니다'); };

  /* E06 새 창 = 푸터 FooterActions 공용 버튼(window.open). E07 내보내기 — 푸터 FooterActions·⌥D.
     표시 중인 행, 참가수는 숫자 셀(t:'n' + 천단위 서식) */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => c.get(r)));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    EXPORT_COLS.forEach((c, ci) => {
      if (!c.num) return;
      body.forEach((_, ri) => {
        const cell = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
        if (cell) { cell.t = 'n'; cell.z = '#,##0'; }
      });
    });
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.wch ?? 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, TITLE);
    XLSX.writeFile(wb, `${TITLE}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(visible.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const chips: [string, string, () => void][] = [
    ['IR명', applied.name.trim(), () => clearApplied({ name: '' })],
    ['운용사', applied.gp, () => setGp('')],
    ['자펀드', applied.fund, () => clearApplied({ fund: '' })],
    ['IR일자', applied.from || applied.to ? `${applied.from || '…'} ~ ${applied.to || '…'}` : '', () => clearApplied({ from: '', to: '' })],
    ['장소', applied.place.trim(), () => clearApplied({ place: '' })],
    ['사용여부', applied.useYn, () => clearApplied({ useYn: '' })],
  ];

  return (
    <GridFrame
      crumbs={['홈', '회계', '농식품경영체', TITLE]}
      title={TITLE}
      favRoute="acct-ir-info"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={chips.map(([label, value, onClear]) => ({ label, value, onClear }))}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{'총 ' + String(rows.length) + '건 중 ' + String(visible.length) + '건 · ' + String(Math.min(shown, visible.length)) + '건 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<IrEvent>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다. 검색 조건을 변경해 주세요.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 설계서 조건 정의 표 6개. 즉시 반영([필터 적용] = 닫기) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">IR 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="IR명">
              <input type="text" value={applied.name} onChange={(e) => setD('name')(e.target.value)} placeholder="IR명" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="운용사"><DrawerSelect value={applied.gp} onChange={setGp} options={[...GPS]} ariaLabel="운용사" /></DrawerField>
            <DrawerField label="자펀드"><DrawerSelect value={applied.fund} onChange={setD('fund')} options={[...fundOptions(applied.gp)]} ariaLabel="자펀드" /></DrawerField>
            <DrawerField label="IR일자" plain>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={dayWrap}><PeriodPicker mode="day" value={applied.from} onChange={setD('from')} ariaLabel="IR일자 시작일" invalid={!!periodErr} /></div>
                <span className="text-caption">~</span>
                <div style={dayWrap}><PeriodPicker mode="day" value={applied.to} onChange={setD('to')} ariaLabel="IR일자 종료일" invalid={!!periodErr} /></div>
              </div>
              {periodErr && <p role="alert" className="m-0 mt-1 text-danger" style={{ fontSize: 12 }}>{periodErr}</p>}
            </DrawerField>
            <DrawerField label="장소">
              <input type="text" value={applied.place} onChange={(e) => setD('place')(e.target.value)} placeholder="장소" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="사용여부"><DrawerSelect value={applied.useYn} onChange={setD('useYn')} options={[...YN]} ariaLabel="사용여부" /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => setApplied(EMPTY_IR_FILTER)}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── IR 상세보기 — 게이트는 modal state(행 스냅샷) ── */}
      {modal?.kind === 'detail' && <IrDetailModal ir={modal.row} entities={entities} onClose={() => setModal(null)} />}
    </GridFrame>
  );
}
