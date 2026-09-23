/* 자펀드 전체 보고현황 — 조회 전용 6표 화면 (투자자산관리 > 운용사 모니터링, route `전체 보고현황`).
   출처: S1_44_전체_보고현황.html → APFS 디자인시스템(GridFrame + AG Grid)으로 변형.

   왜 전용 페이지인가: 원문이 한 화면에 여러 표를 쌓는데 `PageSchema`는 `columns`가 하나뿐이라 담지 못한다.
   나머지 12개 리프는 페이지 코드 0줄(스키마 주도 GenericListPage)이 목표고, 이 화면만 예외다
   ("전체"라는 이름으로 원문의 일부만 보여주면 제목이 거짓이 된다 — 2026-09-15 정정 이력은
    dev/active/investment-asset-menu-pages/BRIEF.md 의 "2026-09-15 정정" 절 참조).

   구성(목업 → 우리 규약):
   - 표 6개를 세로로 쌓지 않고 **툴바 SegTabs**(투자심의 | 수시보고 | 조합원총회 | 관리보수 |
     운용사 출자배분 | 농금원 출자배분)로 전환. 전환은 aria-live로 통지. 원문 표를 하나라도 빼면
     화면 이름 `전체 보고현황`이 거짓이 되므로 6개를 모두 싣는다(2026-09-15 정정).
   - 원문이 2단 헤더인 표(운용사 출자배분: 기타조합원·모태펀드)는 ColumnSpec.group → ColGroupDef로 접는다.
   - 원문 tfoot의 소계·합계는 데이터 행이 아니라 `pinnedBottomRowData`로 하단 고정한다.
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
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, NO_COL_ID, refreshNoColumn } from './aggrid_theme';
import { Cell, controlMinWidth, drawerInputStyle as inputStyle } from './schemas/renderers';
import { foldGroups } from './grid_header_note';   // 2단 그룹헤더 접기 SSOT(GenericListPage 와 공유)
import { UNITS, DEFAULT_UNIT, formatUnit, amountHeader } from './schemas/unit';
import type { Unit } from './schemas/unit';
import type { ColumnSpec } from './schemas/types';
import { PeriodPicker } from './ui/period-picker';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, ICellRendererParams, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { REPORT_TABS, findTab, distinctValues, filterRows } from './all_report_status_model';
import type { ReportRow, ReportTab } from './all_report_status_model';

const { Button, IconBtn, SegTabs, FilterChip } = UI;

const MOTHER_FUND = '농식품모태펀드';   // 원문 검색박스의 읽기전용 `모펀드` 값

const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };

/* ColumnSpec → AG Grid ColDef. 셀 렌더는 공용 `Cell`에 위임한다 —
   StatusBadge·운용사 ColorChip·금액 단위 환산이 전부 그 안에 있다(중복 구현 금지). */
function toColDef(c: ColumnSpec, tab: ReportTab, unit: Unit): ColDef<ReportRow> {
  if (c.key === 'no')
    /* No 는 순번. 정렬·필터로 순서가 바뀌어도 1..n 이 되도록 rowIndex 로 매기되,
       **하단 고정 행(소계·합계)은 예외** — 그쪽 rowIndex 는 0,1 로 다시 시작하므로 원문 라벨을 그대로 쓴다. */
    return { colId: NO_COL_ID, headerName: c.label, width: 68, maxWidth: 68, cellStyle: centerNum, sortable: false,
             valueGetter: (p) => (p.node?.rowPinned ? String(p.data?.no ?? '') : (p.node?.rowIndex ?? 0) + 1) };
  const right = c.align === 'right';
  const amount = c.type === 'amount';
  return {
    field: c.key as any,   // 탭마다 컬럼이 달라 Row는 동적 키 맵이다
    // 금액 헤더는 컬럼 원문 단위(c.unit) 대신 **선택 단위**를 적는다 — 둘을 같이 적으면 "투자금액(원) (억원)"이 된다.
    headerName: amount ? amountHeader(c.label, unit) : c.label + (c.unit ? ` (${c.unit})` : ''),
    ...(c.key === 'title' || c.key === 'agenda'
      ? { flex: 1, minWidth: 200, width: 200, suppressAutoSize: true }   // 긴 텍스트가 잔여폭 흡수. width=초기폭(apfs-aggrid ⑨)
      : { minWidth: 110, maxWidth: 260 }),
    ...(c.pinned ? { pinned: c.pinned } : {}),   // 와이드 표에서 식별 컬럼을 붙잡아 둔다
    type: right ? 'rightAligned' : undefined,
    cellStyle: { display: 'flex', alignItems: 'center', textAlign: (c.align || 'left') as any, ...(right ? { justifyContent: 'flex-end' } : {}) },
    cellRenderer: (p: ICellRendererParams<ReportRow>) => (
      <Cell col={c} value={p.value} statusDomain={tab.statusDomain as any} unit={unit} />
    ),
  };
}

/* ColumnSpec[] → AG Grid 정의. **연속한** 같은 group 은 하나의 ColGroupDef 로 접는다 —
   접기 규칙은 `grid_header_note.foldGroups` 가 정본이다(GenericListPage 와 공유, 복사 금지).
   원문 S1_44 운용사 출자배분표의 `기타조합원`·`모태펀드` 2단 헤더가 이 경로로 복원된다 —
   평평하게 늘어놓으면 원금배분/합계 컬럼이 어느 쪽 것인지 사라진다. */
