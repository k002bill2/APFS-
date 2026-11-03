/* 장부조회(ACC-009~014) 집계 모델 회귀 — 더미 원장이 회계 등식을 지키는지, 화면 간 숫자가 서로 맞는지 */
import { describe, it, expect } from 'vitest';
import { demoLedger, flattenSlips, accountOf, LEDGER_ACCOUNTS, NET_INCOME_BS, RETAINED_PRIOR } from './ledger_data';
import type { LedgerSlip } from './ledger_data';
import {
  DEFAULT_COND, filterLines, subledger, flattenSubledger, generalLedger, trialBalance, balanceSheet, incomeStatement,
  dailyStatement, monthlyStatement, validatePeriod, validateStatementDates, fiscalNo, MSG, NET_INCOME_IS,
} from './ledger_model';
import type { LedgerCond, StatementRow } from './ledger_model';
import { FUND_ACCOUNTS } from '../slip/general_journal_data';
import { entryOf, journalRowOf } from './ledger_journal_view';

const TODAY = '2026-11-02';
const src = demoLedger(TODAY);
const { slips, lines } = src;
const COMBOS: LedgerCond[] = [false, true].flatMap((u) => [false, true].map((c) => ({ ...DEFAULT_COND, includeUnapproved: u, includeClosing: c })));
const amt = (rows: StatementRow[], id: string, k: 'cur' | 'prev' = 'cur') => rows.find((r) => r.id === id)?.[k] ?? NaN;

describe('더미 원장', () => {
  it('전표마다 차변 합 = 대변 합', () => {
    for (const s of slips) {
      const dr = s.lines.reduce((a, l) => a + l.debit, 0), cr = s.lines.reduce((a, l) => a + l.credit, 0);
      expect(dr, s.slipNo).toBe(cr);
      expect(dr, s.slipNo).toBeGreaterThan(0);
    }
  });
  it('계정코드는 전부 원장 계정과목(입력계정)이다', () => {
    for (const l of lines) expect(accountOf(l.accountCode)?.input, l.accountCode).toBe(true);
  });
  it('2025~2026 · 계정구분 3종 · 미결재·결산 전표가 섞여 있다', () => {
    expect(new Set(lines.map((l) => l.slipDate.slice(0, 4)))).toEqual(new Set(['2025', '2026']));
    expect(new Set(lines.map((l) => l.fundAccount))).toEqual(new Set(FUND_ACCOUNTS));
    expect(slips.some((s) => s.approval !== '승인')).toBe(true);
    expect(slips.some((s) => s.closing)).toBe(true);
    expect(new Set(lines.map((l) => accountOf(l.accountCode)?.cls))).toEqual(new Set(['자산', '부채', '자본', '손익']));
  });
  it('전표번호는 유일하고 오늘 날짜 전표가 있다(일계표 기본값)', () => {
    expect(new Set(slips.map((s) => s.slipNo)).size).toBe(slips.length);
    expect(slips.some((s) => s.slipDate === TODAY)).toBe(true);
  });
  it('결산서 계층 — 레벨2 표시명 Ⅰ. · 레벨3 집계 (1)', () => {
    expect(accountOf('1100000')?.label).toBe('Ⅰ. 유동자산');
    expect(accountOf('1110000')?.label).toBe('(1) 당좌자산');
    expect(accountOf('1110200')?.label).toBe('보통예금');
    expect(LEDGER_ACCOUNTS.map((a) => a.code)).toEqual([...LEDGER_ACCOUNTS.map((a) => a.code)].sort());
  });
});

describe('filterLines — 공통조건', () => {
  it('미결재포함 = 부 → 승인 전표만, 결산전표포함 = 부 → 결산 제외', () => {
    const f = filterLines(lines, { ...DEFAULT_COND, includeClosing: false });
    expect(f.every((l) => l.approval === '승인' && !l.closing)).toBe(true);
    expect(filterLines(lines, { ...DEFAULT_COND, includeUnapproved: true }).length).toBeGreaterThan(filterLines(lines, DEFAULT_COND).length);
  });
  it('계정구분 단일·다중·전체, 기간 경계 포함', () => {
    const one = filterLines(lines, { ...DEFAULT_COND, fundAccount: FUND_ACCOUNTS[1] });
    expect(one.every((l) => l.fundAccount === FUND_ACCOUNTS[1])).toBe(true);
    const two = filterLines(lines, { ...DEFAULT_COND, fundAccount: [FUND_ACCOUNTS[0], FUND_ACCOUNTS[2]] });
    expect(two.some((l) => l.fundAccount === FUND_ACCOUNTS[1])).toBe(false);
    expect(filterLines(lines, { ...DEFAULT_COND, fundAccount: [] }).length).toBe(filterLines(lines, DEFAULT_COND).length);
    const p = filterLines(lines, DEFAULT_COND, '2025-12-31', '2025-12-31');
    expect(p.length).toBeGreaterThan(0);
    expect(p.every((l) => l.slipDate === '2025-12-31')).toBe(true);
  });
});

