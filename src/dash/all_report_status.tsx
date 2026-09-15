/* 자펀드 전체 보고현황 — 조회 전용 3표 화면 (투자자산관리 > 운용사 모니터링, route `전체 보고현황`).
   출처: S1_44_전체_보고현황.html → APFS 디자인시스템(GridFrame + AG Grid)으로 변형.

   왜 전용 페이지인가: 원문이 한 화면에 여러 표를 쌓는데 `PageSchema`는 `columns`가 하나뿐이라 담지 못한다.
   나머지 12개 리프는 페이지 코드 0줄(스키마 주도 GenericListPage)이 목표고, 이 화면만 예외다
   (DESIGN_RECOMMENDATION §5.13 권고(a) — "전체"라는 이름으로 1/3만 보여주면 제목이 거짓이 된다).

   구성(목업 → 우리 규약):
   - 표 3개를 세로로 쌓지 않고 **툴바 SegTabs**(투자심의 | 수시보고 | 조합원총회)로 전환. 전환은 aria-live로 통지.
   - 검색박스(모펀드·운용사·자펀드·계정구분·기준일자) → 운용사/자펀드 필터칩 + 상세필터 드로어(검색어·기간).
       `모펀드`는 원문에서 읽기전용 단일값(농식품모태펀드)이라 컨트롤이 아니라 툴바 캡션으로 둔다.
       `계정구분`은 원문 select에 `전체` 외 옵션이 없어(값 도메인 미정) 컨트롤을 만들지 않는다 — 없는 값을 지어내지 않는다.
   - 금액 단위(원|백만원|억원) 토글 → `schemas/unit.ts` 공유 SSOT. 금액 컬럼이 있는 탭에서만 렌더.
   - 등록 없음(조회 전용) → 툴바 kebab 단독 + 푸터 폴백. 엑셀·인쇄 = kebab + 푸터 download + ⌥D/⌘P.
   - KPI 배지 행 미포함 · 카드뷰 없음 · 행 선택 없음(선택으로 실행할 액션이 없다).
   ⚠ 실제 보고 접수·승인 판정이 아니다 — 로컬 데모 행을 조회만 한다. */
import './aggrid_shared.css';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, NO_COL_ID, refreshNoColumn } from './aggrid_theme';
import { Cell, controlMinWidth } from './schemas/renderers';
import { UNITS, DEFAULT_UNIT, formatUnit, amountHeader } from './schemas/unit';
import type { Unit } from './schemas/unit';
import type { ColumnSpec } from './schemas/types';
import { PeriodPicker } from './ui/period-picker';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { REPORT_TABS, findTab, distinctValues, filterRows } from './all_report_status_model';
import type { ReportRow, ReportTab } from './all_report_status_model';

const { Button, IconBtn, SegTabs, FilterChip } = UI;

const MOTHER_FUND = '농식품모태펀드';   // 원문 검색박스의 읽기전용 `모펀드` 값

const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };

/* ColumnSpec → AG Grid ColDef. 셀 렌더는 공용 `Cell`에 위임한다 —
   마스킹(mn/MT)·StatusBadge·운용사 ColorChip·금액 단위 환산이 전부 그 안에 있다(중복 구현 금지). */
function toColDef(c: ColumnSpec, tab: ReportTab, unit: Unit): ColDef<ReportRow> {
  if (c.key === 'no')
    return { colId: NO_COL_ID, headerName: c.label, width: 60, maxWidth: 60, cellStyle: centerNum, sortable: false,
             valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 };
  const right = c.align === 'right';
  const amount = c.type === 'amount';
  return {
    field: c.key as any,   // 탭마다 컬럼이 달라 Row는 동적 키 맵이다
    // 금액 헤더는 컬럼 원문 단위(c.unit) 대신 **선택 단위**를 적는다 — 둘을 같이 적으면 "투자금액(원) (억원)"이 된다.
    headerName: amount ? amountHeader(c.label, unit) : c.label + (c.unit ? ` (${c.unit})` : ''),
    ...(c.key === 'title' || c.key === 'agenda'
      ? { flex: 1, minWidth: 200, suppressAutoSize: true }   // 긴 텍스트가 잔여폭 흡수
      : { minWidth: 110, maxWidth: 260 }),
    type: right ? 'rightAligned' : undefined,
    cellStyle: { display: 'flex', alignItems: 'center', textAlign: (c.align || 'left') as any, ...(right ? { justifyContent: 'flex-end' } : {}) },
    cellRenderer: (p: ICellRendererParams<ReportRow>) => (
      <Cell col={c} value={p.value} statusDomain={tab.statusDomain as any} unit={unit} />
    ),
  };
}

