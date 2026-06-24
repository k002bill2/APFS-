/* ── AG Grid PoC: 모태펀드 조성 및 출자현황 (asset_funding의 AG Grid 병렬 구현) ──
   frame+children 점진전략 실증: GridFrame(프레임)은 그대로 두고 테이블 본체(children)만
   AG Grid Community로 교체한다. 원본 asset_funding.tsx는 무손상(데이터는 PoC 격리 위해 복제).

   검증 목표(docs/AGGrid_feasibility_report.md 부록 C·E):
   - 테마 자동추종 · 다단 중첩헤더 · pinned 합계행 · 정렬 · 마스킹(mn) valueFormatter
   - 명령 툴바: 행 선택→선택삭제/해제 · 상세필터 · 새로고침 · kebab(등록/내보내기/인쇄)
   - 푸터: 건수 · 페이지네이션 · 리스트/상세 뷰 토글 · 다운로드/새창/더보기
   - 등록(Dialog→행 추가) · 상세필터(Sheet→AG Grid External Filter, L12 Community 실증)
     → 모달/드로어 UI는 ui/dialog·ui/sheet 프리미티브 재사용

   ⚠️ AG Grid v35.3.1(v33+) Theming API: 레거시 CSS(ag-grid.css/ag-theme-*.css) import 금지. */
import './asset_funding_aggrid.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정 — 파일 상단 주석 참조
import { useState, useRef, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn } from './mask';
import { GridFrame, KpiBadge } from './grid_frame';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ColDef, ColGroupDef, ValueFormatterParams, CellStyle, GridApi, GridReadyEvent, SelectionChangedEvent, IRowNode } from 'ag-grid-community';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS — 클라이언트 전용 .xlsx 생성(쓰기 전용: XLSX.read 미사용 → 알려진 파싱 CVE 비해당)

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
// 매 렌더 새 배열을 넘기면 AG Grid가 pinned 행을 재생성(=행 애니메이션 재발) → 모듈 상수로 고정
const PINNED_BOTTOM: FundingRow[] = [TOTAL_ROW];
const PAGE_SIZE = 20;   // 16행 → 1페이지

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

/* 드로어/모달 입력 — 폰트 16px(iOS 포커스 줌 방지), 색은 토큰 */
const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 11px', font: 'inherit', fontSize: 16,
  border: '1px solid var(--border-strong)', borderRadius: 9, background: 'var(--card)', color: 'var(--foreground)',
};

