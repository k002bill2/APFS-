/* risk_grid.tsx — TableMeta(risk_table_meta.ts) → AG Grid 읽기전용 표. 조기경보 기업정보·자펀드정보·가치평가 15개 typed 화면 공용.

   왜 공용인가: 15개 화면의 표 29장이 같은 셀 규약(정렬·단위 환산·배지·합계행)을 쓴다.
   화면마다 ColDef 를 손으로 쓰면 같은 규약이 29벌 복제돼 한쪽만 고쳐진다 — 규약은 여기 한 곳이다.

   셀 규약(apfs-aggrid "관리형 페이지 그리드 규약"):
   - amount 는 원 단위 저장값을 **렌더 경계에서만** 선택 단위로 환산한다(schemas/unit.ts `formatUnit` SSOT)
   - 값 없음(null) = muted `-` · 합계행의 빈 칸('') = 빈 셀(원문 colspan 영역)
   - 행 선택 없음 — 조회 전용 화면이라 선택이 만드는 액션이 없다(apfs-aggrid "조회 전용 화면은 rowSelection 자체를 두지 않는다")

   폭 전략: 모든 리프가 `flex:1 + minWidth + width:minWidth`(apfs-aggrid ⑨). minWidth 는 헤더·값 글자폭 추정치 —
   열 합이 프레임보다 좁으면 flex 가 채우고(빈 거터 0), 넓으면 minWidth 하한에서 가로 스크롤이 생긴다(잘림 없음).
   ⚠ AG Grid v35 Theming API: 레거시 CSS import 금지. 객체 prop 은 전부 참조 안정(계약 ⑥⑦). */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 보정 + autoHeight sticky 헤더(공유)
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, CellStyle, CellClickedEvent, CellKeyDownEvent, CellValueChangedEvent, ICellRendererParams, GetRowIdParams, RowDoubleClickedEvent, GridApi, GridReadyEvent, SelectionChangedEvent, SelectionColumnDef, RowDataUpdatedEvent } from 'ag-grid-community';
import { UI } from './components';
import { Icon } from './icons';
import { apfsTheme, DEFAULT_COL_DEF } from './aggrid_theme';
import { SELECTION_COL, restoreSelection } from './aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import { toUnit, fromUnit } from './schemas/unit';
import type { Unit } from './schemas/unit';
import type { ColMeta, ColKind, TableMeta, Row, Cell } from './risk_table_meta';
import { groupRuns, computeTotal, amountText } from './risk_table_meta';

const { StatusBadge } = UI;

type Align = 'left' | 'center' | 'right';
const KIND_ALIGN: Record<ColKind, Align> = { text: 'left', center: 'center', date: 'center', amount: 'right', number: 'right', badge: 'center' };
const KIND_MIN: Record<ColKind, number> = { text: 120, center: 96, date: 108, amount: 130, number: 84, badge: 96 };

