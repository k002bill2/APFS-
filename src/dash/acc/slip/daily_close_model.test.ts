/* 일마감(ACC-007) — 순수 로직 테스트: 시드 일관성·상태 판정·달력 범위·회기 경계 이동·마감 전 점검·
   저장 검증 순서(13p)·마감 취소 게이트(14p·E09)·기간 일괄 마감(15p)·처리이력 조회(16p) */
import { describe, expect, it } from 'vitest';
import { FUND_ACCOUNTS, todayStr } from './general_journal_data';
import { CLOSE_LAG, closeKey, demoDailyClose, holidayOf, slipStats } from './daily_close_data';
import type { Closings, FiscalTerm } from './daily_close_data';
import {
  BULK_MSG, CANCEL_MSG, CLOSE_MSG, activeClosing, bulkDefault, bulkPlan, bulkPreview, canShift, checksPass, closeChecks, commitCancel, commitClose,
  commitRemark, currentTerm, dateWithDayKind, dayInfo, dayStatus, defaultHistoryFilter, filterHistory, lastClosedDate, monthGrid, shiftAnchor, shiftDate,
  reasonError, summarize, termOf, validateBulk, validateCancel, validateClose, weekDates, weekLabel,
} from './daily_close_model';

const TODAY = '2026-01-20';   // 화요일
const [A, B, C] = FUND_ACCOUNTS;
const fresh = () => demoDailyClose(TODAY);
const termFor = (terms: FiscalTerm[], acc: string) => {
  const t = currentTerm(terms, acc, TODAY);
  if (!t) throw new Error('회기 없음');
  return t;
};
const ACTOR = { user: '김민준', at: '2026-01-20 18:00:00' };

describe('시드', () => {
  it('계정구분마다 회기 3개, 전년 이전은 년마감', () => {
    const { terms } = fresh();
    for (const acc of FUND_ACCOUNTS) {
      const ts = terms.filter((t) => t.account === acc);
      expect(ts).toHaveLength(3);
      expect(ts.filter((t) => t.yearClosed).map((t) => t.year).sort()).toEqual([2024, 2025]);
    }
  });
  it('마감 구간은 연속이고 최종 마감일 = 오늘 − CLOSE_LAG', () => {
    const { closings } = fresh();
    for (const acc of FUND_ACCOUNTS) {
      expect(lastClosedDate(closings, acc)).toBe(shiftDate(TODAY, -CLOSE_LAG[acc]));
      for (let d = '2024-01-01'; d <= shiftDate(TODAY, -CLOSE_LAG[acc]); d = shiftDate(d, 1)) expect(activeClosing(closings, acc, d), acc + d).not.toBeNull();
    }
  });
  it('마감된 일자는 전부 점검 통과(미승인 0 · 차대 일치)', () => {
    const { closings } = fresh();
    for (const c of Object.values(closings)) {
      const s = slipStats(c.account, c.date, TODAY);
      expect(s.unapproved, c.date).toBe(0);
      expect(s.balanced, c.date).toBe(true);
    }
  });
  it('첫 미마감일은 계정구분마다 점검 통과(정상 경로 시연)', () => {
    const { terms, closings } = fresh();
    for (const acc of FUND_ACCOUNTS) {
      const first = shiftDate(TODAY, -CLOSE_LAG[acc] + 1);
      expect(checksPass(closeChecks(terms, dayInfo(acc, first, TODAY, closings), acc, closings)), acc).toBe(true);
    }
  });
  it('휴일 = 주말 + 양력 공휴일, 휴일명은 표시용', () => {
    expect(holidayOf('2026-01-01')).toEqual({ holiday: true, name: '신정' });
    expect(holidayOf('2026-01-03')).toEqual({ holiday: true, name: '휴일' });
    expect(holidayOf('2026-01-05').holiday).toBe(false);
  });
});

