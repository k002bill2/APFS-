/* ── AG Grid PoC: 모태펀드 조성 및 출자현황 (asset_funding의 AG Grid 병렬 구현) ──
   frame+children 점진전략 실증: GridFrame(프레임)은 그대로 두고 테이블 본체(children)만
   AG Grid Community로 교체한다. 원본 asset_funding.tsx는 무손상(데이터는 PoC 격리 위해 복제).

   검증 목표(docs/AGGrid_feasibility_report.md 부록 C·E):
   - 테마 자동추종 · 다단 중첩헤더 · pinned 합계행 · 정렬 · 마스킹(mn) valueFormatter
   - 명령 툴바(generic_list 동형): 행 선택→선택삭제/해제 · 상세필터 · 새로고침 · kebab(등록/내보내기/인쇄)
   - 푸터(generic_list 동형): 건수 · 페이지네이션 · 리스트/상세 뷰 토글 · 다운로드/새창/더보기
     → 페이저=AG Grid pagination(Community) + 커스텀 외관, 상세뷰=React 카드(L6 단일 데이터·렌더러 이원화)

   ⚠️ AG Grid v35.3.1(v33+) Theming API: 레거시 CSS(ag-grid.css/ag-theme-*.css) import 금지. */
import { useState, useRef, useCallback } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn } from './mask';
import { GridFrame, KpiBadge } from './grid_frame';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef, ColGroupDef, ValueFormatterParams, CellStyle, GridApi, GridReadyEvent, SelectionChangedEvent } from 'ag-grid-community';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { toast } from './ui/sonner';

const { Button, IconBtn, SegTabs, ColorChip } = UI;

// v33+ 필수: 모듈 미등록 시 런타임 blank grid + 콘솔 에러. import 시 1회 등록.
ModuleRegistry.registerModules([AllCommunityModule]);

/* ── 데이터(원본 asset_funding.tsx에서 PoC 격리 위해 복제) ── */
type FundingRow = { y: string; c0: number; c1: number; c2: number; c3: number; c4: number; c5: number; u0: number; u1: number };
const RAW: { y: string; c: number[]; u: number[] }[] = [
  { y: '2010', c: [597.3, 507, 90, 0, 0, 0.3], u: [5, 547] },
  { y: '2011', c: [500, 0, 500, 0, 0, 0], u: [6, 495] },
  { y: '2012', c: [500, 0, 500, 0, 0, 0], u: [7, 540] },
  { y: '2013', c: [500, 0, 500, 0, 0, 0], u: [7, 510] },
  { y: '2014', c: [700, 0, 600, 0, 100, 0], u: [10, 790] },
  { y: '2015', c: [600, 0, 0, 500, 100, 0], u: [8, 700] },
  { y: '2016', c: [400, 0, 0, 300, 100, 0], u: [8, 1040] },
  { y: '2017', c: [300, 0, 0, 200, 100, 0], u: [7, 700] },
  { y: '2018', c: [200, 0, 0, 100, 100, 0], u: [6, 520] },
  { y: '2019', c: [270, 0, 0, 200, 70, 0], u: [8, 622.5] },
  { y: '2020', c: [420, 0, 0, 350, 70, 0], u: [10, 980] },
  { y: '2021', c: [0, 0, 0, 0, 0, 0], u: [12, 1047] },
  { y: '2022', c: [0, 0, 0, 0, 0, 0], u: [17, 1655.9] },
  { y: '2023', c: [0, 0, 0, 0, 0, 0], u: [14, 1314.7] },
  { y: '2024', c: [0, 0, 0, 0, 0, 0], u: [15, 1416] },
  { y: '2025', c: [0, 0, 0, 0, 0, 0], u: [14, 1246] },
];
const flat = (r: { y: string; c: number[]; u: number[] }): FundingRow =>
  ({ y: r.y, c0: r.c[0], c1: r.c[1], c2: r.c[2], c3: r.c[3], c4: r.c[4], c5: r.c[5], u0: r.u[0], u1: r.u[1] });
const ROWS: FundingRow[] = RAW.map(flat);
const TOTAL_ROW: FundingRow = { y: '합 계', c0: 4987.3, c1: 507, c2: 2190, c3: 1650, c4: 640, c5: 0.3, u0: 154, u1: 14124.1 };
const PAGE_SIZE = 12;   // 16행 → 2페이지

/* 정수=천단위 콤마, 소수=1자리 — 원본 fmt 재현 */
const fmt = (n: number): string =>
  Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/* 숫자 셀 포맷터 — mn() 마스킹 통합(X1 검증: valueFormatter 경로) */
