/* 버튼 hover 크기 변화 금지 가드(2026-09-28 사용자 지시 "버튼에 마우스 오버시 사이즈변동되는 애니메이션 모두 삭제").
   + "클릭시에도 효과 삭제해줘" — hover·press 모두 색·테두리 변화로만 표시한다. 조회 아이콘 회전(rotate)은 크기 변화가 아니라 대상 밖. */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));   // src/
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css)$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
  });
}
/* index.html 인라인 <style> 도 대상 — `.ui-btn:active{transform:scale(.97)}` 가 여기 숨어 있어 src 만 보던 가드를 통과했다(2026-09-28 실측). */
const files = [...walk(ROOT), join(ROOT, '..', 'index.html')].map((p) => ({ p, src: readFileSync(p, 'utf8') }));

describe('hover 크기 변화 없음', () => {
  it.each([
    ['Motion whileHover', /\bwhileHover\s*[=:]/],
    ['Motion whileTap', /\bwhileTap\s*[=:]/],
    ['Tailwind hover:scale', /\bhover:scale-/],
    ['Tailwind active:scale', /\bactive:scale-/],
    ['CSS :hover/:active { transform: scale }', /:(hover|active)[^{]*\{[^}]*transform\s*:\s*scale/],
  ])('%s 가 src 에 없다', (_name, re) => {
    expect(files.filter(({ src }) => re.test(src)).map(({ p }) => p.slice(ROOT.length))).toEqual([]);
  });
});
