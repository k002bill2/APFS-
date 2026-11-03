import { describe, it, expect } from 'vitest';
import { demoLedger, RETAINED_PRIOR } from './ledger_data';
import { DEFAULT_COND, trialBalance } from './ledger_model';
import type { LedgerCond } from './ledger_model';
import { gridRows, printSections, printPages } from './trial_balance_model';

const { lines } = demoLedger('2026-11-02');
const BASE: LedgerCond = { ...DEFAULT_COND, includeClosing: false };   // ACC-014 기본: 결산전표포함 부
const COMBOS: LedgerCond[] = [false, true].flatMap((u) => [false, true].flatMap((c) => [false, true].map((a) => ({ ...BASE, includeUnapproved: u, includeClosing: c, includeAll: a }))));

describe('합계잔액시산표 — 대차 일치', () => {
  it.each(COMBOS.map((c) => [c.includeUnapproved, c.includeClosing, c.includeAll, c] as const))('차변합계 = 대변합계(미결재 %s · 결산 %s · 모든계정 %s)', (_u, _c, _a, cond) => {
    for (const asOf of ['2025-06-30', '2025-12-31', '2026-10-31', '2026-11-02']) {
      const tb = trialBalance(lines, cond, asOf);
      expect(tb.total.drTotal).toBe(tb.total.crTotal);
      expect(tb.total.drBalance).toBe(tb.total.crBalance);
    }
  });
  it('잔액은 한쪽만 양수(입력계정)', () => {
    for (const r of trialBalance(lines, BASE, '2026-10-31').rows.filter((x) => x.kind === 'leaf')) {
      expect(r.drBalance >= 0 && r.crBalance >= 0).toBe(true);
      expect(r.drBalance > 0 && r.crBalance > 0).toBe(false);
      expect(r.drBalance - r.crBalance).toBe(r.drTotal - r.crTotal);
    }
  });
  it('모든계정포함 부 = 금액 없는 계정 행 숨김', () => {
    const off = trialBalance(lines, BASE, '2026-10-31').rows;
    const on = trialBalance(lines, { ...BASE, includeAll: true }, '2026-10-31').rows;
    expect(off.filter((r) => r.kind === 'leaf').every((r) => r.drTotal || r.crTotal)).toBe(true);
    expect(on.length).toBeGreaterThan(off.length);
  });
});

describe('그리드 행', () => {
  const rows = gridRows(trialBalance(lines, BASE, '2026-10-31'));
  it('No = 1부터 행 순번', () => { expect(rows.map((r) => r.no)).toEqual(rows.map((_, i) => i + 1)); });
  it('상세 진입 = 입력계정만(집계·전기이월이익잉여금 무반응)', () => {
    expect(rows.filter((r) => r.kind === 'group').every((r) => !r.drillable)).toBe(true);
    expect(rows.find((r) => r.code === RETAINED_PRIOR)?.drillable).toBe(false);
    expect(rows.some((r) => r.drillable)).toBe(true);
  });
});

describe('출력 양식', () => {
  const tb = trialBalance(lines, BASE, '2026-10-31');
  const secs = printSections(tb);
  it('최하위 계정만 · 구분 순서 자산→부채→자본→손익', () => {
    expect(secs.every((s) => s.rows.every((r) => r.kind === 'leaf'))).toBe(true);
    expect(secs.map((s) => s.cls)).toEqual(['자산', '부채', '자본', '손익'].filter((c) => secs.some((s) => s.cls === c)));
  });
  it('구분 합계의 합 = 시산표 합계', () => {
    for (const k of ['drBalance', 'drTotal', 'crTotal', 'crBalance'] as const) {
      expect(secs.reduce((s, x) => s + x.total[k], 0)).toBe(tb.total[k]);
    }
  });
  it('쪽 나누기 — 줄 수 상한 · 모든 행 1회 · 쪽 첫 줄은 구분 머리', () => {
    const pages = printPages(secs, 8);
    expect(pages.length).toBeGreaterThan(1);
    for (const p of pages) { expect(p.length).toBeLessThanOrEqual(9); expect(p[0].kind).toBe('section'); }
    const printed = pages.flat().filter((l) => l.kind === 'row').length;
    expect(printed).toBe(secs.reduce((s, x) => s + x.rows.length, 0));
  });
  it('빈 결과도 1쪽', () => { expect(printPages([], 30)).toEqual([[]]); });
});
