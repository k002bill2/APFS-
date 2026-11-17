/* 툴바 주 필터 칩 ↔ 상세필터 중복 금지 가드(2026-11-05 사용자 지시 — "투자심의상태가 기본으로 있는데
   상세필터에도 있어, 상세필터에서 제거하고 이런 페이지가 있는지 모두 검사해").
   GridFrame `filterChips` 로 툴바에 올린 차원(상태·구분·조회 모드)은 드로어에 다시 두지 않는다 — 같은 state 를
   두 곳에서 고치게 하면 "한 필터·두 진입점"이 되어 어느 쪽이 기준인지 헷갈린다. 정본 선례: `invest_recovery_detail.tsx`
   (조회기준 칩만, 드로어엔 없음) · `integration_monitor.tsx`(응답코드·처리상태 칩만).
   판정: 칩 정의 `active: <state> === …` 의 state 가 필터 패널 칸(`<FilterPanel>…</FilterPanel>` 안 `<Panel* … value={<state>}`)으로
   다시 쓰이면 위반. 2026-11-17 상세필터 드로어 → 칩 줄 위 인라인 패널(apfs-detail-filter) — 패널 칸은 화면에 '' 를 보여도
   prop 으로는 실제 state 를 받으므로(filter_panel FIXED_PLACEHOLDER) 이 판정이 그대로 성립한다. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { walkDash, DASH_DIR, panelSrc } from './test_src';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const PAGES = walkDash()
  .filter((p) => p.endsWith('.tsx'))
  .map((p) => ({ file: relative(DASH_DIR, p), src: strip(readFileSync(p, 'utf8')) }))
  .filter(({ src }) => src.includes('filterChips='));

/* 칩이 거는 state 이름들 — `active: fState === s` · `active: view === v.key` · `active: f.cd === k` */
const chipStates = (src: string) => [...new Set([...src.matchAll(/active:\s*([A-Za-z_$][\w$.]*)\s*===/g)].map((m) => m[1]))];
/* 패널 칸 하나 = `<PanelX …/>`(자기 닫힘 — 화살표 함수의 '=>' 는 '/>' 가 아니라 안전) */
const panelCells = (src: string) => panelSrc(src).match(/<Panel\w+\b[\s\S]*?\/>/g) ?? [];
const esc = (s: string) => s.replace(/[.$]/g, '\\$&');

describe('툴바 주 필터 칩의 state 를 필터 패널에 다시 두지 않는다', () => {
  it('filterChips 를 쓰는 화면이 실제로 수집된다(0건 통과 방지)', () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(20);
    expect(PAGES.filter(({ src }) => chipStates(src).length > 0).length).toBeGreaterThanOrEqual(20);
  });

  it('패널 칸이 실제로 수집된다(0건 통과 방지)', () => {
    expect(PAGES.filter(({ src }) => panelCells(src).length > 0).length).toBeGreaterThanOrEqual(15);
  });

  it('칩 state 를 value 로 받는 패널 칸이 없다', () => {
    const hits = PAGES.flatMap(({ file, src }) => chipStates(src).flatMap((st) => {
      const re = new RegExp(`value=\\{${esc(st)}\\}`);
      return panelCells(src).filter((b) => re.test(b)).map((b) => `${file}: ${st} ← ${b.match(/label="([^"]*)"/)?.[1] ?? '?'}`);
    }));
    expect(hits).toEqual([]);
  });
});
