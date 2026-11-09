/* 출자금현황 정보관리(ACC-022) 순수 모델 — 계산 컬럼·출자잔액 누계·필터·단위 환산·등록 검증·엑셀 일괄등록 검증.
   출처: 화면설계서 ACC-022 slide 10(그리드) · 11/18(상세필터) · 12(출자등록) · 13(분배등록) · 14/22(엑셀 일괄등록) · 24(삭제).
   - 출자잔액 = 계정별 Σ출자원금 − Σ분배원금(A). 전체 행(논리삭제 제외)으로 누계를 낸 **뒤** 필터한다 —
     기간·구분 필터를 걸어도 각 행의 잔액은 실제 이력 기준이다.
   - 같은 계정 안 순서(누계·잔액(전) 공통): 기준일 → 출자가 분배보다 먼저 → 회차 → id. (설계서에 동일일 규칙 없음 — 가정)
   - 출자잔액은 음수가 될 수 없다 — 삭제·저장·업로드 반영 전 negativeBalanceAfter 로 결과 행을 검사해 막는다.
   - 금액은 원 단위로 계산·합산하고 단위 환산은 마지막에 한다(반올림한 값을 더하지 않는다). */
import { CONTRIB_ACCOUNTS, ACCOUNT_BY_LABEL, DIST_KINDS } from './contribution_data';
import type { ContribAccount, ContribKind, ContribRow, DistKind, Unit, AccountFilterLabel } from './contribution_data';
import { validatePeriod } from './funds_model';
export { validatePeriod, PERIOD_ERROR } from './funds_model';

/* ── 계산 컬럼(slide 10 ②) ── */
export const totalDist = (r: Pick<ContribRow, 'principal' | 'income'>) => r.principal + r.income;                                       // A+B
export const netAfterTax = (r: Pick<ContribRow, 'principal' | 'income' | 'withholding'>) => r.principal + r.income - r.withholding;     // A+B−C
export const payWithPerf = (r: Pick<ContribRow, 'principal' | 'income' | 'withholding' | 'perfFee' | 'incentive'>) => netAfterTax(r) + r.perfFee + r.incentive;   // A+B−C+D+E
export const payWithoutPerf = (r: Pick<ContribRow, 'principal' | 'income' | 'withholding' | 'incentive'>) => netAfterTax(r) + r.incentive;                       // A+B−C+E

export interface ContribView extends ContribRow {
  totalDist: number;
  netAfterTax: number;
  payWithPerf: number;
  payWithoutPerf: number;
  balance: number;     // 출자잔액(이 행 반영 후)
}

const KIND_ORDER: Record<ContribKind, number> = { 출자: 0, 분배: 1 };
/** 같은 계정 안 시간 순서 — 기준일 → 출자 먼저 → 회차(null 은 뒤) → id */
export function compareInAccount(a: ContribRow, b: ContribRow): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  const sa = a.seq ?? Number.MAX_SAFE_INTEGER, sb = b.seq ?? Number.MAX_SAFE_INTEGER;
  if (sa !== sb) return sa - sb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
const accountIdx = (a: ContribAccount) => CONTRIB_ACCOUNTS.indexOf(a);

/** 표시 순서(계정구분 → 시간 순) + 계산 컬럼 + 계정별 출자잔액 누계 */
export function withBalances(rows: readonly ContribRow[]): ContribView[] {
  const sorted = [...rows].sort((a, b) => accountIdx(a.account) - accountIdx(b.account) || compareInAccount(a, b));
  const run = new Map<ContribAccount, number>();
  return sorted.map((r) => {
    const bal = (run.get(r.account) ?? 0) + r.invest - r.principal;
    run.set(r.account, bal);
    return { ...r, totalDist: totalDist(r), netAfterTax: netAfterTax(r), payWithPerf: payWithPerf(r), payWithoutPerf: payWithoutPerf(r), balance: bal };
  });
}

/** 등록 모달 '출자원금잔액(전)'·'분배전 출자원금잔액' — 그 계정에서 (date, kind, seq) 시점 이전까지의 누계.
    정렬 규칙은 compareInAccount 그대로(그리드 잔액과 일치): 같은 날 출자는 분배보다 앞, 같은 날 같은 구분은 회차 → id 순.
    excludeId = 수정 중인 자기 행(id 비교에도 쓴다). seq 미지정(신규·업로드) = 같은 날 같은 구분의 기존 행 뒤.
    date 가 비면 그 계정 전체 누계(현재 잔액). */
