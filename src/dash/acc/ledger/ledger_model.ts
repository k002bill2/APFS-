/* 회계 > 장부조회(ACC-009~014) 순수 집계 로직 — 6화면과 테스트가 공유한다. 페이지는 배선만 한다.
   모든 숫자는 분개 라인(ledger_data)에서 파생한다.

   공통 규칙
   - 공통조건(LedgerCond): 계정구분('' 또는 [] = 전체, 배열 = 다중 선택) · 미결재포함(부 = 결재 '승인' 전표만) ·
     결산전표포함(부 = 전표발생구분 '결산' 제외) · 모든계정포함(부 = 금액이 하나도 없는 계정 행 숨김 — 라인 필터가 아니라 표시 규칙).
     미결재·결산은 전표 단위 플래그라 어떤 조합으로 걸러도 대차가 맞는다.
   - 잔액 부호 = 계정의 정상잔액 방향(차변 계정 = 차−대, 대변 계정 = 대−차).
   - 회기 = 역년. 손익 계정의 기초(전잔)는 그 회기 시작 ~ 조회 시작 전, 재무상태 계정은 처음 ~ 조회 시작 전.
   - 이익잉여금은 파생: 전기이월이익잉여금 = 당기 회기 시작 전 손익 누계, 당기순이익 = 회기 시작 ~ 기준일 손익(마감분개 없음).
   - 집계 행(상위계정)은 하위를 부호 붙여 합산한다 — 하위의 차대가 상위와 다르면 차감(감가상각누계액 등). */
import { format, parseISO, subDays } from 'date-fns';
import {
  LEDGER_ACCOUNTS, INPUT_ACCOUNTS, FISCAL_FIRST_YEAR, accountOf, childrenOf, isPL,
  RETAINED_GROUP, RETAINED_PRIOR, NET_INCOME_BS, OPERATING_INCOME, NET_INCOME_IS,
} from './ledger_data';
import type { LedgerAccount, LedgerLine } from './ledger_data';
import { FUND_ACCOUNTS } from '../slip/general_journal_data';

/* ══════════════════════════════════════════════════════════════
   공통조건 · 회기
══════════════════════════════════════════════════════════════ */
export interface LedgerCond {
  fundAccount: string | readonly string[];   // '' · [] = 전체
  includeUnapproved: boolean;                // 미결재포함
  includeClosing: boolean;                   // 결산전표포함
  includeAll: boolean;                       // 모든계정포함(표시 규칙)
}
/** 화면 기본값의 출발점 — 결산전표포함 기본은 화면마다 다르다(012·013 전부포함, 011·014 부) → 페이지가 덮어쓴다 */
export const DEFAULT_COND: LedgerCond = { fundAccount: '', includeUnapproved: false, includeClosing: true, includeAll: false };

const fundList = (sel: LedgerCond['fundAccount']): readonly string[] => (typeof sel === 'string' ? (sel ? [sel] : []) : sel);
/** 계정구분 표시명 — 빈 값 = '전체', 다중 = 쉼표 연결 */
export const fundLabel = (sel: LedgerCond['fundAccount']): string => fundList(sel).join(', ') || '전체';

/** 공통조건 + 기간(빈 값 = 열린 경계)으로 분개 라인을 거른다. 모든계정포함은 라인 필터가 아니라 무시한다 */
export function filterLines(lines: readonly LedgerLine[], cond: LedgerCond, from = '', to = ''): LedgerLine[] {
  const fa = fundList(cond.fundAccount);
  return lines.filter((l) =>
    (fa.length === 0 || fa.includes(l.fundAccount))
    && (cond.includeUnapproved || l.approval === '승인')
    && (cond.includeClosing || !l.closing)
    && (!from || l.slipDate >= from) && (!to || l.slipDate <= to));
}

export const fiscalStart = (d: string): string => d.slice(0, 4) + '-01-01';
export const fiscalEnd = (d: string): string => d.slice(0, 4) + '-12-31';
/** 제N기 — 첫 회기(FISCAL_FIRST_YEAR) = 제1기 */
export const fiscalNo = (d: string): number => Number(d.slice(0, 4)) - FISCAL_FIRST_YEAR + 1;
export const dayBefore = (d: string): string => format(subDays(parseISO(d), 1), 'yyyy-MM-dd');

