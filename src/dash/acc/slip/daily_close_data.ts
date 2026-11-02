/* 일마감(ACC-007) 더미 — 회기(SFR-016-04)·영업일/휴일(SFR-016-05)·일자별 전표 집계·마감 원장·처리이력(SFR-018-01).
   백엔드가 없어 연동 대상(회기관리·영업일관리·전표 집계)은 결정론적 데모 값으로 흉내 낸다.

   더미 규약(브리프):
   - **런타임 오늘** 기준(`demoDailyClose(today)`). 회기 = 계정구분별 역년(1/1~12/31) 3개(올해·전년·전전년), 전년 이전은 년마감 완료.
   - 휴일 = 토·일 + 양력 고정 공휴일(신정·삼일절·어린이날·현충일·광복절·개천절·한글날·성탄절). 음력 공휴일은 계산하지 않는다(데모).
   - 마감 원장은 계정구분마다 "마감 기준일(오늘 − N일) 이하 + 년마감 회기 전체"가 마감돼 있다 — 마감 구간은 항상 연속.
   - 마감 기준일 다음 날들은 시나리오(아래 SCENARIO)로 점검 통과/미승인/차대 불일치를 섞는다 — 첫 미마감일은 언제나 통과(정상 경로 시연).
   - 계정구분은 일반전표 공용 `FUND_ACCOUNTS`, 처리자는 가상 인물(실존 아님). */
import { format, addDays, parseISO, getDay } from 'date-fns';
import { FUND_ACCOUNTS, CURRENT_USER, todayStr } from './general_journal_data';
import type { FundAccount } from './general_journal_data';

/* ── 회기(SFR-016-04 회기관리 데모) ── */
export interface FiscalTerm {
  id: string;              // `${계정구분 index}-${연도}`
  account: FundAccount;
  no: number;              // 기수(제N기)
  year: number;
  start: string;           // 'YYYY-MM-DD'(포함)
  end: string;             // 'YYYY-MM-DD'(포함)
  yearClosed: boolean;     // 년마감 완료(SFR-016-07) — 일마감 취소 차단
}
/** 계정구분별 제1기 연도(데모) — 기수 = 연도 − 이 값 + 1 */
const FIRST_YEAR: Record<FundAccount, number> = { '농림수산식품모태펀드(기금)': 2010, '농식품 투자조합 계정': 2014, '수산 모태계정': 2018 };
export const termLabel = (t: Pick<FiscalTerm, 'no' | 'year'>): string => `제${String(t.no)}기(${String(t.year)})`;
export const termShort = (t: Pick<FiscalTerm, 'no'>): string => `제${String(t.no)}기`;

export function demoTerms(today: string): FiscalTerm[] {
  const y = Number(today.slice(0, 4));
  return FUND_ACCOUNTS.flatMap((account, ai) => [y, y - 1, y - 2].map((year) => ({
    id: `${String(ai)}-${String(year)}`, account, no: year - FIRST_YEAR[account] + 1, year,
    start: `${String(year)}-01-01`, end: `${String(year)}-12-31`, yearClosed: year < y,
  })));
}

/* ── 영업일/휴일(SFR-016-05 영업일관리 데모) — 휴일명은 표시 전용(마감 판정과 무관) ── */
const SOLAR_HOLIDAYS: Record<string, string> = {
  '01-01': '신정', '03-01': '삼일절', '05-05': '어린이날', '06-06': '현충일',
  '08-15': '광복절', '10-03': '개천절', '10-09': '한글날', '12-25': '성탄절',
};
/** 휴일 여부 + 휴일명(주말은 이름 없이 '휴일') */
export function holidayOf(date: string): { holiday: boolean; name: string } {
  const named = SOLAR_HOLIDAYS[date.slice(5)];
  if (named) return { holiday: true, name: named };
  const dow = getDay(parseISO(date));
  return dow === 0 || dow === 6 ? { holiday: true, name: '휴일' } : { holiday: false, name: '' };
}

/* ── 일자별 전표 집계(계정구분 × 일자) ── */
export interface SlipStats { approved: number; unapproved: number; deleted: number; balanced: boolean }
const ZERO: SlipStats = { approved: 0, unapproved: 0, deleted: 0, balanced: true };

