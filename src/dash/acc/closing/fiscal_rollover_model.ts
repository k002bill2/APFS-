/* 회기생성/전기이월(ACC-016) — 순수 업무 규칙. 페이지(fiscal_rollover_manage.tsx)는 배선만 한다.
   모든 함수는 입력 배열을 바꾸지 않고 새 배열을 돌려준다(테스트: fiscal_rollover.test.ts).

   날짜는 문자열 'YYYY-MM-DD' 로만 다룬다. 계산은 Date.UTC + getUTC* — 로컬 타임존(KST 00~09시 toISOString 전날 문제)과 무관.

   규칙(설계서 slide 10·15·16·18·19 + 결정)
   - 회기 생성(E11): 계정구분당 최초 1기만. 종료일 = 시작일 연도 12-31, 이월회기 2기 · 이월기간 = 다음해 01-01 ~ 12-31(결정).
     이미 회기가 있으면 '이미 회기가 생성된 계정구분입니다'.
   - 연마감(E03-1/2): 선택 행 마감여부 '여' + 다음 회기 행 자동 생성 — 마감회기 N+1기 · 마감기간 = 직전 행의 이월기간,
     이월회기 N+2기 · 이월기간 = 그 다음날부터 1년(시작일 + 1년 - 1일. 1-1 시작이면 12-31).
     게이트 필터형(결정): 이미 마감('여') · 미결재 전표 있음([연마감]만) · 저장 안 한 편집(U) 행은 건너뛰고 나머지만 처리한다.
   - 마감기간종료일 편집 → 이월기간시작일 = 종료일 + 1일(직접 수정 불가). 이월기간종료일은 그대로 입력값.
   - 저장(E02) 검증: 마감기간종료일 ≥ 마감기간시작일 · 이월기간종료일 ≥ 이월기간시작일(빈 값·잘못된 날짜도 위반). */

export type ClosedYn = '부' | '여';
/** 편집 가능한 셀 */
export type EditField = 'closeEnd' | 'carryEnd';
/** '' = 저장본 그대로 · U = 편집됨(저장 전) */
export type RowStatus = '' | 'U';

export interface FiscalRow {
  id: string;
  account: string;          // 계정구분명
  term: number;             // 마감회기(기수)
  closeStart: string;       // 마감기간시작일
  closeEnd: string;         // 마감기간종료일(편집)
  closed: ClosedYn;         // 마감여부
  carryTerm: number;        // 이월회기
  carryStart: string;       // 이월기간시작일(자동 = 마감기간종료일 + 1일)
  carryEnd: string;         // 이월기간종료일(편집)
  /** 그 회기의 미결재 전표 수 — 그리드에 표시하지 않는다(설계서 8컬럼). [연마감] 게이트에만 쓴다 */
  unapprovedCount: number;
  status: RowStatus;
  /** 편집한 셀(편집 셀 표시) */
  edited?: EditField[];
  /** 저장 검증에 걸린 셀 */
  err?: EditField[];
  /** 이 화면에서 방금 생긴 행(회기 생성·연마감 자동 생성) — 기준년도 필터와 무관하게 보인다. 조회(E04)가 지운다 */
  fresh?: boolean;
}

export const DUP_FISCAL_MSG = '이미 회기가 생성된 계정구분입니다';
export const termLabel = (n: number) => `${String(n)}기`;
/** 행 id — 계정구분 + 기수는 유일하다. 결정적이라 저장본·화면 행에 같은 연마감을 각각 적용해도 id 가 같다 */
export const fiscalId = (account: string, term: number) => `fy-${account}-${String(term)}`;

/* ── 날짜(문자열) ── */
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** 실제로 있는 날짜인지(2027-02-30 · 2026-13-01 거부) */
export function isValidDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

