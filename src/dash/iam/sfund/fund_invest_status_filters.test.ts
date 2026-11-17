/* 자펀드 투자실적현황 — 검색조건 재계산(2026-11-16 "미연동 필터 전부 동작").
   통계표라 행을 거르지 않고 수치를 다시 계산한다(crossRowsFor · yearDataFor).
   (a) 기본 상태 = 원문 상수 그대로(같은 참조 — 합계행 포함 바이트 단위 불변)
   (b) 조건마다 값을 바꾸면 수치가 실제로 바뀐다 · 몫의 합 = 원문(리프 칸) · 합계 = 표시 리프의 합 */
import { describe, it, expect } from 'vitest';
import { crossRowsFor, yearDataFor, STATUS_FILTER_DEFAULT } from './fund_invest_status';
import type { StatusFilter } from './fund_invest_status';
import { readSrc } from '../../test_src';

const F = (p: Partial<StatusFilter>): StatusFilter => ({ ...STATUS_FILTER_DEFAULT, ...p });
const VIEWS = ['경영형태별', '분야별', '산업별'] as const;
type Rec = Record<string, unknown>;
const leafKeys = (r: Rec) => Object.keys(r).filter((k) => /^c\d+$/.test(k));
const num = (r: Rec, k: string) => r[k] as number;
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const YEAR_LEAVES = ['inv1', 'inv2', 'inv3', 'inv4', 'inv5', 'fm1', 'fm2', 'iCnt', 'iAmt', 'rMo', 'rMi', 'gCh', 'gSg', 'gEt'];

describe('기본 상태(R0) — 원문 상수 그대로', () => {
  it.each(VIEWS)('크로스탭 %s: 빈 조건이면 같은 참조, 원문 2011년 건수 행 그대로', (v) => {
    const a = crossRowsFor(v, STATUS_FILTER_DEFAULT);
    expect(crossRowsFor(v, STATUS_FILTER_DEFAULT)).toBe(a);   // 모듈 상수(참조 고정)
    expect(a).toHaveLength(6);
  });
  it('경영형태별 2011 투자건수 = 목업 c11 그대로(합계 114)', () => {
    const r = crossRowsFor('경영형태별', STATUS_FILTER_DEFAULT)[0] as Rec;
    expect(leafKeys(r).map((k) => r[k])).toEqual([3, 0, 7, 4, 89, 3, 8]);
    expect(r.tot).toBe(114);
  });
  it('연도별: 빈 조건이면 원문 17행·원문 합계행(누적 null·원문 불일치 보존) 같은 참조', () => {
    const d = yearDataFor(STATUS_FILTER_DEFAULT);
    expect(yearDataFor(STATUS_FILTER_DEFAULT).rows).toBe(d.rows);
    expect(yearDataFor(STATUS_FILTER_DEFAULT).total).toBe(d.total);
    expect(d.rows).toHaveLength(17);
    const t = d.total as Rec;
    expect([t.inv0, t.fCnt, t.iCnt, t.iAmt, t.fCumCnt]).toEqual([159, 159, 1543, 18579 * 1e8, null]);
  });
  it('기본 기준을 명시해도(출자사업연도·운용사보고·빠지는 연도 없는 기준일자) 원문 그대로 — 합계행을 재합산하지 않는다', () => {
    const f = F({ yBase: '출자사업연도', dBase: '운용사보고', asOf: '2026-07-31' });
    const d0 = yearDataFor(STATUS_FILTER_DEFAULT), d = yearDataFor(f);
    expect(d.rows).toBe(d0.rows);
    expect(d.total).toBe(d0.total);   // 원문 합계 iAmt 18,579억 ≠ 행 합 18,578억(원문 그대로)
    for (const v of VIEWS) expect(crossRowsFor(v, f)).toBe(crossRowsFor(v, STATUS_FILTER_DEFAULT));
  });
});

