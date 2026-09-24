/* 투자금 회수현황 — 조회 전용 2-모드 화면 (투자자산관리 > 투자기업정보, route `투자금 회수현황`).
   출처: docs/mockups/01_투자자산관리/S1_36_투자_및_회수_상세정보.html (2026-09-15 파싱 실측)

   데이터·컬럼·합계 계산은 `invest_recovery_detail_model.ts` 가 SSOT 다(출처 확정 근거도 거기).

   구성(목업 → 우리 규약):
   - 원문 `조회기준` select(투자및회수 ↔ 전체거래) → 툴바 좌측 기본 필터 칩(FilterChip). 바뀌면 **컬럼과 데이터가 함께**
     바뀐다(모드마다 컬럼 수가 14/13으로 다르다). 전환은 aria-live로 통지.
   - 원문 tfoot 4줄(투자/회수/수익/회수총액) → AG Grid `pinnedBottomRowData`.
     데이터 행이 아니라 집계라 rows 에 섞지 않는다(건수·정렬·필터에 끼어든다).
   - 금액 단위(원|백만원|억원) 토글 → `schemas/unit.ts` 공유 SSOT.
   - 조회 전용 — 등록/수정 없음. 행 선택도 없다(선택으로 실행할 액션이 없다).
   - 검색조건(2026-09-24 apfs-detail-filter typed 트랙으로 재구성 — 정본 audit_log.tsx):
     주 필터 = 조회기준 FilterChip(툴바 좌 첫 줄, facet count — 모드 전환) + 적용 칩(값만·항목별·×) +
     상세필터 드로어(원문 순서: 운용사·자펀드·계정구분·기준일자 범위 한 항목). 판정은 모델 `filterRecovery`.
     종전엔 운용사 칩·자펀드 select·기준일자 picker 가 툴바에 흩어져 있었고, 칩 건수가 다른 필터를
     무시했으며(facet 아님), 원문 계정구분(농식품·수산)이 "옵션 없음"으로 잘못 빠져 있었다. */
import './aggrid_shared.css';
import { useState, useMemo, useCallback } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, refreshNoColumn } from './aggrid_theme';
import { Cell } from './schemas/renderers';
import { controlMinWidth, drawerInputStyle as inputStyle } from './schemas/renderers';
import { PeriodPicker } from './ui/period-picker';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { UNITS, DEFAULT_UNIT, amountHeader } from './schemas/unit';
import type { Unit } from './schemas/unit';
import type { ColumnSpec } from './schemas/types';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams, CellStyle } from 'ag-grid-community';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { RECOVERY_MODES, RECOVERY_TONES, RECOVERY_ACCOUNTS, findMode, recoverySummary, filterRecovery, DETAIL_ROWS_IR, formatRecoveryUnit } from './invest_recovery_detail_model';
import type { RecoveryRow, RecoveryMode, RecoveryFilter } from './invest_recovery_detail_model';

const { Button, IconBtn, SegTabs, FilterChip } = UI;

const MOTHER_FUND = '농식품모태펀드';   // 원문 검색박스의 읽기전용 `모펀드` 값

/* 드로어 프리미티브 — audit_log.tsx 복사 관례(apfs-detail-filter typed 트랙) */
function DrawerField({ label, children, plain }: { label: string; children: ReactNode; plain?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </Wrap>
  );
}
function DrawerSelect({ value, onChange, options, all = '전체' }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; all?: string | null }) {
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32, maxWidth: '100%' }}>
        {all != null && <option value="">{all}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}
const dayWrap: CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };

/* 합계 행은 거래명 칸에 라벨을 넣고 나머지 식별 컬럼은 비운다(원문 tfoot: `합계` + 구분 라벨). */
const SUMMARY_ROWS = (source: readonly RecoveryRow[]): RecoveryRow[] =>
  recoverySummary(source).map((s, i) => ({
    id: 'sum-' + i, gp: '합계', tname: s.label,
    ...(s.prin == null ? {} : { prin: s.prin }),
    ...(s.prof == null ? {} : { prof: s.prof }),
  }));