export function balanceBefore(rows: readonly ContribRow[], account: ContribAccount, date: string, kind: ContribKind, excludeId?: string, seq?: number | null): number {
  const probe = { date, kind, seq: seq ?? null, id: excludeId ?? '\uffff' } as ContribRow;
  let bal = 0;
  for (const r of rows) {
    if (r.account !== account || r.id === excludeId) continue;
    if (!date || compareInAccount(r, probe) < 0) bal += r.invest - r.principal;
  }
  return bal;
}

/** 출자잔액 음수 게이트 — 결과 행 집합에서 계정별 잔액이 처음 음수가 되는 행(계정당 1건). 빈 배열 = 통과.
    삭제(E08)·저장(E04·E05·E07)·엑셀 반영(E06) 직전에 결과 행으로 돌려, 뒤 분배가 음수 잔액을 만들면 막는다. */
export function negativeBalanceAfter(rows: readonly ContribRow[]): ContribView[] {
  const seen = new Set<ContribAccount>();
  const out: ContribView[] = [];
  for (const v of withBalances(rows)) if (v.balance < 0 && !seen.has(v.account)) { seen.add(v.account); out.push(v); }
  return out;
}

/** 회차 자동 채번 — 그 계정·구분의 최대 회차 + 1 */
export function nextSeq(rows: readonly ContribRow[], account: ContribAccount, kind: ContribKind, excludeId?: string): number {
  let max = 0;
  for (const r of rows) if (r.account === account && r.kind === kind && r.id !== excludeId && r.seq != null && r.seq > max) max = r.seq;
  return max + 1;
}

/* ── 상세필터(slide 11·18) ── */
export interface ContribFilter {
  account: AccountFilterLabel | '';   // '' = 전체
  kind: ContribKind | '';
  from: string;
  to: string;
}
export const EMPTY_FILTER: ContribFilter = { account: '', kind: '', from: '', to: '' };

/** 필터 — 잔액은 이미 계산된 views 를 받아 거르기만 한다. 기간 오류면 0건 */
export function filterViews(views: readonly ContribView[], f: ContribFilter): ContribView[] {
  if (validatePeriod(f.from, f.to)) return [];
  const acc = f.account ? ACCOUNT_BY_LABEL[f.account] : '';
  return views.filter((r) => (!acc || r.account === acc) && (!f.kind || r.kind === f.kind) && (!f.from || r.date >= f.from) && (!f.to || r.date <= f.to));
}

/* ── 단위 환산(slide 17 ③-3) — 원 저장값 ÷ 1 / 1,000 / 1,000,000, 정수 반올림 ── */
export const UNIT_DIVISOR: Record<Unit, number> = { 원: 1, 천원: 1_000, 백만원: 1_000_000 };
export function toUnit(won: number, unit: Unit): number {
  const v = Math.round(won / UNIT_DIVISOR[unit]);
  return Object.is(v, -0) ? 0 : v;
}

/* ── 합계 행(E03) — 금액 컬럼만. 출자잔액은 누계라 합산하지 않는다(null → '-') ── */
export const AMOUNT_KEYS = ['invest', 'principal', 'income', 'totalDist', 'withholding', 'perfFee', 'incentive', 'netAfterTax', 'payWithPerf', 'payWithoutPerf'] as const;
export type AmountKey = typeof AMOUNT_KEYS[number];
export type ContribTotals = Record<AmountKey, number>;
export function sumTotals(views: readonly ContribView[]): ContribTotals {
  const t = Object.fromEntries(AMOUNT_KEYS.map((k) => [k, 0])) as ContribTotals;
  for (const r of views) for (const k of AMOUNT_KEYS) t[k] += r[k];
  return t;
}

/* ── 삭제(E08) — 논리삭제: 목록에서 빼 deleted 로 옮긴다. 잔액은 withBalances 가 다시 계산한다 ── */
export function logicalDelete(rows: readonly ContribRow[], deleted: readonly ContribRow[], ids: readonly string[]): { rows: ContribRow[]; deleted: ContribRow[] } {
  const set = new Set(ids);
  return { rows: rows.filter((r) => !set.has(r.id)), deleted: [...deleted, ...rows.filter((r) => set.has(r.id))] };
}
export const deleteConfirmMsg = (n: number) => `선택한 ${String(n)}건을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.`;