/** 정상잔액 방향 금액(차변 계정 = 차−대) */
export const signedOf = (code: string, debit: number, credit: number): number =>
  (accountOf(code)?.dc === '대변' ? credit - debit : debit - credit);
const sumSigned = (ls: readonly LedgerLine[]) => ls.reduce((s, l) => s + signedOf(l.accountCode, l.debit, l.credit), 0);
/** 손익 금액(이익 +) = 대 − 차 */
const plNet = (ls: readonly LedgerLine[]) => ls.reduce((s, l) => s + l.credit - l.debit, 0);

/** 기초 잔액 — `from` 직전까지(손익 계정은 그 회기 시작부터). base 는 공통조건으로 이미 거른 라인 */
export function openingBalance(base: readonly LedgerLine[], code: string, from: string): number {
  if (!from) return 0;
  const start = isPL(code) ? fiscalStart(from) : '';
  return sumSigned(base.filter((l) => l.accountCode === code && l.slipDate < from && l.slipDate >= start));
}

/* ── 기간 검증(상세필터 [필터 적용]) — 설계서 E01 문구 그대로 ── */
export const MSG = {
  periodRequired: '기간을 입력하세요.',
  periodOrder: '시작일은 종료일보다 늦을 수 없습니다.',
  dateRequired: '기준일을 입력하세요.',
  prevOrder: '전기기준일은 당기기준일보다 이전이어야 합니다.',
  fundRequired: '계정구분을 선택하세요',
  empty: '조회된 내역이 없습니다.',
  noResult: '조회 결과가 없습니다.',
} as const;
/** 기간(시작~종료) — required 면 둘 다 필수. 통과 = null */
export function validatePeriod(from: string, to: string, required = false): string | null {
  if (required && (!from || !to)) return MSG.periodRequired;
  if (from && to && from > to) return MSG.periodOrder;
  return null;
}
/** 당기·전기 기준일(재무상태표·손익계산서) — 둘 다 필수, 전기 < 당기.
    같은 회기 안의 두 기준일(당기 2026-12-31 · 전기 2026-06-30)은 막지 않는다 — 설계서 slide 11·17 에 처리 규정이 없어
    '같은 회기 중간 시점 비교'로 허용(헤더 기수가 같게 찍힘). PM 확인 필요. */
export function validateStatementDates(cur: string, prev: string): string | null {
  if (!cur || !prev) return MSG.dateRequired;
  if (prev >= cur) return MSG.prevOrder;
  return null;
}

/* ══════════════════════════════════════════════════════════════
   계정별보조부(ACC-010) — 전잔 + 명세 + 누적잔액 + 소계
   작성자·거래처·적요 = 명세에만 적용(전잔 불변, slide 11 ③). 계정과목·계정구분·기간·결재·결산 = 전잔에도 적용.
══════════════════════════════════════════════════════════════ */
export interface SubledgerQuery {
  from: string; to: string;
  account?: string;      // 계정과목 — 코드 정확 일치 또는 코드/명 부분일치
  writer?: string; partner?: string; memo?: string;   // 명세 전용 텍스트 필터(부분일치)
  writtenOnly?: boolean; // 작성계정과목만 — 기간 안 명세가 있는 계정만
}
export interface SubledgerEntry extends LedgerLine { balance: number }
export interface SubledgerGroup {
  code: string; name: string;
  opening: number;               // 전잔
  entries: SubledgerEntry[];     // 명세(누적잔액 포함)
  debit: number; credit: number; // 명세 합
  closing: number;               // 마지막 잔액(명세 없으면 전잔) — 손익 계정은 조회 종료일 회기 기준(그 회기 명세 없으면 0)
}

const has = (v: string, q?: string) => !q || !q.trim() || v.toLowerCase().includes(q.trim().toLowerCase());
const lineOrder = (a: LedgerLine, b: LedgerLine) => a.slipDate.localeCompare(b.slipDate) || a.slipNo.localeCompare(b.slipNo) || a.lineNo - b.lineNo;
const matchAccount = (a: LedgerAccount, q?: string) => !q || !q.trim() || a.code === q.trim() || has(a.code, q) || has(a.name, q);

