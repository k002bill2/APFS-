/* 가치평가 표 조회(TablesPage 설정) — 자펀드 투자자산·예외사항레포트·Portfolio Report 의 미연동 검색조건이
   행을 거른다(2026-11-16 미연동 필터 전부 동작). 기본값에선 원문 행 그대로(R0).

   TablesPage(risk_tables_page.tsx)의 거르기 규칙(행 키가 있는 표만 · eq/prefix/asOf)은 export 되지 않아 아래 apply 로 옮겨 쓴다.
   옮긴 규칙이 원본과 갈라지지 않게 원본 소스의 해당 줄을 함께 단언한다. */
import { describe, it, expect } from 'vitest';
import { ASSET_TX_PAGE, EXCEPTION, PORTFOLIO, PREV_YM } from './valuation_table_pages';
import type { TablesPageConfig, FilterDef } from '../../risk_tables_page';
import type { TableMeta, Row } from '../../risk_table_meta';
import { computeTotal } from '../../risk_table_meta';
import { onOrBefore } from '../../schemas/filter_field';
import {
  ASSET_BALANCE, ASSET_TX, ASSET_TX_FUNDS, ASSET_TX_BASE_DATE, EVAL_BASE_YM, EXC_TABLES, PORTFOLIO_TABLES, PORTFOLIO_FUNDS,
} from './risk_valuation_data';
import { readSrc } from '../../test_src';

/* ── TablesPage 거르기 규칙 사본 ── */
const hasKey = (t: TableMeta, k: string) => t.cols.some((c) => c.key === k) || t.rows.some((r) => r[k] !== undefined);
const matches = (f: FilterDef, v: string, r: Row) => {
  const cell = r[f.key!];
  if (cell == null) return false;
  if (f.mode === 'asOf') return onOrBefore(cell, v);
  return f.mode === 'prefix' ? String(cell).startsWith(v) : String(cell) === v;
};
const apply = (cfg: TablesPageConfig, over: Record<string, string> = {}): Row[][] => {
  const vals = { ...Object.fromEntries(cfg.filters.map((f) => [f.label, f.def])), ...over };
  return cfg.tables.map((t) => t.rows.filter((r) => cfg.filters.every((f) => {
    const v = vals[f.label];
    if (!v || !f.key || !hasKey(t, f.key)) return true;
    return matches(f, v, r);
  })));
};
const live = (cfg: TablesPageConfig, f: FilterDef) => !!f.key && cfg.tables.some((t) => hasKey(t, f.key!));
const strip = (r: Row, keys: string[]) => Object.fromEntries(Object.entries(r).filter(([k]) => !keys.includes(k)));

describe('TablesPage 거르기 규칙 사본 = 원본', () => {
  it('risk_tables_page.tsx 의 hasKey · asOf · eq/prefix · live 판정 줄이 그대로다', () => {
    const src = readSrc('risk_tables_page.tsx');
    expect(src).toContain('const hasKey = (t: TableMeta, k: string) => t.cols.some((c) => c.key === k) || t.rows.some((r) => r[k] !== undefined);');
    expect(src).toContain("if (f.mode === 'asOf') return onOrBefore(cell, v);");
    expect(src).toContain("return f.mode === 'prefix' ? String(cell).startsWith(v) : String(cell) === v;");
    expect(src).toContain('if (!v || !f.key || !hasKey(t, f.key)) return true;');
    expect(src).toContain('const live = (f: FilterDef) => !!f.key && cfg.tables.some((t) => hasKey(t, f.key!));');
    expect(src).toContain('noop: !live(f)');
  });
});

describe('세 화면 — 모든 검색조건이 연동(미연동 캡션 없음)', () => {
  it.each([['자펀드 투자자산', ASSET_TX_PAGE], ['예외사항레포트', EXCEPTION], ['Portfolio Report', PORTFOLIO]] as const)('%s', (_n, cfg) => {
    for (const f of cfg.filters) expect(live(cfg, f), f.label).toBe(true);
  });
});

