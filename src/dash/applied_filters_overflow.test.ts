// @vitest-environment jsdom
/* +N 메뉴 안 적용 칩 = 보이는 칩과 같은 규칙(2026-11-10 사용자 "필터가 보이는 영역에도 마우스 오버시 툴팁이 보이고,
   클릭시 필터칩이 사라지는데 x 로만 삭제하게 하고 칩을 클릭시에 해당 필터 선택 컴포넌트로 포커스 이동").
   - 값 항목 = 그 필터 칸으로 이동(해제 안 함) · × 항목 = 해제 · 행 호버/초점 = DS 툴팁(항목명만)
   - 툴팁은 메뉴보다 늦게 열려 최상위 레이어 → 그 Esc 로 메뉴까지 닫는다(Esc 1번, radix-tooltip-layer-eats-esc)
   jsdom 은 폭이 0 이라 적용 칩이 전부 +N 으로 접힌다 — 별도 폭 조작 없이 메뉴를 시험할 수 있다. globals:false → afterEach cleanup. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from './ui/tooltip';
import { FilterChipRow, type AppliedFilter } from './applied_filters';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
afterEach(cleanup);

const h = React.createElement;
function setup() {
  const clearRt = vi.fn();
  const clearSt = vi.fn();
  const applied: AppliedFilter[] = [
    { label: '정기/수시', value: '정기', onClear: clearRt },
    { label: '조합상태', value: '청산중', onClear: clearSt },
  ];
  render(h(TooltipProvider, null,
    h('div', { 'data-grid-frame': '' },
      h('div', { 'data-filter-panel': '' }, h('select', { 'aria-label': '정기/수시' }, h('option', { value: '' }, '정기/수시'))),
      h(FilterChipRow, { applied, jumpHint: '필터에서 변경' }))));
  return { clearRt, clearSt };
}
const openMenu = () => fireEvent.keyDown(screen.getByRole('button', { name: /필터 \d+개 더 보기/ }), { key: 'Enter' });

describe('+N 메뉴 적용 칩 — 값=이동 · ×=해제 · 툴팁', () => {
  it('값 항목을 누르면 해제하지 않고 그 필터 칸으로 초점이 간다', async () => {
    const { clearRt } = setup();
    openMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: '정기/수시: 정기 — 필터에서 변경' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('combobox', { name: '정기/수시' })));
    expect(clearRt).not.toHaveBeenCalled();
  });

  it('× 항목만 해제한다', async () => {
    const { clearRt, clearSt } = setup();
    openMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: '정기/수시 필터 제거' }));
    expect(clearRt).toHaveBeenCalledTimes(1);
    expect(clearSt).not.toHaveBeenCalled();
  });

  it('행에 초점이 가면 항목명 툴팁이 뜨고(네이티브 title 없음), Esc 1번에 메뉴와 툴팁이 함께 닫힌다', async () => {
    setup();
    openMenu();
    const item = await screen.findByRole('menuitem', { name: '정기/수시: 정기 — 필터에서 변경' });
    await waitFor(() => expect(document.activeElement).toBe(item));
    expect(screen.getByRole('tooltip').textContent).toBe('정기/수시');
    expect(item.closest('[title]')).toBeNull();
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
