/* 계좌잔액(ACC-020) 순수 모델 — 상세필터·기간 잔액 행·계정구분 소계·합계·예금명세서 출력 양식. 화면·테스트 공용.
   출처: 화면설계서 ACC-020 계좌잔액(2026.10.26 v1.0) slide 9~17.
   기간 잔액·거래상세·만기 판정·기간 검증은 funds_model 공용 함수를 쓴다(중복 정의 금지).
   'YYYY-MM-DD' 는 0-패딩이라 문자열 비교 = 시간순. '오늘'은 호출부가 주입한다(테스트 결정성).

   결정·가정
   - 기준기간 한쪽(또는 양쪽)이 비면 열린 범위로 본다 — 시작 없음 = 처음부터(전잔 0), 종료 없음 = 끝까지.
   - 만기여부: 만기일이 있고 기준일(today) 이전이면 '만기'(funds_model.isMatured). 만기일 없는 계좌는 '만기 전'.
   - 만기기간: 한쪽이라도 지정하면 만기일 없는 계좌는 제외. 개설기간도 같은 열린 범위 규칙.
   - 미결재포함·잔액여부: 미결재 거래 데이터·잔액여부 의미가 없어 상태만 두고 거르지 않는다(화면 '· 데이터 연동 후 적용').
   - 소계 = 계정구분별(그리드), 〈 소계 〉 = 계정구분 안 계정과목별(출력). 합계는 계좌 행만 더한다(소계 중복 합산 금지). */
import { FUNDS_ACCOUNT_TYPES } from './funds_data';
import type { BankAccount, CashTxn } from './funds_data';
import { periodBalance, accountTxnsInPeriod, isMatured, validatePeriod } from './funds_model';
import type { AccountTxnRow } from './funds_model';
import { defaultPeriod } from '../slip/general_journal_model';

export { validatePeriod, PERIOD_ERROR } from './funds_model';

/** 여/부 셀렉트 값 — '' = 전체 */
export type YesNo = '' | '여' | '부';
export const YES_NO = ['여', '부'] as const;

/** 상세필터 값(설계서 slide 11 — 9개 조건) */
export interface BalanceFilter {
  accountType: string;        // 계정구분('' = 전체)
  from: string; to: string;   // 기준기간(포함)
  active: YesNo;              // 사용여부
  matured: YesNo;             // 만기여부
  freeWithdraw: YesNo;        // 수시입출금여부
  includeUnapproved: boolean; // 미결재포함(데이터 연동 후 적용)
  openFrom: string; openTo: string;           // 개설기간
  maturityFrom: string; maturityTo: string;   // 만기기간
  balance: string;            // 잔액여부(숫자 — 데이터 연동 후 적용)
}

/** 기본값 — 계정구분 전체 · 기준기간 전월 1일 ~ 오늘 · 사용여부 여 · 만기여부 부 · 나머지 전체/빈 값 */
export function defaultFilter(today: string): BalanceFilter {
  const [from, to] = defaultPeriod(today);
  return {
    accountType: '', from, to, active: '여', matured: '부', freeWithdraw: '', includeUnapproved: false,
    openFrom: '', openTo: '', maturityFrom: '', maturityTo: '', balance: '',
  };
}

/** 기간 오류 3종 — 각 범위 시작 > 종료면 문구, 아니면 null. 하나라도 있으면 결과 0건 */
export function filterErrors(f: BalanceFilter): { period: string | null; open: string | null; maturity: string | null } {
  return { period: validatePeriod(f.from, f.to), open: validatePeriod(f.openFrom, f.openTo), maturity: validatePeriod(f.maturityFrom, f.maturityTo) };
}
export const hasFilterError = (f: BalanceFilter): boolean => Object.values(filterErrors(f)).some(Boolean);

/** 열린 범위 정규화 — 빈 시작 = 처음, 빈 종료 = 끝 */
export const MIN_DATE = '0000-01-01';
export const MAX_DATE = '9999-12-31';
export const normFrom = (d: string): string => d || MIN_DATE;
export const normTo = (d: string): string => d || MAX_DATE;

const yn = (cond: YesNo, v: boolean): boolean => !cond || (cond === '여') === v;
const inRange = (d: string, from: string, to: string): boolean => (!from || d >= from) && (!to || d <= to);

