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
   - 전표검색 전표상세(ACC-008 slide 12·16) = readOnly prop + hideGridTools(분개 그리드 도구 미노출) + onCopy(하단 [복사]·[닫기]).
     둘 다 선택 prop 이라 같은 readOnly 를 쓰는 미결계정 관리(ACC-005 E09)는 그대로(도구 비활성 표시·[닫기]만).
     [복사]는 onCopy(의도 기록)만 부르고 이 화면을 ref.close() 로 닫는다 — 복사 등록 화면은 페이지가 onClose(exit 종료 뒤)에서 연다.
   - 증빙첨부(ACC-006 slide12, mode 'evidence') = ③ 증빙·첨부만 입력. ①헤더·②분개·⑤관리항목/손익계정은 감싼 <fieldset disabled>
     (중첩 fieldset 은 안쪽을 다시 켤 수 없어 ③ 은 감싸지 않는다 — 감싸는 래퍼는 이 모드에서만 렌더해 다른 모드 DOM 은 그대로).
     분개 그리드 도구·행 선택 체크박스 열·셀 [검색] 버튼 미노출(설계서는 '비활성 표시'지만 분개가 읽기 전용이라 사용자 결정으로 숨김 —
     삭제전표 상세와 같은 처리: viewOnlyGrid). 잠긴 영역 컨트롤은 fieldset 으로 전부 :disabled(Tab·클릭 불가)이고 모양도 삭제전표 상세와 같다,
     필수 `*` 미표시, ⌥ 단축키 전부 끔(설계서 "비활성" — ⌥K·⌥Z·⌥C·⌥I·⌥↑·⌥↓·⌥+ 는 fieldset 을 우회한다).
   - 조회 전용 = 회색 비활성 통일(2026-11-02 사용자 결정). 위 조회 전용 경로(mode 'deleted' · readOnly prop · isReadOnlyEntry · 'evidence' 잠금 영역)의
     disabled 입력·select·textarea·팝오버 트리거를 전표구분·작성자(readonly 칸)와 같은 var(--muted)/var(--muted-foreground) 로 칠한다.
     규칙은 journal_entry_screen.css 한 곳 — 조회 전용 fieldset 에만 붙는 data-ro-lock 으로 스코프(편집 모드의 disabled 칸
     — 계정구분 미선택 거래처계좌번호·원화 환율/외화금액 — 은 모양 그대로). 증빙첨부 ③ 증빙·첨부는 활성이라 흰색 유지.
     첨부는 전용 업로더(missing_evidence_upload — 허용 확장자 13종·20MB·파일별 안내). 저장 검증은 validateEntry 대신 validateEvidence,
     하단 [저장]·[저장 후 닫기]·[닫기]([저장 후 상신] 미노출). [저장] 뒤에도 모드는 그대로(edit 전환 없음 — 승인 전표가 잠기지 않게).
     ⚠ 의존 방향: 이 공용 화면(ACC-003)이 ACC-006 모듈(missing_evidence_upload·missing_evidence_model 의 EvidenceUpload·EVIDENCE_MSG·validateEvidence)을
       import 한다(역방향). 'evidence' 모드 변경은 ACC-003 번들·회귀 범위에 함께 묶인다 — 다른 화면이 같이 쓰게 되면 중립 모듈로 올린다.
   - 금액 `+` 키 = ×1,000. 설계서의 `-`(÷?)는 음수(마이너스전표) 입력과 충돌해 구현하지 않음.
   - 단축키 ⌥S·⌥K·⌥Z·⌥C·⌥I·⌥↑·⌥↓·⌥+ 는 공용 훅 특성상 입력창 포커스 중엔 무시된다(공용 훅 수정 안 함).
     설계서 Alt+A(행 삽입)·Alt+R(행 이동)·'마지막 행에서 ↓'(행 추가)는 사용자 지정 ⌥I·⌥↑·⌥↓·⌥+ 로 대신한다(2026-11-04). ⌥S 는 SaveButton 을 거치지 않아 스피너 없이 즉시 저장.
   - 계정과목 [검색]/키워드+Enter = 회계 공용 AccountSearchModal(입력여부 Y 만 선택 가능).
   - 거래처 [검색]/키워드+Enter = PartnerSearchModal(청크 C). 거래처 원장·간편추가는 페이지가 소유(partners·onAddPartner) —
     간편추가 거래처가 페이지 수명 동안 남고 업로드 거래처코드 해석에도 쓰인다. 반영 = 거래처명·관리번호·계좌번호.
   - 결산전표(ACC-015 slide 12, closing prop) = 같은 화면 + 차이 3가지. closing 미전달이면 동작·DOM 그대로.
     ① 헤더 전표발생구분 = 가결산/결산 셀렉트(필수 *, 신규 기본 미선택 '선택') — 일반의 readonly 칸 대신
     ② 저장 검증 = validateEntry(form, { closing: true })(계정구분·작성일·전표발생구분·계정코드·차액만 — 적요 필수·금액 없는 행 검사 생략)
     ③ 적요 * 미표시 · 작성 도움말 = 결산전표 안내. 가결산 환원전표 생성·동기화는 페이지(onSave)가 한다(이 화면은 원전표 1건만 넘긴다). */
