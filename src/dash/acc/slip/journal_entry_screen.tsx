/* 전표등록 전체 화면(ACC-003 · slide 12 · 이벤트 E02/E07/E08/E10 = slide 19·23·24·26).
   공용 Dialog 를 뷰포트 거의 전체로 띄운다(포커스 트랩·Esc·포털은 Dialog 가 제공 — 새 오버레이 프레임워크 없음).

   구성: 좌측 본문 ① 헤더 ② 분개 그리드 ③ 증빙·첨부 + 우측 사이드 ⑤ 관리항목·손익계정·도움말, 하단 ④ 버튼.
         768px 이하는 사이드가 본문 아래로 적층(min-[769px]:flex-row).

   결정·가정(보고서에도 기재)
   - 분개 그리드 = AG Grid 셀 렌더러 편집 그리드(결산양식 관리 ACC-002 관용구 복제 — 2026-10-29 사용자 지시). 정렬 끔(행 순서=데이터),
     선택은 체크박스로만(헤더 3상태 체크박스는 공용 SELECTION_COL 동작), 셀 입력은 30px(drawerInputStyle 기반 — 그리드 행 안이라 폼 34px 보다 낮다),
     Σ 는 pinned 합계 행. 행을 고르면 섹션 도구 앞에 `N건 선택됨 · 위로/아래로 · 행삭제 · 행복사 · 선택 해제`가 뜬다.
     검색 대상은 행 key 로 잡는다(행 이동 후 인덱스가 엇갈리지 않게). 셀 콜백은 actsRef 로 최신 form 을 본다(columnDefs 고정).
   - 닫기 경로는 전부 requestClose 한 곳 — dirty(스냅샷 비교)면 AlertDialog 확인. Dialog onOpenChange(false) 는 exit 애니메이션이
     이미 시작된 뒤라 거기서 막을 수 없어서 X·Esc·바깥 클릭을 각각 가로챈다.
   - 조회 전용(상신·승인 전표 수정 진입) = 본문 <fieldset disabled> + 첨부는 표시 전용 카드, 하단 [닫기]만.
   - 삭제전표 상세(ACC-004 slide12, mode 'deleted') = 위 조회 전용 + 삭제 안내 배너 · 분개 그리드 도구/[검색]/업로드 안내 미노출 ·
     하단 [복원]·[닫기]. 복원 확인 Action 은 onRestore 만 부르고, 상세 닫기는 AlertDialog 닫힘(exit 종료) 뒤 ref.close() — exit 애니메이션 규약.
     분기는 mode === 'deleted' 로만 해서 ACC-003 상신·승인 조회 전용 동작은 그대로 둔다.
   - 금액 `+` 키 = ×1,000. 설계서의 `-`(÷?)는 음수(마이너스전표) 입력과 충돌해 구현하지 않음.
   - 단축키 ⌥S·⌥K·⌥Z·⌥C 는 공용 훅 특성상 입력창 포커스 중엔 무시된다(공용 훅 수정 안 함). ⌥S 는 SaveButton 을 거치지 않아 스피너 없이 즉시 저장.
   - 계정과목 [검색]/키워드+Enter = 회계 공용 AccountSearchModal(입력여부 Y 만 선택 가능).
   - 거래처 [검색]/키워드+Enter = PartnerSearchModal(청크 C). 거래처 원장·간편추가는 페이지가 소유(partners·onAddPartner) —
     간편추가 거래처가 페이지 수명 동안 남고 업로드 거래처코드 해석에도 쓰인다. 반영 = 거래처명·관리번호·계좌번호. */
import '../../aggrid_shared.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type {
  CellClassParams, CellStyle, ColDef, GetRowIdParams, GridApi, ICellRendererParams, RowSelectionOptions, SelectionChangedEvent,
  SuppressKeyboardEventParams, ValueGetterParams,
} from 'ag-grid-community';
import { UI } from '../../components';
import type { SubmitResult } from '../../components';
import { Icon } from '../../icons';
import { SchemaField, CONTROL_BOX, isPlainWrapControl, drawerInputStyle } from '../../schemas/renderers';
import { apfsTheme, DEFAULT_COL_DEF, NO_COL_ID } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection } from '../../aggrid_selection';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '../../ui/alert-dialog';
import { Alert, AlertDescription } from '../../ui/alert';
import { SearchableSelect } from '../../ui/searchable-select';
import { Checkbox } from '../../ui/checkbox';
import { Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentDescription } from '../../ui/attachment';
import { DocumentsField } from '../../fields/DocumentsField';
import { parseFileNames, fileExtLabel } from '../../fields/file_names';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { toast } from '../../ui/sonner';
import { BASE_CURRENCY, CURRENCIES, EVIDENCE_TYPES, FUND_ACCOUNTS, FUND_BANK_ACCOUNTS, PARTNERS, PL_DEPTS, PL_EMPLOYEES, todayStr } from './general_journal_data';
import type { Currency, EvidenceType, FundAccount, JournalRow, Partner } from './general_journal_data';
import type { AccountItem } from '../account_data';
import { AccountSearchModal } from '../account_search_modal';
import { PartnerSearchModal } from './partner_search_modal';
import {
  AGGREGATE_ACCOUNT_MSG, ENTRY_MSG, applyAccountTo, applyPartnerTo, applyRepMemo, copyLastAppend, copyPrevMemo, deleteBlank, deleteChecked,
  duplicateChecked, emptyLine, entryTotals, formFromEntry, formSnapshot, formToJournal, formatAmount, isReadOnlyEntry, lineDiff, missingCode,
  moveChecked, parseAmount, resolveCode, syncMemo, times1000, validateEntry, withAutoRow,
} from './general_journal_model';
import type { EntryCheck, EntryForm, EntryLine, EntryState } from './general_journal_model';

const { Button, SaveButton, IconBtn } = UI;

const TITLE: Record<EntryState['mode'], string> = { new: '전표등록', copy: '전표등록 (복사)', reverse: '전표등록 (역분개)', edit: '전표등록 (수정)', deleted: '전표상세' };

