/* 계좌관리(ACC-019) — 순수 로직(상세필터 7조건 · 저장/임시저장 검증 순서 · 만기일 N개월 · 계좌코드 채번 · 논리삭제 · 폼 ↔ 행 변환).
   출처: 화면설계서 ACC-019 계좌관리(2026.10.26 v1.0) slide 11(상세필터) · slide 12(입력 항목·저장 검증) · slide 18(삭제).
   결정·가정
   - 개설일 조건 = "개설일 ≥ 값", 만기일 조건 = "만기일 ≤ 값"(만기일 없는 계좌는 만기일 조건이 걸리면 제외). 둘 다 있고 개설일 > 만기일이면
     기간 오류(공용 validatePeriod 문구) + 0건.
   - 만기여부 '여' = isMatured(만기일 < 기준일), '부' = 그 외(만기일 없는 계좌 포함).
   - 임시저장 행은 금융기관·이자율이 비어 있을 수 있어 공용 BankAccount 를 넓힌 BankAccountRow 를 쓴다(bank '' · rate null).
   - 계좌코드는 발급 이력(활성 + 삭제) 최댓값 + 1 — 삭제한 코드를 다시 쓰지 않는다. */
import type { Bank, BankAccount, CurrencyCode, FundsAccountType, LinkFlag } from './funds_data';
import { DEFAULT_CURRENCY, LINK_FLAGS } from './funds_data';
import { isMatured, validatePeriod } from './funds_model';
import { parseFileNames } from '../../fields/file_names';

/** 화면 행 — 임시저장이면 금융기관·이자율이 비어 있을 수 있다 */
export type BankAccountRow = Omit<BankAccount, 'bank' | 'rate'> & { bank: Bank | ''; rate: number | null };

export const sortByCode = (rows: readonly BankAccountRow[]): BankAccountRow[] => [...rows].sort((a, b) => a.code.localeCompare(b.code));
export const yn = (b: boolean): '여' | '부' => (b ? '여' : '부');

/* ── 조사(을/를) — 마지막 글자 받침 유무. 한글이 아니면 '을(를)' ── */
export function eulReul(word: string): string {
  const ch = word.trim().slice(-1);
  const code = ch ? ch.charCodeAt(0) : 0;
  if (code < 0xac00 || code > 0xd7a3) return '을(를)';
  return (code - 0xac00) % 28 === 0 ? '를' : '을';
}
/** "{항목명}을(를) 입력하세요." — 조사를 받침에 맞춰 고른다 */
export const requiredMsg = (label: string): string => `${label}${eulReul(label)} 입력하세요.`;

/* ── 상세필터(E01) — 빈 값·빈 배열 = 전체 ── */
export interface BankAccountFilter {
  accountType: string;     // 계정구분
  subjects: string[];      // 계정과목명(다중)
  banks: string[];         // 거래기관(다중)
  use: '' | '여' | '부';   // 사용여부
  openFrom: string;        // 개설일(이후)
  maturityTo: string;      // 만기일(이전)
  matured: '' | '여' | '부'; // 만기여부
}
export const EMPTY_FILTER: BankAccountFilter = { accountType: '', subjects: [], banks: [], use: '', openFrom: '', maturityTo: '', matured: '' };

/** 개설일 > 만기일이면 기간 오류 문구, 아니면 null */
export const filterPeriodError = (f: Pick<BankAccountFilter, 'openFrom' | 'maturityTo'>): string | null => validatePeriod(f.openFrom, f.maturityTo);

export function filterBankAccounts(rows: readonly BankAccountRow[], f: BankAccountFilter, today: string): BankAccountRow[] {
  if (filterPeriodError(f)) return [];
  return sortByCode(rows.filter((r) =>
    (!f.accountType || r.accountType === f.accountType)
    && (f.subjects.length === 0 || f.subjects.includes(r.subject))
    && (f.banks.length === 0 || (r.bank !== '' && f.banks.includes(r.bank)))
    && (!f.use || yn(r.active) === f.use)
    && (!f.openFrom || (!!r.openDate && r.openDate >= f.openFrom))
    && (!f.maturityTo || (!!r.maturityDate && r.maturityDate <= f.maturityTo))
    && (!f.matured || yn(isMatured(r, today)) === f.matured)));
}