/* ── 등록 모달 검증(slide 12 ③ · 13 ③) ── */
export const CONTRIB_MSG = {
  account: '계정구분을 선택해 주세요.',
  investDate: '출자일을 입력해 주세요.',
  distDate: '분배일을 입력해 주세요.',
  pay: '납입금액을 입력해 주세요.',
  distKind: '구분을 선택해 주세요.',
  principal: '분배원금을 입력해 주세요.',       // 설계서에 문구 없음 — 가정
  income: '분배수익을 입력해 주세요.',          // 설계서에 문구 없음 — 가정
  overflow: '분배원금이 출자원금잔액을 초과합니다.',
  deleteNegative: '삭제 후 출자원금잔액이 음수가 되는 분배가 있어 삭제할 수 없습니다.',
  kindReset: '구분 변경 시 비활성 항목 금액이 초기화됩니다.',
  attach: '20MB 이하 허용 형식만 첨부할 수 있습니다.',
  saved: '저장되었습니다.',
} as const;

export type ContribField = 'account' | 'date' | 'pay' | 'distKind' | 'principal' | 'income';
export type Check = { ok: true } | { ok: false; field: ContribField; message: string };
const missing = (n: number | null | undefined) => n == null || n === 0;

export interface InvestInput { account: ContribAccount | ''; date: string; pay: number | null }
/** 출자등록 — 계정구분 → 출자일 → 납입금액(0·빈값 = 미입력) */
export function validateInvest(v: InvestInput): Check {
  if (!v.account) return { ok: false, field: 'account', message: CONTRIB_MSG.account };
  if (!v.date) return { ok: false, field: 'date', message: CONTRIB_MSG.investDate };
  if (missing(v.pay)) return { ok: false, field: 'pay', message: CONTRIB_MSG.pay };
  return { ok: true };
}

/** 구분별 입력 가능 여부 — 원금: A / 수익: B / 원금+수익: A·B. 미선택은 둘 다 입력 가능 */
export const needsPrincipal = (k: DistKind | '') => k === '원금' || k === '원금+수익';
export const needsIncome = (k: DistKind | '') => k === '수익' || k === '원금+수익';
export const principalEnabled = (k: DistKind | '') => k === '' || needsPrincipal(k);
export const incomeEnabled = (k: DistKind | '') => k === '' || needsIncome(k);

/** 구분 변경 — 새 구분에서 비활성이 된 A/B 를 0 으로. cleared = 0 이 아니던 값을 실제로 지웠는지(토스트 조건) */
export function applyDistKind(kind: DistKind | '', v: { principal: number | null; income: number | null }): { principal: number | null; income: number | null; cleared: boolean } {
  let { principal, income } = v;
  let cleared = false;
  if (!principalEnabled(kind)) { if (principal) cleared = true; principal = 0; }
  if (!incomeEnabled(kind)) { if (income) cleared = true; income = 0; }
  return { principal, income, cleared };
}

export interface DistInput { account: ContribAccount | ''; date: string; distKind: DistKind | ''; principal: number | null; income: number | null }
/** 분배등록 — 계정구분 → 분배일 → 구분 → A 필수 → B 필수 → A > 분배전 잔액 */
export function validateDistribute(v: DistInput, before: number): Check {
  if (!v.account) return { ok: false, field: 'account', message: CONTRIB_MSG.account };
  if (!v.date) return { ok: false, field: 'date', message: CONTRIB_MSG.distDate };
  if (!v.distKind || !(DIST_KINDS as readonly string[]).includes(v.distKind)) return { ok: false, field: 'distKind', message: CONTRIB_MSG.distKind };
  if (needsPrincipal(v.distKind) && missing(v.principal)) return { ok: false, field: 'principal', message: CONTRIB_MSG.principal };
  if (needsIncome(v.distKind) && missing(v.income)) return { ok: false, field: 'income', message: CONTRIB_MSG.income };
  if ((v.principal ?? 0) > before) return { ok: false, field: 'principal', message: CONTRIB_MSG.overflow };
  return { ok: true };
}

/* ── 첨부(slide 12 ③-6) — 파일당 20MB · PPT/PDF/XLS/HWP/이미지 ── */
export const ATTACH_MAX_BYTES = 20 * 1024 * 1024;
export const ATTACH_EXTS = ['ppt', 'pptx', 'pdf', 'xls', 'xlsx', 'hwp', 'hwpx', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] as const;
export const ATTACH_ACCEPT = ATTACH_EXTS.map((e) => '.' + e).join(',');
export function checkAttachment(f: { name: string; size: number }): boolean {
  const ext = f.name.includes('.') ? f.name.slice(f.name.lastIndexOf('.') + 1).toLowerCase() : '';
  return f.size <= ATTACH_MAX_BYTES && (ATTACH_EXTS as readonly string[]).includes(ext);
}