const numFmt = (p: ValueFormatterParams): string => (p.value == null ? '' : mn(fmt(p.value as number)));

/* 0=muted, 합계열(strong)=bold — 원본 NumCell 조건부 스타일 재현(M3). 색은 var(--token) → 다크 자동추종 */
const numStyle = (strong?: boolean) => (p: { value: unknown; node: { rowPinned?: string | null } }): CellStyle => ({
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: strong || p.node.rowPinned ? 700 : 500,
  color: p.value === 0 ? 'var(--muted-foreground)' : 'var(--foreground)',
});

/* ── 테마: 핵심 시맨틱 파라미터만 토큰 바인딩, 파생 크롬은 derive하게 둠(부록 C·E 테스트) ── */
const apfsTheme = themeQuartz.withParams({
  backgroundColor: 'var(--card)',
  foregroundColor: 'var(--foreground)',
  accentColor: 'var(--primary)',
  borderColor: 'var(--border)',
  fontFamily: 'inherit',
  headerFontWeight: 600,
  wrapperBorderRadius: 0,
});

const CO = ['합계', '농특회계', '농안기금', 'FTA', '수산발전기금', '농금원'];
const numCol = (field: string, header: string, strong?: boolean): ColDef<FundingRow> => ({
  field: field as keyof FundingRow, headerName: header, flex: 1, minWidth: 92,
  valueFormatter: numFmt, cellStyle: numStyle(strong) as any, type: 'rightAligned',
});

const columnDefs: (ColDef<FundingRow> | ColGroupDef<FundingRow>)[] = [
  { field: 'y', headerName: '구분', pinned: 'left', width: 120, cellStyle: { fontWeight: 600 } },
  {
    headerName: '조성현황', headerClass: 'apfs-grp-co', marryChildren: true,
    children: [numCol('c0', '합계', true), ...CO.slice(1).map((h, i) => numCol('c' + (i + 1), h))],
  },
  {
    headerName: '출자현황', headerClass: 'apfs-grp-in', marryChildren: true,
    children: [numCol('u0', '조합수'), numCol('u1', '출자금액')],
  },
];

/* ── kebab(···) 더보기 메뉴 — generic_list MoreMenu와 동형(Radix DropdownMenu) ── */
function PoCMoreMenu({ onExport }: { onExport: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="더보기"
        className="inline-flex items-center justify-center rounded-card-sm text-muted-foreground transition-colors hover:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
        style={{ width: 34, height: 34 }}>
        <Icon name="more" size={20} stroke={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => toast.info('등록 — PoC 스텁(RowFormModal 연동 지점)')}>
          <Icon name="plus" size={17} className="shrink-0 text-muted-foreground" />등록
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onExport}>
          <Icon name="download" size={17} className="shrink-0 text-muted-foreground" />내보내기 (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.print()}>
          <Icon name="file" size={17} className="shrink-0 text-muted-foreground" />인쇄
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* 페이지 번호 버튼 — generic_list 푸터 페이저 외관 재현(토큰 기반) */
function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 32, height: 32, borderRadius: 8, border: '1px solid',
      borderColor: active ? 'var(--primary)' : 'var(--border)',
      background: active ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
      color: active ? 'var(--primary)' : 'var(--foreground)',
      font: 'inherit', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all .12s',
    }}>{n}</button>
  );
}