describe('자펀드 투자자산 및 거래내역 조회', () => {
  it('기본 상태 = 원문 두 표 행 그대로', () => {
    const [bal, tx] = apply(ASSET_TX_PAGE);
    expect(bal.map((r) => strip(r, ['fund']))).toEqual(ASSET_BALANCE.rows);
    expect(tx.map((r) => strip(r, ['fund']))).toEqual(ASSET_TX.rows);
  });
  it('자펀드(숨은 키 fund) — 원문 선택지마다 1행 이상, 다른 자펀드 행은 빠진다', () => {
    const a = apply(ASSET_TX_PAGE, { 자펀드: ASSET_TX_FUNDS[0] });
    expect(a.map((rs) => rs.length)).toEqual([1, 0]);
    const b = apply(ASSET_TX_PAGE, { 자펀드: ASSET_TX_FUNDS[1] });
    expect(b.map((rs) => rs.length)).toEqual([0, 1]);
  });
  it('조회일자(asOf dt) — 일자가 조회일자 뒤인 행이 빠진다', () => {
    expect(ASSET_TX_BASE_DATE).toBe('2026-07-01');
    expect(apply(ASSET_TX_PAGE, { 조회일자: '2023-01-01' }).map((rs) => rs.length)).toEqual([1, 0]);
    expect(apply(ASSET_TX_PAGE, { 조회일자: '2022-01-01' }).map((rs) => rs.length)).toEqual([0, 0]);
  });
});

describe('예외사항레포트', () => {
  it('기본 평가년월 = 원문 4표 행 그대로(②는 0건)', () => {
    const got = apply(EXCEPTION);
    got.forEach((rs, i) => expect(rs.map((r) => strip(r, ['ym'])), EXC_TABLES[i].id).toEqual(EXC_TABLES[i].rows));
  });
  it('직전 분기 = 그 시점 더미 행으로 바뀐다(②는 원문처럼 0건)', () => {
    const got = apply(EXCEPTION, { 평가년월: PREV_YM });
    expect(got.map((rs) => rs.length)).toEqual([1, 0, 1, 1]);
    for (const rs of got) for (const r of rs) expect(r.ym).toBe(PREV_YM);
    const ids = EXC_TABLES.flatMap((t) => t.rows.map((r) => r.id));
    for (const rs of got) for (const r of rs) expect(ids).not.toContain(r.id);
  });
  it('평가분이 없는 달은 0건', () => {
    expect(apply(EXCEPTION, { 평가년월: '2025-11' }).map((rs) => rs.length)).toEqual([0, 0, 0, 0]);
  });
});

describe('Portfolio Report', () => {
  it('기본(자펀드 고정 · 평가년월 2025-12) = 원문 3표 행 그대로 · ③ 합계 동일', () => {
    const got = apply(PORTFOLIO);
    got.forEach((rs, i) => expect(rs.map((r) => strip(r, i === 0 ? [] : ['fn', 'ym'])), PORTFOLIO_TABLES[i].id).toEqual(PORTFOLIO_TABLES[i].rows));
    expect(computeTotal({ ...PORTFOLIO_TABLES[2], rows: got[2] })).toEqual(computeTotal(PORTFOLIO_TABLES[2]));
  });
  it('세 표 모두 자펀드·평가년월 키를 가진다(시점이 섞이지 않게)', () => {
    for (const t of PORTFOLIO.tables) for (const k of ['fn', 'ym']) expect(hasKey(t, k), `${t.id}.${k}`).toBe(true);
    expect(PORTFOLIO.tables.every((t) => t.rows.every((r) => r.fn === PORTFOLIO_FUNDS[0]))).toBe(true);
  });
  it('직전 분기 = 세 표 모두 그 시점 더미 행 · ③ 합계가 바뀐다', () => {
    const got = apply(PORTFOLIO, { 평가년월: PREV_YM });
    expect(got.map((rs) => rs.length)).toEqual([1, 1, 1]);
    expect(got[0][0].ym).toBe(PREV_YM);
    expect(computeTotal({ ...PORTFOLIO_TABLES[2], rows: got[2] })!.d).not.toBe(computeTotal(PORTFOLIO_TABLES[2])!.d);
  });
  it('원문 행은 바뀌지 않는다(입력 불변) · 기본 평가년월 상수', () => {
    expect(EVAL_BASE_YM).toBe('2025-12');
    expect(PORTFOLIO_TABLES[1].rows[0].ym).toBeUndefined();
    expect(EXC_TABLES[0].rows[0].ym).toBeUndefined();
  });
});
