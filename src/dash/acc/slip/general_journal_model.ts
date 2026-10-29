/* 일반전표 관리(ACC-003) — 목록 화면 순수 로직. 화면(general_journal_manage.tsx)과 테스트가 공유한다.
   날짜는 전부 'YYYY-MM-DD' 문자열(사전순 = 시간순)로 비교하고, '오늘'은 호출부가 주입한다(테스트 결정성). */
import { format, startOfMonth, subDays, subMonths } from 'date-fns';
import { ACCOUNTS } from '../account_data';
import type { AccountItem } from '../account_data';
import { BASE_CURRENCY, CURRENT_USER, JOURNAL_ORIGINS, SLIP_KINDS, lineTotals } from './general_journal_data';
import type { ApprovalStatus, Currency, EvidenceType, FundAccount, JournalLine, JournalOrigin, JournalRow, Partner } from './general_journal_data';

/** 기본 기간 = 전월 1일 ~ 오늘(slide 10 예시 `2026-09-01 ~ 2026-10-27`). 1월이면 전년 12월 1일. */
export function defaultPeriod(today: string): [string, string] {
  const d = new Date(today + 'T00:00:00');
  return [format(startOfMonth(subMonths(d, 1)), 'yyyy-MM-dd'), today];
}

export const RANGE_ERROR = '시작일은 종료일보다 늦을 수 없습니다.';

/** 범위 검증 — 양끝이 모두 있고 시작 > 종료면 오류 문구, 아니면 null(한쪽만 있는 열린 범위는 허용) */
export function validateRange(from: string, to: string): string | null {
  return from && to && from > to ? RANGE_ERROR : null;
}

/** 목록 필터 조건 — 빈 문자열 = 조건 없음 */
export interface JournalFilter {
  fundAccount: string;              // 계정구분
  from: string; to: string;         // 기간(전표일)
  approvedYn: '' | '여' | '부';     // 승인여부 — 여 = 결재 승인, 부 = 그 외
  origin: '' | JournalOrigin;       // 전표발생구분
  writer: string; partner: string; memo: string; slipNo: string;   // 부분일치
  dueFrom: string; dueTo: string;   // 자금집행예정기간
}

export const EMPTY_DETAIL: Omit<JournalFilter, 'from' | 'to'> = {
  fundAccount: '', approvedYn: '', origin: '', writer: '', partner: '', memo: '', slipNo: '', dueFrom: '', dueTo: '',
};

const has = (hay: string, needle: string) => {
  const n = needle.trim().toLowerCase();
  return !n || hay.toLowerCase().includes(n);
};
const inRange = (v: string, from: string, to: string) => (!from || v >= from) && (!to || v <= to);

export function journalPasses(r: JournalRow, f: JournalFilter): boolean {
  if (f.fundAccount && r.fundAccount !== f.fundAccount) return false;
  if (!inRange(r.slipDate, f.from, f.to)) return false;
  if (f.approvedYn === '여' && r.approval !== '승인') return false;
  if (f.approvedYn === '부' && r.approval === '승인') return false;
  if (f.origin && r.origin !== f.origin) return false;
  if (!has(r.writer, f.writer) || !has(r.partner, f.partner) || !has(r.memo, f.memo) || !has(r.slipNo, f.slipNo)) return false;
  /* 자금집행예정일이 없는('-') 전표는 그 범위 조건이 걸리면 제외 */
  if (f.dueFrom || f.dueTo) {
    if (r.fundDueDate === '-' || !inRange(r.fundDueDate, f.dueFrom, f.dueTo)) return false;
  }
  return true;
}

export const filterJournals = (rows: readonly JournalRow[], f: JournalFilter): JournalRow[] => rows.filter((r) => journalPasses(r, f));

/** 결재상신 가능 상태 — 미상신·반려만(상신·승인은 이미 결재선에 있음) */
export const canSubmit = (s: ApprovalStatus): boolean => s === '미상신' || s === '반려';

/** 결재상신 전이 — 선택 id 중 가능 건만 '상신'으로, 불가 건은 건수로 돌려준다(slide 22: 불가 건 제외 후 안내) */
export function submitForApproval(rows: readonly JournalRow[], ids: readonly string[], user?: string): { rows: JournalRow[]; submitted: number; skipped: number } {
  const sel = new Set(ids);
  let submitted = 0, skipped = 0;
  const next = rows.map((r) => {
    if (!sel.has(r.id)) return r;
    if (!canSubmit(r.approval)) { skipped += 1; return r; }
    submitted += 1;
    return { ...r, approval: '상신' as const, updatedBy: user ?? r.updatedBy };
  });
  return { rows: next, submitted, skipped };
}

/** 삭제 게이트(slide 25 + 리뷰 결정) — 당일자(작성일 = 오늘) **이고** 결재 미상신·반려인 전표만 삭제 가능.
    조건 밖 전표가 하나라도 섞이면 전체 중단. blocked = 당일자 아님, locked = 상신·승인(결재선에 있음 — 역분개로 정정). */
export function deleteGate(rows: readonly JournalRow[], ids: readonly string[], today: string): { ok: boolean; blocked: number; locked: number } {
  const sel = new Set(ids);
  const picked = rows.filter((r) => sel.has(r.id));
  const blocked = picked.filter((r) => r.writtenDate !== today).length;
  const locked = picked.filter((r) => !canSubmit(r.approval)).length;
  return { ok: ids.length > 0 && blocked === 0 && locked === 0, blocked, locked };
}

export const DELETE_GATE_MSG = '당일자 전표만 삭제할 수 있습니다.';
export const DELETE_LOCKED_MSG = '상신·승인된 전표는 삭제할 수 없습니다. 역분개로 정정하세요.';
/** 게이트 결과 → 안내 문구(상신·승인 사유가 우선). 통과면 null */
export const deleteGateMessage = (g: { ok: boolean; locked: number }): string | null => (g.ok ? null : g.locked ? DELETE_LOCKED_MSG : DELETE_GATE_MSG);

