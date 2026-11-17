/* IRR 3리프 — 평가년월이 스냅샷(같은 값)으로 행을 거른다(2026-11-16 미연동 필터 전부 동작).
   원문 행 = 기본 평가년월, 직전 분기 더미 행은 기본 상태에서 걸러져 행 수·합계가 종전과 같다(R0). */
import { describe, it, expect } from 'vitest';
import { irrRows, CONTRACT, INVESTEE, FUND, PREV_YM } from './irr_pages';
import type { IrrConfig } from './irr_pages';
import { EVAL_BASE_YM } from './risk_valuation_data';
import { computeTotal } from '../../risk_table_meta';
import { readSrc } from '../../test_src';

const CFGS: [string, IrrConfig][] = [['계약별', CONTRACT], ['투자기업별', INVESTEE], ['자펀드별', FUND]];
const def = (cfg: IrrConfig) => ({ fund: cfg.defaultFund, co: '', ym: EVAL_BASE_YM });

describe('IRR — 기본 상태 불변', () => {
  it.each(CFGS)('%s: 기본 조건 = 원문 행 그대로(값 동일 · 합계 동일)', (_n, cfg) => {
    const rows = irrRows(cfg.rows, def(cfg));
    expect(rows).toHaveLength(cfg.table.rows.length);
    rows.forEach((r, i) => expect({ ...r, ym: undefined }).toEqual({ ...cfg.table.rows[i], ym: undefined }));
    if (cfg.table.totalLabel) expect(computeTotal({ ...cfg.table, rows })).toEqual(computeTotal(cfg.table));
  });
  it.each(CFGS)('%s: 행 id 유일 · 원문 table.rows 는 그대로(열 폭 산정용)', (_n, cfg) => {
    expect(new Set(cfg.rows.map((r) => r.id)).size).toBe(cfg.rows.length);
    expect(cfg.table.rows.every((r) => r.ym === undefined)).toBe(true);
  });
});

describe('IRR — 평가년월(스냅샷)', () => {
  it.each(CFGS)('%s: 직전 분기를 고르면 그 시점 더미 행으로 바뀐다(같은 자펀드 — 고정 기본 자펀드에서도 보인다)', (_n, cfg) => {
    const prev = irrRows(cfg.rows, { ...def(cfg), ym: PREV_YM });
    expect(prev).toHaveLength(1);
    expect(prev[0].ym).toBe(PREV_YM);
    expect(prev[0].fund).toBe(cfg.defaultFund);
    expect(prev[0].id).not.toBe(cfg.table.rows[0].id);
  });
  it.each(CFGS)('%s: 평가분이 없는 달은 0건, 빈 값(× 해제)은 전 시점', (_n, cfg) => {
    expect(irrRows(cfg.rows, { ...def(cfg), ym: '2025-11' })).toHaveLength(0);
    expect(irrRows(cfg.rows, { ...def(cfg), ym: '' })).toHaveLength(cfg.rows.length);
  });
  it('투자기업별: 직전 분기 더미도 투자기업 선택지(셀미트(주))로 걸린다 · 평가금액이 다르다', () => {
    const prev = irrRows(INVESTEE.rows, { ...def(INVESTEE), co: '셀미트(주)', ym: PREV_YM });
    expect(prev).toHaveLength(1);
    expect(prev[0].ev).not.toBe(INVESTEE.table.rows[0].ev);
  });
});

describe('IRR — 미연동 캡션 제거', () => {
  it('화면 소스에 noop 플래그가 없다', () => {
    expect(readSrc('irr_pages.tsx')).not.toMatch(/noop/);
  });
});
