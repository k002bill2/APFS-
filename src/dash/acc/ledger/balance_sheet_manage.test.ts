/* 재무상태표(ACC-012) 화면 설정 회귀 — 설계서 slide 10·11·14·18 의 계층·검증 문구·더블클릭 대상·출력 양식 규칙 */
import { describe, it, expect } from 'vitest';
import { BALANCE_SHEET_CONFIG as CFG, balancePeriodLines } from './balance_sheet_manage';
import { demoLedger } from './ledger_data';
import { DEFAULT_COND, fiscalStart, validateStatementDates, MSG } from './ledger_model';
import type { StatementRow } from './ledger_model';
import { termHeader, dataRowCount, dateChips } from './statement_kit';
import { readSrc } from '../../test_src';

const TODAY = '2026-11-02';
const { lines } = demoLedger(TODAY);
const CUR = '2026-12-31', PREV = '2025-12-31';
const rows: StatementRow[] = CFG.build(lines, DEFAULT_COND, CUR, PREV);

describe('재무상태표 설정', () => {
  it('route·제목·출력 제목', () => {
    expect(CFG.route).toBe('acct-balance-sheet');
    expect(CFG.title).toBe('재무상태표');
    expect(CFG.printTitle.replace(/\s/g, '')).toBe('재무상태표');
  });

  it('출력 기간 줄 = 당기·전기 2줄 "제 N기 YYYY년 MM월 DD일 현재"(기준일 기준)', () => {
    const asOf = '2026-06-30';
    const cur = { no: 2, start: fiscalStart(asOf), end: asOf }, prev = { no: 1, start: fiscalStart(PREV), end: PREV };
    expect(balancePeriodLines(cur, prev)).toEqual(['제 2기 2026년 06월 30일 현재', '제 1기 2025년 12월 31일 현재']);
  });

  it('E01 기준일 검증 문구(설계서 그대로)', () => {
    expect(validateStatementDates('', PREV)).toBe('기준일을 입력하세요.');
    expect(validateStatementDates(CUR, '')).toBe(MSG.dateRequired);
    expect(validateStatementDates(CUR, CUR)).toBe('전기기준일은 당기기준일보다 이전이어야 합니다.');
    expect(validateStatementDates(PREV, CUR)).toBe(MSG.prevOrder);
    expect(validateStatementDates(CUR, PREV)).toBeNull();
  });

  it('계층: 자산 머리행으로 시작 · 총계 3행 · 자본과 부채총계로 끝난다', () => {
    expect(rows[0]).toMatchObject({ kind: 'header', label: '자산', col: null, cur: null, prev: null });
    expect(rows.filter((r) => r.kind === 'total').map((r) => r.label)).toEqual(['자 산 총 계', '부 채 총 계', '자 본 총 계', '자본과 부채총계']);
    expect(rows[rows.length - 1].label).toBe('자본과 부채총계');
  });

  it('E03 더블클릭 대상 = 입력계정(leaf·세부금액 열)만 — header·group·calc·total 은 무반응', () => {
    for (const r of rows) {
      if (r.drillable) expect(r).toMatchObject({ kind: 'leaf', col: 'detail' });
      if (r.kind !== 'leaf') expect(r.drillable, `${r.kind} ${r.label}`).toBe(false);
    }
    expect(rows.some((r) => r.drillable)).toBe(true);
    expect(rows.some((r) => r.kind === 'calc')).toBe(true);   // 이익잉여금 파생 행(전기이월이익잉여금·당기순이익)
    for (const r of rows.filter((x) => x.kind === 'group' || x.kind === 'total')) expect(r.col).toBe('total');
  });

  it('그리드·엑셀 헤더 회기기간 = 회기 시작 ~ 회기 종료일(fiscalEnd) — 기준일이 회기 중간이어도', () => {
    expect(termHeader({ no: 2, start: '2026-01-01', end: '2026-06-30' }, '당')).toBe('제2(당)기 (2026-01-01 ~ 2026-12-31)');
    expect(termHeader({ no: 1, start: '2025-01-01', end: '2025-12-31' }, '전')).toBe('제1(전)기 (2025-01-01 ~ 2025-12-31)');
  });
  it('푸터 건수 = 데이터 행(leaf·calc)만 · 거래가 없으면 0 · 푸터 문구 "총 N건 중 N건 표시"', () => {
    expect(dataRowCount(rows)).toBe(rows.filter((r) => r.kind === 'leaf' || r.kind === 'calc').length);
    expect(dataRowCount(rows)).toBeLessThan(rows.length);
    const empty = CFG.build([], DEFAULT_COND, CUR, PREV);
    expect(empty.length).toBeGreaterThan(0);                                   // 머리·총계 행은 늘 생긴다
    expect(empty.some((r) => (r.kind === 'leaf' || r.kind === 'calc') && (r.cur || r.prev))).toBe(false);   // → hasData=false → rowData=[]
    const src = readSrc('statement_kit.tsx');
    expect(src).toContain('rowData={gridRows}');
    expect(src).toContain('`총 ${String(count)}건 중 ${String(count)}건 표시`');
  });
  it('기준일 칩(당기·전기)은 onClear 없음(✕ 미노출)', () => {
    const chips = dateChips({ cur: CUR, prev: PREV });
    expect(chips.map((c) => c.value)).toEqual([`당기 ${CUR}`, `전기 ${PREV}`]);
    for (const c of chips) expect(c).not.toHaveProperty('onClear');
  });
});
