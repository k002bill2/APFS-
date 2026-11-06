import { describe, expect, it } from 'vitest';
import { demoHolidays, HOLIDAY_TYPES, SYSTEM_USER } from './holiday_data';
import {
  MSG, calendarCells, canShiftMonth, defaultFilter, dowOf, filterHolidays, filterOfDate, fromYm, isDirty,
  isDuplicateDate, isUserRegistered, shiftMonth, sortByDate, toYm, validateHoliday, yearRangeOf,
} from './holiday_model';
import type { HolidayFormValues } from './holiday_model';

const TODAY = '2026-11-06';
const rows = demoHolidays();
const empty: HolidayFormValues = { date: '', name: '', type: '', memo: '' };

describe('seed 무결성', () => {
  it('일자·id 고유, 일자 오름차순', () => {
    expect(new Set(rows.map((r) => r.date)).size).toBe(rows.length);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(rows.map((r) => r.date)).toEqual([...rows.map((r) => r.date)].sort());
  });
  it('휴일구분은 4종 중 하나', () => { for (const r of rows) expect(HOLIDAY_TYPES).toContain(r.type); });
  it('대체공휴일 이름 ↔ 구분 일치, 선거일 = 임시공휴일', () => {
    for (const r of rows.filter((x) => x.createdBy === SYSTEM_USER)) {
      if (r.name.startsWith('대체공휴일')) expect(r.type).toBe('대체공휴일');
      else if (r.name.includes('선거')) expect(r.type).toBe('임시공휴일');
      else expect(r.type).toBe('법정공휴일');
    }
  });
  it('사용자 등록 4건, 11월 2건(첫 화면이 비지 않게)', () => {
    const user = rows.filter(isUserRegistered);
    expect(user).toHaveLength(4);
    expect(filterHolidays(rows, defaultFilter(TODAY))).toHaveLength(2);
  });
  it('호출마다 새 배열', () => {
    const a = demoHolidays(); a[0].name = 'X';
    expect(demoHolidays()[0].name).not.toBe('X');
  });
});

describe('필터', () => {
  it('기본값 = 당해년도·당월', () => { expect(defaultFilter(TODAY)).toEqual({ year: '2026', month: '11' }); });
  it('년·월 필터', () => {
    const out = filterHolidays(rows, { year: '2026', month: '2' });
    expect(out.map((r) => r.date)).toEqual(['2026-02-16', '2026-02-17', '2026-02-18', '2026-02-27']);
  });
  it('일자 오름차순으로 돌려준다', () => {
    const out = filterHolidays([...rows].reverse(), { year: '2026', month: '2' }).map((r) => r.date);
    expect(out.length).toBeGreaterThan(1);
    expect(out).toEqual(sortByDate(rows).filter((r) => r.date.startsWith('2026-02-')).map((r) => r.date));
  });
  it('filterOfDate', () => { expect(filterOfDate('2027-02-09')).toEqual({ year: '2027', month: '2' }); });
  it('toYm ↔ fromYm (PeriodPicker month 값)', () => {
    expect(toYm({ year: '2026', month: '2' })).toBe('2026-02');
    expect(fromYm('2026-11')).toEqual({ year: '2026', month: '11' });
    expect(fromYm(toYm({ year: '2027', month: '9' }))).toEqual({ year: '2027', month: '9' });
  });
});

describe('중복 일자', () => {
  const r0 = rows.find((r) => r.date === '2026-01-01')!;
  it('같은 일자 = 중복', () => { expect(isDuplicateDate(rows, '2026-01-01')).toBe(true); });
  it('없는 일자 = 중복 아님', () => { expect(isDuplicateDate(rows, '2026-01-02')).toBe(false); });
  it('수정 시 자기 자신은 제외', () => { expect(isDuplicateDate(rows, '2026-01-01', r0.id)).toBe(false); });
  it('수정 시 다른 행 일자로 바꾸면 중복', () => { expect(isDuplicateDate(rows, '2026-03-01', r0.id)).toBe(true); });
});

