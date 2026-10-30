/* 회계 > 기초관리 > 결산양식 관리 — 화면ID ACC-002 (SFR-016-12 · SFR-016-13 · SFR-018-01). 셀 안에서 바로 고치는 편집 그리드.
   카드 제목·브레드크럼은 메뉴 리프 라벨(결산양식 관리)이다(apfs-grid 타이틀 규약).

   설계서 → 우리 규약
   - 양식구분(재무상태표/손익계산서, 필수) = 툴바 주 필터 칩 2개(GridFrame `filterChips`, 정기보고 관용구). 필수라 '전체' 칩이 없고
     항상 1개만 active — active 칩을 다시 눌러도 해제되지 않는다. 양식구분마다 행 세트가 따로이고, 바꾸면 그 세트를 다시 불러온다.
     (설계서 콤보박스·'양식구분을 선택하세요' 검증은 미선택 상태가 없어 두지 않는다.)
   - 툴바 우: 상세필터 · 행추가 · 저장 · 조회.
   - 행 작업(행삽입 · 행삭제 · 위로이동 · 아래로이동)은 선택 바(GridFrame `contextActions` — 관리형 선택 바 규약,
     정기보고·자펀드 관리 관용구)에 둔다. 체크박스로 1건 이상 고르면 툴바 좌측 칩 자리가 `N건 선택됨 · 작업 · 선택 해제`로
     바뀌고, 툴바가 화면 밖이면 플로팅 바로 옮겨 간다. 단건 작업(행삽입·위로·아래로)은 1건일 때만 노출(참고 화면의
     `single &&` 규약 — 다건이면 숨김), 경계 행에서 위로/아래로는 비활성. 행삭제는 다건 허용.
   - 그리드 9열: 선택 · 괄호 · 레벨(1~6) · 출력명 · 출력명(영문) · 계정코드 · 계정코드명([검색]) · 계정코드명(영문) · 출력위치.
     행 순서가 곧 출력 순서라 정렬은 끈다. 선택은 체크박스로만(전체선택 헤더 없음 — 사용자 결정).
     별도 상태 열은 두지 않는다(설계서 9열 원형 — 사용자 결정). 삭제(D) 행만 흐림+취소선으로 구분된다.
   - 행 상태 I/U/D 는 행에 싣는다(closing_form_data.ts). 삭제(D) 행은 저장 전까지 흐림+취소선으로 남고,
     다시 골라 [행삭제]를 누르면 직전 상태로 복구된다. 신규(I) 행 삭제는 즉시 제거.
   - 계정코드·계정코드명은 직접 입력하지 않고 [검색] → 계정과목 검색 팝업(ACC-001 공통)으로만 채운다.
   - 상세필터 = 계정코드명(텍스트 + [검색]) 1개, 부분일치. 검색어 박스(searchable)는 두지 않는다.
   - 저장(E03): 양식구분 → 변경 건수 → 편집 행 검증(위반 셀 빨간 테두리) → 저장 중 → "N건 저장되었습니다".
   한계: 백엔드가 없어 저장은 화면 안 저장본(양식구분별)만 바꾼다 — 새로고침하면 더미로 돌아간다. */
import '../../aggrid_shared.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type {
  CellClassParams, CellStyle, ColDef, GetRowIdParams, GridApi, ICellRendererParams, RowClassParams,
  RowSelectionOptions, SelectionChangedEvent, SuppressKeyboardEventParams,
} from 'ag-grid-community';
import * as XLSX from 'xlsx';
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF } from '../../aggrid_theme';
import { SELECTION_COL, dropHiddenSelection, restoreSelection } from '../../aggrid_selection';
import { Checkbox } from '../../ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { drawerInputStyle } from '../../schemas/renderers';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import { AccountSearchModal } from '../account_search_modal';
import type { AccountItem } from '../account_data';
import {
  FORM_KINDS, OUT_POS, LEVELS, seedRows, reloadRows, appendBlank, insertAbove, patchRow, toggleDelete, moveRow, canMove,
  changedCount, validateRows, commitRows, passesFilter,
} from './closing_form_data';
import type { ClosingRow, ErrField, FormKind, OutPos } from './closing_form_data';

const { Button, IconBtn, SaveButton } = UI;
const LABEL = '결산양식 관리';