/* ── 엑셀 일괄등록(slide 14 · E06) ── */
export const UPLOAD_HEADERS = ['계정구분', '등록구분', '일자', '회차', '납입금액', '분배구분', '분배원금(A)', '분배수익(B)', '성과보수(D)', '초과인센티브(E)', 'LAC', '비고'] as const;

/** 업로드 1행 — 파일 셀 그대로(문자열). 검증 후 errors 가 채워진다 */
export interface UploadRow {
  no: number;
  account: string; regKind: string; date: string; seq: string; pay: string;
  distKind: string; principal: string; income: string; perfFee: string; incentive: string; lac: string; memo: string;
  errors: string[];
}

export function uploadTemplateAoa(): (string | number)[][] {
  return [
    [...UPLOAD_HEADERS],
    ['농식품', '출자', '2026-11-05', '', 1_000_000_000, '', '', '', '', '', '', '출자 예시'],
    ['수산', '분배', '2026-11-05', '', '', '원금+수익', 100_000_000, 20_000_000, 3_000_000, 0, 0, '분배 예시'],
  ];
}

/** 데모 미리보기 6행(오류 2행 포함) — 파일 파싱 대체(xlsx 파서 CVE, 백엔드 연동 후 실제 파싱) */
export function demoUploadRows(): UploadRow[] {
  const r = (no: number, account: string, regKind: string, date: string, pay: string, distKind = '', principal = '', income = '', perfFee = '', incentive = '', lac = '', memo = ''): UploadRow =>
    ({ no, account, regKind, date, seq: '', pay, distKind, principal, income, perfFee, incentive, lac, memo, errors: [] });
  return [
    r(1, '농식품', '출자', '2026-09-15', '1,000,000,000', '', '', '', '', '', '', '5차 출자금 납입'),
    r(2, '수산', '분배', '2026-09-20', '', '원금', '300,000,000', '', '', '', '', '원금 분배'),
    r(3, '비용', '분배', '2026-09-25', '', '', '50,000,000', '', '', '', '', '분배구분 누락 예시'),
    r(4, '수산', '분배', '2026-10-02', '', '원금', '99,000,000,000', '', '', '', '', '잔액 초과 예시'),
    r(5, '농식품', '분배', '2026-10-10', '', '수익', '', '250,000,000', '37,500,000', '', '', '수익 분배'),
    r(6, '비용', '출자', '2026-10-15', '300,000,000', '', '', '', '', '', '', '관리비용 출자'),
  ];
}

/** 셀 금액 — 빈칸 = null, 숫자 아님/음수 = NaN(형식 오류) */
function cellAmount(s: string): number | null {
  const t = s.replace(/[,\s]/g, '');
  if (t === '') return null;
  return /^\d+$/.test(t) ? Number(t) : Number.NaN;
}
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
/** 계정구분 셀 — 짧은 라벨(농식품) 또는 전체 이름(농식품(투자계정)) */
export function parseAccount(s: string): ContribAccount | null {
  const t = s.trim();
  if ((CONTRIB_ACCOUNTS as readonly string[]).includes(t)) return t as ContribAccount;
  return (ACCOUNT_BY_LABEL as Record<string, ContribAccount>)[t] ?? null;
}

