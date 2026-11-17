/* 자펀드 수탁관리(실물검증) 기준일 — 2026-11-16 사용자 지시(미연동 필터 전부 동작).
   종전엔 기준일이 미연동 캡션만 달고 행을 거르지 않았다(메모 팝업 기준일자 시드로만 쓰였다).
   대사 결과는 그 시점 값 한 벌(스냅샷)이라 숨은 행 속성 asOf 가 **같은 날**인 행만 남긴다(atBaseDate).
   - 기본 기준일(BASE_DATE)은 원문 1행 그대로(R0) · 직전 시점(2026-03-31) 더미 1행은 기본에선 걸러진다. */
import { describe, expect, it } from 'vitest';
import { readSrc, panelSrc } from '../../test_src';
import { BASE_DATE, INVEST_DEMO, atBaseDate } from './custody_verify_manage';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const SRC = strip(readSrc('custody_verify_manage.tsx'));

describe('기준일 = 대사 스냅샷 시점(같은 날)', () => {
  it('기본 기준일은 원문 1행 그대로다(값도 원문 — 잔액 불일치)', () => {
    expect(BASE_DATE).toBe('2026-04-30');
    const rows = atBaseDate(INVEST_DEMO, BASE_DATE);
    expect(rows.map((r) => r.id)).toEqual(['cv-i1']);
    expect(rows[0]).toMatchObject({ fn: '유니 수산식품 투자조합1호', gpPrin: 2_500_000_000, gpImpair: 2_500_000_000, gpBal: 0, cuBal: 2_500_000_000, matchBal: '불일치' });
  });

  it('직전 시점을 고르면 그 시점 대사(감액 전 → 일치)로 바뀌고, 대사가 없는 날은 0건', () => {
    const prev = atBaseDate(INVEST_DEMO, '2026-03-31');
    expect(prev.map((r) => r.id)).toEqual(['cv-i1-2603']);
    expect(prev[0]).toMatchObject({ fn: '유니 수산식품 투자조합1호', gpImpair: 0, gpBal: 2_500_000_000, cuBal: 2_500_000_000, matchBal: '일치' });
    expect(atBaseDate(INVEST_DEMO, '2026-04-29')).toEqual([]);
  });

  it('더미 행은 id 가 고유하고(메모·수정이 id 로 찾는다) 자펀드명이 같아 자펀드 선택지가 늘지 않는다', () => {
    expect(new Set(INVEST_DEMO.map((r) => r.id)).size).toBe(INVEST_DEMO.length);
    expect(new Set(INVEST_DEMO.map((r) => r.fn)).size).toBe(1);
  });

  it('세 섹션 모두 기준일로 거르고, 칩은 늘 보이며 ×·[초기화]는 기본 기준일로 되돌린다(custody_confirm 관례)', () => {
    expect(SRC).toMatch(/atBaseDate\(invest, fAsOf\)/);
    expect(SRC).toMatch(/atBaseDate\(trade, fAsOf\)/);
    expect(SRC).toMatch(/atBaseDate\(nonInvest, fAsOf\)/);
    expect(SRC).toMatch(/\{ label: '기준일', value: fAsOf, onClear: fAsOf !== BASE_DATE \? \(\) => setFAsOf\(BASE_DATE\) : undefined \}/);   // 기본값이어도 칩 상시, × 는 기본값과 다를 때만(2026-11-17 사용자 결정 (a))
    expect(SRC).toMatch(/const clearFilters = \(\) => \{ setFFund\(''\); setFAsOf\(BASE_DATE\); setFItem\(''\); \};/);
    expect(SRC).toMatch(/<FilterPanel label="[^"]+" onReset=\{clearFilters\}>/);   // [초기화] = 기본 기준일 복원
    expect(SRC).toMatch(/onChange=\{\(v\) => setFAsOf\(v \|\| BASE_DATE\)\}/);
    expect(panelSrc(SRC)).toMatch(/<PanelPeriod label="기준일" mode="day"/);
    expect(SRC).not.toMatch(/noop/);
  });
});
