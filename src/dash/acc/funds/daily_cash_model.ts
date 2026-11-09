/* 자금일보(ACC-021) 순수 모델 — 계정구분별 일일 자금시재표 · 화면 그리드 행(한 표 — buildGridRows) · 기준일자 검증 · 계정구분 옵션 · 결재라인.
   출처: 화면설계서 ACC-021 v1.0 slide 10(그리드 컬럼) · 11(조회조건) · 12(상신 규칙) · 14(결재라인조회 규칙) · 17(E00·E01 규칙 1~4) · 18(E02).
   결정·가정
   - 기준일 비교는 DEMO_TODAY(데모 기준일) — 'YYYY-MM-DD' 문자열 비교 = 시간순.
   - 행 포함 = 개설일 ≤ 기준일 AND (그날 금액 4종 중 하나라도 0 아님 OR (사용 계좌 AND 만기 미도래)).
     → 아직 개설 전 계좌·만기 해지 후 잔액 0 계좌는 빠진다.
   - 농안기금은 기준일자 연도 ≥ 2025 이면 섹션·합계·계정구분 옵션에서 모두 제외(slide 17 규칙 4).
   - 상신 필수 = 결재선(결재 1~3) 1명 이상. 합의선만 있으면 '결재선을 지정해 주세요.'. */
import { DEMO_TODAY, FUNDS_ACCOUNT_TYPES } from './funds_data';
import type { BankAccount, CashTxn, FundsAccountType } from './funds_data';
import { periodBalance } from './funds_model';
import type { ApprovalUser } from './daily_cash_data';

export const MSG = {
  future: '기준일자는 오늘 이후로 선택할 수 없습니다.',
  required: '기준일자를 선택해 주세요.',
  empty: '조회된 데이터가 없습니다',
  noLine: '결재선을 지정해 주세요.',
  noUser: '사용자를 선택해 주세요.',
  slotTaken: '이미 지정된 단계입니다. 변경하시겠습니까?',
  submitted: '상신되었습니다.',
  saved: '저장되었습니다.',
} as const;

export const NONGAN: FundsAccountType = FUNDS_ACCOUNT_TYPES[1];   // 농식품투자계정(농안기금)
export const TOTAL_TITLE = '농식품모태펀드 미출자자산 합계';

/* ── 조회조건 ── */
export interface DailyCashFilter { date: string; accountType: '' | FundsAccountType }   // '' = 전체
export const defaultFilter = (): DailyCashFilter => ({ date: DEMO_TODAY, accountType: '' });

/** 기준일자 검증 — 미입력 · 미래(오늘 이후) 차단. 정상 = null */
export function validateBaseDate(d: string, today: string = DEMO_TODAY): string | null {
  if (!d) return MSG.required;
  if (d > today) return MSG.future;
  return null;
}

/** 농안기금 노출 여부 — 기준일자 연도 ≤ 2024 */
export const showsNongan = (d: string): boolean => !!d && Number(d.slice(0, 4)) <= 2024;

/** 계정구분 옵션(전체 제외) — 2025년 이후면 농안기금 제외 */
export function accountTypeOptions(d: string): FundsAccountType[] {
  return FUNDS_ACCOUNT_TYPES.filter((t) => t !== NONGAN || showsNongan(d));
}

/** 기준일자 변경 — 농안기금 선택 중 2025년 이후로 바뀌면 계정구분을 전체로 되돌린다(옵션에서 사라진 값을 남기지 않는다) */
export function changeDate(f: DailyCashFilter, date: string): DailyCashFilter {
  const accountType = f.accountType === NONGAN && !showsNongan(date) ? '' : f.accountType;
  return { ...f, date, accountType };
}

/* ── 자금시재표 ── */
export interface CashRow {
  id: string;
  subject: string;          // 구분(예금 종류)
  bank: string;             // 은행
  rate: number;             // 이율(%)
  product: string;          // 상품명(계좌별칭)
  openDate: string;         // 개시일
  maturityDate: string | null;   // 만기일(없음 = null → '-')
  accountNo: string;        // 계좌번호
  opening: number;          // 기초시재
  increase: number;         // 입금
  decrease: number;         // 출금
  closing: number;          // 마감시재
}
export interface CashAmounts { opening: number; increase: number; decrease: number; closing: number }
export interface CashSection { type: FundsAccountType; rows: CashRow[]; subtotal: CashAmounts }
export interface DailyCashReport { date: string; sections: CashSection[]; total: CashAmounts; rowCount: number }

const ZERO: CashAmounts = { opening: 0, increase: 0, decrease: 0, closing: 0 };
const add = (a: CashAmounts, b: CashAmounts): CashAmounts => ({
  opening: a.opening + b.opening, increase: a.increase + b.increase, decrease: a.decrease + b.decrease, closing: a.closing + b.closing,
});

/** 기준일자에 시재표에 나타나는 계좌인가 */
export function isListed(acc: BankAccount, amounts: CashAmounts, d: string): boolean {
  if (acc.openDate > d) return false;
  const moved = amounts.opening !== 0 || amounts.increase !== 0 || amounts.decrease !== 0 || amounts.closing !== 0;
  const live = acc.active && !(acc.maturityDate && acc.maturityDate < d);
  return moved || live;
}

/** 표시 대상 섹션(계정구분) — 설계서 순서. 농안기금은 2024년까지만, 계정구분 필터가 있으면 그 하나 */
export function visibleTypes(f: DailyCashFilter): FundsAccountType[] {
  return accountTypeOptions(f.date).filter((t) => !f.accountType || t === f.accountType);
}

