/* 일/월계표(ACC-009) 화면 규칙 — 기본값 · 탭 전환(slide 12 ③) · [필터 적용] 검증 */
import { describe, it, expect } from 'vitest';
import { condOf, defaultFilter, defaultMonthRange, errorField, resetFilter, switchTab, validateFilter } from './daily_monthly_model';
import { MSG, dailyStatement, monthlyStatement } from './ledger_model';
import { demoLedger } from './ledger_data';
import { FUND_ACCOUNTS } from '../slip/general_journal_data';

const TODAY = '2026-10-15';
const [A, B] = FUND_ACCOUNTS;

describe('기본값', () => {
  it('월계표 기간 = 당해 1/1 ~ 현재월 말', () => {
    expect(defaultMonthRange(TODAY)).toEqual({ from: '2026-01-01', to: '2026-10-31' });
    expect(defaultMonthRange('2024-02-10').to).toBe('2024-02-29');   // 윤년
    expect(defaultMonthRange('2026-12-31').to).toBe('2026-12-31');
  });
  it('계정구분 전체 · 기준일 오늘 · 플래그 전부 부(결산전표포함 포함)', () => {
    const f = defaultFilter(TODAY);
    expect(f.fundAccount).toEqual([]);
    expect(f.date).toBe(TODAY);
    expect([f.includeUnapproved, f.includeAll, f.includeClosing]).toEqual([false, false, false]);
  });
});

describe('탭 전환', () => {
  const base = { ...defaultFilter(TODAY), fundAccount: [A, B], date: '2026-05-01', includeUnapproved: true };
  it('일계표 → 월계표: 첫 계정구분만 유지 · 기간 재설정 · 플래그 유지', () => {
    const m = switchTab(base, 'monthly', TODAY);
    expect(m.fundAccount).toEqual([A]);
    expect([m.from, m.to]).toEqual(['2026-01-01', '2026-10-31']);
    expect(m.includeUnapproved).toBe(true);
  });
  it('계정구분이 없으면 첫 계정구분을 기본 선택(데모)', () => {
    const m = switchTab({ ...base, fundAccount: [] }, 'monthly', TODAY);
    expect(m.fundAccount).toEqual([A]);                 // 데모 기본 계정구분 — 진입 즉시 조회
    expect(validateFilter('monthly', m)).toBeNull();
    expect(validateFilter('monthly', { ...m, fundAccount: [] })).toBe(MSG.fundRequired);
  });
  it('월계표 → 일계표: 기준일 오늘 · 선택값 유지', () => {
    const d = switchTab({ ...base, fundAccount: [B] }, 'daily', TODAY);
    expect(d.date).toBe(TODAY);
    expect(d.fundAccount).toEqual([B]);
  });
});

describe('검증', () => {
  const f = defaultFilter(TODAY);
  it('일계표: 기준일 필수', () => {
    expect(validateFilter('daily', f)).toBeNull();
    expect(validateFilter('daily', { ...f, date: '' })).toBe(MSG.dateRequired);
    expect(errorField('daily', { ...f, date: '' })).toBe('date');
  });
  it('월계표: 계정구분 필수 → 기간 필수 → 시작 ≤ 종료', () => {
    const m = { ...f, fundAccount: [A] };
    expect(validateFilter('monthly', m)).toBeNull();
    expect(errorField('monthly', f)).toBe('fund');
    expect(validateFilter('monthly', { ...m, to: '' })).toBe(MSG.periodRequired);
    expect(validateFilter('monthly', { ...m, from: '2026-11-01' })).toBe('시작일은 종료일보다 늦을 수 없습니다.');
    expect(errorField('monthly', { ...m, from: '2026-11-01' })).toBe('period');
  });
});

describe('집계 조건', () => {
  const src = demoLedger(TODAY);
  it('월계표는 첫 계정구분 하나로만 집계한다(전체로 새지 않게)', () => {
    const f = { ...defaultFilter(TODAY), fundAccount: [A, B] };
    expect(condOf('monthly', f).fundAccount).toBe(A);
    expect(condOf('daily', f).fundAccount).toEqual([A, B]);
    const ms = monthlyStatement(src.lines, condOf('monthly', f), f.from, f.to);
    expect(ms.total.debit).toBe(ms.total.credit);   // 계정구분 하나 안에서도 대차 일치
  });
  it('일계표 오늘 전표가 집계된다(E00 기본 조회가 비지 않음)', () => {
    const f = defaultFilter(TODAY);
    const ds = dailyStatement(src.lines, condOf('daily', { ...f, includeUnapproved: true }), TODAY);
    expect(ds.rows.length).toBeGreaterThan(0);
    expect(ds.total.debit).toBe(ds.total.credit);
  });
});

describe('[초기화] resetFilter — 현재 탭 칸만 기본값, 다른 탭 칸 보존(slide 12 ⑤)', () => {
  const base = defaultFilter(TODAY);
  const edited = { ...base, fundAccount: [A, B], date: '2026-03-03', from: '2026-02-01', to: '2026-05-31', includeUnapproved: true, includeAll: true, includeClosing: true };
  it('일계표 — 계정구분·기준일·플래그 기본, 월계표 기간(from/to) 보존', () => {
    expect(resetFilter(edited, 'daily', base)).toEqual({ ...base, from: '2026-02-01', to: '2026-05-31' });
  });
  it('월계표 — 계정구분 기본(첫 계정구분)·기간 기본·플래그 기본, 일계표 기준일(date) 보존', () => {
    expect(resetFilter(edited, 'monthly', base)).toEqual({ ...base, fundAccount: [A], date: '2026-03-03' });
  });
});