/** 1행 검증 — before = 그 행 시점의 출자원금잔액(기존 + 앞서 통과한 업로드 행). 오류 사유 배열 반환 */
export function validateUploadRow(row: UploadRow, before: number): string[] {
  const errs: string[] = [];
  if (!row.account.trim()) errs.push('계정구분 누락');
  else if (!parseAccount(row.account)) errs.push('계정구분 형식 오류');
  const reg = row.regKind.trim();
  if (!reg) errs.push('등록구분 누락');
  else if (reg !== '출자' && reg !== '분배') errs.push('등록구분 형식 오류');
  if (!row.date.trim()) errs.push('일자 누락');
  else if (!isDate(row.date.trim())) errs.push('일자 형식 오류');
  if (row.seq.trim() && !/^\d+$/.test(row.seq.trim())) errs.push('회차 형식 오류');
  if (reg === '출자') {
    const pay = cellAmount(row.pay);
    if (Number.isNaN(pay)) errs.push('납입금액 형식 오류');
    else if (missing(pay)) errs.push('납입금액 누락');
    // 분배 컬럼은 무시(slide 14 ③-3)
  } else if (reg === '분배') {
    const dk = row.distKind.trim();
    const amounts = { principal: cellAmount(row.principal), income: cellAmount(row.income), perfFee: cellAmount(row.perfFee), incentive: cellAmount(row.incentive), lac: cellAmount(row.lac) };
    const label = { principal: '분배원금(A)', income: '분배수익(B)', perfFee: '성과보수(D)', incentive: '초과인센티브(E)', lac: 'LAC' } as const;
    for (const k of Object.keys(amounts) as (keyof typeof amounts)[]) if (Number.isNaN(amounts[k])) errs.push(`${label[k]} 형식 오류`);
    if (!dk) errs.push('분배구분 누락');
    else if (!(DIST_KINDS as readonly string[]).includes(dk)) errs.push('분배구분 형식 오류');
    else {
      const k = dk as DistKind;
      if (needsPrincipal(k) && !Number.isNaN(amounts.principal) && missing(amounts.principal)) errs.push('분배원금(A) 누락');
      if (needsIncome(k) && !Number.isNaN(amounts.income) && missing(amounts.income)) errs.push('분배수익(B) 누락');
      const a = needsPrincipal(k) ? amounts.principal : 0;
      // 잔액 초과는 다른 오류가 없을 때만 본다(의도 — 형식·누락 오류 행은 금액을 믿을 수 없다)
      if (errs.length === 0 && (a ?? 0) > before) errs.push(CONTRIB_MSG.overflow);
    }
  }
  return errs;
}

/** 업로드 행 → 등록 행(검증 통과분 전제). 회차 빈칸 = 자동 채번. 원천세(C)는 양식에 없어 0 */
function toContrib(row: UploadRow, id: string, existing: readonly ContribRow[]): ContribRow {
  const account = parseAccount(row.account) as ContribAccount;
  const kind = row.regKind.trim() as ContribKind;
  const num = (s: string) => cellAmount(s) ?? 0;
  const seq = row.seq.trim() ? Number(row.seq.trim()) : nextSeq(existing, account, kind);
  if (kind === '출자') {
    return { id, account, date: row.date.trim(), seq, kind, distKind: '', invest: num(row.pay), principal: 0, income: 0, withholding: 0, perfFee: 0, incentive: 0, lac: 0, memo: row.memo, attachments: [] };
  }
  const dk = row.distKind.trim() as DistKind;
  return {
    id, account, date: row.date.trim(), seq, kind, distKind: dk, invest: 0,
    principal: needsPrincipal(dk) ? num(row.principal) : 0, income: needsIncome(dk) ? num(row.income) : 0, withholding: 0,
    perfFee: num(row.perfFee), incentive: num(row.incentive), lac: num(row.lac), memo: row.memo, attachments: [],
  };
}

/** 전 행 검증(파일 순서) — 통과한 행은 다음 행 잔액 계산에 포함된다. 반환: 오류 표시된 행 + 통과분 등록 행 */
export function validateUpload(rows: readonly UploadRow[], existing: readonly ContribRow[], makeId: (i: number) => string): { rows: UploadRow[]; passed: ContribRow[]; errorCount: number } {
  const acc: ContribRow[] = [...existing];
  const passed: ContribRow[] = [];
  const out = rows.map((row) => {
    const account = parseAccount(row.account);
    const before = account ? balanceBefore(acc, account, row.date.trim(), (row.regKind.trim() === '출자' ? '출자' : '분배')) : 0;
    const errors = validateUploadRow(row, before);
    if (errors.length === 0) {
      const c = toContrib(row, makeId(passed.length), acc);
      // 음수 게이트 — 이 행을 넣으면 뒤(기존·앞서 통과한) 분배의 잔액이 음수가 되면 오류로 빼낸다
      if (negativeBalanceAfter([...acc, c]).length) errors.push(CONTRIB_MSG.overflow);
      else { acc.push(c); passed.push(c); }
    }
    return { ...row, errors };
  });
  return { rows: out, passed, errorCount: out.filter((r) => r.errors.length).length };
}
export const uploadErrorMsg = (n: number) => `오류 ${String(n)}건 — 확인 후 재업로드`;
export const uploadDoneMsg = (n: number) => `${String(n)}건 등록되었습니다.`;