/** 문자열 해시(FNV-1a 축약) — 데모 건수를 결정론적으로 만든다 */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** 계정구분별 마감 기준일 = 오늘 − N일(이하 전부 마감). 다음 날부터 SCENARIO 가 적용된다 */
export const CLOSE_LAG: Record<FundAccount, number> = { '농림수산식품모태펀드(기금)': 2, '농식품 투자조합 계정': 4, '수산 모태계정': 3 };
/** 마감 기준일 다음 날부터의 점검 시나리오(오늘 − k일 → 덮어쓸 집계). 키가 없으면 기본 집계(점검 통과) */
const SCENARIO: Record<FundAccount, Record<number, Partial<SlipStats>>> = {
  /* A: 어제 = 통과(단건 마감 시연) · 오늘 = 진행중 + 미승인 1 */
  '농림수산식품모태펀드(기금)': { 0: { approved: 3, unapproved: 1, deleted: 1 } },
  /* B: 3일 전·2일 전 = 통과 · 어제 = 미승인 2(기간 일괄 마감 실패 시연) */
  '농식품 투자조합 계정': { 1: { approved: 8, unapproved: 2 } },
  /* C: 2일 전 = 통과 · 어제 = 차대 불일치 */
  '수산 모태계정': { 1: { approved: 6, balanced: false } },
};

/** 계정구분·일자 전표 집계 — 미래 일자는 0. 시나리오는 올해 일자에만 걸린다(전년은 년마감이라 전부 마감) */
export function slipStats(account: FundAccount, date: string, today: string): SlipStats {
  if (date > today) return ZERO;
  const h = hash(account + '|' + date);
  const base: SlipStats = holidayOf(date).holiday
    ? { approved: h % 7 === 0 ? 1 : 0, unapproved: 0, deleted: 0, balanced: true }   // 휴일도 간혹 환원 전표가 있다
    : { approved: 3 + (h % 12), unapproved: 0, deleted: h % 5 === 0 ? 1 : 0, balanced: true };
  if (date.slice(0, 4) !== today.slice(0, 4)) return base;
  const k = Math.round((parseISO(today).getTime() - parseISO(date).getTime()) / 86400000);
  const over = SCENARIO[account][k];
  return over ? { ...base, ...over } : base;
}

/* ── 마감 원장 ── */
export interface Closing {
  account: FundAccount;
  termId: string;
  date: string;            // 마감일자 'YYYY-MM-DD'
  closedBy: string;        // 마감자 성명
  closedAt: string;        // 'YYYY-MM-DD HH:mm:ss'
  remark: string;
  cancelled: boolean;      // 마감 취소 = 논리삭제(물리삭제 없음 — SFR-023-02). 재마감 시 새 레코드로 덮는다
}
/** 원장 키 = 계정구분 + 마감일자. 한 계정구분에서 일자는 회기 하나에만 속하므로 설계서 중복 키(계정구분+회기+마감일자)와 같다 */
export const closeKey = (account: string, date: string): string => `${account}|${date}`;
export type Closings = Readonly<Record<string, Closing>>;

/* ── 처리자(사용자관리 연동 데모) ── */
export const USERS: Record<string, { id: string; ip: string }> = {
  김민준: { id: 'kim.mj', ip: '192.168.10.25' },
  이서연: { id: 'lee.sy', ip: '192.168.10.31' },
  박지훈: { id: 'park.jh', ip: '192.168.10.47' },
};
const CLOSERS = Object.keys(USERS);
export const userLabel = (name: string): string => `${name} / ${USERS[name]?.id ?? '-'}`;
export const userIp = (name: string): string => USERS[name]?.ip ?? '-';
export { CURRENT_USER };

