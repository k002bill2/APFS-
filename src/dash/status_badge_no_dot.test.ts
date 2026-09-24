/* 상태 뱃지 불릿 제거 가드(2026-09-24 사용자 결정 — 뱃지는 텍스트만, 앞의 점(bullet) 없음).
   StatusBadge 에 dot 옵션을 되살리지 않고, 그리드 상태 셀 뱃지는 typed 그리드와 같은 lg(13px)로 맞춘다. */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;   // src/
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
  });
}

describe('상태 뱃지 = 텍스트만', () => {
  it('StatusBadge 정의에 dot 옵션·점 렌더가 없다', () => {
    const src = strip(readFileSync(join(ROOT, 'dash/components.tsx'), 'utf8'));
    const def = src.slice(src.indexOf('function StatusBadge'), src.indexOf('function DeltaBadge'));
    expect(def).not.toMatch(/\bdot\b/);
    expect(def).not.toMatch(/rounded-full/);
  });
  it('어느 호출부도 StatusBadge 에 dot 을 넘기지 않는다', () => {
    const hits = walk(ROOT).filter((f) => /<StatusBadge\b[^>]*\bdot\b/.test(strip(readFileSync(f, 'utf8'))));
    expect(hits).toEqual([]);
  });
  it('그리드 상태 셀(스키마 렌더러) 뱃지는 lg', () => {
    const src = strip(readFileSync(join(ROOT, 'dash/schemas/renderers.tsx'), 'utf8'));
    expect(src).toMatch(/case 'status':[^\n]*<StatusBadge[^>]*size="lg"/);
  });
});
