/* 모태펀드 조성 및 출자현황 — 투자자산관리 > 모태펀드관리
   FFMS 캡처(image10) 실측: 연도별 조성현황(기금 소스별) + 출자현황 집계 매트릭스.
   2단 중첩 헤더 + pinned 합계행. AG Grid Community + 공통 양식 GridFrame(apfs-grid 스킬).

   기능: 정렬 · 행 선택→선택삭제 · 등록(Dialog→행 추가) · 상세필터(Sheet→External Filter, L12 Community)
        · 페이지네이션 · Excel(.xlsx, SheetJS) 내보내기 · 리스트/카드 뷰 토글.
     → 모달/드로어 UI는 ui/dialog·ui/sheet 프리미티브 재사용.

   ⚠️ AG Grid v35.3.1(v33+) Theming API: 레거시 CSS(ag-grid.css/ag-theme-*.css) import 금지. */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정 + 합계행 강조(공유)
import { useState, useRef, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, useMask } from './mask';
import { GridFrame, KpiBadge } from './grid_frame';
import { apfsTheme, fmt, numFmt, numStyle } from './aggrid_theme';   // 공유 테마(회색 선택)·포매터 SSOT
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent, SelectionChangedEvent, IRowNode } from 'ag-grid-community';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS — 클라이언트 전용 .xlsx 생성(쓰기 전용: XLSX.read 미사용 → 알려진 파싱 CVE 비해당)

const { Button, IconBtn, SegTabs, ColorChip } = UI;

/* ── 데이터 — FFMS 캡처(image10) 실측 ── */
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

const CO = ['합계', '농특회계', '농안기금', 'FTA', '수산발전기금', '일반회계'];
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
  width: '100%', boxSizing: 'border-box', padding: '9px 11px', font: 'inherit', fontSize: 14,
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

/* ── 카드(상세) 뷰 빌딩블록 — 리스트(표)의 전 컬럼을 카드에서 재현 ──
   "축은 두고 데이터는 가린다": 그룹명·컬럼명은 비마스킹, 값만 mn(fmt()).
   표의 numStyle을 재현해 0은 muted, 강조열(합계/출자금액)은 bold → 리스트와 시각적 의미 일치. */
function CardGroupLabel({ children }: { children: string }) {
  return (
    <div className="font-semibold text-muted-foreground" style={{
      fontSize: 11, letterSpacing: '.02em', paddingBottom: 4, borderBottom: '1px solid var(--border)',
    }}>{children}</div>
  );
}
function CardRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-caption shrink-0" style={{ fontSize: 12 }}>{label}</span>
      <span className="tabular" style={{
        fontSize: strong ? 14 : 13, fontWeight: strong ? 700 : 500,
        color: value === 0 ? 'var(--muted-foreground)' : 'var(--foreground)',
      }}>{mn(fmt(value))}</span>
    </div>
  );
}

