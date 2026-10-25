/* 투자금 회수현황 필터 — 원문 검색박스(운용사·자펀드·계정구분·기준일자) 판정 회귀 가드. */
import { describe, it, expect } from 'vitest';
import { filterRecovery, RECOVERY_ACCOUNTS, DETAIL_ROWS_IR, DETAIL_ROWS_ALL } from './invest_recovery_detail_model';

const none = { gp: '', fund: '', acc: '', from: '', to: '' };

describe('filterRecovery', () => {
  it('조건이 비면 전 행을 그대로 돌려준다', () => {
    expect(filterRecovery(DETAIL_ROWS_IR, none)).toHaveLength(DETAIL_ROWS_IR.length);
    expect(filterRecovery(DETAIL_ROWS_ALL, none)).toHaveLength(DETAIL_ROWS_ALL.length);
  });
  it('계정구분 도메인은 원문 chipGroup 그대로(농식품·수산)', () => {
    expect(RECOVERY_ACCOUNTS).toEqual(['농식품', '수산']);
  });
  it('계정구분 수산은 0건, 농식품은 전건', () => {
    expect(filterRecovery(DETAIL_ROWS_IR, { ...none, acc: '수산' })).toHaveLength(0);
    expect(filterRecovery(DETAIL_ROWS_IR, { ...none, acc: '농식품' })).toHaveLength(DETAIL_ROWS_IR.length);
  });
  it('기준일자는 거래일자 기준 양끝 포함 범위', () => {
    const r = filterRecovery(DETAIL_ROWS_IR, { ...none, from: '2017-11-28', to: '2017-11-28' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.tdate === '2017-11-28')).toBe(true);
    expect(filterRecovery(DETAIL_ROWS_IR, { ...none, from: '2030-01-01' })).toHaveLength(0);
    expect(filterRecovery(DETAIL_ROWS_IR, { ...none, to: '2000-01-01' })).toHaveLength(0);
  });
  it('운용사·자펀드는 정확일치, 없는 값이면 0건', () => {
    expect(filterRecovery(DETAIL_ROWS_IR, { ...none, gp: 'NH투자증권' })).toHaveLength(DETAIL_ROWS_IR.length);
    expect(filterRecovery(DETAIL_ROWS_IR, { ...none, gp: 'NH' })).toHaveLength(0);
    expect(filterRecovery(DETAIL_ROWS_IR, { ...none, fund: 'x' })).toHaveLength(0);
  });
});
