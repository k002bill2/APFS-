// @vitest-environment jsdom
/* +N 메뉴 안 적용 칩 = 보이는 칩과 같은 규칙(2026-11-10 사용자 "필터가 보이는 영역에도 마우스 오버시 툴팁이 보이고,
   클릭시 필터칩이 사라지는데 x 로만 삭제하게 하고 칩을 클릭시에 해당 필터 선택 컴포넌트로 포커스 이동").
   - 값 항목 = 그 필터 칸으로 이동(해제 안 함) · × 항목 = 해제 · 행 호버/초점 = DS 툴팁(항목명만)
   - 툴팁은 메뉴보다 늦게 열려 최상위 레이어 → 그 Esc 로 메뉴까지 닫는다(Esc 1번, radix-tooltip-layer-eats-esc)
   jsdom 은 폭이 0 이라 적용 칩이 전부 +N 으로 접힌다 — 별도 폭 조작 없이 메뉴를 시험할 수 있다. globals:false → afterEach cleanup. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from './ui/tooltip';
import { FilterChipRow, type AppliedFilter } from './applied_filters';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

/* 툴팁 콘텐츠(메뉴 제외)에만 열림/닫힘 animationName 을 달리 준다 — jsdom 엔 CSS 애니메이션이 없어 Presence 가 닫자마자 내려 버리는데,
   이러면 닫힘 애니메이션 중(unmountSuspended)으로 남는다(animationend 가 없어 계속 남는다 = 브라우저의 닫힘 잔류). */
const TIP = '[data-radix-popper-content-wrapper] > [data-side]:not([role="menu"])';
function stubTooltipExitAnimation() {
  const orig = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
    const s = orig(el, pseudo);
    if (!(el instanceof Element) || !el.matches(TIP)) return s;
    return new Proxy(s, {
      get: (t, p) => {
        if (p === 'animationName') return el.getAttribute('data-state') === 'closed' ? 'exit' : 'enter';
        const v = Reflect.get(t, p);
        return typeof v === 'function' ? v.bind(t) : v;
      },
    });
  });
}
const openTips = () => [...document.querySelectorAll(TIP)].filter((el) => el.getAttribute('data-state') !== 'closed');
/** 열려 있는(닫힘 애니메이션 중이 아닌) 툴팁 본문 — 없으면 null */
const openTip = () => openTips()[0]?.querySelector('[role="tooltip"]')?.textContent ?? null;
const openTipCount = () => openTips().length;

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
      h(FilterChipRow, { applied }))));
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

  /* 2026-11-17 사용자 "너비를 초과한 리스트에 마우스 오버시 툴팁이 잘 작동 안 해 … 어느 부분에서는 안 뜨는 부분" —
     포인터가 값 항목을 벗어나면 Radix 메뉴가 메뉴 본체로 초점을 옮겨 행 툴팁이 닫히고(닫힘 애니메이션 시작), 같은 행 × 에 들어오면
     다시 연다. 비제어 Radix 툴팁은 다시 열 때 'tooltip.open' 을 문서에 쏘는데, 아직 남아 있는 **자기** 콘텐츠가 그걸 받아 스스로 닫았다
     (실측: 열림 → 3~5ms 뒤 closed, × 와 '×→값' 복귀에서 매번). */
  it('닫힘 애니메이션 중인 행 툴팁을 다시 열어도 스스로 꺼지지 않는다(값 → 메뉴 본체 → 같은 행 ×)', async () => {
    stubTooltipExitAnimation();
    setup();
    openMenu();
    const value = await screen.findByRole('menuitem', { name: '정기/수시: 정기 — 필터에서 변경' });
    await waitFor(() => expect(document.activeElement).toBe(value));
    expect(openTip()).toBe('정기/수시');
    fireEvent.pointerMove(document);   // 포인터 사용으로 전환 — 키보드 모드면 Radix 가 메뉴 본체 초점을 첫 항목으로 되돌린다
    act(() => screen.getByRole('menu').focus());   // 포인터가 행을 떠남(Radix onItemLeave) — 닫힘 애니메이션 중으로 남는다
    expect(openTip()).toBeNull();
    act(() => screen.getByRole('menuitem', { name: '정기/수시 필터 제거' }).focus());
    expect(openTip()).toBe('정기/수시');
  });

  /* 방향키 이동은 blur·focus 가 한 번에 묶여 처리된다 — 제어형에서 이 둘을 Radix 에 그대로 맡기면 열기 요청이 아직 갱신 전인 open=true 를
     보고 무시돼 닫힘만 남았다(실측: 값 → × 에서 툴팁 사라짐). 같은 행 안 초점 이동은 닫지 않고, 다른 행으로 가면 그 행 툴팁 하나만 뜬다. */
  it('방향키로 같은 행 값 → × 로 가면 툴팁이 유지되고, 다음 행으로 가면 그 행 툴팁 하나만 뜬다', async () => {
    stubTooltipExitAnimation();
    setup();
    openMenu();
    const value = await screen.findByRole('menuitem', { name: '정기/수시: 정기 — 필터에서 변경' });
    await waitFor(() => expect(document.activeElement).toBe(value));
    act(() => screen.getByRole('menuitem', { name: '정기/수시 필터 제거' }).focus());
    expect(openTip()).toBe('정기/수시');
    act(() => screen.getByRole('menuitem', { name: '조합상태: 청산중 — 필터에서 변경' }).focus());
    expect(openTip()).toBe('조합상태');
    expect(openTipCount()).toBe(1);
  });
});
