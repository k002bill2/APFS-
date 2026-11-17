/* 조합원정보조회 상세필터 — 모펀드가 숨은 행 속성 mf 로 실제로 거른다(2026-11-16 "미연동 필터 전부 동작").
   종전엔 연동 항목 0개라 External Filter 를 배선하지 않았다(미연동 캡션). */
import { describe, it, expect } from 'vitest';
import { readSrc } from '../../test_src';
import { memberPasses } from './member_info_manage';
import type { MemberRow } from './member_info_manage';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const SRC = strip(readSrc('member_info_manage.tsx'));

const row = (mf: string, id: string): MemberRow => ({ id, no: 1, name: 'x', biz: '', addr: '', tel: '', memo: '', ptype: '법인', region: '국내', mf });
const ROWS = [row('농식품모태펀드', 'a'), row('농식품모태펀드', 'b'), row('MOAF', 'c')];

describe('조합원정보조회 — 모펀드 필터', () => {
  it('기본(빈 값 = 전체)은 전 행 통과', () => {
    expect(ROWS.filter((r) => memberPasses(r, { mf: '' }))).toHaveLength(3);
  });
  it('모펀드를 고르면 그 값의 행만 남는다', () => {
    expect(ROWS.filter((r) => memberPasses(r, { mf: '농식품모태펀드' })).map((r) => r.id)).toEqual(['a', 'b']);
    expect(ROWS.filter((r) => memberPasses(r, { mf: 'MOAF' })).map((r) => r.id)).toEqual(['c']);
  });
  it('그리드 외부필터·선택 해제·적용 칩이 배선돼 있고 미연동 캡션이 없다', () => {
    expect(SRC).toContain('isExternalFilterPresent={isExternalFilterPresent}');
    expect(SRC).toContain('doesExternalFilterPass={doesExternalFilterPass}');
    expect(SRC).toMatch(/onFilterChanged\(\); apiRef\.current\?\.deselectAll\(\); \}, \[passes\]\)/);
    expect(SRC).toContain("{ label: '모펀드', value: fMf, onClear: () => setFMf('') }");
    expect(SRC).not.toContain('데이터 연동 후');
    expect(SRC).not.toMatch(/\bnoop\b/);
  });
  it('초기 행 0건(기본 상태 불변) — 데모 행을 새로 만들지 않는다', () => {
    expect(SRC).toContain('const DEMO: MemberRow[] = [];');
  });
});