export function subledger(lines: readonly LedgerLine[], cond: LedgerCond, q: SubledgerQuery): SubledgerGroup[] {
  const base = filterLines(lines, cond);
  const groups: SubledgerGroup[] = [];
  /* 손익 계정 closing 의 회기 기준일 = 조회 종료일, 없으면 (공통조건으로 거른) 원장의 마지막 전표일 */
  const horizon = q.to || base.reduce((m, l) => (l.slipDate > m ? l.slipDate : m), '');
  for (const a of INPUT_ACCOUNTS) {
    if (!matchAccount(a, q.account)) continue;
    const opening = openingBalance(base, a.code, q.from);
    const period = base.filter((l) => l.accountCode === a.code && (!q.from || l.slipDate >= q.from) && (!q.to || l.slipDate <= q.to)).sort(lineOrder);
    const shown = period.filter((l) => has(l.writer, q.writer) && has(l.partner, q.partner) && has(l.memo, q.memo));
    /* 손익 계정은 회기(역년)가 바뀌면 누적잔액을 0 에서 다시 쌓는다 — openingBalance·시산표(RETAINED_PRIOR 이월)와 같은 회기 규칙.
       재무상태 계정은 계속 누적. 마지막 잔액(closing)도 조회 종료일(없으면 원장 마지막 전표일)의 회기 기준 — 그 회기 명세가 없으면 0 */
    const pl = isPL(a.code);
    let bal = opening;
    let fy = q.from ? fiscalStart(q.from) : '';
    const entries = shown.map((l) => {
      if (pl && fy && fiscalStart(l.slipDate) !== fy) bal = 0;
      fy = fiscalStart(l.slipDate);
      return { ...l, balance: (bal += signedOf(a.code, l.debit, l.credit)) };
    });
    let closing = entries.length ? entries[entries.length - 1].balance : opening;
    if (pl && horizon && fy && fiscalStart(horizon) !== fy) closing = 0;
    const keep = q.writtenOnly ? entries.length > 0 : entries.length > 0 || opening !== 0 || cond.includeAll;
    if (!keep) continue;
    groups.push({
      code: a.code, name: a.name, opening, entries,
      debit: entries.reduce((s, e) => s + e.debit, 0), credit: entries.reduce((s, e) => s + e.credit, 0),
      closing,
    });
  }
  return groups;
}

/** 보조부 그리드 행 — [전잔](차·대 0, 잔액 = 전잔) · 명세 · [소계](명세 합, 잔액 = 마지막 잔액) */
export type SubledgerRowKind = 'opening' | 'entry' | 'subtotal';
export interface SubledgerRow {
  id: string; kind: SubledgerRowKind; code: string;
  accountName: string;           // [전잔]/[소계] 접두 포함 표시명
  line: LedgerLine | null;       // 명세 행만
  debit: number; credit: number; balance: number;
}
export function flattenSubledger(groups: readonly SubledgerGroup[], opts: { subtotal?: boolean } = {}): SubledgerRow[] {
  const subtotal = opts.subtotal ?? true;
  /* [소계] 잔액 = 화면에 보인 마지막 잔액(설계서). 회기 조정된 closing(손익 계정의 이전 회기 명세만 있으면 0)은 총계정원장 금일잔액용 */
  const lastShown = (g: SubledgerGroup) => (g.entries.length ? g.entries[g.entries.length - 1].balance : g.opening);
  return groups.flatMap((g) => [
    { id: `${g.code}#opening`, kind: 'opening' as const, code: g.code, accountName: `[전잔] ${g.name}`, line: null, debit: 0, credit: 0, balance: g.opening },
    ...g.entries.map((e) => ({ id: e.id, kind: 'entry' as const, code: g.code, accountName: g.name, line: e as LedgerLine, debit: e.debit, credit: e.credit, balance: e.balance })),
    ...(subtotal ? [{ id: `${g.code}#subtotal`, kind: 'subtotal' as const, code: g.code, accountName: `[소계] ${g.name}`, line: null, debit: g.debit, credit: g.credit, balance: lastShown(g) }] : []),
  ]);
}

