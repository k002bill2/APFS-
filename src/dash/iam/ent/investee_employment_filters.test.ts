/* 투자기업 고용현황보고 — 자펀드·계정구분·담당자가 숨은 행 속성으로 실제로 거른다(2026-11-16 "미연동 필터 전부 동작").
   · 자펀드 → subFundKey(원문 옵션 표기 — 표시 칸 subFund 와 표기가 다르다) · 계정구분 → acctType · 담당자 → manager */
import { describe, it, expect } from 'vitest';
import { resolveSchema } from '../../schemas/index';
import { resolveFilterField, filterValueMatches, defaultFilterValues } from '../../schemas/filter_field';
import { computeSchemaTotal } from '../../schemas/totals';
import type { PageSchema } from '../../schemas/types';

const sc: PageSchema = resolveSchema('investee-employment');
const passes = (row: Record<string, unknown>, fv: Record<string, string>) =>
  Object.entries(fv).every(([label, v]) => {
    const ff = resolveFilterField(label, sc);
    return !v || !ff.columnKey || filterValueMatches(ff, v, row[ff.columnKey]);
  });
const rows = (fv: Record<string, string>) => (sc.sample ?? []).filter((r) => passes(r, fv));
const names = (fv: Record<string, string>) => rows(fv).map((r) => r.investee);
const FUND_OPT = '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사';

describe('투자기업 고용현황보고 — 상세필터 연동', () => {
  it('자펀드·계정구분·담당자가 숨은 키로 연동된다(그리드 컬럼은 늘지 않는다)', () => {
    expect(resolveFilterField('자펀드', sc).columnKey).toBe('subFundKey');
    expect(resolveFilterField('계정구분', sc).columnKey).toBe('acctType');
    expect(resolveFilterField('담당자', sc).columnKey).toBe('manager');
    for (const k of ['subFundKey', 'acctType', 'manager']) expect(sc.columns.map((c) => c.key)).not.toContain(k);
    expect(sc.columns).toHaveLength(13);
  });

  it('기본 상태는 3행·합계(총고용 155 · 청년 62) 그대로', () => {
    const fv = defaultFilterValues(sc);
    expect(names(fv)).toHaveLength(3);
    const t = computeSchemaTotal(sc, rows(fv))!;
    expect([t.totalEmployees, t.youthEmployees]).toEqual([155, 62]);
  });

  it('자펀드: 원문 옵션(표기 불일치)을 고르면 3행 그대로 — 표시 칸 subFund 는 원문 그대로', () => {
    expect(resolveFilterField('자펀드', sc).options).toEqual([FUND_OPT]);
    expect(names({ 자펀드: FUND_OPT })).toHaveLength(3);
    expect(names({ 자펀드: '다른 자펀드' })).toHaveLength(0);
    expect(new Set((sc.sample ?? []).map((r) => r.subFund))).toEqual(new Set(['NH농식품밸류업투자조합']));
  });

  it('계정구분: 3행이 한 자펀드라 전부 농식품 · 수산은 0건', () => {
    expect(names({ 계정구분: '농식품' })).toEqual(['(주)그린팜테크', '(주)오션프레시', '팜커넥트(주)']);
    expect(names({ 계정구분: '수산' })).toEqual([]);
  });

  it('담당자: 선택지 = 행 실제 값(첫 등장 순), 고르면 그 담당 행만', () => {
    const ff = resolveFilterField('담당자', sc);
    expect(ff.kind).toBe('enum');
    expect(ff.options).toEqual(['양한솔']);
    expect(names({ 담당자: '양한솔' })).toHaveLength(3);
    expect(names({ 담당자: '이성훈' })).toEqual([]);
  });

  it('합계 행은 걸러진 행 기준으로 다시 계산된다', () => {
    const t = computeSchemaTotal(sc, rows({ 기준년월: '2026-07~2026-12' }))!;
    expect([t.totalEmployees, t.youthEmployees]).toEqual([0, 0]);
    const all = computeSchemaTotal(sc, rows({ 계정구분: '농식품' }))!;
    expect([all.totalEmployees, all.youthEmployees]).toEqual([155, 62]);
  });
});