function toColDef(c: ColumnSpec, unit: Unit): ColDef<RecoveryRow> {
  const right = c.align === 'right';
  const amount = c.type === 'amount';
  const style: CellStyle = { display: 'flex', alignItems: 'center', textAlign: (c.align || 'left') as never, ...(right ? { justifyContent: 'flex-end' } : {}) };
  return {
    field: c.key as never,
    // 금액 헤더는 컬럼 원문 단위(c.unit) 대신 **선택 단위**를 적는다 — 둘을 같이 적으면 "거래원금(원) (억원)"이 된다.
    headerName: amount ? amountHeader(c.label, unit) : c.label,
    ...(c.key === 'fund' ? { minWidth: 240, maxWidth: 360 } : { minWidth: 110, maxWidth: 260 }),
    ...(c.pinned ? { pinned: c.pinned } : {}),   // 와이드 표에서 식별 컬럼을 붙잡아 둔다
    type: right ? 'rightAligned' : undefined,
    cellStyle: style,
    cellRenderer: (p: ICellRendererParams<RecoveryRow>) => {
      // 합계 행: 식별 컬럼을 비우고 gp 칸에만 '합계'를 남긴다(원문 colspan 표현의 그리드 대응).
      if (p.node?.rowPinned) {
        if (c.key === 'gp') return <span className="font-bold">합계</span>;
        if (c.key === 'tname') return <span className="font-bold">{String(p.value ?? '')}</span>;
        if (!amount) return null;
        return p.value == null ? null : <span className="font-bold tabular">{formatRecoveryUnit(Number(p.value), unit)}</span>;
      }
      /* 금액 셀은 공용 Cell(=formatUnit, 백만원 2자리)을 쓰지 않는다 — 이 화면의 표기 규칙은
         원문 applyUnit(백만원 1자리)이다. 나머지 타입은 그대로 Cell 에 맡긴다(배지 내장). */
      if (amount) return <span className="tabular">{p.value == null ? '' : formatRecoveryUnit(Number(p.value), unit)}</span>;
      return (
        <span className="inline-flex items-center gap-0.5 min-w-0">
          <Cell col={c} value={p.value} statusDomain={RECOVERY_TONES} unit={unit} />
        </span>
      );
    },
  };
}