describe('모펀드·계정구분 — 칸별 몫(몫의 합 = 원문 리프)', () => {
  it('모펀드: 농식품모태펀드 = 원문 그대로(목업 select 에 전체 없음 — 기본값) · MOAF 는 원문보다 작은 대안 데이터', () => {
    const f = F({ mf: '농식품모태펀드' });
    for (const v of VIEWS) expect(crossRowsFor(v, f)).toBe(crossRowsFor(v, STATUS_FILTER_DEFAULT));
    expect(yearDataFor(f).rows).toBe(yearDataFor(STATUS_FILTER_DEFAULT).rows);
    const m = yearDataFor(F({ mf: 'MOAF' }));
    expect(num(m.total as Rec, 'iCnt')).toBeGreaterThan(0);
    expect(num(m.total as Rec, 'iCnt')).toBeLessThan(num(yearDataFor(STATUS_FILTER_DEFAULT).total as Rec, 'iCnt'));
  });
  it.each([['acc', ['농식품', '수산']]] as const)('크로스탭 %s: 두 몫의 합 = 원문, 금액 = 건수 × 3.2억', (key, opts) => {
    for (const v of VIEWS) {
      const base = crossRowsFor(v, STATUS_FILTER_DEFAULT) as Rec[];
      const [a, b] = opts.map((o) => crossRowsFor(v, F({ [key]: o })) as Rec[]);
      base.forEach((r, i) => leafKeys(r).forEach((k) => expect(num(a[i], k) + num(b[i], k)).toBe(num(r, k))));
      a.filter((r) => r.metric === '투자금액').forEach((r) => {
        const cnt = a.find((x) => x.metric === '투자건수' && x.y === r.y)!;
        leafKeys(r).forEach((k) => expect(num(r, k)).toBe(num(cnt, k) * 320_000_000));
      });
      a.forEach((r) => expect(r.tot).toBe(sum(leafKeys(r).map((k) => num(r, k)))));
    }
  });
  it('연도별: 계정구분 두 몫의 합 = 원문 리프, 합계 열·누적·합계행은 몫 안에서 다시 합산', () => {
    const base = yearDataFor(STATUS_FILTER_DEFAULT).rows as Rec[];
    const [a, b] = ['농식품', '수산'].map((acc) => yearDataFor(F({ acc })));
    base.forEach((r, i) => YEAR_LEAVES.forEach((k) => expect(num(a.rows[i] as Rec, k) + num(b.rows[i] as Rec, k)).toBe(num(r, k))));
    const ra = a.rows as Rec[];
    ra.forEach((r) => expect(r.inv0).toBe(sum(['inv1', 'inv2', 'inv3', 'inv4', 'inv5'].map((k) => num(r, k)))));
    expect(ra[ra.length - 1].iCumCnt).toBe(sum(ra.map((r) => num(r, 'iCnt'))));
    expect((a.total as Rec).iAmt).toBe(sum(ra.map((r) => num(r, 'iAmt'))));
    expect((a.total as Rec).fCumAmt).toBeNull();
    expect(num(a.total as Rec, 'iCnt')).toBeGreaterThan(num(b.total as Rec, 'iCnt'));   // 다수 = 농식품
    expect(num(b.total as Rec, 'iCnt')).toBeGreaterThan(0);
  });
});

describe('연도기준 — 결성연도 1년 · 등록연도 2년 민다', () => {
  it('크로스탭 결성연도: 2012 행 = 원 2011 행 리프, 2011 행은 연 1.08배 역산(원문과 다름)', () => {
    const base = crossRowsFor('분야별', STATUS_FILTER_DEFAULT) as Rec[];
    const s = crossRowsFor('분야별', F({ yBase: '결성연도' })) as Rec[];
    expect(leafKeys(s[1]).map((k) => s[1][k])).toEqual(leafKeys(base[0]).map((k) => base[0][k]));
    expect(s[0]).not.toEqual(base[0]);
  });
  it('연도별 결성연도: 2010 행은 0, 2011 행 = 원 2010 리프 · 등록연도는 다르다', () => {
    const base = yearDataFor(STATUS_FILTER_DEFAULT).rows as Rec[];
    const a = yearDataFor(F({ yBase: '결성연도' })).rows as Rec[];
    const b = yearDataFor(F({ yBase: '등록연도' })).rows as Rec[];
    YEAR_LEAVES.forEach((k) => { expect(a[0][k]).toBe(0); expect(a[1][k]).toBe(base[0][k]); expect(b[2][k]).toBe(base[0][k]); });
    expect(b).not.toEqual(a);
  });
});

