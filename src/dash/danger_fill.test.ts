/* 위험 액션 채움 버튼(삭제·취소 확정) = --danger-fill + --danger-fill-foreground (2026-11-09 사용자 결정 (a)).
   종전 `background: var(--danger)`(#FF6B42) + 흰 글자는 라이트 2.82:1 — AA(4.5:1) 미달. 확인창은 --destructive-foreground 가
   다크에서도 흰색 고정이라 다크(#FF7E59)에서도 2.5:1 이었다. --danger 는 상태 "칠"(점·막대·차트) 토큰이라 값을 바꾸지 않고,
   글자를 얹는 버튼 면 전용 적응형 쌍을 둔다(color-tokens "칠 vs 텍스트" 분리와 같은 이유). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { walkDash } from './test_src';

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8');
const light = css.slice(css.indexOf(':root{'), css.indexOf('.dark{'));
const dark = css.slice(css.indexOf('.dark{'));
const hex = (block: string, name: string) => block.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})\\s*;`))?.[1];

/* WCAG 2.x 상대 휘도 대비 */
const lum = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('--danger-fill 토큰 쌍 — 라이트·다크 모두 AA', () => {
  it.each([['라이트(:root)', light], ['다크(.dark)', dark]] as const)('%s — 리터럴 정의 + 4.5:1 이상', (_t, block) => {
    const bg = hex(block, 'danger-fill');
    const fg = hex(block, 'danger-fill-foreground');
    expect(bg, '--danger-fill 리터럴 hex').toBeTruthy();
    expect(fg, '--danger-fill-foreground 리터럴 hex').toBeTruthy();
    expect(ratio(bg as string, fg as string)).toBeGreaterThanOrEqual(4.5);
  });
});

/* (?:=>|[^>])* — onClick={() => …} 의 => 에서 태그가 끊기지 않게(끊기면 그 버튼이 조용히 검사에서 빠진다) */
const TAG = /<(Button|AlertDialogAction|SaveButton)\b(?:=>|[^>])*>/g;
const tags = walkDash().filter((p) => p.endsWith('.tsx')).flatMap((p) => readFileSync(p, 'utf8').match(TAG) ?? []);

describe('위험 액션 버튼 = --danger-fill 쌍', () => {
  it('버튼 면에 --danger(상태 칠 토큰)를 직접 깔지 않는다', () => {
    expect(tags.filter((t: string) => /background: ?['"]var\(--danger\)['"]/.test(t))).toEqual([]);
  });
  it('--danger-fill 버튼은 전경도 짝 토큰(--danger-fill-foreground)', () => {
    const fills = tags.filter((t: string) => t.includes('var(--danger-fill)'));
    expect(fills.length).toBeGreaterThanOrEqual(49);   // 2026-11-09 전환 시점 49곳(선택 바 22 · 확인창 26 · 취소 확인 1) — 정규식이 줄면 실패
    for (const t of fills) expect(t, t).toMatch(/color: ?['"]var\(--danger-fill-foreground\)['"]/);
  });
});
