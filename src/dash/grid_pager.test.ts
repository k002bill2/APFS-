/* 공용 생략형 페이저(GridPager) — pageItems 순수 함수 계약.
   2026-11-09 사용자 결정: 쪽이 많은 화면(보조원장 ~37쪽)은 번호를 전부 그리지 않고 `1 … 5 6 7 … 37` 로 접는다.
   7쪽 이하는 골드 페이저(번호 전부)와 같은 모양, 넘으면 칸 수가 항상 7 — 쪽을 넘겨도 푸터 폭이 출렁이지 않는다. */
import { describe, it, expect } from 'vitest';
import { pageItems } from './grid_pager';

/* 화면 표기(1-based)로 바꿔 읽기 쉽게 비교 — 함수는 AG Grid 와 같은 0-based 쪽 번호를 돌려준다 */
const view = (current: number, total: number) => pageItems(current, total).map((p) => (p === 'gap' ? '…' : p + 1));

describe('pageItems — 생략형 페이저 항목', () => {
  it('7쪽 이하는 번호 전부', () => {
    expect(view(0, 1)).toEqual([1]);
    expect(view(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(view(6, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('앞쪽 — 첫 5쪽 + … + 마지막', () => {
    expect(view(0, 37)).toEqual([1, 2, 3, 4, 5, '…', 37]);
    expect(view(3, 37)).toEqual([1, 2, 3, 4, 5, '…', 37]);
  });

  it('가운데 — 처음 · … · 현재±1 · … · 마지막', () => {
    expect(view(4, 37)).toEqual([1, '…', 4, 5, 6, '…', 37]);
    expect(view(18, 37)).toEqual([1, '…', 18, 19, 20, '…', 37]);
    expect(view(32, 37)).toEqual([1, '…', 32, 33, 34, '…', 37]);
  });

  it('뒤쪽 — 처음 + … + 마지막 5쪽', () => {
    expect(view(33, 37)).toEqual([1, '…', 33, 34, 35, 36, 37]);
    expect(view(36, 37)).toEqual([1, '…', 33, 34, 35, 36, 37]);
  });

  it('8쪽 이상이면 어느 쪽에서든 칸 수 7 · 현재 쪽 포함', () => {
    for (const total of [8, 9, 12, 37, 100]) {
      for (let cur = 0; cur < total; cur++) {
        const items = pageItems(cur, total);
        expect(items, `${String(cur)}/${String(total)}`).toHaveLength(7);
        expect(items).toContain(cur);
        expect(items[0]).toBe(0);
        expect(items[6]).toBe(total - 1);
      }
    }
  });

  it('번호가 하나만 빠지는 자리는 … 대신 그 번호(… 는 2쪽 이상을 접을 때만)', () => {
    expect(view(3, 8)).toEqual([1, 2, 3, 4, 5, '…', 8]);
    expect(view(4, 8)).toEqual([1, '…', 4, 5, 6, 7, 8]);
  });

  it('범위 밖 current 는 끝으로 붙인다(빈 목록 재조회 직후 등)', () => {
    expect(view(99, 37)).toEqual([1, '…', 33, 34, 35, 36, 37]);
    expect(view(-1, 37)).toEqual([1, 2, 3, 4, 5, '…', 37]);
    expect(pageItems(0, 0)).toEqual([]);
  });
});
