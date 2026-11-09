/* 휴일관리(ACC-025) — 순수 로직(년·월 조건 · 중복 일자 · 저장 검증 순서 · 달력 셀 · [사용자] 판정 · 월 이동 경계).
   화면과 분리해 vitest 로 검증한다(holiday_model.test.ts). */
import type { HolidayRow, HolidayType } from './holiday_data';
import { SYSTEM_USER } from './holiday_data';

export const DOW = ['일', '월', '화', '수', '목', '금', '토'] as const;

/* ── 조회 조건(년·월) ── */
/** year 'YYYY' · month '1'~'12' — 항상 특정 월(월 '전체' 없음, 상세필터 제거 2026-11-06) */
export type HolidayFilter = { year: string; month: string };

/** E00 진입 기본값·[오늘] — 당해년도·당월 */
export const defaultFilter = (today: string): HolidayFilter => ({ year: today.slice(0, 4), month: String(Number(today.slice(5, 7))) });

export const sortByDate = (rows: readonly HolidayRow[]): HolidayRow[] => [...rows].sort((a, b) => a.date.localeCompare(b.date));

export function filterHolidays(rows: readonly HolidayRow[], f: HolidayFilter): HolidayRow[] {
  const prefix = `${toYm(f)}-`;
  return sortByDate(rows.filter((r) => r.date.startsWith(prefix)));
}

/** 날짜 → 그 날짜가 속한 필터(저장 후 그 달로 이동) */
export const filterOfDate = (date: string): HolidayFilter => ({ year: date.slice(0, 4), month: String(Number(date.slice(5, 7))) });

/** 조건 ↔ PeriodPicker(mode="month") 값 'YYYY-MM' */
export const toYm = (f: HolidayFilter): string => `${f.year}-${f.month.padStart(2, '0')}`;
export const fromYm = (ym: string): HolidayFilter => filterOfDate(`${ym}-01`);

/* ── 중복 · 검증 ── */
/** 같은 일자가 이미 있는지 — 수정 시 자기 자신(selfId)은 제외 */
export const isDuplicateDate = (rows: readonly HolidayRow[], date: string, selfId?: string): boolean =>
  rows.some((r) => r.date === date && r.id !== selfId);

export type HolidayFormValues = { date: string; name: string; type: HolidayType | ''; memo: string };
export type HolidayField = 'date' | 'name' | 'type';
export type ValidationResult = { ok: true } | { ok: false; key: HolidayField; msg: string };

export const MSG = {
  dateEmpty: '일자를 입력하세요',
  dateDup: '이미 등록된 일자입니다',
  nameEmpty: '휴일명을 입력하세요',
  typeEmpty: '휴일구분을 선택하세요',
  saved: '저장되었습니다',
  deleted: '삭제되었습니다',
  refreshed: '조회되었습니다',
  dirty: '작성 중인 내용이 사라집니다',
} as const;

export const NAME_MAX = 30;

/** 년도 선택 범위 — 당해년도 ±5년. 툴바 월 선택(PeriodPicker yearRange)·월 이동 경계와 모달 일자 검증이 같은 범위를 쓴다
    (DatePicker 는 범위 prop 이 없어 2000~2035 를 다 열어 두므로 저장 검증에서 막는다) */
export type YearRange = [number, number];
export const yearRangeOf = (today: string): YearRange => { const y = Number(today.slice(0, 4)); return [y - 5, y + 5]; };
export const dateRangeMsg = ([from, to]: YearRange): string => `일자는 ${String(from)}~${String(to)}년 사이로 입력하세요`;
export const MEMO_MAX = 100;

/** E04 저장 검증 — 일자 미입력 → (일자 범위) → 중복 → 휴일명 → 휴일구분 순, 첫 미충족 1건만.
    range 를 주면 년도 범위 밖 일자를 막는다(설계서에 없는 규칙 — 저장 후 그 달로 이동하는데 월 선택기가 못 보여 준다) */
export function validateHoliday(v: HolidayFormValues, rows: readonly HolidayRow[], selfId?: string, range?: YearRange): ValidationResult {
  if (!v.date) return { ok: false, key: 'date', msg: MSG.dateEmpty };
  if (range) {
    const y = Number(v.date.slice(0, 4));
    if (y < range[0] || y > range[1]) return { ok: false, key: 'date', msg: dateRangeMsg(range) };
  }
  if (isDuplicateDate(rows, v.date, selfId)) return { ok: false, key: 'date', msg: MSG.dateDup };
  if (!v.name.trim()) return { ok: false, key: 'name', msg: MSG.nameEmpty };
  if (!v.type) return { ok: false, key: 'type', msg: MSG.typeEmpty };
  return { ok: true };
}

/** 닫기 확인 판정 — 신규는 빈 폼 대비 입력이 있으면, 수정은 초기값 대비 변경이 있으면 */
export const isDirty = (initial: HolidayFormValues, current: HolidayFormValues): boolean =>
  initial.date !== current.date || initial.name !== current.name || initial.type !== current.type || initial.memo !== current.memo;

/** [사용자] 태그 — AS-IS 이관(등록자 '시스템')이 아닌 행 */
export const isUserRegistered = (r: Pick<HolidayRow, 'createdBy'>): boolean => r.createdBy !== SYSTEM_USER;

/* ── 달력 ── */
const pad2 = (n: number) => String(n).padStart(2, '0');
/** 0=일 … 6=토(로컬 달력 — UTC 변환 없음) */
export const dowOf = (date: string): number => new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))).getDay();

/** 월 → 앞뒤 빈칸(null) 포함 7열 셀(길이 = 7의 배수). 일요일 시작 */
export function calendarCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month - 1, 1).getDay();
  const last = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = Array<null>(first).fill(null);
  for (let d = 1; d <= last; d++) cells.push(`${String(year)}-${pad2(month)}-${pad2(d)}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

/* ── 월 이동(E10) — 연도 경계를 넘는다(1월 ◀ = 전년 12월 · 12월 ▶ = 다음해 1월), 년도 범위 양 끝에서만 비활성 ── */
export type ViewMode = 'calendar' | 'list';

const monthIndex = (f: HolidayFilter): number => Number(f.year) * 12 + Number(f.month) - 1;

export function canShiftMonth(f: HolidayFilter, dir: -1 | 1, [from, to]: YearRange): boolean {
  const next = monthIndex(f) + dir;
  return next >= from * 12 && next <= to * 12 + 11;
}

/** 이동 결과 조건(범위 밖이면 그대로) */
export function shiftMonth(f: HolidayFilter, dir: -1 | 1, range: YearRange): HolidayFilter {
  if (!canShiftMonth(f, dir, range)) return f;
  const next = monthIndex(f) + dir;
  return { year: String(Math.floor(next / 12)), month: String((next % 12) + 1) };
}
