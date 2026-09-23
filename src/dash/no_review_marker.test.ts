/* 검토필요 마커 제거 가드(2026-09-24 사용자 결정 — ⚠검토필요 마커는 전부 삭제하고 새로 만들지 않는다).
   review_marker.tsx(ReviewMarker · reviewInnerHeader · ReviewNote)와 rec/dat 메모 데이터가 src 어디에도
   남지 않아야 한다. ⚠ 실데이터 칸 키 `note`('비고')와 NewScreenNotice(신규 화면 배너)는 대상이 아니다. */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;   // src/
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css)$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
  });
}

describe('검토필요 마커 없음', () => {
  it('review_marker.tsx 삭제', () => expect(existsSync(join(ROOT, 'dash/review_marker.tsx'))).toBe(false));
  it.each([
    ["import from './review_marker'", /review_marker/],
    ['ReviewMarker · ReviewNote*', /\bReviewMarker\b|\bReviewNote\w*/],
    ['reviewInnerHeader', /\breviewInnerHeader\b/],
    ['{ rec, dat } 메모 리터럴', /\brec:\s*['"`][\s\S]{0,400}?\bdat:/],
  ])('%s 가 src 에 없다', (_name, re) => {
    const hits = walk(ROOT).filter((f) => re.test(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')));
    expect(hits).toEqual([]);
  });
});