describe('계정별보조부 · 총계정원장', () => {
  const q = { from: '2026-01-01', to: '2026-10-31' };
  const groups = subledger(lines, DEFAULT_COND, q);
  it('누적잔액 = 전잔 + 명세 순차 합, 소계 잔액 = 마지막 잔액', () => {
    const g = groups.find((x) => x.code === '1110200')!;
    expect(g.opening).toBeGreaterThan(0);
    let bal = g.opening;
    for (const e of g.entries) { bal += e.debit - e.credit; expect(e.balance).toBe(bal); }
    expect(g.closing).toBe(bal);
    const flat = flattenSubledger([g]);
    expect(flat[0]).toMatchObject({ kind: 'opening', accountName: '[전잔] 보통예금', debit: 0, credit: 0, balance: g.opening });
    expect(flat[flat.length - 1]).toMatchObject({ kind: 'subtotal', balance: g.closing, debit: g.debit, credit: g.credit });
  });
  it('작성자·거래처·적요 필터는 명세만 줄이고 전잔은 그대로', () => {
    const all = groups.find((x) => x.code === '1110200')!;
    const byWriter = subledger(lines, DEFAULT_COND, { ...q, writer: '김민준' }).find((x) => x.code === '1110200')!;
    const byMemo = subledger(lines, DEFAULT_COND, { ...q, memo: '이자' }).find((x) => x.code === '1110200')!;
    const byPartner = subledger(lines, DEFAULT_COND, { ...q, partner: '도담', account: '2100100' });
    expect(byWriter.opening).toBe(all.opening);
    expect(byMemo.opening).toBe(all.opening);
    expect(byWriter.entries.length).toBeLessThan(all.entries.length);
    expect(byMemo.entries.every((e) => e.memo.includes('이자'))).toBe(true);
    expect(byPartner).toHaveLength(1);
    expect(byPartner[0].entries.every((e) => e.partner.includes('도담'))).toBe(true);
  });
  it('손익 계정 전잔은 회기 시작부터(전기 손익 미포함)', () => {
    const sal = subledger(lines, DEFAULT_COND, { from: '2026-01-01', to: '2026-03-31', account: '4200100' });
    expect(sal.length === 0 || sal[0].opening === 0).toBe(true);
    const mid = subledger(lines, DEFAULT_COND, { from: '2026-04-01', to: '2026-04-30', account: '4200100' })[0];
    expect(mid.opening).toBeGreaterThan(0);
  });
  it('작성계정과목만 = 명세 있는 계정만', () => {
    const w = subledger(lines, DEFAULT_COND, { from: '2026-10-01', to: '2026-10-31', writtenOnly: true });
    expect(w.every((g) => g.entries.length > 0)).toBe(true);
  });
  it('원장 기초 = 보조부 전잔, 금일 = 마지막 잔액', () => {
    const gl = generalLedger(lines, DEFAULT_COND, q.from, q.to);
    expect(gl.length).toBe(groups.length);
    for (const r of gl) {
      const g = groups.find((x) => x.code === r.code)!;
      expect(r.opening).toBe(g.opening);
      expect(r.closing).toBe(g.entries.length ? g.entries[g.entries.length - 1].balance : g.opening);
      const sign = accountOf(r.code)?.dc === '대변' ? -1 : 1;
      expect(r.closing).toBe(r.opening + sign * (r.debit - r.credit));
    }
  });
});

