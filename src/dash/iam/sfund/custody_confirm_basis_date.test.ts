/* 자펀드수탁관리(확정) — 기준일자가 그날 대사 행만 보인다(2026-11-17 사용자 지시 "기준일자가 표를 거르게").
   기본 기준일(2026-07-31) = 원문 24행 그대로(R0), 직전 시점(2026-06-30) = 창작 더미 3행, 그 밖의 날 = 0건. */
import { describe, it, expect } from 'vitest';
import { CONFIRM_ROWS, PREV_DATE } from './custody_confirm_manage';
import { atBaseDate } from './custody_verify_manage';
import { readSrc } from '../../test_src';

const BASE = '2026-07-31';
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe('자펀드수탁관리(확정) — 기준일자 스냅샷', () => {
  it('기본 기준일 = 원문 24행(cc-1 … cc-24), 번호 1…24', () => {
    const rows = atBaseDate(CONFIRM_ROWS, BASE);
    expect(ids(rows)).toEqual(Array.from({ length: 24 }, (_, i) => `cc-${i + 1}`));
    expect(rows.map((r) => r.no)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
  });
  it('직전 시점 = 같은 운용사·자펀드의 더미 3행(일치·확정), 번호는 그 시점 안에서 1부터', () => {
    const prev = atBaseDate(CONFIRM_ROWS, PREV_DATE);
    expect(ids(prev)).toEqual(['cc-prev-1', 'cc-prev-2', 'cc-prev-3']);
    expect(prev.map((r) => r.no)).toEqual([1, 2, 3]);
    const base = atBaseDate(CONFIRM_ROWS, BASE);
    expect(prev.map((r) => r.fn)).toEqual([base[0].fn, base[1].fn, base[5].fn]);
    expect(prev.every((r) => r.status === '일치' && r.confirm === '확정')).toBe(true);
  });
  it('대사가 없는 날은 0건 · 행 id 는 모두 고유', () => {
    expect(atBaseDate(CONFIRM_ROWS, '2026-07-30')).toEqual([]);
    expect(new Set(ids(CONFIRM_ROWS)).size).toBe(CONFIRM_ROWS.length);
  });
});

describe('자펀드수탁관리(확정) — 배선', () => {
  const src = readSrc('custody_confirm_manage.tsx');
  it('그리드·불일치 알림은 그날 행(snapRows)을 받는다 — 전체 행을 넘기면 기본 상태에 더미가 샌다', () => {
    expect(src).toMatch(/rowData=\{snapRows\}/);
    expect(src).toMatch(/<CustodyMismatchAlertModal rows=\{snapRows\}/);
    expect(src).toMatch(/const snapRows = useMemo\(\(\) => atBaseDate\(rows, fBaseDate\)/);
  });
  it('단건 등록은 지금 기준일자로 들어가고 번호는 같은 기준일 안에서 매긴다', () => {
    expect(src).toMatch(/asOf: fBaseDate \}/);
    expect(src).toMatch(/atBaseDate\(prev, fBaseDate\)\.reduce/);
  });
  it('기준일자를 비우거나 초기화하면 기본값으로 돌아간다(시점 없는 조회 없음)', () => {
    expect(src).toMatch(/setFBaseDate\(v \|\| BASE_DATE\)/);
    expect(src).toMatch(/const clearFilters = \(\) => \{ setFConfirm\(''\); setFBaseDate\(BASE_DATE\); \}/);
  });
});
