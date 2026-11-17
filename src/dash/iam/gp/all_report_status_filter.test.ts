/* 자펀드 전체 보고현황 — 계정구분이 숨은 행 속성 acc 로 실제로 거른다(2026-11-16 "미연동 필터 전부 동작").
   6개 표의 행이 전부 한 자펀드(현대동양 — 농식품 계정)라 '수산'은 0건이 정상이다. */
import { describe, it, expect } from 'vitest';
import { readSrc } from '../../test_src';
import { REPORT_TABS, filterRows } from './all_report_status_model';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const SRC = strip(readSrc('all_report_status.tsx'));
const none = { gp: '', subFund: '', acc: '', from: '', to: '', kw: '' };
const counts = (acc: string) => REPORT_TABS.map((t) => filterRows(t, { ...none, acc }).length);

describe('자펀드 전체 보고현황 — 계정구분 필터', () => {
  it('기본(전체)은 원문 행 수 그대로', () => {
    expect(counts('')).toEqual([1, 1, 1, 0, 12, 1]);
  });
  it('농식품 = 전 행, 수산 = 0건(한 자펀드의 거래라 계정이 하나)', () => {
    expect(counts('농식품')).toEqual([1, 1, 1, 0, 12, 1]);
    expect(counts('수산')).toEqual([0, 0, 0, 0, 0, 0]);
  });
  it('acc 는 숨은 속성이다 — 컬럼이 아니고 집계 행엔 싣지 않는다', () => {
    for (const t of REPORT_TABS) {
      expect(t.columns.map((c) => c.key), t.key).not.toContain('acc');
      for (const r of t.pinnedBottom ?? []) expect(r.acc, t.key).toBeUndefined();
    }
  });
  it('필터 상태·적용 칩에 계정구분이 들어가고 미연동 캡션이 없다', () => {
    expect(SRC).toMatch(/const filtered = [^;]*fAcc !== ''/);
    expect(SRC).toContain("['계정구분', fAcc, () => setFAcc('')]");
    expect(SRC).toMatch(/filterRows\(tab, \{ gp: fGp, subFund: fSubFund, acc: fAcc,/);
    expect(SRC).not.toContain('데이터 연동 후');
    expect(SRC).not.toMatch(/\bnoop\b/);
  });
});
