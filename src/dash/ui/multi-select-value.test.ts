/* 다중 선택 값 계약(문자열 저장) — 스키마 폼 vals·상세필터 filterValues 가 둘 다 Record<string,string> 이라
   string[] 를 JSON 배열 문자열로 감싼다(tags 와 같은 계약, 빈 배열 = ''). */
import { describe, expect, it } from 'vitest';
import { parseMulti, joinMulti, formatMultiCell, multiSelectSummary, multiSelectSummaryParts } from './multi-select-value';

describe('parseMulti / joinMulti — JSON 배열 문자열 ↔ string[]', () => {
  it('빈 배열 = 빈 문자열(필수 검사 trim 이 비었다고 판정하고, 필터는 키째 빠져 비활성)', () => {
    expect(joinMulti([])).toBe('');
    expect(parseMulti('')).toEqual([]);
  });

  it('왕복 — 쉼표·괄호가 든 라벨도 깨지지 않는다', () => {
    const a = ['농식품계정', '수산계정, 특별', '(주)A'];
    expect(parseMulti(joinMulti(a))).toEqual(a);
  });

  it('JSON 배열이 아닌 문자열 = 값 1개(단일 select 컬럼 셀·문자열 def 를 그대로 받는다)', () => {
    expect(parseMulti('농식품계정')).toEqual(['농식품계정']);
    expect(parseMulti('[미완')).toEqual(['[미완']);
    expect(parseMulti('{"a":1}')).toEqual(['{"a":1}']);
  });

  it('숫자 셀·null 도 안전', () => {
    expect(parseMulti(12)).toEqual(['12']);
    expect(parseMulti(null)).toEqual([]);
    expect(parseMulti(undefined)).toEqual([]);
  });
});

describe('formatMultiCell — 그리드·엑셀 표시', () => {
  it('JSON 배열 문자열은 쉼표로 이어 보인다(원시 ["A","B"] 노출 금지)', () => {
    expect(formatMultiCell(joinMulti(['A', 'B']))).toBe('A, B');
  });
  it('그 외 값은 그대로', () => {
    expect(formatMultiCell('A')).toBe('A');
    expect(formatMultiCell('[A]')).toBe('[A]');
    expect(formatMultiCell('')).toBe('');
  });
});

describe('multiSelectSummary — 트리거·칩 요약(이 모듈로 옮겨도 계약 그대로)', () => {
  it('0개 emptyLabel · 1개 라벨 · 2개 이상 첫 라벨 외 N', () => {
    expect(multiSelectSummaryParts([], '전체')).toEqual({ head: '전체', rest: '' });
    expect(multiSelectSummary(['A'], '전체')).toBe('A');
    expect(multiSelectSummary(['A', 'B', 'C'], '전체')).toBe('A 외 2');
  });
});
