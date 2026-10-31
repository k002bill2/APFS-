// @vitest-environment jsdom
/* useHotkey `skipInDialog` 계약(2026-10-31 사용자 결정 — 모달이 열린 동안 페이지 ⌘P·⌥D·⌘⏎ 는 브라우저로 넘긴다).
   열린 dialog/alertdialog(Radix `data-state="open"`)가 있으면 preventDefault 전에 빠져서 키가 브라우저 기본 동작으로 간다
   (enabled:false 와 같은 관측 결과 — 상세필터 드로어 #378·#380 과 같은 동작). 닫히는 중(`data-state="closed"`)은 열린 것으로 보지 않는다.
   옵션이 없으면 예전 그대로 — 전표등록 화면 단축키·셸 단축키는 dialog 안에서도 동작해야 한다.
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { HOTKEYS, useHotkey } from './use-hotkey';

afterEach(() => { cleanup(); document.body.replaceChildren(); });

const pressModP = () => {
  const e = new KeyboardEvent('keydown', { key: 'p', metaKey: true, bubbles: true, cancelable: true });
  window.dispatchEvent(e);
  return e;
};
const overlay = (role: string, state: string) => {
  const d = document.createElement('div');
  d.setAttribute('role', role);
  d.setAttribute('data-state', state);
  document.body.appendChild(d);
};
const bind = (opts?: { skipInDialog?: boolean }) => {
  const fn = vi.fn();
  renderHook(() => useHotkey(HOTKEYS.print.combo, fn, opts));
  return fn;
};

describe('useHotkey skipInDialog', () => {
  it('열린 dialog 없음 → 실행하고 기본 동작(브라우저 인쇄)을 막는다', () => {
    const fn = bind({ skipInDialog: true });
    const e = pressModP();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
  });

  it('dialog 열림 → 실행하지 않고 기본 동작을 막지 않는다(브라우저 인쇄로 넘어감)', () => {
    const fn = bind({ skipInDialog: true });
    overlay('dialog', 'open');
    const e = pressModP();
    expect(fn).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
  });

  it('alertdialog(삭제 확인 등) 열림 → 건너뛴다', () => {
    const fn = bind({ skipInDialog: true });
    overlay('alertdialog', 'open');
    pressModP();
    expect(fn).not.toHaveBeenCalled();
  });

  it('닫히는 중(data-state=closed, exit 애니메이션) → 열린 것으로 보지 않는다', () => {
    const fn = bind({ skipInDialog: true });
    overlay('dialog', 'closed');
    pressModP();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('옵션 없음 → dialog 가 열려 있어도 실행(모달 안·셸 단축키 하위 호환)', () => {
    const fn = bind();
    overlay('dialog', 'open');
    const e = pressModP();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
  });
});
