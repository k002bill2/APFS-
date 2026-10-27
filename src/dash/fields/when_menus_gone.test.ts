/* whenMenusGone 회귀 테스트(2026-10-27) — 메뉴가 DOM 에 남아 있는 동안 절대 열지 않는다.
   예전 인라인 폴링은 50ms×12(600ms) 뒤엔 메뉴가 남아 있어도 열었고, 늦게 재생된 메뉴 닫힘 애니메이션이
   pointerleave 로 모달 입력의 포커스를 뺏어 첫 글자부터 사라졌다. hasMenu 를 주입해 DOM 없이(node 환경) 검사한다. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { whenMenusGone, MENU_WAIT_MAX_MS } from './when_menus_gone';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('whenMenusGone', () => {
  it('메뉴가 없으면 다음 틱(0ms)에 연다 — 동기 호출은 아니다', () => {
    const open = vi.fn();
    whenMenusGone(open, { hasMenu: () => false });
    expect(open).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('메뉴가 2초 남아 있으면 그동안 열지 않고(예전 600ms 상한 회귀), 사라진 직후 연다', () => {
    let menu = true;
    const open = vi.fn();
    whenMenusGone(open, { hasMenu: () => menu });
    vi.advanceTimersByTime(600);
    expect(open).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1400);
    expect(open).not.toHaveBeenCalled();
    menu = false;
    vi.advanceTimersByTime(50);
    expect(open).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('메뉴가 끝내 남아 있으면 상한 뒤 열지 않고 타이머도 남기지 않는다', () => {
    const open = vi.fn();
    whenMenusGone(open, { hasMenu: () => true });
    vi.advanceTimersByTime(MENU_WAIT_MAX_MS + 1000);
    expect(open).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('기다리는 중 언마운트(alive=false)되면 메뉴가 사라져도 열지 않고 멈춘다', () => {
    let menu = true;
    let alive = true;
    const open = vi.fn();
    whenMenusGone(open, { hasMenu: () => menu, alive: () => alive });
    vi.advanceTimersByTime(200);
    alive = false;
    menu = false;
    vi.advanceTimersByTime(200);
    expect(open).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