/* 헤더·관리항목 필드 명세 — SchemaField 재사용(34px 박스·DatePicker·토큰 자동) */
const F_FUND: FieldSpec = { key: 'fundAccount', label: '계정구분', control: 'select', options: [...FUND_ACCOUNTS], required: true, searchable: true };
const F_KIND: FieldSpec = { key: 'slipKind', label: '전표구분', control: 'readonly' };
const F_WRITER: FieldSpec = { key: 'writer', label: '작성자', control: 'readonly' };
const F_WDATE: FieldSpec = { key: 'writtenDate', label: '작성일', control: 'date' };
const F_ORIGIN: FieldSpec = { key: 'origin', label: '전표발생구분', control: 'readonly' };
const F_MEMO: FieldSpec = { key: 'memo', label: '적요', control: 'textarea', required: true };
const F_STORAGE: FieldSpec = { key: 'storage', label: '보관위치', control: 'text' };
const F_DUE: FieldSpec = { key: 'fundDueDate', label: '자금집행예정일', control: 'date' };
const F_CUR: FieldSpec = { key: 'currency', label: '통화', control: 'select', options: [...CURRENCIES] };
const F_RATE: FieldSpec = { key: 'exchangeRate', label: '환율', control: 'number' };
const F_FAMT: FieldSpec = { key: 'foreignAmount', label: '외화금액', control: 'number' };

const ATTACH_HINTS = [
  '미리보기 클릭 시 인쇄화면에서 PDF로 저장할 수 있습니다.',
  'PPT, PDF, DOC, DOCX, XLS, XLSX, HWP, HWPX, JPG, JPEG, GIF, PNG, MP4 파일 최대 20MB 업로드 가능',
];

/* 셀 입력 박스 — 폼 컨트롤 SSOT(CONTROL_BOX 34px) + 테두리 토큰. 셀 폭을 꽉 채운다 */
const cellInput: React.CSSProperties = {
  ...CONTROL_BOX, width: '100%', minWidth: 0, border: '1px solid var(--border-strong)', borderRadius: 9, background: 'var(--card)', color: 'var(--foreground)',
};
const INPUT_CLS = 'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground';
/* 검색형 select 트리거 박스(placeholder '선택해 주세요'가 필요한 필드) */
const selectTrigger: React.CSSProperties = { ...cellInput };
const selectWrap: React.CSSProperties = { width: '100%', maxWidth: 320 };

const th: React.CSSProperties = { padding: '8px 6px', fontSize: 12.5, fontWeight: 600, color: 'var(--muted-foreground)', background: 'var(--grid-header)', borderBottom: '1px solid var(--border)', textAlign: 'left', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '5px 6px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' };

/* 라벨 래퍼 — RowFormModal Field 규격(로컬 복제, 형제 모달과 동일). plain=<div>(버튼형 컨트롤 2회 발화 방지) */
function Field({ label, required, plain, className, children }: { label: string; required?: boolean; plain?: boolean; className?: string; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className={`block mb-3.5 ${className ?? ''}`}>
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{label}{required ? ' *' : ''}</span>
      {children}
    </Wrap>
  );
}

/* 섹션 — subfund_form_modal Section 규격(로컬 복제) */
function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="mb-7" style={{ minWidth: 0 }}>
      <div className="flex items-center justify-between gap-2 flex-wrap border-b-2 border-border pb-2 mb-3">
        <h3 className="m-0 text-lg font-bold">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

/* ── 분개 그리드 모듈 상수(렌더마다 새 객체면 컬럼 폭이 되돌아간다 — apfs-aggrid · closing_form_manage 관용구) ── */
/* 정렬 끔 — 행 순서가 분개 순서(데이터)다 */
const EDIT_COL_DEF = { ...DEFAULT_COL_DEF, sortable: false } as const;
const ROW_SELECTION: RowSelectionOptions<EntryLine> = {
  mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false,
};
/* 조회 전용 — 행을 고를 수 없게(SELECTION_COL 은 선택 불가 행에 체크박스를 그리지 않는다) */
const ROW_SELECTION_RO: RowSelectionOptions<EntryLine> = { ...ROW_SELECTION, isRowSelectable: () => false };
const getRowId = (p: GetRowIdParams<EntryLine>) => p.data.key;
const TOTAL_KEY = '__total';
const MID: CellStyle = { display: 'flex', alignItems: 'center' };
const MID_NUM: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums' };
/* 계정코드 미입력(missingCode — 금액은 있는데 코드가 없는 행) — 경고 안쪽 테두리(closing_form errRule 관용구, 색만 warning) */
const WARN_CODE_RULE = {
  'shadow-[inset_0_0_0_2px_var(--warning)]': (p: CellClassParams<EntryLine>) => !p.node.rowPinned && !!p.data && missingCode(p.data),
};
/* 셀 안 입력·버튼의 키는 그리드에 넘기지 않는다 — 방향키가 셀 이동으로, Space 가 행 선택으로 새지 않게. Tab 은 브라우저 기본 이동 */
const suppressCtrlKeys = (p: SuppressKeyboardEventParams) => p.event.key === 'Tab' || !!(p.event.target as HTMLElement | null)?.closest?.('input,button,select');

const inputBox: React.CSSProperties = { ...drawerInputStyle('text'), height: 30, minHeight: 30, padding: '0 8px', width: '100%', minWidth: 0 };
const amountBox: React.CSSProperties = { ...inputBox, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
/* 셀 컨트롤 접근명 = 표시 행 순번("3행 계정코드") */
const rowNo = (p: ICellRendererParams<EntryLine>) => `${(p.node.rowIndex ?? 0) + 1}행`;

/* 셀 콜백 — columnDefs 는 고정(useMemo [])이라 최신 form 을 보는 함수들을 ref 로 넘긴다 */
interface CellActs {
  patch: (key: string, p: Partial<EntryLine>) => void;
  commitCode: (key: string) => void;
  commitAmount: (key: string, side: 'debit' | 'credit', n: number | null) => void;
  searchAccount: (key: string) => void;
  searchPartner: (key: string) => void;
  codeRef: (key: string, el: HTMLInputElement | null) => void;
}
type ActsRef = React.MutableRefObject<CellActs>;
type TextField = 'accountCode' | 'accountName' | 'memo' | 'mgmtNo' | 'partner' | 'accountNo';

/* 셀 입력칸 — 값은 로컬 state 가 즉시 들고 patch() 가 뒤따라 form.lines(SSOT)에 되쓴다(closing_form CellInput 관용구).
   이 화면은 바깥에서도 칸 값이 바뀐다(헤더 적요 추종·대표적요반영·⌥C·검색 반영·코드 blur 해석) — prop 값이 바뀌면 로컬을 다시 맞춘다 */
function CellInput({ row, field, label, acts, onEnter, onBlur, warn, inputRef, numeric }: {
  row: EntryLine; field: TextField; label: string; acts: ActsRef; onEnter?: () => void; onBlur?: () => void; warn?: boolean;
  inputRef?: (el: HTMLInputElement | null) => void; numeric?: boolean;
}) {
  const ext = row[field];
  const [v, setV] = useState(ext);
  useEffect(() => { setV(ext); }, [ext]);
  return (
    <input type="text" inputMode={numeric ? 'numeric' : undefined} value={v} aria-label={label} aria-invalid={warn || undefined} className={INPUT_CLS}
      ref={inputRef} style={inputBox}
      onChange={(e) => { setV(e.target.value); acts.current.patch(row.key, { [field]: e.target.value }); }}
      onKeyDown={onEnter ? (e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter(); } } : undefined}
      onBlur={onBlur} />
  );
}

