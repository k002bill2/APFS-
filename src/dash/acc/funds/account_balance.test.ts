/* 계좌잔액(ACC-020) 순수 모델 테스트 */
import { describe, it, expect } from 'vitest';
import {
  defaultFilter, filterAccounts, filterErrors, buildBalanceRows, withSubtotals, totals, accountCount,
  txnDetail, buildDepositStatement, statementPages, periodLabel, rateLabel, PERIOD_ERROR,
  demoUnapprovedTxns, effectiveTxns, balanceMatches,
} from './account_balance_model';
import type { BalanceFilter, BalanceRow } from './account_balance_model';
import { demoBankAccounts, demoCashTxns, DEMO_TODAY, FUNDS_ACCOUNT_TYPES } from './funds_data';
import type { CashTxn } from './funds_data';
import { periodBalance, isMatured } from './funds_model';

const ACCTS = demoBankAccounts();
const TXNS = demoCashTxns(ACCTS);
const DEF = defaultFilter(DEMO_TODAY);
const PENDING = demoUnapprovedTxns(ACCTS, DEMO_TODAY);
const ALL: BalanceFilter = { ...DEF, active: '', matured: '', from: '', to: '' };

describe('defaultFilter', () => {
  it('기준기간 = 전월 1일 ~ 오늘 · 사용여부 여 · 만기여부 부', () => {
    expect(DEF).toMatchObject({ accountType: '', from: '2026-10-01', to: DEMO_TODAY, active: '여', matured: '부', freeWithdraw: '', includeUnapproved: false, balance: '' });
  });
  it('1월이면 전년 12월 1일', () => {
    expect(defaultFilter('2026-01-15').from).toBe('2025-12-01');
  });
});