type Patch = (id: string, p: Parameters<typeof patchRow>[2]) => void;

/* ── 그리드 모듈 상수(렌더마다 새 객체면 컬럼 폭이 되돌아간다 — apfs-aggrid) ── */
/* 정렬 끔 — 행 순서가 출력 순서(데이터)다 */
const EDIT_COL_DEF = { ...DEFAULT_COL_DEF, sortable: false } as const;
const ROW_SELECTION: RowSelectionOptions<ClosingRow> = {
  mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false,
};
const getRowId = (p: GetRowIdParams<ClosingRow>) => p.data.id;
const MID: CellStyle = { display: 'flex', alignItems: 'center' };
/* 삭제(D) 행 — 흐림 + 입력값 취소선. rowClassRules 키는 classList 토큰이라 공백 없는 단일 클래스로 나눠 둔다 */
const ROW_CLASS_RULES = {
  'opacity-50': (p: RowClassParams<ClosingRow>) => p.data?.status === 'D',
  '[&_input]:line-through': (p: RowClassParams<ClosingRow>) => p.data?.status === 'D',
  '[&_.cf-text]:line-through': (p: RowClassParams<ClosingRow>) => p.data?.status === 'D',
};
/* 저장 검증 위반 셀 — 빨간 안쪽 테두리 */
const errRule = (f: ErrField) => ({
  'shadow-[inset_0_0_0_2px_var(--danger)]': (p: CellClassParams<ClosingRow>) => !!p.data?.err?.includes(f),
});
/* 셀 안 입력·select·체크박스·버튼의 키는 그리드에 넘기지 않는다 — 방향키가 셀 이동으로, Space 가 행 선택으로 새지 않게.
   Tab 은 브라우저 기본 이동(셀 안 컨트롤에 키보드로 닿게). React stopPropagation 은 그리드 네이티브 리스너보다 늦다(gp_quant 관용구) */
const suppressCtrlKeys = (p: SuppressKeyboardEventParams) => p.event.key === 'Tab' || !!(p.event.target as HTMLElement | null)?.closest?.('input,button,select');

const inputBox: React.CSSProperties = { ...drawerInputStyle('text'), height: 30, minHeight: 30, padding: '0 8px', width: '100%', minWidth: 0 };
const selectBox: React.CSSProperties = {
  fontFamily: 'inherit', fontSize: 13.5, lineHeight: '18px', height: 30, padding: '0 4px', boxSizing: 'border-box', maxWidth: '100%',
  cursor: 'pointer', border: '1px solid var(--input)', borderRadius: 7, background: 'var(--card)', color: 'var(--foreground)',
};
/* 셀 컨트롤 접근명 = 표시 행 순번("3행 출력명") — 편집 중인 값을 넣으면 타이핑마다 접근명이 바뀐다 */
const rowNo = (p: ICellRendererParams<ClosingRow>) => `${(p.node.rowIndex ?? 0) + 1}행`;

/* 셀 입력칸 — 값은 로컬 state 가 즉시 들고 patch() 가 뒤따라 rows(SSOT)에 되쓴다(gp_quant CellInput 관용구 —
   p.data 를 직접 묶으면 rowData 반영 전 재렌더가 타이핑을 되돌린다). 조회 때는 행 id 를 새로 발급해 이 로컬 상태도 새로 시작한다. */
type TextField = 'name' | 'nameEn' | 'acctNameEn';
function CellInput({ row, field, label, patch }: { row: ClosingRow; field: TextField; label: string; patch: Patch }) {
  const [v, setV] = useState(row[field]);
  return (
    <input type="text" value={v} aria-label={label} disabled={row.status === 'D'}
      onChange={(e) => { setV(e.target.value); patch(row.id, { [field]: e.target.value }); }} style={inputBox} />
  );
}

const textCell = (field: TextField, label: string, patch: Patch) => (p: ICellRendererParams<ClosingRow>) =>
  p.data ? <CellInput row={p.data} field={field} label={`${rowNo(p)} ${label}`} patch={patch} /> : null;

