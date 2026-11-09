/* 경영체 정보 조회 — 조회 전용 리스트 페이지 (회계 > 농식품경영체 > 경영체 정보 조회, route acct-agrifood-entity, 화면ID ACC-023).
   출처: ACC-023 화면설계서 v1.1(목록·조회조건 + 경영체 상세 팝업 슬라이드 9~20) → APFS 디자인시스템(ACC-004 deleted_journal_manage 골격).

   구성(설계서 → 우리 규약):
   - 제목은 메뉴 라벨 '경영체 정보 조회'(설계서 표기 '경영체정보조회'는 쓰지 않는다).
   - 툴바: [상세필터] → 조회(항상 맨 끝). 등록 버튼·선택 바 없음.
   - 설계서 그리드 체크박스 → 두지 않는다(선택으로 하는 액션이 0개라 rowSelection 없음).
   - 그리드 9열(사업자번호·기업명·기업구분·주식구분·여성기업여부·외부감사여부·사용여부·최초등록자·최종수정자).
       설계서의 '가운데' 정렬 → 전부 좌측(수량형 숫자 열이 없다 — 표 정렬 규약). 기업명 = 굵게·말줄임·잔여폭 흡수.
       기업명 가나다순(모델 정렬).
   - 상세필터 드로어 6개(기업명·기업구분·주식구분·여성기업여부·외부감사여부·사용여부). 즉시 반영 — [필터 적용] = 닫기, [초기화] = 전부 비움.
       적용 조건 = 칩(값만, × 개별 해제).
   - 행 더블클릭 / Enter = 경영체 상세보기(5탭 — entity_detail_modal, IR 상세의 참가경영체 링크와 같은 모달).
   - 새 창·내보내기·인쇄 = 푸터 FooterActions. 엑셀 파일·시트명 '경영체 정보 조회'.
   결정·가정
   - 이벤트 ID 는 설계서가 정의한 것만 주석으로 단다(E02 조회 · E03 상세 · E04 상세 탭 전환(5탭 — entity_detail_modal)
     · E05 새 창 · E06 내보내기). E00(화면 진입)·E01 은 설계서 정의를 이 브리프가 받지 못해 의미를 지어내지 않는다 — 진입 시 전체 목록 표시가 E00 에 해당한다고 가정.
   - 백엔드가 없어 조회는 현재 조건 재조회 토스트만 띄운다. */
import '../../aggrid_shared.css';
import { useState, useRef, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions, footerCount } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF } from '../../aggrid_theme';
import { drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, CellKeyDownEvent, RowDoubleClickedEvent, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { DrawerSelect } from '../../drawer_select';
import { demoEntities, CORP_KINDS, STOCK_KINDS, WOMEN_YN, YN } from './bizorg_data';
import type { AgriEntity } from './bizorg_data';
import { filterEntities, EMPTY_ENTITY_FILTER } from './bizorg_model';
import type { EntityFilter } from './bizorg_model';
import { EntityDetailModal } from './entity_detail_modal';

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
const TITLE = '경영체 정보 조회';

/* ──────────────────────────────
   컬럼 정의 — 설계서 순서. 수량형 숫자 열이 없어 전부 좌측(가운데 정렬 없음)
────────────────────────────── */
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const codeStyle: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };
/* display:flex 셀은 AG Grid 기본 말줄임이 안 걸린다 → 긴 텍스트는 truncate span 으로 감싼다(삭제전표 textCell 동형) */
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;

const columnDefs: ColDef<AgriEntity>[] = [
  { field: 'bizNo', headerName: '사업자번호', width: 128, minWidth: 120, cellStyle: codeStyle },
  { field: 'name', headerName: '기업명', flex: 1, width: 220, minWidth: 200, cellStyle: { ...flexCenter, fontWeight: 600 }, cellRenderer: textCell },
  { field: 'corpKind', headerName: '기업구분', width: 96, maxWidth: 110, cellStyle: flexCenter },
  { field: 'stockKind', headerName: '주식구분', width: 96, maxWidth: 110, cellStyle: flexCenter },
  { field: 'womenYn', headerName: '여성기업여부', width: 116, maxWidth: 124, cellStyle: flexCenter },
  { field: 'auditYn', headerName: '외부감사여부', width: 116, maxWidth: 124, cellStyle: flexCenter },
  { field: 'useYn', headerName: '사용여부', width: 92, maxWidth: 104, cellStyle: flexCenter },
  { field: 'createdBy', headerName: '최초등록자', width: 104, maxWidth: 120, cellStyle: muted },
  { field: 'updatedBy', headerName: '최종수정자', width: 104, maxWidth: 120, cellStyle: muted },
];

