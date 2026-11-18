// @vitest-environment jsdom
/* 필터 [초기화] 하나로(2026-11-18 사용자 "초기화 전체해제는 중복이야 초기화를 없애는게 맞지않아?" → "하나로 합치기").
   패널 [초기화]와 칩 줄 [전체 해제]를 **칩 줄 끝 [초기화] 하나**로 합친다(applied_filters.tsx · GridFrame `filterReset`).
   - 화면이 기본값 복원(filterReset)을 넘기면: 처음과 다를 때(dirty)만 보이고, 누르면 기본값으로 되돌린다.
     칩이 0개여도 보인다 — 기본 기간 칩을 × 로 지우면 칩이 없지만 처음 상태와는 다르다.
   - 넘기지 않으면(기본값이 전부 빈 값): 해제 가능한 칩이 2개 이상일 때 칩 × 를 차례로 부른다(종전 전체 해제, 이름만 초기화).
   - 넘쳐도 +N 으로 접지 않는다 — 기본값으로 돌아가는 유일한 경로다.
   - 누른 뒤 버튼이 사라지면(처음 상태) 초점은 패널 첫 칸으로 — body 에 떨어뜨리지 않는다.
   정적 가드(패널 [초기화] 폐지)는 node 환경인 applied_filters.test.ts 에 있다(test_src 는 jsdom 에서 file URL 을 못 푼다).
   jsdom 은 폭이 0 이라 적용 칩이 전부 +N 으로 접힌다(applied_filters_overflow.test.ts 와 같은 조건). globals:false → afterEach cleanup. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { TooltipProvider } from './ui/tooltip';
import { FilterChipRow, type AppliedFilter, type FilterReset } from './applied_filters';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const h = React.createElement;
function mount(props: { applied?: AppliedFilter[]; reset?: FilterReset }) {
  return render(h(TooltipProvider, null,
    h('div', { 'data-grid-frame': '' },
      h('div', { 'data-filter-panel': '' }, h('select', { 'aria-label': '운용사' }, h('option', { value: '' }, '운용사'))),
      h(FilterChipRow, props))));
}
const resetBtn = () => screen.queryByRole('button', { name: '초기화' });

describe('[초기화] — 화면이 기본값 복원을 넘길 때', () => {
  it('처음과 다르면 칩이 없어도 보이고, 누르면 기본값 복원을 부른다', () => {
    const run = vi.fn();
    mount({ applied: [], reset: { run, dirty: true } });
    fireEvent.click(resetBtn()!);
    expect(run).toHaveBeenCalledTimes(1);
  });
  it('처음 상태면 칩이 있어도 그리지 않는다', () => {
    mount({ applied: [{ label: '기준일자', value: '2026-07-13 ~ 2026-08-12', onClear: vi.fn() }, { label: '모펀드', value: '농식품모태펀드' }], reset: { run: vi.fn(), dirty: false } });
    expect(resetBtn()).toBeNull();
  });
  it('칩이 +N 으로 접혀도 [초기화]는 줄에 남고, +N 메뉴에는 없다', async () => {
    mount({ applied: [{ label: '운용사', value: '현대기술투자', onClear: vi.fn() }, { label: '자펀드', value: 'BNK-경남', onClear: vi.fn() }], reset: { run: vi.fn(), dirty: true } });
    const btn = resetBtn()!;
    expect(btn.closest('[role="menu"]')).toBeNull();
    fireEvent.keyDown(screen.getByRole('button', { name: /필터 \d+개 더 보기/ }), { key: 'Enter' });
    const menu = await screen.findByRole('menu');
    expect(within(menu).queryByText('초기화')).toBeNull();
    expect(within(menu).queryByText('전체 해제')).toBeNull();
  });
  it('누른 뒤 처음 상태가 되어 버튼이 사라지면 초점은 패널 첫 칸으로 간다', async () => {
    function Screen() {
      const [dirty, setDirty] = React.useState(true);
      return h(TooltipProvider, null,
        h('div', { 'data-grid-frame': '' },
          h('div', { 'data-filter-panel': '' }, h('select', { 'aria-label': '운용사' }, h('option', { value: '' }, '운용사'))),
          h(FilterChipRow, { applied: [], reset: { run: () => setDirty(false), dirty } })));
    }
    render(h(Screen));
    resetBtn()!.focus();
    fireEvent.click(resetBtn()!);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('combobox', { name: '운용사' })));
    expect(resetBtn()).toBeNull();
  });
  it('버튼에 초점이 없던 클릭(Safari 마우스)은 초점을 옮기지 않는다 — 버튼이 남아 있어도 패널로 튀지 않는다', async () => {
    const run = vi.fn();
    mount({ applied: [], reset: { run, dirty: true } });
    (document.activeElement as HTMLElement | null)?.blur();
    fireEvent.click(resetBtn()!);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(run).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(document.body);
  });
});

describe('[초기화] — 기본값 복원이 없는 화면(기본값이 전부 빈 값)', () => {
  it('해제 가능한 칩이 2개 이상이면 [초기화]가 칩 × 를 차례로 부른다 — "전체 해제" 문구는 없다', () => {
    const a = vi.fn(), b = vi.fn();
    mount({ applied: [{ label: '운용사', value: '현대기술투자', onClear: a }, { label: '자펀드', value: 'BNK-경남', onClear: b }] });
    fireEvent.click(resetBtn()!);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('전체 해제')).toBeNull();
  });
  it('해제 가능한 칩이 1개면 그리지 않는다(칩 × 가 같은 일)', () => {
    mount({ applied: [{ label: '운용사', value: '현대기술투자', onClear: vi.fn() }, { label: '모펀드', value: '농식품모태펀드' }] });
    expect(resetBtn()).toBeNull();
  });
});