const makeCols = (patch: Patch, openSearch: (r: ClosingRow) => void): ColDef<ClosingRow>[] => [
  { field: 'paren', headerName: '괄호', width: 72, minWidth: 72, maxWidth: 72, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys,
    cellRenderer: (p: ICellRendererParams<ClosingRow>) => p.data
      ? <Checkbox checked={p.data.paren} disabled={p.data.status === 'D'} aria-label={`${rowNo(p)} 괄호 적용`}
          onCheckedChange={(v) => patch(p.data!.id, { paren: v === true })} />
      : null },
  { field: 'level', headerName: '레벨', width: 84, minWidth: 84, maxWidth: 84, cellStyle: MID, cellClassRules: errRule('level'), suppressKeyboardEvent: suppressCtrlKeys,
    cellRenderer: (p: ICellRendererParams<ClosingRow>) => p.data
      ? (
        <select value={p.data.level} aria-label={`${rowNo(p)} 레벨`} disabled={p.data.status === 'D'} style={selectBox}
          onChange={(e) => patch(p.data!.id, { level: Number(e.target.value) })}>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      )
      : null },
  { field: 'name', headerName: '출력명', flex: 1, minWidth: 150, width: 150, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys, cellRenderer: textCell('name', '출력명', patch) },
  { field: 'nameEn', headerName: '출력명(영문)', flex: 1, minWidth: 150, width: 150, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys, cellRenderer: textCell('nameEn', '출력명(영문)', patch) },
  /* 계정코드 — 표시 전용(검색으로만 채움). 코드라 좌측 정렬 */
  { field: 'acctCode', headerName: '계정코드', width: 104, minWidth: 104, cellStyle: MID,
    cellRenderer: (p: ICellRendererParams<ClosingRow>) => <span className="cf-text tabular">{p.value || <span className="text-caption">–</span>}</span> },
  { field: 'acctName', headerName: '계정코드명', flex: 1, minWidth: 190, width: 190, cellStyle: MID, cellClassRules: errRule('acctName'), suppressKeyboardEvent: suppressCtrlKeys,
    cellRenderer: (p: ICellRendererParams<ClosingRow>) => p.data
      ? (
        <span className="flex items-center gap-1.5 min-w-0 w-full">
          <span className="cf-text min-w-0 flex-1 truncate">{p.data.acctName || <span className="text-caption">미선택</span>}</span>
          <Button variant="outline" size="sm" disabled={p.data.status === 'D'} onClick={() => openSearch(p.data!)}>검색<span className="sr-only"> {rowNo(p)} 계정코드명</span></Button>
        </span>
      )
      : null },
  { field: 'acctNameEn', headerName: '계정코드명(영문)', flex: 1, minWidth: 160, width: 160, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys, cellRenderer: textCell('acctNameEn', '계정코드명(영문)', patch) },
  { field: 'pos', headerName: '출력위치', width: 100, minWidth: 100, maxWidth: 100, cellStyle: MID, cellClassRules: errRule('pos'), suppressKeyboardEvent: suppressCtrlKeys,
    cellRenderer: (p: ICellRendererParams<ClosingRow>) => p.data
      ? (
        <select value={p.data.pos} aria-label={`${rowNo(p)} 출력위치`} disabled={p.data.status === 'D'} style={selectBox}
          onChange={(e) => patch(p.data!.id, { pos: e.target.value as OutPos })}>
          {OUT_POS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )
      : null },
];

/* 엑셀 — 설계서 그리드 컬럼 순서 그대로(선택 체크박스는 값이 아니라 빼고 데이터 8열) */
const EXCEL_COLS: [string, (r: ClosingRow) => string | number][] = [
  ['괄호', (r) => (r.paren ? 'Y' : 'N')], ['레벨', (r) => r.level], ['출력명', (r) => r.name], ['출력명(영문)', (r) => r.nameEn],
  ['계정코드', (r) => r.acctCode], ['계정코드명', (r) => r.acctName], ['계정코드명(영문)', (r) => r.acctNameEn], ['출력위치', (r) => r.pos],
];

type SearchTarget = null | { kind: 'row'; id: string; keyword: string } | { kind: 'filter'; keyword: string };

export function ClosingFormManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<ClosingRow> | null>(null);
  const gridBoxRef = useRef<HTMLDivElement>(null);
  const focusIdRef = useRef<string | null>(null);         // 행추가·행삽입 직후 첫 입력칸으로 포커스할 행
  const selIdsRef = useRef<string[]>([]);                 // 이동 후 선택 재적용용(onRowDataUpdated)

  /* 양식구분별 저장본 — 조회(E04)·양식구분 전환은 여기서 새 id 로 다시 만든다. 저장(E03)이 갱신한다 */
  const [saved, setSaved] = useState<Record<FormKind, ClosingRow[]>>(() => ({ 재무상태표: seedRows('재무상태표'), 손익계산서: seedRows('손익계산서') }));
  const [kind, setKind] = useState<FormKind>('재무상태표');
  const kindRef = useRef(kind); kindRef.current = kind;
  /* 저장 중(SaveButton 지연 400ms) — 그리드·행 작업·양식구분·조회·상세필터를 잠가 사이 편집 자체를 막는다.
     그래서 검증을 통과한 스냅샷이 곧 저장할 행이다 */
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (gridBoxRef.current) gridBoxRef.current.inert = saving; }, [saving]);
  const [rows, setRows] = useState<ClosingRow[]>(() => reloadRows(saved['재무상태표']));
  const [selIds, setSelIds] = useState<string[]>([]);
  const [search, setSearch] = useState<SearchTarget>(null);

  /* 상세필터 — 계정코드명 부분일치. 드로어는 사본(draft)을 고치고 [필터 적용] 때 반영 */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fAcct, setFAcct] = useState('');
  const [fDraft, setFDraft] = useState('');
  const openFilter = () => { setFDraft(fAcct); setFilterOpen(true); };
  const passes = useMemo(() => passesFilter(fAcct), [fAcct]);
  /* 필터가 바뀌면 선택을 전부 해제(2026-10-27 사용자 결정 — filter_clears_selection 가드) */
  useEffect(() => { apiRef.current?.onFilterChanged(); apiRef.current?.deselectAll(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => Boolean(fAcct.trim()), [fAcct]);
  const doesExternalFilterPass = useCallback((n: { data?: ClosingRow }) => (n.data ? passes(n.data) : true), [passes]);
  const shownCount = useMemo(() => rows.filter(passes).length, [rows, passes]);

  const patch = useCallback<Patch>((id, p) => setRows((rs) => patchRow(rs, id, p)), []);
  const openSearch = useCallback((r: ClosingRow) => setSearch({ kind: 'row', id: r.id, keyword: r.acctName }), []);
  const columnDefs = useMemo(() => makeCols(patch, openSearch), [patch, openSearch]);

  const onSelectionChanged = useCallback((e: SelectionChangedEvent<ClosingRow>) => {
    const ids = e.api.getSelectedRows().map((r) => r.id);
    selIdsRef.current = ids;
    setSelIds(ids);
  }, []);
  const clearSelection = () => { apiRef.current?.deselectAll(); selIdsRef.current = []; setSelIds([]); };

  /* 행 데이터가 바뀐 뒤 — ① 이동한 행에 선택 재적용 ② 상태·오류가 바뀐 셀 다시 그리기(셀은 자기 field 가 바뀔 때만
     다시 그려지므로 D 비활성·오류 테두리를 반영하려면 강제 갱신. 렌더러 인스턴스는 유지돼 입력칸 로컬 상태는 남는다)
     ③ 새 행 첫 입력칸 포커스 */
  const onRowDataUpdated = () => {
    const api = apiRef.current; if (!api) return;
    restoreSelection(api, selIdsRef.current);
    api.refreshCells({ force: true });
    const id = focusIdRef.current; if (!id) return;
    focusIdRef.current = null;
    requestAnimationFrame(() => gridBoxRef.current?.querySelector<HTMLInputElement>(`.ag-center-cols-container [row-id="${id}"] input[type=text]`)?.focus());
  };

  /* 양식구분 전환(칩) — 그 양식의 저장본으로(미저장 변경분은 버린다). active 칩 재클릭·저장 중은 무시 */
  const changeKind = (k: FormKind) => {
    if (saving || k === kind) return;
    clearSelection();
    setKind(k);
    setRows(reloadRows(saved[k]));
  };
  /* E04 조회 — 현재 조건(양식구분·상세필터)으로 저장본 재로딩, 상태 초기화 */
  const refresh = () => {
    if (saving) return;   // 저장 중 잠금(⌥R 단축키 경로 포함)
    clearSelection();
    setRows(reloadRows(saved[kind]));
    toast.success('조회되었습니다');
  };
  /* E02 행추가 */
  const addRow = () => {
    const { rows: next, id } = appendBlank(rows);
    focusIdRef.current = id;
    setRows(next);
    toast.success('빈 행이 목록 하단에 추가됨(편집 모드)');
  };
  const single = selIds.length === 1 ? selIds[0] : null;
  /* E06 행삽입 */
  const insertRow = () => {
    if (!single) return;
    const { rows: next, id } = insertAbove(rows, single);
    if (!id) return;
    focusIdRef.current = id;
    setRows(next);
    toast.success('선택 행 위에 빈 행 삽입');
  };
  /* E07 행삭제 — 토글(D 행은 복구) */
  const deleteRows = () => {
    if (!selIds.length) return;
    const r = toggleDelete(rows, selIds);
    clearSelection();
    setRows(r.rows);
    if (r.deleted) toast.success('선택 행 삭제(저장 전까지 복구 가능)' + (r.restored ? ` · ${r.restored}건 복구` : ''));
    else toast.success(`선택 행 ${r.restored}건 복구`);
  };
  /* E08/E09 이동 — 필터로 숨은 행은 건너뛴다. 선택은 onRowDataUpdated 가 옮긴 행에 다시 건다 */
  const move = (dir: -1 | 1) => {
    if (!single) return;
    const next = moveRow(rows, single, dir, passes);
    if (!next) return;
    setRows(next);
    toast.success(dir < 0 ? '선택 행 출력 순서 한 칸 위로' : '선택 행 출력 순서 한 칸 아래로');
  };
  const canUp = !!single && canMove(rows, single, -1, passes);
  const canDown = !!single && canMove(rows, single, 1, passes);

  /* E03 저장 — SaveButton 계약: 검증 실패 = undefined(스피너 없음), 통과 = commit 함수 */
  const save = () => {
    if (changedCount(rows) === 0) { toast.info('변경된 내용이 없습니다'); return; }
    const v = validateRows(rows);
    if (v.invalid) {
      setRows(v.rows);
      toast.error(`입력값을 확인하세요 — ${v.invalid}개 행의 표시된 칸(레벨 1~6 · 출력위치 · 계정코드명은 [검색]으로 선택)`);
      return;
    }
    const snapshot = v.rows;   // 검증 통과한 스냅샷 — 이것만 저장한다
    setSaving(true);
    return () => {
      setSaving(false);
      /* 잠금으로 막히지만, 그래도 양식구분이 바뀌었으면 다른 양식 화면에 쓰지 않고 알린다(조용히 버리지 않음) */
      if (kindRef.current !== kind) { toast.error(`양식구분이 바뀌어 ${kind} 저장을 취소했습니다`); return; }
      const n = changedCount(snapshot);
      const committed = commitRows(snapshot);
      setSaved((s) => ({ ...s, [kind]: committed }));
      clearSelection();
      setRows(committed);
      toast.success(`${n}건 저장되었습니다`);
    };
  };

  /* E11 내보내기 — 현재 조회 결과(양식구분·상세필터 적용). 저장 전 삭제(D) 행은 뺀다 */
  const exportExcel = () => {
    const body = rows.filter((r) => passes(r) && r.status !== 'D').map((r) => EXCEL_COLS.map(([, get]) => get(r)));
    const ws = XLSX.utils.aoa_to_sheet([EXCEL_COLS.map(([h]) => h), ...body]);
    ws['!cols'] = EXCEL_COLS.map(([h]) => ({ wch: h === '레벨' || h === '괄호' ? 6 : h === '출력위치' || h === '계정코드' ? 10 : 22 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, String(kind));
    XLSX.writeFile(wb, `${LABEL}_${kind}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };
  /* 상세필터·계정과목 검색 팝업이 덮고 있으면 뒤 그리드 인쇄·내보내기 단축키를 끈다(⌘P 는 입력창에서도 발화) */
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: !filterOpen && !search });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !filterOpen && !search });

  /* 계정과목 검색 반영 — 행이면 코드/명을 그 행에, 필터면 드로어 사본에 */
  const onPickAccount = (a: AccountItem) => {
    if (search?.kind === 'row') patch(search.id, { acctCode: a.code, acctName: a.name });
    else if (search?.kind === 'filter') setFDraft(a.name);
  };

  /* 선택 컨텍스트 액션 — GridFrame 이 툴바 좌측과 하단 플로팅 바 **중 한 곳에만** 렌더한다(contextActions 슬롯).
     선택 중엔 깔때기·양식구분 칩이 빠지고 이 묶음이 대신한다. 단건 작업은 1건일 때만(`single`), 저장 중엔 전부 잠근다 */
  const selActions = selIds.length > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selIds.length)}건 선택됨</span>
      {single && <Button variant="outline" size="sm" leadingIcon="plus" disabled={saving} onClick={insertRow}>행삽입</Button>}
      <Button variant="outline" size="sm" leadingIcon="trash" disabled={saving} onClick={deleteRows}>행삭제</Button>
      {single && <Button variant="outline" size="sm" leadingIcon="arrow-up" disabled={saving || !canUp} onClick={() => move(-1)}>위로이동</Button>}
      {single && <Button variant="outline" size="sm" leadingIcon="arrow-down" disabled={saving || !canDown} onClick={() => move(1)}>아래로이동</Button>}
      <Button variant="ghost" size="sm" disabled={saving} onClick={clearSelection}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '회계', '기초관리', LABEL]}
      title={LABEL}
      favRoute="acct-closing-form"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 주 필터 칩(양식구분, 필수라 '전체' 없음 · 칩 안 `*` 필수 표시) + 적용 중인 상세필터 값 칩 */
      filterChips={FORM_KINDS.map((k) => ({ key: k, label: k, active: kind === k, onSelect: () => changeKind(k), required: true }))}
      appliedFilters={[{ label: '계정코드명', value: fAcct, onClear: () => setFAcct('') }]}
      contextActions={selActions}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" disabled={saving} onClick={openFilter}>상세필터</Button>
        <Button variant="outline" size="sm" leadingIcon="plus" disabled={saving} onClick={addRow}>행추가</Button>
        <SaveButton onSubmit={save} />
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{`총 ${rows.length}건 중 ${shownCount}건 표시`}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      <div ref={gridBoxRef} aria-busy={saving || undefined} role="region" aria-label={`${LABEL} 편집 그리드 — 체크박스로 행을 고르면 선택 바에 행삽입·행삭제·이동이 뜬다`}>
        <AgGridReact<ClosingRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={EDIT_COL_DEF}
          getRowId={getRowId}
          domLayout="autoHeight"
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          rowClassRules={ROW_CLASS_RULES}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onModelUpdated={dropHiddenSelection}
          onGridReady={(e) => { apiRef.current = e.api; }}
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">양식 행이 없습니다. 행추가로 새 행을 입력하세요.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어(E01) — 조건 1개: 계정코드명(텍스트 + [검색], 부분일치) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">결산양식 행을 계정코드명으로 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {/* plain(div) — 입력칸과 [검색] 버튼을 함께 품어 <label> 암묵 연결이 버튼 클릭을 가로채지 않게 */}
            <div className="block mb-4">
              <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>계정코드명</span>
              <div className="flex items-center gap-1.5">
                <input type="text" value={fDraft} placeholder="계정코드명 입력" aria-label="계정코드명"
                  onChange={(e) => setFDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setFAcct(fDraft); setFilterOpen(false); } }}
                  style={{ ...drawerInputStyle('text'), flex: 1, minWidth: 0 }} />
                <Button variant="outline" size="md" onClick={() => setSearch({ kind: 'filter', keyword: fDraft })}>검색</Button>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => setFDraft('')}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => { setFAcct(fDraft); setFilterOpen(false); }}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 계정과목 검색 팝업(ACC-001 공통) — 행 [검색]·상세필터 [검색] 공용 ── */}
      <AccountSearchModal
        open={search !== null}
        onOpenChange={(o) => { if (!o) setSearch(null); }}
        initialKeyword={search?.keyword ?? ''}
        onSelect={onPickAccount}
      />
    </GridFrame>
  );
}