const inputStyle = (kind?: string): CSSProperties => ({
  width: 'fit-content', minWidth: controlMinWidth(kind), maxWidth: '100%', boxSizing: 'border-box', padding: '9px 11px', font: 'inherit', fontSize: 14,
  border: '1px solid var(--input)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)',
});
function DrawerField({ label, children, plain }: { label: string; children: React.ReactNode; plain?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </Wrap>
  );
}
function DrawerSelect({ value, onChange, options, all = '전체' }: { value: string; onChange: (v: string) => void; options: string[]; all?: string }) {
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        <option value="">{all}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}
const dayWrap: CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };

function MoreMenuItems({ onExport }: { onExport: () => void }) {
  return (
    <>
      <DropdownMenuItem onSelect={onExport}>
        <Icon name="download" size={17} className="shrink-0 text-muted-foreground" />내보내기 (Excel)
        <DropdownMenuShortcut>{HOTKEYS.export.hint}</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => window.print()}>
        <Icon name="file" size={17} className="shrink-0 text-muted-foreground" />인쇄
        <DropdownMenuShortcut>{HOTKEYS.print.hint}</DropdownMenuShortcut>
      </DropdownMenuItem>
    </>
  );
}
function MoreMenu({ onExport, size = 34 }: { onExport: () => void; size?: number }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <DropdownMenuTrigger aria-label="더보기"
              className="inline-flex items-center justify-center rounded-card-sm bg-transparent border-0 text-muted-foreground transition-colors hover:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
              style={{ width: size, height: size }}>
              <Icon name="more" size={20} stroke={2} />
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>더보기</TooltipContent>
      </Tooltip>
      <DropdownMenuContent><MoreMenuItems onExport={onExport} /></DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function AllReportStatus({ onNav }: { onNav?: (r: string) => void }) {
  const [tabKey, setTabKey] = useState(REPORT_TABS[0].key);
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);
  const [filterOpen, setFilterOpen] = useState(false);
  const [fGp, setFGp] = useState('');
  const [fSubFund, setFSubFund] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fText, setFText] = useState('');
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const masked = useMask();

  const tab = findTab(tabKey);
  const clearFilters = () => { setFGp(''); setFSubFund(''); setFFrom(''); setFTo(''); setFText(''); };

  /* 탭을 바꾸면 필터를 비운다 — 표마다 운용사·자펀드 값 도메인이 달라, 남겨두면 "0건"만 보이고
     왜 비었는지 알 수 없다(원문도 표마다 검색이 따로다). */
  const onTab = (k: string) => { setTabKey(k); clearFilters(); };

  const visible = useMemo(() => filterRows(tab, { gp: fGp, subFund: fSubFund, from: fFrom, to: fTo, kw: fText }),
    [tab, fGp, fSubFund, fFrom, fTo, fText]);
  /* 운용사 칩의 건수는 "운용사만 빼고" 나머지 필터를 적용한 모집단 기준(facet count).
     visible로 세면 칩 하나를 누른 순간 나머지 칩이 전부 0이 돼 비교 기능이 죽는다. */
  const facet = useMemo(() => filterRows(tab, { gp: '', subFund: fSubFund, from: fFrom, to: fTo, kw: fText }),
    [tab, fSubFund, fFrom, fTo, fText]);
  const gpOptions = useMemo(() => distinctValues(tab, 'gp'), [tab]);
  const subFundOptions = useMemo(() => distinctValues(tab, 'subFund'), [tab]);
  const chipCount = (gp: string) => mn(String(gp ? facet.filter((r) => String(r.gp) === gp).length : facet.length));

  const hasAmount = tab.columns.some((c) => c.type === 'amount');
  const columnDefs = useMemo<ColDef<ReportRow>[]>(() => tab.columns.map((c) => toColDef(c, tab, unit)), [tab, unit]);

  const exportExcel = useCallback(() => {
    const cols = tab.columns.filter((c) => c.key !== 'no');
    const head = cols.map((c) => (c.type === 'amount' ? amountHeader(c.label, unit) : c.label));
    const body = visible.map((r) => cols.map((c) => {
      if (masked) return '';   // 마스크 ON이면 엑셀에도 값을 내보내지 않는다(마스크 경계 = 엑셀까지)
      const v = r[c.key];
      // 우측정렬 금액만 숫자 셀 — 화면에 보이는 단위를 그대로 따른다(헤더가 단위를 명시한다)
      return c.type === 'amount' && typeof v === 'number' ? Number(formatUnit(v, unit).replace(/,/g, '')) : String(v ?? '');
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = cols.map((c) => ({ wch: c.key === 'title' || c.key === 'agenda' || c.key === 'subFund' ? 30 : 16 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, tab.sheet);
    XLSX.writeFile(wb, `자펀드 전체 보고현황_${tab.label}.xlsx`);
    toast.success(`${tab.label} 표를 Excel로 내보냈습니다`);
  }, [tab, visible, unit, masked]);

  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());
  useEffect(() => {
    // 미지원 환경은 false로 내려 푸터 폴백을 살린다 — 그냥 return하면 초기값 true가 굳어 내보내기 접근이 끊긴다.
    if (typeof IntersectionObserver === 'undefined') { setTopMoreVisible(false); return; }
    const el = topMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTopMoreVisible(e.isIntersecting), { root: null, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const refresh = () => { clearFilters(); toast.success('새로고침했습니다'); };
  const chips: [string, string, () => void][] = [
    ['자펀드', fSubFund, () => setFSubFund('')],
    ['기간', fFrom || fTo ? `${fFrom || '…'} ~ ${fTo || '…'}` : '', () => { setFFrom(''); setFTo(''); }],
    ['검색어', fText.trim(), () => setFText('')],
  ];

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '운용사 모니터링', '자펀드 전체 보고현황']}
      title="자펀드 전체 보고현황"
      favRoute="전체 보고현황"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={(
        <>
          {/* 보고 구분 = 3개 표 전환. 표가 바뀌면 컬럼·건수·필터 도메인이 함께 바뀐다. */}
          <SegTabs options={REPORT_TABS.map((t) => ({ value: t.key, label: t.label }))} value={tabKey} onChange={onTab} />
          <Icon name="filter" size={16} className="text-caption" />
          <FilterChip active={fGp === ''} onClick={() => setFGp('')} count={chipCount('')}>전체</FilterChip>
          {gpOptions.map((g) => (
            <FilterChip key={g} active={fGp === g} onClick={() => setFGp(g)} count={chipCount(g)}>{g}</FilterChip>
          ))}
          {chips.filter(([, v]) => v).map(([label, value, clear]) => (
            <span key={label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              <MT>{value}</MT>
              <button type="button" onClick={clear} aria-label={label + ' 필터 제거'} className="inline-flex items-center justify-center border-0 cursor-pointer" style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          ))}
        </>
      )}
      toolbarRight={<>
        {/* 표가 바뀌었음을 스크린리더에 알린다 — SegTabs는 시각적으로만 바뀌고 표는 통째로 교체된다 */}
        <span className="text-caption" style={{ fontSize: 12 }} aria-live="polite">{tab.label} <b className="text-foreground">{mn(String(visible.length))}</b>건</span>
        {hasAmount && <>
          <span className="text-caption" style={{ fontSize: 12 }}>금액 단위</span>
          <SegTabs size="sm" options={UNITS as unknown as string[]} value={unit} onChange={(v: string) => setUnit(v as Unit)} />
        </>}
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
        <span ref={topMoreRef} className="inline-flex"><MoreMenu onExport={exportExcel} /></span>
      </>}
      footerLeft={<span>{`모펀드 ${MOTHER_FUND} · ${tab.label} 총 ` + mn(String(tab.rows.length)) + '건 중 ' + mn(String(visible.length)) + '건 표시 중'}</span>}
      footerRight={<>
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
        {!topMoreVisible && <MoreMenu size={32} onExport={exportExcel} />}
      </>}>

      {/* 탭마다 컬럼 수가 달라 전환 시 높이가 튄다 — 최소 높이로 점프를 막는다(§5.13 반응형) */}
      <div style={{ minHeight: 320 }}>
        <AgGridReact<ReportRow>
          key={tab.key}   /* 탭 전환 = 완전 리마운트. 이전 표의 정렬·컬럼 폭이 새 표에 남지 않게 한다 */
          theme={apfsTheme}
          rowData={visible as ReportRow[]}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          onModelUpdated={refreshNoColumn}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다. 기간·조건을 변경해 주세요.</span>'}
        />
      </div>

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">{tab.label} 표를 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="모펀드" plain>
              {/* 원문에서도 읽기전용 단일값이다 — 고를 것이 없는 select를 만들지 않는다 */}
              <div className="flex items-center rounded-[8px] bg-muted text-muted-foreground" style={{ minHeight: 38, padding: '0 11px', fontSize: 13.5 }}>{MOTHER_FUND}</div>
            </DrawerField>
            <DrawerField label="검색어">
              <input type="text" value={fText} onChange={(e) => setFText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="제목 · 투자기업 · 안건" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="운용사"><DrawerSelect value={fGp} onChange={setFGp} options={gpOptions} /></DrawerField>
            <DrawerField label="자펀드"><DrawerSelect value={fSubFund} onChange={setFSubFund} options={subFundOptions} /></DrawerField>
            <DrawerField label="기준일자" plain>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={dayWrap}><PeriodPicker mode="day" value={fFrom} onChange={setFFrom} ariaLabel="기준일자 시작일" /></div>
                <span className="text-caption">~</span>
                <div style={dayWrap}><PeriodPicker mode="day" value={fTo} onChange={setFTo} ariaLabel="기준일자 종료일" /></div>
              </div>
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </GridFrame>
  );
}
