/* 그리드만 인쇄 진입점 가드(2026-10-26) — 동작 테스트는 print_grid.test.ts(jsdom).
   규칙: FooterActions 화면의 ⌘P 는 printGrid, `window.print(` 리터럴은 허용목록만,
   GridFrame 은 본문을 data-print-area 로 감싸고 푸터 인쇄 기본값이 printGrid. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { walkDash } from './test_src';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const sources = walkDash()
  .filter((p) => /\.tsx?$/.test(p) && !p.endsWith('.test.ts'))
  .map((p) => ({ f: basename(p), src: readFileSync(p, 'utf8') }));

describe('인쇄 진입점 가드', () => {
  /* window.print 를 직접 부르는 곳 — 사유와 함께만 허용한다.
     - print_grid.ts: 실제 인쇄 호출 지점
     모달 [출력]도 본문만 찍는다 — `printArea(본문 ref)`(2026-10-26 재무 팝업 전환으로 허용목록에서 뺐다). */
  const ALLOW = new Set(['print_grid.ts']);
  it('window.print( 리터럴은 허용목록 파일에만 있다', () => {
    const hits = sources.filter(({ f, src }) => !ALLOW.has(f) && /window\.print\(/.test(strip(src))).map(({ f }) => f);
    expect(hits).toEqual([]);
  });

  const pages = sources.filter(({ f, src }) => f !== 'grid_frame.tsx' && /<FooterActions\b/.test(src));
  it('FooterActions 소비처가 있다', () => expect(pages.length).toBeGreaterThan(30));
  it.each(pages.map(({ f, src }) => [f, src] as const))('%s — ⌘P 는 printGrid', (_f, src) => {
    expect(src).toMatch(/useHotkey\(HOTKEYS\.print\.combo,\s*printGrid\b/);
  });

  it('GridFrame 은 본문을 data-print-area 로 감싸고 푸터 인쇄 기본값이 printGrid 다', () => {
    const frame = sources.find(({ f }) => f === 'grid_frame.tsx')!.src;
    expect(frame).toMatch(/data-print-area[\s\S]{0,120}\{children\}/);
    expect(frame).toMatch(/onPrint \?\? printGrid/);
  });
});
