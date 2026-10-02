/* 그리드 정렬 규약 가드(2026-10-02 사용자 결정 — .claude/rules/frontend-design-defaults.md "표 정렬").
   금액·율·건수·수량 같은 숫자 = 우측, 그 외(No·차수·연도·날짜·코드·상태·텍스트) = 좌측. 가운데 정렬 없음.
   예외: 값이 아닌 컨트롤 열(선택 체크박스·아이콘 전용 액션 열)은 규약 밖이다.
   ① 스키마 주도 그리드(ALL_SCHEMAS) — resolveAlign 결과로 검사한다.
   ② 바스포크 그리드·직접 만든 <table> — 소스 패턴으로 검사한다(① 이 못 보는 화면). */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ALL_SCHEMAS } from './schemas';
import { resolveAlign } from './schemas/types';

const ORDINAL = /^(No|NO|순번|차수|회차)$/;

const cols = ALL_SCHEMAS.flatMap((s) => s.columns.map((c) => ({ route: s.route, ...c })));

describe('스키마 컬럼 정렬', () => {
  it("'center' 정렬 컬럼이 없다", () => {
    expect(cols.filter((c) => (c as { align?: string }).align === 'center').map((c) => `${c.route}:${c.label}`)).toEqual([]);
  });
  it('순번·차수는 좌측', () => {
    expect(cols.filter((c) => ORDINAL.test(c.label) && resolveAlign(c) !== 'left').map((c) => `${c.route}:${c.label}`)).toEqual([]);
  });
  it('금액·율 타입은 우측', () => {
    expect(cols.filter((c) => (c.type === 'amount' || c.type === 'rate') && resolveAlign(c) !== 'right').map((c) => `${c.route}:${c.label}`)).toEqual([]);
  });
  it('수량 아닌 타입(date·code·status·gp·pii)은 좌측', () => {
    const nonNum = new Set(['date', 'code', 'status', 'gp', 'pii']);
    expect(cols.filter((c) => nonNum.has(c.type) && resolveAlign(c) !== 'left').map((c) => `${c.route}:${c.label}`)).toEqual([]);
  });
});

const ROOT = new URL('.', import.meta.url).pathname;   // src/dash/
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
  });
}
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const SOURCES = walk(ROOT).filter((f) => !/\/(fields|ui)\//.test(f)).map((f) => ({ f: relative(ROOT, f), src: strip(readFileSync(f, 'utf8')) }));

describe('바스포크 그리드·표 정렬', () => {
  it('centerNum(가운데 숫자 셀 스타일)이 없다', () => {
    expect(SOURCES.filter(({ src }) => /\bcenterNum\b/.test(src)).map(({ f }) => f)).toEqual([]);
  });
  it("컬럼 메타에 align: 'center' 가 없다", () => {
    expect(SOURCES.filter(({ src }) => /\balign: *['"]center['"]/.test(src)).map(({ f }) => f)).toEqual([]);
  });
  it('AG Grid 컬럼 정의에 가운데 정렬 셀/헤더가 없다', () => {
    const re = /(cellStyle|headerStyle)\s*:\s*\{[^}]*textAlign:\s*['"]center['"]|(cellClass|headerClass)\s*:\s*['"][^'"]*(center)[^'"]*['"]/;
    expect(SOURCES.filter(({ src }) => re.test(src)).map(({ f }) => f)).toEqual([]);
  });
  it('<td>/<th> 에 가운데 정렬이 없다', () => {
    const re = /<t[dh]\b[^>]*(text-center|textAlign:\s*['"]center['"]|align=['"]center['"])/;
    expect(SOURCES.filter(({ src }) => re.test(src)).map(({ f }) => f)).toEqual([]);
  });
  it('순번(No) 컬럼이 우측 정렬되지 않는다', () => {
    const re = /headerName:\s*['"](No|NO|순번)['"][^}\n]*type:\s*['"]rightAligned['"]/;
    expect(SOURCES.filter(({ src }) => re.test(src)).map(({ f }) => f)).toEqual([]);
  });
});
