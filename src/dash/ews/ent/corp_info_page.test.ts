/* 기업정보 2리프(NICE평가정보·신용정보) — 기준일자·구분별 대상이 전부 행을 거른다(2026-11-16 미연동 필터 전부 동작).
   기본 상태(기준일자 2026-08-12 · 구분 운용사 · 대상 전체)는 탭마다 원문 행 전부(R0). */
import { describe, it, expect } from 'vitest';
import { corpRows, corpTargetOptions } from './corp_info_page';
import { NICE_TABS, CREDIT_TABS, CORP_BASE_DATE, GUBUN_OPTIONS } from './risk_corp_info_data';
import { readSrc } from '../../test_src';

const TABS = [...NICE_TABS, ...CREDIT_TABS];
const DEFAULT = { date: CORP_BASE_DATE, gubun: '운용사' as const, target: '' };
/** 원문 행 수(risk_pages_17 출처 대조표와 같은 값) */
const ROWS: Record<string, number> = { overview: 1, sites: 5, court: 6, credit: 4, cashflow: 4 };

describe('기업정보 — 기본 상태 불변', () => {
  it.each(TABS.map((t) => [t.id, t] as const))('%s: 기본 조건이면 원문 행 전부', (id, tab) => {
    expect(corpRows(tab, DEFAULT)).toHaveLength(ROWS[id]);
    expect(corpRows(tab, { ...DEFAULT, gubun: '자펀드' })).toHaveLength(ROWS[id]);
  });
  it.each(TABS.map((t) => [t.id, t] as const))('%s: 기준일자 키는 전 행이 날짜이고 기본 기준일자 이전', (_id, tab) => {
    for (const r of tab.table.rows) {
      expect(String(r[tab.dateKey]), `${tab.id}.${tab.dateKey}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(String(r[tab.dateKey]) <= CORP_BASE_DATE).toBe(true);
    }
  });
  it('숨은 키는 그리드 컬럼이 아니다(컬럼을 늘리지 않는다)', () => {
    for (const tab of TABS) {
      expect(tab.table.cols.some((c) => c.key === tab.gpKey), tab.id).toBe(false);
      if (tab.id === 'sites') expect(tab.table.cols.some((c) => c.key === tab.fundKey)).toBe(false);
    }
  });
});

describe('기업정보 — 대상(구분별)', () => {
  it.each(TABS.flatMap((t) => GUBUN_OPTIONS.map((g) => [t.id, g, t] as const)))('%s · %s: 선택지마다 그 값을 가진 행만 남고, 모든 선택지가 1행 이상', (_id, gubun, tab) => {
    const opts = corpTargetOptions(tab, gubun);
    expect(opts.length).toBeGreaterThan(0);
    const key = gubun === '자펀드' ? tab.fundKey : tab.gpKey;
    for (const o of opts) {
      const rows = corpRows(tab, { ...DEFAULT, gubun, target: o });
      expect(rows.length, `${tab.id} ${gubun}=${o}`).toBeGreaterThan(0);
      expect(rows.every((r) => r[key] === o)).toBe(true);
    }
  });
  it('원문 표본은 지우지 않는다 — 선택지 = 원문 표본 ∪ 행 값(원문 순서가 앞)', () => {
    for (const tab of TABS) for (const g of GUBUN_OPTIONS) {
      expect(corpTargetOptions(tab, g).slice(0, tab.targets[g].length), `${tab.id} ${g}`).toEqual(tab.targets[g]);
    }
  });
  it('운용사 대상이 실제로 줄인다(법정관리 6행 → 농심캐피탈 2행)', () => {
    const court = NICE_TABS.find((t) => t.id === 'court')!;
    expect(corpRows(court, { ...DEFAULT, target: '농심캐피탈' }).map((r) => r.co)).toEqual(['농우식품(주)', '(주)미래팜']);
  });
  it('사업장정보의 자펀드는 숨은 키 fund — 같은 투자기업 사업장은 같은 자펀드', () => {
    const sites = NICE_TABS.find((t) => t.id === 'sites')!;
    expect(corpRows(sites, { ...DEFAULT, gubun: '자펀드', target: '케이비 농식품투자조합' }).map((r) => r.comp)).toEqual(['(주)장수채', '(주)장수채']);
  });
  it('운용사 표본이 빈 탭(신용등급)도 행 값으로 선택지를 만든다 — 같은 화면 현금흐름등급 탭의 짝(세종R&D→KB증권)을 따른다', () => {
    const credit = CREDIT_TABS.find((t) => t.id === 'credit')!;
    const cash = CREDIT_TABS.find((t) => t.id === 'cashflow')!;
    expect(credit.targets.운용사).toEqual([]);
    expect(corpTargetOptions(credit, '운용사')).toEqual(['KB증권', 'IMM인베스트먼트']);
    const gpOf = (tab: typeof credit, fund: string) => tab.table.rows.find((r) => r[tab.fundKey] === fund)?.gp;
    expect(gpOf(credit, '세종R&D(20150828)')).toBe(gpOf(cash, '세종R&D(20150828)'));
  });
});

describe('기업정보 — 기준일자(조회 시점)', () => {
  it('기준일자를 앞당기면 그 뒤 날짜 행이 빠진다', () => {
    const court = NICE_TABS.find((t) => t.id === 'court')!;
    expect(corpRows(court, { ...DEFAULT, date: '2019-12-31' }).map((r) => r.dt)).toEqual(['2016-10-12', '2017-03-08', '2018-05-21', '2019-11-04']);
    const cash = CREDIT_TABS.find((t) => t.id === 'cashflow')!;
    expect(corpRows(cash, { ...DEFAULT, date: '2023-12-30' })).toHaveLength(1);
    const overview = NICE_TABS.find((t) => t.id === 'overview')!;
    expect(corpRows(overview, { ...DEFAULT, date: '2002-12-31' })).toHaveLength(0);
  });
  it('빈 기준일자(× 해제) = 전부', () => {
    for (const tab of TABS) expect(corpRows(tab, { ...DEFAULT, date: '' })).toHaveLength(ROWS[tab.id]);
  });
});

describe('기업정보 — 미연동 캡션 제거', () => {
  it('화면·데이터 소스에 noop 이 없다', () => {
    expect(readSrc('corp_info_page.tsx')).not.toMatch(/noop/);
    expect(readSrc('risk_corp_info_data.ts')).not.toMatch(/noop|no-op/);
  });
});
