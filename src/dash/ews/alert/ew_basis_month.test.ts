/* 조기경보 4화면(운용사별·자펀드별·전월 비교·조기경보 관리)의 기준년월이 표를 거른다(2026-11-17 사용자 지시 "기준년월이 표를 거르게").
   빈 칸 = 원문 시점(2026-07) — 기본값 없음 결정(2026-09-21)을 지키면서 두 시점을 섞지 않는다(R0: 첫 화면 = 원문 행 그대로). */
import { describe, it, expect } from 'vitest';
import { EW_BASE_YM, EW_PREV_YM, ewYm, atEwYm } from './ew_period';
import { ROWS, PREV_VIEW_ROWS, rowsForMonth } from './ew_month_compare_model';
import { GP_EW_ROWS, gpEwRowsAt } from './gp_early_warning';
import type { GpKind } from './gp_early_warning';
import { FUND_EW_ROWS, fundEwRowsAt } from './fund_early_warning';
import { EW_MANAGE_ROWS, inPeriod } from './early_warning_manage';
import { readSrc } from '../../test_src';

const KINDS: GpKind[] = ['벤처투자회사', '증권회사', '여신전문금융회사', '은행'];
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe('기준년월 판정(ew_period)', () => {
  it('빈 값 = 원문 시점 2026-07 · 같은 달만 통과', () => {
    expect(ewYm('')).toBe(EW_BASE_YM);
    expect(ewYm('2026-06')).toBe('2026-06');
    expect(atEwYm(EW_BASE_YM, '')).toBe(true);
    expect(atEwYm(EW_PREV_YM, '')).toBe(false);
    expect(atEwYm(EW_PREV_YM, EW_PREV_YM)).toBe(true);
  });
});

describe('전월 비교(S2_63) — 기준년월별 비교 행', () => {
  it('빈 칸·2026-07 = 원문 6행 그대로(같은 배열)', () => {
    expect(ROWS).toHaveLength(6);
    expect(rowsForMonth('')).toBe(ROWS);
    expect(rowsForMonth(EW_BASE_YM)).toBe(ROWS);
  });
  it('2026-06 = 원문 전월 등급을 당월로 — 같은 운용사·항목이면 07 보기의 전월과 같다(교차 일관성)', () => {
    const view = rowsForMonth(EW_PREV_YM);
    expect(view).toBe(PREV_VIEW_ROWS);
    view.forEach((r) => {
      const base = ROWS.find((b) => `${b.id}-${EW_PREV_YM}` === r.id)!;
      expect([r.gp, r.it, r.gu, r.mf]).toEqual([base.gp, base.it, base.gu, base.mf]);
      expect(r.cur).toBe(base.prev);
    });
  });
  it('2026-07 신규(06 대상 아님) 행은 06 보기에 없고, 07 해소 행은 06 당월이 그 등급이다', () => {
    const view = rowsForMonth(EW_PREV_YM);
    expect(ids(view)).not.toContain(`ewmc-4-${EW_PREV_YM}`);
    expect(view.find((r) => r.id === `ewmc-5-${EW_PREV_YM}`)!.cur).toBe('정상');
    expect(view.every((r) => r.cur || r.prev)).toBe(true);
    expect(view).toHaveLength(5);
  });
  it('데이터가 없는 달은 0건', () => {
    expect(rowsForMonth('2026-05')).toEqual([]);
    expect(rowsForMonth('2025-12')).toEqual([]);
  });
});