/* ── kebab(···) 더보기 메뉴 — generic_list MoreMenu와 동형(Radix DropdownMenu) ── */
function PoCMoreMenu({ onRegister, onExport }: { onRegister: () => void; onExport: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="더보기"
        className="inline-flex items-center justify-center rounded-card-sm bg-transparent border-0 text-muted-foreground transition-colors hover:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
        style={{ width: 34, height: 34 }}>
        <Icon name="more" size={20} stroke={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onRegister}>
          <Icon name="plus" size={17} className="shrink-0 text-muted-foreground" />등록
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onExport}>
          <Icon name="download" size={17} className="shrink-0 text-muted-foreground" />내보내기 (Excel)
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
  const [rows, setRows] = useState<FundingRow[]>(ROWS);   // 삭제/등록/새로고침 위해 가변
  const [selCount, setSelCount] = useState(0);
  const [view, setView] = useState('list');               // list | detail (L6 토글)
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: ROWS.length });

  // 상세필터(External Filter) 상태 — L12 실증
  const [filterOpen, setFilterOpen] = useState(false);
  const [fYear, setFYear] = useState('');                 // 사업연도 (정확일치)
  const [fMin, setFMin] = useState('');                   // 출자금액 최소 (이상)

  // 등록 모달 상태
  const [regOpen, setRegOpen] = useState(false);
  const [draft, setDraft] = useState({ y: '', c0: '', u1: '' });

  const onGridReady = useCallback((e: GridReadyEvent<FundingRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<FundingRow>) => { setSelCount(e.api.getSelectedRows().length); }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    setPage({ current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() });
  }, []);

  // 외부 필터: 값 바뀌면 그리드에 재적용 통지(L12 — Community external filter)
  const filterActive = fYear !== '' || fMin !== '';
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [fYear, fMin]);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<FundingRow>) => {
    const r = node.data; if (!r) return true;
    if (fYear && r.y !== fYear) return false;
    if (fMin && Number(r.u1) < Number(fMin)) return false;
    return true;
  }, [fYear, fMin]);

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
  // Excel(.xlsx) 내보내기 — SheetJS. 화면의 2단 그룹헤더(병합)·합계행을 재현하고, 현재 필터를 반영한다.
  // 값은 화면과 동일하게 mn(fmt())로 마스킹·포맷 → 마스크 ON이면 placeholder, _on=false면 실값으로 자동 전환(SSOT).
  // ⚠️ fmt()가 콤마 문자열을 만들므로 셀은 '텍스트'다(숫자 연산 불가). 화면 미러링이 목적인 PoC라 의도된 선택.
  const exportExcel = () => {
    const cell = (v: number) => mn(fmt(v));
    const head1 = ['구분', '조성현황', '', '', '', '', '', '출자현황', ''];
    const head2 = ['', ...CO, '조합수', '출자금액'];   // CO = ['합계','농특회계','농안기금','FTA','수산발전기금','농금원']
    const body = filteredRows.map((r) => [r.y, cell(r.c0), cell(r.c1), cell(r.c2), cell(r.c3), cell(r.c4), cell(r.c5), cell(r.u0), cell(r.u1)]);
    const totalRow = ['합 계', cell(TOTAL_ROW.c0), cell(TOTAL_ROW.c1), cell(TOTAL_ROW.c2), cell(TOTAL_ROW.c3), cell(TOTAL_ROW.c4), cell(TOTAL_ROW.c5), cell(TOTAL_ROW.u0), cell(TOTAL_ROW.u1)];
    const ws = XLSX.utils.aoa_to_sheet([head1, head2, ...body, totalRow]);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },   // 구분 (A1:A2)
      { s: { r: 0, c: 1 }, e: { r: 0, c: 6 } },   // 조성현황 (B1:G1, 6열)
      { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } },   // 출자현황 (H1:I1, 2열)
    ];
    ws['!cols'] = [{ wch: 8 }, { wch: 11 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '조성출자현황');
    XLSX.writeFile(wb, '모태펀드_조성출자현황.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  // 등록 — Dialog 입력으로 새 연도 행 추가(CRUD add)
  const saveRegister = () => {
    if (!draft.y.trim()) { toast.error('연도를 입력하세요'); return; }
    const row: FundingRow = { y: draft.y.trim(), c0: Number(draft.c0) || 0, c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, u0: 0, u1: Number(draft.u1) || 0 };
    setRows((prev) => [row, ...prev]);
    setRegOpen(false);
    setDraft({ y: '', c0: '', u1: '' });
    toast.success('항목이 등록되었습니다');
  };

  // 카드(상세 뷰)·푸터 건수는 동일 필터 술어를 공유(단일 데이터·렌더러 이원화)
  const filteredRows = rows.filter((r) => (!fYear || r.y === fYear) && (!fMin || r.u1 >= Number(fMin)));
  const shown = view === 'list'
    ? Math.min(PAGE_SIZE, Math.max(0, page.rowCount - page.current * PAGE_SIZE))
    : filteredRows.length;
  const totalForCount = view === 'list' ? page.rowCount : filteredRows.length;

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '모태펀드관리', '모태펀드 조성 및 출자현황 (AG Grid PoC)']}
      title="모태펀드 조성 및 출자현황 — AG Grid PoC"
      cardTitle="모태펀드 조성·출자 현황표 (AG Grid)"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('asset-funding')}>수제 테이블 원본</Button>}
      kpis={<>
        <KpiBadge icon="landmark" color="var(--primary)" label="누적 조성총액" value={mn(fmt(TOTAL_ROW.c0)) + ' 억원'} valueSize={14} />
        <KpiBadge icon="wallet" color="var(--accent)" label="누적 출자금액" value={mn(fmt(TOTAL_ROW.u1)) + ' 억원'} valueSize={14} />
        <KpiBadge icon="layers" color="var(--chart-1)" label="누적 조합수" value={mn(fmt(TOTAL_ROW.u0)) + ' 개'} valueSize={14} />
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
          {filterActive ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              {fYear ? '연도: ' + fYear : ''}{fYear && fMin ? ' · ' : ''}{fMin ? '출자금액 ≥ ' + fMin : ''}
              <button onClick={() => { setFYear(''); setFMin(''); }} aria-label="필터 제거" className="inline-flex border-0 cursor-pointer p-0" style={{ background: 'transparent', color: 'inherit' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          ) : (
            <span className="text-caption" style={{ fontSize: 12.5 }}>행 선택→삭제 · 헤더=정렬 · 상세필터 · kebab=등록/내보내기/인쇄</span>
          )}
        </>
      )}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
        <PoCMoreMenu onRegister={() => setRegOpen(true)} onExport={exportExcel} />
      </>}
      footerLeft={<span>{'총 ' + mn(String(totalForCount)) + '개 중 ' + mn(String(shown)) + '개 항목 표시 중'}</span>}
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
        <SegTabs size="sm" value={view} onChange={setView} options={[{ value: 'list', label: '리스트 뷰' }, { value: 'detail', label: '카드뷰' }]} />
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
        <IconBtn icon="more" label="더보기" size={32} />
      </>}>

      {view === 'list' ? (
        /* AG Grid 본체 — autoHeight + pagination + external filter(L12, Community) */
        <div style={{ padding: '0 2px 2px' }}>
          <AgGridReact<FundingRow>
            theme={apfsTheme}
            rowData={rows}
            columnDefs={columnDefs}
            pinnedBottomRowData={PINNED_BOTTOM}
            domLayout="autoHeight"
            defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
            rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
            pagination
            paginationPageSize={PAGE_SIZE}
            suppressPaginationPanel
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
            onGridReady={onGridReady}
            onSelectionChanged={onSelectionChanged}
            onPaginationChanged={onPaginationChanged}
          />
        </div>
      ) : (
        /* 상세 뷰 — React 카드(L6: 단일 rowData 공유, 같은 필터 술어 적용) */
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', padding: 18 }}>
          {filteredRows.map((r) => (
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
          {filteredRows.length === 0 && (
            <div className="text-caption text-center" style={{ gridColumn: '1/-1', padding: '40px 0', fontSize: 13 }}>조건에 맞는 항목이 없습니다</div>
          )}
        </div>
      )}

      {/* ── 상세필터 드로어(Sheet) — AG Grid External Filter 구동(L12) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">External Filter로 행을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <label className="block mb-4">
              <span className="block font-semibold text-muted-foreground" style={{ fontSize: 13, marginBottom: 6 }}>사업연도</span>
              <select value={fYear} onChange={(e) => setFYear(e.target.value)} style={inputStyle}>
                <option value="">전체</option>
                {ROWS.map((r) => <option key={r.y} value={r.y}>{r.y}</option>)}
              </select>
            </label>
            <label className="block mb-4">
              <span className="block font-semibold text-muted-foreground" style={{ fontSize: 13, marginBottom: 6 }}>출자금액 최소(억원 이상)</span>
              <input type="number" value={fMin} onChange={(e) => setFMin(e.target.value)} placeholder="예: 800" style={inputStyle} />
            </label>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => { setFYear(''); setFMin(''); }}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 등록 모달(Dialog) — 새 연도 행 추가(CRUD add) ── */}
      <Dialog open={regOpen} onOpenChange={setRegOpen}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>신규 등록</DialogTitle>
            <DialogDescription className="sr-only">연도별 조성·출자 항목 등록</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto" style={{ padding: 18 }}>
            <label className="block mb-3.5">
              <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>연도 *</span>
              <input value={draft.y} onChange={(e) => setDraft((d) => ({ ...d, y: e.target.value }))} placeholder="예: 2026" style={inputStyle} />
            </label>
            <label className="block mb-3.5">
              <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>조성 합계(억원)</span>
              <input type="number" value={draft.c0} onChange={(e) => setDraft((d) => ({ ...d, c0: e.target.value }))} placeholder="0" style={inputStyle} />
            </label>
            <label className="block mb-3.5">
              <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>출자금액(억원)</span>
              <input type="number" value={draft.u1} onChange={(e) => setDraft((d) => ({ ...d, u1: e.target.value }))} placeholder="0" style={inputStyle} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRegOpen(false)}>취소</Button>
            <Button variant="primary" size="sm" leadingIcon="check" onClick={saveRegister}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GridFrame>
  );
}
