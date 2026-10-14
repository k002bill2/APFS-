import { describe, it, expect } from 'vitest';
import { ROWS, chgKey, chgLabel, passFilter, prevMonth, visibleRows, isDiff, buildAoa, EXCEL_HEAD } from './ew_month_compare_model';
import type { Grade, ChgKey } from './ew_month_compare_model';

const G_ALL: Record<Grade, boolean> = { 정상: true, 주의: true, 경고: true };
const C_ALL: Record<ChgKey, boolean> = { up: true, down: true, same: true };
const G_NONE: Record<Grade, boolean> = { 정상: false, 주의: false, 경고: false };
const C_NONE: Record<ChgKey, boolean> = { up: false, down: false, same: false };

describe('prevMonth — 전월 계산', () => {
  it('1월은 전년 12월로 롤오버', () => {
    expect(prevMonth('2026-01')).toBe('2025-12');
  });
  it('두 자리 월 → 한 자리 월도 0 패딩', () => {
    expect(prevMonth('2026-10')).toBe('2026-09');
    expect(prevMonth('2026-07')).toBe('2026-06');
    expect(prevMonth('2026-12')).toBe('2026-11');
  });
  it('빈 값·형식 불일치는 빈 문자열', () => {
    expect(prevMonth('')).toBe('');
    expect(prevMonth('2026')).toBe('');
  });
});

describe('chgKey / chgLabel — 변동 판정(목업 chg·chgKey)', () => {
  it('신규·해소·악화·개선·지속', () => {
    expect([chgKey('주의', ''), chgLabel('주의', '')]).toEqual([null, '신규']);
    expect([chgKey('', '정상'), chgLabel('', '정상')]).toEqual(['down', '해소']);
    expect([chgKey('경고', '주의'), chgLabel('경고', '주의')]).toEqual(['up', '▲ 악화']);
    expect([chgKey('정상', '주의'), chgLabel('정상', '주의')]).toEqual(['down', '▼ 개선']);
    expect([chgKey('주의', '주의'), chgLabel('주의', '주의')]).toEqual(['same', '= 지속']);
    expect([chgKey('', ''), chgLabel('', '')]).toEqual([null, '']);
  });
});

describe('passFilter / visibleRows — 목업 passFilter', () => {
  const count = (g: Record<Grade, boolean>, c: Record<ChgKey, boolean>) => ROWS.filter((r) => passFilter(r, g, c)).length;

  it('기본(전체 on) → 6행', () => {
    expect(ROWS.length).toBe(6);
    expect(count(G_ALL, C_ALL)).toBe(6);
  });
  it('악화 off → 5행', () => {
    expect(count(G_ALL, { ...C_ALL, up: false })).toBe(5);
  });
  it('개선·해소 off → 4행', () => {
    expect(count(G_ALL, { ...C_ALL, down: false })).toBe(4);
  });
  it('변동 토글 전부 off → 신규(케이팜) 1행만 남는다', () => {
    const v = visibleRows(ROWS, G_ALL, C_NONE);
    expect(v.map((r) => r.gp)).toEqual(['(유)케이팜파트너스']);
    expect(v[0].no).toBe(1);
  });
  it('등급 토글 전부 off → 0행(목업 그대로: 신규도 등급 매칭이 필요)', () => {
    expect(count(G_NONE, C_ALL)).toBe(0);
    expect(count(G_NONE, C_NONE)).toBe(0);
  });
  it('등급은 cur 또는 prev 매칭 — 경고만 on 이면 그린(경고←주의) 1행', () => {
    expect(visibleRows(ROWS, { 정상: false, 주의: false, 경고: true }, C_ALL).map((r) => r.id)).toEqual(['ewmc-2']);
    /* 정상만 on → 한들(정상←주의)·와프 해소(←정상) */
    expect(visibleRows(ROWS, { 정상: true, 주의: false, 경고: false }, C_ALL).map((r) => r.id)).toEqual(['ewmc-3', 'ewmc-5']);
  });
  it('No 는 필터 후 1..N 재번호', () => {
    expect(visibleRows(ROWS, G_ALL, { ...C_ALL, up: false }).map((r) => r.no)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('isDiff — 음영 대상', () => {
  it('2~5행만 당월≠전월', () => {
    expect(ROWS.map(isDiff)).toEqual([false, true, true, true, true, false]);
  });
});

describe('buildAoa — 엑셀 셀 값', () => {
  it('헤더 + 6행, 빈칸·[object Object] 없음', () => {
    const aoa = buildAoa(visibleRows(ROWS, G_ALL, C_ALL));
    expect(aoa[0]).toEqual(EXCEL_HEAD);
    expect(aoa.length).toBe(7);
    for (const row of aoa.slice(1)) {
      expect(row.length).toBe(7);
      for (const cell of row) {
        expect(cell === '' || cell == null).toBe(false);
        expect(String(cell)).not.toContain('[object');
      }
    }
    expect(aoa[2]).toEqual([2, '운용사 조기경보', '농식품투자조합', '자본충실도', '▲ 악화', '(유)그린농식품투자 경고', '(유)그린농식품투자 주의']);
    expect(aoa[4].slice(4)).toEqual(['신규', '(유)케이팜파트너스 주의', '–']);
    expect(aoa[5].slice(4)).toEqual(['해소', '–', '(유)와프인베스트먼트 정상']);
  });
});