import '../../aggrid_shared.css';
import './journal_entry_screen.css';   // 조회 전용 = 회색 비활성 통일([data-ro-lock] 스코프)
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
import type { Currency, EvidenceType, FundAccount, JournalOrigin, JournalRow, Partner } from './general_journal_data';
import type { AccountItem } from '../account_data';
import { AccountSearchModal } from '../account_search_modal';
import { PartnerSearchModal } from './partner_search_modal';
import { EvidenceUpload } from './missing_evidence_upload';   // 증빙첨부(ACC-006) 전용 업로더
import { EVIDENCE_MSG, validateEvidence } from './missing_evidence_model';
import type { EvidenceCheck } from './missing_evidence_model';
import {
  AGGREGATE_ACCOUNT_MSG, ENTRY_MSG, applyAccountTo, applyPartnerTo, applyRepMemo, copyLastAppend, copyPrevMemo, insertBlankAbove, deleteBlank, deleteChecked,
  duplicateChecked, emptyLine, entryTotals, formFromEntry, formSnapshot, formToJournal, formatAmount, isReadOnlyEntry, lineDiff, missingCode,
  moveChecked, parseAmount, resolveCode, syncMemo, times1000, validateEntry, withAutoRow,
} from './general_journal_model';
import type { EntryCheck, EntryForm, EntryLine, EntryState } from './general_journal_model';

const { Button, SaveButton, IconBtn } = UI;

const TITLE: Record<EntryState['mode'], string> = { new: '전표등록', copy: '전표등록 (복사)', reverse: '전표등록 (역분개)', edit: '전표등록 (수정)', deleted: '전표상세', evidence: '증빙첨부' };
/* 강제 조회 전용(readOnly prop — 미결계정 관리 E09) 제목 — mode 가 edit 여도 "수정"으로 보이지 않게 */
const VIEW_TITLE = '전표상세';

/* 헤더·관리항목 필드 명세 — SchemaField 재사용(34px 박스·DatePicker·토큰 자동) */
const F_FUND: FieldSpec = { key: 'fundAccount', label: '계정구분', control: 'select', options: [...FUND_ACCOUNTS], required: true, searchable: true };
const F_KIND: FieldSpec = { key: 'slipKind', label: '전표구분', control: 'readonly' };
const F_WRITER: FieldSpec = { key: 'writer', label: '작성자', control: 'readonly' };
const F_WDATE: FieldSpec = { key: 'writtenDate', label: '작성일', control: 'date' };
const F_ORIGIN: FieldSpec = { key: 'origin', label: '전표발생구분', control: 'readonly' };
const F_MEMO: FieldSpec = { key: 'memo', label: '적요', control: 'textarea', required: true };
/* 결산전표 전표발생구분 셀렉트 — 옵션 2개라 검색 없는 native select. placeholder 필수(없으면 '' 값이 첫 옵션처럼 보인다 — 숨김 '선택' 옵션으로 미선택 표시) */
const closingOriginField = (origins: readonly string[]): FieldSpec => ({ key: 'origin', label: '전표발생구분', control: 'select', options: [...origins], required: true, placeholder: '선택' });
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

