/* 운용사 정량지표 등록 / 수정 팝업 — 원본 S2_71_운용사_정량지표_등록.html · S2_72_운용사_정량지표_수정.html
   (둘 다 S2_70 목록 화면의 팝업으로 이미 병합돼 있다 — 원문 openReg()/openEdit()).

   원문 구조(두 팝업 공통, 설계메모 "수정 팝업 구조로 통일")
   - 제목 + 도움말(?) — 안내문구 미정이라 원문도 자리표시 토스트만 띄운다
   - 운용사 유형 select(6종). 수정 팝업은 선택 시 그 유형의 지표 7종 그리드를 다시 불러온다(원문 renderEditGrid)
   - 편집 그리드: 사용(체크) · 지표구분 · 정상 · 주의 · 경고(표시 전용, 빈 값 '–') · 입력항목
     입력항목 컴포넌트는 **등록=텍스트 입력 / 수정=체크박스** — 원문이 "의도된 차이"라 못박았다(구조 통일 대상 아님)
   - 행추가(지표구분·기준을 직접 입력하는 새 행) · 행삭제(선택 행). 원문은 행 클릭 선택이었으나, 그리드를 AG Grid 로
     옮기면서(2026-09-28) 프로젝트 규약대로 **선택 체크박스 열(SELECTION_COL)로만** 고른다(행 본문 클릭 선택 없음, 2026-09-22 결정).
   - 저장 · 닫기. 저장은 원문처럼 토스트만(백엔드 없음 — 목록 데이터는 바꾸지 않는다).

   우리 규약: Radix Dialog(apfs-form-modal 모달 크롬 — 헤더/푸터 px-[46px]), DS Checkbox(라벨 래핑 금지 → aria-label),
   입력 박스 34px(CONTROL_BOX SSOT), 토큰 색만. 편집 그리드 = AG Grid(apfs-aggrid) — 행 데이터 SSOT 는 React state(rows),
   셀은 입력·체크박스 렌더러가 patch() 로 되쓴다(AG Grid 는 getRowId 로 diff). */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellStyle, ColDef, GetRowIdParams, GridApi, ICellRendererParams, RowSelectionOptions, SuppressKeyboardEventParams } from 'ag-grid-community';
import { UI } from './components';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { toast } from './ui/sonner';
import { drawerInputStyle } from './schemas/renderers';
import { apfsTheme, DEFAULT_COL_DEF } from './aggrid_theme';
import { SELECTION_COL } from './aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import './aggrid_shared.css';
import { MGR_TYPES, INDICATORS, metricsFor } from './risk_subfund_info_data';

const { Button, IconBtn, SaveButton } = UI;

export type QuantModalMode = 'create' | 'edit';

interface EditRow { id: string; use: boolean; ind: string; ok: string; warn: string; bad: string; inp: boolean; inpText: string; isNew: boolean }
type Patch = (id: string, p: Partial<EditRow>) => void;

let seq = 0;
const nid = () => `qr-${++seq}`;
/* 등록 = 원문 presetRow(ind,'','','','text') — 사용 미체크 · 기준 빈 값 · 입력항목 텍스트 */
const presetRows = (): EditRow[] => INDICATORS.map((ind) => ({ id: nid(), use: false, ind, ok: '', warn: '', bad: '', inp: false, inpText: '', isNew: false }));
/* 수정 = 원문 dataRow(metricsFor(type)) */
const loadRows = (type: string): EditRow[] => metricsFor(type).map((d) => ({ id: nid(), ...d, inpText: '', isNew: false }));
const newRow = (): EditRow => ({ id: nid(), use: false, ind: '', ok: '', warn: '', bad: '', inp: false, inpText: '', isNew: true });

const input: React.CSSProperties = { ...drawerInputStyle('text'), width: '100%', minWidth: 0 };
const dash = (v: string) => (v ? v : <span className="text-muted-foreground">–</span>);
const nameOf = (r: EditRow) => r.ind || '신규 지표';

/* ── 그리드 모듈 상수(apfs-aggrid 계약 6 — 렌더마다 새 객체면 컬럼 폭이 되돌아간다) ── */
/* 정렬 끔: 편집 그리드라 정렬이 커서 아래 행 순서를 바꾸고 "새 행 = 마지막 행"(행추가 포커스)을 깬다. 참조 안정이 목적이라 공용 상수를 펼쳐 쓴다. */
const EDIT_COL_DEF = { ...DEFAULT_COL_DEF, sortable: false } as const;
const ROW_SELECTION: RowSelectionOptions<EditRow> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };
const getRowId = (p: GetRowIdParams<EditRow>) => p.data.id;
const CENTER: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const MID: CellStyle = { display: 'flex', alignItems: 'center' };
/* 셀 안 입력칸·체크박스(Radix = button role=checkbox)의 키는 그리드에 넘기지 않는다 — 방향키가 셀 이동으로, Space 가 행 선택 토글로
   새지 않게. Tab 은 브라우저 기본 이동(셀 안 컨트롤에 키보드로 닿게). React stopPropagation 은 그리드 네이티브 리스너보다 늦다(risk_grid 실측). */