describe('합계잔액시산표', () => {
  it.each(COMBOS.map((c) => [c.includeUnapproved, c.includeClosing, c] as const))('대차 일치(미결재 %s · 결산 %s)', (_u, _c, cond) => {
    for (const asOf of ['2025-06-30', '2025-12-31', '2026-10-31', TODAY]) {
      const { total } = trialBalance(lines, cond, asOf);
      expect(total.drTotal).toBe(total.crTotal);
      expect(total.drBalance).toBe(total.crBalance);
      expect(total.drTotal).toBeGreaterThan(0);
    }
  });
  it('집계 행 = 하위 합, 2026 기준일엔 전기이월이익잉여금 행이 생긴다', () => {
    const tb = trialBalance(lines, DEFAULT_COND, '2026-10-31');
    const assets = tb.rows.find((r) => r.code === '1000000')!;
    const kids = tb.rows.filter((r) => r.kind === 'leaf' && r.cls === '자산');
    expect(assets.drTotal).toBe(kids.reduce((s, r) => s + r.drTotal, 0));
    expect(tb.rows.some((r) => r.code === RETAINED_PRIOR)).toBe(true);
    expect(trialBalance(lines, DEFAULT_COND, '2025-10-31').rows.some((r) => r.code === RETAINED_PRIOR)).toBe(false);
  });
});

describe('재무상태표 · 손익계산서', () => {
  it.each(COMBOS.map((c) => [c.includeUnapproved, c.includeClosing, c] as const))('자산총계 = 부채총계 + 자본총계(미결재 %s · 결산 %s)', (_u, _c, cond) => {
    for (const [cur, prev] of [['2026-10-31', '2025-12-31'], ['2025-12-31', '2025-06-30'], [TODAY, '2025-12-31']] as const) {
      const bs = balanceSheet(lines, cond, cur, prev);
      for (const k of ['cur', 'prev'] as const) {
        expect(amt(bs, 'total-자산', k)).toBe(amt(bs, 'total-부채', k) + amt(bs, 'total-자본', k));
        expect(amt(bs, 'total-부채자본', k)).toBe(amt(bs, 'total-자산', k));
      }
    }
  });
  it('재무상태표 당기순이익 = 손익계산서 당기순이익', () => {
    for (const cond of COMBOS) {
      const bs = balanceSheet(lines, cond, '2026-10-31', '2025-12-31');
      const is = incomeStatement(lines, cond, '2026-10-31', '2025-12-31');
      expect(amt(bs, NET_INCOME_BS)).toBe(amt(is, NET_INCOME_IS));
      expect(amt(bs, NET_INCOME_BS, 'prev')).toBe(amt(is, NET_INCOME_IS, 'prev'));
    }
  });
  it('집계 행 = 하위 부호 합(차감계정은 빼기) — 합성 감가상각 전표', () => {
    const dep: LedgerSlip = { ...slips[0], slipNo: 'TEST-001', slipDate: '2026-06-30', closing: false, approval: '승인', origin: '일반',
      lines: [{ ...slips[0].lines[0], accountCode: '4200200', debit: 1_000_000, credit: 0 }, { ...slips[0].lines[0], accountCode: '1220200', debit: 0, credit: 1_000_000 }] };
    const ls = [...lines, ...flattenSlips([dep])];
    const before = balanceSheet(lines, DEFAULT_COND, '2026-10-31', '2025-12-31');
    const after = balanceSheet(ls, DEFAULT_COND, '2026-10-31', '2025-12-31');
    expect(amt(after, 'total-자산')).toBe(amt(before, 'total-자산') - 1_000_000);
    expect(amt(after, 'total-자산')).toBe(amt(after, 'total-부채') + amt(after, 'total-자본'));
    expect(amt(after, '1220200')).toBe(1_000_000);   // 누계액 행 자체는 정상잔액(대변) 양수
  });
  it('행 배치 — 머리행 금액 없음 · 집계 = 합계열 · 입력계정 = 세부열·더블클릭 가능', () => {
    const bs = balanceSheet(lines, DEFAULT_COND, '2026-10-31', '2025-12-31');
    expect(bs[0]).toMatchObject({ kind: 'header', label: '자산', cur: null });
    expect(bs.find((r) => r.code === '1100000')).toMatchObject({ kind: 'group', col: 'total', drillable: false });
    expect(bs.find((r) => r.code === '1110200')).toMatchObject({ kind: 'leaf', col: 'detail', drillable: true });
    expect(bs.find((r) => r.code === RETAINED_PRIOR)).toMatchObject({ kind: 'calc', drillable: false });
    expect(bs[bs.length - 1].label).toBe('자본과 부채총계');
  });
  it('모든계정포함 = 여 → 0 인 계정 행도 나온다', () => {
    const off = balanceSheet(lines, DEFAULT_COND, '2026-10-31', '2025-12-31');
    const on = balanceSheet(lines, { ...DEFAULT_COND, includeAll: true }, '2026-10-31', '2025-12-31');
    expect(on.length).toBeGreaterThan(off.length);
    expect(off.filter((r) => r.kind === 'leaf').every((r) => r.cur !== 0 || r.prev !== 0)).toBe(true);
  });
  it('손익계산서 = 회기 시작 ~ 기준일(전기 손익 미포함)', () => {
    const is = incomeStatement(lines, DEFAULT_COND, '2026-01-31', '2025-01-31');
    const net = filterLines(lines, DEFAULT_COND, '2026-01-01', '2026-01-31').filter((l) => accountOf(l.accountCode)?.cls === '손익').reduce((s, l) => s + l.credit - l.debit, 0);
    expect(amt(is, NET_INCOME_IS)).toBe(net);
  });
  it('제N기 — 2025 = 제1기', () => { expect(fiscalNo('2025-12-31')).toBe(1); expect(fiscalNo('2026-10-31')).toBe(2); });
});