/* 증빙첨부(ACC-006)에서 ③ 밖 영역을 잠그는 래퍼 — on 일 때만 fieldset 을 렌더한다(다른 모드 DOM 불변) */
function LockWhen({ on, children }: { on: boolean; children: React.ReactNode }) {
  return on ? <fieldset disabled data-ro-lock="" className="border-0 p-0 m-0" style={{ minWidth: 0 }}>{children}</fieldset> : <>{children}</>;
}

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
/* noSearch — 삭제전표 상세(ACC-004)·증빙첨부(ACC-006)는 계정과목·거래처 [검색] 버튼을 그리지 않는다(셀 입력은 바깥 fieldset 으로 비활성) */
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
  /** 강제 조회 전용(미결계정 관리 E09 전표상세) — 결재 상태와 무관하게 입력 불가·[닫기]만·제목 "전표상세" */
  readOnly?: boolean;
  /** 강제 조회 전용(readOnly)일 때 분개 그리드 도구(행추가·빈행삭제·대표적요반영) 미노출 — 전표검색 전표상세(ACC-008 slide 12) */
  hideGridTools?: boolean;
  /** 강제 조회 전용(readOnly)·비삭제일 때 하단 [복사]를 [닫기] 앞에 노출 — 누르면 이 콜백 뒤 화면을 닫는다(ACC-008 slide 12).
      복사 등록 화면은 페이지가 onClose(exit 종료 뒤)에서 연다 — 여기서 상위 state 를 바꾸면 exit 애니메이션이 사라진다 */
  onCopy?: () => void;
  /** 결산전표 관리(ACC-015) — 헤더 전표발생구분 선택지(가결산·결산). 전달하면 결산 변형(위 머리 주석), 미전달이면 일반 그대로 */
  closing?: { origins: readonly JournalOrigin[] };
}

type SaveKind = 'stay' | 'submit' | 'close';

