/* 미결계정 관리(ACC-005) — 순수 로직. 화면(suspense_manage.tsx)·모달·테스트가 공유한다.
   날짜는 'YYYY-MM-DD' 문자열(사전순 = 시간순), '오늘'은 호출부가 주입한다(테스트 결정성).
   정리 상태는 전부 행의 `clearings` 에서 파생한다 — 누적정리금액 = Σ, 정리여부 = 누적 === 발생금액, 화면 정리 칸 = 최근 1건. */
import { format, subMonths } from 'date-fns';
import { nextSeq } from './general_journal_model';
import type { JournalRow } from './general_journal_data';
import { DEPOSIT_ACCOUNT, PARTNER_ACCOUNTS, buildSlip, jline, kindOf, slipNoOf, suspenseAccount } from './suspense_data';
import type { Clearing, PartnerAccount, SuspenseKind, SuspenseRow } from './suspense_data';

type Slips = Record<string, JournalRow>;

/* ── 파생 ── */
export const clearedAmount = (r: SuspenseRow): number => r.clearings.reduce((s, c) => s + c.amount, 0);
export const remainingOf = (r: SuspenseRow): number => r.occurAmount - clearedAmount(r);
/** 정리여부 '여' = 누적정리금액 === 발생금액 */
export const isCleared = (r: SuspenseRow): boolean => clearedAmount(r) === r.occurAmount;
export const latestClearing = (r: SuspenseRow): Clearing | undefined => r.clearings[r.clearings.length - 1];
export const rowKind = (r: SuspenseRow): SuspenseKind | undefined => kindOf(r.accountCode);

/** 화면 정리 칸 — 정리일·정리전표번호·정리결재상태는 최근 전표, 정리금액은 누적(부분정리 진행이 보이게). 없으면 '-'/null */
export function clearView(r: SuspenseRow): { date: string; amount: number | null; slipNo: string; approval: string } {
  const c = latestClearing(r);
  if (!c) return { date: '-', amount: null, slipNo: '-', approval: '-' };
  return { date: c.date, amount: clearedAmount(r), slipNo: c.slipNo, approval: c.approval };
}
/** 계좌정보·예금주 — 채무 계정 건만 표시, 채권 건은 '-' */
export const bankView = (r: SuspenseRow): { bankAccount: string; holder: string } =>
  rowKind(r) === '채무' ? { bankAccount: r.bankAccount, holder: r.holder } : { bankAccount: '-', holder: '-' };

const pick = (rows: readonly SuspenseRow[], ids: readonly string[]): SuspenseRow[] => {
  const s = new Set(ids);
  return rows.filter((r) => s.has(r.id));
};
const openApproved = (r: SuspenseRow) => r.occurApproval === '승인' && !isCleared(r);

/* ── 버튼 활성 게이트 ── */
/** [정리] — 1건 이상, 전부 발생 '승인' + 미정리, 계정구분·계정과목 모두 동일(거래처 무관) */
export function canClear(rows: readonly SuspenseRow[], ids: readonly string[]): boolean {
  const sel = pick(rows, ids);
  if (!sel.length || sel.length !== ids.length) return false;
  return sel.every(openApproved) && sel.every((r) => r.fundAccount === sel[0].fundAccount && r.accountCode === sel[0].accountCode);
}
/** [정리취소] — 정확히 1건, 발생 '승인' + 정리전표번호 있음.
    부분정리는 설계서 확장 — 잔액 미정리 상태에서도 최근 정리전표 1장을 취소할 수 있어야 정정 가능(그래서 정리완료 여부는 보지 않는다) */
export function canCancel(rows: readonly SuspenseRow[], ids: readonly string[]): boolean {
  const sel = pick(rows, ids);
  return ids.length === 1 && sel.length === 1 && sel[0].occurApproval === '승인' && sel[0].clearings.length > 0;
}
/** 상계 짝 — 정확히 2건 = 채권 1 + 채무 1. 아니면 null */
export function offsetPair(rows: readonly SuspenseRow[], ids: readonly string[]): { claim: SuspenseRow; debt: SuspenseRow } | null {
  const sel = pick(rows, ids);
  if (ids.length !== 2 || sel.length !== 2) return null;
  const claim = sel.find((r) => rowKind(r) === '채권');
  const debt = sel.find((r) => rowKind(r) === '채무');
  return claim && debt ? { claim, debt } : null;
}
/** 상계 조건 일치 — 거래처·계정구분·미정리잔액 동일(잔액 > 0) */
const pairMatches = (claim: SuspenseRow, debt: SuspenseRow): boolean =>
  claim.partner !== '-' && claim.custNo === debt.custNo && claim.fundAccount === debt.fundAccount
  && remainingOf(claim) === remainingOf(debt) && remainingOf(claim) > 0;
