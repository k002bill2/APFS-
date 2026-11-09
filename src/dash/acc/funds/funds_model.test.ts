/* 자금관리 순수 모델·더미 마스터 테스트(ACC-019·020·021) */
import { describe, it, expect } from 'vitest';
import { periodBalance, accountTxnsInPeriod, isMatured, validatePeriod, PERIOD_ERROR, CARRY_MEMO } from './funds_model';
import { demoBankAccounts, demoCashTxns, FUNDS_ACCOUNT_TYPES, DEMO_TODAY, DEPOSIT_KINDS } from './funds_data';
import type { CashTxn } from './funds_data';

const tx = (id: string, accountId: string, date: string, deposit: number, withdraw: number): CashTxn =>
  ({ id, accountId, date, deposit, withdraw, partner: 'P', memo: 'm', slipNo: `${date.replace(/-/g, '')}-001` });
const T: CashTxn[] = [
  tx('t1', 'A', '2026-01-01', 1000, 0),
  tx('t2', 'A', '2026-02-01', 0, 300),     // from 경계
  tx('t3', 'B', '2026-02-10', 999, 0),     // 다른 계좌
  tx('t4', 'A', '2026-02-28', 500, 0),     // to 경계
  tx('t5', 'A', '2026-02-15', 0, 100),     // 입력 순서 뒤섞임
  tx('t6', 'A', '2026-03-01', 7000, 0),    // to 이후
];

describe('periodBalance', () => {
  it('전잔·기간증감·잔액 — from/to 경계 거래는 기간에 포함', () => {
    expect(periodBalance(T, 'A', '2026-02-01', '2026-02-28')).toEqual({ opening: 1000, increase: 500, decrease: 400, closing: 1100 });
  });
  it('거래 없음 = 전부 0', () => {
    expect(periodBalance([], 'A', '2026-01-01', '2026-12-31')).toEqual({ opening: 0, increase: 0, decrease: 0, closing: 0 });
    expect(periodBalance(T, 'Z', '2026-01-01', '2026-12-31')).toEqual({ opening: 0, increase: 0, decrease: 0, closing: 0 });
  });
  it('자금일보 — from = to 하루', () => {
    expect(periodBalance(T, 'A', '2026-02-15', '2026-02-15')).toEqual({ opening: 700, increase: 0, decrease: 100, closing: 600 });
  });
  it('from > to 면 기간 거래 없음(전잔 = 잔액)', () => {
    const r = periodBalance(T, 'A', '2026-03-01', '2026-02-01');
    expect(r.increase).toBe(0); expect(r.decrease).toBe(0); expect(r.closing).toBe(r.opening);
  });
});

describe('accountTxnsInPeriod', () => {
  it('첫 행 = 전일잔액 이월, 이후 일자순 누적 잔액', () => {
    const rows = accountTxnsInPeriod(T, 'A', '2026-02-01', '2026-02-28');
    expect(rows[0]).toMatchObject({ carry: true, memo: CARRY_MEMO, balance: 1000, deposit: 0, withdraw: 0, date: '2026-02-01' });
    expect(rows.slice(1).map((r) => r.id)).toEqual(['t2', 't5', 't4']);
    expect(rows.map((r) => r.balance)).toEqual([1000, 700, 600, 1100]);
    expect(rows[rows.length - 1].balance).toBe(periodBalance(T, 'A', '2026-02-01', '2026-02-28').closing);
  });
  it('거래 없음 = 이월 행 1개(잔액 0)', () => {
    expect(accountTxnsInPeriod([], 'A', '2026-01-01', '2026-01-31')).toEqual([
      expect.objectContaining({ carry: true, balance: 0 }),
    ]);
  });
});

describe('isMatured', () => {
  it('만기일 < 기준일만 만기', () => {
    expect(isMatured({ maturityDate: '2026-11-04' }, '2026-11-05')).toBe(true);
    expect(isMatured({ maturityDate: '2026-11-05' }, '2026-11-05')).toBe(false);
    expect(isMatured({ maturityDate: '2027-01-01' }, '2026-11-05')).toBe(false);
    expect(isMatured({ maturityDate: '' }, '2026-11-05')).toBe(false);
  });
});

describe('validatePeriod', () => {
  it('시작 > 종료 = 오류 문구, 그 외 null', () => {
    expect(validatePeriod('2026-02-01', '2026-01-01')).toBe(PERIOD_ERROR);
    expect(PERIOD_ERROR).toBe('시작일은 종료일보다 늦을 수 없습니다.');
    expect(validatePeriod('2026-01-01', '2026-01-01')).toBeNull();
    expect(validatePeriod('', '2026-01-01')).toBeNull();
  });
});

describe('더미 마스터', () => {
  const accs = demoBankAccounts();
  const txns = demoCashTxns(accs);
  it('결정적 — 두 번 생성해도 같다', () => {
    expect(demoBankAccounts()).toEqual(accs);
    expect(demoCashTxns()).toEqual(txns);
  });
  it('계정구분마다 3건 이상, 미사용·만기·미도래 혼합', () => {
    for (const t of FUNDS_ACCOUNT_TYPES) expect(accs.filter((a) => a.accountType === t).length).toBeGreaterThanOrEqual(3);
    expect(accs.some((a) => !a.active)).toBe(true);
    expect(accs.some((a) => isMatured(a, DEMO_TODAY))).toBe(true);
    expect(accs.some((a) => a.maturityDate > DEMO_TODAY)).toBe(true);
    expect(new Set(accs.map((a) => a.code)).size).toBe(accs.length);
    const kinds = DEPOSIT_KINDS.map((d) => d.name);
    for (const a of accs) expect(kinds).toContain(a.subject);
  });
  it('거래 — 모든 계좌 존재, 범위 안, 잔액 음수 없음, 일자순, 전표번호 유일', () => {
    for (const a of accs) expect(txns.some((t) => t.accountId === a.id)).toBe(true);
    expect(txns.every((t) => t.date <= DEMO_TODAY)).toBe(true);
    expect(txns.every((t, i) => i === 0 || txns[i - 1].date <= t.date)).toBe(true);
    expect(new Set(txns.map((t) => t.slipNo)).size).toBe(txns.length);
    for (const a of accs) {
      let bal = 0;
      for (const t of txns) if (t.accountId === a.id) { bal += t.deposit - t.withdraw; expect(bal).toBeGreaterThanOrEqual(0); }
    }
    expect(txns.some((t) => t.date === DEMO_TODAY)).toBe(true);
    expect(txns.some((t) => t.date >= '2023-01-01' && t.date < '2023-02-01')).toBe(true);
  });
  it('만기·미사용 계좌는 마감 후 잔액 0', () => {
    for (const a of accs.filter((x) => !x.active || isMatured(x, DEMO_TODAY))) {
      expect(periodBalance(txns, a.id, DEMO_TODAY, DEMO_TODAY).closing).toBe(0);
    }
  });
});
