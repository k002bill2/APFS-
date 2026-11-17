import { describe, it, expect } from 'vitest';
import { computeTotal } from '../../risk_table_meta';
import type { Row, TableMeta } from '../../risk_table_meta';
import type { TablesPageConfig } from '../../risk_tables_page';
import {
  FUND_CODE_TABLE, FUND_CODE_ORGS, fundCodeRows, PHYSICAL_TABLE, SECURITIES_TABLE, PHYSICAL_BASE_YM, BIG_OPTIONS, MID_OPTIONS,
  physicalRows, rowOptions, VERIFY_TABLES, VERIFY_PAGE_TABLES, VERIFY_FUND, VERIFY_BASE_YM, VERIFY_PRIOR_YM, VERIFY_INVEST_TOTAL,
} from '../trust_sub_data';
import type { PhysicalCond } from '../trust_sub_data';
import { VERIFY, SECURITIES_COMPARE_PAGE } from './trust_sub_table_pages';

/* 수탁보고 > 자펀드 수탁 — 미연동 캡션이 붙어 있던 검색조건이 실제로 거른다(2026-11-16 사용자 지시).
   (a) 기본 상태 행 수·합계가 종전과 같다 (b) 값을 바꾸면 행·합계가 바뀐다. */

describe('자펀드코드 조회 — 수탁기관(숨은 키 org)', () => {
  it('4행 모두 원문 옵션 농협중앙회 → 기본값이 행을 줄이지 않는다', () => {
    expect(FUND_CODE_TABLE.rows.every((r) => r.org === FUND_CODE_ORGS[0])).toBe(true);
    expect(fundCodeRows(FUND_CODE_TABLE.rows, FUND_CODE_ORGS[0])).toEqual(FUND_CODE_TABLE.rows);
  });
  it('다른 수탁기관이면 0건 · 빈 값이면 전 행', () => {
    expect(fundCodeRows(FUND_CODE_TABLE.rows, '하나은행')).toEqual([]);
    expect(fundCodeRows(FUND_CODE_TABLE.rows, '')).toHaveLength(FUND_CODE_TABLE.rows.length);
  });
  it('그리드 컬럼은 늘리지 않는다(org 는 숨은 키)', () => {
    expect(FUND_CODE_TABLE.cols.some((c) => c.key === 'org')).toBe(false);
  });
});

describe('실물자료관리(업로드) — 운용사(숨은 키 gp)·조합(union)', () => {
  const DEF: PhysicalCond = { gp: '', union: '', ym: PHYSICAL_BASE_YM, big: '', mid: '' };
  it('기본 조건 = 종전 결과(원문 1행)', () => {
    expect(physicalRows(PHYSICAL_TABLE.rows, DEF)).toEqual(PHYSICAL_TABLE.rows);
  });
  it('선택지 = 행의 실제 값(원문 옵션 없음) · 유가증권관리는 행이 없어 비어 있다', () => {
    expect(rowOptions(PHYSICAL_TABLE.rows, 'gp')).toEqual(['KB인베스트먼트']);
    expect(rowOptions(PHYSICAL_TABLE.rows, 'union')).toEqual(['KB신농사직설 투자조합']);
    expect(rowOptions(SECURITIES_TABLE.rows, 'gp')).toEqual([]);
    expect(PHYSICAL_TABLE.cols.some((c) => c.key === 'gp')).toBe(false);
  });
  it('운용사·조합 — 같은 값만 통과, 다른 값이면 0건', () => {
    expect(physicalRows(PHYSICAL_TABLE.rows, { ...DEF, gp: 'KB인베스트먼트' })).toHaveLength(1);
    expect(physicalRows(PHYSICAL_TABLE.rows, { ...DEF, gp: '한국투자파트너스' })).toEqual([]);
    expect(physicalRows(PHYSICAL_TABLE.rows, { ...DEF, union: 'KB신농사직설 투자조합' })).toHaveLength(1);
    expect(physicalRows(PHYSICAL_TABLE.rows, { ...DEF, union: '다른 투자조합' })).toEqual([]);
  });
  it('기준월·대분류·중분류(종전 동작 유지)', () => {
    expect(physicalRows(PHYSICAL_TABLE.rows, { ...DEF, ym: '2026-06' })).toEqual([]);
    expect(physicalRows(PHYSICAL_TABLE.rows, { ...DEF, big: BIG_OPTIONS[1] })).toHaveLength(1);   // [B] 채권
    expect(physicalRows(PHYSICAL_TABLE.rows, { ...DEF, big: BIG_OPTIONS[0] })).toEqual([]);
    expect(physicalRows(PHYSICAL_TABLE.rows, { ...DEF, mid: MID_OPTIONS[10] })).toHaveLength(1);  // [B2] 신주인수권부사채
  });
});

