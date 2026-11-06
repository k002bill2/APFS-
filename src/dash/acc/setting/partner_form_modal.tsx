/* 회계거래처관리(ACC-026) — 「회계거래처 등록」/「회계거래처 수정」 섹션형 전용 모달(설계서 slide12).

   ⚠ RowFormModal(flat 스키마)로 담을 수 없어 전용 모달이다(apfs-form-modal "확장: 섹션형·반복행" — 골드 subfund_form_modal):
     섹션 4개(기본정보 · 계좌 정보 · 거래처정보 변경 이력 · 첨부파일) + 반복행 편집 표 + 조건부 필수/비활성.
   골격·규격: 항목 >6 → `max-w-[880px] max-h-[88vh]` 2단(sm 이하 1단), 본문 `p-[46px]`(+헤더·푸터 `px-[46px]`),
     섹션 = <fieldset>/<legend>(밑줄형 헤딩 공용 className), 개별 컨트롤 = SchemaField(ad-hoc FieldSpec — 34px·폭 규약 자동),
     라벨 래퍼 = RowFormModal `Field` 규격 로컬 복제 + 인라인 오류(role=alert).
   조건부 입력(SchemaField 에 disabled 가 없어 readonly 스펙으로 바꿔 그린다 — account_code_form_modal `locked` 선례):
     · 국내 → 국가 '대한민국' 고정(readonly)·해외등록번호 readonly / 해외 → 사업자등록번호 readonly·[확인] 비활성, 국가 select(대한민국 제외)
       — 국내로 돌리면 국가를 대한민국으로, 해외로 돌리면 국가를 비워 다시 고르게 한다(해외인데 대한민국이 남는 모순 방지).
     · 개인 → 법인등록번호 readonly(저장 '-').
   계좌 정보 = AG Grid 편집 표(apfs-aggrid "모달 안 편집 그리드", 정본 gp_quant_indicator_modal — 사용자가 수제 표보다 AG Grid 선호):
     셀 입력칸 로컬 state(CellInput) · 정렬 끔(EDIT_COL_DEF) · 셀 컨트롤 키 격리(input/button/select) · 선택 = SELECTION_COL 체크박스
     (주계좌 라디오 열과 별개). 주계좌 = 행마다 단일 라디오, 고르면 그 행만 켠다(setMainAccount) → 2개 이상은 UI 로 만들 수 없다.
     위반 셀·행 순번 = React 컨텍스트(AccountGridCtx — 오류 셀 + 행 id→순번)를 셀 렌더러가 직접 구독한다.
       ⚠ cellClassRules + refreshCells({force:true}) 를 쓰지 않는 이유: force 리프레시가 셀 렌더러를 다시 만들어, 오류 셀에 첫 글자를
       치는 순간(patch → 오류 해제 → 리프레시) 입력칸이 리마운트되며 포커스·IME 조합이 끊겼다(리뷰 지적). 컨텍스트 구독은 렌더러
       인스턴스를 유지한 채 그 컴포넌트만 다시 그린다(AG Grid React 셀은 AgGridReact 트리 안 포털이라 바깥 Provider 가 닿는다).
       같은 이유로 접근名 "N행" 도 node.rowIndex(행삭제 후 셀이 다시 안 그려져 낡는다) 대신 컨텍스트 순번으로 계산한다.
     주계좌: 행삭제로 주계좌가 사라지면 남은 첫 행을 주계좌로 승격한다(설계서에 없는 규칙 — 저장 검증 '주계좌를 지정해 주세요.'와 짝).
     계좌 정보 도구 = 제목 옆 좌측(apfs-form-modal 규약 7 — Section add 슬롯, ml-auto 금지), [삭제]는 선택 시에만·danger
       (사용자 지정 2026-11-06) — [행추가] 뒤에 [선택 시에만: N건 선택됨 · 삭제]. [삭제]=danger(목록 선택 바와 동일). 선택 수는 onSelectionChanged·onRowDataUpdated → selCount state 로 동기화한다
       (getRowId 가 있어 행추가로 rowData 가 바뀌어도 기존 선택은 유지된다).
     셀 select = shouldSearch(옵션 수) 분기(SSOT searchable-select) — 은행명(17개)은 SearchableSelect(Popover 는 body 포털이라 셀·모달
       overflow 에 안 잘린다. 트리거 = <button> 이라 suppressCtrlKeys 가 셀 키를 격리), 계좌구분(5개)은 네이티브 <select>.
       오류 테두리·aria-invalid 는 같은 DANGER·invalid 로 넘기고, 포커스는 data-field 래퍼 안 트리거로 간다(focusCell).
   두 그리드 래퍼 = `.apfs-grid-min`(aggrid_shared.css opt-in) — AG Grid autoHeight 본문 최소 150px 때문에 행 2개면 마지막 행 아래
     ~66px 빈 띠가 남던 것을 없앤다(행 있을 땐 42px 하한, 빈 상태 오버레이가 뜰 땐 150px 복원).
   계좌 열 폭(본문 788px): 계좌번호 = flex 2(min 180)로 남는 폭의 2/3 흡수 — '010-300103-01-011' 이 잘리던 것(입력칸 ~120px) 해소,
     예금주 flex 1(min 110), 계좌구분 100·은행명 132·사용여부 86 고정.
   변경 이력 = AG Grid 읽기전용(행 선택 없음). 두 그리드 모두 래퍼 `border-y border-border`(apfsTheme wrapperBorder:false 라
     모달 안에서 위·아래 선이 비어 보이던 지적, 2026-11-06). AUTO_SIZE_CONTENT 는 쓰지 않는다(고정+flex 폭).
   첨부파일 = SchemaField control 'filepond'(공용 DocumentsField — 기존 첨부 카드 + 드롭존, 다중). 분류 없음.
   닫기(✕·Esc·[취소]) = requestClose 한 곳 — 입력 중(스냅샷 비교)이면 확인(「작성 중인 내용이 사라집니다」) 후 닫는다
     (journal_entry_screen 선례: hideClose + 헤더 IconBtn + onEscapeKeyDown preventDefault). 바깥 클릭은 닫지 않는다.
   저장 검증 = partner_model.validatePartner(위→아래 첫 미충족 1건) → 빨간 테두리 + 인라인 문구 + 토스트 + 포커스.
   ⚠ 백엔드가 없어 저장은 부모(partner_manage)의 로컬 행 상태만 바꾼다. */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GetRowIdParams, GridApi, ICellRendererParams, RowSelectionOptions, SuppressKeyboardEventParams } from 'ag-grid-community';