/** 계좌 조건 필터(기준기간 제외 — 기준기간은 잔액 계산 범위). 기간 오류가 있으면 [] */
export function filterAccounts(accounts: readonly BankAccount[], f: BalanceFilter, today: string): BankAccount[] {
  if (hasFilterError(f)) return [];
  return accounts.filter((a) =>
    (!f.accountType || a.accountType === f.accountType)
    && yn(f.active, a.active)
    && yn(f.matured, isMatured(a, today))
    && yn(f.freeWithdraw, a.freeWithdraw)
    && inRange(a.openDate, f.openFrom, f.openTo)
    && (!(f.maturityFrom || f.maturityTo) || (!!a.maturityDate && inRange(a.maturityDate, f.maturityFrom, f.maturityTo))));
}

/** 그리드 행 — 계좌 행 / 계정구분 소계 행 */
export interface BalanceRow {
  id: string;
  kind: 'account' | 'subtotal';
  accountId: string;          // 소계 = ''
  accountType: string;        // 계정구분(소계 행도 그룹 값 보유 — 표시는 '소계')
  accountNo: string;
  currency: string;
  subject: string;            // 예금종류 = 계정과목
  opening: number;            // 전잔
  increase: number;           // 기간증가
  decrease: number;           // 기간감소
  closing: number;            // 잔액
  openDate: string;
  bank: string;
  branch: string;
  memo: string;               // 적요
  maturityDate: string;       // '' = 없음
  rate: number | null;        // 이자율(%) — 소계 null
  purpose: string;            // 개설목적
}
export type BalanceAmounts = Pick<BalanceRow, 'opening' | 'increase' | 'decrease' | 'closing'>;

const typeOrder = (t: string): number => {
  const i = (FUNDS_ACCOUNT_TYPES as readonly string[]).indexOf(t);
  return i < 0 ? FUNDS_ACCOUNT_TYPES.length : i;
};

/** 계정구분 순(설계서 표기 순) → 계좌번호 순 */
export function sortBalanceRows<T extends Pick<BalanceRow, 'accountType' | 'accountNo'>>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => typeOrder(a.accountType) - typeOrder(b.accountType) || a.accountNo.localeCompare(b.accountNo));
}

/** 계좌 × 기준기간 잔액 → 정렬된 계좌 행. 기간 오류면 [] */
export function buildBalanceRows(accounts: readonly BankAccount[], txns: readonly CashTxn[], f: BalanceFilter, today: string): BalanceRow[] {
  const from = normFrom(f.from), to = normTo(f.to);
  return sortBalanceRows(filterAccounts(accounts, f, today).map((a): BalanceRow => {
    const b = periodBalance(txns, a.id, from, to);
    return {
      id: a.id, kind: 'account', accountId: a.id, accountType: a.accountType, accountNo: a.accountNo, currency: a.currency, subject: a.subject,
      ...b, openDate: a.openDate, bank: a.bank, branch: a.branch, memo: a.memo, maturityDate: a.maturityDate, rate: a.rate, purpose: a.purpose,
    };
  }));
}

const sumAmounts = (rows: readonly BalanceAmounts[]): BalanceAmounts => rows.reduce(
  (s, r) => ({ opening: s.opening + r.opening, increase: s.increase + r.increase, decrease: s.decrease + r.decrease, closing: s.closing + r.closing }),
  { opening: 0, increase: 0, decrease: 0, closing: 0 });

/** 합계 — 계좌 행만(소계 행은 건너뛴다) */
export function totals(rows: readonly BalanceRow[]): BalanceAmounts {
  return sumAmounts(rows.filter((r) => r.kind === 'account'));
}

/** 계정구분 그룹 끝마다 소계 행 삽입 — 입력은 sortBalanceRows 순서(계좌 행만). 소계 행은 금액만, 나머지 칸은 빈 값 */
export function withSubtotals(rows: readonly BalanceRow[]): BalanceRow[] {
  const out: BalanceRow[] = [];
  const accounts = rows.filter((r) => r.kind === 'account');
  for (let i = 0; i < accounts.length;) {
    const type = accounts[i].accountType;
    let j = i;
    while (j < accounts.length && accounts[j].accountType === type) j++;
    const group = accounts.slice(i, j);
    out.push(...group, {
      id: `sub:${type}`, kind: 'subtotal', accountId: '', accountType: type, accountNo: '', currency: '', subject: '',
      ...sumAmounts(group), openDate: '', bank: '', branch: '', memo: '', maturityDate: '', rate: null, purpose: '',
    });
    i = j;
  }
  return out;
}

