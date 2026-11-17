/* 전체 투자실적 — 계정구분·통계기준·기준일자가 실제로 거른다(2026-11-16 "미연동 필터 전부 동작").
   · 계정구분 → acctType · 통계기준 → statBasis(선택지 1개 — 키만 배선) · 기준일자 → firstInvestDate 조회 시점(asOf, 셀 ≤ 값)
   · 데이터기준 → dataBasis(2026-11-17 사용자 결정) — sample 2행째 = 월말확정 변형 더미(투자·회수 금액 × 0.98). */
import { describe, it, expect } from 'vitest';
import { resolveSchema } from '../../schemas/index';
import { resolveFilterField, filterValueMatches, defaultFilterValues } from '../../schemas/filter_field';
import { computeSchemaTotal } from '../../schemas/totals';
import type { PageSchema } from '../../schemas/types';

const sc: PageSchema = resolveSchema('invest-performance-all');
const passes = (row: Record<string, unknown>, fv: Record<string, string>) =>
  Object.entries(fv).every(([label, v]) => {
    const ff = resolveFilterField(label, sc);
    return !v || !ff.columnKey || filterValueMatches(ff, v, row[ff.columnKey]);
  });
/* 데이터기준은 '전체'가 없어 화면에서 비울 수 없다 — 지정하지 않은 조회는 기본값(운용사보고)으로 본다 */
const rows = (fv: Record<string, string>) => (sc.sample ?? []).filter((r) => passes(r, { 데이터기준: '운용사보고', ...fv }));

describe('전체 투자실적 — 상세필터 연동', () => {
  it('레지스트리 경로에서 기준일자가 asOf(셀 ≤ 값)로 해석된다 — mode 가 떨어지면 정확일치라 기본 상태가 0건이 된다', () => {
    const d = resolveFilterField('기준일자', sc);
    expect(d.kind).toBe('date');
    expect(d.columnKey).toBe('firstInvestDate');
    expect(d.asOf).toBe(true);
  });

  it('기본 상태(통계기준 자펀드기준 · 데이터기준 운용사보고 · 기준일자 2026-07-31)는 1건·합계 행 그대로', () => {
    const fv = defaultFilterValues(sc);
    expect(fv).toEqual({ 통계기준: '자펀드기준', 데이터기준: '운용사보고', 기준일자: '2026-07-31' });
    const shown = rows(fv);
    expect(shown).toHaveLength(1);
    const t = computeSchemaTotal(sc, shown)!;
    expect([t.no, t.seqNo, t.investAmt, t.recoverTotal]).toEqual(['합계 1건', 2, 5_000_000_000, 7_500_000_000]);
  });

  it('계정구분: 농식품 = 1건, 수산 = 0건(원문 1행이 농식품 자펀드)', () => {
    expect(resolveFilterField('계정구분', sc).columnKey).toBe('acctType');
    expect(rows({ 계정구분: '농식품' })).toHaveLength(1);
    expect(rows({ 계정구분: '수산' })).toHaveLength(0);
    expect(computeSchemaTotal(sc, rows({ 계정구분: '수산' }))!.no).toBe('합계 0건');
  });

  it('통계기준: 선택지 1개(자펀드기준) — 키만 배선(전 행이 그 값)', () => {
    const ff = resolveFilterField('통계기준', sc);
    expect(ff.columnKey).toBe('statBasis');
    expect(ff.options).toEqual(['자펀드기준']);
    expect(rows({ 통계기준: '자펀드기준' })).toHaveLength(1);
  });

  it('기준일자: 최초 투자일자(2011-10-25) 이전 시점을 고르면 0건, 같은 날부터 1건', () => {
    expect(rows({ 기준일자: '2011-10-24' })).toHaveLength(0);
    expect(rows({ 기준일자: '2011-10-25' })).toHaveLength(1);
    expect(rows({ 기준일자: '2020-01-01' })).toHaveLength(1);
  });

  it('데이터기준: 운용사보고 = 원문 1행, 월말확정 = 변형 1행(투자·회수 금액 × 0.98, 결성액 그대로)', () => {
    const ff = resolveFilterField('데이터기준', sc);
    expect(ff.columnKey).toBe('dataBasis');
    expect(ff.allLabel).toBeNull();                       // '전체' 없음 — 두 기준이 한 표에 섞이지 않는다
    const [rep] = rows({ 데이터기준: '운용사보고' });
    const conf = rows({ 데이터기준: '월말확정' });
    expect(conf).toHaveLength(1);
    const [c] = conf;
    expect(c.investee).toBe(rep.investee);
    expect(c.fundAmount).toBe(rep.fundAmount);
    for (const k of ['investAmt', 'recoverPrincipal', 'recoverProfit', 'recoverTotal'] as const) {
      expect(c[k]).toBe(Math.round(Number(rep[k]) * 0.98));
    }
    expect(Number(c.recoverTotal)).toBe(Number(c.recoverPrincipal) + Number(c.recoverProfit));   // 칸끼리 맞물림
    expect(c.investBalance).toBe(0);
    const t = computeSchemaTotal(sc, rows({ ...defaultFilterValues(sc), 데이터기준: '월말확정' }))!;
    expect([t.no, t.investAmt, t.recoverTotal]).toEqual(['합계 1건', 4_900_000_000, 7_350_000_000]);
  });

  it('숨은 키는 그리드 컬럼이 아니다(33컬럼 그대로)', () => {
    for (const k of ['acctType', 'statBasis']) expect(sc.columns.map((c) => c.key)).not.toContain(k);
    expect(sc.columns).toHaveLength(33);
  });
});