import { UI } from '../../components';
import { SchemaField, isPlainWrapControl, drawerInputStyle } from '../../schemas/renderers';
import { SearchableSelect, shouldSearch } from '../../ui/searchable-select';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../../ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Switch } from '../../ui/switch';
import { toast } from '../../ui/sonner';
import { apfsTheme, DEFAULT_COL_DEF } from '../../aggrid_theme';
import { SELECTION_COL } from '../../aggrid_selection';
import '../../aggrid_shared.css';
import { ACCOUNT_KINDS, BANKS, COUNTRIES, DOMESTIC_COUNTRY, PARTNER_TYPES, REGIONS } from './partner_data';
import type { BankAccount, PartnerHistory, PartnerRow, PartnerType, Region, UseYn } from './partner_data';
import { buildPartner, checkBizNo, formSnapshot, keepMainAccount, setMainAccount, toForm, validatePartner } from './partner_model';
import type { AccountField, FieldKey, PartnerForm } from './partner_model';

const { Button, IconBtn, SaveButton } = UI;

/** 부모가 받는 저장값 — 거래처번호·관리번호·연결 전표·변경 이력은 부모가 채운다 */
export type PartnerPatch = ReturnType<typeof buildPartner>;

/* ── 기본정보 필드 스펙(ad-hoc FieldSpec) ── */
const PLACEHOLDER = '선택해 주세요';
const OVERSEAS_COUNTRIES = COUNTRIES.filter((c) => c !== DOMESTIC_COUNTRY);
const F: Record<string, FieldSpec> = {
  type: { key: 'type', label: '거래처유형', control: 'radio', options: [...PARTNER_TYPES], required: true },
  partnerNo: { key: 'partnerNo', label: '거래처번호', control: 'readonly' },
  internalCode: { key: 'internalCode', label: '내부거래처코드', control: 'text' },
  region: { key: 'region', label: '국내/해외', control: 'select', options: [...REGIONS], required: true },
  country: { key: 'country', label: '국가', control: 'select', options: [...OVERSEAS_COUNTRIES], placeholder: PLACEHOLDER, required: true },
  countryRo: { key: 'country', label: '국가', control: 'readonly' },
  foreignRegNo: { key: 'foreignRegNo', label: '해외등록번호', control: 'text', required: true },
  foreignRegNoRo: { key: 'foreignRegNo', label: '해외등록번호', control: 'readonly' },
  bizNo: { key: 'bizNo', label: '사업자등록번호', control: 'text', placeholder: '000-00-00000', required: true },
  bizNoRo: { key: 'bizNo', label: '사업자등록번호', control: 'readonly' },
  corpNo: { key: 'corpNo', label: '법인등록번호', control: 'text', placeholder: '000000-0000000' },
  corpNoRo: { key: 'corpNo', label: '법인등록번호', control: 'readonly' },
  name: { key: 'name', label: '거래처명', control: 'text', required: true },
  nameEn: { key: 'nameEn', label: '거래처명(영문)', control: 'text' },
  ceo: { key: 'ceo', label: '대표자명', control: 'text' },
  phone: { key: 'phone', label: '대표회사전화번호', control: 'text', placeholder: '02-000-0000' },
  bizType: { key: 'bizType', label: '업태', control: 'text' },
  bizItem: { key: 'bizItem', label: '종목', control: 'text' },
  address: { key: 'address', label: '법인주소', control: 'address', long: true },
  attachments: { key: 'attachments', label: '첨부파일', control: 'filepond' },
};

