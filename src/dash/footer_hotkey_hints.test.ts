/* 푸터 단축키 힌트 가드(2026-09-28) — FooterActions 는 인쇄(⌘P)·내보내기(⌥D) 툴팁에 힌트를 **표시만** 한다(shortcut prop).
   바인딩은 그 화면의 useHotkey 가 소유하므로, FooterActions 를 렌더하는 파일이 바인딩을 빠뜨리면 툴팁이 거짓 단축키를 광고한다.
   규칙: `<FooterActions` 가 있는 파일 → HOTKEYS.print.combo 바인딩 필수, 그 태그에 onExport 가 있으면 HOTKEYS.export.combo 도 필수. */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('.', import.meta.url));   // src/dash/ (Windows 에서도 네이티브 경로)
const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.tsx') && f !== 'grid_frame.tsx')
  .map((f) => ({ f, src: readFileSync(join(DIR, f), 'utf8') }))
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
