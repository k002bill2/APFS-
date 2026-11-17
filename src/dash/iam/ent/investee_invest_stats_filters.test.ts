/* 투자실적현황(투자기업) — 검색조건 재계산(2026-11-16 "미연동 필터 전부 동작").
   집계표라 행을 거르지 않고 수치를 다시 계산한다(recomputeStats — investee_invest_stats_model.ts SSOT).
   (a) 기본 상태 = 원문 배열 그대로(같은 참조 — 합계 행 포함 바이트 단위 불변)
   (b) 조건마다 값을 바꾸면 수치가 실제로 바뀐다 · 몫의 합 = 원문(리프 칸) · 합계 = 표시 리프의 합 */
import { describe, it, expect } from 'vitest';
import {
  SALES_SCALE_ROWS, INVEST_TYPE_ROWS, REGION_ROWS, STATS_FILTER_DEFAULT,
  recomputeStats, recomputeMatrix, recomputeRegion,
} from './investee_invest_stats_model';
import type { MatrixRow, StatsFilter } from './investee_invest_stats_model';
import { readSrc, panelSrc } from '../../test_src';

const F = (p: Partial<StatsFilter>): StatsFilter => ({ ...STATS_FILTER_DEFAULT, ...p });
const isTotal = (r: MatrixRow) => r.label.replace(/\s/g, '') === '합계';
const yearRows = (rows: MatrixRow[], block: string) => rows.filter((r) => r.block === block && !isTotal(r));
const totalRow = (rows: MatrixRow[], block: string) => rows.find((r) => r.block === block && isTotal(r))!;
const leaves = (r: MatrixRow) => r.values.slice(0, -1) as number[];
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const last = <T,>(a: readonly T[]): T => a[a.length - 1];

describe('기본 상태(R0) — 원문 배열 그대로', () => {
  it('빈 조건이면 3표 모두 원문 상수와 같은 참조다', () => {
    const s = recomputeStats(STATS_FILTER_DEFAULT);
    expect(s.salesScale).toBe(SALES_SCALE_ROWS);
    expect(s.investType).toBe(INVEST_TYPE_ROWS);
    expect(s.region).toBe(REGION_ROWS);
  });
  it('기본 기준을 명시해도(출자사업년도·운용사보고·빠지는 연도 없는 기준일자) 원문 그대로 — 합계 행을 재합산하지 않는다', () => {
    const s = recomputeStats(F({ yBase: '출자사업년도', dBase: '운용사보고', asOf: '2026-07-31' }));
    expect(s.salesScale).toBe(SALES_SCALE_ROWS);
    expect(s.investType).toBe(INVEST_TYPE_ROWS);
    expect(s.region).toBe(REGION_ROWS);
    // 원문 매출액별 투자금액 합계 행은 한 칸 밀려 있다(원문 그대로) — 재합산하면 바뀌는 값
    expect(totalRow(SALES_SCALE_ROWS, '투자금액').values).toEqual([1389, 921, 1512, 4703, 6288, 3766, 18579]);
  });
});