export function InvestRecoveryDetail({ onNav }: { onNav?: (r: string) => void }) {
  const [modeKey, setModeKey] = useState<RecoveryMode['key']>(RECOVERY_MODES[0].key);
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);

  /* 검색조건 상태 SSOT — 드로어·툴바 칩·적용 칩이 모두 여기서 파생한다(즉시 적용, audit_log 동형). */
  const [fGp, setFGp] = useState('');
  const [fFund, setFFund] = useState('');
  const [fAcc, setFAcc] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const clearFilters = () => { setFGp(''); setFFund(''); setFAcc(''); setFFrom(''); setFTo(''); };

  const mode = findMode(modeKey);
  const columnDefs = useMemo(() => mode.columns.map((c) => toColDef(c, unit)), [mode, unit]);

  const f: RecoveryFilter = useMemo(() => ({ gp: fGp, fund: fFund, acc: fAcc, from: fFrom, to: fTo }), [fGp, fFund, fAcc, fFrom, fTo]);
  const rows = useMemo(() => filterRecovery(mode.rows, f), [mode, f]);
  /* 조회기준 칩 건수 = 그 모드의 행에 현재 조건을 건 결과(facet) — 누르기 전에 몇 건을 보게 될지 보여 준다 */
  const modeCount = (m: RecoveryMode) => String(filterRecovery(m.rows, f).length);
  /* 합계 4줄은 원문 규칙(항상 투자및회수 기준, tgb 별 catSum)을 **걸러진 행에 그대로 적용**한다.
     원문에 필터가 없어 정의되지 않은 상태지만, 계산식 자체는 원문 것이라 값을 지어내지 않는다.
     전체 표시 중이면 원문 캡처 합계와 정확히 일치한다(테스트가 그 동치를 붙잡는다). */
  const pinned = useMemo(() => SUMMARY_ROWS(filterRecovery(DETAIL_ROWS_IR, f)), [f]);

  const gpOptions = useMemo(() => [...new Set(mode.rows.map((r) => String(r.gp)))].sort(), [mode]);
  const fundOptions = useMemo(() => [...new Set(mode.rows.map((r) => String(r.fund)))].sort(), [mode]);
  const filterOn = fGp !== '' || fFund !== '' || fAcc !== '' || fFrom !== '' || fTo !== '';

  /* 적용 칩 — 항목별 개별 칩, 값만 표시(드로어 항목 전부). */
  const chips: [string, string, () => void][] = [
    ['운용사', fGp, () => setFGp('')],
    ['자펀드', fFund, () => setFFund('')],
    ['계정구분', fAcc, () => setFAcc('')],
    ['기준일자', fFrom || fTo ? `${fFrom || '…'} ~ ${fTo || '…'}` : '', () => { setFFrom(''); setFTo(''); }],
  ];
  const refresh = () => { clearFilters(); toast.success('새로고침했습니다'); };

  const exportExcel = useCallback(() => {
    const cols = mode.columns;
    const head = cols.map((c) => (c.type === 'amount' ? amountHeader(c.label, unit) : c.label));
    const body = [...rows, ...pinned].map((r) => cols.map((c) => {
      const v = r[c.key];
      return c.type === 'amount' && typeof v === 'number' ? Number(formatRecoveryUnit(v, unit).replace(/,/g, '')) : String(v ?? '');
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = cols.map((c) => ({ wch: c.key === 'fund' ? 34 : 16 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, mode.sheet);
    XLSX.writeFile(wb, `투자금 회수현황_${mode.label}.xlsx`);
    toast.success(`${mode.label} 표를 Excel로 내보냈습니다`);
  }, [mode, rows, unit, pinned]);

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '투자기업정보', '투자금 회수현황']}
      title="투자금 회수현황"
      favRoute="투자금 회수현황"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={(
        <>
          {/* 기본(주) 필터 = 조회기준(2026-09-24 사용자 지시). 깔때기 아이콘 뒤 첫 칩 줄이다.
              바꾸면 컬럼과 데이터가 함께 바뀐다(원문 select와 같은 동작). 건수 = 그 모드에 나머지 조건을 건 facet. */}
          <Icon name="filter" size={16} className="text-caption" />
          {RECOVERY_MODES.map((m) => (
            <FilterChip key={m.key} active={modeKey === m.key} onClick={() => setModeKey(m.key)} count={modeCount(m)}>{m.label}</FilterChip>
          ))}
        </>
      )}
      appliedFilters={chips.map(([label, value, onClear]) => ({ label, value, onClear }))}
      toolbarRight={<>
        <span className="text-muted-foreground" style={{ fontSize: 13 }}>금액 단위</span>
        <SegTabs size="sm" options={UNITS as unknown as string[]} value={unit} onChange={(v: string) => setUnit(v as Unit)} />
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span aria-live="polite">
        {`총 ${mode.rows.length}건 중 ${rows.length}건 표시 중 · ${mode.label} · 모펀드 ${MOTHER_FUND}`}
        {filterOn && ' · 합계 4줄도 걸러진 행 기준'}
      </span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      {/* 모드마다 컬럼 수가 달라 전환 시 높이가 튄다 — 최소 높이로 점프를 막는다 */}
      <div style={{ minHeight: 320 }}>
        <AgGridReact<RecoveryRow>
          key={mode.key}   /* 모드 전환 = 완전 리마운트. 이전 표의 정렬·컬럼 폭이 새 표에 남지 않게 한다 */
          theme={apfsTheme}
          rowData={rows as RecoveryRow[]}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          pinnedBottomRowData={pinned}
          onModelUpdated={refreshNoColumn}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다.</span>'}
        />
      </div>
      <p className="text-caption" style={{ fontSize: 11.5, margin: '10px 2px 0' }}>
        하단 합계 4줄은 원문과 같이 항상 <b>투자및회수</b> 데이터로 계산합니다 — 전체거래에는 전환·주식변동 등 순현금흐름이 아닌 행이 섞여 있습니다.
      </p>

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">투자금 회수현황을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {/* 항목·순서 = 원문 검색박스 그대로(운용사·자펀드·계정구분·기준일자). 검색어는 원문에 없어 OFF. */}
            <DrawerField label="운용사"><DrawerSelect value={fGp} onChange={setFGp} options={gpOptions.map((g) => ({ value: g, label: g }))} /></DrawerField>
            <DrawerField label="자펀드"><DrawerSelect value={fFund} onChange={setFFund} options={fundOptions.map((v) => ({ value: v, label: v }))} /></DrawerField>
            <DrawerField label="계정구분"><DrawerSelect value={fAcc} onChange={setFAcc} options={RECOVERY_ACCOUNTS.map((a) => ({ value: a, label: a }))} /></DrawerField>
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