/* ══════════════════════════════════════════════════════════════
   총계정원장(ACC-011) — 보조부와 같은 계산(기초 = 전잔, 금일 = 마지막 잔액이 구성상 성립)
══════════════════════════════════════════════════════════════ */
export interface GeneralLedgerRow { code: string; name: string; opening: number; debit: number; credit: number; closing: number }
export function generalLedger(lines: readonly LedgerLine[], cond: LedgerCond, from: string, to: string): GeneralLedgerRow[] {
  return subledger(lines, cond, { from, to }).map((g) => ({ code: g.code, name: g.name, opening: g.opening, debit: g.debit, credit: g.credit, closing: g.closing }));
}

/* ══════════════════════════════════════════════════════════════
   합계잔액시산표(ACC-014) — 기준일까지 누계(손익은 당기 회기분 + 전기이월이익잉여금 행)
══════════════════════════════════════════════════════════════ */
export interface TrialBalanceRow {
  code: string; label: string; level: number; kind: 'group' | 'leaf';
  cls: LedgerAccount['cls'];
  drBalance: number; drTotal: number; crTotal: number; crBalance: number;
}
export interface TrialBalance { rows: TrialBalanceRow[]; total: Omit<TrialBalanceRow, 'code' | 'label' | 'level' | 'kind' | 'cls'> }

export function trialBalance(lines: readonly LedgerLine[], cond: LedgerCond, asOf: string): TrialBalance {
  const base = filterLines(lines, cond, '', asOf);
  const fy = fiscalStart(asOf);
  const leafCols = new Map<string, { dr: number; cr: number }>();
  const add = (code: string, dr: number, cr: number) => {
    const c = leafCols.get(code) ?? { dr: 0, cr: 0 };
    leafCols.set(code, { dr: c.dr + dr, cr: c.cr + cr });
  };
  for (const l of base) {
    if (isPL(l.accountCode) && l.slipDate < fy) add(RETAINED_PRIOR, l.debit, l.credit);   // 전기 손익 → 전기이월이익잉여금
    else add(l.accountCode, l.debit, l.credit);
  }
  const tbAccounts = LEDGER_ACCOUNTS.filter((a) => a.code !== NET_INCOME_BS);   // 당기순이익은 손익 계정 자체로 보인다
  const leafRow = (a: LedgerAccount): TrialBalanceRow => {
    const { dr, cr } = leafCols.get(a.code) ?? { dr: 0, cr: 0 };
    const net = dr - cr;
    return { code: a.code, label: a.label, level: a.level, kind: 'leaf', cls: a.cls, drTotal: dr, crTotal: cr, drBalance: net > 0 ? net : 0, crBalance: net < 0 ? -net : 0 };
  };
  const isLeaf = (a: LedgerAccount) => a.input || a.code === RETAINED_PRIOR;
  const rows: TrialBalanceRow[] = [];
  const walk = (a: LedgerAccount): TrialBalanceRow | null => {
    if (isLeaf(a)) {
      const r = leafRow(a);
      if (!cond.includeAll && r.drTotal === 0 && r.crTotal === 0) return null;
      rows.push(r);
      return r;
    }
    const at = rows.length;
    const kids = tbAccounts.filter((c) => c.parent === a.code).map(walk).filter((r): r is TrialBalanceRow => r !== null);
    if (!kids.length && !cond.includeAll) return null;
    /* 집계 행도 설계서 slide 10 정의 그대로 — 잔액 = 합계끼리의 차(양수 쪽만). 하위 잔액을 더하면 차변·대변 잔액이 동시에 양수가 된다 */
    const dr = kids.reduce((s, k) => s + k.drTotal, 0), cr = kids.reduce((s, k) => s + k.crTotal, 0);
    const g: TrialBalanceRow = {
      code: a.code, label: a.label, level: a.level, kind: 'group', cls: a.cls,
      drTotal: dr, crTotal: cr, drBalance: Math.max(dr - cr, 0), crBalance: Math.max(cr - dr, 0),
    };
    rows.splice(at, 0, g);
    return g;
  };
  tbAccounts.filter((a) => a.parent === null).forEach(walk);
  const leaves = rows.filter((r) => r.kind === 'leaf');
  return {
    rows,
    total: {
      drBalance: leaves.reduce((s, r) => s + r.drBalance, 0), drTotal: leaves.reduce((s, r) => s + r.drTotal, 0),
      crTotal: leaves.reduce((s, r) => s + r.crTotal, 0), crBalance: leaves.reduce((s, r) => s + r.crBalance, 0),
    },
  };
}