type XCol = { header: string; get: (r: AgriEntity) => string; wch?: number };
const EXPORT_COLS: XCol[] = [
  { header: '사업자번호', get: (r) => r.bizNo, wch: 14 }, { header: '기업명', get: (r) => r.name, wch: 28 },
  { header: '기업구분', get: (r) => r.corpKind }, { header: '주식구분', get: (r) => r.stockKind },
  { header: '여성기업여부', get: (r) => r.womenYn }, { header: '외부감사여부', get: (r) => r.auditYn },
  { header: '사용여부', get: (r) => r.useYn }, { header: '최초등록자', get: (r) => r.createdBy }, { header: '최종수정자', get: (r) => r.updatedBy },
];

function DrawerField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null | { kind: 'detail'; row: AgriEntity };

export function AgrifoodEntityManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<AgriEntity> | null>(null);
  const [rows] = useState<AgriEntity[]>(() => demoEntities());
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);

  /* 상세필터 — applied = 드로어·칩·목록의 SSOT(즉시 반영) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [applied, setApplied] = useState<EntityFilter>(EMPTY_ENTITY_FILTER);
  const setD = <K extends keyof EntityFilter>(k: K) => (v: EntityFilter[K]) => setApplied((a) => ({ ...a, [k]: v }));
  const clearApplied = (patch: Partial<EntityFilter>) => setApplied((a) => ({ ...a, ...patch }));

  /* 인쇄·내보내기는 모달·드로어가 열려 있지 않을 때만 */
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: modal === null && !filterOpen, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: modal === null && !filterOpen, skipInDialog: true });

  const visible = useMemo(() => filterEntities(rows, applied), [rows, applied]);

  const onGridReady = useCallback((e: GridReadyEvent<AgriEntity>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* E03 행 더블클릭 → 경영체 상세보기 */
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<AgriEntity>) => {
    if (!e.data || e.rowPinned) return;
    setModal({ kind: 'detail', row: e.data });
  }, []);
  /* E03 Enter → 경영체 상세보기(더블클릭 키보드 동치) */
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<AgriEntity>) => {
    const ev = e.event as KeyboardEvent | null;
    if (ev?.key !== 'Enter' || !e.data) return;
    setModal({ kind: 'detail', row: e.data });
  }, []);

  /* E02 조회 — 현재 조건으로 재조회(백엔드 없음) */
  const refresh = () => { toast.success('조회되었습니다'); };

  /* E05 새 창 = 푸터 FooterActions 공용 버튼(window.open). E06 내보내기 — 푸터 FooterActions·⌥D. 표시 중인 행. 숫자 열이 없어 전부 문자열 셀 */
  const exportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([EXPORT_COLS.map((c) => c.header), ...visible.map((r) => EXPORT_COLS.map((c) => c.get(r)))]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.wch ?? 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, TITLE);
    XLSX.writeFile(wb, `${TITLE}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(visible.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const chips: [string, string, () => void][] = [
    ['기업명', applied.name.trim(), () => clearApplied({ name: '' })],
    ['기업구분', applied.corpKind, () => clearApplied({ corpKind: '' })],
    ['주식구분', applied.stockKind, () => clearApplied({ stockKind: '' })],
    ['여성기업여부', applied.womenYn, () => clearApplied({ womenYn: '' })],
    ['외부감사여부', applied.auditYn, () => clearApplied({ auditYn: '' })],
    ['사용여부', applied.useYn, () => clearApplied({ useYn: '' })],
  ];

  return (
    <GridFrame
      crumbs={['홈', '회계', '농식품경영체', TITLE]}
      title={TITLE}
      favRoute="acct-agrifood-entity"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={chips.map(([label, value, onClear]) => ({ label, value, onClear }))}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{footerCount(visible.length, Math.min(shown, visible.length))}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<AgriEntity>
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

      {/* ── 상세필터 드로어 — 설계서 6개 조건. 즉시 반영([필터 적용] = 닫기) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">경영체 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="기업명">
              <input type="text" value={applied.name} onChange={(e) => setD('name')(e.target.value)} placeholder="기업명" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="기업구분"><DrawerSelect value={applied.corpKind} onChange={setD('corpKind')} options={[...CORP_KINDS]} ariaLabel="기업구분" /></DrawerField>
            <DrawerField label="주식구분"><DrawerSelect value={applied.stockKind} onChange={setD('stockKind')} options={[...STOCK_KINDS]} ariaLabel="주식구분" /></DrawerField>
            <DrawerField label="여성기업여부"><DrawerSelect value={applied.womenYn} onChange={setD('womenYn')} options={[...WOMEN_YN]} ariaLabel="여성기업여부" /></DrawerField>
            <DrawerField label="외부감사여부"><DrawerSelect value={applied.auditYn} onChange={setD('auditYn')} options={[...YN]} ariaLabel="외부감사여부" /></DrawerField>
            <DrawerField label="사용여부"><DrawerSelect value={applied.useYn} onChange={setD('useYn')} options={[...YN]} ariaLabel="사용여부" /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => setApplied(EMPTY_ENTITY_FILTER)}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 경영체 상세보기 — 게이트는 modal state(행 스냅샷) ── */}
      {modal?.kind === 'detail' && <EntityDetailModal entity={modal.row} onClose={() => setModal(null)} />}
    </GridFrame>
  );
}