const ALIGN_STYLE: Record<Align, CellStyle> = {
  left: { display: 'flex', alignItems: 'center' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  right: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums' },
};
const STRONG_STYLE: Record<Align, CellStyle> = {
  left: { ...ALIGN_STYLE.left, fontWeight: 700 },
  center: { ...ALIGN_STYLE.center, fontWeight: 700 },
  right: { ...ALIGN_STYLE.right, fontWeight: 700 },
};

/* 글자폭 추정 — 한글/전각 ≈ 1em, 그 외 ≈ 0.62em (Pretendard 14px 셀 실측 근사, 약간 넉넉히). 폭 하한 산정 전용 */
const WIDE = /[\u1100-\uFFFF]/;
const textWidth = (s: string, px = 14) => [...s].reduce((w, ch) => w + (WIDE.test(ch) ? px : px * 0.62), 0);

type UnitDigits = TableMeta['unitDigits'];

/** 표시 문자열 — 엑셀이 아닌 화면 전용. digits = 표가 선언한 단위별 소수 자릿수(없으면 공용 formatUnit) */
export function displayText(c: ColMeta, v: Cell, unit: Unit | null, digits?: UnitDigits): string {
  if (v == null) return '-';
  if (typeof v === 'string') return v;
  if (c.kind === 'amount') return amountText(v, unit ?? '원', digits);
  if (c.fixed != null) return v.toFixed(c.fixed);
  return v.toLocaleString();
}

function minWidthOf(c: ColMeta, rows: readonly Row[], unit: Unit | null, digits?: UnitDigits): number {
  /* 좌우 패딩 + 정렬 아이콘 자리 */
  const head = textWidth(c.label, 13.5) + 44;
  const body = Math.max(0, ...rows.map((r) => textWidth(displayText(c, r[c.key], unit, digits)) + (c.kind === 'badge' ? 50 : c.link ? 58 : 38)));
  /* c.width 는 하한(원문이 넓게 잡은 칸) — 내용이 더 길면 내용이 이긴다(잘림 금지). 상한 420 = 긴 주소·조합명 캡 */
  return Math.round(Math.min(420, Math.max(c.width ?? 0, KIND_MIN[c.kind], head, body)));
}

const Dash = () => <span style={{ color: 'var(--muted-foreground)' }}>-</span>;

/* 팝업 트리거 셀 — fund_early_warning.tsx YieldCell 과 같은 계약:
   탭 스톱은 `.ag-cell` 하나(자식에 tabIndex/role 금지), ARIA 는 포커스를 받는 gridcell 에 useEffect 로 싣는다. */
function LinkCell({ p, label }: { p: ICellRendererParams<Row>; label: string }) {
  const cell = p.eGridCell;
  const v = p.value as Cell;
  useEffect(() => {
    if (!cell || v == null) return;
    cell.setAttribute('aria-haspopup', 'dialog');
    cell.setAttribute('aria-label', `${`${String(v)} — `}${label} 팝업 열기 (클릭 또는 Enter)`);
    return () => { cell.removeAttribute('aria-haspopup'); cell.removeAttribute('aria-label'); };
  }, [cell, v, label]);
  if (v == null) return <Dash />;
  return (
    <span title={`${label} (클릭 또는 Enter)`} className="inline-flex items-center gap-1 min-w-0 font-semibold"
      style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
      <span className="min-w-0 truncate">{String(v)}</span>
      <Icon name="external" size={13} stroke={2.2} className="shrink-0" />
    </span>
  );
}

/** 칸 전용 렌더러 — 원문이 값 대신 조작 UI(입력칸·체크박스·스위치·행 버튼)를 그리는 칸. 합계행에는 쓰지 않는다.
    열 키 → (행) → 노드. 메타(risk_table_meta)를 React 비의존으로 두려고 표 선언이 아니라 ReadGrid prop 으로 받는다. */
export type CellRenderers = Record<string, (row: Row) => React.ReactNode>;

function renderer(c: ColMeta, unit: Unit | null, linkLabel: string, custom?: (row: Row) => React.ReactNode, digits?: UnitDigits) {
  return (p: ICellRendererParams<Row>) => {
    // 편집 셀은 valueGetter 가 선택 단위 숫자를 주므로(편집기 초기값용) 원 단위 저장값을 직접 읽는다
    const v = (c.editable ? p.data?.[c.key] : p.value) as Cell;
    const pinned = !!p.node.rowPinned;
    if (custom && !pinned && p.data) return custom(p.data);
    if (pinned && v === '') return null;                      // 합계행 colspan 영역
    if (c.link && !pinned) return <LinkCell p={p} label={linkLabel} />;
    if (v == null) return <Dash />;
    const neg = c.neg && typeof v === 'number' && v < 0;
    const color = neg ? 'var(--danger-text)' : undefined;
    if (pinned && typeof v === 'string') return <span className="font-bold" style={{ color: v === '-' ? 'var(--muted-foreground)' : undefined }}>{v}</span>;
    switch (c.kind) {
      case 'badge':
        return <StatusBadge tone={c.tones?.[String(v)] ?? c.tone ?? 'muted'} label={String(v)} size="lg" dot={false} />;
      case 'text':
      case 'center':
        return <span className="min-w-0 truncate">{String(v)}</span>;
      default: {
        const zero = v === 0;
        const box = c.editable && !pinned
          ? { border: '1px solid var(--border-strong)', borderRadius: 7, padding: '3px 9px', background: 'var(--card)', minWidth: 72, textAlign: 'right' as const, cursor: 'text' }
          : undefined;
        return (
          <span className="tabular-nums" style={{ color: color ?? (zero ? 'var(--muted-foreground)' : undefined), ...box }}>
            {displayText(c, v, unit, digits)}
          </span>
        );
      }
    }
  };
}

function leafDef(c: ColMeta, rows: readonly Row[], unit: Unit | null, linkLabel: string, custom?: CellRenderers, digits?: UnitDigits): ColDef<Row> {
  const align = c.align ?? KIND_ALIGN[c.kind];
  const w = minWidthOf(c, rows, unit, digits);
  return {
    colId: c.key,
    field: c.key,
    headerName: c.label,
    flex: c.flex ?? 1, minWidth: w, width: w,
    pinned: c.pinned ? 'left' : undefined,
    cellStyle: c.strong ? STRONG_STYLE[align] : ALIGN_STYLE[align],
    headerClass: align === 'right' ? 'ag-right-aligned-header' : undefined,
    cellRenderer: renderer(c, unit, linkLabel, custom?.[c.key], digits),
    ...(c.editable ? {
      editable: (p) => !p.node.rowPinned,
      singleClickEdit: true,
      cellEditor: 'agNumberCellEditor',
      // 편집기는 화면 단위로 보여주고 받는다 → 저장은 원 단위(unit.ts 저장 계약)로 되돌린다
      valueGetter: (p) => { const w = p.data?.[c.key]; return typeof w === 'number' ? toUnit(w, unit ?? '원') : w; },
      valueParser: (p) => fromUnit(p.newValue, unit ?? '원'),
    } as Partial<ColDef<Row>> : {}),
    /* 조작 칸(입력칸·체크박스·스위치·행 버튼) — Tab 을 그리드 셀 이동이 아니라 브라우저 기본 이동에 맡겨
       셀 안 컨트롤에 키보드로 닿게 한다.
       셀 안 입력칸에서는 모든 키를 입력칸에 준다 — 안 그러면 방향키·Home/End 가 그리드 셀 이동이 돼 포커스를 뺏는다
       (React onKeyDown 의 stopPropagation 은 그리드의 네이티브 리스너보다 늦어 막지 못한다 — 2026-09-23 실측) */
    ...(custom?.[c.key] ? { suppressKeyboardEvent: (p) => p.event.key === 'Tab' || (p.event.target as HTMLElement | null)?.tagName === 'INPUT' } as Partial<ColDef<Row>> : {}),
  };
}

/** TableMeta → ColDef/ColGroupDef. 연속 같은 group 은 한 ColGroupDef(marryChildren)로 접는다.
    호출부는 `useMemo(..., [table, unit])` 로 참조를 고정한다(렌더마다 새 배열 = 폭 되돌림). */
export function buildColumnDefs(table: TableMeta, rows: readonly Row[], unit: Unit | null, linkLabel = '상세', custom?: CellRenderers): (ColDef<Row> | ColGroupDef<Row>)[] {
  return groupRuns(table.cols).map((run) => (run.group
    ? { headerName: run.group, marryChildren: true, children: run.cols.map((c) => leafDef(c, rows, unit, linkLabel, custom, table.unitDigits)) }
    : leafDef(run.cols[0], rows, unit, linkLabel, custom, table.unitDigits)));
}

const getRowId = (p: GetRowIdParams<Row>) => p.data.id;
export const DEFAULT_EMPTY = '조회된 데이터가 없습니다.';

/* 행 선택(opt-in) — 선택이 액션(수정·삭제)을 만드는 화면만 켠다(apfs-aggrid "조회 전용 화면은 rowSelection 자체를 두지 않는다").
   체크박스로만 on/off(행 본문 클릭 선택 없음, 2026-09-22 사용자 결정) · 헤더 전체선택은 SELECTION_COL 의 DS 헤더가 그린다.
   모듈 상수 — 렌더마다 새 객체면 컬럼 폭이 되돌아간다. */
const ROW_SELECTION = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false } as const;

