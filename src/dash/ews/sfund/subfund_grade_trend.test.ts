/* 자펀드 종합등급 변동 조회 — 모펀드·기준년도가 표·도넛·엑셀 데이터를 바꾼다(2026-11-16 미연동 필터 전부 동작).
   기본 상태(농식품모태펀드 · 2025)는 원문 표 객체 그대로(R0). */
import { describe, it, expect } from 'vitest';
import { gradeView, gradeYears, MOAF_RATIO } from './subfund_grade_trend';
import { FUND_GRADE, MGR_GRADE, GRADE_YEARS, GRADE_BASE_YEAR, MF_OPTIONS, FUND_NORMAL, MGR_NORMAL, yearKey } from './risk_subfund_info_data';
import { computeTotal, type TableMeta } from '../../risk_table_meta';
import { readSrc } from '../../test_src';

const normalOf = (t: TableMeta) => t.rows.find((r) => r.grade === '정상') as Record<string, unknown>;
const yearCols = (t: { cols: { key: string }[] }) => t.cols.map((c) => c.key).filter((k) => /^y\d{4}$/.test(k));

describe('자펀드 종합등급 변동 — 기본 상태', () => {
  it('농식품모태펀드 · 기준년도 2025 = 원문 표 두 장 그대로, 연도 5개', () => {
    const v = gradeView(MF_OPTIONS[0], GRADE_BASE_YEAR);
    expect(v.tables[0]).toBe(FUND_GRADE);
    expect(v.tables[1]).toBe(MGR_GRADE);
    expect(v.years).toEqual([...GRADE_YEARS]);
    expect(computeTotal(v.tables[0])!.y2025).toBe(83);
  });
});

describe('자펀드 종합등급 변동 — 기준년도', () => {
  it('그 해 이후 연도 열을 뺀다(2023 → 2021~2023)', () => {
    const v = gradeView(MF_OPTIONS[0], '2023');
    expect(v.years).toEqual([2021, 2022, 2023]);
    expect(yearCols(v.tables[0])).toEqual(['y2021', 'y2022', 'y2023']);
    expect(yearCols(v.tables[1])).toEqual(['y2021', 'y2022', 'y2023']);
    expect(v.tables[0].cols[0].key).toBe('grade');
    expect(v.tables[0].rows).toHaveLength(3);
  });
  it('빈 값·원문 이후 연도 = 5개 연도 전부, 원문 이전 = 연도 없음(빈 표)', () => {
    expect(gradeYears('')).toEqual([...GRADE_YEARS]);
    expect(gradeYears('2026')).toEqual([...GRADE_YEARS]);
    const v = gradeView(MF_OPTIONS[0], '2020');
    expect(v.years).toEqual([]);
    expect(yearCols(v.tables[0])).toEqual([]);
    expect(v.tables[0].rows).toHaveLength(0);
  });
});

describe('자펀드 종합등급 변동 — 모펀드', () => {
  it('MOAF = 정상 값 × 고정 비율(반올림), 주의·경고 0, 총계 재합산', () => {
    const [fund, mgr] = gradeView('MOAF', GRADE_BASE_YEAR).tables;
    GRADE_YEARS.forEach((y, i) => {
      expect(normalOf(fund)[yearKey(y)]).toBe(Math.round(FUND_NORMAL[i] * MOAF_RATIO));
      expect(normalOf(mgr)[yearKey(y)]).toBe(Math.round(MGR_NORMAL[i] * MOAF_RATIO));
    });
    expect(normalOf(fund).y2025).not.toBe(FUND_NORMAL[4]);
    expect(fund.rows.filter((r) => r.grade !== '정상').every((r) => GRADE_YEARS.every((y) => r[yearKey(y)] === 0))).toBe(true);
    expect(computeTotal(fund)!.y2025).toBe(Math.round(FUND_NORMAL[4] * MOAF_RATIO));
  });
  it('모펀드 × 기준년도 조합 — MOAF 2022 는 MOAF 값의 2021~2022 열만', () => {
    const v = gradeView('MOAF', '2022');
    expect(yearCols(v.tables[0])).toEqual(['y2021', 'y2022']);
    expect(normalOf(v.tables[0]).y2022).toBe(Math.round(FUND_NORMAL[1] * MOAF_RATIO));
  });
  it('원문 표는 바뀌지 않는다(입력 불변)', () => {
    const before = JSON.stringify([FUND_GRADE, MGR_GRADE]);
    gradeView('MOAF', '2021');
    expect(JSON.stringify([FUND_GRADE, MGR_GRADE])).toBe(before);
  });
});

describe('자펀드 종합등급 변동 — 미연동 캡션 제거', () => {
  it('화면 소스에 noop 플래그가 없다', () => {
    expect(readSrc('subfund_grade_trend.tsx')).not.toMatch(/noop/);
  });
});
