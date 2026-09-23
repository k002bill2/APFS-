/* ── AG Grid 행선택 컬럼 = DS Checkbox (SSOT) ─────────────────────────────────
   왜: 테마 파라미터(checkbox*)로는 색·모서리만 맞고 크기(iconSize 16)·표식 pop 이 DS `Checkbox`(ui/checkbox.tsx)와
       달라 "그리드만 다른 체크박스"로 보였다(2026-09-18 사용자 지시 "모두 통일"). 선택 컬럼의 셀·헤더를 우리 컴포넌트로
       그려 폼 모달·권한 매트릭스와 완전히 같은 룩/이펙트를 낸다. 선택 상태의 정본은 그대로 AG Grid(rowNode.isSelected).

   사용: <AgGridReact rowSelection={…checkboxes:true…} selectionColumnDef={SELECTION_COL} …/>
         rowSelection 은 손대지 않는다(singleRow/multiRow 규약 →[[apfs-aggrid]]). 전 소비처가 `enableClickSelection:false`
         — 선택은 이 컬럼의 체크박스로만 on/off 한다(2026-09-22 사용자 결정).
   동작:
   - 셀: rowNode 의 'rowSelected' 이벤트를 구독해 체크 상태를 따라간다. 클릭 → node.setSelected(). singleRow 면 AG Grid 가
     다른 행을 알아서 푼다.
   - 헤더(multiRow 만): 전체/일부/없음 3상태(indeterminate). 클릭 → 전부 켜기/끄기(api.selectAll/deselectAll **'filtered'**). singleRow 는 빈 헤더.
     소비처 rowSelection 은 `headerCheckbox:false`(내장 SelectAllFeature 를 끔 → 전체선택 경로는 DS 헤더 하나) + `selectAll:'filtered'`
     (남는 select-all 경로 기본값도 DS 헤더와 같은 범위로 못 박음). 대가: 헤더 **셀**에 포커스한 Space 는 무동작(버튼으로 Tab 하면 정상).
     ⚠ 푸터 `getSelectedRows().length` 는 필터 밖 선택까지 세므로 "N건 선택 + 헤더 미체크" 가 가능하다(의도).
   - 내장 체크박스(.ag-selection-checkbox > ag-checkbox)·헤더 select-all 은 CSS 로 숨긴다(aggrid_selection.css).
   - ⚠ 이중 토글 방지(현재는 방어선): AG Grid 의 행클릭 선택(onRowClick)은 클래스가 아니라 **이벤트 플래그**(`_stopPropagationForAgGrid`,
     내장 체크박스도 같은 방식)로 건너뛴다. 래퍼 div 에 **네이티브** click/dblclick 리스너로 플래그를 세운다 — 네이티브라야
     행(row) 리스너보다 먼저 돌고, DOM 전파는 막지 않으므로 React 루트의 Radix onClick 은 그대로 받는다.
     (React onClick 에서 세우면 이미 행 리스너가 지나간 뒤라 늦다 — 실측: 체크→행클릭 재토글로 즉시 원복.)
     2026-09-22 부터 전 소비처가 `enableClickSelection:false` 라 click 쪽 플래그는 실효가 없지만, **dblclick 플래그는 여전히 필수**
     (체크박스 더블클릭이 행 dblclick=수정 모달로 새지 않게)이고, 어느 화면이 클릭 선택을 다시 켜도 이중 토글이 돌아오지 않게 둘 다 유지한다.
   - 크기: 셀 높이 44 에 20px 박스. 컬럼 폭 44(pinned left)는 기존 SELECTION_COL 값 그대로. */
import React from 'react';
import { _stopPropagationForAgGrid } from 'ag-grid-community';
import type { SelectionColumnDef, ICellRendererParams, IHeaderParams, GridApi } from 'ag-grid-community';
import { Checkbox } from './ui/checkbox';
import './aggrid_selection.css';

/* ⚠ `_stopPropagationForAgGrid` 는 main-internal(semver 비보장) export 다. 업그레이드로 사라지면
   addEventListener('click', undefined) 가 예외 없이 no-op 이 돼 이중 토글이 **조용히** 돌아온다 → 시끄럽게 실패시킨다. */
if (typeof _stopPropagationForAgGrid !== 'function') throw new Error('ag-grid-community 내부 API _stopPropagationForAgGrid 가 사라졌다 — aggrid_selection.tsx 의 이중 토글 가드를 재설계할 것(apfs-aggrid 계약 참조)');

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

function SelectCell({ node }: ICellRendererParams) {
  // pinned 합계행·선택 불가 행에는 그리지 않는다 — pinned 노드는 선택 모델 밖이라 setSelected 가 무시돼 "죽은 체크"가 된다
  // (내장 체크박스는 AG Grid 가 애초에 안 그렸다. 훅 순서 유지를 위해 계산만 먼저, return 은 훅 뒤).
  const dead = !!node.rowPinned || node.selectable === false;
  const guard = useAgGridClickGuard();
  const [sel, setSel] = React.useState<boolean>(!!node.isSelected());
  React.useEffect(() => {
    const h = () => setSel(!!node.isSelected());
    h();
    node.addEventListener('rowSelected', h);
    return () => node.removeEventListener('rowSelected', h);
  }, [node]);
  if (dead) return null;
  // 접근名은 고정 "행 선택" — 행 식별은 AG Grid 의 행/셀 컨텍스트 낭독에 맡긴다. 첫 컬럼 값을 넣으면 화면은 <MT>/mn() 마스크를
  // 통과하는데 접근名은 통과하지 않아 마스크 ON 시 SR 이 인명·코드를 읽는다(독립 리뷰 지적).
  return (
    <div ref={guard} className="apfs-ds-select">
      <Checkbox checked={sel} onCheckedChange={(c) => node.setSelected(c === true)} aria-label="행 선택" />
    </div>
  );
}