describe('상태 판정', () => {
  it('마감 > 예정 > 진행중 > 미마감', () => {
    expect(dayStatus('2026-01-19', TODAY, true)).toBe('마감');
    expect(dayStatus('2026-01-21', TODAY, false)).toBe('예정');
    expect(dayStatus(TODAY, TODAY, false)).toBe('진행중');
    expect(dayStatus('2026-01-19', TODAY, false)).toBe('미마감');
  });
  it('미래 일자 전표 건수는 0', () => {
    expect(slipStats(A, '2026-01-25', TODAY)).toEqual({ approved: 0, unapproved: 0, deleted: 0, balanced: true });
  });
  it('월 집계', () => {
    const { closings } = fresh();
    const s = summarize(Array.from({ length: 31 }, (_, i) => dayInfo(A, `2026-01-${String(i + 1).padStart(2, '0')}`, TODAY, closings)));
    expect(s.total).toBe(31);
    expect(s.마감).toBe(18);
    expect(s.미마감).toBe(1);
    expect(s.진행중).toBe(1);
    expect(s.예정).toBe(11);
    expect(s.holidays).toBe(10);   // 1/1 신정 + 주말 9일
  });
});

describe('달력 범위·이동', () => {
  it('월간 그리드 = 7열, 1일 앞 빈칸', () => {
    const g = monthGrid('2026-01');
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(g[0].slice(0, 4)).toEqual([null, null, null, null]);   // 2026-01-01 = 목
    expect(g[0][4]).toBe('2026-01-01');
    expect(g.flat().filter(Boolean)).toHaveLength(31);
  });
  it('주 = 일~토, 월·연도 경계를 넘는다', () => {
    expect(weekDates(TODAY)[0]).toBe('2026-01-18');
    expect(weekLabel(TODAY)).toBe('01.18 ~ 01.24');
    expect(weekDates('2026-01-01')[0]).toBe('2025-12-28');
  });
  it('회기 경계 밖 이동 비활성 · 월 이동은 1일(오늘이 그 달이면 오늘)', () => {
    const t = termFor(fresh().terms, A);
    expect(canShift('month', '2026-01-10', t, -1)).toBe(false);
    expect(canShift('month', '2026-01-10', t, 1)).toBe(true);
    expect(canShift('month', '2026-12-10', t, 1)).toBe(false);
    expect(canShift('week', '2026-01-02', t, -1)).toBe(false);
    expect(canShift('week', '2026-12-30', t, 1)).toBe(false);
    expect(shiftAnchor('month', '2026-01-20', t, 1, TODAY)).toBe('2026-02-01');
    expect(shiftAnchor('month', '2026-02-05', t, -1, TODAY)).toBe(TODAY);
    expect(shiftAnchor('week', '2026-01-03', t, -1, TODAY)).toBe('2026-01-01');   // 회기 시작으로 clamp
  });
});