/* ── 만기일 N개월(3·6·12) — 월말 보정(01-31 + 1개월 = 02-28/29) ── */
export function addMonthsClamp(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const idx = (m - 1) + n;
  const ty = y + Math.floor(idx / 12);
  const tm = ((idx % 12) + 12) % 12 + 1;
  const last = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${String(ty)}-${pad(tm)}-${pad(Math.min(d, last))}`;
}

/* ── 등록/수정 폼(E02·E06) — 컨트롤 값은 문자열 ── */
export interface BankAccountForm {
  accountType: FundsAccountType | '';
  alias: string;
  subject: string;
  partner: string;
  bank: Bank | '';
  branch: string;
  accountNo: string;
  virtualNo: string;
  holder: string;
  openDate: string;
  maturityDate: string;
  freeWithdraw: 'Y' | 'N';
  active: 'Y' | 'N';
  currency: CurrencyCode;
  rate: string;            // 숫자 문자열('' = 미입력)
  productAmount: string;   // 숫자만('' = 미입력)
  purpose: string;
  memo: string;
  links: LinkFlag[];
  attachments: string;     // 파일명 CSV(DocumentsField 계약)
}

/** 등록 기본값(설계서 slide12 ②) — 수시입출금 N · 사용여부 Y · 통화 KRW */
export const emptyForm = (): BankAccountForm => ({
  accountType: '', alias: '', subject: '', partner: '', bank: '', branch: '', accountNo: '', virtualNo: '', holder: '',
  openDate: '', maturityDate: '', freeWithdraw: 'N', active: 'Y', currency: DEFAULT_CURRENCY, rate: '', productAmount: '',
  purpose: '', memo: '', links: [], attachments: '',
});

export const formFromAccount = (r: BankAccountRow): BankAccountForm => ({
  accountType: r.accountType, alias: r.alias, subject: r.subject, partner: r.partner, bank: r.bank, branch: r.branch,
  accountNo: r.accountNo, virtualNo: r.virtualNo, holder: r.holder, openDate: r.openDate, maturityDate: r.maturityDate,
  freeWithdraw: r.freeWithdraw ? 'Y' : 'N', active: r.active ? 'Y' : 'N', currency: r.currency,
  rate: r.rate == null ? '' : String(r.rate), productAmount: r.productAmount == null ? '' : String(r.productAmount),
  purpose: r.purpose, memo: r.memo, links: [...r.links], attachments: r.attachments.join(', '),
});

/** 닫기 확인(dirty) 비교용 — 첨부는 CSV 표기 차이를 없애고, 연동정보는 고정 순서로 */
export const formSnapshot = (f: BankAccountForm): string => JSON.stringify({
  ...f, links: LINK_FLAGS.filter((l) => f.links.includes(l)), attachments: parseFileNames(f.attachments),
});

/** 금액 입력 — 숫자만 남긴다 / 천단위 콤마 표시 */
export const amountDigits = (text: string): string => text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
export const amountDisplay = (digits: string): string => (digits ? Number(digits).toLocaleString('ko-KR') : '');

/* ── 저장 검증(slide12 ③) — 화면 필드 순서(위→아래, 좌→우) ── */
export type FormKey = keyof BankAccountForm;
export const FIELD_LABEL: Partial<Record<FormKey, string>> = {
  accountType: '계정구분', subject: '계정과목', partner: '거래처', bank: '금융기관', accountNo: '계좌번호', openDate: '개설일', rate: '이자율',
};
export const SAVE_REQUIRED: readonly FormKey[] = ['accountType', 'subject', 'partner', 'bank', 'accountNo', 'openDate', 'rate'];
export const DRAFT_REQUIRED: readonly FormKey[] = ['accountType', 'accountNo'];
export type FieldError = { key: FormKey; msg: string };

/** 미충족 항목 전부(화면 순서). 화면은 첫 건만 포커스·안내한다. mode 'draft' = 임시 저장(계정구분·계좌번호만) */
export function validateAccount(f: BankAccountForm, mode: 'save' | 'draft'): FieldError[] {
  const keys = mode === 'save' ? SAVE_REQUIRED : DRAFT_REQUIRED;
  return keys.filter((k) => !String(f[k]).trim()).map((k) => ({ key: k, msg: requiredMsg(FIELD_LABEL[k]!) }));
}

/** [3·6·12개월] — 개설일 기준 만기일. 개설일이 없으면 개설일 필드 오류 */
export function maturityFromOpen(openDate: string, months: number): { ok: true; value: string } | { ok: false; error: FieldError } {
  if (!openDate) return { ok: false, error: { key: 'openDate', msg: requiredMsg('개설일') } };
  return { ok: true, value: addMonthsClamp(openDate, months) };
}

/** [계정구분명상동] — 계좌주명 = 계정구분명. 계정구분이 없으면 계정구분 필드 오류 */
export function holderFromAccountType(f: Pick<BankAccountForm, 'accountType'>): { ok: true; value: string } | { ok: false; error: FieldError } {
  if (!f.accountType) return { ok: false, error: { key: 'accountType', msg: requiredMsg('계정구분') } };
  return { ok: true, value: f.accountType };
}

/* ── 계좌코드 채번 · 저장 · 삭제 ── */
/** 발급된 코드(활성 + 삭제) 최댓값 + 1 → 'BA-0017' */
export function nextAccountCode(issued: Iterable<string>): string {
  let max = 0;
  for (const c of issued) { const m = /^BA-(\d+)$/.exec(c); if (m) max = Math.max(max, Number(m[1])); }
  return `BA-${String(max + 1).padStart(4, '0')}`;
}

/** 폼 → 행. base = 수정 대상(id·코드·최초등록 보존). 임시 저장이면 draft:true, 정식 저장이면 draft 해제 */
export function formToAccount(f: BankAccountForm, base: BankAccountRow | null, o: { id: string; code: string; user: string; now: string; draft: boolean }): BankAccountRow {
  const rate = f.rate.trim() === '' ? null : Number(f.rate);
  const row: BankAccountRow = {
    id: base?.id ?? o.id, code: base?.code ?? o.code,
    accountType: f.accountType as FundsAccountType, alias: f.alias.trim(), accountNo: f.accountNo.trim(), virtualNo: f.virtualNo.trim(),
    holder: f.holder.trim(), bank: f.bank, branch: f.branch, subject: f.subject, partner: f.partner,
    openDate: f.openDate, maturityDate: f.maturityDate, freeWithdraw: f.freeWithdraw === 'Y', active: f.active === 'Y',
    currency: f.currency, rate: rate != null && Number.isFinite(rate) ? rate : null,
    productAmount: f.productAmount ? Number(f.productAmount) : null,
    purpose: f.purpose.trim(), memo: f.memo.trim(), links: LINK_FLAGS.filter((l) => f.links.includes(l)),
    attachments: parseFileNames(f.attachments),
    createdBy: base?.createdBy ?? o.user, createdAt: base?.createdAt ?? o.now,
    updatedBy: o.user, updatedAt: o.now,
  };
  if (o.draft) row.draft = true;
  return row;
}

/** 논리삭제(E05) — 목록에서 빼고 빠진 행을 따로 돌려준다(코드 재사용 방지용 이력) */
export function deleteAccounts(rows: readonly BankAccountRow[], ids: readonly string[]): { rows: BankAccountRow[]; removed: BankAccountRow[] } {
  const set = new Set(ids);
  return { rows: rows.filter((r) => !set.has(r.id)), removed: rows.filter((r) => set.has(r.id)) };
}

/** 그리드 이자율 표시 — 소수 둘째 자리('0.40'), 없으면 '-' */
export const rateText = (v: number | null | undefined): string => (v == null ? '-' : v.toFixed(2));
