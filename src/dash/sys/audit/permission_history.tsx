/* 권한 변경이력 — 조회 전용 리스트 페이지 (관리자 > 감사·기록 > 권한 변경이력, route permission-history).
   출처: S0_107_권한변경이력.html(공통관리 KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(기간·대상 사용자·변경유형·행위자·검색어 + [이번 달]) → 전 항목이 칩 줄 위 인라인 패널
       (검색어·기간(시작~종료 한 칸)·대상 사용자·변경유형·행위자, 칩 줄 [초기화] = 기본 기간 복원). 툴바 좌는 적용 칩만. [이번 달] = 툴바 ghost 버튼. 기본 기간 = 이번 달(월초~월말, 데모 고정 기준일 기준).
   - 그리드(No·일시·변경유형·권한·변경 요약·적용 대상·행위자·발생프로그램) → AG Grid 단일 헤더. 변경 요약 셀 = 추가N·회수M 또는 전→후.
   - 행 더블클릭/Enter(또는 우클릭 메뉴 '상세 보기') → 상세 다이얼로그(`PermissionHistoryDetailModal`, 읽기 전용 — 편집 액션 없음).
   - 등록 없음(조회 전용) → 툴바 kebab 단독. 엑셀 = kebab + 푸터 download + ⌥D. 표시 건수 요약은 푸터 좌(aria-live).
   - KPI 배지 행 미포함(사용자 확정) · 카드뷰 없음.
   ⚠ 실제 감사 데이터·권한변경 수집이 아니다 — 데모 행을 로컬로 조회만 한다(브리프). 실명 아님. */
import '../../aggrid_shared.css';
import { useState, useCallback, useMemo } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, NO_COL_ID, refreshNoColumn } from '../../aggrid_theme';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent, CellStyle } from 'ag-grid-community';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { RowContextMenu } from '../../row_context_menu';
import type { CtxItem, CtxMenuState } from '../../row_context_menu';
import { demoHistory, filterHistory, summaryText, cntAdd, cntRev, usersOf, monthRange, CT_TONE, CHANGE_TYPES } from './permission_history_model';
import type { HistEntry, ChangeType } from './permission_history_model';
import { PermissionHistoryDetailModal } from './permission_history_detail_modal';
import { FilterPanel, PanelSearch, PanelRange, PanelSelect, PanelText } from '../../filter_panel';   // 상세필터 인라인 패널(apfs-detail-filter)

const { Button, IconBtn, StatusBadge } = UI;

const SEARCHABLE = true;
const DEMO: HistEntry[] = demoHistory();          // 정적 데모(조회 전용)
const USER_OPTIONS = usersOf(DEMO);

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 순서 그대로
────────────────────────────── */
const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };

function SummaryCell({ d }: { d: HistEntry }) {
  if (d.items && d.items.length) {
    const add = cntAdd(d), rev = cntRev(d);
    return (
      <span className="inline-flex items-center gap-1.5 font-bold" style={{ fontSize: 13.5 }}>
        {add > 0 && <span style={{ color: 'var(--success-text)' }}>추가 {String(add)}</span>}
        {add > 0 && rev > 0 && <span className="text-caption">·</span>}
        {rev > 0 && <span style={{ color: 'var(--danger-text)' }}>회수 {String(rev)}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5" style={{ fontSize: 13.5 }}>
      <span style={{ color: 'var(--danger-text)', textDecoration: 'line-through', opacity: .85 }}>{d.before ?? '-'}</span>
      <span className="text-caption" aria-hidden>→</span>
      <b style={{ color: 'var(--success-text)' }}>{d.after ?? '-'}</b>
    </span>
  );
}
function HoldersCell({ d }: { d: HistEntry }) {
  const h = d.holders;
  if (!h.length) return <span className="text-caption">0명</span>;
  const names = h.slice(0, 2).map((x) => x.name).join(', ');
  return <span className="inline-flex items-center gap-1.5 min-w-0"><b>{String(h.length)}명</b><span className="text-caption truncate" style={{ fontSize: 12.5 }}>{names + (h.length > 2 ? ` 외 ${h.length - 2}명` : '')}</span></span>;
}

const columnDefs: ColDef<HistEntry>[] = [
  { colId: NO_COL_ID, headerName: 'No', width: 60, maxWidth: 60, cellStyle: tabNum, sortable: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
  { field: 'ts', headerName: '일시', width: 176, maxWidth: 176, cellStyle: { ...tabNum }, valueFormatter: (p) => String(p.value) },
  { field: 'ctype', headerName: '변경유형', width: 110, maxWidth: 110, cellStyle: flexCenter, cellRenderer: (p: any) => <StatusBadge tone={CT_TONE[p.value as ChangeType]} label={p.value} size="lg" /> },
  { field: 'preset', headerName: '권한', width: 130, minWidth: 110, maxWidth: 180, cellStyle: flexCenter, cellRenderer: (p: any) => <span className="font-semibold">{p.value}</span> },
  { headerName: '변경 요약', width: 200, minWidth: 170, maxWidth: 260, cellStyle: flexCenter, valueGetter: (p) => (p.data ? summaryText(p.data) : ''), cellRenderer: (p: any) => (p.data ? <SummaryCell d={p.data} /> : null) },
  { headerName: '적용 대상(동일 권한 보유)', flex: 1, width: 220, minWidth: 180, cellStyle: flexCenter, valueGetter: (p) => (p.data?.holders ?? []).map((h) => h.name).join(', '), cellRenderer: (p: any) => (p.data ? <HoldersCell d={p.data} /> : null) },
  { field: 'actor', headerName: '행위자', width: 108, maxWidth: 140, cellStyle: muted, cellRenderer: (p: any) => p.value },
  { field: 'src', headerName: '발생프로그램', width: 120, maxWidth: 130, cellStyle: { ...flexCenter, color: 'var(--muted-foreground)' }, cellRenderer: (p: any) => p.value },
];
// 조회 전용(audit-read-only) — 행 선택 자체를 두지 않는다(체크박스도, 클릭 선택도).
// 선택으로 실행할 액션(일괄삭제·단계전이·선택 행 편집)이 없어 선택은 죽은 상태값이었다.
// 상세 진입은 더블클릭 / Enter / 우클릭 메뉴 3경로로 충분하다.
type XCol = { header: string; get: (r: HistEntry) => string };
const EXPORT_COLS: XCol[] = [
  { header: '일시', get: (r) => r.ts }, { header: '변경유형', get: (r) => r.ctype }, { header: '권한', get: (r) => r.preset },
  { header: '변경 요약', get: summaryText }, { header: '적용 대상', get: (r) => r.holders.map((h) => h.name).join(', ') },
  { header: '행위자', get: (r) => r.actor }, { header: '발생프로그램', get: (r) => r.src }, { header: 'IP', get: (r) => r.ip }, { header: '사유', get: (r) => r.reason },
];

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function PermissionHistory({ onNav }: { onNav?: (r: string) => void }) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const [ctx, setCtx] = useState<CtxMenuState>(null);

  /* 필터 — 전 항목이 칩 줄 위 인라인 패널(툴바 좌는 적용 칩만). 기본 기간 = 이번 달(데모 고정 기준일) */
  const [fType, setFType] = useState<ChangeType | ''>('');
  const [[from0, to0]] = useState(() => monthRange());
  const [fFrom, setFFrom] = useState(from0);
  const [fTo, setFTo] = useState(to0);
  const [fUser, setFUser] = useState('');
  const [fActor, setFActor] = useState('');
  const [fText, setFText] = useState('');
  const clearFilters = () => { setFType(''); setFFrom(from0); setFTo(to0); setFUser(''); setFActor(''); setFText(''); };
  const thisMonth = () => { const [f, t] = monthRange(); setFFrom(f); setFTo(t); };

  useHotkey(HOTKEYS.print.combo, printGrid, { skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { skipInDialog: true });

  const visible = useMemo(() => filterHistory(DEMO, { from: fFrom, to: fTo, user: fUser, type: fType, actor: fActor, kw: fText }), [fFrom, fTo, fUser, fType, fActor, fText]);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<HistEntry>) => { if (e.data && !e.rowPinned) setDetailId(e.data.id); }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<HistEntry>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    setDetailId(e.data.id);
  }, []);
  const handleCellContextMenu = (e: CellContextMenuEvent<HistEntry>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [
      { label: '상세 보기', icon: 'eye', onSelect: () => setDetailId(row.id) },
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  const detail = detailId ? DEMO.find((r) => r.id === detailId) ?? null : null;
  const refresh = () => { clearFilters(); toast.success('조회되었습니다'); };

  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => (c.get(r))));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '사유' || c.header === '적용 대상' ? 30 : 16 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '권한 변경이력');
    XLSX.writeFile(wb, '권한변경이력.xlsx');
    toast.success('Excel로 내보냈습니다 — 다운로드 행위도 감사로그에 기록됩니다');
  };

  const chips: [string, string, () => void][] = [
    ['기간', fFrom || fTo ? `${fFrom || '…'} ~ ${fTo || '…'}` : '', () => { setFFrom(''); setFTo(''); }],
    ['대상 사용자', fUser, () => setFUser('')],
    ['변경유형', fType, () => setFType('')],
    ['행위자', fActor.trim(), () => setFActor('')],
    ['검색어', fText.trim(), () => setFText('')],
  ];

  return (
    <GridFrame
      crumbs={['홈', '관리자', '감사·기록', '권한 변경이력']}
      title="권한 변경이력"
      favRoute="permission-history"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={chips.map(([label, value, onClear]) => ({ label, value, onClear }))}
      filterReset={{ run: clearFilters, dirty: fType !== '' || fFrom !== from0 || fTo !== to0 || fUser !== '' || fActor !== '' || fText !== '' }}
      /* 상세필터 = 칩 줄 위 인라인 패널 — 검색어(opt-in) · 기간 · 대상 사용자 · 변경유형 · 행위자. 즉시 반영, [초기화] = 기본값(기간 = 이번 달) 복원 */
      filterPanel={
        <FilterPanel label="권한 변경이력 조건">
          {SEARCHABLE && <PanelSearch value={fText} onChange={setFText} />}
          <PanelRange label="기간" mode="day" from={fFrom} to={fTo} onFrom={setFFrom} onTo={setFTo} />
          <PanelSelect label="대상 사용자" value={fUser} onChange={setFUser} options={USER_OPTIONS.map((u) => ({ value: u, label: u }))} />
          <PanelSelect label="변경유형" value={fType} onChange={(v) => setFType(v as ChangeType | '')} options={CHANGE_TYPES.map((t) => ({ value: t, label: t }))} />
          <PanelText label="행위자" value={fActor} onChange={setFActor} />
        </FilterPanel>
      }
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="calendar" onClick={thisMonth}>이번 달</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span aria-live="polite">{'총 ' + String(DEMO.length) + '건 중 ' + String(visible.length) + '건 표시 중'}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      <div>
        <AgGridReact<HistEntry>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          preventDefaultOnContextMenu
          onModelUpdated={refreshNoColumn}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          onCellContextMenu={handleCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">해당 기간·조건의 권한 변경 이력이 없습니다.</span>'}
        />
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />


      {detail && <PermissionHistoryDetailModal entry={detail} onClose={() => setDetailId(null)} />}
    </GridFrame>
  );
}