export function AssetFunding({ onNav }: { onNav?: (r: string) => void }) {
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

  const masked = useMask();   // 마스크 ON이면 Excel 숫자 셀 값을 0으로(실값 비노출) — 표시 모양은 z 서식이 담당

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
  // 숫자 컬럼은 실제 숫자(t:'n')+숫자서식(z)으로 기록 → Excel이 화면 그리드(type:'rightAligned')와 동일하게 자동 우측 정렬,
  // 실데이터 연동 시(_on=false) 합계 계산도 가능. (커뮤니티 xlsx는 셀 정렬 '스타일'을 쓰지 못하므로 숫자 셀로 정렬을 얻는다.)
  // 마스크 ON이면 값을 0으로 써서 실값을 파일에 남기지 않는다(비노출). 서식의 정수/소수 판단은 '원값'을 따른다(소수 컬럼은 0.0로 표시).
  const exportExcel = () => {
    const zFmt = (v: number) => (Number.isInteger(v) ? '#,##0' : '#,##0.0');   // 화면 fmt()와 동일한 콤마/소수 규칙
    const numKeys = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'u0', 'u1'] as const;   // 헤더 순: 합계·농특회계·농안기금·FTA·수산발전기금·일반회계 / 조합수·출자금액
    const head1 = ['구분', '조성현황', '', '', '', '', '', '출자현황', ''];
    const head2 = ['', ...CO, '조합수', '출자금액'];   // CO = ['합계','농특회계','농안기금','FTA','수산발전기금','일반회계']
    const dataSrc = [...filteredRows, TOTAL_ROW];      // 본문 + pinned 합계행(화면과 동일)
    const dataRows = dataSrc.map((r) => [r.y, ...numKeys.map((k) => (masked ? 0 : (r[k] as number)))]);
    const aoa = [head1, head2, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // 숫자 컬럼(열 1~8, 데이터는 행 2부터)에 화면 포맷과 일치하는 숫자서식 부여
    dataSrc.forEach((r, i) =>
      numKeys.forEach((k, j) => {
        const addr = XLSX.utils.encode_cell({ r: i + 2, c: j + 1 });
        if (ws[addr]) ws[addr].z = zFmt(r[k] as number);
      }));
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
      crumbs={['홈', '투자자산관리', '모태펀드관리', '모태펀드 조성 및 출자현황']}
      title="모태펀드 조성 및 출자현황"
      cardTitle="모태펀드 조성·출자 현황표"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
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
        /* 상세 뷰 — React 카드(L6: 단일 rowData 공유, 같은 필터 술어 적용).
           리스트(표)의 2단 그룹헤더(조성현황 c0~c5 · 출자현황 u0·u1)를 카드 안에서 전부 재현한다. */
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', padding: 18 }}>
          {filteredRows.map((r) => {
            const co = [r.c0, r.c1, r.c2, r.c3, r.c4, r.c5];   // 조성현황 6열 — CO 라벨과 같은 순서
            return (
              <div key={r.y} className="border border-border bg-card flex flex-col gap-3 p-3.5" style={{ borderRadius: 12 }}>
                <div className="flex items-center gap-2.5">
                  <ColorChip icon="landmark" color="var(--primary)" size={34} iconSize={16} />
                  <div className="min-w-0">
                    <div className="font-semibold" style={{ fontSize: 14 }}>{r.y}년</div>
                    <div className="text-muted-foreground" style={{ fontSize: 12 }}>조성·출자 현황</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <CardGroupLabel>조성현황</CardGroupLabel>
                  {CO.map((label, i) => <CardRow key={i} label={label} value={co[i]} strong={i === 0} />)}
                </div>
                <div className="flex flex-col gap-1.5">
                  <CardGroupLabel>출자현황</CardGroupLabel>
                  <CardRow label="조합수" value={r.u0} />
                  <CardRow label="출자금액" value={r.u1} strong />
                </div>
              </div>
            );
          })}
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
              <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>사업연도</span>
              {/* Safari menulist는 세로 padding을 무시해 select가 input보다 낮게 렌더됨(WebKit 측정 22 vs 37px).
                  appearance:none으로 padding을 살려 높이를 맞추고, 사라진 네이티브 화살표는 chevron 아이콘으로 보강. */}
              <div className="relative">
                <select value={fYear} onChange={(e) => setFYear(e.target.value)} style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
                  <option value="">전체</option>
                  {ROWS.map((r) => <option key={r.y} value={r.y}>{r.y}</option>)}
                </select>
                <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
              </div>
            </label>
            <label className="block mb-4">
              <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>출자금액 최소(억원 이상)</span>
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
              <span className="font-semibold text-caption block" style={{ fontSize: 14, marginBottom: 5 }}>연도 *</span>
              <input value={draft.y} onChange={(e) => setDraft((d) => ({ ...d, y: e.target.value }))} placeholder="예: 2026" style={inputStyle} />
            </label>
            <label className="block mb-3.5">
              <span className="font-semibold text-caption block" style={{ fontSize: 14, marginBottom: 5 }}>조성 합계(억원)</span>
              <input type="number" value={draft.c0} onChange={(e) => setDraft((d) => ({ ...d, c0: e.target.value }))} placeholder="0" style={inputStyle} />
            </label>
            <label className="block mb-3.5">
              <span className="font-semibold text-caption block" style={{ fontSize: 14, marginBottom: 5 }}>출자금액(억원)</span>
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