const toColumnDefs = (tab: ReportTab, unit: Unit): (ColDef<ReportRow> | ColGroupDef<ReportRow>)[] =>
  foldGroups(tab.columns.map((c) => toColDef(c, tab, unit)), tab.columns);

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
  const chipCount = (gp: string) => String(gp ? facet.filter((r) => String(r.gp) === gp).length : facet.length);

  /* 원문 tfoot(소계·합계)은 **캡처한 리터럴**이지 우리가 계산한 값이 아니다 —
     `합계` 행의 약정총액(32,000,000,000)은 12행의 합이 아니라 조합 약정액이라 필터링된
     부분집합으로는 재계산 자체가 불가능하다. 그래서 필터가 걸리면 **다시 계산하지 않고 내린다**:
     남겨 두면 12행 전체 기준 값이 걸러진 표 아래 붙어 "이 표의 합계"로 읽힌다(2026-09-16 Codex P1).
     화면에는 왜 사라졌는지 캡션으로 알린다. */
  /* ⚠ 판정은 **필터 상태**지 행 수 비교가 아니다(2026-09-16 Codex 6R P2).
     보이는 행 수와 전체 행 수를 비교하면, 선택지가 하나뿐인 운용사를 고르는 것처럼
     필터가 전 행과 일치할 때 플래그가 꺼져 전체 기준 합계가 "걸러진 표의 합계"로 남는다.
     값이 우연히 같더라도 사용자에게는 필터가 켜진 화면이므로, 상태로 판정한다
     (invest_recovery_detail 의 `filterOn` 과 같은 규약). */
  const filtered = fGp !== '' || fSubFund !== '' || fFrom !== '' || fTo !== '' || fText.trim() !== '';
  const pinnedBottom = filtered ? undefined : tab.pinnedBottom;

  const hasAmount = tab.columns.some((c) => c.type === 'amount');
  const columnDefs = useMemo(() => toColumnDefs(tab, unit), [tab, unit]);

  const exportExcel = useCallback(() => {
    const cols = tab.columns.filter((c) => c.key !== 'no');
    const head = cols.map((c) => (c.type === 'amount' ? amountHeader(c.label, unit) : c.label));
    const body = [...visible, ...(pinnedBottom ?? [])].map((r) => cols.map((c) => {
      const v = r[c.key];
      // 우측정렬 금액만 숫자 셀 — 화면에 보이는 단위를 그대로 따른다(헤더가 단위를 명시한다)
      return c.type === 'amount' && typeof v === 'number' ? Number(formatUnit(v, unit).replace(/,/g, '')) : String(v ?? '');
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = cols.map((c) => ({ wch: c.key === 'title' || c.key === 'agenda' || c.key === 'subFund' ? 30 : 16 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, tab.sheet);
    XLSX.writeFile(wb, `자펀드 전체 보고현황_${tab.label}.xlsx`);
    toast.success(`${tab.label} 표를 Excel로 내보냈습니다`);
  }, [tab, visible, unit, pinnedBottom]);

  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

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
          <FilterChip active={fGp === ''} onClick={() => setFGp('')} count={chipCount('')}>운용사: 전체</FilterChip>
          {gpOptions.map((g) => (
            <FilterChip key={g} active={fGp === g} onClick={() => setFGp(g)} count={chipCount(g)}>{g}</FilterChip>
          ))}
          {chips.filter(([, v]) => v).map(([label, value, clear]) => (
            <span key={label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              {value}
              <button type="button" onClick={clear} aria-label={label + ' 필터 제거'} className="inline-flex items-center justify-center border-0 cursor-pointer" style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          ))}
        </>
      )}
      toolbarRight={<>
        {/* 표가 바뀌었음을 스크린리더에 알린다 — SegTabs는 시각적으로만 바뀌고 표는 통째로 교체된다 */}
        <span className="text-caption" style={{ fontSize: 12 }} aria-live="polite">{tab.label} <b className="text-foreground">{String(visible.length)}</b>건</span>
        {hasAmount && <>
          <span className="text-caption" style={{ fontSize: 12 }}>금액 단위</span>
          <SegTabs size="sm" options={UNITS as unknown as string[]} value={unit} onChange={(v: string) => setUnit(v as Unit)} />
        </>}
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>
        {`모펀드 ${MOTHER_FUND} · ${tab.label} 총 ` + String(tab.rows.length) + '건 중 ' + String(visible.length) + '건 표시 중'}
        {tab.pinnedBottom && filtered && ' · 필터 적용 중이라 원문 소계·합계는 숨김(전체 기준 값이라 부분집합에 맞지 않음)'}
      </span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      {/* 탭마다 컬럼 수가 달라 전환 시 높이가 튄다 — 최소 높이로 점프를 막는다(responsive-ui) */}
      <div style={{ minHeight: 320 }}>
        <AgGridReact<ReportRow>
          key={tab.key}   /* 탭 전환 = 완전 리마운트. 이전 표의 정렬·컬럼 폭이 새 표에 남지 않게 한다 */
          theme={apfsTheme}
          rowData={visible as ReportRow[]}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          pinnedBottomRowData={pinnedBottom as ReportRow[] | undefined}
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
