/* 평가시점 데이터 확인(스키마) — 평가년월이 숨은 행 속성 ym 으로 조회 시점(asOf)을 거른다(2026-11-16 미연동 필터 전부 동작).
   기본 상태(미선택)는 원문 1행 그대로(R0). sample 1행 고정은 risk_pages_17 출처 대조가 단언한다. */
import { describe, it, expect } from 'vitest';
import { schema } from './valuation_data_check';
import { resolveFilterField, filterValueMatches, defaultFilterValues } from '../../schemas/filter_field';

const ff = resolveFilterField('평가년월', schema);
const rows = (v: string) => (schema.sample ?? []).filter((r) => !v || filterValueMatches(ff, v, r[ff.columnKey!]));

describe('평가시점 데이터 확인 — 평가년월', () => {
  it('월 선택 · 숨은 키 ym 연동 · 조회 시점(asOf) — 컬럼은 늘리지 않는다', () => {
    expect(ff).toMatchObject({ kind: 'month', columnKey: 'ym', asOf: true });
    expect(schema.columns.some((c) => c.key === 'ym')).toBe(false);
  });
  it('기본 상태 = 미선택(def 없음) → 원문 1행', () => {
    expect(defaultFilterValues(schema)).toEqual({});
    expect(rows('')).toHaveLength(1);
  });
  it('평가분(2025-12) 이후를 고르면 보이고, 이전을 고르면 0건', () => {
    expect(rows('2025-12')).toHaveLength(1);
    expect(rows('2026-03')).toHaveLength(1);
    expect(rows('2025-11')).toHaveLength(0);
  });
});
