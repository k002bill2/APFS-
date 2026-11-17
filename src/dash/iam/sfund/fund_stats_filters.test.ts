/* 종합통계(확정) — 상세필터 4종 동작(2026-11-16 "미연동 필터 전부 동작").
   모펀드·계정구분 = 조합 행 숨은 속성(mfOf·accOf) · 기준일자 = 연도 ≤ 시점 · 데이터기준 월말확정 = 투자·회수금액 확정률.
   (a) 기본 상태 = 원문 상수 그대로(같은 참조 — 원문 소계·총계 바이트 단위 불변)
   (b) 조건마다 행·소계·총계가 실제로 바뀐다 · 소계·총계 = 표시 행의 합 */
import { describe, it, expect } from 'vitest';
import { statRowsFor, mfOf, accOf, FUND_STATS_FILTER_DEFAULT } from './fund_stats';
import type { FundStatsFilter, StatRow } from './fund_stats';
import { RAW, SUBTOTALS, GRAND } from './fund_stats_data';
import { readSrc } from '../../test_src';

const F = (p: Partial<FundStatsFilter>): FundStatsFilter => ({ ...FUND_STATS_FILTER_DEFAULT, ...p });
const SUM_KEYS = ['form', 'gov', 'cAf', 'cNaf', 'cDuty', 'cUnder', 'afInv', 'nafInv', 'recPrin', 'recProf'] as const;
const sumOf = (rows: StatRow[], k: (typeof SUM_KEYS)[number]) => rows.reduce((a, r) => a + (r[k] as number), 0);

describe('기본 상태(R0) — 원문 상수 그대로', () => {
  it('빈 조건이면 같은 참조 · 137행 + 소계 16 = 153 표시행 · 총계 = 원문 GRAND', () => {
    const s = statRowsFor(FUND_STATS_FILTER_DEFAULT);
    expect(statRowsFor(FUND_STATS_FILTER_DEFAULT).display).toBe(s.display);
    expect(s.rows).toHaveLength(137);
    expect(s.display).toHaveLength(153);
    expect([s.grand.form, s.grand.gov, s.grand.cAf, s.grand.afInv, s.grand.recProf]).toEqual([GRAND.form, GRAND.gov, GRAND.af, GRAND.afinv, GRAND.recProf]);
    const sub11 = s.display.find((r) => r.id === 'sub-2011')!;
    expect(sub11.cDuty).toBe(SUBTOTALS[2011].duty);   // 원문 소계 77(행 합 84 와 다르다 — 원문 그대로)
  });
  it('기본 기준을 명시해도(운용사보고 · 빠지는 연도 없는 기준일자) 원문 그대로 — 소계를 재합산하지 않는다', () => {
    const s0 = statRowsFor(FUND_STATS_FILTER_DEFAULT);
    const s = statRowsFor(F({ dBase: '운용사보고', asOf: '2026-07-31' }));
    expect(s.display).toBe(s0.display);
    expect(s.grand).toBe(s0.grand);
  });
});