describe('일마감 처리 검증(13p 순서)', () => {
  const base = () => { const s = fresh(); return { ...s, term: termFor(s.terms, A) }; };
  it('통과 = 첫 미마감일', () => {
    const s = base();
    expect(validateClose({ account: A, term: s.term, date: '2026-01-19', today: TODAY, terms: s.terms, closings: s.closings, remark: '' })).toEqual({ ok: true });
  });
  it('0 계정구분 · 1 회기 밖 · 2 미래', () => {
    const s = base();
    const ctx = { account: A, term: s.term, date: '2026-01-19', today: TODAY, terms: s.terms, closings: s.closings, remark: '' };
    expect(validateClose({ ...ctx, account: '' })).toMatchObject({ code: 'account', message: CLOSE_MSG.account });
    expect(validateClose({ ...ctx, date: '2025-12-31' })).toMatchObject({ code: 'term', then: 'close' });
    expect(validateClose({ ...ctx, date: '2026-01-21' })).toMatchObject({ code: 'future', message: CLOSE_MSG.future });
  });
  it('4 직전 미마감 · 5 미승인 · 6 차대', () => {
    const s = base();
    expect(validateClose({ account: A, term: s.term, date: TODAY, today: TODAY, terms: s.terms, closings: s.closings, remark: '' }))
      .toMatchObject({ code: 'prev', message: CLOSE_MSG.prev('2026-01-19'), then: 'stay' });
    const closedA = commitClose(s.closings, s.term, ['2026-01-19'], '', ACTOR).closings;
    expect(validateClose({ account: A, term: s.term, date: TODAY, today: TODAY, terms: s.terms, closings: closedA, remark: '' }))
      .toMatchObject({ code: 'unapproved', message: CLOSE_MSG.unapproved(1) });
    const tc = termFor(s.terms, C);
    const closedC = commitClose(s.closings, tc, ['2026-01-18'], '', ACTOR).closings;
    expect(validateClose({ account: C, term: tc, date: '2026-01-19', today: TODAY, terms: s.terms, closings: closedC, remark: '' }))
      .toMatchObject({ code: 'imbalance' });
  });
  it('7 이미 마감(동시 처리) · 8 비고 200자', () => {
    const s = base();
    const ctx = { account: A, term: s.term, date: '2026-01-19', today: TODAY, terms: s.terms, closings: s.closings, remark: '' };
    const closed = commitClose(s.closings, s.term, ['2026-01-19'], '', ACTOR).closings;
    expect(validateClose({ ...ctx, closings: closed })).toMatchObject({ code: 'closed', then: 'close' });
    expect(validateClose({ ...ctx, remark: 'x'.repeat(201) })).toMatchObject({ code: 'remark', message: CLOSE_MSG.remark });
    expect(validateClose({ ...ctx, remark: 'x'.repeat(200) }).ok).toBe(true);
  });
  it('마감 반영 = 원장 + 감사로그, 원본 불변', () => {
    const s = base();
    const r = commitClose(s.closings, s.term, ['2026-01-19'], '확인', ACTOR);
    expect(activeClosing(r.closings, A, '2026-01-19')).toMatchObject({ closedBy: '김민준', remark: '확인' });
    expect(activeClosing(s.closings, A, '2026-01-19')).toBeNull();
    expect(r.logs[0]).toMatchObject({ kind: '마감', before: '미마감', after: '마감', user: '김민준 / kim.mj' });
  });
  it('비고 수정 — 같으면 null, 다르면 전/후 이력', () => {
    const s = base();
    expect(commitRemark(s.closings, s.term, '2026-01-18', activeClosing(s.closings, A, '2026-01-18')?.remark ?? '', ACTOR)).toBeNull();
    const r = commitRemark(s.closings, s.term, '2026-01-18', '새 비고', ACTOR);
    expect(r?.log).toMatchObject({ kind: '비고 수정', after: '새 비고' });
    expect(activeClosing(r?.closings ?? {}, A, '2026-01-18')?.remark).toBe('새 비고');
  });
});