/* ── 처리이력(SFR-018-01) ── */
export const HISTORY_KINDS = ['마감', '마감 취소', '비고 수정'] as const;
export type HistoryKind = typeof HISTORY_KINDS[number];
export interface HistoryEntry {
  id: string;
  at: string;              // 처리일시 'YYYY-MM-DD HH:mm:ss'
  kind: HistoryKind;
  account: FundAccount;
  term: string;            // '제N기'
  date: string;            // 마감일자
  user: string;            // '성명 / 아이디'
  ip: string;
  before: string;          // 변경 전(마감상태 또는 비고)
  after: string;           // 변경 후
  reason: string;          // 마감 취소 사유 · 마감 비고
}

const pad = (n: number) => String(n).padStart(2, '0');
const nextDay = (d: string) => format(addDays(parseISO(d), 1), 'yyyy-MM-dd');

export interface DailyCloseSeed { terms: FiscalTerm[]; closings: Record<string, Closing>; history: HistoryEntry[] }

/** 데모 시드 — 회기·마감 원장·처리이력. 오늘(today) 기준 */
export function demoDailyClose(today: string = todayStr()): DailyCloseSeed {
  const terms = demoTerms(today);
  const closings: Record<string, Closing> = {};
  const history: HistoryEntry[] = [];
  let seq = 0;
  for (const t of terms) {
    const cutoff = format(addDays(parseISO(today), -CLOSE_LAG[t.account]), 'yyyy-MM-dd');
    for (let d = t.start; d <= t.end; d = nextDay(d)) {
      if (!t.yearClosed && d > cutoff) break;
      const h = hash(t.account + '#' + d);
      const by = CLOSERS[h % CLOSERS.length];
      /* 영업일 = 당일 저녁 마감, 휴일 = 다음 날 아침에 몰아서 마감 */
      const at = holidayOf(d).holiday
        ? `${nextDay(d)} 09:${pad(h % 50)}:${pad(h % 60)}`
        : `${d} 18:${pad(h % 50)}:${pad(h % 60)}`;
      const remark = d.slice(8) === '28' ? '월말 잔액 대사 완료' : '';
      closings[closeKey(t.account, d)] = { account: t.account, termId: t.id, date: d, closedBy: by, closedAt: at, remark, cancelled: false };
      /* 최근 8일(올해 회기)만 이력에 남긴다 — 이력 팝업 기본 기간(당월)에 걸리도록 */
      if (!t.yearClosed && d > format(addDays(parseISO(cutoff), -8), 'yyyy-MM-dd')) {
        history.push({ id: `h${String(++seq)}`, at, kind: '마감', account: t.account, term: termShort(t), date: d, user: userLabel(by), ip: userIp(by), before: '미마감', after: '마감', reason: remark });
      }
    }
  }
  /* 취소·비고수정 샘플 — 첫 계정구분의 최종 마감일을 오늘 아침 취소 → 재마감 → 비고 수정(역순 규칙과 맞고, 이력 팝업 기본 기간(당월)에 항상 걸린다) */
  const a = FUND_ACCOUNTS[0];
  const target = format(addDays(parseISO(today), -CLOSE_LAG[a]), 'yyyy-MM-dd');
  const c = closings[closeKey(a, target)];
  const t = terms.find((x) => x.id === c?.termId);
  if (c && t && !t.yearClosed) {
    const d0 = today;
    history.push(
      { id: `h${String(++seq)}`, at: `${d0} 08:10:40`, kind: '마감 취소', account: a, term: termShort(t), date: target, user: userLabel('이서연'), ip: userIp('이서연'), before: '마감', after: '미마감', reason: '전표 정정 필요' },
      { id: `h${String(++seq)}`, at: `${d0} 08:42:05`, kind: '마감', account: a, term: termShort(t), date: target, user: userLabel(c.closedBy), ip: userIp(c.closedBy), before: '미마감', after: '마감', reason: '' },
      { id: `h${String(seq + 1)}`, at: `${d0} 08:50:12`, kind: '비고 수정', account: a, term: termShort(t), date: target, user: userLabel(c.closedBy), ip: userIp(c.closedBy), before: '(없음)', after: '정정 전표 반영 후 재마감', reason: '' },
    );
    closings[closeKey(a, target)] = { ...c, closedAt: `${d0} 08:42:05`, remark: '정정 전표 반영 후 재마감' };
  }
  return { terms, closings, history };
}