describe('저장 검증 순서(첫 미충족 1건)', () => {
  it('일자 미입력이 가장 먼저', () => { expect(validateHoliday(empty, rows)).toEqual({ ok: false, key: 'date', msg: MSG.dateEmpty }); });
  it('일자 중복이 휴일명보다 먼저', () => {
    expect(validateHoliday({ ...empty, date: '2026-01-01' }, rows)).toEqual({ ok: false, key: 'date', msg: MSG.dateDup });
  });
  it('휴일명(공백만 = 미입력) → 휴일구분', () => {
    expect(validateHoliday({ ...empty, date: '2026-01-02', name: '  ' }, rows)).toEqual({ ok: false, key: 'name', msg: MSG.nameEmpty });
    expect(validateHoliday({ ...empty, date: '2026-01-02', name: '휴무' }, rows)).toEqual({ ok: false, key: 'type', msg: MSG.typeEmpty });
  });
  it('모두 충족 = ok · 수정은 자기 일자 유지 가능', () => {
    expect(validateHoliday({ date: '2026-01-02', name: '휴무', type: '기타휴일', memo: '' }, rows).ok).toBe(true);
    const r0 = rows.find((r) => r.date === '2026-01-01')!;
    expect(validateHoliday({ date: r0.date, name: r0.name, type: r0.type, memo: '' }, rows, r0.id).ok).toBe(true);
  });
  it('범위를 주면 기준년도 범위 밖 일자를 중복보다 먼저 막는다', () => {
    const range = yearRangeOf(TODAY);
    expect(range).toEqual([2021, 2031]);
    expect(validateHoliday({ ...empty, date: '2040-01-01', name: 'x', type: '기타휴일' }, rows, undefined, range))
      .toEqual({ ok: false, key: 'date', msg: '일자는 2021~2031년 사이로 입력하세요' });
    expect(validateHoliday({ ...empty, date: '2020-12-31' }, rows, undefined, range).ok).toBe(false);
    expect(validateHoliday({ ...empty, date: '2031-12-31', name: 'x', type: '기타휴일' }, rows, undefined, range).ok).toBe(true);
    expect(validateHoliday({ ...empty, date: '2026-01-01' }, rows, undefined, range)).toMatchObject({ msg: MSG.dateDup });
  });
  it('문구', () => {
    expect([MSG.dateEmpty, MSG.dateDup, MSG.nameEmpty, MSG.typeEmpty]).toEqual(['일자를 입력하세요', '이미 등록된 일자입니다', '휴일명을 입력하세요', '휴일구분을 선택하세요']);
  });
});

describe('dirty · [사용자] 태그', () => {
  it('변경 없음 = false, 어느 항목이든 바뀌면 true', () => {
    expect(isDirty(empty, { ...empty })).toBe(false);
    expect(isDirty(empty, { ...empty, memo: 'a' })).toBe(true);
    expect(isDirty(empty, { ...empty, date: '2026-01-02' })).toBe(true);
  });
  it('등록자 ≠ 시스템이면 사용자 등록', () => {
    expect(isUserRegistered({ createdBy: SYSTEM_USER })).toBe(false);
    expect(isUserRegistered({ createdBy: '홍길동' })).toBe(true);
  });
});

describe('달력 셀', () => {
  it('2026-11: 1일 = 일요일 → 앞 빈칸 0, 30일 + 뒤 빈칸 5 = 35', () => {
    const c = calendarCells(2026, 11);
    expect(c[0]).toBe('2026-11-01');
    expect(c).toHaveLength(35);
    expect(c.filter(Boolean)).toHaveLength(30);
    expect(c.slice(30).every((x) => x === null)).toBe(true);
  });
  it('2026-02: 1일 = 일요일, 28일 → 정확히 4주', () => {
    expect(calendarCells(2026, 2)).toHaveLength(28);
  });
  it('2026-08: 1일 = 토요일 → 앞 빈칸 6, 6주', () => {
    const c = calendarCells(2026, 8);
    expect(c.slice(0, 6).every((x) => x === null)).toBe(true);
    expect(c[6]).toBe('2026-08-01');
    expect(c).toHaveLength(42);
  });
  it('윤년 2월(2028) 29일', () => { expect(calendarCells(2028, 2).filter(Boolean).at(-1)).toBe('2028-02-29'); });
  it('셀 위치의 요일 = 실제 요일', () => {
    calendarCells(2027, 10).forEach((d, i) => { if (d) expect(dowOf(d)).toBe(i % 7); });
  });
});

describe('월 이동 — 연도 경계를 넘고 년도 범위 양 끝에서만 멈춤', () => {
  const range = yearRangeOf(TODAY);   // [2021, 2031]
  it('연내 이동', () => {
    expect(shiftMonth({ year: '2026', month: '11' }, 1, range)).toEqual({ year: '2026', month: '12' });
    expect(shiftMonth({ year: '2026', month: '11' }, -1, range)).toEqual({ year: '2026', month: '10' });
  });
  it('1월 ◀ = 전년 12월 · 12월 ▶ = 다음해 1월', () => {
    expect(canShiftMonth({ year: '2026', month: '1' }, -1, range)).toBe(true);
    expect(shiftMonth({ year: '2026', month: '1' }, -1, range)).toEqual({ year: '2025', month: '12' });
    expect(canShiftMonth({ year: '2026', month: '12' }, 1, range)).toBe(true);
    expect(shiftMonth({ year: '2026', month: '12' }, 1, range)).toEqual({ year: '2027', month: '1' });
  });
  it('범위 끝 — 2021-01 ◀ · 2031-12 ▶ 비활성, 그대로', () => {
    const lo = { year: '2021', month: '1' }; const hi = { year: '2031', month: '12' };
    expect(canShiftMonth(lo, -1, range)).toBe(false);
    expect(canShiftMonth(lo, 1, range)).toBe(true);
    expect(canShiftMonth(hi, 1, range)).toBe(false);
    expect(canShiftMonth(hi, -1, range)).toBe(true);
    expect(shiftMonth(lo, -1, range)).toBe(lo);
    expect(shiftMonth(hi, 1, range)).toBe(hi);
  });
});
