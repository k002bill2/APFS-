import { describe, it, expect } from 'vitest';
import { computeTotal } from '../../risk_table_meta';
import type { Row, TableMeta } from '../../risk_table_meta';
import { GP_VERIFY_TABLES, GP_VERIFY_PAGE_TABLES, GP_VERIFY_FUND, GP_VERIFY_BASE_YM, GP_VERIFY_PRIOR_YM } from './gp_verify_report_data';
import { GP_VERIFY_CONFIG } from './gp_verify_report';

/* 조합별 실물검증 결과 보고 — 자펀드·기준년월이 실제로 거른다(2026-11-16 "미연동 필터 전부 동작", 종전 no-op).
   TablesPage 행 필터(eq)를 재현해 (a) 기본 상태 = 원문 (b) 직전 월 = 다른 행·합계 를 확인한다. */

const hasKey = (t: TableMeta, k: string) => t.cols.some((c) => c.key === k) || t.rows.some((r) => r[k] !== undefined);
const vals = (over: Record<string, string> = {}) => ({ ...Object.fromEntries(GP_VERIFY_CONFIG.filters.map((f) => [f.label, f.def])), ...over });
const shownRows = (v: Record<string, string>): Row[][] => GP_VERIFY_CONFIG.tables.map((t) => t.rows.filter((r) =>
  GP_VERIFY_CONFIG.filters.every((f) => !v[f.label] || !f.key || !hasKey(t, f.key) || String(r[f.key]) === v[f.label])));
const strip = (rows: Row[]) => rows.map(({ fund: _f, ym: _y, ...r }) => r);

describe('검색조건 배선', () => {
  it('자펀드 = 숨은 키 fund · 기준년월 = 숨은 키 ym, 화면 표 = GP_VERIFY_PAGE_TABLES(컬럼은 원문 그대로)', () => {
    expect(GP_VERIFY_CONFIG.filters.map((f) => f.key)).toEqual(['fund', 'ym']);
    expect(GP_VERIFY_CONFIG.tables).toBe(GP_VERIFY_PAGE_TABLES);
    GP_VERIFY_PAGE_TABLES.forEach((t, i) => {
      expect(t.cols).toBe(GP_VERIFY_TABLES[i].cols);
      expect(t.rows.every((r) => r.fund === GP_VERIFY_FUND && typeof r.ym === 'string'), t.id).toBe(true);
      expect(new Set(t.rows.map((r) => r.id)).size, t.id).toBe(t.rows.length);
    });
  });
});

describe('기본 상태 = 원문(R0)', () => {
  it('표 3장 행·합계가 원문 그대로', () => {
    const shown = shownRows(vals());
    GP_VERIFY_TABLES.forEach((t, i) => {
      expect(strip(shown[i]), t.id).toEqual(t.rows);
      expect(computeTotal({ ...t, rows: shown[i] }), t.id).toEqual(computeTotal(t));
    });
  });
});

describe('값을 바꾸면 행·합계가 바뀐다', () => {
  it('직전 월 = 투자자산 4행(이엑스첼스케어 없음) · 미투자자산 잔액 다름', () => {
    const shown = shownRows(vals({ 기준년월: GP_VERIFY_PRIOR_YM }));
    expect(shown.map((r) => r.length)).toEqual([4, 0, 1]);
    expect(shown[0].map((r) => r.oCo)).not.toContain('이엑스첼스케어');
    expect(shown[0].map((r) => r.no)).toEqual([1, 2, 3, 4]);
    const [base, prior] = [computeTotal(GP_VERIFY_TABLES[0])!, computeTotal({ ...GP_VERIFY_TABLES[0], rows: shown[0] })!];
    expect(prior.oSh).toBe(Number(base.oSh) - 8333);
    expect(shown[2][0].oBal).not.toBe(GP_VERIFY_TABLES[2].rows[0].oBal);
  });
  it('데이터 없는 월 · 다른 자펀드 = 0건, 기준년월 비움 = 두 달 전부', () => {
    expect(shownRows(vals({ 기준년월: '2025-12' })).flat()).toEqual([]);
    expect(shownRows(vals({ 자펀드: '다른 자펀드' })).flat()).toEqual([]);
    expect(shownRows(vals({ 기준년월: '' })).map((r) => r.length)).toEqual([9, 0, 2]);
  });
  it('기본 기준년월은 원문 값', () => {
    expect(GP_VERIFY_CONFIG.filters.find((f) => f.key === 'ym')!.def).toBe(GP_VERIFY_BASE_YM);
  });
});
