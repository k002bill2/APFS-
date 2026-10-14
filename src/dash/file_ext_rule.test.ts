/* 확장자 규칙 가드(2026-10-14) — JSX 문법이 있으면 .tsx, 없으면 .ts.
   훅·컨텍스트·스키마·데이터·배럴·테스트처럼 React 를 import 해도 JSX 가 없으면 .ts 다.
   판정은 TS 파서의 Jsx 노드 유무로 한다(정규식은 제네릭 `<T>` 를 태그로 오인한다). */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const ROOT = new URL('..', import.meta.url).pathname;   // src/
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !f.endsWith('.d.ts') ? [p] : [];
  });
}

function hasJsx(file: string): boolean {
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found = false;
  const visit = (n: ts.Node): void => {
    if (found) return;
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) { found = true; return; }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

const files = walk(ROOT);

describe('확장자 규칙: JSX 있으면 .tsx, 없으면 .ts', () => {
  it('스캔 대상이 비어 있지 않다', () => expect(files.length).toBeGreaterThan(100));
  it('.tsx 는 모두 JSX 를 쓴다', () => {
    const bad = files.filter((f) => f.endsWith('.tsx') && !hasJsx(f)).map((f) => relative(ROOT, f));
    expect(bad, 'JSX 가 없으니 .ts 로 바꾼다').toEqual([]);
  });
  it('.ts 는 JSX 를 쓰지 않는다', () => {
    const bad = files.filter((f) => f.endsWith('.ts') && hasJsx(f)).map((f) => relative(ROOT, f));
    expect(bad, 'JSX 가 있으니 .tsx 로 바꾼다').toEqual([]);
  });
});