const suppressCtrlKeys = (p: SuppressKeyboardEventParams) => p.event.key === 'Tab' || !!(p.event.target as HTMLElement | null)?.closest?.('input,button');

/* 행 선택 체크박스와 별개인 "사용" / 수정 모드 "입력항목" 체크박스 */
const boolCell = (field: 'use' | 'inp', label: string, patch: Patch) => (p: ICellRendererParams<EditRow>) =>
  p.data ? <Checkbox checked={!!p.data[field]} onCheckedChange={(v) => patch(p.data!.id, { [field]: v === true })} aria-label={`${nameOf(p.data)} ${label}`} /> : null;

/* 셀 입력칸 — 값은 로컬 state 가 즉시 들고, patch() 는 뒤따라 rows(SSOT)에 되쓴다.
   ⚠ value 를 p.data 에서 직접 읽는 controlled input 이면 안 된다: setRows → AG Grid rowData 반영이 비동기라, 그 사이 React 가
   옛 p.data 값으로 input 을 되돌려 타이핑이 유실된다(2026-09-28 실측 "abc def" → "bef"). 셀 렌더러는 행 id 가 같으면
   재마운트되지 않으므로 로컬 state 가 유지된다. */
function CellInput({ row, field, placeholder, label, patch }: { row: EditRow; field: 'ind' | 'ok' | 'warn' | 'bad' | 'inpText'; placeholder?: string; label: string; patch: Patch }) {
  const [v, setV] = useState(row[field]);
  return <input type="text" value={v} placeholder={placeholder} aria-label={label}
    onChange={(e) => { setV(e.target.value); patch(row.id, { [field]: e.target.value }); }} style={input} />;
}

/* 텍스트 칸 — 신규 행이면 입력칸, 기존 행이면 표시 전용(빈 값 '–'). always=true 는 등록 모드 입력항목(전 행 입력) */
const textCell = (field: 'ind' | 'ok' | 'warn' | 'bad' | 'inpText', placeholder: string, label: string, patch: Patch, always = false) => (p: ICellRendererParams<EditRow>) => {
  const r = p.data; if (!r) return null;
  if (!always && !r.isNew) return field === 'ind' ? r.ind : dash(r[field]);
  return <CellInput row={r} field={field} placeholder={placeholder || undefined} label={always ? `${nameOf(r)} ${label}` : `신규 지표 ${label}`} patch={patch} />;
};

/* 컬럼 — AG Grid 는 그 컬럼 field 값이 바뀔 때만 셀을 다시 그리므로 렌더러가 읽는 필드와 field 를 일치시킨다
   (입력항목: 등록=inpText / 수정=inp). 폭: 사용·입력항목 = compact 고정(계약 10), 텍스트 칸 = flex + width:minWidth(계약 9). */
const makeCols = (mode: QuantModalMode, patch: Patch): ColDef<EditRow>[] => [
  { field: 'use', headerName: '사용', width: 64, minWidth: 64, maxWidth: 64, cellStyle: CENTER, cellRenderer: boolCell('use', '사용', patch), suppressKeyboardEvent: suppressCtrlKeys },
  { field: 'ind', headerName: '지표구분', flex: 1.4, minWidth: 160, width: 160, cellStyle: MID, cellRenderer: textCell('ind', '지표구분', '지표구분', patch), suppressKeyboardEvent: suppressCtrlKeys },
  { field: 'ok', headerName: '정상', flex: 1, minWidth: 110, width: 110, cellStyle: CENTER, cellRenderer: textCell('ok', '예: 75 이상', '정상 기준', patch), suppressKeyboardEvent: suppressCtrlKeys },
  { field: 'warn', headerName: '주의', flex: 1, minWidth: 110, width: 110, cellStyle: CENTER, cellRenderer: textCell('warn', '예: 50 이상', '주의 기준', patch), suppressKeyboardEvent: suppressCtrlKeys },
  { field: 'bad', headerName: '경고', flex: 1, minWidth: 110, width: 110, cellStyle: CENTER, cellRenderer: textCell('bad', '예: 50 미만', '경고 기준', patch), suppressKeyboardEvent: suppressCtrlKeys },
  mode === 'create'
    ? { field: 'inpText', headerName: '입력항목', width: 150, minWidth: 150, maxWidth: 150, cellStyle: CENTER, cellRenderer: textCell('inpText', '', '입력항목', patch, true), suppressKeyboardEvent: suppressCtrlKeys }
    : { field: 'inp', headerName: '입력항목', width: 104, minWidth: 104, maxWidth: 104, cellStyle: CENTER, cellRenderer: boolCell('inp', '입력항목', patch), suppressKeyboardEvent: suppressCtrlKeys },
];

