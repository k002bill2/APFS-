import { describe, it, expect } from 'vitest';
import { prevYm, setFlag, togglePerm } from './ew_result_model';

describe('prevYm — 섹션2 기준년월(전월)', () => {
  it('같은 해 안에서 한 달 전', () => {
    expect(prevYm('2026-07')).toBe('2026-06');
  });
  it('연 경계: 1월 → 전년 12월', () => {
    expect(prevYm('2026-01')).toBe('2025-12');
  });
  it('빈 값·형식 불일치는 빈 문자열', () => {
    expect(prevYm('')).toBe('');
    expect(prevYm('2026-7')).toBe('');
  });
});


describe('setFlag — 선택 행 O/X 갱신(불변)', () => {
  type R = { id: string; cls: 'O' | 'X'; perm: 'O' | 'X' | null };
  const rows: R[] = [
    { id: 'a', cls: 'X', perm: 'X' },
    { id: 'b', cls: 'X', perm: null },
    { id: 'c', cls: 'O', perm: 'O' },
  ];
  it('선택 행만 바꾸고 나머지는 같은 참조', () => {
    const out = setFlag(rows, ['a'], 'cls', 'O');
    expect(out[0]).toEqual({ id: 'a', cls: 'O', perm: 'X' });
    expect(out[1]).toBe(rows[1]);
    expect(out[2]).toBe(rows[2]);
    expect(rows[0].cls).toBe('X');   // 원본 불변
  });
  it('값이 같으면 참조 유지', () => {
    expect(setFlag(rows, ['c'], 'cls', 'O')[2]).toBe(rows[2]);
  });
  it('함수 값 = 행별 토글(null→O)', () => {
    const out = setFlag(rows, ['a', 'b', 'c'], 'perm', togglePerm);
    expect(out.map((r) => r.perm)).toEqual(['O', 'O', 'X']);
  });
});
