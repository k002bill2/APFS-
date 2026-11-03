/* 손익계산서(ACC-013) 화면 설정 회귀 — 설계서 slide 10·14 의 계층·출력 양식 규칙 */
import { describe, it, expect } from 'vitest';
import { INCOME_STATEMENT_CONFIG as CFG, incomePeriodLines } from './income_statement_manage';
import { demoLedger, accountOf } from './ledger_data';
import { DEFAULT_COND, fiscalStart, balanceSheet, NET_INCOME_IS, NET_INCOME_BS, OPERATING_INCOME } from './ledger_model';
import type { StatementRow } from './ledger_model';

const TODAY = '2026-11-02';
const { lines } = demoLedger(TODAY);
const CUR = '2026-12-31', PREV = '2025-12-31';
const rows: StatementRow[] = CFG.build(lines, DEFAULT_COND, CUR, PREV);
const byId = (id: string) => rows.find((r) => r.id === id);

describe('손익계산서 설정', () => {
  it('route·제목·출력 제목', () => {
    expect(CFG.route).toBe('acct-income-statement');
    expect(CFG.title).toBe('손익계산서');
    expect(CFG.printTitle.replace(/\s/g, '')).toBe('손익계산서');
  });

  it('출력 회계기간 = 당기·전기 2줄 "YYYY년 MM월 DD일 부터 … 까지"', () => {
    const cur = { no: 2, start: fiscalStart(CUR), end: CUR }, prev = { no: 1, start: fiscalStart(PREV), end: PREV };
    expect(incomePeriodLines(cur, prev)).toEqual([
      '2026년 01월 01일 부터 2026년 12월 31일 까지',
      '2025년 01월 01일 부터 2025년 12월 31일 까지',
    ]);
  });

  it('계층: 손익 머리행으로 시작해 영업이익 → 당기순이익으로 끝난다', () => {
    expect(rows[0]).toMatchObject({ code: '4000000', kind: 'header', col: null, cur: null });
    const tail = rows.slice(-2);
    expect(tail.map((r) => r.code)).toEqual(['4299999', NET_INCOME_IS]);
    expect(tail[0].label).toMatch(/^[ⅠⅡⅢⅣⅤⅥⅦⅧ]\. 영업이익$/);
    expect(tail[1].label).toMatch(/^[ⅠⅡⅢⅣⅤⅥⅦⅧ]\. 당기순이익$/);
    for (const r of tail) expect(r).toMatchObject({ col: 'total', drillable: false });
  });

  it('당기순이익 = 수익 − 비용(대분류 합계금액, 부호 = 계정 정상잔액 방향 dc)', () => {
    const net = byId(NET_INCOME_IS);
    const groups = rows.filter((r) => r.level === 2 && r.kind === 'group');
    expect(groups.every((r) => accountOf(r.code)?.dc)).toBe(true);
    const sum = (k: 'cur' | 'prev') => groups
      .reduce((s, r) => s + (accountOf(r.code)?.dc === '대변' ? 1 : -1) * (r[k] ?? 0), 0);
    expect(net?.cur).toBe(sum('cur'));
    expect(net?.prev).toBe(sum('prev'));
    expect(net?.cur).not.toBe(0);
  });

  it('영업외 계정이 없어 영업이익 = 당기순이익 (당기·전기)', () => {
    const op = byId(OPERATING_INCOME), net = byId(NET_INCOME_IS);
    expect(op?.cur).toBe(net?.cur);
    expect(op?.prev).toBe(net?.prev);
  });

  it('손익계산서 당기순이익 = 재무상태표 이익잉여금 > 당기순이익 (같은 기준일)', () => {
    const bs = balanceSheet(lines, DEFAULT_COND, CUR, PREV).find((r) => r.id === NET_INCOME_BS);
    expect(bs?.cur).toBe(byId(NET_INCOME_IS)?.cur);
    expect(bs?.prev).toBe(byId(NET_INCOME_IS)?.prev);
  });

  it('입력계정 행만 더블클릭(E03) 대상 · 세부금액 열', () => {
    for (const r of rows) {
      if (r.drillable) expect(r).toMatchObject({ kind: 'leaf', col: 'detail' });
      if (r.kind === 'group' || r.kind === 'header' || r.kind === 'calc') expect(r.drillable).toBe(false);
    }
    expect(rows.some((r) => r.drillable)).toBe(true);
  });

  it('모든계정포함 = 부 → 당기·전기 모두 0 인 계정은 숨김, 여 → 표시', () => {
    /* 1월 말 기준이면 데모 데이터에 아직 거래가 없는 손익 계정이 있다 — 그 계정으로 플래그 효과를 본다 */
    const C1 = '2026-01-31', P1 = '2025-01-31';
    const isZero = (r: StatementRow) => (r.kind === 'leaf' || r.kind === 'group') && r.cur === 0 && r.prev === 0;
    const off = CFG.build(lines, DEFAULT_COND, C1, P1);
    const on = CFG.build(lines, { ...DEFAULT_COND, includeAll: true }, C1, P1);
    expect(off.filter(isZero)).toHaveLength(0);
    expect(on.filter((r) => r.kind === 'leaf' && isZero(r)).length).toBeGreaterThan(0);
    expect(on.length).toBeGreaterThan(off.length);
    expect(on.length - off.length).toBe(on.filter(isZero).length);
    expect(rows.filter(isZero)).toHaveLength(0);   // 기본 조회 기준일(결산일)도 0 행 없음
  });
});