describe('filterAccounts', () => {
  it('기본값 = 사용 중 · 만기 전 계좌만', () => {
    const got = filterAccounts(ACCTS, DEF, DEMO_TODAY);
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((a) => a.active && !isMatured(a, DEMO_TODAY))).toBe(true);
  });
  it('전체 조건 = 16건, 각 여/부 조건이 정확히 나눈다', () => {
    expect(filterAccounts(ACCTS, ALL, DEMO_TODAY)).toHaveLength(ACCTS.length);
    for (const k of ['active', 'freeWithdraw'] as const) {
      const y = filterAccounts(ACCTS, { ...ALL, [k]: '여' }, DEMO_TODAY).length;
      const n = filterAccounts(ACCTS, { ...ALL, [k]: '부' }, DEMO_TODAY).length;
      expect(y + n).toBe(ACCTS.length);
      expect(y).toBe(ACCTS.filter((a) => a[k]).length);
    }
    expect(filterAccounts(ACCTS, { ...ALL, matured: '여' }, DEMO_TODAY).every((a) => isMatured(a, DEMO_TODAY))).toBe(true);
  });
  it('만기일 없는 계좌는 만기여부 부에 포함, 만기기간을 지정하면 제외', () => {
    const noMat = ACCTS.filter((a) => !a.maturityDate);
    expect(noMat.length).toBeGreaterThan(0);
    const notMatured = filterAccounts(ACCTS, { ...ALL, matured: '부' }, DEMO_TODAY);
    expect(noMat.every((a) => notMatured.includes(a))).toBe(true);
    const ranged = filterAccounts(ACCTS, { ...ALL, maturityFrom: '2000-01-01' }, DEMO_TODAY);
    expect(ranged.every((a) => !!a.maturityDate)).toBe(true);
    expect(ranged).toHaveLength(ACCTS.filter((a) => a.maturityDate).length);
  });
  it('계정구분·개설기간(열린 범위)', () => {
    const t = FUNDS_ACCOUNT_TYPES[2];
    expect(filterAccounts(ACCTS, { ...ALL, accountType: t }, DEMO_TODAY).every((a) => a.accountType === t)).toBe(true);
    const opened = filterAccounts(ACCTS, { ...ALL, openFrom: '2023-01-01' }, DEMO_TODAY);
    expect(opened.every((a) => a.openDate >= '2023-01-01')).toBe(true);
    const until = filterAccounts(ACCTS, { ...ALL, openTo: '2019-12-31' }, DEMO_TODAY);
    expect(until.every((a) => a.openDate <= '2019-12-31')).toBe(true);
  });
  /* 2026-11-16 뒤집음 — 종전 "결과에 영향 없음(미연동)". 둘 다 계좌 속성이 아니라 잔액 계산 단계에서 적용된다 */
  it('미결재포함·잔액여부는 계좌 조건이 아니다 — 계좌 필터는 그대로, 잔액 행(buildBalanceRows)은 바뀐다', () => {
    expect(filterAccounts(ACCTS, { ...ALL, includeUnapproved: true, balance: '부' }, DEMO_TODAY)).toEqual(filterAccounts(ACCTS, ALL, DEMO_TODAY));
    const base = buildBalanceRows(ACCTS, TXNS, DEF, DEMO_TODAY, PENDING);
    expect(buildBalanceRows(ACCTS, TXNS, { ...DEF, includeUnapproved: true }, DEMO_TODAY, PENDING)).not.toEqual(base);
    const all = buildBalanceRows(ACCTS, TXNS, ALL, DEMO_TODAY, PENDING);
    expect(buildBalanceRows(ACCTS, TXNS, { ...ALL, balance: '여' }, DEMO_TODAY, PENDING).length).toBeLessThan(all.length);
  });
  it('세 기간 각각 시작 > 종료 = 오류 문구 + 0건', () => {
    const cases: Partial<BalanceFilter>[] = [
      { from: '2026-11-02', to: '2026-11-01' }, { openFrom: '2026-01-02', openTo: '2026-01-01' }, { maturityFrom: '2027-01-02', maturityTo: '2027-01-01' },
    ];
    const keys = ['period', 'open', 'maturity'] as const;
    cases.forEach((c, i) => {
      const f = { ...ALL, ...c };
      const errs = filterErrors(f);
      expect(errs[keys[i]]).toBe(PERIOD_ERROR);
      expect(keys.filter((k) => k !== keys[i]).every((k) => errs[k] === null)).toBe(true);
      expect(filterAccounts(ACCTS, f, DEMO_TODAY)).toEqual([]);
      expect(buildBalanceRows(ACCTS, TXNS, f, DEMO_TODAY)).toEqual([]);
    });
  });
});

describe('buildBalanceRows', () => {
  const rows = buildBalanceRows(ACCTS, TXNS, ALL, DEMO_TODAY);
  it('계정구분 순 → 계좌번호 순', () => {
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1], b = rows[i];
      const ia = FUNDS_ACCOUNT_TYPES.indexOf(a.accountType as never), ib = FUNDS_ACCOUNT_TYPES.indexOf(b.accountType as never);
      expect(ia < ib || (ia === ib && a.accountNo.localeCompare(b.accountNo) <= 0)).toBe(true);
    }
  });
  it('금액 = periodBalance(기준기간)', () => {
    const r = buildBalanceRows(ACCTS, TXNS, DEF, DEMO_TODAY);
    for (const x of r) expect({ opening: x.opening, increase: x.increase, decrease: x.decrease, closing: x.closing }).toEqual(periodBalance(TXNS, x.accountId, DEF.from, DEF.to));
  });
  it('기준기간을 비우면(전 기간) 전잔 0 · 잔액 = 전체 누계 — 0 으로 뭉개지지 않는다', () => {
    for (const x of rows) {
      const all = TXNS.filter((t) => t.accountId === x.accountId);
      expect(x.opening).toBe(0);
      expect(x.increase).toBe(all.reduce((s, t) => s + t.deposit, 0));
      expect(x.closing).toBe(all.reduce((s, t) => s + t.deposit - t.withdraw, 0));
    }
    expect(rows.some((x) => x.increase > 0)).toBe(true);
  });
  it('시작만 / 종료만 지정 = 열린 범위', () => {
    const fromOnly = buildBalanceRows(ACCTS, TXNS, { ...ALL, from: '2026-01-01' }, DEMO_TODAY);
    for (const x of fromOnly) expect(x.closing).toBe(periodBalance(TXNS, x.accountId, '2026-01-01', '9999-12-31').closing);
    const toOnly = buildBalanceRows(ACCTS, TXNS, { ...ALL, to: '2025-12-31' }, DEMO_TODAY);
    for (const x of toOnly) expect(x.closing).toBe(periodBalance(TXNS, x.accountId, '0000-01-01', '2025-12-31').closing);
  });
});

