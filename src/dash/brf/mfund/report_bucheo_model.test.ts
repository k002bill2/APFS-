import { describe, it, expect } from 'vitest';
import { computeTotal } from '../../risk_table_meta';
import type { Row } from '../../risk_table_meta';
import { YEARLY_TABLES, YEARLY_BASE_YM, YEARLY_TOTALS_LIT, BASES, ACCOUNT_TYPES } from '../brief_data';
import { yearlyRows, susanFunds, YEARLY_AMOUNT_KEYS } from './report_bucheo_model';

/* 연도별투자현황 — 기준월·계정구분 재계산(2026-11-16 "미연동 필터 전부 동작", 종전 no-op) */

const M = 1e6;
const totalOf = (basis: (typeof BASES)[number], rows: Row[]) => computeTotal({ ...YEARLY_TABLES[basis], rows })!;

describe('기본 상태 = 원문 그대로(R0)', () => {
  it.each(BASES)('%s: 기준월 원문·계정구분 전체 → 원문 행·합계', (basis) => {
    const rows = yearlyRows(YEARLY_TABLES[basis].rows, '', YEARLY_BASE_YM);
    expect(rows).toEqual(YEARLY_TABLES[basis].rows);
    const t = totalOf(basis, rows);
    expect([t.c, t.ct, t.b2, t.mul]).toEqual([YEARLY_TOTALS_LIT.c, YEARLY_TOTALS_LIT.ct * M, YEARLY_TOTALS_LIT.b2 * M, YEARLY_TOTALS_LIT.mul]);
  });
  it('기준월을 비우면(칩 ×) 전 행', () => {
    expect(yearlyRows(YEARLY_TABLES['선정년도'].rows, '', '')).toHaveLength(YEARLY_TABLES['선정년도'].rows.length);
  });
});

describe('기준월 — 기준월 연도보다 뒤인 연도 행 제외', () => {
  it('선정년도 2012-12 → 2011·2012 만, 합계도 줄어든다', () => {
    const rows = yearlyRows(YEARLY_TABLES['선정년도'].rows, '', '2012-12');
    expect(rows.map((r) => r.y)).toEqual(['2011', '2012']);
    expect(totalOf('선정년도', rows).c).toBe(4);
  });
  it('결성년도 2013-01 → 2012·2013(같은 해는 포함)', () => {
    expect(yearlyRows(YEARLY_TABLES['결성년도'].rows, '', '2013-01').map((r) => r.y)).toEqual(['2012', '2013']);
  });
  it('첫 연도보다 이르면 0건', () => {
    expect(yearlyRows(YEARLY_TABLES['선정년도'].rows, '', '2010-12')).toEqual([]);
  });
});

describe('계정구분 — 연도 행마다 농식품/수산 몫(합 = 원문)', () => {
  it.each(BASES)('%s: 칸마다 농식품 몫 + 수산 몫 = 원문 값(조합수·금액 9칸)', (basis) => {
    const [na, sa] = ACCOUNT_TYPES.map((acc) => yearlyRows(YEARLY_TABLES[basis].rows, acc, YEARLY_BASE_YM));
    for (const r of YEARLY_TABLES[basis].rows) {
      const [a, b] = [na, sa].map((rows) => rows.find((x) => x.y === r.y) ?? null);   // 몫 0 인 연도 행은 빠진다
      const val = (x: Row | null, k: string) => (x ? Number(x[k]) : 0);
      expect(val(a, 'c') + val(b, 'c'), `${r.id}.c`).toBe(r.c);
      for (const k of YEARLY_AMOUNT_KEYS) {
        expect(val(a, k) + val(b, k), `${r.id}.${k}`).toBe(r[k]);
        expect(val(b, k) % M, `${r.id}.${k} 백만원 단위`).toBe(0);
      }
    }
  });
  it.each(BASES)('%s: 수산은 소수 · 두 조회기준의 수산 조합수 합이 같다', (basis) => {
    const susan = yearlyRows(YEARLY_TABLES[basis].rows, '수산', YEARLY_BASE_YM);
    const nong = yearlyRows(YEARLY_TABLES[basis].rows, '농식품', YEARLY_BASE_YM);
    const sc = totalOf(basis, susan).c as number;
    const nc = totalOf(basis, nong).c as number;
    expect(sc + nc).toBe(YEARLY_TOTALS_LIT.c);
    expect(sc).toBeLessThan(nc);
    expect(sc).toBe(susanFunds(YEARLY_TOTALS_LIT.c));   // 표 전체 총량부터 — 반올림(11 × 0.3) = 3
    expect(sc).toBe(3);
  });
  it('조합수 몫이 0 인 연도는 뺀다(선정년도 2011 = 조합 1개 → 수산 0)', () => {
    const susan = yearlyRows(YEARLY_TABLES['선정년도'].rows, '수산', YEARLY_BASE_YM);
    expect(susan.map((r) => r.y)).toEqual(['2012', '2013', '2014']);
    expect(susan.every((r) => Number(r.c) > 0)).toBe(true);
  });
  it('투자배수는 몫의 (B1+B2+C)/A 로 다시 계산 · 합계도 몫 기준으로 바뀐다', () => {
    const nong = yearlyRows(YEARLY_TABLES['선정년도'].rows, '농식품', YEARLY_BASE_YM);
    for (const r of nong) {
      const a = Number(r.a);
      expect(r.mul).toBe(a ? ((Number(r.b1) + Number(r.b2) + Number(r.cc)) / a).toFixed(2) : '-');
    }
    const t = totalOf('선정년도', nong);
    expect(t.ct).not.toBe(YEARLY_TOTALS_LIT.ct * M);
    expect(t.c).toBe(8);
  });
  it('기준월과 계정구분은 함께 걸린다', () => {
    const rows = yearlyRows(YEARLY_TABLES['선정년도'].rows, '수산', '2013-06');
    expect(rows.map((r) => r.y)).toEqual(['2012', '2013']);
  });
  it('원문 행을 바꾸지 않는다(불변)', () => {
    const before = JSON.stringify(YEARLY_TABLES['선정년도'].rows);
    yearlyRows(YEARLY_TABLES['선정년도'].rows, '농식품', '2013-01');
    expect(JSON.stringify(YEARLY_TABLES['선정년도'].rows)).toBe(before);
  });
});

describe('두 조회기준의 수산 합계가 같다(같은 조합을 다른 연도로 묶은 표 — 2026-11-16 보강)', () => {
  it('조합수·금액 9칸 모두 선정년도 합계 = 결성년도 합계', () => {
    const tot = (basis: (typeof BASES)[number]) => totalOf(basis, yearlyRows(YEARLY_TABLES[basis].rows, '수산', YEARLY_BASE_YM));
    const a = tot('선정년도'), b = tot('결성년도');
    expect(a.c).toBe(b.c);
    for (const k of YEARLY_AMOUNT_KEYS) expect(a[k], k).toBe(b[k]);
  });
});