describe('일계표 · 월계표', () => {
  it('일계표 — 소계 = 계정 합, 총계 = 소계 합, 계정구분 다중 선택', () => {
    const d = dailyStatement(lines, DEFAULT_COND, TODAY);
    expect(d.rows.length).toBeGreaterThan(0);
    for (const sub of d.rows.filter((r) => r.kind === 'subtotal')) {
      const items = d.rows.filter((r) => r.kind === 'line' && r.fundAccount === sub.fundAccount);
      expect(sub.debit).toBe(items.reduce((s, r) => s + r.debit, 0));
    }
    expect(d.total.debit).toBe(d.total.credit);
    const one = dailyStatement(lines, { ...DEFAULT_COND, fundAccount: [FUND_ACCOUNTS[0]] }, TODAY);
    expect(one.rows.every((r) => r.fundAccount === FUND_ACCOUNTS[0])).toBe(true);
  });
  it('월계표 합계행 = 각 월 합', () => {
    const m = monthlyStatement(lines, { ...DEFAULT_COND, fundAccount: FUND_ACCOUNTS[0] }, '2026-01-01', '2026-10-31');
    expect(m.months.map((r) => r.month)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(m.total.month).toBe('2026-01 ~ 2026-10');
    for (const a of m.accounts) {
      expect(m.total.cells[a.code].debit).toBe(m.months.reduce((s, r) => s + r.cells[a.code].debit, 0));
      expect(m.total.cells[a.code].credit).toBe(m.months.reduce((s, r) => s + r.cells[a.code].credit, 0));
    }
    expect(m.total.debit).toBe(m.months.reduce((s, r) => s + r.debit, 0));
    expect(m.total.debit).toBe(m.total.credit);
  });
});

describe('검증 · 전표상세 어댑터', () => {
  it('기간·기준일 검증 문구', () => {
    expect(validatePeriod('', '', true)).toBe(MSG.periodRequired);
    expect(validatePeriod('2026-02-01', '2026-01-01')).toBe(MSG.periodOrder);
    expect(validatePeriod('', '')).toBeNull();
    expect(validateStatementDates('', '2025-12-31')).toBe(MSG.dateRequired);
    expect(validateStatementDates('2025-12-31', '2025-12-31')).toBe(MSG.prevOrder);
    expect(validateStatementDates('2026-12-31', '2025-12-31')).toBeNull();
  });
  it('전표번호 → EntryState(edit) · 분개 금액 그대로', () => {
    const s = slips.find((x) => x.lines.length === 3)!;
    const e = entryOf(src, s.slipNo)!;
    expect(e.mode).toBe('edit');
    const j = journalRowOf(s);
    expect(j.slipNo).toBe(s.slipNo);
    expect(j.lines).toHaveLength(3);
    expect(j.amount).toBe(s.lines.reduce((a, l) => a + l.debit, 0));
    expect(j.lines.map((l) => l.debit ?? 0)).toEqual(s.lines.map((l) => l.debit));
    expect(entryOf(src, 'NOPE')).toBeNull();
  });
});

describe('통합 보강 — 회기 경계 · 집계 행 · 상쇄 그룹 · 월계표 단일 계정구분', () => {
  const tbSigned = (asOf: string, code: string) => {
    const r = trialBalance(lines, DEFAULT_COND, asOf).rows.find((x) => x.code === code);
    if (!r) return 0;
    return accountOf(code)?.dc === '대변' ? r.crBalance - r.drBalance : r.drBalance - r.crBalance;
  };
  const plCodes = LEDGER_ACCOUNTS.filter((a) => a.input && a.cls === '손익').map((a) => a.code);

  it('손익 계정 누적잔액은 회기(역년)가 바뀌면 0 에서 다시 쌓는다', () => {
    const g = subledger(lines, DEFAULT_COND, { from: '2025-06-01', to: TODAY, account: plCodes[0] }).find((x) => x.code === plCodes[0])!;
    const first2026 = g.entries.findIndex((e) => e.slipDate >= '2026-01-01');
    expect(first2026).toBeGreaterThan(0);
    const e = g.entries[first2026];
    expect(e.balance).toBe(signedOfLine(e));
  });

  it('기간이 회기를 넘어도 원장 손익 계정 금일잔액 = 시산표 잔액(같은 종료일)', () => {
    const gl = generalLedger(lines, DEFAULT_COND, '2025-06-01', TODAY);
    const checked = gl.filter((r) => plCodes.includes(r.code));
    expect(checked.length).toBeGreaterThan(0);
    for (const r of checked) expect(r.closing, r.code).toBe(tbSigned(TODAY, r.code));
  });

  it('기간 없는 기본 조회 — 손익 계정 마지막 잔액 = 손익계산서 당기 금액', () => {
    const is = incomeStatement(lines, DEFAULT_COND, TODAY, '2025-12-31');
    for (const g of subledger(lines, DEFAULT_COND, { from: '', to: '' }).filter((x) => plCodes.includes(x.code))) {
      expect(g.closing, g.code).toBe(amt(is, g.code));
    }
  });

  it('[소계] 잔액 = 보인 마지막 잔액 — 이전 회기 명세만 있는 손익 계정도(closing 은 0)', () => {
    const gs = subledger(lines, DEFAULT_COND, { from: '', to: '' });
    const stale = gs.find((g) => plCodes.includes(g.code) && g.entries.length && g.entries[g.entries.length - 1].slipDate < '2026-01-01');
    expect(stale).toBeDefined();
    expect(stale!.closing).toBe(0);
    const sub = flattenSubledger([stale!]).find((r) => r.kind === 'subtotal')!;
    expect(sub.balance).toBe(stale!.entries[stale!.entries.length - 1].balance);
    expect(sub.balance).not.toBe(0);
  });

  it('시산표 — 집계 행 포함 모든 행에서 차변·대변 잔액이 동시에 양수일 수 없다(잔액 = 합계끼리의 차)', () => {
    for (const asOf of ['2025-12-31', '2026-10-31']) {
      for (const r of trialBalance(lines, { ...DEFAULT_COND, includeAll: true }, asOf).rows) {
        expect(r.drBalance > 0 && r.crBalance > 0, `${asOf} ${r.code}`).toBe(false);
        expect(r.drBalance - r.crBalance, `${asOf} ${r.code}`).toBe(r.drTotal - r.crTotal);
      }
    }
  });

  it('재무상태표 — 하위끼리 상쇄돼 합이 0 인 그룹도 0 아닌 하위 행과 함께 남는다', () => {
    const base = lines.filter((l) => !l.accountCode.startsWith('1220'));
    const s: LedgerSlip = { ...slips[0], slipNo: 'TEST-OFFSET', slipDate: '2026-06-30', closing: false, approval: '승인', origin: '일반',
      lines: [{ ...slips[0].lines[0], accountCode: '1220100', debit: 500_000, credit: 0 }, { ...slips[0].lines[0], accountCode: '1220200', debit: 0, credit: 500_000 }] };
    const rows = balanceSheet([...base, ...flattenSlips([s])], DEFAULT_COND, '2026-10-31', '2025-12-31');
    expect(amt(rows, '1220000')).toBe(0);
    expect(amt(rows, '1220100')).toBe(500_000);
    expect(amt(rows, '1220200')).toBe(500_000);
    const i = rows.findIndex((r) => r.id === '1220000');
    expect(rows[i + 1].id).toBe('1220100');   // 자신 → 하위 순서 유지
  });

  it('월계표 — 계정구분이 하나가 아니면 빈 결과(계정구분 간 합산 금지)', () => {
    for (const fa of ['', [] as string[], [FUND_ACCOUNTS[0], FUND_ACCOUNTS[1]]]) {
      const m = monthlyStatement(lines, { ...DEFAULT_COND, fundAccount: fa }, '2026-01-01', '2026-10-31');
      expect(m.accounts).toEqual([]);
      expect(m.months).toEqual([]);
      expect(m.total).toMatchObject({ month: '2026-01 ~ 2026-10', debit: 0, credit: 0 });
    }
  });
});

function signedOfLine(l: { accountCode: string; debit: number; credit: number }): number {
  return accountOf(l.accountCode)?.dc === '대변' ? l.credit - l.debit : l.debit - l.credit;
}