/* ══════════════════════════════════════════════════════════════
   재무상태표(ACC-012) · 손익계산서(ACC-013) — 계층 세부/합계 × 당기/전기
══════════════════════════════════════════════════════════════ */
/** 결산서 행. col = 금액이 놓이는 열(세부 = 입력계정·파생 세부, 합계 = 집계·계산·총계, null = 머리행) */
export interface StatementRow {
  id: string; code: string; label: string; level: number;
  kind: 'header' | 'group' | 'leaf' | 'calc' | 'total';
  col: 'detail' | 'total' | null;
  cur: number | null; prev: number | null;
  drillable: boolean;    // 더블클릭 → 계정별 상세내역(입력계정만)
}
/** 기간 하나의 계정별 금액(정상잔액 방향) */
type Amounts = Map<string, number>;

function rollup(a: LedgerAccount, leaf: Amounts, out: Amounts): number {
  if (a.input || a.code === RETAINED_PRIOR || a.code === NET_INCOME_BS) {
    const v = leaf.get(a.code) ?? 0;
    out.set(a.code, v);
    return v;
  }
  const v = childrenOf(a.code).reduce((s, c) => s + rollup(c, leaf, out) * (c.dc === a.dc ? 1 : -1), 0);
  out.set(a.code, v);
  return v;
}

/** 재무상태표용 계정별 금액 — 재무상태 계정 누계 + 파생 이익잉여금 */
function bsAmounts(lines: readonly LedgerLine[], cond: LedgerCond, asOf: string): Amounts {
  const base = filterLines(lines, cond, '', asOf);
  const fy = fiscalStart(asOf);
  const leaf: Amounts = new Map();
  for (const l of base) {
    if (isPL(l.accountCode)) continue;
    leaf.set(l.accountCode, (leaf.get(l.accountCode) ?? 0) + signedOf(l.accountCode, l.debit, l.credit));
  }
  const pl = base.filter((l) => isPL(l.accountCode));
  leaf.set(RETAINED_PRIOR, plNet(pl.filter((l) => l.slipDate < fy)));
  leaf.set(NET_INCOME_BS, plNet(pl.filter((l) => l.slipDate >= fy)));
  const out: Amounts = new Map();
  for (const root of childrenOf(null)) if (root.cls !== '손익') rollup(root, leaf, out);
  return out;
}

/** 손익계산서용 계정별 금액 — 회기 시작 ~ 기준일 */
function isAmounts(lines: readonly LedgerLine[], cond: LedgerCond, asOf: string): { amounts: Amounts; net: number } {
  const pl = filterLines(lines, cond, fiscalStart(asOf), asOf).filter((l) => isPL(l.accountCode));
  const leaf: Amounts = new Map();
  for (const l of pl) leaf.set(l.accountCode, (leaf.get(l.accountCode) ?? 0) + signedOf(l.accountCode, l.debit, l.credit));
  const out: Amounts = new Map();
  for (const root of childrenOf(null)) if (root.cls === '손익') rollup(root, leaf, out);
  return { amounts: out, net: plNet(pl) };
}

const TOTAL_LABEL: Record<string, string> = { 자산: '자 산 총 계', 부채: '부 채 총 계', 자본: '자 본 총 계' };

/** 계층 순회 → 행(자신 → 하위 순). 0 인 행은 모든계정포함 = 부 이면 숨긴다(당기·전기 둘 다 0 일 때).
    집계 행은 하위를 먼저 모아 판정 — 하위끼리 상쇄돼 합이 0 이어도 0 아닌 하위가 남으면 그룹을 지우지 않는다 */