/* RowFormModal `Field` 규격 로컬 복제 + 인라인 오류. plain=<div> 래퍼(radio·address·버튼 동거 컨트롤) */
const labelStyle: React.CSSProperties = { fontSize: 12, marginBottom: 5 };
function Field({ label, children, className, plain, error, boxRef }: { label: string; children: React.ReactNode; className?: string; plain?: boolean; error?: string; boxRef?: (el: HTMLElement | null) => void }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap ref={boxRef} className={`block mb-3.5 ${className ?? ''}`}>
      <span className="font-semibold text-caption block" style={labelStyle}>{label}</span>
      {children}
      {error && <span role="alert" className="block mt-1" style={{ fontSize: 11.5, color: 'var(--danger-text)' }}>{error}</span>}
    </Wrap>
  );
}

/* 섹션 = fieldset/legend(모달 크롬 규칙 3). 도구 슬롯은 apfs-form-modal 규약 7:
   add = 추가류·행 편집 도구(제목 바로 옆 좌측, ml-auto 금지) · actions = 조회·저장 등 섹션 액션(우측 끝) */
function Section({ title, add, actions, children }: { title: string; add?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset className="border-0 p-0 m-0 mb-7" style={{ minWidth: 0 }}>
      <legend className="w-full flex flex-wrap items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mb-3">
        <span>{title}</span>
        {add}
        {actions ? <span className="ml-auto flex items-center gap-1.5">{actions}</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}

/* ══════════════ 계좌 정보 편집 그리드 ══════════════ */
type Patch = (id: string, p: Partial<BankAccount>) => void;
type CellErr = { rowId: string; field: AccountField | 'main' } | null;
/** 셀 렌더러가 구독하는 표 상태 — 오류 셀 + 행 id→표시 순번(1부터) */
type GridState = { err: CellErr; order: ReadonlyMap<string, number> };
const AccountGridCtx = React.createContext<GridState>({ err: null, order: new Map() });
/** 이 셀이 오류인지 + 접근名 접두("2행") */
function useCellState(rowId: string, field?: AccountField | 'main') {
  const { err, order } = React.useContext(AccountGridCtx);
  return { invalid: !!field && !!err && err.rowId === rowId && err.field === field, rowLabel: `${String(order.get(rowId) ?? '')}행` };
}
const DANGER: React.CSSProperties = { border: '1px solid var(--danger)', boxShadow: '0 0 0 1px var(--danger)' };   // border 단축 속성 — inputBox·selectBox 가 단축 속성이라 섞으면 React 경고

let seq = 0;
const newAccount = (main: boolean): BankAccount => ({ id: `new-a${String(++seq)}`, main, kind: '', bank: '', accountNo: '', holder: '', use: '여' });

const EDIT_COL_DEF = { ...DEFAULT_COL_DEF, sortable: false } as const;
const VIEW_COL_DEF = { ...DEFAULT_COL_DEF, sortable: false } as const;
const ROW_SELECTION: RowSelectionOptions<BankAccount> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };
const getAccountId = (p: GetRowIdParams<BankAccount>) => p.data.id;
const MID = { display: 'flex', alignItems: 'center' } as const;
/* 셀 안 입력·select·라디오·스위치의 키는 그리드에 넘기지 않는다(방향키 셀 이동·Space 행 선택 방지). Tab 은 브라우저 기본 이동 */
const suppressCtrlKeys = (p: SuppressKeyboardEventParams) => p.event.key === 'Tab' || !!(p.event.target as HTMLElement | null)?.closest?.('input,button,select');
const inputBox: React.CSSProperties = { ...drawerInputStyle('text'), height: 30, minHeight: 30, padding: '0 8px', width: '100%', minWidth: 0 };
const selectBox: React.CSSProperties = {
  fontFamily: 'inherit', fontSize: 13.5, lineHeight: '18px', height: 30, padding: '0 4px', boxSizing: 'border-box', width: '100%', minWidth: 0,
  cursor: 'pointer', border: '1px solid var(--input)', borderRadius: 7, background: 'var(--card)', color: 'var(--foreground)',
};
/* 셀 컨트롤 접근名 = 표시 행 순번("2행 은행명", 컨텍스트 순번) — 편집 중인 값을 넣으면 타이핑마다 접근名이 바뀐다 */

/* 셀 입력칸 — 값은 로컬 state 가 즉시 들고 patch() 가 뒤따라 rows(SSOT)에 되쓴다(p.data 직접 바인딩은 타이핑 유실 — gp_quant 실측) */
function CellInput({ row, field, label, patch }: { row: BankAccount; field: 'accountNo' | 'holder'; label: string; patch: Patch }) {
  const [v, setV] = useState(row[field]);
  const { invalid, rowLabel } = useCellState(row.id, field);
  return <input type="text" value={v} aria-label={`${rowLabel} ${label}`} aria-invalid={invalid || undefined} data-field={field} style={invalid ? { ...inputBox, ...DANGER } : inputBox}
    onChange={(e) => { setV(e.target.value); patch(row.id, { [field]: e.target.value }); }} />;
}
function CellSelect({ row, field, label, options, patch }: { row: BankAccount; field: 'kind' | 'bank'; label: string; options: readonly string[]; patch: Patch }) {
  const [v, setV] = useState(row[field]);
  const { invalid, rowLabel } = useCellState(row.id, field);
  const onPick = (x: string) => { setV(x); patch(row.id, { [field]: x }); };
  if (shouldSearch(options.length)) {
    /* data-field 는 래퍼에 — SearchableSelect 가 임의 속성을 트리거로 넘기지 않는다. focusCell 이 안쪽 트리거를 찾는다 */
    return (
      <span data-field={field} style={{ display: 'block', width: '100%', minWidth: 0 }}>
        <SearchableSelect value={v} onChange={onPick} options={options} ariaLabel={`${rowLabel} ${label}`} invalid={invalid} fill
          triggerStyle={{ ...selectBox, padding: '0 8px', ...(invalid ? DANGER : {}) }} />
      </span>
    );
  }
  return (
    <select value={v} aria-label={`${rowLabel} ${label}`} aria-invalid={invalid || undefined} data-field={field}
      style={{ ...selectBox, ...(v === '' ? { color: 'var(--muted-foreground)' } : {}), ...(invalid ? DANGER : {}) }}
      onChange={(e) => onPick(e.target.value)}>
      <option value="" disabled hidden>선택</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function CellMain({ row, setMain }: { row: BankAccount; setMain: (id: string) => void }) {
  const { invalid, rowLabel } = useCellState(row.id, 'main');
  return (
    <RadioGroup value={row.main ? row.id : ''} onValueChange={(id) => setMain(id)} aria-label={`${rowLabel} 주계좌`}
      className="rounded-full" style={invalid ? { boxShadow: '0 0 0 2px var(--danger)' } : undefined}>
      <RadioGroupItem value={row.id} data-field="main" aria-label={`${rowLabel} 주계좌`} aria-invalid={invalid || undefined} />
    </RadioGroup>
  );
}
function CellUse({ row, patch }: { row: BankAccount; patch: Patch }) {
  const { rowLabel } = useCellState(row.id);
  return (
    <span className="inline-flex items-center gap-2">
      <Switch checked={row.use === '여'} onCheckedChange={(c) => patch(row.id, { use: (c ? '여' : '부') as UseYn })} aria-label={`${rowLabel} 사용여부`} />
      <span aria-hidden style={{ fontSize: 13 }}>{row.use}</span>
    </span>
  );
}

const makeAccountCols = (patch: Patch, setMain: (id: string) => void): ColDef<BankAccount>[] => [
  { field: 'main', headerName: '주계좌', width: 76, minWidth: 76, maxWidth: 76, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys,
    cellRenderer: (p: ICellRendererParams<BankAccount>) => (p.data ? <CellMain row={p.data} setMain={setMain} /> : null) },
  { field: 'kind', headerName: '계좌구분 *', width: 100, minWidth: 100, maxWidth: 100, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys,
    cellRenderer: (p: ICellRendererParams<BankAccount>) => (p.data ? <CellSelect row={p.data} field="kind" label="계좌구분" options={ACCOUNT_KINDS} patch={patch} /> : null) },
  { field: 'bank', headerName: '은행명 *', width: 132, minWidth: 132, maxWidth: 132, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys,
    cellRenderer: (p: ICellRendererParams<BankAccount>) => (p.data ? <CellSelect row={p.data} field="bank" label="은행명" options={BANKS} patch={patch} /> : null) },
  { field: 'accountNo', headerName: '계좌번호 *', flex: 2, minWidth: 180, width: 180, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys,
    cellRenderer: (p: ICellRendererParams<BankAccount>) => (p.data ? <CellInput row={p.data} field="accountNo" label="계좌번호" patch={patch} /> : null) },
  { field: 'holder', headerName: '예금주 *', flex: 1, minWidth: 110, width: 110, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys,
    cellRenderer: (p: ICellRendererParams<BankAccount>) => (p.data ? <CellInput row={p.data} field="holder" label="예금주" patch={patch} /> : null) },
  /* 사용여부 = '여/부' on/off → DS Switch(라벨 '…여부' 는 switch 규약). 상태 텍스트는 현재 값 */
  { field: 'use', headerName: '사용여부', width: 86, minWidth: 86, maxWidth: 86, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys,
    cellRenderer: (p: ICellRendererParams<BankAccount>) => (p.data ? <CellUse row={p.data} patch={patch} /> : null) },
];

/* ══════════════ 변경 이력(읽기전용) ══════════════ */
const HISTORY_COLS: ColDef<PartnerHistory>[] = [
  { field: 'date', headerName: '변경일', width: 112, minWidth: 112, maxWidth: 112, cellStyle: { ...MID, fontVariantNumeric: 'tabular-nums' } },
  { field: 'oldName', headerName: '(구) 거래처명', flex: 1, minWidth: 140, width: 140, cellStyle: MID, tooltipField: 'oldName' },
  { field: 'newName', headerName: '(신) 거래처명', flex: 1, minWidth: 140, width: 140, cellStyle: MID, tooltipField: 'newName' },
  { field: 'oldBizNo', headerName: '(구) 사업자등록번호', width: 150, minWidth: 150, maxWidth: 150, cellStyle: { ...MID, fontVariantNumeric: 'tabular-nums' } },
  { field: 'newBizNo', headerName: '(신) 사업자등록번호', width: 150, minWidth: 150, maxWidth: 150, cellStyle: { ...MID, fontVariantNumeric: 'tabular-nums' } },
];
/* 이력 그리드는 getRowId 를 두지 않는다 — 같은 날 A→B→A→B 변경이면 값 조합 키가 겹친다(읽기전용·선택 없음이라 행 id 불필요) */
const NO_DATA = '<span style="padding:24px 0;color:var(--muted-foreground);font-size:13px">표시할 데이터가 없습니다.</span>';
const NO_ACCOUNT = '<span style="padding:24px 0;color:var(--muted-foreground);font-size:13px">등록된 계좌가 없습니다. 「행추가」로 입력하세요.</span>';

/* ══════════════ 모달 본체 ══════════════ */
export function PartnerFormModal({ mode, initial, pool, onSave, onClose }: {
  mode: 'create' | 'edit';
  initial?: PartnerRow;
  pool: readonly PartnerRow[];             // 사업자번호 중복 비교 대상(활성 + 논리삭제)
  onSave: (patch: PartnerPatch) => void;
  onClose: () => void;
}) {
  const dlgRef = useRef<DialogHandle>(null);
  const [v, setV] = useState<PartnerForm>(() => toForm(initial));
  const baseline = useMemo(() => formSnapshot(toForm(initial)), [initial]);
  const [confirmClose, setConfirmClose] = useState(false);
  const domestic = v.region === '국내';
  const corp = v.type === '법인';
  const selfNo = initial?.partnerNo;

  /* ── 필드 오류(검증 실패 1건) — 그 필드를 고치면 풀린다 ── */
  const [err, setErr] = useState<{ key: FieldKey; msg: string } | null>(null);
  const set = <K extends keyof PartnerForm>(k: K, val: PartnerForm[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    setErr((e) => (e && e.key === k ? null : e));
  };
  const setRegion = (r: Region) => {
    setV((p) => ({ ...p, region: r, country: r === '국내' ? DOMESTIC_COUNTRY : '' }));
    setErr(null);
  };
  const boxes = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({});
  const reg = (k: FieldKey) => (el: HTMLElement | null) => { boxes.current[k] = el; };
  const focusField = (k: FieldKey) => requestAnimationFrame(() => {
    boxes.current[k]?.querySelector<HTMLElement>('input, select, button[role=radio], button[role=combobox]')?.focus();
  });
  const errOf = (k: FieldKey) => (err?.key === k ? err.msg : undefined);

  /* ── 계좌 그리드 ── */
  const apiRef = useRef<GridApi<BankAccount> | null>(null);
  const gridBoxRef = useRef<HTMLDivElement>(null);
  const focusIdRef = useRef<string | null>(null);
  const [selCount, setSelCount] = useState(0);
  const [cellErr, setCellErr] = useState<CellErr>(null);
  const gridState = useMemo<GridState>(() => ({ err: cellErr, order: new Map(v.accounts.map((a, i) => [a.id, i + 1])) }), [cellErr, v.accounts]);
  const patch = useCallback<Patch>((id, p) => {
    setV((f) => ({ ...f, accounts: f.accounts.map((a) => (a.id === id ? { ...a, ...p } : a)) }));
    setCellErr((e) => (e && e.rowId === id && Object.prototype.hasOwnProperty.call(p, e.field) ? null : e));
  }, []);
  const setMain = useCallback((id: string) => {
    setV((f) => ({ ...f, accounts: setMainAccount(f.accounts, id) }));
    setCellErr((e) => (e?.field === 'main' ? null : e));
  }, []);
  const accountCols = useMemo(() => makeAccountCols(patch, setMain), [patch, setMain]);
  const syncSel = () => setSelCount(apiRef.current?.getSelectedRows().length ?? 0);

  const addRow = () => {
    const r = newAccount(v.accounts.length === 0);   // 첫 계좌는 주계좌로 시작
    focusIdRef.current = r.id;
    setV((f) => ({ ...f, accounts: [...f.accounts, r] }));
  };
  const deleteRows = () => {
    const api = apiRef.current;
    const ids = new Set((api?.getSelectedRows() ?? []).map((r) => r.id));
    if (ids.size === 0) return;   // [삭제]는 선택 시에만 보인다
    /* 주계좌 행을 지웠으면 남은 첫 행을 주계좌로 승격(keepMainAccount) */
    setV((f) => ({ ...f, accounts: keepMainAccount(f.accounts.filter((a) => !ids.has(a.id))) }));
    setCellErr((e) => (e && ids.has(e.rowId) ? null : e));
    api?.deselectAll();
    setSelCount(0);
  };
  const onRowDataUpdated = () => {
    syncSel();
    const id = focusIdRef.current; if (!id) return;
    focusIdRef.current = null;
    requestAnimationFrame(() => gridBoxRef.current?.querySelector<HTMLElement>(`.ag-center-cols-container [row-id="${id}"] [data-field="kind"]`)?.focus());
  };
  const focusCell = (rowId: string, field: string) => requestAnimationFrame(() => {
    const el = gridBoxRef.current?.querySelector<HTMLElement>(`[row-id="${rowId}"] [data-field="${field}"]`);
    (el?.matches('input,select,button') ? el : el?.querySelector<HTMLElement>('button,input,select'))?.focus();   // 검색형 select = 래퍼 안 트리거
  });

  /* ── 사업자등록번호 [확인] — 형식 → 중복 ── */
  const checkBiz = () => {
    const r = checkBizNo(pool, v.bizNo, selfNo);
    if (!r.ok) { toast.error(r.msg); setErr({ key: 'bizNo', msg: r.msg }); focusField('bizNo'); return; }
    return () => { setErr((e) => (e?.key === 'bizNo' ? null : e)); toast.success(r.msg); };
  };

  /* ── 저장(E 저장 검증 1→6) ── */
  const submit = () => {
    const res = validatePartner(v, pool, selfNo);
    if (res.ok === false) {
      toast.error(res.msg);
      if (res.key === 'account') { setCellErr({ rowId: res.rowId, field: res.field }); focusCell(res.rowId, res.field); }
      else { setErr({ key: res.key, msg: res.msg }); focusField(res.key); }
      return;
    }
    const out = buildPartner(v);
    /* 저장 성공 → 부모 반영 · 토스트 · exit 애니메이션으로 닫기(부모는 onClose 에서만 modal 을 비운다) */
    return () => { onSave(out); toast.success('저장되었습니다'); dlgRef.current?.close(); };
  };

  /* ── 닫기 — ✕·Esc·[취소] 한 곳. 입력 중이면 확인 ── */
  const dirty = formSnapshot(v) !== baseline;
  const requestClose = () => { if (dirty) setConfirmClose(true); else dlgRef.current?.close(); };

  const title = mode === 'create' ? '회계거래처 등록' : '회계거래처 수정';
  const history = initial?.history ?? [];

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent hideClose className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => { e.preventDefault(); if (!confirmClose) requestClose(); }}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">회계거래처 기본정보·계좌 정보·변경 이력·첨부파일 {mode === 'create' ? '등록' : '수정'} 양식</DialogDescription>
          <IconBtn icon="x" label="닫기" size={34} onClick={requestClose} />
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          {/* ── 섹션 1 기본정보 — 설계서 행 순서(좌|우) 그대로 ── */}
          <Section title="기본정보">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
              <Field label="거래처유형 *" plain={isPlainWrapControl(F.type.control)} boxRef={reg('type')} error={errOf('type')}>
                <SchemaField field={F.type} value={v.type} invalid={!!errOf('type')} onChange={(x) => set('type', x as PartnerType)} />
              </Field>
              <Field label="거래처번호">
                <SchemaField field={F.partnerNo} value={initial?.partnerNo ?? '자동채번'} onChange={() => undefined} />
              </Field>

              <Field label="내부거래처코드">
                <SchemaField field={F.internalCode} value={v.internalCode} onChange={(x) => set('internalCode', x)} />
              </Field>
              <Field label="국내/해외 *" boxRef={reg('region')} error={errOf('region')}>
                <SchemaField field={F.region} value={v.region} invalid={!!errOf('region')} onChange={(x) => setRegion(x as Region)} />
              </Field>

              <Field label="국가 *" boxRef={reg('country')} error={errOf('country')}>
                {domestic
                  ? <SchemaField field={F.countryRo} value={DOMESTIC_COUNTRY} onChange={() => undefined} />
                  : <SchemaField field={F.country} value={v.country} invalid={!!errOf('country')} onChange={(x) => set('country', x)} />}
              </Field>
              <Field label={domestic ? '해외등록번호' : '해외등록번호 *'} boxRef={reg('foreignRegNo')} error={errOf('foreignRegNo')}>
                {domestic
                  ? <SchemaField field={F.foreignRegNoRo} value="" onChange={() => undefined} />
                  : <SchemaField field={F.foreignRegNo} value={v.foreignRegNo} invalid={!!errOf('foreignRegNo')} onChange={(x) => set('foreignRegNo', x)} />}
              </Field>

              {/* 사업자등록번호 + [확인] — 버튼 동거라 plain(div) 래퍼 */}
              <Field label={domestic ? '사업자등록번호 *' : '사업자등록번호'} plain boxRef={reg('bizNo')} error={errOf('bizNo')}>
                <div className="flex items-center gap-2 flex-wrap">
                  <div style={{ minWidth: 0, flex: '1 1 160px', maxWidth: 320 }}>
                    {domestic
                      ? <SchemaField fill field={F.bizNo} value={v.bizNo} invalid={!!errOf('bizNo')} onChange={(x) => set('bizNo', x)} />
                      : <SchemaField fill field={F.bizNoRo} value="" onChange={() => undefined} />}
                  </div>
                  <SaveButton variant="outline" leadingIcon="" busyLabel="확인 중" disabled={!domestic} onSubmit={checkBiz}>확인</SaveButton>
                </div>
              </Field>
              <Field label="법인등록번호">
                {corp
                  ? <SchemaField field={F.corpNo} value={v.corpNo} onChange={(x) => set('corpNo', x)} />
                  : <SchemaField field={F.corpNoRo} value="" onChange={() => undefined} />}
              </Field>

              <Field label="거래처명 *" boxRef={reg('name')} error={errOf('name')}>
                <SchemaField field={F.name} value={v.name} invalid={!!errOf('name')} onChange={(x) => set('name', x)} />
              </Field>
              <Field label="거래처명(영문)">
                <SchemaField field={F.nameEn} value={v.nameEn} onChange={(x) => set('nameEn', x)} />
              </Field>

              <Field label="대표자명">
                <SchemaField field={F.ceo} value={v.ceo} onChange={(x) => set('ceo', x)} />
              </Field>
              <Field label="대표회사전화번호">
                <SchemaField field={F.phone} value={v.phone} onChange={(x) => set('phone', x)} />
              </Field>

              <Field label="업태">
                <SchemaField field={F.bizType} value={v.bizType} onChange={(x) => set('bizType', x)} />
              </Field>
              <Field label="종목">
                <SchemaField field={F.bizItem} value={v.bizItem} onChange={(x) => set('bizItem', x)} />
              </Field>

              {/* 법인주소 — 우편번호 [주소 검색]·주소(상세주소는 본문에 이어 쓴다). 복합 컨트롤 plain + 전체 폭(전용 모달은 span 자동 아님) */}
              <Field label="법인주소" plain className="sm:col-span-2">
                <SchemaField field={F.address} value={v.address} onChange={(x) => set('address', x)} />
              </Field>
            </div>
          </Section>

          {/* ── 섹션 2 계좌 정보 — 반복행 편집 표(AG Grid) ── */}
          <Section title="계좌 정보" add={
            <div className="flex flex-wrap items-center gap-1.5 font-normal" role="toolbar" aria-label="계좌 정보 도구">
              <Button variant="outline" size="sm" leadingIcon="plus" onClick={addRow}>행추가</Button>
              {selCount > 0 ? (
                <>
                  <span className="font-semibold self-center" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
                  <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: 'var(--danger)' }} onClick={deleteRows}>삭제</Button>
                </>
              ) : null}
            </div>
          }>
            <div ref={gridBoxRef} className="apfs-grid-min border-y border-border" role="region" aria-label="계좌 정보 — 체크박스로 고른 뒤 삭제">
              <AccountGridCtx.Provider value={gridState}>
              <AgGridReact<BankAccount>
                theme={apfsTheme}
                rowData={v.accounts}
                columnDefs={accountCols}
                defaultColDef={EDIT_COL_DEF}
                getRowId={getAccountId}
                domLayout="autoHeight"
                rowSelection={ROW_SELECTION}
                selectionColumnDef={SELECTION_COL}
                onGridReady={(e) => { apiRef.current = e.api; }}
                onSelectionChanged={syncSel}
                onRowDataUpdated={onRowDataUpdated}
                overlayNoRowsTemplate={NO_ACCOUNT}
              />
              </AccountGridCtx.Provider>
            </div>
          </Section>

          {/* ── 섹션 3 거래처정보 변경 이력 — 자동 기록·읽기전용(행 선택 없음) ── */}
          <Section title="거래처정보 변경 이력">
            <div className="apfs-grid-min border-y border-border" role="region" aria-label="거래처정보 변경 이력 — 조회 전용">
              <AgGridReact<PartnerHistory>
                theme={apfsTheme}
                rowData={history}
                columnDefs={HISTORY_COLS}
                defaultColDef={VIEW_COL_DEF}
                domLayout="autoHeight"
                overlayNoRowsTemplate={NO_DATA}
              />
            </div>
          </Section>

          {/* ── 섹션 4 첨부파일 — 분류 없이 다중(공용 DocumentsField) ── */}
          <Section title="첨부파일">
            <Field label="첨부파일" plain>
              <SchemaField field={F.attachments} value={v.attachments} onChange={(x) => set('attachments', x)} />
            </Field>
          </Section>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={requestClose}>취소</Button>
            <SaveButton onSubmit={submit} />
          </div>
        </DialogFooter>

        {/* 입력 중 닫기 확인 — [닫기] 는 확인창을 먼저 닫고 모달 exit(ref.close) */}
        <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>닫기 확인</AlertDialogTitle>
              <AlertDialogDescription>작성 중인 내용이 사라집니다. 닫으시겠습니까?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <Button variant="primary" size="sm" onClick={() => { setConfirmClose(false); dlgRef.current?.close(); }}>닫기</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
