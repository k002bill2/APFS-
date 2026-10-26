// @vitest-environment jsdom
/* 인쇄 = 라이트 테마(2026-10-26 사용자 요청 "다크모드에서 인쇄시 라이트모드로").
   beforeprint 에서 html.dark 를 떼고 afterprint(미발화 시 첫 입력)에서 원래대로 되돌린다. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installPrintTheme } from './print_theme';

const root = document.documentElement;
const fire = (type: string) => window.dispatchEvent(new Event(type));
let uninstall: () => void;

beforeEach(() => { uninstall = installPrintTheme(); });
afterEach(() => { uninstall(); root.classList.remove('dark'); });

describe('인쇄 = 라이트 테마', () => {
  it('다크 → 인쇄 동안 dark 를 떼고 afterprint 에서 되돌린다', () => {
    root.classList.add('dark');
    fire('beforeprint');
    expect(root.classList.contains('dark')).toBe(false);
    fire('afterprint');
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('라이트 → 인쇄 전후 dark 가 생기지 않는다', () => {
    fire('beforeprint');
    fire('afterprint');
    expect(root.classList.contains('dark')).toBe(false);
  });

  it('beforeprint 연속 발화 — 두 번째가 라이트를 원래 상태로 기록하지 않는다', () => {
    root.classList.add('dark');
    fire('beforeprint');
    fire('beforeprint');
    fire('afterprint');
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('afterprint 미발화 — 인쇄 뒤 첫 입력(keydown·pointerdown)에서 되돌린다', () => {
    root.classList.add('dark');
    fire('beforeprint');
    window.dispatchEvent(new KeyboardEvent('keydown'));
    expect(root.classList.contains('dark')).toBe(true);

    root.classList.add('dark');
    fire('beforeprint');
    window.dispatchEvent(new Event('pointerdown'));
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('복원 뒤 늦은 afterprint 는 무해하다(사용자가 그새 테마를 바꿨어도 덮어쓰지 않는다)', () => {
    root.classList.add('dark');
    fire('beforeprint');
    window.dispatchEvent(new KeyboardEvent('keydown'));
    root.classList.remove('dark');   // 사용자가 라이트로 전환
    fire('afterprint');
    expect(root.classList.contains('dark')).toBe(false);
  });
});
