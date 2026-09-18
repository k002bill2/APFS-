/* ── AG Grid 행선택 컬럼 = DS Checkbox (SSOT) ─────────────────────────────────
   왜: 테마 파라미터(checkbox*)로는 색·모서리만 맞고 크기(iconSize 16)·표식 pop 이 DS `Checkbox`(ui/checkbox.tsx)와
       달라 "그리드만 다른 체크박스"로 보였다(2026-09-18 사용자 지시 "모두 통일"). 선택 컬럼의 셀·헤더를 우리 컴포넌트로
       그려 폼 모달·권한 매트릭스와 완전히 같은 룩/이펙트를 낸다. 선택 상태의 정본은 그대로 AG Grid(rowNode.isSelected).

   사용: <AgGridReact rowSelection={…checkboxes:true…} selectionColumnDef={SELECTION_COL} …/>
         rowSelection 은 손대지 않는다(singleRow/multiRow·enableClickSelection 규약 →[[apfs-aggrid]]).
   동작:
   - 셀: rowNode 의 'rowSelected' 이벤트를 구독해 체크 상태를 따라간다. 클릭 → node.setSelected(). singleRow 면 AG Grid 가
     다른 행을 알아서 푼다.
   - 헤더(multiRow 만): 전체/일부/없음 3상태(indeterminate). 클릭 → 전부 켜기/끄기(api.selectAll/deselectAll). singleRow 는 빈 헤더.
   - 내장 체크박스(.ag-selection-checkbox > ag-checkbox)·헤더 select-all 은 CSS 로 숨긴다(aggrid_selection.css).
   - ⚠ 이중 토글 방지: AG Grid 의 행클릭 선택(onRowClick)은 클래스가 아니라 **이벤트 플래그**(`_stopPropagationForAgGrid`,
     내장 체크박스도 같은 방식)로 건너뛴다. 래퍼 div 에 **네이티브** click/dblclick 리스너로 플래그를 세운다 — 네이티브라야
     행(row) 리스너보다 먼저 돌고, DOM 전파는 막지 않으므로 React 루트의 Radix onClick 은 그대로 받는다.
     (React onClick 에서 세우면 이미 행 리스너가 지나간 뒤라 늦다 — 실측: 체크→행클릭 재토글로 즉시 원복.)
   - 크기: 셀 높이 44 에 20px 박스. 컬럼 폭 44(pinned left)는 기존 SELECTION_COL 값 그대로. */
import React from 'react';
import { _stopPropagationForAgGrid } from 'ag-grid-community';
import type { SelectionColumnDef, ICellRendererParams, IHeaderParams, RowNode, GridApi } from 'ag-grid-community';
import { Checkbox } from './ui/checkbox';
import './aggrid_selection.css';

/* 래퍼에 AG Grid 전파 차단 플래그를 세우는 네이티브 리스너(위 주석). dblclick 도 막아 더블클릭=수정 모달이 열리지 않게 한다. */
function useAgGridClickGuard() {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    el.addEventListener('click', _stopPropagationForAgGrid);
    el.addEventListener('dblclick', _stopPropagationForAgGrid);
    return () => { el.removeEventListener('click', _stopPropagationForAgGrid); el.removeEventListener('dblclick', _stopPropagationForAgGrid); };
  }, []);
  return ref;
}

function SelectCell({ node, api }: ICellRendererParams) {
  const guard = useAgGridClickGuard();
  const [sel, setSel] = React.useState<boolean>(!!node.isSelected());
  React.useEffect(() => {
    const h = () => setSel(!!node.isSelected());
    h();
    node.addEventListener('rowSelected', h);
    return () => node.removeEventListener('rowSelected', h);
  }, [node]);
  // 행 라벨: 첫 표시 컬럼 값(있으면) — SR 에 "행 선택" 만 반복되지 않게. 없으면 rowIndex.
  const label = React.useMemo(() => {
    const cols = api.getAllDisplayedColumns().filter((c) => c.getColId() !== 'ag-Grid-SelectionColumn');
    const first = cols[0];
    const v = first ? api.getCellValue({ rowNode: node as RowNode, colKey: first, useFormatter: true }) : null;
    return v != null && String(v) !== '' ? `행 선택 ${String(v)}` : `행 선택 ${(node.rowIndex ?? 0) + 1}`;
  }, [api, node]);
  return (
    <div ref={guard} className="apfs-ds-select">
      <Checkbox checked={sel} onCheckedChange={(c) => node.setSelected(c === true)} aria-label={label} />
    </div>
  );
}

type Tri = boolean | 'indeterminate';
function triOf(api: GridApi): Tri {
  let total = 0; let on = 0;
  api.forEachNodeAfterFilter((n) => { if (!n.group) { total++; if (n.isSelected()) on++; } });
  return total > 0 && on === total ? true : on > 0 ? 'indeterminate' : false;
}

function SelectHeader({ api }: IHeaderParams) {
  const guard = useAgGridClickGuard();
  const multi = (() => { const rs = api.getGridOption('rowSelection'); return typeof rs === 'object' && rs?.mode === 'multiRow'; })();
  const [tri, setTri] = React.useState<Tri>(() => triOf(api));
  React.useEffect(() => {
    if (!multi) return;
    const h = () => setTri(triOf(api));
    h();
    api.addEventListener('selectionChanged', h);
    api.addEventListener('modelUpdated', h);
    return () => { api.removeEventListener('selectionChanged', h); api.removeEventListener('modelUpdated', h); };
  }, [api, multi]);
  if (!multi) return null;
  return (
    <div ref={guard} className="apfs-ds-select">
      <Checkbox checked={tri} onCheckedChange={(c) => (c === true ? api.selectAll('filtered') : api.deselectAll('filtered'))} aria-label="전체 행 선택" />
    </div>
  );
}

/* 공용 선택 컬럼 정의 — 소비처는 이 상수를 그대로 넘긴다(폭·고정·렌더러 SSOT). */
export const SELECTION_COL: SelectionColumnDef = {
  pinned: 'left',
  width: 44,
  maxWidth: 44,
  cellRenderer: SelectCell,
  headerComponent: SelectHeader,
  cellClass: 'apfs-ds-select-cell',
  headerClass: 'apfs-ds-select-cell',
};