describe('모펀드·계정구분 — 숨은 행 속성으로 조합을 거른다', () => {
  it('분포: MOAF 공동출자 17 · 수산 20 · 농식품모태펀드 = 원문 137 전부(목업 select 에 전체 없음 — 기본값), 계정구분 두 몫의 행 합 = 137', () => {
    const nos = RAW.map((a) => a[0]);
    expect(nos.filter((n) => mfOf(n) === 'MOAF')).toHaveLength(17);
    expect(nos.filter((n) => accOf(n) === '수산')).toHaveLength(20);
    expect(statRowsFor(F({ mf: '농식품모태펀드' })).rows).toHaveLength(137);
    expect(statRowsFor(F({ mf: 'MOAF' })).rows).toHaveLength(17);
    const d0 = statRowsFor(F({})), d1 = statRowsFor(F({ mf: '농식품모태펀드' }));   // 기본값(농식품모태펀드) = 원문 표시 행 그대로(R0)
    expect(d1.display).toBe(d0.display);
    expect(d1.grand).toBe(d0.grand);
    expect(statRowsFor(F({ acc: '농식품' })).rows.length + statRowsFor(F({ acc: '수산' })).rows.length).toBe(137);
  });
  it('MOAF: 그 조합만 남고, 소계 = 그 해 표시 행의 합 · 총계 = 표시 행의 합', () => {
    const s = statRowsFor(F({ mf: 'MOAF' }));
    expect(s.rows.every((r) => mfOf(r.no!) === 'MOAF')).toBe(true);
    for (const sub of s.display.filter((r) => r.kind === 'subtotal')) {
      const yr = s.rows.filter((r) => r.y === sub.y);
      expect(yr.length).toBeGreaterThan(0);
      for (const k of SUM_KEYS) expect(sub[k]).toBe(sumOf(yr, k));
    }
    for (const k of SUM_KEYS) expect(s.grand[k]).toBe(sumOf(s.rows, k));
    expect(s.grand.form).toBeLessThan(GRAND.form);
  });
  it('통과 행이 없는 연도는 소계 행도 없다', () => {
    const s = statRowsFor(F({ mf: 'MOAF', acc: '수산' }));
    const years = new Set(s.rows.map((r) => r.y));
    expect(s.display.filter((r) => r.kind === 'subtotal').map((r) => r.y)).toEqual([...years]);
  });
});

describe('기준일자 — 그 연도 뒤 조합을 뺀다(조회 시점)', () => {
  it('2015-06-30 → 2011~2015 조합 36행 · 소계 5', () => {
    const s = statRowsFor(F({ asOf: '2015-06-30' }));
    expect(s.rows).toHaveLength(36);
    expect(s.rows.every((r) => r.y <= 2015)).toBe(true);
    expect(s.display.filter((r) => r.kind === 'subtotal')).toHaveLength(5);
  });
  it('첫 해보다 이른 시점이면 0행 · 총계 0', () => {
    const s = statRowsFor(F({ asOf: '2010-12-31' }));
    expect(s.display).toHaveLength(0);
    expect(s.grand.form).toBe(0);
  });
});

describe('데이터기준 월말확정 — 투자·회수 금액만 확정률, 결성액·건수 그대로', () => {
  it('행 수 그대로 · 결성액·건수 불변 · 투자금액 합은 줄어든다', () => {
    const s0 = statRowsFor(FUND_STATS_FILTER_DEFAULT), s = statRowsFor(F({ dBase: '월말확정' }));
    expect(s.rows).toHaveLength(137);
    s.rows.forEach((r, i) => {
      expect([r.form, r.gov, r.cAf, r.cNaf, r.cDuty, r.cUnder]).toEqual([s0.rows[i].form, s0.rows[i].gov, s0.rows[i].cAf, s0.rows[i].cNaf, s0.rows[i].cDuty, s0.rows[i].cUnder]);
    });
    expect(sumOf(s.rows, 'afInv')).toBeLessThan(sumOf(s0.rows, 'afInv'));
    expect(s.grand.afInv).toBe(sumOf(s.rows, 'afInv'));
    expect(s.grand.totInv).toBe(s.grand.afInv + s.grand.nafInv);   // 파생값도 다시 계산(calc)
  });
});

describe('화면 배선', () => {
  const src = readSrc('fund_stats.tsx');
  it('미연동 캡션·noop prop 이 남지 않는다', () => {
    expect(src).not.toContain('데이터 연동 후 적용');
    expect(src).not.toMatch(/\bnoop\b/);
  });
  it('4종 적용 칩 · 표시 행·총계·엑셀·푸터가 statRowsFor 결과를 쓴다', () => {
    for (const l of ['모펀드', '계정구분', '데이터기준', '기준일자']) expect(src).toContain(`{ label: '${l}', value: `);
    expect(src).toContain('rowData={stats.display}');
    expect(src).toContain('pinnedBottomRowData={pinnedBottom}');
    expect(src).toContain('[...stats.display, stats.grand]');
    expect(src).toContain("String(stats.rows.length)");
  });
});