describe('마감 취소 게이트', () => {
  it('3 사유 → 4 역순 → 5 년마감', () => {
    const { terms, closings } = fresh();
    const ctx = { account: A, terms, closings, reason: '정정' };
    expect(validateCancel({ ...ctx, dates: ['2026-01-18'], reason: ' ' })).toMatchObject({ code: 'reason', message: CANCEL_MSG.reason });
    expect(validateCancel({ ...ctx, dates: ['2026-01-18'] })).toEqual({ ok: true });
    expect(validateCancel({ ...ctx, dates: ['2026-01-10'] })).toMatchObject({ code: 'later', message: CANCEL_MSG.later('2026-01-18') });
    /* 올해 마감을 전부 지우면 전년 12/31 이 최종 — 년마감이라 차단 */
    const onlyPrev: Closings = Object.fromEntries(Object.entries(closings).filter(([, c]) => c.date < '2026-01-01'));
    expect(validateCancel({ ...ctx, closings: onlyPrev, dates: ['2025-12-31'] })).toMatchObject({ code: 'yearClosed' });
  });
  it('사유 200자 — 초과는 막고(14p 필드 정의) 200자는 통과', () => {
    const { terms, closings } = fresh();
    const ctx = { account: A, terms, closings, dates: ['2026-01-18'] };
    expect(validateCancel({ ...ctx, reason: 'x'.repeat(201) })).toMatchObject({ code: 'reason', message: CANCEL_MSG.reasonMax });
    expect(validateCancel({ ...ctx, reason: 'x'.repeat(200) })).toEqual({ ok: true });
    expect(reasonError('')).toBe(CANCEL_MSG.reason);
    expect(reasonError('x'.repeat(201))).toBe(CANCEL_MSG.reasonMax);
    expect(reasonError('정정')).toBeNull();
  });
  it('이후 일자 마감은 다른 달에 있어도 막는다 · 다른 계정구분은 무관', () => {
    const { terms, closings } = fresh();
    const t = termFor(terms, B);
    const more = commitClose(closings, t, ['2026-01-17', '2026-01-18'], '', ACTOR).closings;   // B 최종 = 1/18
    expect(validateCancel({ account: B, dates: ['2026-01-16'], terms, closings: more, reason: null })).toMatchObject({ code: 'later' });
    expect(validateCancel({ account: A, dates: ['2026-01-18'], terms, closings: more, reason: null }).ok).toBe(true);
  });
  it('복수 선택 = 최종 마감일부터 거꾸로 연속', () => {
    const { terms, closings } = fresh();
    expect(validateCancel({ account: A, dates: ['2026-01-17', '2026-01-18'], terms, closings, reason: null }).ok).toBe(true);
    expect(validateCancel({ account: A, dates: ['2026-01-16', '2026-01-18'], terms, closings, reason: null })).toMatchObject({ code: 'contiguous' });
    expect(validateCancel({ account: A, dates: ['2026-01-16', '2026-01-17'], terms, closings, reason: null })).toMatchObject({ code: 'contiguous' });
  });
  it('취소 = 논리삭제(cancelled) + 사유 이력', () => {
    const { terms, closings } = fresh();
    const r = commitCancel(closings, terms, A, ['2026-01-18'], ' 정정 ', ACTOR);
    expect(r.closings[closeKey(A, '2026-01-18')].cancelled).toBe(true);
    expect(activeClosing(r.closings, A, '2026-01-18')).toBeNull();
    expect(r.logs[0]).toMatchObject({ kind: '마감 취소', reason: '정정', before: '마감', after: '미마감' });
  });
});

describe('기간 일괄 마감', () => {
  it('기본 기간 = 첫 미마감일 ~ 오늘', () => {
    const { terms, closings } = fresh();
    expect(bulkDefault(termFor(terms, B), TODAY, closings)).toEqual(['2026-01-17', TODAY]);
  });
  it('점검 — 미승인 실패가 뒤로 번지고 이미 마감은 제외', () => {
    const { terms, closings } = fresh();
    const plan = bulkPlan(terms, B, '2026-01-15', TODAY, TODAY, closings);
    expect(plan.map((r) => r.verdict)).toEqual(['closed', 'closed', 'ok', 'ok', 'unapproved', 'prevFail']);
    expect(plan[2].prev).toBe('closed');
    expect(plan[3].prev).toBe('planned');
  });
  it('점검 미리보기 — 회기 밖·오늘 이후·역전 기간은 행 없이 안내만(수십 년 범위도 0행)', () => {
    const { terms, closings } = fresh();
    const term = termFor(terms, B);
    expect(bulkPreview(term, terms, B, '2026-01-15', TODAY, TODAY, closings).rows).toHaveLength(6);
    expect(bulkPreview(term, terms, B, '1990-01-01', '2026-01-18', TODAY, closings)).toEqual({ rows: [], notice: BULK_MSG.range });
    expect(bulkPreview(term, terms, B, '2026-01-15', '2026-01-21', TODAY, closings)).toEqual({ rows: [], notice: BULK_MSG.range });
    expect(bulkPreview(term, terms, B, '2026-01-18', '2026-01-15', TODAY, closings)).toEqual({ rows: [], notice: BULK_MSG.order });
    expect(bulkPreview(term, terms, B, '', TODAY, TODAY, closings)).toEqual({ rows: [], notice: null });
  });
  it('검증 순서 1~3', () => {
    const { terms, closings } = fresh();
    const term = termFor(terms, B);
    const ctx = { account: B, term, from: '2026-01-17', to: '2026-01-18', today: TODAY, terms, closings, remark: '' };
    expect(validateBulk({ ...ctx, account: '' })).toMatchObject({ code: 'account' });
    expect(validateBulk({ ...ctx, to: '' })).toMatchObject({ code: 'empty', message: BULK_MSG.empty, field: 'from' });
    expect(validateBulk({ ...ctx, from: '2026-01-19' })).toMatchObject({ code: 'order', field: 'from' });
    expect(validateBulk({ ...ctx, to: '2026-01-21' })).toMatchObject({ code: 'range', field: 'to' });
    expect(validateBulk({ ...ctx, from: '2025-12-30' })).toMatchObject({ code: 'range' });
  });
  it('미통과 일자가 있으면 전체 중단(마감 0건) · 이미 마감 안내는 함께', () => {
    const { terms, closings } = fresh();
    const r = validateBulk({ account: B, term: termFor(terms, B), from: '2026-01-15', to: TODAY, today: TODAY, terms, closings, remark: '' });
    expect(r).toMatchObject({ ok: false, code: 'fail', message: BULK_MSG.fail('2026-01-19', '미승인 전표'), info: BULK_MSG.skipped(2) });
  });
  it('통과 = N일 마감 · 전 일자 마감됨 = 대상 없음 · 비고 200자', () => {
    const { terms, closings } = fresh();
    const term = termFor(terms, B);
    const ctx = { account: B, term, from: '2026-01-15', to: '2026-01-18', today: TODAY, terms, closings, remark: '' };
    const ok = validateBulk(ctx);
    expect(ok).toMatchObject({ ok: true, dates: ['2026-01-17', '2026-01-18'], message: BULK_MSG.success(2) });
    expect(validateBulk({ ...ctx, to: '2026-01-16' })).toMatchObject({ code: 'none' });
    expect(validateBulk({ ...ctx, remark: 'x'.repeat(201) })).toMatchObject({ code: 'remark', field: 'remark' });
  });
});