type Tri = boolean | 'indeterminate';
function triOf(api: GridApi): Tri {
  let total = 0; let on = 0;
  api.forEachNodeAfterFilter((n) => { if (!n.group && n.selectable !== false) { total++; if (n.isSelected()) on++; } });   // 선택 불가 행은 분모에서 제외(없으면 헤더가 일부 상태에 고착)
  return total > 0 && on === total ? true : on > 0 ? 'indeterminate' : false;
}

/* label = 헤더 시각 텍스트(옵트인, LABELED_SELECTION_COL) — 기본 SELECTION_COL 은 넘기지 않아 체크박스만 그린다 */
function SelectHeader({ api, label }: IHeaderParams & { label?: string }) {
  const guard = useAgGridClickGuard();
  const isMulti = () => { const rs = api.getGridOption('rowSelection'); return typeof rs === 'object' && rs?.mode === 'multiRow'; };
  const [multi, setMulti] = React.useState<boolean>(isMulti);
  const [tri, setTri] = React.useState<Tri>(() => triOf(api));
  React.useEffect(() => {
    const h = () => { setMulti(isMulti()); setTri(triOf(api)); };
    h();
    api.addEventListener('selectionChanged', h);
    api.addEventListener('modelUpdated', h);
    // ⚠ rowSelection 을 런타임에 바꾸는 화면이 생기면 재판정 경로가 필요하다('gridOptionsChanged' 는 공개 이벤트 union 밖).
    //   오늘은 전 소비처가 모듈 상수를 쓰고, generic_list 의 hideRowSelection 은 컬럼 자체를 만들었다 없애 헤더가 재생성된다.
    return () => { api.removeEventListener('selectionChanged', h); api.removeEventListener('modelUpdated', h); };
  }, [api]);
  if (!multi) return label ? <span>{label}</span> : null;
  const box = (
    <div ref={guard} className="apfs-ds-select">
      <Checkbox checked={tri} onCheckedChange={(c) => (c === true ? api.selectAll('filtered') : api.deselectAll('filtered'))} aria-label="전체 행 선택" />
    </div>
  );
  return label ? <span className="inline-flex items-center" style={{ gap: 6 }}>{box}<span>{label}</span></span> : box;
}

/* 공용 선택 컬럼 정의 — 소비처는 이 상수를 그대로 넘긴다(폭·고정·렌더러 SSOT). */
/* 선택 복원 — rowData 가 바뀐 뒤(등록·수정·필터) 체크를 되돌린다. **multiRow 전용 계약**.
   ⚠ 첫 id 만 `node.setSelected(true, true)` 로 되살리면 두 번째 인자(clearSelection)가 나머지 체크를 지워,
     사용자가 아무것도 안 했는데 다건 선택이 1건으로 줄고 이어지는 벌크 삭제 대상이 바뀐다(Codex 리뷰 2026-09-23).
   그래서 ① 저장된 id 집합 밖의 선택을 풀고 ② 살아남은 id 를 additive(`setSelected(true)`)로 다시 켠다.
   행이 사라졌으면(삭제됨) 조용히 건너뛴다 — 호출자는 `getSelectedRows()` 로 다시 동기화된다.
   master-detail 좌 그리드처럼 **라디오(singleRow)** 는 이 헬퍼를 쓰지 않는다(해제 금지 로직이 따로 있다). */
export function restoreSelection(api: GridApi, ids: readonly string[]): void {
  if (!ids.length) return;
  const keep = new Set(ids);
  for (const node of api.getSelectedNodes()) {
    const id = node.id;
    if (id != null && !keep.has(id)) node.setSelected(false);
  }
  for (const id of ids) {
    const node = api.getRowNode(id);
    if (node && !node.isSelected()) node.setSelected(true);
  }
}

export const SELECTION_COL: SelectionColumnDef = {
  pinned: 'left',
  width: 44,
  maxWidth: 44,
  cellRenderer: SelectCell,
  headerComponent: SelectHeader,
  cellClass: 'apfs-ds-select-cell',
  headerClass: 'apfs-ds-select-cell',
};

/* 헤더에 '선택' 텍스트를 함께 그리는 변형 — 원문 목록 첫 `<th>선택</th>` 를 옮기는 화면만 쓴다(수탁 업로드 2리프).
   폭 44 로는 20px 박스 + 한글 2자가 잘려 72 로 넓힌다. 모듈 상수(렌더마다 새 객체면 컬럼 폭이 되돌아간다). */
export const SELECTION_HEADER_LABEL = '선택';
export const LABELED_SELECTION_COL: SelectionColumnDef = {
  ...SELECTION_COL,
  width: 72,
  maxWidth: 72,
  headerName: SELECTION_HEADER_LABEL,
  headerComponentParams: { label: SELECTION_HEADER_LABEL },
};
