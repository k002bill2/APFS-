/* 일마감(ACC-007) 순수 모델 — 상태 판정·달력 범위·회기 경계 이동·마감 전 점검·검증(13p·14p·15p 표 순서)·
   마감/취소/비고수정/기간 일괄 마감 반영·처리이력 조회. 화면·테스트 공용(페이지는 배선만). */
import { format, addDays, parseISO, getDay, startOfWeek, endOfWeek, endOfMonth, startOfMonth, addMonths } from 'date-fns';
import type { Tone } from '../../components';
import { validateRange } from './general_journal_model';
import type { FundAccount } from './general_journal_data';
import { closeKey, holidayOf, slipStats, termShort, userIp, userLabel } from './daily_close_data';
import type { Closing, Closings, FiscalTerm, HistoryEntry, HistoryKind } from './daily_close_data';

/* ── 날짜 유틸('YYYY-MM-DD' 로컬 — toISOString 금지) ── */
const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
export const shiftDate = (date: string, days: number): string => ymd(addDays(parseISO(date), days));
export const DOW = ['일', '월', '화', '수', '목', '금', '토'] as const;
export const dowOf = (date: string): number => getDay(parseISO(date));
/** '2026-01-19 (월)' */
export const dateWithDow = (date: string): string => `${date} (${DOW[dowOf(date)]})`;
/** 휴일이면 '(일·휴일)' — 13p 직전 일자 표기 예시 '2026-01-18(일·휴일)' */
export const dateWithDayKind = (date: string): string => (holidayOf(date).holiday ? `${date} (${DOW[dowOf(date)]}·휴일)` : dateWithDow(date));
/** 일자 범위(포함) */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = shiftDate(d, 1)) out.push(d);
  return out;
}

/* ── 상태 판정 ── */
export const DAY_STATUSES = ['마감', '미마감', '진행중', '예정'] as const;
export type DayStatus = typeof DAY_STATUSES[number];
export const STATUS_TONE: Record<DayStatus, Tone> = { 마감: 'success', 미마감: 'warning', 진행중: 'info', 예정: 'muted' };
export const STATUS_ICON: Record<DayStatus, string> = { 마감: 'check-circle', 미마감: 'alert-triangle', 진행중: 'clock', 예정: '' };

/** 활성(취소되지 않은) 마감 레코드 */
export function activeClosing(closings: Closings, account: string, date: string): Closing | null {
  const c = closings[closeKey(account, date)];
  return c && !c.cancelled ? c : null;
}

/** 마감 = 활성 레코드 · 예정 = 오늘 이후 · 진행중 = 오늘 · 미마감 = 오늘 이전. 휴일도 같은 규칙(휴일명은 표시 전용) */
export function dayStatus(date: string, today: string, closed: boolean): DayStatus {
  if (closed) return '마감';
  if (date > today) return '예정';
  return date === today ? '진행중' : '미마감';
}

export interface DayInfo {
  date: string;
  dow: number;
  holiday: boolean;
  holidayName: string;     // 휴일이면 '신정'·'휴일' 등, 영업일 ''
  status: DayStatus;
  approved: number;
  unapproved: number;
  deleted: number;
  balanced: boolean;
  closing: Closing | null;
}
export function dayInfo(account: FundAccount, date: string, today: string, closings: Closings): DayInfo {
  const closing = activeClosing(closings, account, date);
  const h = holidayOf(date);
  const s = slipStats(account, date, today);
  return { date, dow: dowOf(date), holiday: h.holiday, holidayName: h.name, status: dayStatus(date, today, !!closing), ...s, closing };
}
/** 셀 클릭 가능 = 예정이 아닌 일자(마감 → 상세/취소, 미마감·진행중 → 마감 처리) */
export const isClickable = (d: Pick<DayInfo, 'status'>): boolean => d.status !== '예정';

/* ── 회기 ── */
export const termsOf = (terms: readonly FiscalTerm[], account: string): FiscalTerm[] =>
  terms.filter((t) => t.account === account).sort((a, b) => b.year - a.year);
export const termOf = (terms: readonly FiscalTerm[], account: string, date: string): FiscalTerm | null =>
  terms.find((t) => t.account === account && t.start <= date && date <= t.end) ?? null;
