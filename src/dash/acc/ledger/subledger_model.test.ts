/* 계정별보조부(ACC-010) 화면 조건 → 공용 모델 매핑 회귀 가드 */
import { describe, it, expect } from 'vitest';
import { demoLedger } from './ledger_data';
import { SUBLEDGER_DEFAULT, condOf, queryOf, subledgerRows, slipNoOf, validateFilter } from './subledger_model';
import type { SubledgerFilter } from './subledger_model';

const src = demoLedger('2026-11-02');
const F = (p: Partial<SubledgerFilter>): SubledgerFilter => ({ ...SUBLEDGER_DEFAULT, ...p });

describe('기본값(slide 11 ②)', () => {
  it('계정구분 전체 · 기간 없음 · 작성계정과목만 여 · 미결재포함 부', () => {
    expect(SUBLEDGER_DEFAULT).toMatchObject({ fundAccount: '', from: '', to: '', writtenOnly: true, includeUnapproved: false });
    expect(condOf(SUBLEDGER_DEFAULT)).toMatchObject({ fundAccount: '', includeUnapproved: false, includeClosing: true });
    expect(queryOf(SUBLEDGER_DEFAULT).writtenOnly).toBe(true);
  });
  it('E00 — 기본 조건으로 행이 있고 계정마다 [전잔] → 명세 → [소계] 순', () => {
    const rows = subledgerRows(src.lines, SUBLEDGER_DEFAULT);
    expect(rows.some((r) => r.kind === 'entry')).toBe(true);
    expect(rows[0].kind).toBe('opening');
    expect(rows[rows.length - 1].kind).toBe('subtotal');
    expect(rows[0].accountName.startsWith('[전잔] ')).toBe(true);
  });
});

describe('조건별 적용 범위(slide 11 ③)', () => {
  const period = { from: '2026-10-01', to: '2026-10-31' };
  const base = subledgerRows(src.lines, F({ ...period, writtenOnly: false }));
  const opening = (rows: ReturnType<typeof subledgerRows>, code: string) => rows.find((r) => r.kind === 'opening' && r.code === code)?.balance;
  const entry = base.find((r) => r.kind === 'entry')!;

  it.each([
    ['writer', entry.line!.writer],
    ['partner', entry.line!.partner],
    ['memo', entry.line!.memo.slice(0, 2)],
  ] as const)('%s 필터 — 명세만 줄고 전잔 불변', (k, v) => {
    const rows = subledgerRows(src.lines, F({ ...period, writtenOnly: false, [k]: v }));
    expect(opening(rows, entry.code)).toBe(opening(base, entry.code));
    const e = rows.filter((r) => r.kind === 'entry' && r.code === entry.code);
    expect(e.length).toBeGreaterThan(0);
    expect(e.length).toBeLessThanOrEqual(base.filter((r) => r.kind === 'entry' && r.code === entry.code).length);
    expect(e.every((r) => (r.line![k] as string).includes(v))).toBe(true);
  });
  it('계정과목 필터 — 그 계정 그룹만', () => {
    const rows = subledgerRows(src.lines, F({ ...period, account: entry.code }));
    expect(new Set(rows.map((r) => r.code))).toEqual(new Set([entry.code]));
  });
  it('기간 시작일 = 전잔 기준점 — 시작일 이전 누계', () => {
    const later = subledgerRows(src.lines, F({ from: '2026-11-01', to: '2026-11-30', writtenOnly: false, account: entry.code }));
    const oct = base.filter((r) => r.code === entry.code);
    expect(opening(later, entry.code)).toBe(oct[oct.length - 1].balance);   // 10월 소계 잔액 = 11월 전잔
  });
  it('누적잔액 — 마지막 명세 잔액 = [소계] 잔액', () => {
    const g = base.filter((r) => r.code === entry.code);
    const entries = g.filter((r) => r.kind === 'entry');
    expect(g[g.length - 1].balance).toBe(entries[entries.length - 1].balance);
  });
  it('작성계정과목만 여 — 기간 안 명세 없는 계정 제외', () => {
    const rows = subledgerRows(src.lines, F(period));
    const codes = new Set(rows.map((r) => r.code));
    for (const c of codes) expect(rows.some((r) => r.code === c && r.kind === 'entry')).toBe(true);
  });
});

describe('E03 · E01', () => {
  it('[전잔]·[소계] 행은 전표상세로 가지 않는다', () => {
    const rows = subledgerRows(src.lines, SUBLEDGER_DEFAULT);
    expect(slipNoOf(rows.find((r) => r.kind === 'opening'))).toBeNull();
    expect(slipNoOf(rows.find((r) => r.kind === 'subtotal'))).toBeNull();
    const e = rows.find((r) => r.kind === 'entry')!;
    expect(slipNoOf(e)).toBe(e.line!.slipNo);
    expect(src.bySlipNo.has(slipNoOf(e)!)).toBe(true);
  });
  it('기간 시작 > 종료 → 설계서 문구', () => {
    expect(validateFilter(F({ from: '2026-10-31', to: '2026-10-01' }))).toBe('시작일은 종료일보다 늦을 수 없습니다.');
    expect(validateFilter(F({ from: '2026-10-01', to: '2026-10-31' }))).toBeNull();
    expect(validateFilter(F({ from: '2026-10-01' }))).toBeNull();
  });
});