function treeRows(root: LedgerAccount, cur: Amounts, prev: Amounts, includeAll: boolean): StatementRow[] {
  const visit = (a: LedgerAccount): StatementRow[] => {
    const leafLike = a.input || a.code === RETAINED_PRIOR || a.code === NET_INCOME_BS;
    const c = cur.get(a.code) ?? 0, p = prev.get(a.code) ?? 0;
    const kids = leafLike ? [] : childrenOf(a.code).flatMap(visit);
    if (!includeAll && c === 0 && p === 0 && a.level > 1 && kids.length === 0) return [];
    const self: StatementRow = a.level === 1
      ? { id: a.code, code: a.code, label: a.label, level: 1, kind: 'header', col: null, cur: null, prev: null, drillable: false }
      : { id: a.code, code: a.code, label: a.label, level: a.level, kind: leafLike ? (a.derived ? 'calc' : 'leaf') : 'group', col: leafLike ? 'detail' : 'total', cur: c, prev: p, drillable: a.input };
    return [self, ...kids];
  };
  return visit(root);
}

export function balanceSheet(lines: readonly LedgerLine[], cond: LedgerCond, curAsOf: string, prevAsOf: string): StatementRow[] {
  const cur = bsAmounts(lines, cond, curAsOf), prev = bsAmounts(lines, cond, prevAsOf);
  const rows: StatementRow[] = [];
  for (const root of childrenOf(null)) {
    if (root.cls === '손익') continue;
    rows.push(...treeRows(root, cur, prev, cond.includeAll));
    rows.push({ id: `total-${root.cls}`, code: '', label: TOTAL_LABEL[root.cls] ?? `${root.name} 총계`, level: 1, kind: 'total', col: 'total', cur: cur.get(root.code) ?? 0, prev: prev.get(root.code) ?? 0, drillable: false });
  }
  const le = (m: Amounts) => (m.get('2000000') ?? 0) + (m.get('3000000') ?? 0);
  rows.push({ id: 'total-부채자본', code: '', label: '자본과 부채총계', level: 1, kind: 'total', col: 'total', cur: le(cur), prev: le(prev), drillable: false });
  return rows;
}

export function incomeStatement(lines: readonly LedgerLine[], cond: LedgerCond, curAsOf: string, prevAsOf: string): StatementRow[] {
  const c = isAmounts(lines, cond, curAsOf), p = isAmounts(lines, cond, prevAsOf);
  const rows: StatementRow[] = [];
  const plRoots = childrenOf(null).filter((a) => a.cls === '손익');
  for (const root of plRoots) rows.push(...treeRows(root, c.amounts, p.amounts, cond.includeAll));
  /* 영업이익·당기순이익 번호 = 보이는 대분류 개수 다음(설계서 slide 10 샘플: Ⅱ. 영업비용만 보이면 Ⅲ. 영업이익) — 의도된 동작 */
  const n = rows.filter((r) => r.level === 2).length;
  const roman = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ'];
  /* 영업외 손익 계정이 없어 영업이익 = 당기순이익. 계정이 생기면 영업이익만 영업 계정 합으로 좁힌다 */
  rows.push({ id: OPERATING_INCOME, code: OPERATING_INCOME, label: `${roman[Math.max(n, 2)]}. 영업이익`, level: 2, kind: 'calc', col: 'total', cur: c.net, prev: p.net, drillable: false });
  rows.push({ id: NET_INCOME_IS, code: NET_INCOME_IS, label: `${roman[Math.max(n, 2) + 1]}. 당기순이익`, level: 2, kind: 'calc', col: 'total', cur: c.net, prev: p.net, drillable: false });
  return rows;
}

/* ══════════════════════════════════════════════════════════════
   일계표 · 월계표(ACC-009)
══════════════════════════════════════════════════════════════ */
export interface DailyRow { id: string; kind: 'line' | 'subtotal'; fundAccount: string; code: string; name: string; debit: number; credit: number }
export interface DailyStatement { rows: DailyRow[]; total: { debit: number; credit: number } }

