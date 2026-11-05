// @vitest-environment jsdom
/* 전표등록 ⌥I·⌥↑·⌥↓·⌥+(2026-11-04 사용자 지정 — 설계서 Alt+A 행 삽입·Alt+R 행 이동·'마지막 행에서 ↓' 행 추가 대체) 매칭 계약.
   방향키 조합은 HOTKEYS 첫 사례다 — 글자 키(⌥I)는 Mac 에서 e.key 가 'Dead' 등으로 변질돼 e.code 로,
   방향키는 e.key('ArrowUp')로 매칭한다. '+' 는 물리 키가 둘(Equal·NumpadAdd)이고 Equal 은 Shift 를 눌러야 '+' 라
   `codes` 로 여러 물리 키를 받고 그 조합에서만 Shift 를 무시한다(Chrome 확대 ⌘=·⌘⇧= 와 같은 관례). jsdom 은 e.key 를 직접 넣으므로 실제 브라우저의 e.key 값은 ego-browser 실측으로 따로 확인한다.
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { HOTKEYS, ariaShortcut, useHotkey } from './use-hotkey';
import type { HotkeyCombo } from './use-hotkey';

afterEach(() => { cleanup(); document.body.replaceChildren(); });

const press = (init: KeyboardEventInit, target: EventTarget = window) => {
  const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e;
};
const bind = (combo: HotkeyCombo) => {
  const fn = vi.fn();
  renderHook(() => useHotkey(combo, fn));
  return fn;
};

describe('전표등록 ⌥I·⌥↑·⌥↓ 매칭', () => {
  it('⌥↑·⌥↓ = Alt + ArrowUp/ArrowDown(e.key) — 실행하고 기본 동작(스크롤)을 막는다', () => {
    const up = bind(HOTKEYS.journalMoveUp.combo);
    const down = bind(HOTKEYS.journalMoveDown.combo);
    const e = press({ key: 'ArrowUp', code: 'ArrowUp', altKey: true });
    expect(up).toHaveBeenCalledTimes(1);
    expect(down).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(true);
    press({ key: 'ArrowDown', code: 'ArrowDown', altKey: true });
    expect(down).toHaveBeenCalledTimes(1);
  });

  it('수식어 없는 방향키·Shift 조합은 통과(그리드·입력 이동을 빼앗지 않는다)', () => {
    const up = bind(HOTKEYS.journalMoveUp.combo);
    const plain = press({ key: 'ArrowUp', code: 'ArrowUp' });
    press({ key: 'ArrowUp', code: 'ArrowUp', altKey: true, shiftKey: true });
    expect(up).not.toHaveBeenCalled();
    expect(plain.defaultPrevented).toBe(false);
  });

  it('입력칸 포커스 중 ⌥↑ 는 무시 — 기본 동작(캐럿 이동)을 막지 않는다', () => {
    const up = bind(HOTKEYS.journalMoveUp.combo);
    const input = document.createElement('input');
    document.body.appendChild(input);
    const e = press({ key: 'ArrowUp', code: 'ArrowUp', altKey: true }, input);
    expect(up).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
  });

  it('⌥I = 물리 키 KeyI — Mac 에서 e.key 가 Dead(ˆ 조합 대기)로 와도 실행', () => {
    const ins = bind(HOTKEYS.journalInsertRow.combo);
    press({ key: 'Dead', code: 'KeyI', altKey: true });
    expect(ins).toHaveBeenCalledTimes(1);
  });

  it('⌥+ 행 추가 = 물리 키 Equal(Shift 유무 무관)·NumpadAdd — Mac 에서 e.key 가 ≠·± 로 와도 실행', () => {
    const add = bind(HOTKEYS.journalAddRow.combo);
    const a = press({ key: '≠', code: 'Equal', altKey: true });                  // ⌥=
    press({ key: '±', code: 'Equal', altKey: true, shiftKey: true });           // ⌥⇧= (= 실제 '+')
    press({ key: '+', code: 'NumpadAdd', altKey: true });                       // 숫자패드 +
    expect(add).toHaveBeenCalledTimes(3);
    expect(a.defaultPrevented).toBe(true);
  });

  it('Alt 없는 + 는 통과(금액칸 ×1,000 · 입력 보호)', () => {
    const add = bind(HOTKEYS.journalAddRow.combo);
    const e = press({ key: '+', code: 'Equal', shiftKey: true });
    expect(add).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
  });

  it('회귀: codes 가 없는 조합의 Shift 는 그대로 엄격 — ⌥⇧R 은 조회, ⌥⇧I 는 행 삽입을 발화하지 않는다', () => {
    const refresh = bind(HOTKEYS.refresh.combo);
    const ins = bind(HOTKEYS.journalInsertRow.combo);
    press({ key: '‰', code: 'KeyR', altKey: true, shiftKey: true });
    press({ key: 'ˆ', code: 'KeyI', altKey: true, shiftKey: true });
    expect(refresh).not.toHaveBeenCalled();
    expect(ins).not.toHaveBeenCalled();
    press({ key: '®', code: 'KeyR', altKey: true });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('힌트·aria-keyshortcuts 표기', () => {
    expect(HOTKEYS.journalAddRow.hint.endsWith('+')).toBe(true);
    expect(HOTKEYS.journalInsertRow.hint.endsWith('I')).toBe(true);
    expect(HOTKEYS.journalMoveUp.hint.endsWith('↑')).toBe(true);
    expect(HOTKEYS.journalMoveDown.hint.endsWith('↓')).toBe(true);
    expect(ariaShortcut(HOTKEYS.journalInsertRow.combo)).toBe('Alt+I');
    expect(ariaShortcut(HOTKEYS.journalMoveUp.combo)).toBe('Alt+ArrowUp');
    expect(ariaShortcut(HOTKEYS.journalMoveDown.combo)).toBe('Alt+ArrowDown');
  });
});
