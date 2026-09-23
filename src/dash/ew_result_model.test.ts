import { describe, it, expect } from 'vitest';
import { prevYm } from './ew_result_model';

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
