/* 툴바 기본 칩 무리 → 드롭다운 칩 하나 규칙(2026-11-13 사용자 "모두" — 범위 "전체 있는 필터 칩만").
   GridFrame `filterChips` 에 '전체' 칩이 있는 **단일 선택 필터**는 `filterChipsMenu="항목명"` 으로 접고, 'all' 칩 label 은
   값만('전체') 넘긴다 — 트리거가 `항목명: 현재값 ▾` 로 항목명을 보여 준다(applied_filters FilterChipMenu).
   대상 아님(칩 그대로):
   - 보기 전환 칩 — '전체'·항목명이 없다(경영형태별·분야별, 재무상태표·손익계산서* 등). 키가 'all' 로 끝나지 않아 아래 패턴에 안 걸린다.
   - 조기경보 등급 — 여러 개를 함께 켜는 복수 선택이라 단일 선택 메뉴(menuitemradio)와 맞지 않는다(MULTI_OK). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { walkDash } from './test_src';

const MULTI_OK = ['early_warning_manage.tsx'];
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const pages = walkDash()
  .filter((f) => /\.tsx$/.test(f) && !/\.test\./.test(f) && !MULTI_OK.includes(basename(f)))
  .map((f) => ({ name: basename(f), src: strip(readFileSync(f, 'utf8')) }))
  .filter(({ src }) => /filterChips=|FilterChipItem\[\]/.test(src));

describe('툴바 기본 필터 칩 = 드롭다운 칩 하나', () => {
  it("'항목명: 전체' 칩을 넘기는 화면이 없다(항목명은 filterChipsMenu 로)", () => {
    const hits = pages.filter(({ src }) => /['"`][^'"`\n]{1,12}: 전체['"`]/.test(src)).map((p) => p.name);
    expect(hits).toEqual([]);
  });

  it("'전체' 칩(key … || 'all')이 있는 화면은 filterChipsMenu 를 넘긴다", () => {
    const hits = pages.filter(({ src }) => /\|\|\s*'all'/.test(src) && !/filterChipsMenu=/.test(src)).map((p) => p.name);
    expect(hits).toEqual([]);
  });

  it('대상 화면이 실제로 잡힌다(가드가 0건으로 조용히 통과하지 않게)', () => {
    expect(pages.filter(({ src }) => /\|\|\s*'all'/.test(src)).length).toBeGreaterThanOrEqual(18);
  });
});