/** 일계표 — 기준일 하루, 계정구분 × 계정과목별 차·대 + 계정구분별 소계 */
export function dailyStatement(lines: readonly LedgerLine[], cond: LedgerCond, date: string): DailyStatement {
  const day = filterLines(lines, cond, date, date);
  const sel = fundList(cond.fundAccount);
  const funds = (sel.length ? FUND_ACCOUNTS.filter((f) => sel.includes(f)) : [...FUND_ACCOUNTS]);
  const rows: DailyRow[] = [];
  for (const fa of funds) {
    const mine = day.filter((l) => l.fundAccount === fa);
    const items = INPUT_ACCOUNTS.map((a) => {
      const ls = mine.filter((l) => l.accountCode === a.code);
      return { id: `${fa}#${a.code}`, kind: 'line' as const, fundAccount: fa, code: a.code, name: a.name, debit: ls.reduce((s, l) => s + l.debit, 0), credit: ls.reduce((s, l) => s + l.credit, 0) };
    }).filter((r) => cond.includeAll || r.debit !== 0 || r.credit !== 0);
    if (!items.length) continue;
    rows.push(...items, { id: `${fa}#subtotal`, kind: 'subtotal', fundAccount: fa, code: '', name: '소계', debit: items.reduce((s, r) => s + r.debit, 0), credit: items.reduce((s, r) => s + r.credit, 0) });
  }
  const sub = rows.filter((r) => r.kind === 'subtotal');
  return { rows, total: { debit: sub.reduce((s, r) => s + r.debit, 0), credit: sub.reduce((s, r) => s + r.credit, 0) } };
}

export interface MonthCell { debit: number; credit: number }
export interface MonthRow { month: string; cells: Record<string, MonthCell>; debit: number; credit: number }
export interface MonthlyStatement { accounts: { code: string; name: string }[]; months: MonthRow[]; total: MonthRow }

/** 월계표 — 행 = 월(YYYY-MM), 열 = 계정과목별 차·대(동적), 마지막 행 = 조회기간 합계(라벨 'YYYY-MM ~ YYYY-MM') */
export function monthlyStatement(lines: readonly LedgerLine[], cond: LedgerCond, from: string, to: string): MonthlyStatement {
  /* 월계표는 계정구분 단일 필수(설계서) — 0개·다중이면 계정구분 간 합산이 새지 않게 빈 결과 */
  if (fundList(cond.fundAccount).length !== 1) {
    return { accounts: [], months: [], total: { month: from && to ? `${from.slice(0, 7)} ~ ${to.slice(0, 7)}` : '합계', cells: {}, debit: 0, credit: 0 } };
  }
  const ls = filterLines(lines, cond, from, to);
  const used = new Set(ls.map((l) => l.accountCode));
  const accounts = INPUT_ACCOUNTS.filter((a) => cond.includeAll || used.has(a.code)).map((a) => ({ code: a.code, name: a.name }));
  const monthKeys: string[] = [];
  if (cond.includeAll && from && to) {
    for (let d = parseISO(from.slice(0, 7) + '-01'); format(d, 'yyyy-MM') <= to.slice(0, 7); d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) monthKeys.push(format(d, 'yyyy-MM'));
  } else {
    monthKeys.push(...[...new Set(ls.map((l) => l.slipDate.slice(0, 7)))].sort());
  }
  const blank = (): Record<string, MonthCell> => Object.fromEntries(accounts.map((a) => [a.code, { debit: 0, credit: 0 }]));
  const months: MonthRow[] = monthKeys.map((m) => {
    const cells = blank();
    for (const l of ls) if (l.slipDate.startsWith(m) && cells[l.accountCode]) { cells[l.accountCode].debit += l.debit; cells[l.accountCode].credit += l.credit; }
    const vals = Object.values(cells);
    return { month: m, cells, debit: vals.reduce((s, c) => s + c.debit, 0), credit: vals.reduce((s, c) => s + c.credit, 0) };
  });
  const totalCells = blank();
  for (const r of months) for (const a of accounts) { totalCells[a.code].debit += r.cells[a.code].debit; totalCells[a.code].credit += r.cells[a.code].credit; }
  const label = from && to ? `${from.slice(0, 7)} ~ ${to.slice(0, 7)}` : '합계';
  return {
    accounts, months,
    total: { month: label, cells: totalCells, debit: months.reduce((s, r) => s + r.debit, 0), credit: months.reduce((s, r) => s + r.credit, 0) },
  };
}

/* 재노출 — 화면이 한 곳에서 import 하게 */
export { RETAINED_GROUP, RETAINED_PRIOR, NET_INCOME_BS, OPERATING_INCOME, NET_INCOME_IS };