/** [채권채무상계] — 채권 1 + 채무 1, 거래처·계정구분·미정리잔액 동일, 둘 다 '승인'·미정리 */
export function canOffset(rows: readonly SuspenseRow[], ids: readonly string[]): boolean {
  const pair = offsetPair(rows, ids);
  return !!pair && openApproved(pair.claim) && openApproved(pair.debt) && pairMatches(pair.claim, pair.debt);
}
/** [거래처 계좌 변경] — 정확히 1건(결재상태 조건 없음) */
export const canChangeAccount = (rows: readonly SuspenseRow[], ids: readonly string[]): boolean => ids.length === 1 && pick(rows, ids).length === 1;

/* ── 목록 필터 ── */
export interface SuspenseFilter {
  fundAccount: string;              // 계정구분
  partner: string;                  // 거래처(검색 팝업 선택 — 거래처명 일치)
  memo: string;                     // 적요(부분일치)
  accountName: string;              // 계정과목
  occurFrom: string; occurTo: string;   // 발생기간
  clearFrom: string; clearTo: string;   // 정리기간(최근 정리일)
  clearedYn: '' | '여' | '부';      // 정리여부
}
export const DEFAULT_OCCUR_FROM = '2022-01-01';
/** 기본값 — 정리여부 = 부, 발생기간 = 2022-01-01 ~ 오늘(진입·[초기화]) */
export const defaultFilter = (today: string): SuspenseFilter => ({
  fundAccount: '', partner: '', memo: '', accountName: '',
  occurFrom: DEFAULT_OCCUR_FROM, occurTo: today, clearFrom: '', clearTo: '', clearedYn: '부',
});

const inRange = (v: string, from: string, to: string) => (!from || v >= from) && (!to || v <= to);
export function suspensePasses(r: SuspenseRow, f: SuspenseFilter): boolean {
  if (f.fundAccount && r.fundAccount !== f.fundAccount) return false;
  if (f.partner && r.partner !== f.partner) return false;
  const m = f.memo.trim().toLowerCase();
  if (m && !r.memo.toLowerCase().includes(m)) return false;
  if (f.accountName && r.accountName !== f.accountName) return false;
  if (!inRange(r.occurDate, f.occurFrom, f.occurTo)) return false;
  /* 정리 이력이 없는 건은 정리기간 조건이 걸리면 제외 */
  if (f.clearFrom || f.clearTo) {
    const c = latestClearing(r);
    if (!c || !inRange(c.date, f.clearFrom, f.clearTo)) return false;
  }
  if (f.clearedYn === '여' && !isCleared(r)) return false;
  if (f.clearedYn === '부' && isCleared(r)) return false;
  return true;
}
export const filterSuspense = (rows: readonly SuspenseRow[], f: SuspenseFilter): SuspenseRow[] => rows.filter((r) => suspensePasses(r, f));

/* ── 전표 채번 — 페이지 전표 맵(fixture + 생성분) 전체 기준 ── */
export function nextSlipNo(slips: Slips, date: string): string {
  return slipNoOf(date, nextSeq(Object.values(slips), date));
}

/* ══ 모달 ① 미결계정정리 ══ */
export const CLEAR_MSG = {
  amountEmpty: '정리금액을(를) 입력하세요.',
  amountOver: '정리금액이 미정리잔액을 초과할 수 없습니다.',
  date: '정리일을(를) 선택하세요.',
  bankAccount: '계좌번호을(를) 선택하세요.',
  clearAccount: '정리 계정과목을(를) 확인하세요.',
  success: '정리전표가 생성되었습니다.',
} as const;

export interface ClearInput {
  date: string;
  amount: number | null;   // 단건만 사용 — 다건은 각 행 잔액 전액
  reason: string;          // 정리사유 → 정리전표 헤더 적요
  clearer: string;         // 정리자 → 작성자
  bankAccount: string;     // 계좌번호(계정구분의 운용계좌)
  clearAccountCode: string; // 정리 계정과목(예금 — 계좌 선택 시 자동)
  memo: string;            // 정리적요 → 분개 적요
}
export type ClearField = 'date' | 'amount' | 'bankAccount' | 'clearAccount';
export type FieldCheck<F extends string> = { ok: true } | { ok: false; field: F; message: string };

/** 계좌 선택 → 정리 계정과목(예금). 계좌가 없으면 '' */
export const clearAccountFor = (bankAccount: string): string => (bankAccount && DEPOSIT_ACCOUNT ? DEPOSIT_ACCOUNT.code : '');