describe('모펀드·계정구분 — 칸별 몫(몫의 합 = 원문 리프)', () => {
  it('모펀드: 농식품모태펀드 = 원문 그대로(목업 select 에 전체 없음 — 기본값) · MOAF 는 원문보다 작은 대안 데이터', () => {
    for (const src of [SALES_SCALE_ROWS, INVEST_TYPE_ROWS]) expect(recomputeMatrix(src, F({ mf: '농식품모태펀드' }))).toBe(src);
    expect(recomputeStats(F({ mf: '농식품모태펀드' })).region).toBe(REGION_ROWS);
    const moaf = recomputeMatrix(SALES_SCALE_ROWS, F({ mf: 'MOAF' }));
    const tot = (rows: MatrixRow[]) => last(totalRow(rows, '투자건수').values) as number;
    expect(tot(moaf)).toBeGreaterThan(0);
    expect(tot(moaf)).toBeLessThan(tot(SALES_SCALE_ROWS));
  });
  it.each([['계정구분', 'acc', ['농식품', '수산']]] as const)('%s: 두 선택지 몫의 합 = 원문 리프 칸', (_l, key, opts) => {
    for (const src of [SALES_SCALE_ROWS, INVEST_TYPE_ROWS]) {
      const [a, b] = opts.map((o) => recomputeMatrix(src, F({ [key]: o })));
      for (const block of ['투자건수', '투자금액']) {
        yearRows(src, block).forEach((r, i) => {
          const ra = yearRows(a, block)[i], rb = yearRows(b, block)[i];
          expect(leaves(ra).map((v, c) => v + leaves(rb)[c])).toEqual(leaves(r));
        });
      }
    }
  });
  it('다수 선택지(농식품모태펀드=원문·농식품)가 소수(MOAF·수산)보다 크다', () => {
    const tot = (f: StatsFilter) => last(totalRow(recomputeMatrix(SALES_SCALE_ROWS, f), '투자건수').values) as number;
    expect(tot(F({ mf: '농식품모태펀드' }))).toBeGreaterThan(tot(F({ mf: 'MOAF' })));
    expect(tot(F({ acc: '농식품' }))).toBeGreaterThan(tot(F({ acc: '수산' })));
    expect(tot(F({ mf: 'MOAF' }))).toBeGreaterThan(0);
    expect(tot(F({ acc: '수산' }))).toBeGreaterThan(0);
  });
  it('합계 열 = 행 리프 합, 합계 행 = 연도 행 합(재합산 일관)', () => {
    const rows = recomputeMatrix(INVEST_TYPE_ROWS, F({ mf: 'MOAF', acc: '수산' }));
    for (const block of ['투자건수', '투자금액']) {
      const yr = yearRows(rows, block);
      yr.forEach((r) => expect(last(r.values)).toBe(sum(leaves(r))));
      totalRow(rows, block).values.forEach((v, c) => expect(v).toBe(sum(yr.map((r) => r.values[c] as number))));
    }
  });
  it('소재지별도 칸별 몫 — 계정구분 두 선택지 건수 합 = 원문, 비율은 다시 계산', () => {
    const [a, b] = ['농식품', '수산'].map((acc) => recomputeRegion(F({ acc })));
    REGION_ROWS.slice(0, -1).forEach((r, i) => expect((a[i].values[0] as number) + (b[i].values[0] as number)).toBe(r.values[0]));
    expect(last(a).values[1]).toBe('100.0 %');
    expect(last(a).values[0]).toBe(sum(a.slice(0, -1).map((r) => r.values[0] as number)));
    expect(a[0].values[1]).toMatch(/^\d+(\.\d)? %$/);
  });
});

describe('연도기준 — 결성연도 1년 · 등록연도 2년 민다', () => {
  it('결성연도: 2011년 행 = 원 2010년 리프, 첫 해는 0', () => {
    const rows = recomputeMatrix(SALES_SCALE_ROWS, F({ yBase: '결성연도' }));
    const yr = yearRows(rows, '투자건수'), src = yearRows(SALES_SCALE_ROWS, '투자건수');
    expect(leaves(yr[0])).toEqual([0, 0, 0, 0, 0, 0]);
    expect(leaves(yr[1])).toEqual(leaves(src[0]));
    expect(yr[1].label).toBe('2011년');
  });
  it('등록연도는 결성연도와 다르다(2년)', () => {
    const a = recomputeMatrix(SALES_SCALE_ROWS, F({ yBase: '결성연도' }));
    const b = recomputeMatrix(SALES_SCALE_ROWS, F({ yBase: '등록연도' }));
    expect(leaves(yearRows(b, '투자건수')[2])).toEqual(leaves(yearRows(SALES_SCALE_ROWS, '투자건수')[0]));
    expect(b).not.toEqual(a);
  });
  it('소재지별은 매출액별 합계 비율로 줄어든다', () => {
    const r = recomputeRegion(F({ yBase: '결성연도' }));
    expect(last(r).values[0] as number).toBeLessThan(last(REGION_ROWS).values[0] as number);
  });
});