/** 계정구분별 일일 자금시재표 — 기초시재 = 전일까지 누계, 입금·출금 = 당일, 마감시재 = 기초 + 입금 − 출금. 합계 = 표시 섹션 소계 합 */
export function dailyCashReport(accounts: readonly BankAccount[], txns: readonly CashTxn[], f: DailyCashFilter): DailyCashReport {
  const d = f.date;
  if (validateBaseDate(d)) return { date: d, sections: [], total: ZERO, rowCount: 0 };
  const sections = visibleTypes(f).map((type): CashSection => {
    const rows: CashRow[] = [];
    for (const acc of accounts) {
      if (acc.accountType !== type) continue;
      const b = periodBalance(txns, acc.id, d, d);
      if (!isListed(acc, b, d)) continue;
      rows.push({
        id: acc.id, subject: acc.subject, bank: acc.bank, rate: acc.rate, product: acc.alias,
        openDate: acc.openDate, maturityDate: acc.maturityDate || null, accountNo: acc.accountNo,
        opening: b.opening, increase: b.increase, decrease: b.decrease, closing: b.closing,
      });
    }
    return { type, rows, subtotal: rows.reduce<CashAmounts>((s, r) => add(s, r), ZERO) };
  });
  return {
    date: d,
    sections,
    total: sections.reduce<CashAmounts>((s, x) => add(s, x.subtotal), ZERO),
    rowCount: sections.reduce((n, s) => n + s.rows.length, 0),
  };
}

/* ── 화면 그리드 행(한 표) — 계정구분마다 제목 행 → 계좌 행 → 소계 행, 고정 하단 = 미출자자산 합계 ──
   계좌가 없는 계정구분(다른 계정구분엔 있음) = 제목 → '조회된 데이터가 없습니다' 행 → 소계(0) — Excel 시트 배치와 같다.
   전체 0건(기준일자 오류 포함) = 행·고정 행 없음 → 그리드 빈 상태 오버레이. */
export type GridRowKind = 'title' | 'account' | 'empty' | 'subtotal' | 'total';
export type GridRow = Omit<CashRow, 'rate' | 'maturityDate'> & { rate: number | null; maturityDate: string | null | ''; kind: GridRowKind };
export interface DailyCashGrid { rows: GridRow[]; pinned: GridRow[] }

const labelRow = (id: string, kind: GridRowKind, label: string, a: CashAmounts = ZERO): GridRow => ({
  id, kind, subject: label, bank: '', rate: null, product: '', openDate: '', maturityDate: '', accountNo: '', ...a,
});

/** 화면 그리드 행 — showTotal(계정구분 전체)일 때만 고정 하단 합계 */
export function buildGridRows(report: DailyCashReport, showTotal: boolean): DailyCashGrid {
  if (!report.rowCount) return { rows: [], pinned: [] };
  const rows: GridRow[] = [];
  for (const s of report.sections) {
    rows.push(labelRow(`title-${s.type}`, 'title', s.type));
    for (const r of s.rows) rows.push({ ...r, kind: 'account' });
    if (!s.rows.length) rows.push(labelRow(`empty-${s.type}`, 'empty', MSG.empty));
    rows.push(labelRow(`subtotal-${s.type}`, 'subtotal', '소계', s.subtotal));
  }
  return { rows, pinned: showTotal ? [labelRow('total', 'total', TOTAL_TITLE, report.total)] : [] };
}

/* ── 전자결재 ── */
export type LineKind = 'approval' | 'agreement';   // 결재선 · 합의선
export const LINE_LABEL: Record<LineKind, string> = { approval: '결재', agreement: '합의' };
export const STEPS = [1, 2, 3] as const;
export type Step = typeof STEPS[number];
export interface ApprovalLine { approval: (ApprovalUser | null)[]; agreement: (ApprovalUser | null)[] }

export const emptyLine = (): ApprovalLine => ({ approval: [null, null, null], agreement: [null, null, null] });
export const cloneLine = (l: ApprovalLine): ApprovalLine => ({ approval: [...l.approval], agreement: [...l.agreement] });

/** 지정 위치가 다른 사용자로 이미 차 있는가(같은 사용자면 확인 없이 그대로) */
export function slotTaken(line: ApprovalLine, kind: LineKind, step: Step, user: ApprovalUser): boolean {
  const cur = line[kind][step - 1];
  return !!cur && cur.id !== user.id;
}

/** 지정 위치에 사용자 배치(교체 포함) — 새 객체 */
export function assignSlot(line: ApprovalLine, kind: LineKind, step: Step, user: ApprovalUser | null): ApprovalLine {
  const next = cloneLine(line);
  next[kind][step - 1] = user;
  return next;
}

/** 상신 검증 — 결재선(결재 1~3) 1명 이상. 정상 = null */
export function validateSubmit(line: ApprovalLine): string | null {
  return line.approval.some(Boolean) ? null : MSG.noLine;
}

/** 결재라인조회 사용자 검색 — 부서('' = 전체) + 성명/아이디 부분 일치 */
export function searchUsers(users: readonly ApprovalUser[], dept: string, keyword: string): ApprovalUser[] {
  const k = keyword.trim();
  return users.filter((u) => (!dept || u.dept === dept) && (!k || u.name.includes(k) || u.id.includes(k)));
}

/* ── 문구 ── */
export const draftTitle = (d: string): string => `자금일보 (${d})`;
export const pdfName = (d: string): string => `자금일보_${d}.pdf`;
export const xlsxName = (d: string): string => `자금일보_${d}.xlsx`;
export const userLabel = (u: ApprovalUser | null): string => (u ? `${u.id}  ${u.name}` : '');
export const userOrg = (u: ApprovalUser | null): string => (u ? `${u.position} / ${u.dept}` : '');