/** 저장 검증 — 화면 위→아래(정리일·정리금액·계좌번호·정리 계정과목) 첫 미충족 1건만 */
export function validateClear(input: ClearInput, remaining: number): FieldCheck<ClearField> {
  if (!input.date) return { ok: false, field: 'date', message: CLEAR_MSG.date };
  if (input.amount == null || input.amount <= 0) return { ok: false, field: 'amount', message: CLEAR_MSG.amountEmpty };
  if (input.amount > remaining) return { ok: false, field: 'amount', message: CLEAR_MSG.amountOver };
  if (!input.bankAccount) return { ok: false, field: 'bankAccount', message: CLEAR_MSG.bankAccount };
  if (!input.clearAccountCode) return { ok: false, field: 'clearAccount', message: CLEAR_MSG.clearAccount };
  return { ok: true };
}

const partnerLine = (r: SuspenseRow) => (r.partner === '-' ? undefined : { mgmtNo: r.mgmtNo, partner: r.partner, accountNo: r.bankAccount });

/** 정리 반영 — 행마다 정리전표 1장(미상신, 발생구분 '미결'). 단건 = 입력 정리금액, 다건 = 각 행 잔액 전액.
    분개: 채무 차) 미결 / 대) 예금 · 채권 차) 예금 / 대) 미결 */
export function commitClear(rows: readonly SuspenseRow[], slips: Slips, ids: readonly string[], input: ClearInput): { rows: SuspenseRow[]; slips: Slips; created: string[] } {
  /* 방어 — 게이트 불통과면 원장 그대로(호출부가 게이트를 우회해도 잘못된 전표를 만들지 않게) */
  if (!canClear(rows, ids)) return { rows: [...rows], slips, created: [] };
  const sel = new Set(ids);
  const single = ids.length === 1;
  const nextSlips: Slips = { ...slips };
  const created: string[] = [];
  const depName = DEPOSIT_ACCOUNT?.name ?? '-';
  const next = rows.map((r) => {
    if (!sel.has(r.id)) return r;
    const amount = single && input.amount != null ? input.amount : remainingOf(r);
    const slipNo = nextSlipNo(nextSlips, input.date);
    const acc = suspenseAccount(r.accountCode);
    const headMemo = input.reason.trim() || r.memo + ' 정리';
    const lineMemo = input.memo.trim() || headMemo;
    const bankLine = { mgmtNo: '-', partner: '-', accountNo: input.bankAccount };
    const lines = rowKind(r) === '채무'
      ? [jline(r.accountCode, acc?.name ?? r.accountName, lineMemo, amount, null, partnerLine(r)), jline(input.clearAccountCode, depName, lineMemo, null, amount, bankLine)]
      : [jline(input.clearAccountCode, depName, lineMemo, amount, null, bankLine), jline(r.accountCode, acc?.name ?? r.accountName, lineMemo, null, amount, partnerLine(r))];
    nextSlips[slipNo] = buildSlip({ slipNo, slipDate: input.date, fundAccount: r.fundAccount, memo: headMemo, partner: r.partner, approval: '미상신', origin: '미결', writer: input.clearer, lines });
    created.push(slipNo);
    return { ...r, clearings: [...r.clearings, { slipNo, date: input.date, amount, approval: '미상신' as const, offset: false }] };
  });
  return { rows: next, slips: nextSlips, created };
}

/* ══ 모달 ② 채권채무상계 ══ */
export const OFFSET_MSG = {
  date: '정리일을(를) 선택하세요.',
  closed: '마감된 월에는 상계할 수 없습니다.',
  stale: '이미 정리되었거나 승인되지 않은 건이 포함되어 있습니다.',
  mismatch: '상계할 수 없습니다. 거래처·계정구분·금액을 확인하세요.',
  success: '상계전표가 생성되었습니다.',
} as const;
export const DEFAULT_OFFSET_REASON = '채권채무 상계';

/** 데모 마감월 — 오늘 기준 직전 N개월(당월은 마감 전이라 기본 정리일 = 오늘은 항상 통과) */
export const CLOSED_MONTH_COUNT = 3;
export function closedMonths(today: string, n: number = CLOSED_MONTH_COUNT): string[] {
  const d = new Date(today + 'T00:00:00');
  return Array.from({ length: n }, (_, i) => format(subMonths(d, i + 1), 'yyyy-MM'));
}
export const isClosedMonth = (date: string, today: string): boolean => closedMonths(today).includes(date.slice(0, 7));

export type OffsetCheck =
  | { ok: true; claim: SuspenseRow; debt: SuspenseRow }
  | { ok: false; code: 'date' | 'closed' | 'stale' | 'mismatch'; message: string };

/** 상계 저장 검증 — 저장 시점 원장(rows)으로 다시 본다. stale = 모달 닫고 목록 갱신, 그 외 = 모달 유지 */
export function validateOffset(rows: readonly SuspenseRow[], ids: readonly string[], date: string, today: string): OffsetCheck {
  if (!date) return { ok: false, code: 'date', message: OFFSET_MSG.date };
  if (isClosedMonth(date, today)) return { ok: false, code: 'closed', message: OFFSET_MSG.closed };
  const sel = pick(rows, ids);
  if (sel.length !== ids.length || sel.some((r) => !openApproved(r))) return { ok: false, code: 'stale', message: OFFSET_MSG.stale };
  const pair = offsetPair(rows, ids);
  if (!pair || !pairMatches(pair.claim, pair.debt)) return { ok: false, code: 'mismatch', message: OFFSET_MSG.mismatch };
  return { ok: true, ...pair };
}