describe('데이터기준 월말확정 — 투자금액만 칸별 확정률, 건수 그대로', () => {
  it('투자금액 블록은 줄고 투자건수 블록은 원문과 같다', () => {
    const rows = recomputeMatrix(SALES_SCALE_ROWS, F({ dBase: '월말확정' }));
    yearRows(rows, '투자건수').forEach((r, i) => expect(r.values).toEqual(yearRows(SALES_SCALE_ROWS, '투자건수')[i].values));
    const amt = yearRows(rows, '투자금액'), src = yearRows(SALES_SCALE_ROWS, '투자금액');
    amt.forEach((r, i) => leaves(r).forEach((v, c) => expect(v).toBeLessThanOrEqual(leaves(src[i])[c])));
    expect(sum(amt.map((r) => last(r.values) as number))).toBeLessThan(sum(src.map((r) => sum(leaves(r)))));
  });
  it('소재지별 금액도 바뀌고 건수는 그대로', () => {
    const r = recomputeRegion(F({ dBase: '월말확정' }));
    REGION_ROWS.slice(0, -1).forEach((o, i) => expect(r[i].values[0]).toBe(o.values[0]));
    expect(r.slice(0, -1).some((x, i) => x.values[2] !== REGION_ROWS[i].values[2])).toBe(true);
  });
});

describe('기준일자 — 그 연도 뒤 연도 행을 뺀다(조회 시점)', () => {
  it('2015-06-30 → 2010~2015년 6행 + 합계, 합계는 남은 행의 합', () => {
    const rows = recomputeMatrix(SALES_SCALE_ROWS, F({ asOf: '2015-06-30' }));
    const yr = yearRows(rows, '투자건수');
    expect(yr.map((r) => r.label)).toEqual(['2010년', '2011년', '2012년', '2013년', '2014년', '2015년']);
    expect(last(totalRow(rows, '투자건수').values)).toBe(41 + 73 + 74 + 67 + 100 + 75);
  });
  it('첫 해보다 이른 시점이면 연도 행 0 · 합계 0', () => {
    const rows = recomputeMatrix(INVEST_TYPE_ROWS, F({ asOf: '2009-12-31' }));
    expect(yearRows(rows, '투자건수')).toHaveLength(0);
    expect(totalRow(rows, '투자건수').values.every((v) => v === 0)).toBe(true);
  });
  it('소재지별은 매출액별 시점 반영 비율로 줄어든다', () => {
    const r = recomputeRegion(F({ asOf: '2015-06-30' }));
    expect(last(r).values[0] as number).toBeLessThan(1543);
    expect(r).toHaveLength(REGION_ROWS.length);
  });
});