describe('미결재포함 — 결재 대기 거래 더미를 더해 잔액 재계산', () => {
  const base = buildBalanceRows(ACCTS, TXNS, DEF, DEMO_TODAY, PENDING);
  const withU = buildBalanceRows(ACCTS, TXNS, { ...DEF, includeUnapproved: true }, DEMO_TODAY, PENDING);
  it('기본(해제) = 미결재 거래를 넘겨도 종전 수치 그대로', () => {
    expect(base).toEqual(buildBalanceRows(ACCTS, TXNS, DEF, DEMO_TODAY));
    expect(effectiveTxns(TXNS, PENDING, false)).toBe(TXNS);
  });
  it('결정적 더미 — 사용 중 수시입출금 계좌마다 기준일 1건(입금·출금 번갈아), 다시 만들어도 같다', () => {
    expect(PENDING).toEqual(demoUnapprovedTxns(ACCTS, DEMO_TODAY));
    expect(PENDING.length).toBe(ACCTS.filter((a) => a.active && a.freeWithdraw).length);
    expect(PENDING.every((t) => t.date === DEMO_TODAY && (t.deposit > 0) !== (t.withdraw > 0))).toBe(true);
    expect(PENDING.some((t) => t.withdraw > 0)).toBe(true);
    expect(new Set([...TXNS, ...PENDING].map((t) => t.id)).size).toBe(TXNS.length + PENDING.length);
  });
  it('체크 = 같은 계좌 · 미결재 계좌만 기간증감·잔액이 더미만큼 바뀐다 · 합계도 바뀐다', () => {
    expect(withU.map((r) => r.id)).toEqual(base.map((r) => r.id));
    for (const [i, r] of withU.entries()) {
      const p = PENDING.filter((t) => t.accountId === r.accountId);
      const dep = p.reduce((s, t) => s + t.deposit, 0), wd = p.reduce((s, t) => s + t.withdraw, 0);
      expect(r.opening).toBe(base[i].opening);
      expect([r.increase, r.decrease, r.closing]).toEqual([base[i].increase + dep, base[i].decrease + wd, base[i].closing + dep - wd]);
      expect(r.closing).toBeGreaterThanOrEqual(0);
    }
    expect(withU.some((r, i) => r.closing !== base[i].closing)).toBe(true);
    expect(totals(withU).closing).toBe(totals(base).closing + PENDING.reduce((s, t) => s + t.deposit - t.withdraw, 0));
  });
  it('계좌거래상세도 같은 거래를 본다 — 마지막 잔액 = 행 잔액', () => {
    const r = withU.find((x) => PENDING.some((t) => t.accountId === x.accountId))!;
    expect(txnDetail(effectiveTxns(TXNS, PENDING, true), r.accountId, DEF.from, DEF.to).balance).toBe(r.closing);
  });
  it('기준기간이 기준일 전에 끝나면 더미가 들어가지 않는다', () => {
    const f = { ...DEF, to: '2026-10-31' };
    expect(buildBalanceRows(ACCTS, TXNS, { ...f, includeUnapproved: true }, DEMO_TODAY, PENDING)).toEqual(buildBalanceRows(ACCTS, TXNS, f, DEMO_TODAY, PENDING));
  });
});