export interface ReadGridProps {
  table: TableMeta;
  /** 필터 결과 행(미지정 = table.rows). 합계행은 이 행들로 다시 계산한다 */
  rows?: Row[];
  /** 금액 단위(토글이 있는 화면만). null 이면 원 단위 그대로 */
  unit?: Unit | null;
  /** link 컬럼 셀 클릭/Enter/Space → 팝업. 참조 안정(useCallback) 필수 */
  onLink?: (row: Row) => void;
  /** link 컬럼 팝업 이름(접근名·툴팁) */
  linkLabel?: string;
  /** editable 칸 값 변경 */
  onEdit?: (row: Row, key: string, value: number) => void;
  /** 행 더블클릭 · 행 셀 Enter → 행 단위 팝업(수정 등). 참조 안정(useCallback) 필수 */
  onRowOpen?: (row: Row) => void;
  /** 표 접근名(여러 표가 쌓인 화면에서 구분) */
  ariaLabel?: string;
  /** 행 다중선택(체크박스). 선택 행은 onSelect 로 올린다 */
  selectable?: boolean;
  onSelect?: (rows: Row[]) => void;
  /** 선택 컬럼 정의(미지정 = SELECTION_COL). 헤더 텍스트가 필요한 화면만 LABELED_SELECTION_COL 등 모듈 상수를 넘긴다 */
  selectionCol?: SelectionColumnDef;
  /** 선택 SSOT(페이지 state 의 선택 id) — rowData 가 바뀐 뒤(수정·활성 전이·필터) restoreSelection 으로 체크를 되살린다 */
  selectedIds?: readonly string[];
  /** 그리드 API(선택 해제 등) — 페이지가 ref 로 받는다 */
  apiRef?: React.MutableRefObject<GridApi<Row> | null>;
  /** 칸 전용 렌더러(열 키별). 참조 안정(useMemo) 필수 — 바뀌면 컬럼 정의가 다시 만들어진다 */
  cellRenderers?: CellRenderers;
}