export function GpQuantIndicatorModal({ mode, preType, onClose }: { mode: QuantModalMode; preType?: string; onClose: () => void }) {
  const dlgRef = useRef<DialogHandle>(null);
  const apiRef = useRef<GridApi<EditRow> | null>(null);
  const gridBoxRef = useRef<HTMLDivElement>(null);
  const focusIdRef = useRef<string | null>(null);   // 행추가 직후 포커스할 새 행 id
  const [type, setType] = useState(preType ?? (mode === 'edit' ? '증권회사' : MGR_TYPES[0]));
  const [rows, setRows] = useState<EditRow[]>(() => (mode === 'edit' ? loadRows(preType ?? '증권회사') : presetRows()));
  const [selCount, setSelCount] = useState(0);
  const title = mode === 'create' ? '운용사 정량지표 등록' : '운용사 정량지표 수정';

  const patch = useCallback<Patch>((id, p) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r))), []);
  const columnDefs = useMemo(() => makeCols(mode, patch), [mode, patch]);
  const syncSel = () => setSelCount(apiRef.current?.getSelectedRows().length ?? 0);

  const changeType = (t: string) => {
    setType(t);
    if (mode === 'edit') setRows(loadRows(t));   // 원문: 수정 팝업만 유형 선택 시 그리드 갱신(새 id → 선택은 자동 소멸, onRowDataUpdated 가 건수 재동기화)
  };
  const addRow = () => {
    const r = newRow();
    focusIdRef.current = r.id;
    setRows((rs) => [...rs, r]);
  };
  /* 원문: 새 행의 첫 텍스트 입력으로 포커스 — React 셀 렌더러는 rowDataUpdated 뒤에 붙으므로 한 프레임 미룬다 */
  const onRowDataUpdated = () => {
    syncSel();
    const id = focusIdRef.current; if (!id) return;
    focusIdRef.current = null;
    requestAnimationFrame(() => gridBoxRef.current?.querySelector<HTMLInputElement>(`.ag-center-cols-container [row-id="${id}"] input[type=text]`)?.focus());
  };
  const deleteRows = () => {
    const api = apiRef.current;
    const ids = new Set((api?.getSelectedRows() ?? []).map((r) => r.id));
    if (ids.size === 0) { toast.error('삭제할 행을 선택하세요'); return; }
    setRows((rs) => rs.filter((r) => !ids.has(r.id)));
    api?.deselectAll();
    setSelCount(0);
    toast.success(`${ids.size}개 행 삭제됨`);
  };
  const save = () => {
    toast.success(mode === 'create' ? '등록되었습니다' : '수정되었습니다');
    dlgRef.current?.close();
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[860px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-center gap-1.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">{title}</DialogTitle>
            {/* 원문 도움말(?) — 안내문구 미정(원문도 자리표시 토스트) */}
            <IconBtn icon="help-circle" label="도움말" size={30} onClick={() => toast.info('도움말 안내문구는 아직 정의되지 않았습니다')} />
            <DialogDescription className="sr-only">운용사 유형별 정량지표 사용여부와 입력항목을 설정합니다</DialogDescription>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]" style={{ fontSize: 13.5 }}>
          <label className="flex items-center gap-2.5 mb-4" style={{ width: 'fit-content' }}>
            <span className="font-semibold text-muted-foreground" style={{ fontSize: 13.5 }}>운용사 유형</span>
            <select value={type} onChange={(e) => changeType(e.target.value)} style={drawerInputStyle('select')}>
              {MGR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <div ref={gridBoxRef} role="region" aria-label={`${title} — 지표별 사용여부·기준·입력항목. 선택 체크박스로 고른 뒤 행삭제`}>
            <AgGridReact<EditRow>
              theme={apfsTheme}
              rowData={rows}
              columnDefs={columnDefs}
              defaultColDef={EDIT_COL_DEF}
              getRowId={getRowId}
              domLayout="autoHeight"
              rowSelection={ROW_SELECTION}
              selectionColumnDef={SELECTION_COL}
              onGridReady={(e) => { apiRef.current = e.api; }}
              onSelectionChanged={syncSel}
              onRowDataUpdated={onRowDataUpdated}
              overlayNoRowsTemplate="지표가 없습니다. 행추가로 새 지표를 입력하세요."
            />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button variant="outline" size="sm" leadingIcon="plus" onClick={addRow}>행추가</Button>
            <Button variant="outline" size="sm" leadingIcon="trash" onClick={deleteRows}>행삭제</Button>
            <span className="text-caption" aria-live="polite" style={{ fontSize: 12.5 }}>{selCount > 0 ? `${selCount}개 행 선택됨` : '체크박스로 행 선택'}</span>
          </div>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton size="md" leadingIcon="" onSubmit={() => save}>저장</SaveButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