/* 금액 입력 — 포커스 중엔 원값(캐럿 점프 방지), blur 시 천단위 콤마. '+' 키 = ×1,000.
   정수 원 단위만(소수점 차단) · '-' 는 맨 앞 한 번만(마이너스전표) */
const amountText = (v: string): string => (v.trimStart().startsWith('-') ? '-' : '') + v.replace(/[^0-9,]/g, '');
function AmountInput({ value, onCommit, label }: { value: number | null; onCommit: (n: number | null) => void; label: string }) {
  const [text, setText] = useState<string | null>(null);
  return (
    <input type="text" inputMode="numeric" aria-label={label} className={INPUT_CLS} style={amountBox}
      value={text ?? formatAmount(value)}
      onFocus={() => setText(value == null ? '' : String(value))}
      onChange={(e) => setText(amountText(e.target.value))}
      onKeyDown={(e) => {
        if (e.key !== '+') return;
        e.preventDefault();
        setText((t) => { const n = times1000(parseAmount(t ?? '')); return n == null ? '' : String(n); });
      }}
      onBlur={() => { const n = parseAmount(text ?? ''); setText(null); onCommit(n); }} />
  );
}

const textCell = (field: TextField, label: string, acts: ActsRef) => (p: ICellRendererParams<EntryLine>) =>
  p.data && !p.node.rowPinned ? <CellInput row={p.data} field={field} label={`${rowNo(p)} ${label}`} acts={acts} /> : null;

/* 검색형 칸 — 입력(Enter = 검색) + [검색] 버튼(closing_form 계정코드명 관용구) */
const searchCell = (field: 'accountName' | 'partner', label: string, acts: ActsRef, run: (a: CellActs, key: string) => void, noSearch = false) =>
  (p: ICellRendererParams<EntryLine>) => {
    if (!p.data || p.node.rowPinned) return null;
    const key = p.data.key;
    return (
      <span className="flex items-center gap-1.5 min-w-0 w-full">
        <span className="min-w-0 flex-1">
          <CellInput row={p.data} field={field} label={`${rowNo(p)} ${label}`} acts={acts} onEnter={() => run(acts.current, key)} />
        </span>
        {!noSearch && <Button variant="outline" size="sm" onClick={() => run(acts.current, key)}>검색<span className="sr-only"> {rowNo(p)} {label}</span></Button>}
      </span>
    );
  };

const amountCell = (side: 'debit' | 'credit', label: string, acts: ActsRef) => (p: ICellRendererParams<EntryLine>) => {
  if (!p.data) return null;
  if (p.node.rowPinned) return <span className="font-bold">{formatAmount(p.data[side])}</span>;
  const key = p.data.key;
  return <AmountInput label={`${rowNo(p)} ${label}`} value={p.data[side]} onCommit={(n) => acts.current.commitAmount(key, side, n)} />;
};

/* 설계서 컬럼: No. | ☐(SELECTION_COL) | 계정코드 | 계정과목 | 적요 | 관리번호 | 거래처 | 계좌번호 | 차변 | 대변 | 차액 */
/* noSearch — 삭제전표 상세(ACC-004)는 계정과목·거래처 [검색] 버튼을 그리지 않는다 */
const makeCols = (acts: ActsRef, noSearch = false): ColDef<EntryLine>[] => [
  /* No. — 표시 전용 좁은 칸(좌측·tabular). pinned 합계 행은 Σ */
  { colId: NO_COL_ID, headerName: 'No.', width: 56, minWidth: 56, maxWidth: 56, pinned: 'left', cellStyle: { fontVariantNumeric: 'tabular-nums', fontWeight: 400 },
    valueGetter: (p: ValueGetterParams<EntryLine>) => (p.node?.rowPinned ? 'Σ' : (p.node?.rowIndex ?? 0) + 1) },
  { field: 'accountCode', headerName: '계정코드', width: 150, minWidth: 150, cellStyle: MID, cellClassRules: WARN_CODE_RULE, suppressKeyboardEvent: suppressCtrlKeys,
    cellRenderer: (p: ICellRendererParams<EntryLine>) => {
      if (!p.data || p.node.rowPinned) return null;
      const key = p.data.key;
      const warn = missingCode(p.data);
      return (
        <span className="flex items-center gap-1 min-w-0 w-full">
          <span className="min-w-0 flex-1">
            <CellInput row={p.data} field="accountCode" label={`${rowNo(p)} 계정코드`} acts={acts} numeric warn={warn}
              inputRef={(el) => acts.current.codeRef(key, el)} onBlur={() => acts.current.commitCode(key)} />
          </span>
          {warn && <span role="img" aria-label="계정코드 미입력" title="계정코드 미입력" className="inline-flex shrink-0" style={{ color: 'var(--warning)' }}><Icon name="alert-triangle" size={16} /></span>}
        </span>
      );
    } },
  { field: 'accountName', headerName: '계정과목', flex: 1, minWidth: 220, width: 220, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys,
    cellRenderer: searchCell('accountName', '계정과목', acts, (a, k) => a.searchAccount(k), noSearch) },
  { field: 'memo', headerName: '적요', flex: 1, minWidth: 200, width: 200, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys, cellRenderer: textCell('memo', '적요', acts) },
  { field: 'mgmtNo', headerName: '관리번호', width: 130, minWidth: 130, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys, cellRenderer: textCell('mgmtNo', '관리번호', acts) },
  { field: 'partner', headerName: '거래처', flex: 1, minWidth: 220, width: 220, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys,
    cellRenderer: searchCell('partner', '거래처', acts, (a, k) => a.searchPartner(k), noSearch) },
  { field: 'accountNo', headerName: '계좌번호', width: 160, minWidth: 160, cellStyle: MID, suppressKeyboardEvent: suppressCtrlKeys, cellRenderer: textCell('accountNo', '계좌번호', acts) },
  { field: 'debit', headerName: '차변', type: 'rightAligned', width: 140, minWidth: 140, cellStyle: MID_NUM, suppressKeyboardEvent: suppressCtrlKeys, cellRenderer: amountCell('debit', '차변', acts) },
  { field: 'credit', headerName: '대변', type: 'rightAligned', width: 140, minWidth: 140, cellStyle: MID_NUM, suppressKeyboardEvent: suppressCtrlKeys, cellRenderer: amountCell('credit', '대변', acts) },
  /* 차액 — 표시 전용. 합계 행 차액≠0 이면 danger */
  { colId: 'diff', headerName: '차액', type: 'rightAligned', width: 130, minWidth: 130, cellStyle: MID_NUM,
    valueGetter: (p: ValueGetterParams<EntryLine>) => (p.data ? lineDiff(p.data) : null),
    cellRenderer: (p: ICellRendererParams<EntryLine>) => {
      if (p.value == null) return null;
      if (!p.node.rowPinned) return formatAmount(p.value);
      return <span className="font-bold" style={{ color: p.value !== 0 ? 'var(--danger-text)' : undefined }}>{formatAmount(p.value)}</span>;
    } },
];