export function ReadGrid({ table, rows, unit = null, onLink, linkLabel = '상세', onEdit, onRowOpen, ariaLabel, selectable, onSelect, selectionCol = SELECTION_COL, selectedIds, apiRef, cellRenderers }: ReadGridProps) {
  const data = rows ?? table.rows;
  const columnDefs = useMemo(() => buildColumnDefs(table, table.rows, unit, linkLabel, cellRenderers), [table, unit, linkLabel, cellRenderers]);
  const pinned = useMemo(() => {
    const t = computeTotal({ ...table, rows: data });
    return t ? [t] : undefined;
  }, [table, data]);
  const linkCol = useMemo(() => table.cols.find((c) => c.link)?.key, [table]);
  const empty = table.empty ?? DEFAULT_EMPTY;
  /* ⚠ `overlayNoRowsTemplate` 은 rowData 가 빈 경우만, 필터로 0행이면 v35 는 `noMatchingRows` 를 쓴다 — 둘 다 한글로 덮는다 */
  const locale = useMemo(() => ({ noRowsToShow: empty, noMatchingRows: empty }), [empty]);
  const overlay = useMemo(() => `<span style="padding:24px 0;display:inline-block;color:var(--muted-foreground);font-size:13px">${empty}</span>`, [empty]);

  const onCellClicked = useCallback((e: CellClickedEvent<Row>) => {
    if (!linkCol || !onLink || e.rowPinned || !e.data || e.column?.getColId() !== linkCol) return;
    onLink(e.data);
  }, [linkCol, onLink]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<Row>) => {
    if (e.rowPinned || !e.data) return;
    const ev = e.event as KeyboardEvent | null;
    if (!ev) return;
    if (linkCol && onLink && e.column?.getColId() === linkCol && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();   // Space 스크롤 방지
      onLink(e.data);
      return;
    }
    if (onRowOpen && ev.key === 'Enter') { ev.preventDefault(); onRowOpen(e.data); }
  }, [linkCol, onLink, onRowOpen]);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<Row>) => {
    if (!onRowOpen || e.rowPinned || !e.data) return;
    onRowOpen(e.data);
  }, [onRowOpen]);
  const onCellValueChanged = useCallback((e: CellValueChangedEvent<Row>) => {
    if (!onEdit || !e.data || !e.colDef.field) return;
    // e.newValue 는 저장 후 valueGetter 로 다시 읽은 **화면 단위** 값이다 — 원 단위 저장값(data)을 넘긴다
    onEdit(e.data, e.colDef.field, Number(e.data[e.colDef.field]) || 0);
  }, [onEdit]);
  const onGridReady = useCallback((e: GridReadyEvent<Row>) => { if (apiRef) apiRef.current = e.api; }, [apiRef]);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<Row>) => { onSelect?.(e.api.getSelectedRows()); }, [onSelect]);
  /* 선택 복원 — 페이지 state 가 SSOT(apfs-aggrid "선택 배선": multiRow 복원은 공유 헬퍼 하나로만). ref 로 최신 id 를 읽는다 */
  const selRef = useRef(selectedIds);
  selRef.current = selectedIds;
  const onRowDataUpdated = useCallback((e: RowDataUpdatedEvent<Row>) => { if (selRef.current) restoreSelection(e.api, selRef.current); }, []);

  return (
    /* apfs-grid-min: 1~2행 autoHeight 그리드의 AG Grid 기본 최소 본문높이(150px)를 48px 로 낮춘다(aggrid_shared.css) */
    <div className="apfs-grid-min" role="region" aria-label={ariaLabel ?? table.title}>
      <AgGridReact<Row>
        theme={apfsTheme}
        rowData={data}
        columnDefs={columnDefs}
        getRowId={getRowId}
        pinnedBottomRowData={pinned}
        domLayout="autoHeight"
        defaultColDef={DEFAULT_COL_DEF}
        onCellClicked={onLink ? onCellClicked : undefined}
        onCellKeyDown={onLink || onRowOpen ? onCellKeyDown : undefined}
        onRowDoubleClicked={onRowOpen ? onRowDoubleClicked : undefined}
        onCellValueChanged={onEdit ? onCellValueChanged : undefined}
        rowSelection={selectable ? ROW_SELECTION : undefined}
        selectionColumnDef={selectable ? selectionCol : undefined}
        onSelectionChanged={selectable ? onSelectionChanged : undefined}
        onRowDataUpdated={selectable && selectedIds ? onRowDataUpdated : undefined}
        onGridReady={apiRef ? onGridReady : undefined}
        stopEditingWhenCellsLoseFocus
        localeText={locale}
        overlayNoRowsTemplate={overlay}
      />
    </div>
  );
}

/* ──────────────────────────────
   섹션 헤더 — 한 GridFrame 안에 표를 세로로 쌓는 화면의 경계(골드 ew_result_manage.tsx SectionHead)
────────────────────────────── */
export function SectionHead({ n, title, cap, actions }: { n?: string | number; title: string; cap?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap" style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
      {n != null && (
        <span aria-hidden className="inline-flex items-center justify-center shrink-0 font-bold"
          style={{ width: 20, height: 20, borderRadius: 6, fontSize: 12, background: 'color-mix(in srgb, var(--primary) 13%, transparent)', color: 'var(--primary)' }}>{n}</span>
      )}
      {/* preflight:false — h4 는 UA 기본 마진이 살아 있어 m-0 필수 */}
      <h4 className="font-bold m-0" style={{ fontSize: 15 }}>{title}</h4>
      {cap && <span className="text-caption inline-flex items-center" style={{ fontSize: 12.5 }}>{cap}</span>}
      {actions && <div className="ml-auto flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}
