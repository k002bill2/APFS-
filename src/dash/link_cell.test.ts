/* 셀 링크 공용화 가드(2026-10-30) — 상세 진입 셀 링크는 `link_cell.tsx` 의 `LinkCell` 하나만 쓴다.
   화면마다 로컬 사본(`LinkCell` 함수 정의 · 이름만 다른 `SpecLink`)을 두면 외관 계약(font:'inherit' · hover 밑줄)이
   한 곳만 고쳐지고 나머지가 낡는다(공용화 전 사본 10개 중 9개 + SpecLink 1개를 합침, risk_grid 1개는 다른 계약이라 개명).
   ⚠ risk_grid `PopupTriggerCell`·fund_early_warning `YieldCell` 은 span + gridcell ARIA 의 다른 계약이라 대상이 아니다.
   렌더 계약은 link_cell_render.test.ts — jsdom 에선 test_src 의 import.meta.url 이 깨져 파일을 나눴다. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { basename, relative } from 'node:path';
import { DASH_DIR, walkDash } from './test_src';

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
/* 소스만(테스트 제외) — 공용본 자신은 정의 검사에서 뺀다 */
const sources = walkDash().filter((f) => /\.tsx?$/.test(f) && !/\.test\.ts$/.test(f) && !f.endsWith('.d.ts'));
const code = new Map(sources.map((f) => [f, stripComments(readFileSync(f, 'utf8'))]));

describe('셀 링크 = 공용 link_cell.tsx 하나', () => {
  it('스캔 대상이 비어 있지 않다', () => expect(sources.length).toBeGreaterThan(100));

  it('공용본 밖에 LinkCell · SpecLink 로컬 정의가 없다', () => {
    const DEF = /\b(?:function|const|let)\s+(?:LinkCell|SpecLink)\b/;
    const hits = sources
      .filter((f) => basename(f) !== 'link_cell.tsx' && DEF.test(code.get(f)!))
      .map((f) => relative(DASH_DIR, f));
    expect(hits, '로컬 사본 대신 link_cell.tsx 의 LinkCell 을 import 한다').toEqual([]);
  });

  it('공용 LinkCell 을 import 하는 화면이 9개 이상이다(조용한 0건 통과 방지)', () => {
    const IMP = /import\s*\{[^}]*\bLinkCell\b[^}]*\}\s*from\s*'(?:\.\.?\/)+link_cell'/;
    const importers = sources.filter((f) => IMP.test(code.get(f)!));
    expect(importers.length).toBeGreaterThanOrEqual(9);
  });
});
