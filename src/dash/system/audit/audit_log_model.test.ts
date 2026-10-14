import { describe, it, expect } from 'vitest';
import { demoLogs, kindOf, filterLogs, resultCounts } from './audit_log_model';

const rows = demoLogs();

describe('kindOf — 행위 → 유형', () => {
  it('접속·권한변경·비정상 접근·계정', () => {
    expect(kindOf('로그인 2차')).toBe('접속');
    expect(kindOf('권한변경')).toBe('권한변경');
    expect(kindOf('비정상 접근(메뉴)')).toBe('비정상 접근');
    expect(kindOf('계정 잠금(5회)')).toBe('계정');
  });
  it('데모 행은 전부 유형이 붙고 id 가 유일', () => {
    expect(rows.every((r) => r.kind)).toBe(true);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });
});

describe('filterLogs / resultCounts', () => {
  it('결과·유형 정확일치', () => {
    expect(filterLogs(rows, { result: '차단' }).length).toBe(3);
    expect(filterLogs(rows, { kind: '비정상 접근' }).length).toBe(2);
  });
  it('기간은 빈 경계를 열어 둔다', () => {
    expect(filterLogs(rows, { from: '2026-09-13' }).length).toBe(2);
    expect(filterLogs(rows, { to: '2026-08-31' }).length).toBe(1);
  });
  it('행위자·검색어 부분일치', () => {
    expect(filterLogs(rows, { actor: 'IMM' }).length).toBe(3);
    expect(filterLogs(rows, { kw: 'totp' }).length).toBe(5);
  });
  it('결과별 건수', () => { expect(resultCounts(rows)).toEqual({ '정상': 10, '실패': 1, '차단': 3 }); });
});