export const inTerm = (t: Pick<FiscalTerm, 'start' | 'end'>, date: string): boolean => t.start <= date && date <= t.end;
/** 기본 회기 = 오늘이 속한 회기, 없으면 가장 최근 회기 */
export function currentTerm(terms: readonly FiscalTerm[], account: string, today: string): FiscalTerm | null {
  const list = termsOf(terms, account);
  return list.find((t) => inTerm(t, today)) ?? list[0] ?? null;
}
export const clampToTerm = (t: Pick<FiscalTerm, 'start' | 'end'>, date: string): string => (date < t.start ? t.start : date > t.end ? t.end : date);

/* ── 달력 범위 ── */
/** 월간 그리드 — 7열(일~토) × 주 단위, 당월 밖 칸은 null */
export function monthGrid(ym: string): (string | null)[][] {
  const first = parseISO(`${ym}-01`);
  const days = datesBetween(ymd(startOfMonth(first)), ymd(endOfMonth(first)));
  const cells: (string | null)[] = [...Array<null>(getDay(first)).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}
export const monthDates = (ym: string): string[] => datesBetween(`${ym}-01`, ymd(endOfMonth(parseISO(`${ym}-01`))));
/** 기준일이 속한 주(일~토) 7일 — 월·연도 경계를 넘을 수 있다 */
export function weekDates(anchor: string): string[] {
  const d = parseISO(anchor);
  return datesBetween(ymd(startOfWeek(d, { weekStartsOn: 0 })), ymd(endOfWeek(d, { weekStartsOn: 0 })));
}
/** '01.18 ~ 01.24' */
export function weekLabel(anchor: string): string {
  const w = weekDates(anchor);
  const md = (x: string) => `${x.slice(5, 7)}.${x.slice(8)}`;
  return `${md(w[0])} ~ ${md(w[6])}`;
}

/* ── 회기 경계 이동(‹ › · 오늘) — 회기 밖이면 비활성 ── */
export type ViewMode = 'month' | 'week' | 'list';
export function canShift(view: ViewMode, anchor: string, t: Pick<FiscalTerm, 'start' | 'end'>, dir: -1 | 1): boolean {
  if (view === 'week') { const w = weekDates(anchor); return dir < 0 ? w[0] > t.start : w[6] < t.end; }
  const ym = anchor.slice(0, 7);
  return dir < 0 ? ym > t.start.slice(0, 7) : ym < t.end.slice(0, 7);
}
/** 이동 — 월 단위면 대상 월 1일(오늘이 그 달이면 오늘), 주 단위면 ±7일. 결과는 회기 안으로 clamp */
export function shiftAnchor(view: ViewMode, anchor: string, t: Pick<FiscalTerm, 'start' | 'end'>, dir: -1 | 1, today: string): string {
  if (view === 'week') return clampToTerm(t, shiftDate(anchor, dir * 7));
  const ym = format(addMonths(parseISO(`${anchor.slice(0, 7)}-01`), dir), 'yyyy-MM');
  return clampToTerm(t, today.slice(0, 7) === ym ? today : `${ym}-01`);
}
export const TODAY_OUT_OF_TERM = '현재 회기에 오늘 날짜가 없습니다.';

/* ── 집계(하단 상태 바) ── */
export interface DaySummary { total: number; holidays: number; 마감: number; 미마감: number; 진행중: number; 예정: number }
export function summarize(days: readonly Pick<DayInfo, 'holiday' | 'status'>[]): DaySummary {
  const s: DaySummary = { total: days.length, holidays: 0, 마감: 0, 미마감: 0, 진행중: 0, 예정: 0 };
  for (const d of days) { if (d.holiday) s.holidays++; s[d.status]++; }
  return s;
}
export const summaryText = (s: DaySummary): string =>
  `전체 ${String(s.total)}일(휴일 ${String(s.holidays)}일) / 마감 ${String(s.마감)}일 / 미마감 ${String(s.미마감)}일 / 진행중 ${String(s.진행중)}일 / 예정 ${String(s.예정)}일`;

/* ── 마감 전 점검(13p 검증 4~6) ── */
export interface CloseChecks { prevDate: string; prevClosed: boolean; noUnapproved: boolean; balanced: boolean }
/** 직전 일자 = 바로 전날(동일 계정구분, 휴일 포함). 어떤 회기에도 없는 날(시스템 개시 전)이면 마감된 것으로 본다 */
export function closeChecks(terms: readonly FiscalTerm[], info: Pick<DayInfo, 'date' | 'unapproved' | 'balanced'>, account: string, closings: Closings): CloseChecks {
  const prevDate = shiftDate(info.date, -1);
  const prevClosed = !termOf(terms, account, prevDate) || !!activeClosing(closings, account, prevDate);
  return { prevDate, prevClosed, noUnapproved: info.unapproved === 0, balanced: info.balanced };
}
export const checksPass = (c: CloseChecks): boolean => c.prevClosed && c.noUnapproved && c.balanced;

export const REMARK_MAX = 200;
export const CLOSE_MSG = {
  account: '계정구분을 선택해 주세요.',
  term: '마감일자가 선택한 회기 기간에 속하지 않습니다.',
  future: '미래 일자는 마감할 수 없습니다.',
  prev: (d: string) => `직전 일자(${d})이 마감되지 않았습니다. 순서대로 마감해 주세요.`,
  unapproved: (n: number) => `미승인 전표 ${String(n)}건이 있어 마감할 수 없습니다. 승인/미승인전표관리에서 처리해 주세요.`,
  imbalance: '차변·대변 합계가 일치하지 않는 전표가 있습니다.',
  closed: '이미 마감된 일자입니다.',
  remark: '비고는 200자 이내로 입력해 주세요.',
  success: '마감 처리되었습니다.',
} as const;

/** 저장 검증 결과 — then: close = 모달 닫음(closed 면 재조회까지), stay = 모달 유지(점검 ☒), remark = 비고 칸 포커스 */
export type CloseCheck =
  | { ok: true }
  | { ok: false; code: 'account' | 'term' | 'future' | 'closed'; message: string; then: 'close' }
  | { ok: false; code: 'prev' | 'unapproved' | 'imbalance'; message: string; then: 'stay' }
  | { ok: false; code: 'remark'; message: string; then: 'remark' };

export const remarkError = (remark: string): string | null => (remark.length > REMARK_MAX ? CLOSE_MSG.remark : null);

/** 일마감 처리 저장 검증 — 13p 표 순서(0→8), 첫 미충족 1건 */
export function validateClose(ctx: { account: string; term: FiscalTerm | null; date: string; today: string; terms: readonly FiscalTerm[]; closings: Closings; remark: string }): CloseCheck {
  const { account, term, date, today, terms, closings, remark } = ctx;
  if (!account) return { ok: false, code: 'account', message: CLOSE_MSG.account, then: 'close' };
  if (!term || !inTerm(term, date)) return { ok: false, code: 'term', message: CLOSE_MSG.term, then: 'close' };
  if (date > today) return { ok: false, code: 'future', message: CLOSE_MSG.future, then: 'close' };
  const info = dayInfo(account as FundAccount, date, today, closings);
  const c = closeChecks(terms, info, account, closings);
  if (!c.prevClosed) return { ok: false, code: 'prev', message: CLOSE_MSG.prev(c.prevDate), then: 'stay' };
  if (!c.noUnapproved) return { ok: false, code: 'unapproved', message: CLOSE_MSG.unapproved(info.unapproved), then: 'stay' };
  if (!c.balanced) return { ok: false, code: 'imbalance', message: CLOSE_MSG.imbalance, then: 'stay' };
  if (info.closing) return { ok: false, code: 'closed', message: CLOSE_MSG.closed, then: 'close' };
  const re = remarkError(remark);
  if (re) return { ok: false, code: 'remark', message: re, then: 'remark' };
  return { ok: true };
}

/* ── 반영(원장 + 감사로그) ── */
export interface Actor { user: string; at: string }   // at = 'YYYY-MM-DD HH:mm:ss'
let logSeq = 0;
const logId = () => `log-${String(Date.now())}-${String(++logSeq)}`;
const entry = (kind: HistoryKind, t: FiscalTerm, date: string, a: Actor, before: string, after: string, reason: string): HistoryEntry =>
  ({ id: logId(), at: a.at, kind, account: t.account, term: termShort(t), date, user: userLabel(a.user), ip: userIp(a.user), before, after, reason });

/** 마감 — 날짜 오름차순으로 전부 반영(중간 실패 없음 — 검증은 호출 전에 끝낸다). 원본 불변 */
export function commitClose(closings: Closings, t: FiscalTerm, dates: readonly string[], remark: string, a: Actor): { closings: Record<string, Closing>; logs: HistoryEntry[] } {
  const next: Record<string, Closing> = { ...closings };
  const logs = [...dates].sort().map((date) => {
    next[closeKey(t.account, date)] = { account: t.account, termId: t.id, date, closedBy: a.user, closedAt: a.at, remark, cancelled: false };
    return entry('마감', t, date, a, '미마감', '마감', remark);
  });
  return { closings: next, logs };
}

export const REMARK_SAVED = '저장되었습니다.';
/** 비고 수정 — 비고만 바꾸고 전/후 이력을 남긴다. 같으면 null(변경 없음 — 화면은 그래도 '저장되었습니다.'를 띄우고 이력만 생략한다. 14p 에 별도 문구 없음) */
export function commitRemark(closings: Closings, t: FiscalTerm, date: string, remark: string, a: Actor): { closings: Record<string, Closing>; log: HistoryEntry } | null {
  const c = activeClosing(closings, t.account, date);
  if (!c || c.remark === remark) return null;
  return {
    closings: { ...closings, [closeKey(t.account, date)]: { ...c, remark } },
    log: entry('비고 수정', t, date, a, c.remark || '(없음)', remark || '(없음)', ''),
  };
}

/* ── 마감 취소(14p 검증 3~7 · E09) ── */
export const CANCEL_MSG = {
  reason: '마감 취소 사유를 입력해 주세요.',
  reasonMax: '마감 취소 사유는 200자 이내로 입력해 주세요.',   // 14p 필드 정의(200자) — 문구는 설계서에 없어 비고 문구를 본뜬 가정(PM 확인)
  later: (d: string) => `이후 일자(${d})가 마감되어 있어 취소할 수 없습니다. 최종 마감일부터 역순으로 취소해 주세요.`,
  yearClosed: '년마감이 완료된 회기는 일마감을 취소할 수 없습니다.',
  contiguous: '최종 마감일부터 연속된 일자만 취소할 수 있습니다.',
  confirm: (d: string) => `${d} 일마감을 취소하시겠습니까? 취소 후 해당 일자 전표 입력이 다시 허용됩니다.`,
  success: '마감 취소되었습니다.',
} as const;
export type CancelCheck = { ok: true } | { ok: false; code: 'reason' | 'later' | 'yearClosed' | 'contiguous'; message: string };
/** 사유 검증 — 미입력 → 200자 초과 순. 상세 모달(validateCancel)·목록 확인창이 같이 쓴다 */
export const reasonError = (reason: string): string | null =>
  (!reason.trim() ? CANCEL_MSG.reason : reason.length > REMARK_MAX ? CANCEL_MSG.reasonMax : null);

/** 계정구분의 최종 마감일(회기 무관) */
export function lastClosedDate(closings: Closings, account: string): string | null {
  let last: string | null = null;
  for (const c of Object.values(closings)) if (c.account === account && !c.cancelled && (!last || c.date > last)) last = c.date;
  return last;
}

/** 취소 게이트 — 대상 일자들이 "최종 마감일부터 거꾸로 연속"인지 + 년마감 회기가 아닌지. 사유 검증은 reason 이 null 이 아닐 때만(목록 E09 는 확인창에서) */
export function validateCancel(ctx: { account: string; dates: readonly string[]; terms: readonly FiscalTerm[]; closings: Closings; reason: string | null }): CancelCheck {
  const { account, terms, closings, reason } = ctx;
  const re = reason == null ? null : reasonError(reason);
  if (re) return { ok: false, code: 'reason', message: re };
  const dates = [...ctx.dates].sort().reverse();
  const last = lastClosedDate(closings, account);
  if (dates.length > 1) {
    const run = dates.every((d, i) => d === (i === 0 ? last : shiftDate(dates[i - 1], -1)));
    if (!run) return { ok: false, code: 'contiguous', message: CANCEL_MSG.contiguous };
  } else if (last && dates[0] < last) {
    return { ok: false, code: 'later', message: CANCEL_MSG.later(last) };
  }
  if (dates.some((d) => termOf(terms, account, d)?.yearClosed)) return { ok: false, code: 'yearClosed', message: CANCEL_MSG.yearClosed };
  return { ok: true };
}

/** 마감 취소 = 논리삭제(cancelled) + 감사로그(사유). 원본 불변 */
export function commitCancel(closings: Closings, terms: readonly FiscalTerm[], account: string, dates: readonly string[], reason: string, a: Actor): { closings: Record<string, Closing>; logs: HistoryEntry[] } {
  const next: Record<string, Closing> = { ...closings };
  const logs: HistoryEntry[] = [];
  for (const date of [...dates].sort().reverse()) {
    const c = activeClosing(closings, account, date);
    const t = termOf(terms, account, date);
    if (!c || !t) continue;
    next[closeKey(account, date)] = { ...c, cancelled: true };
    logs.push(entry('마감 취소', t, date, a, '마감', '미마감', reason.trim()));
  }
  return { closings: next, logs };
}

/* ── 기간 일괄 마감(15p) ── */
export type BulkVerdict = 'ok' | 'closed' | 'prevOpen' | 'prevFail' | 'unapproved' | 'imbalance';
export const BULK_VERDICT_LABEL: Record<BulkVerdict, string> = {
  ok: '통과', closed: '마감됨(제외)', prevOpen: '직전 일자 미마감', prevFail: '직전 일자 미통과', unapproved: '미승인 전표', imbalance: '차대 불일치',
};
export interface BulkRow { date: string; holiday: boolean; unapproved: number; prev: 'closed' | 'planned' | 'open'; verdict: BulkVerdict }

/** 기본 기간 = 회기 안 첫 미마감일 ~ 오늘(회기 끝으로 clamp). 미마감일이 없으면 오늘 ~ 오늘 */
export function bulkDefault(t: FiscalTerm, today: string, closings: Closings): [string, string] {
  const end = clampToTerm(t, today);
  for (let d = t.start; d <= end; d = shiftDate(d, 1)) if (!activeClosing(closings, t.account, d)) return [d, end];
  return [end, end];
}

/** 점검 결과 — 날짜 오름차순. 직전 일자가 계획 안에서 실패하면 그 뒤는 '직전 일자 미통과'로 번진다 */
export function bulkPlan(terms: readonly FiscalTerm[], account: FundAccount, from: string, to: string, today: string, closings: Closings): BulkRow[] {
  if (!from || !to || from > to) return [];
  const rows: BulkRow[] = [];
  for (const date of datesBetween(from, to)) {
    const info = dayInfo(account, date, today, closings);
    const before = rows[rows.length - 1];
    const prevDate = shiftDate(date, -1);
    const prevClosed = !termOf(terms, account, prevDate) || !!activeClosing(closings, account, prevDate);
    const prev: BulkRow['prev'] = prevClosed ? 'closed' : before ? 'planned' : 'open';
    const prevOk = prevClosed || (!!before && (before.verdict === 'ok' || before.verdict === 'closed'));
    const verdict: BulkVerdict = info.closing ? 'closed'
      : !prevOk ? (before ? 'prevFail' : 'prevOpen')
      : info.unapproved > 0 ? 'unapproved'
      : !info.balanced ? 'imbalance' : 'ok';
    rows.push({ date, holiday: info.holiday, unapproved: info.unapproved, prev, verdict });
  }
  return rows;
}

export const BULK_MSG = {
  account: CLOSE_MSG.account,
  empty: '마감 기간을 입력해 주세요.',
  order: '시작일은 종료일보다 늦을 수 없습니다.',
  range: '마감 기간은 회기 기간 내, 오늘 이전까지만 지정할 수 있습니다.',
  skipped: (n: number) => `이미 마감된 일자(${String(n)}일)는 제외하고 처리합니다.`,
  fail: (d: string, why: string) => `미통과 일자가 있어 일괄 마감할 수 없습니다. (${d}: ${why})`,
  none: '마감할 일자가 없습니다.',   // 설계서에 없는 경우(전 일자 마감됨) — 가정
  remark: CLOSE_MSG.remark,
  success: (n: number) => `${String(n)}일 마감 처리되었습니다.`,
} as const;
export type BulkField = 'from' | 'to' | 'remark' | null;

/** 점검 결과 미리보기 — 기간이 회기 안·오늘 이전일 때만 일자별 판정을 그린다(최대 회기 일수 — 수십 년 범위로 수만 행이 그려지지 않게).
    범위 밖이면 행 없이 안내(notice)만. 회기 밖 일자가 '통과'로 보이는 일도 없다 */
export function bulkPreview(term: Pick<FiscalTerm, 'start' | 'end'> | null, terms: readonly FiscalTerm[], account: FundAccount, from: string, to: string, today: string, closings: Closings): { rows: BulkRow[]; notice: string | null } {
  if (!from || !to) return { rows: [], notice: null };
  if (from > to) return { rows: [], notice: BULK_MSG.order };
  if (!term || from < term.start || to > term.end || to > today) return { rows: [], notice: BULK_MSG.range };
  return { rows: bulkPlan(terms, account, from, to, today, closings), notice: null };
}
export type BulkCheck =
  | { ok: true; dates: string[]; info: string | null; message: string }
  | { ok: false; code: 'account' | 'empty' | 'order' | 'range' | 'fail' | 'none' | 'remark'; message: string; field: BulkField; info: string | null };

/** 일괄 마감 검증 — 15p 표 순서(0→7). 4(이미 마감 포함)는 안내 후 계속, 5 이후는 전체 중단(부분 마감 없음) */
export function validateBulk(ctx: { account: string; term: FiscalTerm | null; from: string; to: string; today: string; terms: readonly FiscalTerm[]; closings: Closings; remark: string }): BulkCheck {
  const { account, term, from, to, today, terms, closings, remark } = ctx;
  const fail = (code: Exclude<BulkCheck, { ok: true }>['code'], message: string, field: BulkField, info: string | null = null): BulkCheck => ({ ok: false, code, message, field, info });
  if (!account) return fail('account', BULK_MSG.account, null);
  if (!from || !to) return fail('empty', BULK_MSG.empty, 'from');
  if (validateRange(from, to)) return fail('order', BULK_MSG.order, 'from');
  if (!term || from < term.start || to > term.end || to > today) return fail('range', BULK_MSG.range, 'to');
  const plan = bulkPlan(terms, account as FundAccount, from, to, today, closings);
  const skipped = plan.filter((r) => r.verdict === 'closed').length;
  const info = skipped ? BULK_MSG.skipped(skipped) : null;
  const bad = plan.find((r) => r.verdict !== 'ok' && r.verdict !== 'closed');
  if (bad) return fail('fail', BULK_MSG.fail(bad.date, BULK_VERDICT_LABEL[bad.verdict]), null, info);
  const dates = plan.filter((r) => r.verdict === 'ok').map((r) => r.date);
  if (!dates.length) return fail('none', BULK_MSG.none, null, info);
  if (remarkError(remark)) return fail('remark', BULK_MSG.remark, 'remark', info);
  return { ok: true, dates, info, message: BULK_MSG.success(dates.length) };
}

/* ── 처리이력 조회(16p) ── */
export interface HistoryFilter { from: string; to: string; account: string; kind: string }   // account·kind '' = 전체
export const HISTORY_EMPTY = '처리 이력이 없습니다.';
/** 기본 = 당월(1일~말일) · 계정구분 = 툴바 선택값 · 처리구분 = 전체 */
export function defaultHistoryFilter(today: string, account: string): HistoryFilter {
  const m = parseISO(today);
  return { from: ymd(startOfMonth(m)), to: ymd(endOfMonth(m)), account, kind: '' };
}
export { validateRange };
/** 처리일시(일자 부분) 기간 + 계정구분 + 처리구분, 최신순 */
export function filterHistory(log: readonly HistoryEntry[], f: HistoryFilter): HistoryEntry[] {
  return log.filter((h) => {
    const d = h.at.slice(0, 10);
    return (!f.from || d >= f.from) && (!f.to || d <= f.to) && (!f.account || h.account === f.account) && (!f.kind || h.kind === f.kind);
  }).sort((a, b) => (a.at === b.at ? 0 : a.at < b.at ? 1 : -1));
}

/** 처리일시 — 런타임 현재 시각 */
export const nowStamp = (): string => format(new Date(), 'yyyy-MM-dd HH:mm:ss');
