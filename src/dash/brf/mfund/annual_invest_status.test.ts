/* 연도별 투자현황 — 기준일이 선정년도(연도 축) 조회 시점으로 실제로 거른다(2026-11-16 "미연동 필터 전부 동작").
   sample 이 없어 행은 makeRows 합성 행(선정년도 = 연도 도메인 YEAR_OPTIONS 순환 시드)이다.
   계정구분·조회기준은 판단 보류(숨은 키를 합성 행에 실을 경로·재계산 슬롯 없음) — 미연동 캡션 유지. */
import { describe, it, expect } from 'vitest';
import { resolveSchema } from '../../schemas/index';
import { resolveFilterField, filterValueMatches, defaultFilterValues, YEAR_OPTIONS } from '../../schemas/filter_field';

const sc = resolveSchema('annual-invest-status');

describe('연도별 투자현황 — 기준일', () => {
  it('기준일 = 선정년도(selectYear) 컬럼 조회 시점(asOf)', () => {
    const ff = resolveFilterField('기준일', sc);
    expect(ff.kind).toBe('date');
    expect(ff.columnKey).toBe('selectYear');
    expect(ff.asOf).toBe(true);
  });
  it('기본값이 없어 기본 상태는 그대로(전 행)', () => {
    expect(defaultFilterValues(sc)).toEqual({});
  });
  it('고른 날짜 이후 선정년도는 빠지고, 그 해까지는 남는다', () => {
    const ff = resolveFilterField('기준일', sc);
    const kept = (v: string) => YEAR_OPTIONS.filter((y) => filterValueMatches(ff, v, y));
    expect(kept('2026-12-31')).toEqual([...YEAR_OPTIONS]);
    expect(kept('2023-06-30')).toEqual(['2023', '2022', '2021', '2020']);
    expect(kept('2019-12-31')).toEqual([]);
  });
  it('계정구분·조회기준은 판단 보류 — 행 키 없음(미연동 캡션 유지)', () => {
    expect(resolveFilterField('계정구분', sc).columnKey).toBeUndefined();
    expect(resolveFilterField('조회기준', sc).columnKey).toBeUndefined();
  });
});
