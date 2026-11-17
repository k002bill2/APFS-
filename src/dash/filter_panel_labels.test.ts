/* 필터 패널 칸 ↔ 적용 칩 label 가드(2026-11-17 — 상세필터 드로어 → 칩 줄 위 인라인 패널, apfs-detail-filter).
   패널의 select·다중 선택·PeriodPicker·범위 칸은 고른 값을 칸에 보이지 않는다(filter_panel FIXED_PLACEHOLDER — 값은 적용 칩에만).
   그래서 ① 그 항목은 칩이 반드시 있어야 하고(없으면 골라도 화면에 아무 신호가 없다) ② 칩 label = 칸 label 이어야
   칩 클릭이 그 칸을 찾는다(filter_field_jump — aria-label 정확일치). 소스 정적 판정: 값 숨김 칸의 리터럴 label 이
   패널 밖(칩 정의)에 문자열 리터럴로 한 번 이상 나와야 한다. noop(미연동 — 칩 없음이 규약)·showValue(값을 칸에 보이는 수식어 select) 칸은 제외.
   label 이 변수인 칸(스키마 공용·RiskPage 키트)은 런타임 전수 점검(스킬 "전수 점검 방법")이 맡는다. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { walkDash, DASH_DIR, panelSrc } from './test_src';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const HIDDEN = /^<Panel(?:Select|Multi|Period|Range)\b/;

const pages = walkDash()
  .filter((p) => p.endsWith('.tsx') && !p.endsWith('filter_panel.tsx'))
  .map((p) => ({ file: relative(DASH_DIR, p), src: strip(readFileSync(p, 'utf8')) }))
  .filter(({ src }) => src.includes('<FilterPanel'));

/* 한 파일에 패널이 여럿(탭별 등)일 수 있다 — 모든 <FilterPanel …>…</FilterPanel> 구간 */
function panels(src: string): string[] {
  const out: string[] = [];
  for (let rest = src; ; ) {
    const p = panelSrc(rest);
    if (!p) return out;
    out.push(p);
    rest = rest.slice(rest.indexOf(p) + p.length);
  }
}

describe('값 숨김 패널 칸은 같은 label 의 적용 칩이 있다', () => {
  it('패널을 쓰는 화면이 실제로 수집된다(0건 통과 방지)', () => expect(pages.length).toBeGreaterThanOrEqual(50));
  it.each(pages.map(({ file, src }) => [file, src] as const))('%s', (_file, src) => {
    const blocks = panels(src);
    let outside = src;
    for (const b of blocks) outside = outside.replace(b, '');
    const missing = blocks
      .flatMap((b) => b.match(/<Panel\w+\b[\s\S]*?\/>/g) ?? [])
      .filter((cell) => HIDDEN.test(cell) && !/\b(?:noop|showValue)\b(?!=\{false\})/.test(cell))
      .map((cell) => cell.match(/\blabel="([^"]+)"/)?.[1])
      .filter((l): l is string => !!l)
      .filter((l) => !new RegExp(`['"\`]${l.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}['"\`]`).test(outside));
    expect(missing).toEqual([]);
  });
});
