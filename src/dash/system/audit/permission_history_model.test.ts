import { describe, it, expect } from 'vitest';
import { demoHistory, filterHistory, summaryCounts, cntAdd, cntRev, summaryText, usersOf, monthRange, holdersOf, DEMO_TODAY } from './permission_history_model';

const rows = demoHistory();

describe('holdersOf — 적용 대상 산출(목업)', () => {
  it('권한 단위 변경 = 보유자 전원, 부여/회수 = 대상 개인, 삭제 = 0명', () => {
    expect(rows.find((e) => e.ctype === '권한 변경' && e.preset === '운용사')!.holders.length).toBe(4);
    expect(rows.find((e) => e.ctype === '권한 회수')!.holders.map((h) => h.name)).toEqual(['정운용']);
    expect(rows.find((e) => e.ctype === '권한 삭제')!.holders).toEqual([]);
  });
  it('알 수 없는 권한의 단위 변경은 0명', () => {
    expect(holdersOf({ ts: '', ctype: '권한 변경', preset: '없음', actor: '', src: '', ip: '', reason: '' })).toEqual([]);
  });
});

describe('요약 — 추가/회수 건수·전이 문자열', () => {
  it('항목형은 추가·회수 카운트', () => {
    const e = rows[0]; expect(cntAdd(e)).toBe(2); expect(cntRev(e)).toBe(1); expect(summaryText(e)).toBe('추가 2 회수 1');
  });
  it('전이형은 before→after', () => { expect(summaryText(rows[1])).toBe('운용사→미부여'); });
});

describe('filterHistory / summaryCounts / usersOf / monthRange', () => {
  it('이번 달(고정 기준일) 범위 = 월초~월말', () => {
    expect(monthRange()).toEqual(['2026-09-01', '2026-09-30']);
    expect(monthRange('2026-03-05')).toEqual(['2026-03-01', '2026-03-31']);
    expect(monthRange('2026-02-10')).toEqual(['2026-02-01', '2026-02-28']);   // 평년
    expect(monthRange('2028-02-10')).toEqual(['2028-02-01', '2028-02-29']);   // 윤년
    expect(DEMO_TODAY).toBe('2026-09-13');                                     // 기준일 자체는 그대로
  });
  it('기간 필터는 빈 경계를 열어 둔다', () => {
    expect(filterHistory(rows, { from: '2026-09-01' }).length).toBe(10);
    expect(filterHistory(rows, { to: '2026-08-31' }).length).toBe(3);
    expect(filterHistory(rows, {}).length).toBe(rows.length);
  });
  it('대상 사용자 = 보유자 포함 이력', () => { expect(filterHistory(rows, { user: '최수산' }).every((e) => e.holders.some((h) => h.name === '최수산'))).toBe(true); expect(filterHistory(rows, { user: '최수산' }).length).toBe(3); });
  it('변경유형·행위자·검색어(메뉴 경로)', () => {
    expect(filterHistory(rows, { type: '권한 생성' }).length).toBe(1);
    expect(filterHistory(rows, { actor: '마스터' }).length).toBe(1);
    expect(filterHistory(rows, { kw: '유가증권' }).length).toBe(1);
  });
  it('유형별 건수는 CHANGE_TYPES 순서·0건 제외', () => {
    expect(summaryCounts(rows)).toEqual([{ type: '권한 부여', n: 3 }, { type: '권한 회수', n: 2 }, { type: '권한 변경', n: 6 }, { type: '권한 생성', n: 1 }, { type: '권한 삭제', n: 1 }]);
    expect(summaryCounts([])).toEqual([]);
  });
  it('대상 사용자 옵션은 유일·정렬', () => { const u = usersOf(rows); expect(new Set(u).size).toBe(u.length); expect(u).toContain('전산관리'); });
});
