/* 투자금 회수현황 — 조회 전용 2-모드 화면 (투자자산관리 > 투자기업정보, route `투자금 회수현황`).
   출처: docs/mockups/01_투자자산관리/S1_36_투자_및_회수_상세정보.html (2026-09-15 파싱 실측)

   데이터·컬럼·합계 계산은 `invest_recovery_detail_model.ts` 가 SSOT 다(출처 확정 근거도 거기).

   구성(목업 → 우리 규약):
   - 원문 `조회기준` select(투자및회수 ↔ 전체거래) → 툴바 SegTabs. 바뀌면 **컬럼과 데이터가 함께**
     바뀐다(모드마다 컬럼 수가 14/13으로 다르다). 전환은 aria-live로 통지.
   - 원문 tfoot 4줄(투자/회수/수익/회수총액) → AG Grid `pinnedBottomRowData`.
     데이터 행이 아니라 집계라 rows 에 섞지 않는다(건수·정렬·필터에 끼어든다).
   - 금액 단위(원|백만원|억원) 토글 → `schemas/unit.ts` 공유 SSOT.
   - 원문 확신도 메모(`rv`)가 달린 행은 거래명 옆에 ⚠검토필요 마커로 노출한다.
   - 조회 전용 — 등록/수정 없음. 행 선택도 없다(선택으로 실행할 액션이 없다). */
import './aggrid_shared.css';
import { useState, useMemo, useCallback } from 'react';
import { UI } from './components';
import { mn, useMask } from './mask';
import { Icon } from './icons';
import { GridFrame } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, refreshNoColumn } from './aggrid_theme';
import { Cell } from './schemas/renderers';
import { PeriodPicker } from './ui/period-picker';
import { ReviewMarker } from './review_marker';
import { UNITS, DEFAULT_UNIT, amountHeader } from './schemas/unit';
import type { Unit } from './schemas/unit';
import type { ColumnSpec } from './schemas/types';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams, CellStyle } from 'ag-grid-community';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { RECOVERY_MODES, RECOVERY_TONES, findMode, recoverySummary, SOURCE_COUNTS, DETAIL_ROWS_IR, formatRecoveryUnit } from './invest_recovery_detail_model';
import type { RecoveryRow, RecoveryMode } from './invest_recovery_detail_model';

const { Button, IconBtn, SegTabs, FilterChip } = UI;

const MOTHER_FUND = '농식품모태펀드';   // 원문 검색박스의 읽기전용 `모펀드` 값

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
        return p.value == null ? null : <span className="font-bold tabular">{mn(formatRecoveryUnit(Number(p.value), unit))}</span>;
      }
      const rv = c.key === 'tname' ? p.data?.rv : undefined;
      /* 금액 셀은 공용 Cell(=formatUnit, 백만원 2자리)을 쓰지 않는다 — 이 화면의 표기 규칙은
         원문 applyUnit(백만원 1자리)이다. 나머지 타입은 그대로 Cell 에 맡긴다(마스킹·배지 내장). */
      if (amount) return <span className="tabular">{p.value == null ? '' : mn(formatRecoveryUnit(Number(p.value), unit))}</span>;
      return (
        <span className="inline-flex items-center gap-0.5 min-w-0">
          <Cell col={c} value={p.value} statusDomain={RECOVERY_TONES} unit={unit} />
          {/* ⚠ apfs-grid 규약은 마커를 "라벨에만, 셀 값엔 붙이지 않는다"이지만 **여기는 원문 예외**다 —
              S1_36 원문 자신이 거래명 셀 안에 붙인다(`if(c.k==='tname'&&r.rv)content+=rev('원본 캡처 값',r.rv)`).
              행마다가 아니라 확신도 낮은 3행에만 붙고, 컬럼 전체가 아니라 그 행의 값이 대상이라 헤더로 올릴 수 없다.
              rec 문구도 원문 리터럴 그대로 쓴다(창작 금지). */}
          {rv && <ReviewMarker rec="원본 캡처 값" dat={String(rv)} label={String(p.value ?? '거래명')} />}
        </span>
      );
    },
  };
}