describe('화면 배선', () => {
  const src = readSrc('investee_invest_stats.tsx');
  it('5종은 noop 칸(툴팁 데이터 연동 후 적용)이 아니고 판단 보류(건수기준)만 남는다', () => {
    const noopFields = [...panelSrc(src).matchAll(/<Panel\w+ label="([^"]+)"[^>]*\bnoop\b/g)].map((m) => m[1]);
    expect(noopFields).toEqual(['건수기준']);
  });
  it('수치를 바꾸는 5종은 적용 칩을 단다(건수기준은 없음)', () => {
    for (const l of ['모펀드', '계정구분', '연도기준', '데이터기준', '기준일자']) expect(src).toContain(`{ label: '${l}', value: `);
    expect(src).not.toContain("{ label: '건수기준', value: ");
  });
  it('표·엑셀이 재계산 결과(stats)를 쓴다 — 원문 상수를 직접 그리지 않는다', () => {
    expect(src).toContain('recomputeStats(');
    expect(src).toContain('<RegionTable rows={stats.region}');
    expect(src).not.toMatch(/REGION_ROWS\.map\(/);
  });
});

describe('두 표의 모집단 일치(Codex P2) — 같은 검색조건이면 소재지별 건수 합계 = 매출액별 건수 합계', () => {
  const salesCount = (rows: MatrixRow[]) => sum(yearRows(rows, '투자건수').map((r) => sum(leaves(r))));
  const regionCount = (f: StatsFilter) => sum(recomputeRegion(f).filter((r) => r.region !== '합계').map((r) => r.values[0] as number));
  it.each([
    ['계정구분 농식품', F({ acc: '농식품' })], ['계정구분 수산', F({ acc: '수산' })],
    ['모펀드 MOAF', F({ mf: 'MOAF' })], ['연도기준 결성연도', F({ yBase: '결성연도' })],
    ['기준일자 2020-12-31', F({ asOf: '2020-12-31' })], ['수산 + 월말확정', F({ acc: '수산', dBase: '월말확정' })],
  ] as const)('%s', (_, f) => {
    expect(regionCount(f)).toBe(salesCount(recomputeMatrix(SALES_SCALE_ROWS, f)));
  });
  it('계정구분 몫의 합 = 전체(소재지 각 칸)', () => {
    const regs = (f: StatsFilter) => recomputeRegion(f).filter((r) => r.region !== '합계');
    const a = regs(F({ acc: '농식품' })), b = regs(F({ acc: '수산' }));
    const orig = REGION_ROWS.filter((r) => r.region !== '합계');
    expect(sum(a.map((r, i) => (r.values[0] as number) + (b[i].values[0] as number)))).toBe(sum(orig.map((r) => r.values[0] as number)));
  });
});

describe('소재지 칸 상보성(Codex P2) — 계정구분·모펀드 몫을 더하면 칸마다 원래 값', () => {
  const regs = (f: StatsFilter) => recomputeRegion(f).filter((r) => r.region !== '합계');
  const orig = REGION_ROWS.filter((r) => r.region !== '합계');
  it.each([
    ['계정구분', 'acc', '농식품', '수산'],
  ] as const)('%s — 칸마다 첫 몫 + 나머지 몫 = 원문(건수·금액)', (_, key, a, b) => {
    const A = regs(F({ [key]: a })), B = regs(F({ [key]: b }));
    orig.forEach((r, i) => {
      expect((A[i].values[0] as number) + (B[i].values[0] as number), `${r.region} 건수`).toBe(r.values[0]);
      expect((A[i].values[2] as number) + (B[i].values[2] as number), `${r.region} 금액`).toBe(r.values[2]);
      expect(A[i].values[0] as number).toBeGreaterThanOrEqual(0);
      expect(B[i].values[0] as number).toBeGreaterThanOrEqual(0);
    });
  });
  it('연도기준을 함께 걸어도 계정구분 몫의 합 = 같은 연도기준의 전체', () => {
    const all = regs(F({ yBase: '결성연도' })), A = regs(F({ yBase: '결성연도', acc: '농식품' })), B = regs(F({ yBase: '결성연도', acc: '수산' }));
    all.forEach((r, i) => expect((A[i].values[0] as number) + (B[i].values[0] as number), r.region).toBe(r.values[0]));
  });
});

describe('투자유형별 ↔ 매출액별 비율 일치 · 용량 재배분(Codex P2)', () => {
  const count = (rows: MatrixRow[]) => sum(yearRows(rows, '투자건수').map((r) => sum(leaves(r))));
  const typeRatio = count(INVEST_TYPE_ROWS) / count(SALES_SCALE_ROWS);   // 원문부터 모집단이 다르다(1,662 / 1,543)
  it.each([
    ['수산', F({ acc: '수산' })], ['농식품', F({ acc: '농식품' })], ['MOAF', F({ mf: 'MOAF' })],
    ['결성연도 + 수산', F({ yBase: '결성연도', acc: '수산' })],
  ] as const)('%s — 투자유형별 건수 비율 ≈ 매출액별(행별 반올림 차 ≤ 연도 수)', (_, f) => {
    const s = recomputeStats(f);
    expect(Math.abs(count(s.investType) - count(s.salesScale) * typeRatio)).toBeLessThanOrEqual(16);
  });
  it('투자유형별 칸마다 계정구분 몫의 합 = 원문', () => {
    const A = recomputeStats(F({ acc: '농식품' })).investType, B = recomputeStats(F({ acc: '수산' })).investType;
    yearRows(INVEST_TYPE_ROWS, '투자건수').forEach((r, i) => leaves(r).forEach((v, c) => {
      expect(leaves(yearRows(A, '투자건수')[i])[c] + leaves(yearRows(B, '투자건수')[i])[c], `${r.label} ${c}`).toBe(v);
    }));
  });
  it('MOAF + 농식품 + 기준일자 2012-12-31 — 소재지별 건수 합계 = 매출액별(용량에 걸린 몫을 버리지 않는다)', () => {
    const f = F({ mf: 'MOAF', acc: '농식품', asOf: '2012-12-31' });
    const s = recomputeStats(f);
    const region = sum(s.region.filter((r) => r.region !== '합계').map((r) => r.values[0] as number));
    expect(region).toBe(count(s.salesScale));
  });
});
