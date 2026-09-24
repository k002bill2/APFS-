import { describe, it, expect } from 'vitest';
import { uniformConfirm } from './confirm_combo';

describe('uniformConfirm — 선택 행 확정여부 → 콤보 활성값', () => {
  it('전부 같은 값이면 그 값', () => {
    expect(uniformConfirm(['확정', '확정'])).toBe('확정');
    expect(uniformConfirm(['미확정'])).toBe('미확정');
  });
  it('섞이면 null(둘 다 비활성)', () => {
    expect(uniformConfirm(['확정', '미확정'])).toBeNull();
  });
  it('빈값·null 이 끼거나 전부 빈값이면 null', () => {
    expect(uniformConfirm(['확정', ''])).toBeNull();
    expect(uniformConfirm(['', ''])).toBeNull();
    expect(uniformConfirm([null])).toBeNull();
  });
  it('선택이 없으면 null', () => {
    expect(uniformConfirm([])).toBeNull();
  });
});
