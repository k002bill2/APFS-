import { describe, it, expect } from 'vitest';
import { demoLedger } from './ledger_data';
import { generalLedger, subledger, flattenSubledger, validatePeriod, MSG } from './ledger_model';
import { defaultGeneralLedgerFilter, openingHeader, closingHeader } from './general_ledger_model';

const TODAY = '2026-11-02';
const src = demoLedger(TODAY);

describe('총계정원장 기본 조건', () => {
  const f = defaultGeneralLedgerFilter(TODAY);
  it('기간 = 당기 회기 시작 ~ 오늘, 체크 3종 미체크, 계정구분 전체', () => {
    expect(f).toMatchObject({ from: '2026-01-01', to: TODAY, fundAccount: '', includeUnapproved: false, includeAll: false, includeClosing: false });
  });
  it('기본 조건은 기간 검증을 통과한다(필수)', () => { expect(validatePeriod(f.from, f.to, true)).toBeNull(); });
  it('E00 — 기본 조건으로 행이 있다', () => { expect(generalLedger(src.lines, f, f.from, f.to).length).toBeGreaterThan(0); });
  it('헤더 문구', () => {
    expect(openingHeader('2026-01-01')).toBe('기초잔액(2026-01-01 이전)');
    expect(closingHeader(TODAY)).toBe(`금일잔액(${TODAY})`);
  });
});

describe('E01 기간 검증', () => {
  it('미입력 / 역순', () => {
    expect(validatePeriod('', TODAY, true)).toBe(MSG.periodRequired);
    expect(validatePeriod('2026-05-01', '2026-04-01', true)).toBe(MSG.periodOrder);
  });
});

describe('원장 ↔ 계정별 상세내역 팝업 수치 일관성', () => {
  const base = defaultGeneralLedgerFilter(TODAY);
  const conds = [
    base,
    { ...base, includeUnapproved: true, includeClosing: true },
    { ...base, from: '2025-06-01', to: '2025-12-31', includeClosing: true },
    { ...base, fundAccount: '농식품 투자조합 계정', includeAll: true },
  ];
  it.each(conds.map((c, i) => [i, c] as const))('조건 #%i — 기초 = [전잔], 금일 = 마지막 잔액, 차대 = 명세 합', (_i, c) => {
    const rows = generalLedger(src.lines, c, c.from, c.to);
    for (const r of rows) {
      /* 팝업과 같은 호출(account_detail_modal) */
      const g = subledger(src.lines, c, { from: c.from, to: c.to, account: r.code }).filter((x) => x.code === r.code);
      const flat = flattenSubledger(g, { subtotal: false });
      expect(flat[0].kind).toBe('opening');
      expect(flat[0].balance).toBe(r.opening);
      expect(flat[flat.length - 1].balance).toBe(r.closing);
      const entries = flat.filter((x) => x.kind === 'entry');
      expect(entries.reduce((s, e) => s + e.debit, 0)).toBe(r.debit);
      expect(entries.reduce((s, e) => s + e.credit, 0)).toBe(r.credit);
    }
  });
  it('기간 전체 차변 합 = 대변 합(대차 일치)', () => {
    const rows = generalLedger(src.lines, base, base.from, base.to);
    expect(rows.reduce((s, r) => s + r.debit, 0)).toBe(rows.reduce((s, r) => s + r.credit, 0));
  });
});