describe('데이터기준 월말확정 — 투자금액만 칸별 확정률, 건수 그대로', () => {
  it('크로스탭: 금액 행만 줄고 건수 행은 원문과 같다', () => {
    const base = crossRowsFor('산업별', STATUS_FILTER_DEFAULT) as Rec[];
    const s = crossRowsFor('산업별', F({ dBase: '월말확정' })) as Rec[];
    s.forEach((r, i) => {
      if (r.metric === '투자건수') expect(r).toEqual(base[i]);
      else leafKeys(r).forEach((k) => expect(num(r, k)).toBeLessThanOrEqual(num(base[i], k)));
    });
    expect(s.some((r, i) => r.metric === '투자금액' && r.tot !== base[i].tot)).toBe(true);
  });
  it('연도별: iAmt 만 바뀌고 결성·조성액·건수는 그대로', () => {
    const base = yearDataFor(STATUS_FILTER_DEFAULT).rows as Rec[];
    const s = yearDataFor(F({ dBase: '월말확정' })).rows as Rec[];
    YEAR_LEAVES.filter((k) => k !== 'iAmt').forEach((k) => s.forEach((r, i) => expect(r[k]).toBe(base[i][k])));
    expect(s.some((r, i) => r.iAmt !== base[i].iAmt)).toBe(true);
  });
});

describe('기준일자 — 그 연도 뒤 연도 행을 뺀다(조회 시점)', () => {
  it('크로스탭 2012-06-30 → 2011·2012 행만(건수·금액 각 2행)', () => {
    const s = crossRowsFor('경영형태별', F({ asOf: '2012-06-30' })) as Rec[];
    expect(s.map((r) => r.y)).toEqual([2011, 2012, 2011, 2012]);
  });
  it('연도별 2020-12-31 → 2010~2020 11행, 합계행 = 남은 행의 합', () => {
    const d = yearDataFor(F({ asOf: '2020-12-31' }));
    const rows = d.rows as Rec[];
    expect(rows.map((r) => r.y)).toEqual([2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020]);
    expect((d.total as Rec).fCnt).toBe(sum(rows.map((r) => num(r, 'fCnt'))));
    expect((d.total as Rec).fCnt).toBe(82);   // 원문 2020 누적 펀드수 82 와 같다
  });
  it('첫 해보다 이른 시점이면 0행', () => {
    expect(crossRowsFor('분야별', F({ asOf: '2010-12-31' }))).toHaveLength(0);
    expect(yearDataFor(F({ asOf: '2009-12-31' })).rows).toHaveLength(0);
  });
});

describe('화면 배선', () => {
  const src = readSrc('fund_invest_status.tsx');
  it('미연동 캡션·noop prop 이 남지 않는다', () => {
    expect(src).not.toContain('데이터 연동 후 적용');
    expect(src).not.toMatch(/\bnoop\b/);
  });
  it('5종 적용 칩 · 재계산 결과를 rowData·합계행·엑셀에 쓴다', () => {
    for (const l of ['모펀드', '계정구분', '연도기준', '데이터기준', '기준일자']) expect(src).toContain(`{ label: '${l}', value: `);
    expect(src).toContain('pinnedBottomRowData={isYearView ? yearPinned : undefined}');
    expect(src).toContain('[...rows, yearData.total]');
  });
});

describe('뷰 간 비율 일치(Codex P2 계열) — 같은 조건이면 크로스탭 3뷰 비율 ≈ 연도별 비율', () => {
  const tot = (rows: Rec[]) => sum(rows.filter((r) => r.metric === '투자건수').map((r) => num(r, 'tot')));
  it.each([[{ acc: '수산' }], [{ acc: '농식품' }], [{ mf: 'MOAF' }]] as const)('%o', (g) => {
    const yr = num(yearDataFor(F(g)).total as Rec, 'iCnt') / num(yearDataFor(STATUS_FILTER_DEFAULT).total as Rec, 'iCnt');
    for (const v of ['경영형태별', '분야별', '산업별'] as const) {
      const r = tot(crossRowsFor(v, F(g)) as Rec[]) / tot(crossRowsFor(v, STATUS_FILTER_DEFAULT) as Rec[]);
      expect(Math.abs(r - yr), v).toBeLessThan(0.01);   // 1%p 안(행별 반올림 차)
    }
  });
});