const fromUtc = (t: Date) => `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;

/** 날짜 + n일. 잘못된 날짜면 '' */
export function addDays(s: string, n: number): string {
  if (!isValidDate(s)) return '';
  const [y, mo, d] = s.split('-').map(Number);
  return fromUtc(new Date(Date.UTC(y, mo - 1, d + n)));
}

/** 같은 날짜의 n년 뒤(2-29 → 평년이면 2-28). 잘못된 날짜면 '' */
export function addYears(s: string, n: number): string {
  if (!isValidDate(s)) return '';
  const [y, mo, d] = s.split('-').map(Number);
  const last = new Date(Date.UTC(y + n, mo, 0)).getUTCDate();   // 대상 월 말일
  return `${pad(y + n, 4)}-${pad(mo)}-${pad(Math.min(d, last))}`;
}

/** 이월기간 종료일 기본값 = 시작일 + 1년 - 1일(01-01 시작 → 같은 해 12-31).
    addYears 의 2-29→2-28 말일 보정을 거치면 하루 더 당겨지므로(2029-02-27), 날짜 넘침을 그대로 쓴다 — 2028-02-29 + 1년 = 2029-03-01 → -1일 = 2029-02-28 */
export function oneYearEnd(start: string): string {
  if (!isValidDate(start)) return '';
  const [y, mo, d] = start.split('-').map(Number);
  return fromUtc(new Date(Date.UTC(y + 1, mo - 1, d - 1)));
}

/* ── E11 회기 생성(최초 1기) ── */

/** 회기가 아직 없는 계정구분 — 회기 생성 모달의 선택지 */
export const accountsWithoutFiscal = (rows: readonly FiscalRow[], accounts: readonly string[]) =>
  accounts.filter((a) => !rows.some((r) => r.account === a));

/** 1기 행. 종료일 = 시작 연도 12-31 */
export function firstFiscalRow(account: string, startDate: string): FiscalRow {
  const y = Number(startDate.slice(0, 4));
  return {
    id: fiscalId(account, 1), account, term: 1,
    closeStart: startDate, closeEnd: `${pad(y, 4)}-12-31`, closed: '부',
    carryTerm: 2, carryStart: `${pad(y + 1, 4)}-01-01`, carryEnd: `${pad(y + 1, 4)}-12-31`,
    unapprovedCount: 0, status: '', fresh: true,
  };
}

/** 회기 생성 — 계정구분·시작일 필수, 이미 회기가 있으면 DUP_FISCAL_MSG 로 throw. 새 행은 맨 아래 */
export function createFirstFiscal(rows: readonly FiscalRow[], account: string, startDate: string): { rows: FiscalRow[]; row: FiscalRow } {
  if (!account) throw new Error('계정구분을 선택하세요.');
  if (!isValidDate(startDate)) throw new Error('시작일을 입력하세요.');
  if (rows.some((r) => r.account === account)) throw new Error(DUP_FISCAL_MSG);
  const row = firstFiscalRow(account, startDate);
  return { rows: [...rows, row], row };
}

/* ── E03-1 / E03-2 연마감 ── */

export interface CloseGate {
  /** 처리할 행 id(선택 순서가 아니라 목록 순서) */
  ok: string[];
  /** 건너뛴 건수 — 이미 마감 · 미결재 전표 있음([연마감]만) · 저장 안 한 편집 */
  closed: number;
  unapproved: number;
  dirty: number;
}

/** 연마감 게이트 — 클릭 시점 1회 평가. 사유가 여럿이면 이미 마감 > 미저장 > 미결재 순으로 하나에만 센다 */
export function closeGate(rows: readonly FiscalRow[], ids: readonly string[], opts: { includeUnapproved: boolean }): CloseGate {
  const set = new Set(ids);
  const g: CloseGate = { ok: [], closed: 0, unapproved: 0, dirty: 0 };
  for (const r of rows) {
    if (!set.has(r.id)) continue;
    if (r.closed === '여' || rows.some((x) => x.account === r.account && x.term === r.term + 1)) g.closed += 1;
    else if (r.status !== '') g.dirty += 1;
    else if (!opts.includeUnapproved && r.unapprovedCount > 0) g.unapproved += 1;
    else g.ok.push(r.id);
  }
  return g;
}

/** 다음 회기 행 — 마감회기 N+1 · 마감기간 = 직전 이월기간, 이월회기 N+2 · 이월기간 = 그 다음날부터 1년 */
export function nextFiscalRow(r: FiscalRow): FiscalRow {
  const carryStart = addDays(r.carryEnd, 1);
  return {
    id: fiscalId(r.account, r.term + 1), account: r.account, term: r.term + 1,
    closeStart: r.carryStart, closeEnd: r.carryEnd, closed: '부',
    carryTerm: r.term + 2, carryStart, carryEnd: oneYearEnd(carryStart),
    unapprovedCount: 0, status: '', fresh: true,
  };
}

/** 연마감 — 게이트 통과 행만 '여' + 바로 아래에 다음 회기 행. 건너뛴 건수는 gate 로 돌려준다 */
export function yearEndClose(rows: readonly FiscalRow[], ids: readonly string[], opts: { includeUnapproved: boolean }): { rows: FiscalRow[]; gate: CloseGate } {
  const gate = closeGate(rows, ids, opts);
  const ok = new Set(gate.ok);
  const out: FiscalRow[] = [];
  for (const r of rows) {
    if (!ok.has(r.id)) { out.push(r); continue; }
    out.push({ ...r, closed: '여' });
    out.push(nextFiscalRow(r));
  }
  return { rows: out, gate };
}

/** 처리 가능 0건일 때 안내(모달을 열지 않는다) */
export function closeBlockedMessage(g: CloseGate): string {
  if (g.unapproved && !g.closed && !g.dirty) return '미결재 전표가 있어 연마감할 수 없습니다. 연마감(미결재포함)을 사용하세요.';
  if (g.dirty && !g.closed && !g.unapproved) return '저장하지 않은 변경이 있습니다. [저장] 후 연마감하세요.';
  if (g.closed && !g.dirty && !g.unapproved) return '이미 마감된 회기입니다.';
  return `연마감할 수 있는 회기가 없습니다 (${skippedText(g)})`;
}

/** 건너뛴 사유 요약 — '이미 마감 1건 · 미결재 전표 1건' */
export function skippedText(g: CloseGate): string {
  return [
    g.closed ? `이미 마감 ${String(g.closed)}건` : '',
    g.dirty ? `미저장 편집 ${String(g.dirty)}건` : '',
    g.unapproved ? `미결재 전표 ${String(g.unapproved)}건` : '',
  ].filter(Boolean).join(' · ');
}

/** 확인 모달 문구 — 처리 건수 K = 선택 N 이면 설계서 원문, 아니면 'N건 중 K건' */
export function closeConfirmText(n: number, k: number, includeUnapproved: boolean): string {
  const how = includeUnapproved ? '미결재 건을 포함하여 ' : '';
  return n === k
    ? `선택한 ${String(n)}건을 ${how}연마감하시겠습니까?`
    : `선택한 ${String(n)}건 중 연마감 가능한 ${String(k)}건을 ${how}연마감하시겠습니까?`;
}

/* ── 셀 편집 ── */

const markEdited = (r: FiscalRow, f: EditField, clearErr: EditField[]): FiscalRow => {
  const edited = r.edited?.includes(f) ? r.edited : [...(r.edited ?? []), f];
  const err = r.err?.filter((e) => !clearErr.includes(e));
  return { ...r, status: 'U', edited, err: err && err.length ? err : undefined };
};

/** 마감기간종료일 수정 → 이월기간시작일 = 종료일 + 1일(빈 값이면 빈 값). 마감('여') 행은 그대로 */
export function applyCloseEndEdit(row: FiscalRow, newEnd: string): FiscalRow {
  if (row.closed === '여') return row;
  return markEdited({ ...row, closeEnd: newEnd, carryStart: newEnd ? addDays(newEnd, 1) : '' }, 'closeEnd', ['closeEnd', 'carryEnd']);
}

/** 이월기간종료일 수정 — 입력값 그대로. 마감('여') 행은 그대로 */
export function applyCarryEndEdit(row: FiscalRow, newEnd: string): FiscalRow {
  if (row.closed === '여') return row;
  return markEdited({ ...row, carryEnd: newEnd }, 'carryEnd', ['carryEnd']);
}

/** 그리드 셀 편집 반영 */
export function editRow(rows: readonly FiscalRow[], id: string, field: EditField, value: string): FiscalRow[] {
  return rows.map((r) => (r.id !== id ? r : field === 'closeEnd' ? applyCloseEndEdit(r, value) : applyCarryEndEdit(r, value)));
}

/* ── E02 저장 ── */

export const changedCount = (rows: readonly FiscalRow[]) => rows.filter((r) => r.status === 'U').length;

/** 편집(U) 행 검증 — 위반 셀을 행에 싣고 셀 목록도 돌려준다 */
export function validateEdits(rows: readonly FiscalRow[]): { rows: FiscalRow[]; invalid: number; cells: { id: string; field: EditField }[] } {
  const cells: { id: string; field: EditField }[] = [];
  let invalid = 0;
  const out = rows.map((r) => {
    if (r.status !== 'U') return r.err ? { ...r, err: undefined } : r;
    const err: EditField[] = [];
    if (!isValidDate(r.closeEnd) || !isValidDate(r.closeStart) || r.closeEnd < r.closeStart) err.push('closeEnd');
    if (!isValidDate(r.carryEnd) || !isValidDate(r.carryStart) || r.carryEnd < r.carryStart) err.push('carryEnd');
    for (const f of err) cells.push({ id: r.id, field: f });
    if (err.length) invalid += 1;
    return { ...r, err: err.length ? err : undefined };
  });
  return { rows: out, invalid, cells };
}

/** 저장 반영 — 상태·편집 표시·오류 초기화. 반환값이 새 저장본 */
export const commitEdits = (rows: readonly FiscalRow[]): FiscalRow[] =>
  rows.map(({ edited: _e, err: _x, ...r }) => ({ ...r, status: '' as RowStatus }));

/** 조회(E04) — 저장본을 화면 행으로(미저장 편집 버림, 방금 생긴 행 표시 해제) */
export const reloadRows = (saved: readonly FiscalRow[]): FiscalRow[] =>
  saved.map(({ edited: _e, err: _x, fresh: _f, ...r }) => ({ ...r, status: '' as RowStatus }));

/* ── E01 상세필터 ── */

export interface FiscalFilter {
  /** 기준년도 'YYYY'('' = 전체) — 마감기간이 그 연도에 걸친 행 */
  year: string;
  /** 계정구분('' = 전체) */
  account: string;
}

/** 마감기간이 그 연도와 겹치는가(종료일이 비면 시작일만 본다) */
export function overlapsYear(r: FiscalRow, year: string): boolean {
  if (!/^\d{4}$/.test(year)) return true;
  const from = `${year}-01-01`, to = `${year}-12-31`;
  return r.closeStart <= to && (!r.closeEnd || r.closeEnd >= from);
}

/** 필터 술어. 편집(U)·방금 생긴 행은 조건과 무관하게 보인다 — 연마감으로 생긴 다음 회기(다음 해)가 기준년도에 걸려
    사라지거나 편집 중인 행이 숨지 않게(closing_form passesFilter 관용구) */
export const passesFilter = (f: FiscalFilter) => (r: FiscalRow) =>
  r.status !== '' || !!r.fresh || ((!f.account || r.account === f.account) && overlapsYear(r, f.year));