/** 계좌 행 수(소계 제외) — 푸터 건수 */
export const accountCount = (rows: readonly BalanceRow[]): number => rows.filter((r) => r.kind === 'account').length;

/* ── 계좌거래상세(E04 팝업) ── */
export interface TxnDetail { rows: AccountTxnRow[]; deposit: number; withdraw: number; balance: number }

/** 계좌 1개의 기준기간 거래(첫 행 전일잔액) + 합계(예금·인출 = 거래 합, 잔액 = 마지막 잔액) */
export function txnDetail(txns: readonly CashTxn[], accountId: string, from: string, to: string): TxnDetail {
  const rows = accountTxnsInPeriod(txns, accountId, normFrom(from), normTo(to));
  if (!from) rows[0] = { ...rows[0], date: '' };   // 전 기간 = 이월 일자 없음(0000-01-01 을 보이지 않는다)
  const body = rows.filter((r) => !r.carry);
  return {
    rows,
    deposit: body.reduce((s, r) => s + r.deposit, 0),
    withdraw: body.reduce((s, r) => s + r.withdraw, 0),
    balance: rows[rows.length - 1].balance,
  };
}

/** 기준기간 표시 — 둘 다 비면 '전 기간', 한쪽만이면 '…' */
export function periodLabel(from: string, to: string, sep = ' ~ '): string {
  return from || to ? `${from || '…'}${sep}${to || '…'}` : '전 기간';
}

/** 이자율 표시 — 소수 둘째 자리까지(2.35 → '2.35%', 0.1 → '0.1%') */
export function rateLabel(rate: number | null): string {
  return rate == null ? '' : `${rate.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%`;
}

/* ── 예금명세서(E07 출력물) — 계정구분마다 한 절, 계정구분 안 계정과목별 〈 소계 〉, 절 끝 합 계 ── */
export type StatementLine =
  | { kind: 'row'; no: number; subject: string; bank: string; branch: string; accountNo: string; closing: number; rate: number | null; maturityDate: string }
  | { kind: 'subtotal'; subject: string; closing: number };
export interface StatementSection { accountType: string; lines: StatementLine[]; total: number }

/** 계좌 행(정렬 무관) → 계정구분 절 목록. 절 안은 계정과목 → 계좌번호 순, 순 = 절 안 일련번호 */
export function buildDepositStatement(rows: readonly BalanceRow[]): StatementSection[] {
  const accounts = sortBalanceRows(rows.filter((r) => r.kind === 'account'));
  const sections: StatementSection[] = [];
  for (const type of [...new Set(accounts.map((r) => r.accountType))]) {
    const inType = accounts.filter((r) => r.accountType === type)
      .sort((a, b) => a.subject.localeCompare(b.subject, 'ko') || a.accountNo.localeCompare(b.accountNo));
    const lines: StatementLine[] = [];
    let no = 0;
    for (const subject of [...new Set(inType.map((r) => r.subject))]) {
      const group = inType.filter((r) => r.subject === subject);
      for (const r of group) lines.push({ kind: 'row', no: ++no, subject, bank: r.bank, branch: r.branch, accountNo: r.accountNo, closing: r.closing, rate: r.rate, maturityDate: r.maturityDate });
      lines.push({ kind: 'subtotal', subject, closing: group.reduce((s, r) => s + r.closing, 0) });
    }
    sections.push({ accountType: type, lines, total: inType.reduce((s, r) => s + r.closing, 0) });
  }
  return sections;
}

/** 출력 쪽 — 절마다 새 쪽, 절이 perPage 줄을 넘으면 같은 절 머리로 이어 쪽 나눔. 합 계는 절의 마지막 쪽에만 */
export interface StatementPage { accountType: string; lines: StatementLine[]; last: boolean; total: number }
export function statementPages(sections: readonly StatementSection[], perPage: number): StatementPage[] {
  const pages: StatementPage[] = [];
  for (const s of sections) {
    for (let i = 0; i < Math.max(s.lines.length, 1); i += perPage) {
      pages.push({ accountType: s.accountType, lines: s.lines.slice(i, i + perPage), last: i + perPage >= s.lines.length, total: s.total });
    }
  }
  return pages;
}
