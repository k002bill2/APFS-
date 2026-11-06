/* 자금관리 순수 모델 — 계좌 기간 잔액(ACC-020 계좌잔액 · ACC-021 자금일보) · 계좌거래상세(ACC-020 팝업) · 만기 판정(ACC-019).
   출처: 화면설계서 ACC-019·020·021(2026.10.26 v1.0). 'YYYY-MM-DD' 는 0-패딩이라 문자열 비교 = 시간순.
   기간 검증은 삭제전표 모델과 같은 문구·규칙이라 재사용한다(중복 정의 금지). */
import type { BankAccount, CashTxn } from './funds_data';

export { validatePeriod, PERIOD_ERROR } from '../slip/deleted_journal_model';

export interface PeriodBalance {
  opening: number;    // 전잔(기초시재) — from 이전 누계
  increase: number;   // 기간증가(입금)
  decrease: number;   // 기간감소(출금)
  closing: number;    // 잔액(마감시재) = opening + increase − decrease
}

/** 계좌 기간 잔액 — [from, to] 양끝 포함. 자금일보는 from = to = 기준일자 */
export function periodBalance(txns: readonly CashTxn[], accountId: string, from: string, to: string): PeriodBalance {
  let opening = 0, increase = 0, decrease = 0;
  for (const t of txns) {
    if (t.accountId !== accountId) continue;
    if (t.date < from) opening += t.deposit - t.withdraw;
    else if (t.date <= to) { increase += t.deposit; decrease += t.withdraw; }
  }
  return { opening, increase, decrease, closing: opening + increase - decrease };
}

/** 계좌거래상세 행 — 첫 행은 '전일잔액' 이월 행(id '__carry', 금액 0, 잔액 = 전잔) */
export interface AccountTxnRow {
  id: string;
  date: string;
  deposit: number;
  withdraw: number;
  balance: number;    // 누적 잔액
  partner: string;
  memo: string;
  slipNo: string;
  carry?: boolean;    // 전일잔액 이월 행
}
export const CARRY_MEMO = '전일잔액';

/** 기간 안 거래(일자순, 같은 날은 원래 순서) + 누적 잔액. 첫 행 = 전일잔액 이월 */
export function accountTxnsInPeriod(txns: readonly CashTxn[], accountId: string, from: string, to: string): AccountTxnRow[] {
  const { opening } = periodBalance(txns, accountId, from, to);
  const inPeriod = txns
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.accountId === accountId && t.date >= from && t.date <= to)
    .sort((a, b) => (a.t.date < b.t.date ? -1 : a.t.date > b.t.date ? 1 : a.i - b.i));
  const rows: AccountTxnRow[] = [{ id: '__carry', date: from, deposit: 0, withdraw: 0, balance: opening, partner: '', memo: CARRY_MEMO, slipNo: '', carry: true }];
  let bal = opening;
  for (const { t } of inPeriod) {
    bal += t.deposit - t.withdraw;
    rows.push({ id: t.id, date: t.date, deposit: t.deposit, withdraw: t.withdraw, balance: bal, partner: t.partner, memo: t.memo, slipNo: t.slipNo });
  }
  return rows;
}

/** 만기 도래 — 만기일이 있고 기준일보다 이전 */
export function isMatured(acc: Pick<BankAccount, 'maturityDate'>, today: string): boolean {
  return !!acc.maturityDate && acc.maturityDate < today;
}
