/* 적용된 필터 줄 가드(2026-09-24 사용자 결정 — 전 화면 공통 2줄 툴바).
   적용 칩(값 + × '필터 제거')은 applied_filters.tsx 만 그린다. 페이지는 GridFrame `appliedFilters` 로 배열만 넘긴다.
   페이지마다 칩을 복사하면 말줄임·전체 해제·aria 규칙이 다시 32벌로 갈라진다. */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { activeFilters } from './applied_filters';

const ROOT = new URL('..', import.meta.url).pathname;   // src/
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
  });
}
const OWNER = 'dash/applied_filters.tsx';

describe('적용 칩 = applied_filters.tsx 단일 소유', () => {
  it.each([
    ["'필터 제거' aria", /필터 제거/],
    ['AppliedChip 지역 사본', /\bfunction AppliedChips?\b/],
    ['FilterPill 지역 사본', /\bfunction FilterPill\b/],
  ])('%s 가 소유 파일 밖에 없다', (_n, re) => {
    const hits = walk(ROOT).filter((f) => relative(ROOT, f) !== OWNER && re.test(strip(readFileSync(f, 'utf8'))))
      .map((f) => relative(ROOT, f));
    expect(hits).toEqual([]);
  });
});

describe('깔때기 = GridFrame 단일 소유', () => {
  it('페이지가 툴바 깔때기 아이콘을 직접 그리지 않는다(프레임이 항상 그린다)', () => {
    const hits = walk(ROOT).filter((f) => relative(ROOT, f) !== 'dash/grid_frame.tsx' && /<Icon name="filter"/.test(strip(readFileSync(f, 'utf8'))))
      .map((f) => relative(ROOT, f));
    expect(hits).toEqual([]);
  });
});

describe('activeFilters', () => {
  it('빈 값·공백 값은 적용되지 않은 것으로 본다', () => {
    const r = activeFilters([{ label: 'a', value: '' }, { label: 'b', value: '  ' }, { label: 'c', value: 'x' }]);
    expect(r.map((f) => f.label)).toEqual(['c']);
  });
  it('undefined 는 빈 배열', () => expect(activeFilters(undefined)).toEqual([]));
});