export function AssetFundingAgGrid({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<FundingRow> | null>(null);
  const [rows, setRows] = useState<FundingRow[]>(ROWS);   // 삭제/새로고침 위해 가변
  const [selCount, setSelCount] = useState(0);
  const [view, setView] = useState('list');               // list | detail (L6 토글)
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: ROWS.length });

  const onGridReady = useCallback((e: GridReadyEvent<FundingRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<FundingRow>) => { setSelCount(e.api.getSelectedRows().length); }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    setPage({ current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() });
  }, []);

  const refresh = () => { setRows([...ROWS]); apiRef.current?.deselectAll(); toast.success('새로고침했습니다'); };
  const clearSel = () => apiRef.current?.deselectAll();
  const deleteSelected = () => {
    const sel = apiRef.current?.getSelectedRows() ?? [];
    if (!sel.length) return;
    const ys = new Set(sel.map((r) => r.y));
    setRows((prev) => prev.filter((r) => !ys.has(r.y)));
    apiRef.current?.deselectAll();
    toast.success(`${sel.length}개 항목을 삭제했습니다`);
  };
  const exportCsv = () => { apiRef.current?.exportDataAsCsv({ fileName: '모태펀드_조성출자현황.csv' }); toast.success('CSV로 내보냈습니다'); };

  // 푸터 건수: 리스트=현재 페이지 표시 수, 상세=전체
  const shown = view === 'list' ? Math.min(PAGE_SIZE, Math.max(0, page.rowCount - page.current * PAGE_SIZE)) : rows.length;

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '모태펀드관리', '모태펀드 조성 및 출자현황 (AG Grid PoC)']}
      title="모태펀드 조성 및 출자현황 — AG Grid PoC"
      sub="AG Grid Community v35.3.1 · frame+children 점진전략 + 명령 툴바 + 푸터 실증 — 단위: 금액 억원(추정) / 조합수 개"
      cardTitle="모태펀드 조성·출자 현황표 (AG Grid)"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('asset-funding')}>수제 테이블 원본</Button>}
      kpis={<>
        <KpiBadge icon="landmark" color="var(--primary)" label="누적 조성총액" value={mn(fmt(TOTAL_ROW.c0)) + ' 억원'} />
        <KpiBadge icon="wallet" color="var(--accent)" label="누적 출자금액" value={mn(fmt(TOTAL_ROW.u1)) + ' 억원'} />
        <KpiBadge icon="layers" color="var(--chart-1)" label="누적 조합수" value={mn(fmt(TOTAL_ROW.u0)) + ' 개'} />
      </>}
      toolbarLeft={selCount > 0 ? (
        <>
          <span className="font-semibold" style={{ fontSize: 13 }}>{selCount}건 선택됨</span>
          <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: 'var(--danger)' }} onClick={deleteSelected}>선택 삭제</Button>
          <Button variant="ghost" size="sm" onClick={clearSel}>선택 해제</Button>
        </>
      ) : (
        <>
          <Icon name="filter" size={16} className="text-caption" />
          <span className="text-caption" style={{ fontSize: 12.5 }}>행 체크박스로 선택 → 선택 삭제 · 헤더 클릭=정렬 · 하단 페이저·뷰토글</span>
        </>
      )}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => toast.info('상세필터 — PoC 스텁(ListFilterDrawer 연동 지점)')}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
        <PoCMoreMenu onExport={exportCsv} />
      </>}
      footerLeft={<span>{'총 ' + mn(String(view === 'list' ? page.rowCount : rows.length)) + '개 중 ' + mn(String(shown)) + '개 항목 표시 중'}</span>}
      footerCenter={view === 'list' && page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => i).map((i) => (
            <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />
          ))}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<>
        <SegTabs size="sm" value={view} onChange={setView} options={[{ value: 'list', label: '리스트 뷰' }, { value: 'detail', label: '상세 뷰' }]} />
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportCsv} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
        <IconBtn icon="more" label="더보기" size={32} />
      </>}>

      {view === 'list' ? (
        /* AG Grid 본체 — autoHeight + pagination(Community). 커스텀 페이저가 외관, AG Grid가 엔진 */
        <div style={{ padding: '0 2px 2px' }}>
          <AgGridReact<FundingRow>
            theme={apfsTheme}
            rowData={rows}
            columnDefs={columnDefs}
            pinnedBottomRowData={[TOTAL_ROW]}
            domLayout="autoHeight"
            defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
            rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
            pagination
            paginationPageSize={PAGE_SIZE}
            suppressPaginationPanel
            onGridReady={onGridReady}
            onSelectionChanged={onSelectionChanged}
            onPaginationChanged={onPaginationChanged}
          />
        </div>
      ) : (
        /* 상세 뷰 — React 카드(L6 검증: 단일 rowData 공유, 렌더러만 이원화) */
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', padding: 18 }}>
          {rows.map((r) => (
            <div key={r.y} className="border border-border bg-card flex flex-col gap-2.5 p-3.5" style={{ borderRadius: 12 }}>
              <div className="flex items-center gap-2.5">
                <ColorChip icon="landmark" color="var(--primary)" size={34} iconSize={16} />
                <div className="min-w-0">
                  <div className="font-semibold" style={{ fontSize: 14 }}>{r.y}년</div>
                  <div className="text-muted-foreground" style={{ fontSize: 12 }}>조성·출자 현황</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-caption" style={{ fontSize: 12 }}>조성 합계</span>
                <span className="tabular font-bold" style={{ fontSize: 14 }}>{mn(fmt(r.c0))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-caption" style={{ fontSize: 12 }}>출자금액</span>
                <span className="tabular font-bold" style={{ fontSize: 14 }}>{mn(fmt(r.u1))}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </GridFrame>
  );
}
