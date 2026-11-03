import { describe, it, expect } from 'vitest';
import { uniformConfirm, confirmOptions } from './confirm_combo';

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
  it("'제외'도 전부 같으면 활성값(withExclude 콤보 — 조합원총회·정기보고)", () => {
    expect(uniformConfirm(['제외', '제외'])).toBe('제외');
    expect(uniformConfirm(['제외', '확정'])).toBeNull();
  });
});

describe('confirmOptions — 콤보 세그먼트 집합', () => {
  it('기본은 확정·미확정 2칸, withExclude 면 제외까지 3칸', () => {
    expect(confirmOptions(false)).toEqual(['확정', '미확정']);
    expect(confirmOptions(true)).toEqual(['확정', '미확정', '제외']);
  });
});