/** 전표등록 화면 진입 상태 — 청크 B 가 이 계약으로 화면을 연다 */
export type ReverseKind = '마이너스전표' | '상계전표';
export type EntryState =
  | { mode: 'new' }
  | { mode: 'edit'; source: JournalRow }
  | { mode: 'copy'; source: JournalRow }
  | { mode: 'reverse'; source: JournalRow; reverseKind: ReverseKind; date: string };


/* ══════════════════════════════════════════════════════════════
   전표등록 화면(청크 B · slide 12) 순수 로직 — journal_entry_screen.tsx 와 테스트가 공유한다.
   화면 state(EntryForm)는 입력 편의형: 텍스트 N/A = '' (저장 시 '-'), 금액 N/A = null, 각 행은 안정 key 를 가진다
   (이동·복사·삭제 시 React key·체크 상태가 행을 따라가게 — 저장 시 key 는 버린다).
══════════════════════════════════════════════════════════════ */

export interface EntryLine extends JournalLine { key: string }

let keySeq = 0;
/** 분개 행 key — 세션 내 유일(순수성 예외: 식별자 발급만) */
export const nextLineKey = (): string => 'ln-' + String(++keySeq);

export const emptyLine = (): EntryLine => ({
  key: nextLineKey(), accountCode: '', accountName: '', memo: '', mgmtNo: '', partner: '', accountNo: '', debit: null, credit: null,
});

/** 빈 행 = 계정코드 없음 + 차변·대변 모두 없음. 적요는 보지 않는다(대표적요 자동 반영이 빈 행에도 적요를 쓰기 때문).
    저장 시 무시·빈행삭제·차액 자동 행 판정이 모두 이 하나를 쓴다. */
export const isBlankLine = (l: JournalLine): boolean => !l.accountCode.trim() && l.debit == null && l.credit == null;

/** 계정코드 미입력 ⚠ 대상 = 빈 행이 아닌데(금액이 있음) 계정코드가 없는 행 */
export const missingCode = (l: JournalLine): boolean => !isBlankLine(l) && !l.accountCode.trim();

/** 행 차액 = 차변 − 대변 */
export const lineDiff = (l: JournalLine): number => (l.debit ?? 0) - (l.credit ?? 0);

/** Σ 합계 — 차변·대변·차액 */
export function entryTotals(lines: readonly JournalLine[]): { debit: number; credit: number; diff: number } {
  const t = lines.reduce((s, l) => ({ debit: s.debit + (l.debit ?? 0), credit: s.credit + (l.credit ?? 0) }), { debit: 0, credit: 0 });
  return { ...t, diff: t.debit - t.credit };
}

/** 차액 자동 1행(slide 12 "차액이 있으면 1행 자동 추가") — 합계 차액≠0 이고 빈 행이 하나도 없을 때만 1행 추가(무한 증가 금지) */
export function withAutoRow(lines: EntryLine[]): EntryLine[] {
  if (entryTotals(lines).diff === 0 || lines.some(isBlankLine)) return lines;
  return [...lines, emptyLine()];
}

/** 대표 적요 자동 반영 — 적요가 비었거나 **직전 대표 적요와 같은** 행을 새 대표 적요로(타이핑 중 매 글자 추종) */
export function syncMemo(lines: EntryLine[], prev: string, next: string): EntryLine[] {
  return lines.map((l) => (l.memo === '' || l.memo === prev ? { ...l, memo: next } : l));
}

/** [대표적요반영] — 전 행 덮어쓰기 */
export const applyRepMemo = (lines: EntryLine[], memo: string): EntryLine[] => lines.map((l) => ({ ...l, memo }));