export function JournalEntryScreen({ entry, onSave, onRestore, onClose, partners = PARTNERS, onAddPartner, readOnly: forceReadOnly = false, hideGridTools = false, onCopy, closing }: JournalEntryScreenProps) {
  const dlgRef = useRef<DialogHandle>(null);
  /* 결산전표 신규 = 전표발생구분 미선택('') — 기준선 스냅샷도 같은 값에서 시작한다. EntryForm.origin 타입엔 '' 가 없어 단언 */
  const [form, setForm] = useState<EntryForm>(() => {
    const f = formFromEntry(entry, todayStr());
    return closing && entry.mode === 'new' ? { ...f, origin: '' as JournalOrigin } : f;
  });
  const [baseline, setBaseline] = useState(() => formSnapshot(form));
  const [mode, setMode] = useState<EntryState['mode']>(entry.mode);
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [confirmClose, setConfirmClose] = useState(false);
  /* 계정과목 검색 팝업 대상 행 + 초기 검색어(그 행 계정과목 입력값) */
  const [acctSearch, setAcctSearch] = useState<{ key: string; keyword: string } | null>(null);
  /* 거래처 검색 팝업 대상 행 + 초기 검색어(그 행 거래처 입력값) */
  const [partnerSearch, setPartnerSearch] = useState<{ key: string; keyword: string } | null>(null);
  const readOnly = forceReadOnly || isReadOnlyEntry(mode, form.approval);
  /* 결산전표 전표발생구분 = 편집 가능하고 값이 미선택·선택지 안일 때만 셀렉트. 조회 전용·환원전표('가결산(환원)')는 F_ORIGIN 읽기 전용 */
  const originSelect = !!closing && !readOnly && (!form.origin || (closing.origins as readonly string[]).includes(form.origin));
  /* 삭제전표 상세(ACC-004) — 진입 모드가 수명 동안 고정이라 entry 에서 바로 읽는다 */
  const deleted = entry.mode === 'deleted' ? entry : null;
  const [confirmRestore, setConfirmRestore] = useState(false);
  /* 증빙첨부(ACC-006) — 진입 모드가 수명 동안 고정이라 entry 에서 바로 읽는다(mode state 는 [저장] 뒤에도 바뀌지 않는다) */
  const evidence = entry.mode === 'evidence';
  /* 필수 `*` 미표시 — 삭제전표 상세·증빙첨부(설계서 헤더 필수 칸 비어 있음) */
  const noReq = !!deleted || evidence;
  /* 분개 조회 전용 그리드 — 삭제전표 상세 · 증빙첨부(ACC-006 — 설계서는 '비활성 표시'지만 분개가 읽기 전용이라 사용자 결정으로 숨김).
     그리드 도구·행 선택 체크박스 열·셀 [검색] 버튼 미노출(전표검색 전표상세·ACC-003 조회 전용은 기존대로 RO 선택·[검색] 비활성 표시) */
  const viewOnlyGrid = !!deleted || evidence;
  /* 분개 그리드 도구 미노출 — 위 조회 전용 그리드 · 전표검색 전표상세(readOnly + hideGridTools) */
  const noGridTools = viewOnlyGrid || (forceReadOnly && hideGridTools);
  /* 하단 [복사] — 강제 조회 전용·비삭제 + onCopy 를 넘긴 화면만(전표검색 전표상세) */
  const showCopy = forceReadOnly && !deleted && !!onCopy;
  const evTypeRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLButtonElement>(null);
  /* 복원 확인에서 [복원]을 눌렀는지 — AlertDialog 닫힘이 끝난 뒤 상세를 닫을지 판단([취소]·Esc 는 false = 상세 유지) */
  const restoredRef = useRef(false);
  const dirty = !readOnly && formSnapshot(form) !== baseline;

  const fundRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);
  const wdateRef = useRef<HTMLDivElement>(null);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- columnDefs 고정(위 주석). viewOnlyGrid(deleted·evidence)는 진입 모드라 수명 동안 불변
  const columnDefs = useMemo(() => makeCols(actsRef, viewOnlyGrid), []);
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
    /* 증빙첨부(ACC-006) — 증빙 항목만 검증(slide 12 '저장 검증' 표). 실패 = 토스트 + 해당 입력란 초점 */
    if (evidence) {
      const ev = validateEvidence(form);
      if (!ev.ok) {
        const v = ev as Exclude<EvidenceCheck, { ok: true }>;
        toast.error(v.message);
        if (v.field === 'evidenceType') focusIn(evTypeRef.current); else uploadRef.current?.focus();
        return undefined;
      }
    }
    const check = evidence ? ({ ok: true } as EntryCheck) : closing ? validateEntry(form, { closing: true }) : validateEntry(form);
    if (!check.ok) {
      /* strict:false 라 `ok` 판별 유니온이 좁혀지지 않는다 — 실패 분기 타입으로 명시 */
      const v = check as Exclude<EntryCheck, { ok: true }>;
      toast.error(v.message);
      if (v.field === 'fundAccount') focusIn(fundRef.current);
      else if (v.field === 'writtenDate') focusIn(wdateRef.current);
      else if (v.field === 'origin') focusIn(originRef.current);
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
      /* 결산전표 가결산 = 환원전표 포함 2건(slide 12 저장 결과) — 상신 안내와 함께 description 으로 */
      const pairNote = closing && journal.origin === '가결산' ? '가결산 환원전표 포함 2건' : '';
      if (pairNote) toast.success(ENTRY_MSG.saved, { description: kind === 'submit' ? `${pairNote} · 결재 상신되었습니다` : pairNote });
      else toast.success(evidence ? EVIDENCE_MSG.saved : ENTRY_MSG.saved, kind === 'submit' ? { description: '결재 상신되었습니다' } : undefined);
      if (kind === 'stay' && evidence) {
        /* 증빙첨부 — 화면 유지, 모드 그대로(edit 로 바꾸면 제목이 바뀌고 상신·승인 전표는 조회 전용으로 잠긴다). 기준선만 갱신 */
        setBaseline(formSnapshot(base));
      } else if (kind === 'stay') {
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
  /* 증빙첨부는 설계서상 단축키 비활성 — ⌥K·⌥Z·⌥C·⌥I·⌥↑·⌥↓·⌥+ 는 fieldset 을 거치지 않고 분개를 바꾸므로 반드시 끈다 */
  const hk = { enabled: !readOnly && !evidence && !confirmClose && !acctSearch && !partnerSearch };
  /* ⌥S — 저장 진행 중(SaveButton busy)이면 무시(submit 이 savingRef 로 막는다) */
  useHotkey(HOTKEYS.journalSave.combo, () => { const c = submit('stay'); if (typeof c === 'function') c(); }, hk);
  useHotkey(HOTKEYS.journalCopyLast.combo, () => setLines(copyLastAppend), hk);
  useHotkey(HOTKEYS.journalDeleteRows.combo, removeChecked, hk);
  useHotkey(HOTKEYS.journalCopyMemo.combo, () => setLines((ls) => copyPrevMemo(ls, lastRowKey.current)), hk);
  /* ⌥I — 마지막으로 포커스한 행(체크박스 클릭 포함) 바로 위에 빈 행. 대상이 없으면 무동작 */
  useHotkey(HOTKEYS.journalInsertRow.combo, () => setLines((ls) => insertBlankAbove(ls, lastRowKey.current)), hk);
  /* ⌥↑·⌥↓ = [위로이동]·[아래로이동](체크 행). 체크 행이 없으면 가로채지 않는다 — 키가 그대로 지나가 스크롤 등 기본 동작이 산다 */
  const hkMove = { enabled: hk.enabled && checked.size > 0 };
  useHotkey(HOTKEYS.journalMoveUp.combo, () => setLines((ls) => moveChecked(ls, checked, -1)), hkMove);
  useHotkey(HOTKEYS.journalMoveDown.combo, () => setLines((ls) => moveChecked(ls, checked, 1)), hkMove);
  /* ⌥+ = [행추가](끝에 빈 행). 설계서 '마지막 행에서 ↓' 대체(2026-11-04 사용자 지정) */
  useHotkey(HOTKEYS.journalAddRow.combo, () => setLines((ls) => [...ls, emptyLine()]), hk);

  const HELP_ROWS: [string, string][] = [
    ['전표 임시저장', HOTKEYS.journalSave.hint], ['이전 적요 복사', HOTKEYS.journalCopyMemo.hint],
    ['마지막행 복사 및 추가', HOTKEYS.journalCopyLast.hint], ['행 추가', HOTKEYS.journalAddRow.hint],
    ['행 삭제', HOTKEYS.journalDeleteRows.hint], ['행 삽입', HOTKEYS.journalInsertRow.hint],
    ['행 이동(위)', HOTKEYS.journalMoveUp.hint], ['행 이동(아래)', HOTKEYS.journalMoveDown.hint],
    ['저장 버튼으로 이동', '차액에서 Enter (미지원)'],
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
        /* 첫 초점 = 화면 컨테이너(tabIndex=-1), 모든 모드(2026-10-31). Radix 기본(첫 tabbable)이면 머리말 닫기 IconBtn 에
           초점이 가며 툴팁이 뜨고, 그 툴팁 레이어가 첫 Esc 를 가져가 두 번 눌러야 닫혔다(실측). 삭제전표 상세는 원래
           첨부 카드·그리드로 가지 않게 하려고 이렇게 했다. 첫 입력칸으로 보내지 않는 건 ⌥ 단축키가 입력칸 밖에서만 동작해서다 */
        onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement | null)?.focus(); }}
        onEscapeKeyDown={(e) => { e.preventDefault(); if (!confirmClose && !confirmRestore && !acctSearch && !partnerSearch) requestClose(); }}>
        <DialogHeader className="px-6">
          <DialogTitle>{forceReadOnly ? VIEW_TITLE : TITLE[mode]}</DialogTitle>
          <DialogDescription className="sr-only">{deleted || forceReadOnly ? '전표의 헤더·분개·증빙·관리항목 — 조회 전용' : evidence ? '전표의 증빙·첨부만 입력합니다 — 헤더·분개·관리항목은 조회 전용' : closing ? '결산전표의 헤더·분개·증빙·관리항목을 입력합니다' : '일반전표의 헤더·분개·증빙·관리항목을 입력합니다'}</DialogDescription>
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
              <Icon name="info" size={15} />{forceReadOnly ? '전표상세는 조회만 할 수 있습니다.' : `결재 ${form.approval} 전표는 조회만 할 수 있습니다.`}
            </div>
          )}
          {evidence && (
            <div role="note" className="flex items-center gap-2 text-muted-foreground px-6 pt-4" style={{ fontSize: 13 }}>
              <Icon name="info" size={15} />증빙 · 첨부만 입력할 수 있습니다. 전표 정보·분개·관리항목은 조회 전용입니다.
            </div>
          )}
          {/* data-ro-lock — 조회 전용일 때만(편집 모드 DOM 불변). journal_entry_screen.css 가 이 스코프의 disabled 컨트롤을 회색으로 */}
          <fieldset disabled={readOnly} data-ro-lock={readOnly ? '' : undefined} className="border-0 p-0 m-0" style={{ minWidth: 0 }}>
            <div className="flex flex-col min-[769px]:flex-row gap-6 p-6 items-start">
              {/* ────────── 좌측 본문 ────────── */}
              <div className="flex-1 min-w-0 w-full">
                <LockWhen on={evidence}>
                {/* ① 헤더 */}
                <Section title="전표 정보">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5">
                    {/* 삭제전표 상세(ACC-004)는 "전 항목 비활성, 필수(*) 표시 없음" — 모듈 상수는 그대로 두고 렌더에서만 required 를 끈다 */}
                    <Field label={F_FUND.label} required={!noReq} plain>
                      <div ref={fundRef}><SchemaField field={noReq ? { ...F_FUND, required: false } : F_FUND} value={form.fundAccount} onChange={changeFund} /></div>
                    </Field>
                    <Field label={F_KIND.label}><SchemaField field={F_KIND} value={form.slipKind} onChange={() => undefined} /></Field>
                    <Field label={F_WRITER.label}><SchemaField field={F_WRITER} value={form.writer} onChange={() => undefined} /></Field>
                    <Field label={F_WDATE.label} plain={isPlainWrapControl(F_WDATE.control)}>
                      {/* 결산전표만 작성일 검증 초점용 래퍼(closing 미전달 DOM 그대로) */}
                      {closing
                        ? <div ref={wdateRef}><SchemaField field={F_WDATE} value={form.writtenDate} onChange={(v) => set('writtenDate', v)} /></div>
                        : <SchemaField field={F_WDATE} value={form.writtenDate} onChange={(v) => set('writtenDate', v)} />}
                    </Field>
                    {/* 조회 전용이거나 값이 선택지 밖(환원전표 '가결산(환원)')이면 셀렉트 대신 읽기 전용 표시 — 빈 칸 + * 방지 */}
                    {originSelect ? (
                      <Field label="전표발생구분" required plain>
                        <div ref={originRef}><SchemaField field={closingOriginField(closing?.origins ?? [])} value={form.origin} onChange={(v) => set('origin', v as JournalOrigin)} /></div>
                      </Field>
                    ) : (
                      <Field label={F_ORIGIN.label}><SchemaField field={F_ORIGIN} value={form.origin} onChange={() => undefined} /></Field>
                    )}
                    <div className="hidden sm:block" />
                    {/* 결산전표는 적요 선택 입력(slide 12) */}
                    <Field label={F_MEMO.label} required={!noReq && !closing} className="sm:col-span-3">
                      <div ref={memoRef}><SchemaField field={noReq || closing ? { ...F_MEMO, required: false } : F_MEMO} value={form.memo} onChange={changeMemo} /></div>
                    </Field>
                  </div>
                </Section>

                {/* ② 분개 그리드 — 결산양식 관리(ACC-002) 편집 그리드 규칙. 행을 고르면 도구 앞에 선택 작업이 붙는다 */}
                <Section title="분개" actions={noGridTools ? undefined : (
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
                      /* 삭제전표 상세·증빙첨부는 행 도구가 없어 선택 체크박스 열 자체를 뺀다(ACC-003 조회 전용은 기존대로 RO 선택) */
                      rowSelection={viewOnlyGrid ? undefined : readOnly ? ROW_SELECTION_RO : ROW_SELECTION}
                      selectionColumnDef={viewOnlyGrid ? undefined : SELECTION_COL}
                      pinnedBottomRowData={pinnedBottom}
                      onGridReady={(e) => { apiRef.current = e.api; }}
                      onSelectionChanged={onSelectionChanged}
                      onRowDataUpdated={onRowDataUpdated}
                    />
                  </div>
                </Section>
                </LockWhen>

                {/* ③ 증빙·첨부 */}
                <Section title="증빙 · 첨부">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5">
                    <Field label="증빙구분" plain>
                      <div ref={evTypeRef} style={selectWrap}>
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
                    ) : evidence ? (
                      <EvidenceUpload value={form.attachments} onChange={(v) => set('attachments', v)} buttonRef={uploadRef} describedBy="je-attach-hint" />
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
                <LockWhen on={evidence}>
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
                {/* 기능·작성 도움말 — 입력용 안내라 조회 전용 상세(삭제전표 ACC-004 · 미결계정 전표상세 ACC-005)·증빙첨부 ACC-006 에선 숨긴다 */}
                {!deleted && !forceReadOnly && !evidence && (<>
                  <Section title="기능 도움말">
                    <table className="w-full border-collapse" style={{ fontSize: 12.5, tableLayout: 'fixed' }}>
                      <thead><tr><th style={th}>기능</th><th style={th}>키 · 조건</th></tr></thead>
                      <tbody>
                        {HELP_ROWS.map(([f, k]) => <tr key={f}><td style={td}>{f}</td><td style={{ ...td, color: 'var(--muted-foreground)' }}>{k}</td></tr>)}
                      </tbody>
                    </table>
                  </Section>
                  <Section title="작성 도움말">
                    {closing ? (
                      <div style={{ fontSize: 13 }}>
                        <p className="m-0 font-semibold">전표발생구분 필수 선택</p>
                        <p className="m-0 text-muted-foreground">- 가결산: 저장 시 환원전표 자동 생성</p>
                        <p className="m-0 mb-2 text-muted-foreground">- 결산: 전표 1건만 생성</p>
                        <p className="m-0 font-semibold">필수값 예외(결산전표)</p>
                        <p className="m-0 text-muted-foreground">- 계정과목별 필수입력사항 검증 생략</p>
                        <p className="m-0 text-muted-foreground">- 차대 일치·계정코드만 검증</p>
                      </div>
                    ) : (
                    <div style={{ fontSize: 13 }}>
                      <p className="m-0 font-semibold">계정구분 필수 선택</p>
                      <p className="m-0 mb-2 text-muted-foreground">- 계좌번호 선택 전 계정구분을 먼저 선택</p>
                      <p className="m-0 font-semibold">필수값 지정</p>
                      <p className="m-0 text-muted-foreground">- 계정과목별 필수입력사항은 회계/자금 &gt; 기초관리 &gt; 계정과목에서 설정</p>
                    </div>
                    )}
                  </Section>
                </>)}
                </LockWhen>
              </aside>
            </div>
          </fieldset>
        </div>

        {/* ④ 버튼 — 조회 전용은 [닫기]만(slide 26). 삭제전표 상세는 [복원]·[닫기](권한 노출은 RBAC 미구현이라 항상).
            전표검색 전표상세(onCopy)는 [복사]·[닫기](ACC-008 slide 12) */}
        <DialogFooter className="px-6">
          <div />
          <div className="flex flex-wrap gap-2">
            {!readOnly && <>
              <SaveButton onSubmit={() => submit('stay')}>저장</SaveButton>
              {/* 증빙첨부(ACC-006)는 [저장 후 상신] 미노출 */}
              {!evidence && <SaveButton variant="outline" leadingIcon="" busyLabel="상신 중" onSubmit={() => submit('submit')}>저장 후 상신</SaveButton>}
              <SaveButton variant="outline" leadingIcon="" onSubmit={() => submit('close')}>저장 후 닫기</SaveButton>
            </>}
            {deleted && onRestore && (
              <Button variant="primary" size="sm" leadingIcon="history" onClick={() => { restoredRef.current = false; setConfirmRestore(true); }}>복원</Button>
            )}
            {showCopy && (
              <Button variant="primary" size="sm" leadingIcon="layers" onClick={() => { onCopy?.(); dlgRef.current?.close(); }}>복사</Button>
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
              <AlertDialogCancel>취소</AlertDialogCancel>
              <Button variant="primary" size="sm" onClick={() => { setConfirmClose(false); dlgRef.current?.close(); }}>닫기</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