describe('처리이력', () => {
  it('기본 = 당월 · 툴바 계정구분 · 최신순', () => {
    const { history } = fresh();
    const f = defaultHistoryFilter(TODAY, A);
    expect(f).toEqual({ from: '2026-01-01', to: '2026-01-31', account: A, kind: '' });
    const rows = filterHistory(history, f);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((h) => h.account === A)).toBe(true);
    expect(rows.map((h) => h.at)).toEqual([...rows.map((h) => h.at)].sort().reverse());
    expect(rows.some((h) => h.kind === '마감 취소')).toBe(true);
    expect(rows.some((h) => h.kind === '비고 수정')).toBe(true);
  });
  it('런타임 오늘에도 기본 조회(당월)에 마감·마감 취소·비고 수정 3종이 다 보인다', () => {
    const now = todayStr();
    if (shiftDate(now, -CLOSE_LAG[A]).slice(0, 4) !== now.slice(0, 4)) return;   // 1/1~1/2 는 최종 마감일이 년마감 회기라 샘플이 없다
    const kinds = new Set(filterHistory(demoDailyClose(now).history, defaultHistoryFilter(now, A)).map((h) => h.kind));
    expect([...kinds].sort()).toEqual(['마감', '마감 취소', '비고 수정'].sort());
  });
  it('처리구분·기간 필터, 0건', () => {
    const { history } = fresh();
    expect(filterHistory(history, { from: '', to: '', account: '', kind: '마감 취소' }).every((h) => h.kind === '마감 취소')).toBe(true);
    expect(filterHistory(history, { from: '2030-01-01', to: '2030-01-31', account: '', kind: '' })).toEqual([]);
  });
  it('termOf — 일자가 속한 회기', () => {
    const { terms } = fresh();
    expect(termOf(terms, A, '2025-06-01')?.yearClosed).toBe(true);
    expect(termOf(terms, A, '2027-01-01')).toBeNull();
  });
});

describe('일자 표기', () => {
  it("직전 일자 — 휴일이면 '(일·휴일)'(13p 예시)", () => {
    expect(dateWithDayKind('2026-01-18')).toBe('2026-01-18 (일·휴일)');
    expect(dateWithDayKind('2026-01-19')).toBe('2026-01-19 (월)');
  });
});
