/* 페이지 단축키 dialog 가드(2026-10-31 사용자 결정) — 페이지가 바인딩하는 ⌘P 인쇄 · ⌥D 내보내기 · ⌘⏎ 등록은
   `{ skipInDialog: true }` 를 단다. 모달·확인창·상세필터 드로어(Sheet)·팝오버 같은 dialog 가 열려 있으면 가로채지 않고 브라우저로 넘긴다.
   없으면 모달이 열린 채 ⌘P 가 모달 뒤 목록 그리드를 인쇄했다(gp-early-warning 재무 팝업 · workforce-manage 등록 모달 PDF 실측).
   화면마다 모달 state 를 enabled 에 배선하지 않는 이유: RiskPage 는 단축키를 kit 가 바인딩해 소비처의 모달 state 를 볼 수 없고,
   새 모달이 생길 때마다 배선이 빠진다. 동작 계약은 use_hotkey_dialog.test.ts. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { walkDash, DASH_DIR } from './test_src';

const HOTKEY_LINE = /^\s*useHotkey\(HOTKEYS\.(print|export|register)\.combo.*$/gm;

const files = walkDash()
  .filter((p) => p.endsWith('.tsx'))
  .map((p) => ({ f: relative(DASH_DIR, p), calls: readFileSync(p, 'utf8').match(HOTKEY_LINE) ?? [] }))
  .filter(({ calls }) => calls.length > 0);

describe('페이지 단축키(인쇄·내보내기·등록) = skipInDialog', () => {
  it('대상이 있다(경로·패턴이 바뀌어 0건 통과하지 않게)', () => expect(files.length).toBeGreaterThan(40));
  it.each(files.map(({ f, calls }) => [f, calls] as const))('%s', (_f, calls) => {
    for (const c of calls) {
      /* 모달 자체 [출력](printArea)은 자기 dialog 안에서 받아야 한다 — skipInDialog 를 달면 영원히 발화하지 않는다 */
      if (/printArea\(/.test(c)) { expect(c.trim()).not.toMatch(/skipInDialog/); continue; }
      expect(c.trim()).toMatch(/\bskipInDialog: true\b/);
    }
  });
});

/* 자체 [출력]이 있는 모달(printArea) = 모달이 열린 동안 ⌘P 도 그 [출력]으로(2026-10-31 사용자 결정).
   페이지 ⌘P 는 skipInDialog 로 비켜 주므로, 바인딩이 없으면 ⌘P 가 브라우저 기본 인쇄(화면 전체)로 넘어간다. */
describe('자체 [출력] 모달 — ⌘P = printArea', () => {
  const printAreaFiles = walkDash()
    .filter((p) => p.endsWith('.tsx'))
    .map((p) => ({ f: relative(DASH_DIR, p), src: readFileSync(p, 'utf8') }))
    .filter(({ src }) => /\bprintArea\(/.test(src));
  it('대상이 있다', () => expect(printAreaFiles.length).toBeGreaterThan(0));
  it.each(printAreaFiles.map(({ f, src }) => [f, src] as const))('%s', (_f, src) => {
    expect(src).toMatch(/^\s*useHotkey\(HOTKEYS\.print\.combo, [^\n]*printArea\(/m);
  });
});