/* ── 그리드 도구 8종(체크 행 기준) ── */
/** 위로/아래로 이동 — 체크 행을 한 칸씩. 경계에 막힌 행은 그 자리(블록이 서로 추월하지 않는다) */
export function moveChecked(lines: EntryLine[], checked: ReadonlySet<string>, dir: -1 | 1): EntryLine[] {
  const a = [...lines];
  const order = dir === -1 ? a.map((_, i) => i) : a.map((_, i) => a.length - 1 - i);
  for (const i of order) {
    const j = i + dir;
    if (!checked.has(a[i].key) || j < 0 || j >= a.length || checked.has(a[j].key)) continue;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** 결과가 0행이면 빈 행 1개를 둔다(그리드가 비지 않게) */
const atLeastOne = (ls: EntryLine[]): EntryLine[] => (ls.length ? ls : [emptyLine()]);
export const deleteChecked = (lines: EntryLine[], checked: ReadonlySet<string>): EntryLine[] => atLeastOne(lines.filter((l) => !checked.has(l.key)));
export const deleteBlank = (lines: EntryLine[]): EntryLine[] => atLeastOne(lines.filter((l) => !isBlankLine(l)));
/** [행복사] — 체크 행 바로 아래에 복제(새 key) */
export function duplicateChecked(lines: EntryLine[], checked: ReadonlySet<string>): EntryLine[] {
  return lines.flatMap((l) => (checked.has(l.key) ? [l, { ...l, key: nextLineKey() }] : [l]));
}
/** Alt+K 마지막행 복사 및 추가 — 마지막 **비어있지 않은** 행을 끝에 복제(끝의 자동 빈 행은 복사해도 의미가 없다). 빈 행뿐이면 빈 행 추가 */
export function copyLastAppend(lines: EntryLine[]): EntryLine[] {
  const src = [...lines].reverse().find((l) => !isBlankLine(l));
  return [...lines, src ? { ...src, key: nextLineKey() } : emptyLine()];
}
/** Alt+C 이전 적요 복사 — 대상 행(없으면 마지막 행)에 바로 위 행의 적요를 복사. 첫 행이면 그대로 */
export function copyPrevMemo(lines: EntryLine[], targetKey?: string | null): EntryLine[] {
  let i = targetKey ? lines.findIndex((l) => l.key === targetKey) : -1;
  if (i < 0) i = lines.length - 1;
  if (i < 1) return lines;
  const memo = lines[i - 1].memo;
  return lines.map((l, k) => (k === i ? { ...l, memo } : l));
}

/* ── 계정과목·거래처 반영 ── */
export const findAccount = (code: string): AccountItem | undefined => ACCOUNTS.find((a) => a.code === code.trim());
export const AGGREGATE_ACCOUNT_MSG = '집계 계정은 입력할 수 없습니다.';
/** 계정 반영 결과 — 집계(입력여부 N) 계정이면 코드·과목을 비우고 rejected=true */
export function applyAccountTo(l: EntryLine, a: AccountItem): { line: EntryLine; rejected: boolean } {
  if (a.inputYn === 'N') return { line: { ...l, accountCode: '', accountName: '' }, rejected: true };
  return { line: { ...l, accountCode: a.code, accountName: a.name }, rejected: false };
}
/** 계정코드 입력 후 blur/Tab — 코드 일치 시 과목 자동 채움. 미일치면 과목을 비운다 */
export function resolveCode(l: EntryLine): { line: EntryLine; rejected: boolean } {
  const code = l.accountCode.trim();
  if (!code) return { line: { ...l, accountCode: '', accountName: l.accountName }, rejected: false };
  const a = findAccount(code);
  return a ? applyAccountTo(l, a) : { line: { ...l, accountCode: code, accountName: '' }, rejected: false };
}
/* 텍스트 N/A('-')는 입력칸에 그대로 붙이지 않는다(화면 state 는 '' = 없음) — 간편추가 거래처는 계좌번호가 없다 */
export const applyPartnerTo = (l: EntryLine, p: Partner): EntryLine => ({ ...l, partner: p.name, mgmtNo: dash(p.mgmtNo), accountNo: dash(p.accountNo) });

/* ── 금액 입력 ── */
/** 콤마·공백 제거 후 정수/실수 파싱. 빈 값·'-' 단독 = null */
export function parseAmount(text: string): number | null {
  const t = text.replace(/[,\s]/g, '');
  if (t === '' || t === '-') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
export const formatAmount = (n: number | null): string => (n == null ? '' : n.toLocaleString('ko-KR'));
/** `+` 키 = 현재값 × 1,000(설계서 "+/- 입력 시 1,000 단위" 중 '+'만 — '-'는 음수 입력과 충돌) */
export const times1000 = (n: number | null): number | null => (n == null ? null : n * 1000);

/* ── 화면 폼 state ── */
export interface EntryForm {
  id: string;                      // '' = 미저장 신규(저장 시 채번)
  slipNo: string; seq: string;     // 신규면 ''
  slipDate: string;                // 전표일 — 헤더에 없음(가정: 신규·복사 = 작성일 추종, 역분개 = 모달 값, 수정 = 원 값)
  slipDateFollows: boolean;        // true 면 slipDate = writtenDate(신규·복사)
  approval: ApprovalStatus;
  createdBy: string;
  fundAccount: FundAccount | '';
  slipKind: string;
  writer: string;
  writtenDate: string;
  origin: JournalOrigin;
  memo: string;
  evidenceType: EvidenceType | '';
  storage: string;
  noEvidence: boolean;
  attachments: string;             // DocumentsField CSV 계약("a.pdf, b.png")
  partnerAccountNo: string;
  fundDueDate: string;
  currency: Currency;
  exchangeRate: string;
  foreignAmount: string;
  plDept: string;
  plEmployee: string;
  lines: EntryLine[];
}

const dash = (v: string | undefined | null) => (v == null || v === '-' ? '' : v);
const undash = (v: string) => (v.trim() === '' ? '-' : v.trim());
const toLine = (l: JournalLine): EntryLine => ({
  key: nextLineKey(), accountCode: l.accountCode, accountName: dash(l.accountName), memo: dash(l.memo),
  mgmtNo: dash(l.mgmtNo), partner: dash(l.partner), accountNo: dash(l.accountNo), debit: l.debit, credit: l.credit,
});

/** 신규 — 빈 2행, 작성일=오늘, 전표구분 정상·작성자 로그인 사용자·발생구분 일반 */
export function formNew(today: string): EntryForm {
  return {
    id: '', slipNo: '', seq: '', slipDate: today, slipDateFollows: true, approval: '미상신', createdBy: CURRENT_USER,
    fundAccount: '', slipKind: SLIP_KINDS[0], writer: CURRENT_USER, writtenDate: today, origin: JOURNAL_ORIGINS[0], memo: '',
    evidenceType: '', storage: '', noEvidence: false, attachments: '',
    partnerAccountNo: '', fundDueDate: '', currency: BASE_CURRENCY, exchangeRate: '', foreignAmount: '', plDept: '', plEmployee: '',
    lines: [emptyLine(), emptyLine()],
  };
}

/** 수정 — 저장값 바인딩(첨부 포함) */
export function formFromRow(r: JournalRow): EntryForm {
  return {
    id: r.id, slipNo: r.slipNo, seq: r.seq, slipDate: r.slipDate, slipDateFollows: false, approval: r.approval, createdBy: r.createdBy,
    fundAccount: r.fundAccount, slipKind: r.slipKind, writer: r.writer, writtenDate: r.writtenDate, origin: r.origin, memo: r.memo,
    evidenceType: r.evidenceType, storage: dash(r.storage), noEvidence: r.noEvidence, attachments: r.attachments.join(', '),
    partnerAccountNo: dash(r.partnerAccountNo), fundDueDate: dash(r.fundDueDate), currency: r.currency,
    exchangeRate: r.exchangeRate == null ? '' : String(r.exchangeRate), foreignAmount: r.foreignAmount == null ? '' : String(r.foreignAmount),
    plDept: dash(r.plDept), plEmployee: dash(r.plEmployee),
    lines: r.lines.length ? r.lines.map(toLine) : [emptyLine()],
  };
}

/** 복사(slide 24) — 원 값 그대로 + 작성일=오늘 · 전표번호 신규(미채번) · 첨부 미복사 · 결재 미상신 · 작성자 로그인 사용자 */
export function formCopy(r: JournalRow, today: string): EntryForm {
  return {
    ...formFromRow(r),
    id: '', slipNo: '', seq: '', slipDate: today, slipDateFollows: true, approval: '미상신', createdBy: CURRENT_USER,
    writer: CURRENT_USER, writtenDate: today, attachments: '',
  };
}

export const REVERSE_PREFIX = '[역분개] ';
const prefixed = (m: string) => (m === '' || m.startsWith(REVERSE_PREFIX) ? m : REVERSE_PREFIX + m);
const neg = (n: number | null) => (n == null ? null : n === 0 ? 0 : -n);   // −0 표시 방지
const negText = (v: string) => { const n = parseAmount(v); return n == null ? v : String(n === 0 ? 0 : -n); };

/** 역분개(slide 23) — 가정: 마이너스전표 = 같은 변에 음수 금액 / 상계전표 = 차변↔대변 교환.
    전표일 = 모달 값, 작성일 = 오늘, 적요(헤더·행) 앞에 "[역분개] "(중복 접두 방지), 첨부 미복사, 신규(미저장) */
export function formReverse(r: JournalRow, kind: ReverseKind, date: string, today: string): EntryForm {
  const base = formCopy(r, today);
  return {
    ...base,
    slipDate: date, slipDateFollows: false,
    memo: prefixed(base.memo),
    /* 마이너스전표는 외화금액도 부호 반전(원화 금액과 같은 변·같은 부호 규칙) */
    ...(kind === '마이너스전표' ? { foreignAmount: negText(base.foreignAmount) } : {}),
    lines: base.lines.map((l) => ({
      ...l,
      memo: prefixed(l.memo),
      ...(kind === '마이너스전표' ? { debit: neg(l.debit), credit: neg(l.credit) } : { debit: l.credit, credit: l.debit }),
    })),
  };
}

export function formFromEntry(e: EntryState, today: string): EntryForm {
  switch (e.mode) {
    case 'new': return formNew(today);
    case 'edit': return formFromRow(e.source);
    case 'copy': return formCopy(e.source, today);
    case 'reverse': return formReverse(e.source, e.reverseKind, e.date, today);
  }
}

/** 조회 전용 — 수정 진입인데 결재가 상신·승인이면 입력 불가(slide 26). 반려·미상신은 수정 가능 */
export const isReadOnlyEntry = (mode: EntryState['mode'], approval: ApprovalStatus): boolean => mode === 'edit' && (approval === '상신' || approval === '승인');

/** dirty 비교용 스냅샷 — 행 key 는 제외(행 순서·값만) */
export const formSnapshot = (f: EntryForm): string => JSON.stringify({ ...f, lines: f.lines.map(({ key: _k, ...rest }) => rest) });

/* ── 저장 검증(slide 12 표 순서) ── */
export const ENTRY_MSG = {
  fundAccount: '계정구분을(를) 선택하세요.',
  memo: '적요을(를) 입력하세요.',
  accountCode: '계정코드가 입력되지 않은 행이 있습니다.',   // 설계서는 ⚠ 표시만 — 토스트 문구는 가정
  badCode: '존재하지 않거나 입력할 수 없는 계정코드입니다.',   // 리뷰 결정 — 미존재·집계(N) 계정
  amount: '금액을 입력하세요.',                           // 리뷰 결정 — 계정코드만 있고 차변·대변 모두 없음
  balance: '차변과 대변 금액이 일치하지 않습니다.',
  empty: '분개 행을 입력하세요.',                         // 설계서 외 가정 — 유효 행 0건 저장 방지
  saved: '저장되었습니다',
} as const;
export type EntryCheck =
  | { ok: true }
  | { ok: false; field: 'fundAccount' | 'memo' | 'balance' | 'empty'; message: string }
  | { ok: false; field: 'accountCode' | 'amount'; message: string; rowKey: string };

/** 계정코드가 입력 가능한 계정(ACCOUNTS 에 있고 입력여부 Y)인가 */
const usableCode = (code: string): boolean => findAccount(code)?.inputYn === 'Y';
/** 계정코드만 있고 차변·대변이 모두 없는 행 */
export const missingAmount = (l: JournalLine): boolean => !!l.accountCode.trim() && l.debit == null && l.credit == null;

/** 위→아래 순서: 계정구분 → 적요 → 계정코드 미입력 행 → 계정코드 미존재·집계 행 → 금액 없는 행 → 차액≠0 → (유효 행 0건). 빈 행은 무시 */
export function validateEntry(f: Pick<EntryForm, 'fundAccount' | 'memo' | 'lines'>): EntryCheck {
  if (!f.fundAccount) return { ok: false, field: 'fundAccount', message: ENTRY_MSG.fundAccount };
  if (!f.memo.trim()) return { ok: false, field: 'memo', message: ENTRY_MSG.memo };
  const miss = f.lines.find(missingCode);
  if (miss) return { ok: false, field: 'accountCode', message: ENTRY_MSG.accountCode, rowKey: miss.key };
  const bad = f.lines.find((l) => !isBlankLine(l) && !usableCode(l.accountCode));
  if (bad) return { ok: false, field: 'accountCode', message: ENTRY_MSG.badCode, rowKey: bad.key };
  const noAmt = f.lines.find(missingAmount);
  if (noAmt) return { ok: false, field: 'amount', message: ENTRY_MSG.amount, rowKey: noAmt.key };
  const used = f.lines.filter((l) => !isBlankLine(l));
  if (entryTotals(used).diff !== 0) return { ok: false, field: 'balance', message: ENTRY_MSG.balance };
  if (!used.length) return { ok: false, field: 'empty', message: ENTRY_MSG.empty };
  return { ok: true };
}

/** 폼 → 목록 행(빈 행 제외 · 텍스트 N/A '-' · 금액 = 차변 합 · 대표 거래처 = 첫 거래처). 채번 전이면 id·seq·slipNo 가 '' */
export function formToJournal(f: EntryForm): JournalRow {
  const lines: JournalLine[] = f.lines.filter((l) => !isBlankLine(l)).map(({ key: _k, ...l }) => ({
    ...l, accountName: undash(l.accountName), memo: l.memo.trim(), mgmtNo: undash(l.mgmtNo), partner: undash(l.partner), accountNo: undash(l.accountNo),
  }));
  const foreign = f.currency !== BASE_CURRENCY;
  const num = (v: string) => { const n = parseAmount(v); return foreign ? n : null; };
  return {
    id: f.id, fundAccount: f.fundAccount as FundAccount, slipDate: f.slipDateFollows ? f.writtenDate : f.slipDate, seq: f.seq,
    memo: f.memo.trim(), amount: entryTotals(lines).debit, partner: lines.find((l) => l.partner !== '-')?.partner ?? '-',
    approval: f.approval, attachments: f.attachments.split(',').map((s) => s.trim()).filter(Boolean), writer: f.writer, origin: f.origin,
    slipNo: f.slipNo, fundDueDate: undash(f.fundDueDate), createdBy: f.createdBy, updatedBy: CURRENT_USER, writtenDate: f.writtenDate,
    slipKind: f.slipKind, evidenceType: f.evidenceType, storage: undash(f.storage), noEvidence: f.noEvidence,
    currency: f.currency, exchangeRate: num(f.exchangeRate), foreignAmount: num(f.foreignAmount),
    plDept: undash(f.plDept), plEmployee: undash(f.plEmployee), partnerAccountNo: undash(f.partnerAccountNo), lines,
  };
}

/** 같은 전표일의 다음 순번(001~) */
export function nextSeq(rows: readonly JournalRow[], slipDate: string): string {
  const max = rows.filter((r) => r.slipDate === slipDate).reduce((m, r) => Math.max(m, Number(r.seq) || 0), 0);
  return String(max + 1).padStart(3, '0');
}
const nextId = (rows: readonly JournalRow[]) => 'gj-' + String(rows.reduce((m, r) => Math.max(m, Number(r.id.replace(/\D/g, '')) || 0), 0) + 1).padStart(3, '0');

/** 저장 반영(upsert) — 신규(id '')는 id·순번·전표번호 채번 + 최초등록자, 수정은 같은 id 교체. submit=저장 후 상신이면 결재 '상신'.
    신규는 목록 맨 앞에 넣는다. 저장된 행을 돌려준다(화면이 이후 수정 모드로 전환). */
export function commitJournal(rows: readonly JournalRow[], j: JournalRow, opts: { submit?: boolean; user?: string } = {}): { rows: JournalRow[]; saved: JournalRow } {
  const user = opts.user ?? CURRENT_USER;
  const isNew = !j.id || !rows.some((r) => r.id === j.id);
  let saved: JournalRow = { ...j, updatedBy: user, approval: opts.submit ? '상신' : j.approval };
  if (isNew) {
    const seq = nextSeq(rows, j.slipDate);
    saved = { ...saved, id: nextId(rows), seq, slipNo: j.slipDate.replace(/-/g, '') + '-' + seq, createdBy: user };
    return { rows: [saved, ...rows], saved };
  }
  return { rows: rows.map((r) => (r.id === j.id ? saved : r)), saved };
}


/* ══════════════════════════════════════════════════════════════
   청크 C — 거래처 검색(slide 13)·회계 전표 업로드(slide 15·20) 순수 로직.
   partner_search_modal.tsx · journal_upload_modal.tsx · 테스트가 공유한다.
══════════════════════════════════════════════════════════════ */

/* ── 거래처 검색 ── */
export interface PartnerKindFilter { corp: boolean; indiv: boolean }

/** 법인·개인 체크 + 거래처명 부분일치(대소문자·앞뒤 공백 무시). 둘 다 해제면 0건. 원장 순서 유지 */
export function searchPartners(list: readonly Partner[], keyword: string, f: PartnerKindFilter): Partner[] {
  const q = keyword.trim().toLowerCase();
  return list.filter((p) => ((p.kind === '법인' && f.corp) || (p.kind === '개인' && f.indiv)) && (!q || p.name.toLowerCase().includes(q)));
}

export const PARTNER_MSG = {
  select: '거래처를 선택해 주세요.',
  required: '필수 항목입니다.',
  bizNo: '사업자등록번호는 숫자 10자리로 입력해 주세요.',   // 설계서는 "숫자 10자리"만 — 문구는 가정
  saved: '저장되었습니다',
} as const;

/** 간편추가 입력(slide 13 ④) — 법인/개인구분·국내외구분·거래처명 필수 */
export interface PartnerDraft {
  kind: '법인' | '개인';
  region: '국내' | '해외';
  name: string;
  bizNo: string;
  corpNo: string;
  ceo: string;
}
export const emptyPartnerDraft = (): PartnerDraft => ({ kind: '법인', region: '국내', name: '', bizNo: '', corpNo: '', ceo: '' });

/** 사업자등록번호 — 하이픈·공백은 허용하고 떼어낸 뒤 숫자 10자리. 빈 값은 통과(선택 항목) */
const bizDigits = (v: string) => v.replace(/[-\s]/g, '');
export const isValidBizNo = (v: string): boolean => !v.trim() || /^\d{10}$/.test(bizDigits(v));

export type PartnerDraftCheck = { ok: true } | { ok: false; field: 'name' | 'bizNo'; message: string };
/** 위→아래: 거래처명(필수) → 사업자등록번호 형식. 법인/개인·국내외는 기본값이 있어 비지 않는다 */
export function validatePartnerDraft(d: PartnerDraft): PartnerDraftCheck {
  if (!d.name.trim()) return { ok: false, field: 'name', message: PARTNER_MSG.required };
  if (!isValidBizNo(d.bizNo)) return { ok: false, field: 'bizNo', message: PARTNER_MSG.bizNo };
  return { ok: true };
}

/** 고객번호 신규 채번 — 'C' + 6자리, 원장 최대 + 1 */
export function nextCustNo(list: readonly Partner[]): string {
  const max = list.reduce((m, p) => Math.max(m, Number(p.custNo.replace(/\D/g, '')) || 0), 0);
  return 'C' + String(max + 1).padStart(6, '0');
}
/** 관리번호 신규 채번 — 'M-YYYY-' + 3자리(그 해 최대 + 1) */
export function nextMgmtNo(list: readonly Partner[], today: string): string {
  const y = today.slice(0, 4);
  const pre = `M-${y}-`;
  const max = list.filter((p) => p.mgmtNo.startsWith(pre)).reduce((m, p) => Math.max(m, Number(p.mgmtNo.slice(pre.length)) || 0), 0);
  return pre + String(max + 1).padStart(3, '0');
}

/** 간편추가 → 거래처 원장 행. 법인등록번호는 개인이면 버린다. 대표자명 미입력 개인 = 본인 이름. 텍스트 N/A '-' */
export function draftToPartner(d: PartnerDraft, list: readonly Partner[], today: string): Partner {
  const ceo = d.ceo.trim() || (d.kind === '개인' ? d.name.trim() : '-');
  return {
    custNo: nextCustNo(list), mgmtNo: nextMgmtNo(list, today), name: d.name.trim(), kind: d.kind, ceo,
    email: '-', phone: '-', accountNo: '-',
    region: d.region, bizNo: d.bizNo.trim() ? bizDigits(d.bizNo) : '-', corpNo: d.kind === '법인' && d.corpNo.trim() ? d.corpNo.trim() : '-',
  };
}

/* ── 회계 전표 업로드 ── */
/** 업로드 양식 14컬럼 — slide 15 표 순서 그대로(엑셀 양식 컬럼 순서 = 그리드 컬럼 순서) */
export const UPLOAD_COLUMNS = [
  '전표일', '순번', '계정과목', '계정과목명', '차변', '대변', '거래처코드', '거래처명', '적요',
  '손익부서', '손익부서명', '손익사원', '손익사원명', '계좌코드',
] as const;
export type UploadColumn = typeof UPLOAD_COLUMNS[number];
/** 필수 컬럼(slide 15 필수 Y) — 양식 헤더에 없으면 파일 자체를 거부 */
export const UPLOAD_REQUIRED: readonly UploadColumn[] = ['전표일', '순번', '계정과목'];

export const UPLOAD_MSG = {
  fundAccount: '필수 항목입니다.',
  empty: '업로드할 데이터가 없습니다.',
  rows: '오류가 있는 행이 있습니다. 오류 사유를 확인해 주세요.',   // 설계서는 "오류 행 표시"만 — 토스트 문구는 가정
  badCode: '존재하지 않거나 입력할 수 없는 계정코드입니다.',   // 리뷰 결정 — 미존재·집계(N) 계정
  amount: '금액을 입력하세요.',                           // 리뷰 결정 — 계정코드만 있고 차변·대변 모두 없음
  balance: '차변과 대변 금액이 일치하지 않습니다.',
  saved: '저장되었습니다',
} as const;

export interface UploadRow {
  no: number;                 // 파일 행 순서(1~)
  slipDate: string;           // YYYY-MM-DD(형식 오류면 원문)
  seq: string;                // 순번(파일 값 — 그룹 키일 뿐, 실제 순번·전표번호는 저장 시 채번)
  accountCode: string;
  accountName: string;        // 코드 기준 자동(미존재면 '')
  debit: number | null;
  credit: number | null;
  partnerCode: string;
  partnerName: string;        // 코드 기준 자동(미존재면 '')
  memo: string;
  plDept: string; plDeptName: string;           // 코드↔명 대응표가 없어 파일 값 그대로(가정)
  plEmployee: string; plEmployeeName: string;
  bankCode: string;           // 계좌코드
  errors: string[];           // 비어 있으면 정상
}

/** 양식 AoA — 헤더 + 예시 2행(한 전표: 차변 = 대변). 전표일 = 오늘(기본 기간 안), 전표일·순번·코드는 텍스트 셀 */
export function uploadTemplateAoa(today: string, partners: readonly Partner[]): (string | number)[][] {
  const p = partners.find((x) => x.custNo === 'C000106') ?? partners[0];
  const name = (code: string) => findAccount(code)?.name ?? '';
  return [
    [...UPLOAD_COLUMNS],
    [today, '1', '5100200', name('5100200'), 550000, '', p ? p.custNo : '', p ? p.name : '', '회계 자문 수수료(예시)', '', '', '', '', ''],
    [today, '1', '1100100', name('1100100'), '', 550000, '', '', '회계 자문 수수료(예시)', '', '', '', '', ''],
  ];
}

const cellText = (v: unknown): string => (v == null ? '' : v instanceof Date ? format(v, 'yyyy-MM-dd') : String(v).trim());

/** 전표일 셀 → 'YYYY-MM-DD' | null. 텍스트(YYYY-MM-DD·YYYY.MM.DD·YYYY/MM/DD·YYYYMMDD)·엑셀 날짜 일련번호·Date 를 받는다 */
export function normalizeSlipDate(v: unknown): string | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : format(v, 'yyyy-MM-dd');
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null;
    /* 8자리 정수(19000101~99991231)는 YYYYMMDD 숫자 셀 — 정수일 때만, 일련번호보다 먼저 본다 */
    if (Number.isInteger(v) && v >= 19000101 && v <= 99991231) return ymdOrNull(Math.floor(v / 10000), Math.floor(v / 100) % 100, v % 100);
    /* 엑셀 1900 날짜 체계 일련번호(1 ~ 2958465 = 9999-12-31) — 1899-12-30 기준 일수(1900-03-01 이후 날짜에 맞다).
       소수부 = 시각(날짜+시각 셀)이라 버리고 날짜만 쓴다 */
    const serial = Math.floor(v);
    if (serial < 1 || serial > 2958465) return null;
    const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return ymdOrNull(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const t = cellText(v);
  const m = /^(\d{4})[-./]?(\d{1,2})[-./]?(\d{1,2})$/.exec(t);
  if (!m) return null;
  return ymdOrNull(Number(m[1]), Number(m[2]), Number(m[3]));
}

/** 연·월·일 → 'YYYY-MM-DD'(4자리 연도이고 실제 존재하는 날짜일 때만), 아니면 null */
function ymdOrNull(y: number, mo: number, d: number): string | null {
  if (!Number.isInteger(y) || y < 1000 || y > 9999) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  const out = `${String(y)}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
}

/** 금액 셀 → 정수(원 단위) | null(빈 값) | NaN(형식 오류 — 숫자 아님·소수) */
function amountCell(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isInteger(v) ? v : NaN;
  const t = String(v).trim();
  if (!t) return null;
  const n = parseAmount(t);
  return n == null || !Number.isInteger(n) ? NaN : n;
}

/** 순번 그룹 키 — 숫자면 선행 0 무시('001' = '1' = 1) */
const seqKey = (s: string) => (/^\d+$/.test(s) ? String(Number(s)) : s);
export const uploadGroupKey = (r: Pick<UploadRow, 'slipDate' | 'seq'>): string => `${r.slipDate}|${seqKey(r.seq)}`;

/** 한 행 오류 사유 — 필수 컬럼 누락 · 형식 · 코드 미존재 · 집계 계정(입력여부 N) */
function rowErrors(r: Omit<UploadRow, 'errors'>, dateOk: boolean, debitBad: boolean, creditBad: boolean, partners: readonly Partner[]): string[] {
  const e: string[] = [];
  if (!r.slipDate) e.push('전표일 누락');
  else if (!dateOk) e.push('전표일 형식 오류');
  if (!r.seq) e.push('순번 누락');
  if (!r.accountCode) e.push('계정과목 누락');
  else {
    const a = findAccount(r.accountCode);
    if (!a) e.push('계정코드 미존재');
    else if (a.inputYn === 'N') e.push('집계 계정(입력여부 N)');
  }
  if (debitBad) e.push('차변 금액 형식 오류');
  if (creditBad) e.push('대변 금액 형식 오류');
  if (r.accountCode && !debitBad && !creditBad && r.debit == null && r.credit == null) e.push('금액 없음');
  if (r.partnerCode && !partners.some((p) => p.custNo === r.partnerCode)) e.push('거래처코드 미존재');
  return e;
}

export type UploadParse = { ok: true; rows: UploadRow[] } | { ok: false; missing: UploadColumn[] };

/** 시트 AoA(첫 행 = 헤더) → 미리보기 행. 헤더는 이름으로 매칭(순서 무관·앞뒤 공백 무시, '*' 접미 허용).
    완전히 빈 행은 버린다. 계정과목명·거래처명은 코드 기준으로 다시 채운다(파일 값 무시). */
export function parseUploadAoa(aoa: readonly (readonly unknown[])[], partners: readonly Partner[]): UploadParse {
  const header = (aoa[0] ?? []).map((h) => cellText(h).replace(/\s*\*$/, ''));
  const idx = {} as Record<UploadColumn, number>;
  UPLOAD_COLUMNS.forEach((c) => { idx[c] = header.indexOf(c); });
  const missing = UPLOAD_REQUIRED.filter((c) => idx[c] < 0);
  if (missing.length) return { ok: false, missing };
  const at = (row: readonly unknown[], c: UploadColumn): unknown => (idx[c] < 0 ? '' : row[idx[c]]);
  const rows: UploadRow[] = [];
  aoa.slice(1).forEach((row) => {
    if (!row || row.every((v) => cellText(v) === '')) return;
    const rawDate = at(row, '전표일');
    const date = normalizeSlipDate(rawDate);
    const debit = amountCell(at(row, '차변'));
    const credit = amountCell(at(row, '대변'));
    const accountCode = cellText(at(row, '계정과목'));
    const partnerCode = cellText(at(row, '거래처코드'));
    const base: Omit<UploadRow, 'errors'> = {
      no: rows.length + 1,
      slipDate: date ?? cellText(rawDate),
      seq: cellText(at(row, '순번')),
      accountCode,
      accountName: findAccount(accountCode)?.name ?? '',
      debit: Number.isNaN(debit) ? null : debit,
      credit: Number.isNaN(credit) ? null : credit,
      partnerCode,
      partnerName: partners.find((p) => p.custNo === partnerCode)?.name ?? '',
      memo: cellText(at(row, '적요')),
      plDept: cellText(at(row, '손익부서')), plDeptName: cellText(at(row, '손익부서명')),
      plEmployee: cellText(at(row, '손익사원')), plEmployeeName: cellText(at(row, '손익사원명')),
      bankCode: cellText(at(row, '계좌코드')),
    };
    rows.push({ ...base, errors: rowErrors(base, date != null, Number.isNaN(debit), Number.isNaN(credit), partners) });
  });
  return { ok: true, rows };
}

/** [엑셀업로드] 데모 행(2026-10-28 사용자 결정 — 파일 읽기 미도입, 실제 파싱은 백엔드 연동 후).
    전표 2건(전표일+순번 그룹 2개, 각각 차변 = 대변, 5행) · 입력 가능(Y) 계정 · 거래처 원장 코드 · 전표일 = 오늘·어제(기본 기간 안).
    양식 AoA 와 같은 경로(parseUploadAoa)로 정규화해 계정과목명·거래처명 자동 표시·오류 판정이 실제 업로드와 같게 돈다. */
export function demoUploadRows(today: string, partners: readonly Partner[]): UploadRow[] {
  const yday = format(subDays(new Date(today + 'T00:00:00'), 1), 'yyyy-MM-dd');
  const code = (custNo: string) => (partners.some((p) => p.custNo === custNo) ? custNo : '');
  const row = (d: string, seq: string, acct: string, dr: number | '', cr: number | '', cust: string, memo: string): (string | number)[] =>
    [d, seq, acct, '', dr, cr, cust, '', memo, '', '', '', '', ''];
  const aoa = [
    [...UPLOAD_COLUMNS],
    row(today, '1', '5100200', 3300000, '', code('C000106'), '회계감사 수수료 지급'),
    row(today, '1', '1100100', '', 3300000, '', '회계감사 수수료 지급'),
    row(yday, '1', '1200100', 50000000, '', code('C000108'), '투자조합 출자 이행'),
    row(yday, '1', '1100100', '', 49950000, '', '투자조합 출자 이행'),
    row(yday, '1', '2100200', '', 50000, '', '투자조합 출자 이행 — 예수금'),
  ];
  const res = parseUploadAoa(aoa, partners);
  return res.ok ? res.rows : [];
}

/** 업로드 Σ — 차변·대변 합 */
export function uploadTotals(rows: readonly UploadRow[]): { debit: number; credit: number } {
  return rows.reduce((s, r) => ({ debit: s.debit + (r.debit ?? 0), credit: s.credit + (r.credit ?? 0) }), { debit: 0, credit: 0 });
}

/** 전표별 그룹(전표일 + 순번) — 첫 등장 순서 */
export function groupUploads(rows: readonly UploadRow[]): { key: string; slipDate: string; seq: string; rows: UploadRow[] }[] {
  const map = new Map<string, { key: string; slipDate: string; seq: string; rows: UploadRow[] }>();
  rows.forEach((r) => {
    const key = uploadGroupKey(r);
    const g = map.get(key) ?? { key, slipDate: r.slipDate, seq: r.seq, rows: [] };
    g.rows.push(r);
    map.set(key, g);
  });
  return [...map.values()];
}

export type UploadCheck =
  | { ok: true }
  | { ok: false; field: 'fundAccount' | 'empty'; message: string }
  | { ok: false; field: 'rows'; message: string; errorRows: number[] }
  | { ok: false; field: 'balance'; message: string; groups: { slipDate: string; seq: string }[] };

/** 저장 검증(slide 15 표 순서): 계정구분 → 데이터 없음 → 오류 행 → 전표별 차변≠대변 */
export function validateUpload(fundAccount: string, rows: readonly UploadRow[]): UploadCheck {
  if (!fundAccount) return { ok: false, field: 'fundAccount', message: UPLOAD_MSG.fundAccount };
  if (!rows.length) return { ok: false, field: 'empty', message: UPLOAD_MSG.empty };
  const bad = rows.filter((r) => r.errors.length).map((r) => r.no);
  if (bad.length) return { ok: false, field: 'rows', message: UPLOAD_MSG.rows, errorRows: bad };
  const off = groupUploads(rows).filter((g) => { const t = uploadTotals(g.rows); return t.debit !== t.credit; });
  if (off.length) return { ok: false, field: 'balance', message: UPLOAD_MSG.balance, groups: off.map((g) => ({ slipDate: g.slipDate, seq: g.seq })) };
  return { ok: true };
}

/** 검증 통과 행 → 전표(그룹마다 1건). 결재 미상신·발생구분 일반·작성일 오늘·증빙 미선택. id·순번·전표번호는 commitJournals 가 채번 */
export function uploadsToJournals(rows: readonly UploadRow[], fundAccount: FundAccount, today: string, partners: readonly Partner[], user: string = CURRENT_USER): JournalRow[] {
  return groupUploads(rows).map((g) => {
    const lines: JournalLine[] = g.rows.map((r) => {
      const p = partners.find((x) => x.custNo === r.partnerCode);
      return {
        accountCode: r.accountCode, accountName: r.accountName || '-', memo: r.memo,
        mgmtNo: p ? p.mgmtNo : '-', partner: p ? p.name : '-',
        accountNo: r.bankCode || (p && p.accountNo !== '-' ? p.accountNo : '-'),
        debit: r.debit, credit: r.credit,
      };
    });
    const first = (pick: (r: UploadRow) => string) => g.rows.map(pick).find((v) => v) || '-';
    return {
      id: '', fundAccount, slipDate: g.slipDate, seq: '', memo: first((r) => r.memo),
      amount: lineTotals(lines).debit, partner: lines.find((l) => l.partner !== '-')?.partner ?? '-',
      approval: '미상신', attachments: [], writer: user, origin: JOURNAL_ORIGINS[0], slipNo: '', fundDueDate: '-',
      createdBy: user, updatedBy: user, writtenDate: today, slipKind: SLIP_KINDS[0], evidenceType: '', storage: '-', noEvidence: false,
      currency: BASE_CURRENCY, exchangeRate: null, foreignAmount: null,
      plDept: first((r) => r.plDeptName || r.plDept), plEmployee: first((r) => r.plEmployeeName || r.plEmployee), partnerAccountNo: '-',
      lines,
    };
  });
}

/** 여러 전표 일괄 반영 — 한 건씩 commitJournal(누적 rows 기준 채번이라 같은 전표일 순번이 겹치지 않는다) */
export function commitJournals(rows: readonly JournalRow[], js: readonly JournalRow[], user: string = CURRENT_USER): { rows: JournalRow[]; saved: JournalRow[] } {
  let acc: readonly JournalRow[] = rows;
  const saved: JournalRow[] = [];
  js.forEach((j) => { const r = commitJournal(acc, j, { user }); acc = r.rows; saved.push(r.saved); });
  return { rows: [...acc], saved };
}
