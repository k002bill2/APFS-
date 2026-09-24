/* 여러 표 세로 쌓기 섹션 헤더 규약 가드(2026-09-24 사용자 결정 — 기준 화면: 예외사항레포트).
   - SectionHead 는 risk_grid.tsx 공용 하나뿐(페이지 로컬 복사본 금지)
   - 제목 앞 번호 칩(블릿) 없음 → `n=` prop 을 넘기지 않는다
   - 건수 캡션 없음 → cap 에 `총 N건` 을 싣지 않는다(건수는 푸터에만)
   - padding 16px 18px 12px 4px
   - 그리드 상단 라인은 제목(border-bottom)이 아니라 바로 뒤 AG Grid 에 — 차트 섹션에 선이 생기지 않게 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;   // src/
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
  });
}
const src = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const files = walk(ROOT);

describe('섹션 헤더 규약(여러 표 세로 쌓기)', () => {
  it('SectionHead 정의는 risk_grid.tsx 하나뿐', () => {
    const defs = files.filter((f) => /function SectionHead\b/.test(src(f))).map((f) => f.slice(ROOT.length));
    expect(defs).toEqual(['dash/risk_grid.tsx']);
  });
  it('번호 칩(n=)을 넘기지 않는다', () => {
    expect(files.filter((f) => /<SectionHead\b[^>]*\sn=/.test(src(f)))).toEqual([]);
  });
  it('건수 캡션(총 N건)을 싣지 않는다', () => {
    expect(files.filter((f) => /<SectionHead\b[^>]*cap=\{[^}]*총 \{/.test(src(f)))).toEqual([]);
  });
  it('padding 16px 18px 12px 4px', () => {
    const grid = src(join(ROOT, 'dash/risk_grid.tsx'));
    const body = grid.slice(grid.indexOf('export function SectionHead'));
    expect(body.slice(0, 600)).toContain("padding: '16px 18px 12px 4px'");
  });
  it('그리드 상단 라인 — 제목엔 border-bottom 없음, 다음 AG Grid 에 border-top', () => {
    const grid = src(join(ROOT, 'dash/risk_grid.tsx'));
    const body = grid.slice(grid.indexOf('export function SectionHead')).slice(0, 600);
    expect(body).toContain('apfs-section-head');
    expect(body).not.toContain('borderBottom');
    const css = readFileSync(join(ROOT, 'dash/aggrid_shared.css'), 'utf8');
    expect(css).toMatch(/\.apfs-section-head \+ \* \.ag-root-wrapper[\s\S]*?border-top: 1px solid var\(--border\)/);
  });
});