/* TablesPage 행 필터(eq) 재현 — 키를 가진 표(컬럼·시드 행)만, 빈 값은 통과 */
const hasKey = (t: TableMeta, k: string) => t.cols.some((c) => c.key === k) || t.rows.some((r) => r[k] !== undefined);
const shownRows = (cfg: TablesPageConfig, vals: Record<string, string>): Row[][] => cfg.tables.map((t) => t.rows.filter((r) =>
  cfg.filters.every((f) => !vals[f.label] || !f.key || !hasKey(t, f.key) || String(r[f.key]) === vals[f.label])));
const defaults = (cfg: TablesPageConfig) => Object.fromEntries(cfg.filters.map((f) => [f.label, f.def]));
const strip = (rows: Row[]) => rows.map(({ fund: _f, ym: _y, ...r }) => r);

describe('실물검증비교조회 — 자펀드(fund)·기준년월(ym)', () => {
  it('검색조건이 숨은 키에 배선돼 있고 화면 표 = VERIFY_PAGE_TABLES', () => {
    expect(VERIFY.filters.map((f) => f.key)).toEqual(['fund', 'ym']);
    expect(VERIFY.filters.map((f) => f.def)).toEqual([VERIFY_FUND, VERIFY_BASE_YM]);
    expect(VERIFY.tables).toBe(VERIFY_PAGE_TABLES);
    for (const t of VERIFY_PAGE_TABLES) {
      expect(t.rows.every((r) => r.fund === VERIFY_FUND && typeof r.ym === 'string'), t.id).toBe(true);
      expect(new Set(t.rows.map((r) => r.id)).size, t.id).toBe(t.rows.length);
      expect(t.cols.map((c) => c.key), t.id).toEqual(VERIFY_TABLES.find((x) => x.id === t.id)!.cols.map((c) => c.key));
    }
  });
  it('기본 상태 = 원문 3장 행·합계 그대로(투자자산 합계는 원문 리터럴)', () => {
    const shown = shownRows(VERIFY, defaults(VERIFY));
    VERIFY_TABLES.forEach((t, i) => {
      expect(strip(shown[i]), t.id).toEqual(t.rows);
      expect(computeTotal({ ...VERIFY_PAGE_TABLES[i], rows: shown[i] }), t.id).toEqual(computeTotal(t));
    });
    expect(computeTotal({ ...VERIFY_PAGE_TABLES[0], rows: shown[0] })!.oSh).toBe(VERIFY_INVEST_TOTAL.shares);
  });
  it('직전 월을 고르면 그 월 행으로 바뀌고 합계는 보이는 행 합', () => {
    const shown = shownRows(VERIFY, { ...defaults(VERIFY), 기준년월: VERIFY_PRIOR_YM });
    expect(shown.map((r) => r.length)).toEqual([1, 0, 1]);
    expect(shown.flat().every((r) => r.ym === VERIFY_PRIOR_YM)).toBe(true);
    const inv = computeTotal({ ...VERIFY_PAGE_TABLES[0], rows: shown[0] })!;
    expect([inv.oSh, inv.oBal]).toEqual([shown[0][0].oSh, shown[0][0].oBal]);
    expect(computeTotal({ ...VERIFY_PAGE_TABLES[2], rows: shown[2] })!.oBal).not.toBe(computeTotal(VERIFY_TABLES[2])!.oBal);
  });
  it('데이터가 없는 월 = 0건(합계 0) · 다른 자펀드 = 0건', () => {
    const none = shownRows(VERIFY, { ...defaults(VERIFY), 기준년월: '2025-01' });
    expect(none.flat()).toEqual([]);
    expect(computeTotal({ ...VERIFY_PAGE_TABLES[0], rows: [] })!.oSh).toBe(0);
    expect(shownRows(VERIFY, { ...defaults(VERIFY), 자펀드: '다른 자펀드' }).flat()).toEqual([]);
  });
});

describe('유가증권비교조회 — 원천 행 0건(판단 보류: 키만 배선)', () => {
  it('키는 형제와 같은 fund·ym, 표는 0행이라 TablesPage 가 미연동 캡션을 유지한다', () => {
    expect(SECURITIES_COMPARE_PAGE.filters.map((f) => f.key)).toEqual(['fund', 'ym']);
    expect(SECURITIES_COMPARE_PAGE.tables.every((t) => t.rows.length === 0)).toBe(true);
    expect(SECURITIES_COMPARE_PAGE.tables.some((t) => hasKey(t, 'fund') || hasKey(t, 'ym'))).toBe(false);
  });
});
