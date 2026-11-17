/* 투자기업명세서(통합) — 계정구분·기준일자가 숨은 행 속성으로 실제로 거른다(2026-11-16 "미연동 필터 전부 동작").
   · 계정구분 → acctType(4행 한 자펀드 — 전부 농식품) · 기준일자 → regDate 조회 시점(asOf, 셀 ≤ 값) */
import { describe, it, expect } from 'vitest';
import { resolveSchema } from '../../schemas/index';
import { resolveFilterField, filterValueMatches, defaultFilterValues } from '../../schemas/filter_field';
import type { PageSchema } from '../../schemas/types';

const sc: PageSchema = resolveSchema('investee-spec');
const passes = (row: Record<string, unknown>, fv: Record<string, string>) =>
  Object.entries(fv).every(([label, v]) => {
    const ff = resolveFilterField(label, sc);
    return !v || !ff.columnKey || filterValueMatches(ff, v, row[ff.columnKey]);
  });
const names = (fv: Record<string, string>) => (sc.sample ?? []).filter((r) => passes(r, fv)).map((r) => r.investee);

describe('투자기업명세서(통합) — 상세필터 연동', () => {
  it('계정구분·기준일자가 숨은 키로 연동된다(컬럼 아님 — 58컬럼 그대로)', () => {
    expect(resolveFilterField('계정구분', sc).columnKey).toBe('acctType');
    const d = resolveFilterField('기준일자', sc);
    expect(d.kind).toBe('date');
    expect(d.columnKey).toBe('regDate');
    expect(d.asOf).toBe(true);
    expect(sc.columns.map((c) => c.key)).not.toEqual(expect.arrayContaining(['acctType']));
    expect(sc.columns.map((c) => c.key)).not.toContain('regDate');
    expect(sc.columns).toHaveLength(58);
  });
  it('기본 상태(기본값 없음)는 4행 그대로', () => {
    expect(defaultFilterValues(sc)).toEqual({});
    expect(names({})).toHaveLength(4);
  });
  it('계정구분: 농식품 = 4행, 수산 = 0건', () => {
    expect(names({ 계정구분: '농식품' })).toHaveLength(4);
    expect(names({ 계정구분: '수산' })).toHaveLength(0);
  });
  it('기준일자: 그 날까지 등록된 기업만 남는다(asOf)', () => {
    expect(names({ 기준일자: '2026-08-12' })).toHaveLength(4);   // 원문 기본값 시점 = 전 행
    expect(names({ 기준일자: '2013-12-31' })).toEqual(['(주)진바이오텍', '(주)선양', '(주)체리부로']);
    expect(names({ 기준일자: '2012-01-01' })).toEqual(['(주)진바이오텍']);
    expect(names({ 기준일자: '2011-10-24' })).toEqual([]);
    expect(names({ 기준일자: '2011-10-25' })).toEqual(['(주)진바이오텍']);   // 같은 날 포함
  });
});
