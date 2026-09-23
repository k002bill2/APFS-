/* 툴바 FilterChip '전체' 라벨 가드(2026-09-24 사용자 규칙 — 전체 칩은 "필터명: 전체", 예: `등급: 전체`).
   툴바 칩 줄은 앞에 깔때기 아이콘만 있고 필터 이름이 안 보여서, 맨 '전체'만으로는 무엇의 전체인지 모른다.
   ⚠ 상세필터 드로어의 select '전체'는 위에 라벨이 있어 대상이 아니다(사용자 결정: 툴바 칩만).
   ⚠ 값이 '전체' 문자열 자체인 칩(schedule·main_widgets)은 값은 두고 표시 라벨만 바꾼다 — 이 가드는 리터럴 패턴만 잡는다. */
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
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

describe("FilterChip '전체' 칩은 필터명을 앞에 붙인다", () => {
  it.each([
    ['>전체</FilterChip>', />\s*전체\s*<\/FilterChip>/],
    ["{… '전체'}</FilterChip>", /['"]전체['"]\s*\}\s*<\/FilterChip>/],
    ["칩 튜플 ['', '전체']", /\[\s*''\s*,\s*['"]전체['"]\s*\]/],
    // 콜론 없는 옛 형식("등급 전체") — 필터명 뒤 ':' 필수(2026-09-24 후속 지시)
    ['콜론 없는 "필터명 전체" 칩', /[가-힣] 전체['"]?[^<\n]{0,12}<\/FilterChip>|\[\s*''\s*,\s*['"][^'"]*[가-힣] 전체['"]/],
  ])('%s 패턴이 src 에 없다', (_name, re) => {
    const hits = walk(ROOT).filter((f) => re.test(strip(readFileSync(f, 'utf8'))));
    expect(hits).toEqual([]);
  });
});
