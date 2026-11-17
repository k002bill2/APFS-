/* 운용사 모니터링 스키마 3화면 — 미연동이던 필터가 숨은 행 속성으로 실제로 거른다(2026-11-16 "미연동 필터 전부 동작").
   판정은 GenericListPage rowMatchesFilters 와 같은 정본(filter_field: resolveFilterField · filterValueMatches · defaultFilterValues).
   · 사후관리기록 관리 운용사 → gpKey(원문 선택지 1개 'KB증권' — 키만 배선)
   · 운용사 재무정보 조회 운용사(codeName) → queryGp(원문 캡처의 조회 운용사 'NH투자증권', 2행 공통)
   · 관리보수관리 계정구분 → acctType · 담당자 → manager */
import { describe, it, expect } from 'vitest';
import { resolveSchema } from '../../schemas/index';
import { resolveFilterField, filterValueMatches, defaultFilterValues } from '../../schemas/filter_field';
import type { PageSchema } from '../../schemas/types';

const passes = (sc: PageSchema, row: Record<string, unknown>, fv: Record<string, string>) =>
  Object.entries(fv).every(([label, v]) => {
    const ff = resolveFilterField(label, sc);
    return !v || !ff.columnKey || filterValueMatches(ff, v, row[ff.columnKey]);
  });
const count = (sc: PageSchema, fv: Record<string, string>) => (sc.sample ?? []).filter((r) => passes(sc, r, fv)).length;

describe('사후관리기록 관리(post-mgmt-record) — 운용사', () => {
  const sc = resolveSchema('post-mgmt-record');
  it('운용사가 숨은 키 gpKey 로 연동된다(그리드 컬럼 아님)', () => {
    expect(resolveFilterField('운용사', sc).columnKey).toBe('gpKey');
    expect(sc.columns.map((c) => c.key)).not.toContain('gpKey');
  });
  it('기본값(원문 KB증권)은 3행 그대로, 다른 운용사 값은 0건', () => {
    const def = defaultFilterValues(sc);
    expect(def.운용사).toBe('KB증권');
    expect(count(sc, def)).toBe(3);
    expect(count(sc, { ...def, 운용사: '없는운용사' })).toBe(0);
  });
});

describe('운용사 재무정보 조회(gp-financial) — 운용사(코드/명칭)', () => {
  const sc = resolveSchema('gp-financial');
  it('운용사가 숨은 조회 운용사 queryGp 로 연동된다(표시 칸 gp 아님 — gp 면 기본값이 2행을 1행으로 줄인다)', () => {
    expect(resolveFilterField('운용사', sc).columnKey).toBe('queryGp');
    expect(sc.columns.map((c) => c.key)).not.toContain('queryGp');
  });
  it('기본값(NHLIB~NH투자증권)은 원문 2행 그대로', () => {
    expect(count(sc, defaultFilterValues(sc))).toBe(2);
  });
  it('원문 GPLIST 의 다른 운용사(KB증권)로 조회하면 0건, 명칭을 비우면 전 행', () => {
    expect(count(sc, { ...defaultFilterValues(sc), 운용사: 'KBLIB~KB증권' })).toBe(0);
    expect(count(sc, { ...defaultFilterValues(sc), 운용사: 'NHLIB~' })).toBe(2);
  });
});

describe('관리보수관리(mgmt-fee) — 계정구분·담당자', () => {
  const sc = resolveSchema('mgmt-fee');
  it('계정구분·담당자가 숨은 키로 연동되고 선택지는 원문/행 값이다', () => {
    const acc = resolveFilterField('계정구분', sc);
    expect(acc.columnKey).toBe('acctType');
    expect(acc.options).toEqual(['농식품', '수산']);
    const mgr = resolveFilterField('담당자', sc);
    expect(mgr.kind).toBe('enum');
    expect(mgr.columnKey).toBe('manager');
    expect(mgr.options).toEqual(['양한솔']);
  });
  it('기본 상태 1행 그대로, 값을 고르면 실제로 거른다', () => {
    const def = defaultFilterValues(sc);
    expect(count(sc, def)).toBe(1);
    expect(count(sc, { ...def, 계정구분: '농식품' })).toBe(1);
    expect(count(sc, { ...def, 계정구분: '수산' })).toBe(0);
    expect(count(sc, { ...def, 담당자: '양한솔' })).toBe(1);
    expect(count(sc, { ...def, 담당자: '다른사람' })).toBe(0);
  });
});
