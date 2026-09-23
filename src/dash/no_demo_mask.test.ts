/* 데모 마스크 제거 가드(2026-09-24 사용자 결정 — 시안용 마스크 기능·소스 전부 삭제, 되살리지 않는다).
   mask.tsx(mn · MT · useMask)와 CSS 훅(data-mask · apfs-mask-pulse)이 src 어디에도 남지 않아야 한다.
   ⚠ PII 칸(FieldSpec.pii · 셀 타입 'pii')은 실기능이라 대상이 아니다. */
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

describe('데모 마스크 없음', () => {
  it('mask.tsx 삭제', () => expect(existsSync(join(ROOT, 'dash/mask.tsx'))).toBe(false));
  it.each([
    ["import from './mask'", /from '(\.\.?\/)+mask'/],
    ['useMask', /\buseMask\b/],
    ['mn()', /\bmn\(/],
    ['<MT>', /<\/?MT\b/],
    ['data-mask', /data-mask|dataset\.mask/],
    ['apfs-mask-pulse', /apfs-mask-pulse/],
  ])('%s 가 src 에 없다', (_name, re) => {
    const hits = walk(ROOT).filter((f) => re.test(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')));
    expect(hits).toEqual([]);
  });
});
