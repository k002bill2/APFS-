/* 프로그램 관리 — 읽기 전용 프로그램 목록 (관리자 > 시스템 관리 > 프로그램 관리, route program-manage).
   ⚠ 별도 원본 HTML(S0_108)은 없다 — 이미지의 시스템관리 첫 탭으로만 명시됐다(브리프). 근거는 메뉴관리 원본(S0_105)의
   `PROGRAMS`(= 프로그램ID가 있는 리프 메뉴, pid·pname)와 프로그램 검색 팝업(프로그램ID·프로그램명 부분일치)뿐이므로
   **그 범위만** 구현한다: 목록 + 검색 + 사용여부 칩 + 엑셀. 등록·수정·삭제 없음(근거 없음 — 만들지 않는다).
   데이터 = `admin_menu_tree.programCatalog`(LNB 정본) — 메뉴 관리·권한 매트릭스와 같은 소스. 연결 메뉴 = 리프의 상위 경로.
   KPI 배지 행 미포함(사용자 확정) · 페이지네이션 20건(리프 140여 건). ⚠ 백엔드 없음 — 화면 로컬 상태만. */
import './aggrid_shared.css';
import { useState, useRef, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, FIT_GRID_WIDTH, DEFAULT_COL_DEF } from './aggrid_theme';
import { controlMinWidth } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, CellStyle } from 'ag-grid-community';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { buildMenuRows, programCatalog } from './admin_menu_tree';
import type { ProgramEntry } from './admin_menu_tree';
import { UseBadge } from './admin_shared';
import { AdminTabs } from './admin_tabs';

const { Button, IconBtn, FilterChip } = UI;

const PAGE_SIZE = 20;
const PROGRAMS: ProgramEntry[] = programCatalog(buildMenuRows());   // 정적 — LNB 정본에서 1회 파생

const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const mono: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };

/* 컬럼 — 브리프 4항목(프로그램ID·프로그램명·연결 메뉴·사용여부) + No. 연결 메뉴가 남는 폭을 흡수(maxWidth 없음 + FIT_GRID_WIDTH) */
const columnDefs: ColDef<ProgramEntry>[] = [
  { headerName: 'No', width: 60, maxWidth: 60, cellStyle: centerNum, sortable: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
  { field: 'pid', headerName: '프로그램ID', width: 120, maxWidth: 140, cellStyle: mono, cellRenderer: (p: any) => <span className="font-semibold"><MT>{p.value}</MT></span> },
  { field: 'pname', headerName: '프로그램명', width: 220, minWidth: 160, maxWidth: 320, cellStyle: flexCenter, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'menuPath', headerName: '연결 메뉴', width: 360, minWidth: 240, cellStyle: { ...flexCenter, color: 'var(--muted-foreground)' }, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'use', headerName: '사용여부', width: 92, maxWidth: 92, cellStyle: flexMid, cellRenderer: (p: any) => <UseBadge use={p.value} /> },
];

const inputStyle: CSSProperties = {
  width: 'fit-content', minWidth: controlMinWidth('text'), maxWidth: '100%', boxSizing: 'border-box', padding: '6px 10px', font: 'inherit', fontSize: 13,
  border: '1px solid var(--input)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)',
};

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer motion-safe:active:scale-[.97]"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

export function ProgramManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<ProgramEntry> | null>(null);
  const [q, setQ] = useState('');                                   // 목업 프로그램 검색: 프로그램ID·프로그램명 부분일치
  const [fUse, setFUse] = useState<'' | '여' | '부'>('');
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: PROGRAMS.length });
  const masked = useMask();

  const rows = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return PROGRAMS.filter((p) => (!fUse || (p.use ? '여' : '부') === fUse) && (!kw || p.pid.toLowerCase().includes(kw) || p.pname.toLowerCase().includes(kw)));
  }, [q, fUse]);

  const onGridReady = useCallback((e: GridReadyEvent<ProgramEntry>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));   // 값 비교 가드(렌더 루프 방지)
  }, []);

  const refresh = () => { setQ(''); setFUse(''); apiRef.current?.paginationGoToFirstPage(); toast.success('새로고침했습니다'); };
  const exportExcel = () => {
    const t = (v: string) => (masked ? '' : v);
    const ws = XLSX.utils.aoa_to_sheet([
      ['프로그램ID', '프로그램명', '연결 메뉴', '사용여부'],
      ...rows.map((p) => [t(p.pid), t(p.pname), t(p.menuPath), p.use ? '여' : '부']),
    ]);
    ws['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 44 }, { wch: 8 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '프로그램 관리');
    XLSX.writeFile(wb, '프로그램관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  const shown = Math.min(PAGE_SIZE, Math.max(0, page.rowCount - page.current * PAGE_SIZE));

  return (
    <GridFrame
      crumbs={['홈', '관리자', '시스템 관리', '프로그램 관리']}
      title="프로그램 관리"
      favRoute="program-manage"
      tabs={<AdminTabs route="program-manage" onNav={onNav} />}
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={<>
        <Icon name="filter" size={16} className="text-caption" />
        {(['', '여', '부'] as const).map((u) => <FilterChip key={u || 'all'} active={fUse === u} onClick={() => setFUse(u)}>{u ? `사용 ${u}` : '전체'}</FilterChip>)}
        <label className="inline-flex items-center gap-1.5 min-w-0">
          <span className="sr-only">프로그램ID 또는 프로그램명 검색</span>
          <Icon name="search" size={14} className="text-caption shrink-0" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="프로그램ID·프로그램명" style={inputStyle} />
        </label>
      </>}
      toolbarRight={<IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />}
      footerLeft={<span>{'총 ' + mn(String(PROGRAMS.length)) + '개 프로그램 중 ' + mn(String(rows.length)) + '개 · ' + mn(String(Math.min(shown, rows.length))) + '개 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<>
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
      </>}>

      <div>
        <AgGridReact<ProgramEntry>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.leafId}
          domLayout="autoHeight"
          autoSizeStrategy={FIT_GRID_WIDTH}
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={PAGE_SIZE} suppressPaginationPanel
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 프로그램이 없습니다.</span>'}
        />
      </div>
    </GridFrame>
  );
}