export interface OffsetInput { date: string; clearer: string; reason: string; memo: string }

/** 상계 반영 — 상계전표 1장(미상신): 차) 채무과목 / 대) 채권과목(상계금액 = 잔액). 두 행 정리전표번호에 같은 번호 */
export function commitOffset(rows: readonly SuspenseRow[], slips: Slips, ids: readonly string[], input: OffsetInput): { rows: SuspenseRow[]; slips: Slips; slipNo: string } | null {
  /* 방어 — 게이트 불통과면 반영하지 않는다(null = 원장 그대로) */
  const pair = offsetPair(rows, ids);
  if (!pair || !canOffset(rows, ids)) return null;
  const { claim, debt } = pair;
  const amount = remainingOf(claim);
  const slipNo = nextSlipNo(slips, input.date);
  const headMemo = input.reason.trim() || DEFAULT_OFFSET_REASON;
  const lineMemo = input.memo.trim() || headMemo;
  const lines = [
    jline(debt.accountCode, debt.accountName, lineMemo, amount, null, partnerLine(debt)),
    jline(claim.accountCode, claim.accountName, lineMemo, null, amount, partnerLine(claim)),
  ];
  const nextSlips: Slips = { ...slips, [slipNo]: buildSlip({ slipNo, slipDate: input.date, fundAccount: claim.fundAccount, memo: headMemo, partner: claim.partner, approval: '미상신', origin: '미결', writer: input.clearer, lines }) };
  const c: Clearing = { slipNo, date: input.date, amount, approval: '미상신', offset: true };
  const next = rows.map((r) => (r.id === claim.id || r.id === debt.id ? { ...r, clearings: [...r.clearings, { ...c }] } : r));
  return { rows: next, slips: nextSlips, slipNo };
}

/* ══ 정리취소(E03) ══ */
export const CANCEL_MSG = { success: '정리가 취소되었습니다' } as const;

/** 취소 대상 — 선택 행의 최근 정리전표 + 그 전표를 공유하는 행 전부(상계 짝 포함) */
export function cancelTargets(rows: readonly SuspenseRow[], id: string): { slipNo: string; offset: boolean; ids: string[] } | null {
  const r = rows.find((x) => x.id === id);
  const c = r && latestClearing(r);
  if (!c) return null;
  return { slipNo: c.slipNo, offset: c.offset, ids: rows.filter((x) => x.clearings.some((k) => k.slipNo === c.slipNo)).map((x) => x.id) };
}

/** 정리취소 반영 — 그 전표분을 대상 행 정리 이력에서 빼고(누적정리금액 차감) 전표 맵에서 지운다 */
export function commitCancel(rows: readonly SuspenseRow[], slips: Slips, id: string): { rows: SuspenseRow[]; slips: Slips; ids: string[] } | null {
  /* 방어 — 게이트 불통과면 반영하지 않는다(null = 원장 그대로) */
  if (!canCancel(rows, [id])) return null;
  const t = cancelTargets(rows, id);
  if (!t) return null;
  const nextSlips: Slips = { ...slips };
  delete nextSlips[t.slipNo];
  const next = rows.map((r) => (t.ids.includes(r.id) ? { ...r, clearings: r.clearings.filter((c) => c.slipNo !== t.slipNo) } : r));
  return { rows: next, slips: nextSlips, ids: t.ids };
}

/* ══ 모달 ③ 계좌번호 변경 ══ */
export const ACCOUNT_MSG = { required: '계좌번호을(를) 선택하세요.', success: '계좌번호가 변경되었습니다.' } as const;
export const partnerAccounts = (custNo: string): PartnerAccount[] => PARTNER_ACCOUNTS[custNo] ?? [];
export function validateAccountChange(accountNo: string): FieldCheck<'accountNo'> {
  return accountNo ? { ok: true } : { ok: false, field: 'accountNo', message: ACCOUNT_MSG.required };
}
/** 계좌정보·예금주 갱신 — 그 거래처 등록 계좌에서 찾는다(없으면 행 그대로) */
export function commitAccountChange(rows: readonly SuspenseRow[], id: string, accountNo: string): SuspenseRow[] {
  return rows.map((r) => {
    if (r.id !== id) return r;
    const a = partnerAccounts(r.custNo).find((x) => x.accountNo === accountNo);
    return a ? { ...r, bankAccount: a.accountNo, holder: a.holder } : r;
  });
}
