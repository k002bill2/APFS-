/* 상세필터 드로어 단축키 가드(2026-10-30) — 뒤 화면을 덮는 상세필터 시트가 열린 동안 페이지 useHotkey
   (⌘P 인쇄 · ⌥D 내보내기 · ⌘⏎ 등록)는 꺼야 한다(apfs-grid "단축키" · apfs-hotkeys 3단 절차).
   안 끄면 드로어가 덮은 채로 뒤 그리드가 인쇄·내보내기된다(회계 PR #378 실측, 회계 외 37파일이 같은 상태였다).
   드로어 상태 = `<…Sheet|…FilterDrawer open={X}>` 의 X 중 그 파일이 useState 로 선언한 것(대개 filterOpen · RiskPage 는 open).
   태그 접두는 열어 둔다 — generic_list 는 자체 `<ListFilterDrawer>` 라 `<Sheet` 만 보면 스키마 화면 전부가 빠진다.
   enabled 가 이름 하나(listKeys 등)면 그 const 정의를 따라간다. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { walkDash, DASH_DIR } from './test_src';

const HOTKEY_LINE = /^\s*useHotkey\(HOTKEYS\.(print|export|register)\.combo.*$/gm;

const drawerStates = (src: string): string[] =>
  [...new Set([...src.matchAll(/<\w*(?:Sheet|FilterDrawer)\b[^>]*\bopen=\{(\w+)\}/g)].map((m) => m[1]))]
    .filter((x) => new RegExp(`const \\[${x}, set\\w+\\] = (?:React\\.)?useState`).test(src));

const files = walkDash()
  .filter((p) => p.endsWith('.tsx'))
  .map((p) => {
    const src = readFileSync(p, 'utf8');
    return { f: relative(DASH_DIR, p), src, states: drawerStates(src), calls: src.match(HOTKEY_LINE) ?? [] };
  })
  .filter(({ states, calls }) => states.length > 0 && calls.length > 0);

describe('상세필터 드로어가 열린 동안 페이지 단축키(인쇄·내보내기·등록) 끔', () => {
  it('대상이 있다(경로·패턴이 바뀌어 0건 통과하지 않게)', () => expect(files.length).toBeGreaterThan(40));
  it.each(files.map(({ f, src, states, calls }) => [f, src, states, calls] as const))('%s', (_f, src, states, calls) => {
    for (const c of calls) {
      if (/\bskipInDialog: true\b/.test(c)) continue;   // 2026-10-31~ 상세필터 Sheet 도 role="dialog" → skipInDialog 가 드로어까지 덮는다(hotkey_dialog_skip_guard)
      const expr = c.match(/enabled:\s*([^}]*)\}/)?.[1].trim() ?? '';
      const resolved = /^\w+$/.test(expr) ? src.match(new RegExp(`const ${expr} = ([^;]*);`))?.[1] ?? '' : expr;
      for (const s of states) expect(resolved, c.trim()).toMatch(new RegExp(`!${s}\\b`));
    }
  });
});
