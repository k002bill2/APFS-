// @vitest-environment jsdom
/* useDeferredClose 회귀 테스트 — 훅이 든 메커니즘 3개(지연 언마운트 #199 · 재오픈 취소 #218 · 2단계 폴백 #220)를
   각각 고정한다. 저장소 vitest 는 node 환경이 기본이라 이 파일만 docblock 으로 jsdom 을 켠다(전역 설정 불변).
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. 타이머는 fake. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import {
  EXIT_ANIMATION,
  EXIT_FALLBACK_MS,
  makeExitEndHandler,
  makeExitStartHandler,
  useDeferredClose,
} from './dialog-exit';

type Props = { open: boolean | undefined };

function mount(open: boolean | undefined = true) {
  const onOpenChange = vi.fn();
  const hook = renderHook(({ open }: Props) => useDeferredClose(open, onOpenChange), { initialProps: { open } });
  return { ...hook, onOpenChange };
}

const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('useDeferredClose — 지연 언마운트(#199)', () => {
  it('close() 는 내부만 닫고 부모 통지는 미룬다', () => {
    const { result, onOpenChange } = mount(true);
    expect(result.current.inner).toBe(true);
    act(() => result.current.close());
    expect(result.current.inner).toBe(false);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('finish 가 부모에 false 를 한 번만 보낸다(멱등)', () => {
    const { result, onOpenChange } = mount(true);
    act(() => result.current.close());
    act(() => result.current.finish());
    act(() => result.current.finish());
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('exit 재생 중 pointerdown/keydown 이 오면 즉시 flush 한다', () => {
    const a = mount(true);
    act(() => a.result.current.close());
    act(() => { document.dispatchEvent(new Event('pointerdown')); });
    expect(a.onOpenChange).toHaveBeenCalledTimes(1);
    cleanup();

    const b = mount(true);
    act(() => b.result.current.close());
    act(() => { document.dispatchEvent(new Event('keydown')); });
    expect(b.onOpenChange).toHaveBeenCalledTimes(1);
  });

  it('잠금(setLocked) 중에는 close() 가 무시된다', () => {
    const { result, onOpenChange } = mount(true);
    act(() => result.current.setLocked(true));
    act(() => result.current.close());
    expect(result.current.inner).toBe(true);
    tick(EXIT_FALLBACK_MS + 50);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('재사용(A→B, open 유지) 경로는 finish 뒤 첫 커밋에서 inner 를 복원한다', () => {
    const { result, rerender } = mount(true);
    act(() => result.current.close());
    act(() => result.current.finish());
    expect(result.current.inner).toBe(false);
    rerender({ open: true });
    expect(result.current.inner).toBe(true);
  });

  it('제어형(open=false 로 내려온 커밋)은 닫힌 채 유지된다', () => {
    const { result, rerender } = mount(true);
    act(() => result.current.close());
    act(() => result.current.finish());
    rerender({ open: false });
    expect(result.current.inner).toBe(false);
  });

  it('닫는 중 언마운트되면 타이머가 조용히 죽는다', () => {
    const { result, unmount, onOpenChange } = mount(true);
    act(() => result.current.close());
    unmount();
    expect(() => tick(EXIT_FALLBACK_MS + 50)).not.toThrow();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe('useDeferredClose — 2단계 폴백(#220)', () => {
  it('1단계: exit 가 시작되지 않으면 close() 기준 450ms 에 finish 한다', () => {
    const { result, onOpenChange } = mount(true);
    act(() => result.current.close());
    tick(EXIT_FALLBACK_MS - 1);
    expect(onOpenChange).not.toHaveBeenCalled();
    tick(1);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  it('2단계: animationstart 가 오면 그 시점부터 450ms 를 다시 잰다', () => {
    const { result, onOpenChange } = mount(true);
    act(() => result.current.close());
    tick(320);
    act(() => result.current.onExitStart());
    tick(EXIT_FALLBACK_MS - 320);        // t=450 — 요청 기준이면 여기서 잘렸다
    expect(onOpenChange).not.toHaveBeenCalled();
    tick(320);                           // t=770 = 320 + 450
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  it('closing 이 아닐 때의 onExitStart 는 타이머를 세우지 않는다(부모가 직접 닫은 경로)', () => {
    const { result, onOpenChange } = mount(true);
    act(() => result.current.onExitStart());
    tick(EXIT_FALLBACK_MS * 2);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe('useDeferredClose — 재오픈 취소(#218)', () => {
  it('닫는 중 부모가 open=true 로 되돌리면 대기 중 닫힘을 취소한다', () => {
    const { result, rerender, onOpenChange } = mount(true);
    act(() => result.current.close());
    rerender({ open: false });
    rerender({ open: true });
    expect(result.current.inner).toBe(true);
    tick(EXIT_FALLBACK_MS + 50);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    // 취소된 뒤 늦게 도착한 animationstart/animationend 도 무해해야 한다
    act(() => result.current.onExitStart());
    act(() => result.current.finish());
    tick(EXIT_FALLBACK_MS + 50);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(result.current.inner).toBe(true);
  });
});

describe('makeExitStartHandler / makeExitEndHandler', () => {
  const ev = (over: Partial<{ animationName: string; sameTarget: boolean }>) => {
    const el = {}; const other = {};
    return {
      animationName: over.animationName ?? EXIT_ANIMATION,
      target: over.sameTarget === false ? other : el,
      currentTarget: el,
    } as unknown as React.AnimationEvent<HTMLElement>;
  };

  it('exit 이름이고 target===currentTarget 일 때만 루트에 알린다', () => {
    for (const make of [makeExitStartHandler, makeExitEndHandler]) {
      const cb = vi.fn(); const user = vi.fn();
      const h = make<HTMLElement>(cb, user);
      h(ev({ animationName: 'dialog-in' }));
      h(ev({ sameTarget: false }));
      expect(cb).not.toHaveBeenCalled();
      h(ev({}));
      expect(cb).toHaveBeenCalledTimes(1);
      expect(user).toHaveBeenCalledTimes(3);   // 소비처 핸들러는 항상 먼저 돈다
    }
  });
});