export interface JournalEntryScreenProps {
  entry: EntryState;
  /** 저장 반영 — 페이지가 rows upsert(신규 채번) 후 저장된 행을 돌려준다. 삭제전표 상세(조회 전용)는 저장 경로가 없어 생략 */
  onSave?: (journal: JournalRow, opts: { submit: boolean }) => JournalRow;
  /** 삭제전표 상세(mode 'deleted') [복원] 확정 — 페이지가 행 제외·토스트. 화면 닫기는 이 컴포넌트가 확인창 닫힘 뒤에 한다 */
  onRestore?: () => void;
  /** 화면이 닫힌 뒤(exit 애니메이션 종료 후) 호출 */
  onClose: () => void;
  /** 거래처 원장(페이지 소유 — 간편추가분 포함). 기본 = 더미 원장 */
  partners?: readonly Partner[];
  /** 거래처 간편추가 저장 — 페이지 원장에 추가 */
  onAddPartner?: (p: Partner) => void;
}

type SaveKind = 'stay' | 'submit' | 'close';

export function JournalEntryScreen({ entry, onSave, onRestore, onClose, partners = PARTNERS, onAddPartner }: JournalEntryScreenProps) {
  const dlgRef = useRef<DialogHandle>(null);
  const [form, setForm] = useState<EntryForm>(() => formFromEntry(entry, todayStr()));
  const [baseline, setBaseline] = useState(() => formSnapshot(form));
  const [mode, setMode] = useState<EntryState['mode']>(entry.mode);
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [confirmClose, setConfirmClose] = useState(false);
  /* 계정과목 검색 팝업 대상 행 + 초기 검색어(그 행 계정과목 입력값) */
  const [acctSearch, setAcctSearch] = useState<{ key: string; keyword: string } | null>(null);
  /* 거래처 검색 팝업 대상 행 + 초기 검색어(그 행 거래처 입력값) */
  const [partnerSearch, setPartnerSearch] = useState<{ key: string; keyword: string } | null>(null);
  const readOnly = isReadOnlyEntry(mode, form.approval);
  /* 삭제전표 상세(ACC-004) — 진입 모드가 수명 동안 고정이라 entry 에서 바로 읽는다 */
  const deleted = entry.mode === 'deleted' ? entry : null;
  const [confirmRestore, setConfirmRestore] = useState(false);
  /* 복원 확인에서 [복원]을 눌렀는지 — AlertDialog 닫힘이 끝난 뒤 상세를 닫을지 판단([취소]·Esc 는 false = 상세 유지) */
  const restoredRef = useRef(false);
  const dirty = !readOnly && formSnapshot(form) !== baseline;

  const fundRef = useRef<HTMLDivElement>(null);
  const memoRef = useRef<HTMLDivElement>(null);
  const codeRefs = useRef(new Map<string, HTMLInputElement>());
  const lastRowKey = useRef<string | null>(null);
  const gridBoxRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<GridApi<EntryLine> | null>(null);
  const selKeysRef = useRef<string[]>([]);   // 이동 후 선택 재적용용(onRowDataUpdated)
  /* 저장 진행 중 플래그 — SaveButton 지연(데모 400ms) 동안 다른 저장 버튼·⌥S 가 두 번째 저장(신규 중복 생성)을 만들지 않게 */
  const savingRef = useRef(false);

  const set = <K extends keyof EntryForm>(k: K, v: EntryForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setLines = (fn: (ls: EntryLine[]) => EntryLine[]) => setForm((f) => ({ ...f, lines: fn(f.lines) }));
  const patchLine = (key: string, patch: Partial<EntryLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const bankAccounts = form.fundAccount ? FUND_BANK_ACCOUNTS[form.fundAccount] : [];
  const foreign = form.currency !== BASE_CURRENCY;

  /* ── 닫기: 모든 경로(X·Esc·[닫기]) → dirty 면 확인 ── */
  const requestClose = () => { if (dirty) setConfirmClose(true); else dlgRef.current?.close(); };

  /* ── 헤더 ── */
  const changeFund = (v: string) => setForm((f) => ({
    ...f, fundAccount: v as FundAccount | '',
    /* 계정구분이 바뀌면 그 계정구분 계좌가 아닌 거래처계좌번호는 비운다 */
    partnerAccountNo: v && FUND_BANK_ACCOUNTS[v as FundAccount]?.includes(f.partnerAccountNo) ? f.partnerAccountNo : '',
  }));
  const changeMemo = (v: string) => setForm((f) => ({ ...f, memo: v, lines: syncMemo(f.lines, f.memo, v) }));
  const changeCurrency = (v: string) => setForm((f) => ({ ...f, currency: v as Currency, ...(v === BASE_CURRENCY ? { exchangeRate: '', foreignAmount: '' } : {}) }));

  /* ── 행 반영(검색 팝업이 부른다 — 대상은 행 key) ── */
  const applyAccount = (key: string, a: AccountItem) => {
    const l = form.lines.find((x) => x.key === key); if (!l) return;
    const r = applyAccountTo(l, a);
    if (r.rejected) toast.warning(AGGREGATE_ACCOUNT_MSG);
    patchLine(l.key, { accountCode: r.line.accountCode, accountName: r.line.accountName });
  };
  const applyPartner = (key: string, p: Partner) => {
    const l = form.lines.find((x) => x.key === key); if (!l) return;
    const n = applyPartnerTo(l, p);
    patchLine(l.key, { partner: n.partner, mgmtNo: n.mgmtNo, accountNo: n.accountNo });
  };
  const searchAccount = (key: string) => {
    const l = form.lines.find((x) => x.key === key); if (!l) return;
    setAcctSearch({ key, keyword: l.accountName.trim() });
  };
  const searchPartner = (key: string) => {
    const l = form.lines.find((x) => x.key === key); if (!l) return;
    setPartnerSearch({ key, keyword: l.partner.trim() });
  };
  const commitCode = (key: string) => {
    const l = form.lines.find((x) => x.key === key); if (!l) return;
    const r = resolveCode(l);
    if (r.rejected) toast.warning(AGGREGATE_ACCOUNT_MSG);
    patchLine(key, { accountCode: r.line.accountCode, accountName: r.line.accountName });
  };
  /* 금액 blur = 값 반영 + 차액 자동 1행(같은 업데이트 안에서 판정) */
  const commitAmount = (key: string, side: 'debit' | 'credit', n: number | null) =>
    setLines((ls) => withAutoRow(ls.map((l) => (l.key === key ? { ...l, [side]: n } : l))));

  /* ── 분개 그리드(AG Grid) ── */
  /* 셀 콜백 — 매 렌더 최신 함수로 갈아 끼운다(columnDefs 는 고정) */
  const actsRef = useRef<CellActs>(null as unknown as CellActs);
  actsRef.current = {
    patch: patchLine, commitCode, commitAmount, searchAccount, searchPartner,
    codeRef: (key, el) => { if (el) codeRefs.current.set(key, el); else codeRefs.current.delete(key); },
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- columnDefs 고정(위 주석). deleted 는 진입 모드라 수명 동안 불변
  const columnDefs = useMemo(() => makeCols(actsRef, !!deleted), []);
  /* Σ 합계 행 — lines 가 바뀔 때만 새 배열(인라인 배열이면 고정 행이 매 렌더 재생성된다) */
  const pinnedBottom = useMemo<EntryLine[]>(() => {
    const t = entryTotals(form.lines);
    return [{ key: TOTAL_KEY, accountCode: '', accountName: '', memo: '', mgmtNo: '', partner: '', accountNo: '', debit: t.debit, credit: t.credit }];
  }, [form.lines]);

  const onSelectionChanged = (e: SelectionChangedEvent<EntryLine>) => {
    const keys = e.api.getSelectedRows().map((r) => r.key);
    selKeysRef.current = keys;
    setChecked(new Set(keys));
  };
  const clearSelection = () => { apiRef.current?.deselectAll(); selKeysRef.current = []; setChecked(new Set()); };
  /* 행 데이터가 바뀐 뒤 — ① 이동·복사한 행에 선택 재적용 ② No·차액·⚠ 처럼 field 가 아닌(또는 다른 field 에 기대는) 셀 다시 그리기
     (렌더러 인스턴스는 유지돼 입력칸 로컬 상태는 남는다) */
  const onRowDataUpdated = () => {
    const api = apiRef.current; if (!api) return;
    restoreSelection(api, selKeysRef.current);
    api.refreshCells({ force: true });
  };

  /* 그리드 도구 — 체크 행 기준 작업은 선택이 있을 때만 노출된다 */
  const sameOrder = (a: EntryLine[]) => a.every((l, i) => l.key === form.lines[i]?.key);
  const canUp = checked.size > 0 && !sameOrder(moveChecked(form.lines, checked, -1));
  const canDown = checked.size > 0 && !sameOrder(moveChecked(form.lines, checked, 1));
  const removeChecked = () => { if (!checked.size) return; const next = deleteChecked(form.lines, checked); clearSelection(); set('lines', next); };
  /* 빈행삭제 — 남는 행의 선택은 유지(사라진 행만 선택에서 뺀다) */
  const removeBlank = () => {
    const next = deleteBlank(form.lines);
    const alive = selKeysRef.current.filter((k) => next.some((l) => l.key === k));
    selKeysRef.current = alive;
    setChecked(new Set(alive));
    set('lines', next);
  };
  const selTools = checked.size > 0 && !readOnly ? (
    <>
      <span className="font-semibold self-center" style={{ fontSize: 13 }}>{String(checked.size)}건 선택됨</span>
      <Button variant="outline" size="sm" leadingIcon="arrow-up" disabled={!canUp} onClick={() => setLines((ls) => moveChecked(ls, checked, -1))}>위로이동</Button>
      <Button variant="outline" size="sm" leadingIcon="arrow-down" disabled={!canDown} onClick={() => setLines((ls) => moveChecked(ls, checked, 1))}>아래로이동</Button>
      <Button variant="outline" size="sm" leadingIcon="trash" onClick={removeChecked}>행삭제</Button>
      <Button variant="outline" size="sm" onClick={() => setLines((ls) => duplicateChecked(ls, checked))}>행복사</Button>
      <Button variant="ghost" size="sm" onClick={clearSelection}>선택 해제</Button>
    </>
  ) : null;
  /* 마지막으로 포커스한 행(⌥C 이전 적요 복사 대상) */
  const trackRow = (e: React.FocusEvent<HTMLDivElement>) => {
    const id = (e.target as HTMLElement).closest?.('[row-id]')?.getAttribute('row-id');
    if (id && id !== TOTAL_KEY) lastRowKey.current = id;
  };

  /* ── 저장 ── */
  const focusIn = (el: HTMLElement | null) => (el?.querySelector('button, select, input, textarea') as HTMLElement | null)?.focus();
  const submit = (kind: SaveKind): SubmitResult => {
    if (savingRef.current) return undefined;
    const check = validateEntry(form);
    if (!check.ok) {
      /* strict:false 라 `ok` 판별 유니온이 좁혀지지 않는다 — 실패 분기 타입으로 명시 */
      const v = check as Exclude<EntryCheck, { ok: true }>;
      toast.error(v.message);
      if (v.field === 'fundAccount') focusIn(fundRef.current);
      else if (v.field === 'memo') focusIn(memoRef.current);
      else if (v.field === 'accountCode') codeRefs.current.get(v.rowKey)?.focus();
      else if (v.field === 'amount') {
        apiRef.current?.ensureColumnVisible('debit');
        requestAnimationFrame(() => gridBoxRef.current?.querySelector<HTMLInputElement>(`.ag-center-cols-container [row-id="${v.rowKey}"] input[aria-label$="행 차변"]`)?.focus());
      }
      return undefined;
    }
    const journal = formToJournal(form);
    const base = form;
    savingRef.current = true;
    return () => {
      savingRef.current = false;
      const saved = onSave ? onSave(journal, { submit: kind === 'submit' }) : journal;
      toast.success(ENTRY_MSG.saved, kind === 'submit' ? { description: '결재 상신되었습니다' } : undefined);
      if (kind === 'stay') {
        /* 화면 유지 — 신규·복사·역분개는 이후 수정 모드(같은 id 로 다시 저장 = 중복 생성 없음). 빈 행은 화면에 그대로 둔다 */
        const next: EntryForm = { ...base, id: saved.id, slipNo: saved.slipNo, seq: saved.seq, slipDate: saved.slipDate, slipDateFollows: false, approval: saved.approval, createdBy: saved.createdBy };
        setForm(next);
        setBaseline(formSnapshot(next));
        setMode('edit');
      } else {
        dlgRef.current?.close();
      }
    };
  };

  /* ── 단축키 — 화면 open·입력 가능·확인창 없음일 때만 ── */
  const hk = { enabled: !readOnly && !confirmClose && !acctSearch && !partnerSearch };
  /* ⌥S — 저장 진행 중(SaveButton busy)이면 무시(submit 이 savingRef 로 막는다) */
  useHotkey(HOTKEYS.journalSave.combo, () => { const c = submit('stay'); if (typeof c === 'function') c(); }, hk);
  useHotkey(HOTKEYS.journalCopyLast.combo, () => setLines(copyLastAppend), hk);
  useHotkey(HOTKEYS.journalDeleteRows.combo, removeChecked, hk);
  useHotkey(HOTKEYS.journalCopyMemo.combo, () => setLines((ls) => copyPrevMemo(ls, lastRowKey.current)), hk);

  const HELP_ROWS: [string, string][] = [
    ['전표 임시저장', HOTKEYS.journalSave.hint], ['이전 적요 복사', HOTKEYS.journalCopyMemo.hint],
    ['마지막행 복사 및 추가', HOTKEYS.journalCopyLast.hint], ['행 추가', '마지막 행에서 ↓ (미지원 — [행추가] 사용)'],
    ['행 삭제', HOTKEYS.journalDeleteRows.hint], ['행 삽입', HOTKEYS.showAll.hint + ' (미지원 — 전역 단축키와 충돌)'],
    ['행 이동', HOTKEYS.refresh.hint + ' (미지원 — 전역 단축키와 충돌)'], ['저장 버튼으로 이동', '차액에서 Enter (미지원)'],
    ['계정과목 자동 선택', '계정코드 + Tab'], ['계정과목 검색', '키워드 + Enter'],
    ['1,000단위 입력', '금액에서 +'], ['적요 자동 입력', '대표 적요 입력 시'],
    ['행 자동 추가', '차액 발생 시 1행'],
    ['⌥ 단축키 공통', '입력칸 밖(포커스 해제 상태)에서 동작'],
  ];

  const existingFiles = parseFileNames(form.attachments);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent hideClose className="w-[calc(100vw-48px)] h-[calc(100vh-48px)] max-w-none"
        onInteractOutside={(e) => e.preventDefault()}
        /* 삭제전표 상세 — 첫 포커스 가능 요소(첨부 카드·그리드)로 가지 않게 컨테이너(tabIndex=-1)에 둔다 */
        onOpenAutoFocus={deleted ? (e) => { e.preventDefault(); (e.currentTarget as HTMLElement | null)?.focus(); } : undefined}
        onEscapeKeyDown={(e) => { e.preventDefault(); if (!confirmClose && !confirmRestore && !acctSearch && !partnerSearch) requestClose(); }}>
        <DialogHeader className="px-6">
          <DialogTitle>{TITLE[mode]}</DialogTitle>
          <DialogDescription className="sr-only">{deleted ? '삭제된 전표의 헤더·분개·증빙·관리항목 — 조회 전용' : '일반전표의 헤더·분개·증빙·관리항목을 입력합니다'}</DialogDescription>
          <IconBtn icon="x" label="닫기" size={34} onClick={requestClose} />
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {deleted && (
            <div className="px-6 pt-4">
              <Alert variant="info">
                <Icon name="info" size={18} />
                <AlertDescription className="text-foreground">
                  <div>삭제된 전표입니다. 모든 항목은 조회 전용이며 수정할 수 없습니다.</div>
                  <div className="text-muted-foreground">{`삭제일시 ${deleted.deletedAt} · 삭제자 ${deleted.deletedBy} — [복원] 시 일반전표관리(ACC-003) 목록으로 되돌아갑니다.`}</div>
                </AlertDescription>
              </Alert>
            </div>
          )}
          {readOnly && !deleted && (
            <div role="note" className="flex items-center gap-2 text-muted-foreground px-6 pt-4" style={{ fontSize: 13 }}>
              <Icon name="info" size={15} />결재 {form.approval} 전표는 조회만 할 수 있습니다.
            </div>
          )}
          <fieldset disabled={readOnly} className="border-0 p-0 m-0" style={{ minWidth: 0 }}>
            <div className="flex flex-col min-[769px]:flex-row gap-6 p-6 items-start">
              {/* ────────── 좌측 본문 ────────── */}
              <div className="flex-1 min-w-0 w-full">
                {/* ① 헤더 */}
                <Section title="전표 정보">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5">
                    {/* 삭제전표 상세(ACC-004)는 "전 항목 비활성, 필수(*) 표시 없음" — 모듈 상수는 그대로 두고 렌더에서만 required 를 끈다 */}
                    <Field label={F_FUND.label} required={!deleted} plain>
                      <div ref={fundRef}><SchemaField field={deleted ? { ...F_FUND, required: false } : F_FUND} value={form.fundAccount} onChange={changeFund} /></div>
                    </Field>
                    <Field label={F_KIND.label}><SchemaField field={F_KIND} value={form.slipKind} onChange={() => undefined} /></Field>
                    <Field label={F_WRITER.label}><SchemaField field={F_WRITER} value={form.writer} onChange={() => undefined} /></Field>
                    <Field label={F_WDATE.label} plain={isPlainWrapControl(F_WDATE.control)}>
                      <SchemaField field={F_WDATE} value={form.writtenDate} onChange={(v) => set('writtenDate', v)} />
                    </Field>
                    <Field label={F_ORIGIN.label}><SchemaField field={F_ORIGIN} value={form.origin} onChange={() => undefined} /></Field>
                    <div className="hidden sm:block" />
                    <Field label={F_MEMO.label} required={!deleted} className="sm:col-span-3">
                      <div ref={memoRef}><SchemaField field={deleted ? { ...F_MEMO, required: false } : F_MEMO} value={form.memo} onChange={changeMemo} /></div>
                    </Field>
                  </div>
                </Section>

                {/* ② 분개 그리드 — 결산양식 관리(ACC-002) 편집 그리드 규칙. 행을 고르면 도구 앞에 선택 작업이 붙는다 */}
                <Section title="분개" actions={deleted ? undefined : (
                  <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="분개 그리드 도구">
                    {selTools}
                    <Button variant="outline" size="sm" leadingIcon="plus" disabled={readOnly} onClick={() => setLines((ls) => [...ls, emptyLine()])}>행추가</Button>
                    <Button variant="outline" size="sm" disabled={readOnly} onClick={removeBlank}>빈행삭제</Button>
                    <Button variant="outline" size="sm" disabled={readOnly} onClick={() => setLines((ls) => applyRepMemo(ls, form.memo))}>대표적요반영</Button>
                  </div>
                )}>
                  <div ref={gridBoxRef} className="apfs-grid-min" role="region" aria-label="분개 그리드 — 체크박스로 행을 고르면 도구에 위로·아래로이동·행삭제·행복사가 뜬다" onFocusCapture={trackRow}>
                    <AgGridReact<EntryLine>
                      theme={apfsTheme}
                      rowData={form.lines}
                      columnDefs={columnDefs}
                      defaultColDef={EDIT_COL_DEF}
                      getRowId={getRowId}
                      domLayout="autoHeight"
                      suppressColumnVirtualisation
                      /* 삭제전표 상세는 행 도구가 없어 선택 체크박스 열 자체를 뺀다(ACC-003 조회 전용은 기존대로 RO 선택) */
                      rowSelection={deleted ? undefined : readOnly ? ROW_SELECTION_RO : ROW_SELECTION}
                      selectionColumnDef={deleted ? undefined : SELECTION_COL}
                      pinnedBottomRowData={pinnedBottom}
                      onGridReady={(e) => { apiRef.current = e.api; }}
                      onSelectionChanged={onSelectionChanged}
                      onRowDataUpdated={onRowDataUpdated}
                    />
                  </div>
                </Section>

                {/* ③ 증빙·첨부 */}
                <Section title="증빙 · 첨부">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5">
                    <Field label="증빙구분" plain>
                      <div style={selectWrap}>
                        <SearchableSelect value={form.evidenceType} onChange={(v) => set('evidenceType', v as EvidenceType | '')} options={EVIDENCE_TYPES}
                          placeholder="선택해 주세요" ariaLabel="증빙구분" fill triggerStyle={selectTrigger} />
                      </div>
                    </Field>
                    <Field label={F_STORAGE.label}><SchemaField field={F_STORAGE} value={form.storage} onChange={(v) => set('storage', v)} /></Field>
                    <Field label="증빙미첨부" plain>
                      <div className="inline-flex items-center gap-2" style={{ minHeight: 34 }}>
                        <Checkbox id="je-no-evidence" aria-label="증빙미첨부" checked={form.noEvidence} onCheckedChange={(c) => set('noEvidence', c === true)} />
                        <label htmlFor="je-no-evidence" style={{ fontSize: 13.5, cursor: 'pointer', userSelect: 'none' }}>증빙미첨부</label>
                      </div>
                    </Field>
                  </div>
                  <Field label="첨부파일" plain>
                    {readOnly ? (
                      existingFiles.length ? (
                        <AttachmentGroup>
                          {existingFiles.map((name, i) => (
                            <Attachment key={name + i} size="sm">
                              <AttachmentMedia fileName={name} />
                              <AttachmentContent>
                                <AttachmentTitle>{name}</AttachmentTitle>
                                <AttachmentDescription state="done">{fileExtLabel(name)} · 업로드됨</AttachmentDescription>
                              </AttachmentContent>
                            </Attachment>
                          ))}
                        </AttachmentGroup>
                      ) : <span className="text-muted-foreground" style={{ fontSize: 13 }}>첨부 없음</span>
                    ) : (
                      <DocumentsField value={form.attachments} onChange={(v) => set('attachments', v)} label="첨부파일" multiple maxSize="20MB" describedBy="je-attach-hint" />
                    )}
                    {/* 업로드 안내 — 삭제전표 상세는 업로드 영역이 없어 숨긴다 */}
                    {!deleted && (
                      <div id="je-attach-hint" className="mt-1.5">
                        {ATTACH_HINTS.map((t) => (
                          <p key={t} className="m-0 flex items-start gap-1 text-caption" style={{ fontSize: 11.5 }}><Icon name="info" size={13} />{t}</p>
                        ))}
                      </div>
                    )}
                  </Field>
                </Section>
              </div>

              {/* ────────── 우측 사이드 ⑤ ────────── */}
              <aside className="w-full min-[769px]:w-[320px] shrink-0">
                <Section title="관리항목">
                  <Field label="거래처계좌번호" plain>
                    {/* slide 12: 계정구분 선택 후 조회 — 선택 전 비활성 */}
                    <fieldset disabled={!form.fundAccount} className="border-0 p-0 m-0" style={{ minWidth: 0 }}>
                      <div style={selectWrap}>
                        <SearchableSelect value={form.partnerAccountNo} onChange={(v) => set('partnerAccountNo', v)} options={bankAccounts}
                          placeholder="선택해 주세요" ariaLabel="거래처계좌번호" fill triggerStyle={selectTrigger} />
                      </div>
                    </fieldset>
                  </Field>
                  <Field label={F_DUE.label} plain={isPlainWrapControl(F_DUE.control)}>
                    <SchemaField field={F_DUE} value={form.fundDueDate} onChange={(v) => set('fundDueDate', v)} />
                  </Field>
                  <Field label={F_CUR.label}><SchemaField field={F_CUR} value={form.currency} onChange={changeCurrency} fill /></Field>
                  <fieldset disabled={!foreign} className="border-0 p-0 m-0" style={{ minWidth: 0 }}>
                    <Field label={F_RATE.label}><SchemaField field={F_RATE} value={form.exchangeRate} onChange={(v) => set('exchangeRate', v)} fill /></Field>
                    <Field label={F_FAMT.label}><SchemaField field={F_FAMT} value={form.foreignAmount} onChange={(v) => set('foreignAmount', v)} fill /></Field>
                  </fieldset>
                </Section>
                <Section title="손익계정">
                  <Field label="손익부서" plain>
                    <div style={selectWrap}>
                      <SearchableSelect value={form.plDept} onChange={(v) => set('plDept', v)} options={PL_DEPTS} placeholder="선택해 주세요" ariaLabel="손익부서" fill triggerStyle={selectTrigger} />
                    </div>
                  </Field>
                  <Field label="손익사원" plain>
                    <div style={selectWrap}>
                      <SearchableSelect value={form.plEmployee} onChange={(v) => set('plEmployee', v)} options={PL_EMPLOYEES} placeholder="선택해 주세요" ariaLabel="손익사원" fill triggerStyle={selectTrigger} />
                    </div>
                  </Field>
                </Section>
                {/* 기능·작성 도움말 — 입력용 안내라 삭제전표 상세(조회 전용)에선 숨긴다 */}
                {!deleted && (<>
                  <Section title="기능 도움말">
                    <table className="w-full border-collapse" style={{ fontSize: 12.5, tableLayout: 'fixed' }}>
                      <thead><tr><th style={th}>기능</th><th style={th}>키 · 조건</th></tr></thead>
                      <tbody>
                        {HELP_ROWS.map(([f, k]) => <tr key={f}><td style={td}>{f}</td><td style={{ ...td, color: 'var(--muted-foreground)' }}>{k}</td></tr>)}
                      </tbody>
                    </table>
                  </Section>
                  <Section title="작성 도움말">
                    <div style={{ fontSize: 13 }}>
                      <p className="m-0 font-semibold">계정구분 필수 선택</p>
                      <p className="m-0 mb-2 text-muted-foreground">- 계좌번호 선택 전 계정구분을 먼저 선택</p>
                      <p className="m-0 font-semibold">필수값 지정</p>
                      <p className="m-0 text-muted-foreground">- 계정과목별 필수입력사항은 회계/자금 &gt; 기초관리 &gt; 계정과목에서 설정</p>
                    </div>
                  </Section>
                </>)}
              </aside>
            </div>
          </fieldset>
        </div>

        {/* ④ 버튼 — 조회 전용은 [닫기]만(slide 26). 삭제전표 상세는 [복원]·[닫기](권한 노출은 RBAC 미구현이라 항상) */}
        <DialogFooter className="px-6">
          <div />
          <div className="flex flex-wrap gap-2">
            {!readOnly && <>
              <SaveButton onSubmit={() => submit('stay')}>저장</SaveButton>
              <SaveButton variant="outline" leadingIcon="" busyLabel="상신 중" onSubmit={() => submit('submit')}>저장 후 상신</SaveButton>
              <SaveButton variant="outline" leadingIcon="" onSubmit={() => submit('close')}>저장 후 닫기</SaveButton>
            </>}
            {deleted && onRestore && (
              <Button variant="primary" size="sm" leadingIcon="history" onClick={() => { restoredRef.current = false; setConfirmRestore(true); }}>복원</Button>
            )}
            <Button variant="outline" size="sm" onClick={requestClose}>닫기</Button>
          </div>
        </DialogFooter>

        {acctSearch && (
          <AccountSearchModal open onOpenChange={(o) => { if (!o) setAcctSearch(null); }}
            onSelect={(a) => applyAccount(acctSearch.key, a)} initialKeyword={acctSearch.keyword} selectable={(a) => a.inputYn === 'Y'} />
        )}
        {partnerSearch && (
          <PartnerSearchModal open onOpenChange={(o) => { if (!o) setPartnerSearch(null); }}
            onSelect={(p) => applyPartner(partnerSearch.key, p)} initialKeyword={partnerSearch.keyword}
            list={partners} onAdd={(p) => onAddPartner?.(p)} />
        )}

        {/* 삭제전표 복원 확인 — Action onClick 은 onRestore 만(상위 state 를 비우면 exit 가 사라진다). 상세 닫기는 onOpenChange(false)(exit 종료 뒤)에서.
            실패 경로는 백엔드 없는 데모라 없다 */}
        {deleted && (
          <AlertDialog open={confirmRestore} onOpenChange={(o) => {
            if (o) return;
            setConfirmRestore(false);
            if (restoredRef.current) { restoredRef.current = false; dlgRef.current?.close(); }
          }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>전표 복원</AlertDialogTitle>
                <AlertDialogDescription>전표를 복원하시겠습니까?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={() => { restoredRef.current = true; onRestore?.(); }}>복원</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* 입력 중 닫기 확인 */}
        <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>닫기 확인</AlertDialogTitle>
              <AlertDialogDescription>저장하지 않고 닫으시겠습니까?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel autoFocus>취소</AlertDialogCancel>
              <Button variant="primary" size="sm" onClick={() => { setConfirmClose(false); dlgRef.current?.close(); }}>닫기</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