export function InvestRecoveryDetail({ onNav }: { onNav?: (r: string) => void }) {
  const [modeKey, setModeKey] = useState<RecoveryMode['key']>(RECOVERY_MODES[0].key);
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);
  const masked = useMask();

  /* 원문 검색조건(운용사·자펀드·기준일자 범위)을 복원한다 — 2026-09-16 Codex 지적.
     `계정구분`은 원문 select 에 `전체` 외 옵션이 없어(값 도메인 미정) 컨트롤을 만들지 않고,
     `모펀드`는 읽기전용 단일값이라 푸터 캡션으로 둔다. 없는 선택지를 지어내지 않는다. */
  const [fGp, setFGp] = useState('');
  const [fFund, setFFund] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  const mode = findMode(modeKey);
  const columnDefs = useMemo(() => mode.columns.map((c) => toColDef(c, unit)), [mode, unit]);

  const match = useCallback((r: RecoveryRow) => {
    if (fGp && String(r.gp ?? '') !== fGp) return false;
    if (fFund && String(r.fund ?? '') !== fFund) return false;
    const d = String(r.tdate ?? '');
    if (fFrom && !(d >= fFrom)) return false;
    if (fTo && !(d && d <= fTo)) return false;
    return true;
  }, [fGp, fFund, fFrom, fTo]);

  const rows = useMemo(() => mode.rows.filter(match), [mode, match]);
  /* 합계 4줄은 원문 규칙(항상 투자및회수 기준, tgb 별 catSum)을 **걸러진 행에 그대로 적용**한다.
     원문에 필터가 없어 정의되지 않은 상태지만, 계산식 자체는 원문 것이라 값을 지어내지 않는다.
     전체 표시 중이면 원문 캡처 합계와 정확히 일치한다(테스트가 그 동치를 붙잡는다). */
  const pinned = useMemo(() => SUMMARY_ROWS(DETAIL_ROWS_IR.filter(match)), [match]);

  const gpOptions = useMemo(() => [...new Set(mode.rows.map((r) => String(r.gp)))].sort(), [mode]);
  const fundOptions = useMemo(() => [...new Set(mode.rows.map((r) => String(r.fund)))].sort(), [mode]);
  const filterOn = fGp !== '' || fFund !== '' || fFrom !== '' || fTo !== '';

  const exportExcel = useCallback(() => {
    const cols = mode.columns;
    const head = cols.map((c) => (c.type === 'amount' ? amountHeader(c.label, unit) : c.label));
    const body = [...rows, ...pinned].map((r) => cols.map((c) => {
      if (masked) return '';   // 마스크 ON이면 엑셀에도 값을 내보내지 않는다(마스크 경계 = 엑셀까지)
      const v = r[c.key];
      return c.type === 'amount' && typeof v === 'number' ? Number(formatRecoveryUnit(v, unit).replace(/,/g, '')) : String(v ?? '');
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = cols.map((c) => ({ wch: c.key === 'fund' ? 34 : 16 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, mode.sheet);
    XLSX.writeFile(wb, `투자금 회수현황_${mode.label}.xlsx`);
    toast.success(`${mode.label} 표를 Excel로 내보냈습니다`);
  }, [mode, rows, unit, masked, pinned]);

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '투자기업정보', '투자금 회수현황']}
      title="투자금 회수현황"
      favRoute="투자금 회수현황"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={(
        <>
          {/* 조회기준 — 바꾸면 컬럼과 데이터가 함께 바뀐다(원문 select와 같은 동작) */}
          <span className="text-caption" style={{ fontSize: 12 }}>조회기준</span>
          <SegTabs options={RECOVERY_MODES.map((m) => ({ value: m.key, label: m.label }))} value={modeKey}
            onChange={(v: string) => setModeKey(v as RecoveryMode['key'])} />
          <Icon name="filter" size={16} className="text-caption" />
          <FilterChip active={fGp === ''} onClick={() => setFGp('')} count={mn(String(mode.rows.length))}>전체</FilterChip>
          {gpOptions.map((g) => (
            <FilterChip key={g} active={fGp === g} onClick={() => setFGp(g)}
              count={mn(String(mode.rows.filter((r) => String(r.gp) === g).length))}>{g}</FilterChip>
          ))}
        </>
      )}
      toolbarRight={<>
        <span className="text-caption" style={{ fontSize: 12 }} aria-live="polite">{mode.label} <b className="text-foreground">{mn(String(rows.length))}</b>건</span>
        <label className="inline-flex items-center gap-1.5 text-caption" style={{ fontSize: 12 }}>
          자펀드
          <select value={fFund} onChange={(e) => setFFund(e.target.value)} aria-label="자펀드 필터"
            style={{ maxWidth: 180, padding: '5px 8px', fontSize: 12, borderRadius: 8, border: '1px solid var(--input)', background: 'var(--card)', color: 'var(--foreground)' }}>
            <option value="">전체</option>
            {fundOptions.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <span className="inline-flex items-center gap-1.5 text-caption" style={{ fontSize: 12 }}>
          기준일자
          <PeriodPicker mode="day" value={fFrom} onChange={setFFrom} ariaLabel="기준일자 시작일" />
          ~
          <PeriodPicker mode="day" value={fTo} onChange={setFTo} ariaLabel="기준일자 종료일" />
        </span>
        <span className="text-caption" style={{ fontSize: 12 }}>금액 단위</span>
        <SegTabs size="sm" options={UNITS as unknown as string[]} value={unit} onChange={(v: string) => setUnit(v as Unit)} />
        <IconBtn icon="download" label="내보내기 (Excel)" size={34} onClick={exportExcel} />
      </>}
      footerLeft={<span>
        {`모펀드 ${MOTHER_FUND} · 투자및회수 ${SOURCE_COUNTS.ir}건 / 전체거래 ${SOURCE_COUNTS.all}건 (원문 그대로)`}
        {filterOn && ` · 필터 적용 중 — 합계 4줄도 걸러진 행 기준`}
      </span>}
      footerRight={<>
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
      </>}>

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
    </GridFrame>
  );
}