describe('운용사별 조기경보(S2_47) — 구분별 그 시점 행', () => {
  it.each(KINDS)('%s: 빈 칸·2026-07 = 원문 1행, 2026-06 = 같은 운용사 더미 1행, 그 밖 0건', (k) => {
    const base = gpEwRowsAt(k, '');
    expect(base).toHaveLength(1);
    expect(base[0].id).toMatch(/^gpew-\d$/);
    expect(gpEwRowsAt(k, EW_BASE_YM)).toEqual(base);
    const prev = gpEwRowsAt(k, EW_PREV_YM);
    expect(prev).toHaveLength(1);
    expect(prev[0].id).toBe(`${base[0].id}-${EW_PREV_YM}`);
    expect(prev[0].gp).toBe(base[0].gp);
    expect(prev[0]).not.toEqual({ ...base[0], id: prev[0].id, ym: prev[0].ym });   // 시점 값이 실제로 다르다
    expect(gpEwRowsAt(k, '2026-05')).toEqual([]);
  });
  it('더미 행 id 는 모두 고유하다(getRowId)', () => {
    const all = KINDS.flatMap((k) => GP_EW_ROWS[k]);
    expect(new Set(ids(all)).size).toBe(all.length);
  });
  it('그리드 rowData 는 그 시점 행이다 — 전체 배열을 넘기면 기본 상태(External Filter 꺼짐)에 더미가 샌다', () => {
    const src = readSrc('gp_early_warning.tsx');
    expect(src).toMatch(/rowData=\{periodRows\[s\.kind\]\}/);
    expect(src).not.toMatch(/rowData=\{GP_EW_ROWS/);
  });
});

describe('자펀드별 조기경보(S2_49) — 그 시점 행', () => {
  it('빈 칸·2026-07 = 원문 1행, 2026-06 = 같은 자펀드 더미 1행, 그 밖 0건', () => {
    expect(ids(fundEwRowsAt(''))).toEqual(['fundew-1']);
    expect(ids(fundEwRowsAt(EW_BASE_YM))).toEqual(['fundew-1']);
    expect(ids(fundEwRowsAt(EW_PREV_YM))).toEqual([`fundew-1-${EW_PREV_YM}`]);
    expect(fundEwRowsAt(EW_PREV_YM)[0].fn).toBe(fundEwRowsAt('')[0].fn);
    expect(fundEwRowsAt('2026-05')).toEqual([]);
  });
  it('더미는 원문에 없는 주의 등급을 쓰지 않는다', () => {
    const grades = FUND_EW_ROWS.flatMap((r) => [r.ret, r.viol, r.mgr, r.staff, r.l1, r.l2, r.l3, r.l4, r.total]);
    expect(grades).not.toContain('주의');
  });
  it('그리드 rowData 는 그 시점 행이다', () => {
    const src = readSrc('fund_early_warning.tsx');
    expect(src).toMatch(/rowData=\{periodRows\}/);
  });
});

describe('전월 비교 화면 배선', () => {
  it('화면은 기준년월의 비교 행에 등급·변동 필터를 건다', () => {
    expect(readSrc('ew_month_compare.tsx')).toMatch(/visibleRows\(rowsForMonth\(fYm\)/);
  });
});

describe('조기경보 관리(S2_51) — 기간(기준년월 시작~종료)', () => {
  const inRange = (from: string, to: string) => EW_MANAGE_ROWS.filter((r) => inPeriod(r.ym, from, to));
  it('기본 2026-07 ~ 2026-07 = 원문·확장 21행 그대로(ew-1 … ew-21)', () => {
    expect(ids(inRange(EW_BASE_YM, EW_BASE_YM))).toEqual(Array.from({ length: 21 }, (_, i) => `ew-${i + 1}`));
  });
  it('2026-06 ~ 2026-06 = 직전월 더미 8행, 2026-06 ~ 2026-07 = 29행, 그 밖·역순 범위 = 0건', () => {
    expect(ids(inRange(EW_PREV_YM, EW_PREV_YM))).toEqual(Array.from({ length: 8 }, (_, i) => `ew-prev-${i + 1}`));
    expect(inRange(EW_PREV_YM, EW_BASE_YM)).toHaveLength(29);
    expect(inRange('2026-05', '2026-05')).toEqual([]);
    expect(inRange(EW_BASE_YM, EW_PREV_YM)).toEqual([]);
  });
  it('직전월에도 운용사 등급은 같은 운용사면 같은 값 · 더미 운용사·자펀드는 원문에 있는 짝', () => {
    const prev = inRange(EW_PREV_YM, EW_PREV_YM);
    const base = inRange(EW_BASE_YM, EW_BASE_YM);
    prev.forEach((r) => {
      expect(prev.filter((x) => x.gp === r.gp).every((x) => x.gpg === r.gpg)).toBe(true);
      expect(base.some((b) => b.gp === r.gp && b.fn === r.fn)).toBe(true);
    });
  });
  it('원문이 앞이라 선택지 첫 등장 순서가 종전과 같다 · id 고유', () => {
    expect(EW_MANAGE_ROWS.slice(0, 21).every((r) => r.ym === EW_BASE_YM)).toBe(true);
    expect(new Set(ids(EW_MANAGE_ROWS)).size).toBe(EW_MANAGE_ROWS.length);
  });
  it('그리드 rowData·등급 칩 건수는 기간 안 행이다', () => {
    const src = readSrc('early_warning_manage.tsx');
    expect(src).toMatch(/rowData=\{periodRows\}/);
    expect(src).toMatch(/const base = periodRows\.filter/);
  });
});