/* 2026-11-17 사용자 결정 — 잔액여부는 여/부 선택(종전 금액 입력 '그 금액 이상' 가정 폐기). 사용여부·만기여부와 같은 모양 */
describe('잔액여부 — 여 = 잔액 있음(≠ 0) · 부 = 잔액 0', () => {
  const all = buildBalanceRows(ACCTS, TXNS, ALL, DEMO_TODAY, PENDING);
  it('판정 함수: 여·부는 정확한 여집합(음수 잔액은 여) · 빈 값 = 전체', () => {
    expect([balanceMatches(0, '여'), balanceMatches(0, '부'), balanceMatches(0, '')]).toEqual([false, true, true]);
    expect([balanceMatches(-5, '여'), balanceMatches(-5, '부')]).toEqual([true, false]);
    expect([balanceMatches(10, '여'), balanceMatches(10, '부')]).toEqual([true, false]);
  });
  it('빈 값 = 전체 · 여 + 부 = 전체(겹침·누락 없음)', () => {
    expect(buildBalanceRows(ACCTS, TXNS, { ...ALL, balance: '' }, DEMO_TODAY, PENDING)).toEqual(all);
    const yes = buildBalanceRows(ACCTS, TXNS, { ...ALL, balance: '여' }, DEMO_TODAY, PENDING);
    const no = buildBalanceRows(ACCTS, TXNS, { ...ALL, balance: '부' }, DEMO_TODAY, PENDING);
    expect(yes.every((r) => r.closing !== 0)).toBe(true);
    expect(no.every((r) => r.closing === 0)).toBe(true);
    expect(no.length).toBeGreaterThan(0);                                  // 더미에 잔액 0 계좌가 있다(전체 조건에서)
    expect([...yes, ...no].map((r) => r.id).sort()).toEqual(all.map((r) => r.id).sort());
    expect(totals(no).closing).toBe(0);
  });
  it('미결재포함과 함께 걸면 재계산된 잔액으로 판정', () => {
    const withU = buildBalanceRows(ACCTS, TXNS, { ...ALL, includeUnapproved: true }, DEMO_TODAY, PENDING);
    const got = buildBalanceRows(ACCTS, TXNS, { ...ALL, includeUnapproved: true, balance: '여' }, DEMO_TODAY, PENDING);
    expect(got.map((r) => r.id)).toEqual(withU.filter((r) => r.closing !== 0).map((r) => r.id));
  });
});

describe('withSubtotals · totals', () => {
  const rows = buildBalanceRows(ACCTS, TXNS, ALL, DEMO_TODAY);
  const sub = withSubtotals(rows);
  it('계정구분 그룹 끝마다 소계 1행, 소계 = 그룹 합', () => {
    const types = [...new Set(rows.map((r) => r.accountType))];
    const subs = sub.filter((r) => r.kind === 'subtotal');
    expect(subs.map((r) => r.accountType)).toEqual(types);
    for (const s of subs) {
      const g = rows.filter((r) => r.accountType === s.accountType);
      expect(s.closing).toBe(g.reduce((a, r) => a + r.closing, 0));
      expect(s.opening).toBe(g.reduce((a, r) => a + r.opening, 0));
      const idx = sub.indexOf(s);
      expect(sub[idx - 1].accountType).toBe(s.accountType);
      expect(s).toMatchObject({ accountNo: '', subject: '', rate: null, maturityDate: '' });
    }
  });
  it('합계는 소계를 켜도 계좌 행 합(중복 합산 없음)', () => {
    const plain = totals(rows);
    expect(totals(sub)).toEqual(plain);
    expect(plain.closing).toBe(rows.reduce((s, r) => s + r.closing, 0));
    expect(accountCount(sub)).toBe(rows.length);
  });
  it('빈 입력 = 빈 결과', () => {
    expect(withSubtotals([])).toEqual([]);
    expect(totals([])).toEqual({ opening: 0, increase: 0, decrease: 0, closing: 0 });
  });
});

