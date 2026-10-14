/* 푸터 단축키 힌트 가드(2026-09-28) — FooterActions 는 인쇄(⌘P)·내보내기(⌥D) 툴팁에 힌트를 **표시만** 한다(shortcut prop).
   바인딩은 그 화면의 useHotkey 가 소유하므로, FooterActions 를 렌더하는 파일이 바인딩을 빠뜨리면 툴팁이 거짓 단축키를 광고한다.
   규칙: `<FooterActions` 가 있는 파일 → HOTKEYS.print.combo 바인딩 필수, 그 태그에 onExport 가 있으면 HOTKEYS.export.combo 도 필수. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { walkDash } from './test_src';

// 재귀 탐색 — 페이지가 도메인 폴더(ffms/·risk/ …)에 있으므로 src/dash 최상위만 보면 소비처를 놓친다
const files = walkDash()
  .filter((p) => p.endsWith('.tsx') && basename(p) !== 'grid_frame.tsx')
  .map((p) => ({ f: basename(p), src: readFileSync(p, 'utf8') }))
  .filter(({ src }) => /<FooterActions\b/.test(src));

describe('FooterActions 힌트 = 실제 바인딩', () => {
  it('소비처가 있다', () => expect(files.length).toBeGreaterThan(30));
  it.each(files.map(({ f, src }) => [f, src] as const))('%s', (_f, src) => {
    expect(src).toMatch(/useHotkey\(HOTKEYS\.print\.combo/);
    expect(src.match(/<FooterActions\b/g)).toHaveLength(1);   // 전체보기 ⌥A·새 창 ⌥O 는 FooterActions 가 바인딩 — 2개면 이중 발화
    const tags = src.match(/<FooterActions\b[^>]*>/g) ?? [];
    if (tags.some((t) => /\bonExport=/.test(t))) expect(src).toMatch(/useHotkey\(HOTKEYS\.export\.combo/);
  });
});
