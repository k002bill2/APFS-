/* 상세필터 드로어 단축키 가드 — 2026-11-17 뒤집음.
   구 계약(2026-10-30): 뒤 화면을 덮는 상세필터 시트가 열린 동안 페이지 useHotkey(⌘P 인쇄 · ⌥D 내보내기 · ⌘⏎ 등록)는
   `enabled: !filterOpen` 으로 꺼야 했다(덮인 채로 뒤 그리드가 인쇄·내보내기되던 회계 PR #378 실측).
   2026-11-17 사용자 지시 "자펀드정보관리를 참고해서 모든 페이지의 상세필터를 페이지 위치로" — 상세필터는 칩 줄 위 인라인 패널이 되어
   덮는 시트가 없다. 그래서 이제 지킬 것은 반대다: 필터 드로어 상태(`filterOpen`)·필터 드로어 컴포넌트가 다시 생기지 않을 것.
   팝업(다이얼로그)이 덮는 동안 단축키를 끄는 일은 그대로 `skipInDialog: true`(hotkey_dialog_skip_guard)가 맡는다. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { walkDash, DASH_DIR } from './test_src';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const pages = walkDash()
  .filter((p) => p.endsWith('.tsx'))
  .map((p) => ({ f: relative(DASH_DIR, p), src: strip(readFileSync(p, 'utf8')) }));

describe('상세필터 드로어가 다시 생기지 않는다(인라인 패널 — apfs-detail-filter)', () => {
  it('대상이 있다(경로·패턴이 바뀌어 0건 통과하지 않게)', () => expect(pages.length).toBeGreaterThan(150));
  it('filterOpen state 가 없다', () => {
    expect(pages.filter(({ src }) => /\bfilterOpen\b/.test(src)).map(({ f }) => f)).toEqual([]);
  });
  it('필터 드로어 컴포넌트(ListFilterDrawer·FilterDrawer)가 없다', () => {
    expect(pages.filter(({ src }) => /\b(?:List)?FilterDrawer\b/.test(src)).map(({ f }) => f)).toEqual([]);
  });
  it('필터 패널을 쓰는 화면은 단축키를 filterOpen 류 조건으로 끄지 않는다', () => {
    const bad = pages.filter(({ src }) => /filterPanel=/.test(src) && /useHotkey\([^)]*enabled:[^}]*!\w*(?:filter|drawer)\w*Open/i.test(src));
    expect(bad.map(({ f }) => f)).toEqual([]);
  });
});
