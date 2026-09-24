/* 적용된 필터 줄 가드(2026-09-24 사용자 결정 — 전 화면 공통 2줄 툴바).
   적용 칩(값 + × '필터 제거')은 applied_filters.tsx 만 그린다. 페이지는 GridFrame `appliedFilters` 로 배열만 넘긴다.
   페이지마다 칩을 복사하면 말줄임·전체 해제·aria 규칙이 다시 32벌로 갈라진다. */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { activeFilters, planChips } from './applied_filters';

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

describe('기본 필터 칩 = FilterChipRow 단일 소유', () => {
  /* GridFrame/RiskPage 소비 화면은 FilterChip 을 직접 그리지 않고 filterChips 로 넘긴다(+N 접기·끌어올리기를 프레임이 맡는다).
     GridFrame 밖 위젯(메인 대시보드·일정·디자인시스템·리스크 요약)은 대상이 아니다. */
  it('GridFrame 소비 화면에 <FilterChip 이 없다', () => {
    const hits = walk(ROOT).filter((f) => relative(ROOT, f) !== OWNER && relative(ROOT, f) !== 'dash/components.tsx')
      .filter((f) => { const t = strip(readFileSync(f, 'utf8')); return /<GridFrame\b|<RiskPage\b/.test(t) && /<FilterChip\b/.test(t); })
      .map((f) => relative(ROOT, f));
    expect(hits).toEqual([]);
  });
});

describe('planChips — 넘치는 만큼 +N, 선택 칩 끌어올림', () => {
  const mk = (ids: string[], active?: string) => ids.map((id) => ({ id, kind: 'chip', chip: { active: id === active } }));
  const w = { a: 50, b: 50, c: 50, d: 50 };
  it('다 들어가면 전부 보인다', () => {
    const r = planChips(mk(['a', 'b', 'c', 'd']), w, 1000, 40);
    expect(r.shown.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']); expect(r.hidden).toEqual([]);
  });
  it('넘치면 트리거 폭을 예약하고 뒤에서부터 숨긴다', () => {
    // 50+8+50+8+50 = 166 ≤ 170 이지만 트리거(40+8) 예약 → 50+8+50 = 108 ≤ 122 → a,b 만
    const r = planChips(mk(['a', 'b', 'c', 'd']), w, 170, 40);
    expect(r.shown.map((x) => x.id)).toEqual(['a', 'b']); expect(r.hidden.map((x) => x.id)).toEqual(['c', 'd']);
  });
  it('숨겨질 선택 칩은 첫 자리로 끌어올린다(순서 자체가 바뀐다)', () => {
    const r = planChips(mk(['a', 'b', 'c', 'd'], 'd'), w, 170, 40);
    expect(r.shown.map((x) => x.id)).toEqual(['d', 'a']); expect(r.hidden.map((x) => x.id)).toEqual(['b', 'c']);
  });
  it('다중 선택: 보이는 선택 칩이 있어도 숨은 선택 칩까지 앞으로 모은다', () => {
    const items = ['a', 'b', 'c', 'd'].map((id) => ({ id, kind: 'chip', chip: { active: id === 'a' || id === 'd' } }));
    const r = planChips(items, w, 170, 40);
    expect(r.shown.map((x) => x.id)).toEqual(['a', 'd']); expect(r.hidden.map((x) => x.id)).toEqual(['b', 'c']);
  });
  it('이미 보이는 선택 칩은 제자리', () => {
    const r = planChips(mk(['a', 'b', 'c', 'd'], 'b'), w, 170, 40);
    expect(r.shown.map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('activeFilters', () => {
  it('빈 값·공백 값은 적용되지 않은 것으로 본다', () => {
    const r = activeFilters([{ label: 'a', value: '' }, { label: 'b', value: '  ' }, { label: 'c', value: 'x' }]);
    expect(r.map((f) => f.label)).toEqual(['c']);
  });
  it('undefined 는 빈 배열', () => expect(activeFilters(undefined)).toEqual([]));
});