describe('txnDetail', () => {
  const tx = (id: string, date: string, deposit: number, withdraw: number): CashTxn => ({ id, accountId: 'A', date, deposit, withdraw, partner: 'P', memo: 'm', slipNo: 's' + id });
  const T = [tx('1', '2026-01-01', 1000, 0), tx('2', '2026-02-05', 0, 300), tx('3', '2026-02-20', 500, 0), tx('4', '2026-03-01', 9, 0)];
  it('첫 행 전일잔액 + 기간 거래, 합계 = 거래 합 · 잔액 = 마지막 잔액', () => {
    const d = txnDetail(T, 'A', '2026-02-01', '2026-02-28');
    expect(d.rows[0]).toMatchObject({ carry: true, memo: '전일잔액', balance: 1000, date: '2026-02-01' });
    expect(d.rows).toHaveLength(3);
    expect(d).toMatchObject({ deposit: 500, withdraw: 300, balance: 1200 });
  });
  it('전 기간 = 이월 0 · 일자 빈칸 · 전 거래', () => {
    const d = txnDetail(T, 'A', '', '');
    expect(d.rows[0]).toMatchObject({ carry: true, balance: 0, date: '' });
    expect(d).toMatchObject({ deposit: 1509, withdraw: 300, balance: 1209 });
  });
});

describe('labels', () => {
  it('periodLabel · rateLabel', () => {
    expect(periodLabel('2026-10-01', '2026-11-05')).toBe('2026-10-01 ~ 2026-11-05');
    expect(periodLabel('', '')).toBe('전 기간');
    expect(periodLabel('2026-10-01', '', ' - ')).toBe('2026-10-01 - …');
    expect(rateLabel(2.35)).toBe('2.35%');
    expect(rateLabel(0.1)).toBe('0.1%');
    expect(rateLabel(null)).toBe('');
  });
});

describe('buildDepositStatement · statementPages', () => {
  const rows = buildBalanceRows(ACCTS, TXNS, ALL, DEMO_TODAY);
  const secs = buildDepositStatement(withSubtotals(rows));
  it('계정구분마다 절, 절 안 계정과목별 〈 소계 〉, 합 계 = 절 계좌 잔액 합', () => {
    expect(secs.map((s) => s.accountType)).toEqual([...new Set(rows.map((r) => r.accountType))]);
    for (const s of secs) {
      const inType = rows.filter((r) => r.accountType === s.accountType);
      expect(s.total).toBe(inType.reduce((a, r) => a + r.closing, 0));
      const lines = s.lines.filter((l) => l.kind === 'row');
      expect(lines).toHaveLength(inType.length);
      expect(lines.map((l) => (l.kind === 'row' ? l.no : 0))).toEqual(inType.map((_, i) => i + 1));
      for (const sl of s.lines) {
        if (sl.kind !== 'subtotal') continue;
        expect(sl.closing).toBe(inType.filter((r) => r.subject === sl.subject).reduce((a, r) => a + r.closing, 0));
      }
      const subjects = [...new Set(inType.map((r) => r.subject))];
      expect(s.lines.filter((l) => l.kind === 'subtotal')).toHaveLength(subjects.length);
    }
  });
  it('쪽 나눔 — 절마다 새 쪽, 넘치면 이어 쪽, last 는 절의 마지막 쪽만', () => {
    const pages = statementPages(secs, 3);
    for (const s of secs) {
      const ps = pages.filter((p) => p.accountType === s.accountType);
      expect(ps).toHaveLength(Math.ceil(s.lines.length / 3));
      expect(ps.map((p) => p.last)).toEqual(ps.map((_, i) => i === ps.length - 1));
      expect(ps.flatMap((p) => p.lines)).toEqual(s.lines);
    }
    expect(statementPages([], 10)).toEqual([]);
  });
  it('소계 행 입력은 무시(계좌 행만)', () => {
    const fake: BalanceRow = { ...withSubtotals(rows).find((r) => r.kind === 'subtotal')! };
    expect(buildDepositStatement([...rows, fake])).toEqual(buildDepositStatement(rows));
  });
});
