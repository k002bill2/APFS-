/* 전표검색(ACC-008) 순수 모델 — 기본 기간(당월)·상세필터·정렬·범위 검증. 화면·테스트 공용.
   기간 검증은 일반전표 general_journal_model 의 validateRange(문구 "시작일은 종료일보다 늦을 수 없습니다.")를 그대로 쓰고,
   금액·금액(외화)(최소~최대) 검증은 같은 형태로 이 파일에 둔다(날짜 문구를 금액에 재사용하지 않음, 외화 문구는 '외화' 명시).
   날짜는 전부 'YYYY-MM-DD' 문자열(사전순 = 시간순), '오늘'은 호출부가 주입한다(테스트 결정성). */
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { parseAmount } from './general_journal_model';
import type { SearchLine } from './journal_search_data';

/** 상세필터 값(slide 11 정의표 No.1~20 전부) — 빈 문자열 = 미적용(셀렉트 '' = 전체/선택해 주세요) */
export interface SearchFilter {
  fundAccount: string;   // 1 계정구분(정확일치)
  from: string;          // 2 기간 시작(작성일, 포함)
  to: string;            //   기간 종료(작성일, 포함)
  writer: string;        // 3 작성자(부분일치)
  account: string;       // 4 계정과목(코드·이름 부분일치)
  partner: string;       // 5 거래처(부분일치)
  memo: string;          // 6 적요 — 분개 라인 적요(부분일치)
  slipNo: string;        // 7 전표번호(부분일치)
  dept: string;          // 8 작성부서(정확일치)
  slipKind: string;      // 9 전표구분(정확일치 — 정상/취소/정정)
  origin: string;        // 10 전표발생구분(정확일치)
  headMemo: string;      // 11 상단적요 — 전표 대표 적요(부분일치)
  amountMin: string;     // 12 금액 최소(입력 문자열 — 콤마 허용, 라인 금액 = 차변 또는 대변)
  amountMax: string;     //    금액 최대
  currency: string;      // 13 통화(정확일치)
  foreignAmountMin: string; // 14 금액(외화) 최소(입력 문자열 — 콤마·소수 허용, 전표 외화금액 기준)
  foreignAmountMax: string; //    금액(외화) 최대
  plDept: string;        // 15 손익부서(정확일치)
  plEmployee: string;    // 16 손익사원(정확일치)
  evidenceType: string;  // 17 증빙구분(정확일치)
  evidenceFile: string;  // 18 증빙파일명(첨부 파일명 부분일치)
  noEvidenceReason: string; // 19 증빙미첨부사유(부분일치 — 사유 없는 전표는 조건 시 제외)
  partnerBizNo: string;  // 20 거래처 사업자등록번호(숫자만 부분일치 — 하이픈 무시, 번호 없는 라인은 조건 시 제외)
}

/** 모든 조건 비움(기간 포함) */
export const EMPTY_SEARCH_FILTER: SearchFilter = {
  fundAccount: '', from: '', to: '', writer: '', account: '', partner: '', memo: '',
  slipNo: '', dept: '', slipKind: '', origin: '', headMemo: '', amountMin: '', amountMax: '',
  currency: '', foreignAmountMin: '', foreignAmountMax: '', plDept: '', plEmployee: '', evidenceType: '', evidenceFile: '',
  noEvidenceReason: '', partnerBizNo: '',
};

/** 기본 기간 = 당월 1일 ~ 말일(slide 10 "기본 필터: 기간 = 당월", slide 11 조건 2) */
export function currentMonthRange(today: string): [string, string] {
  const d = new Date(today + 'T00:00:00');
  return [format(startOfMonth(d), 'yyyy-MM-dd'), format(endOfMonth(d), 'yyyy-MM-dd')];
}

/** 기본 필터 — 기간만 당월, 나머지 비움. [초기화] = 이 값 복원 */
export function defaultSearchFilter(today: string): SearchFilter {
  const [from, to] = currentMonthRange(today);
  return { ...EMPTY_SEARCH_FILTER, from, to };
}

export const AMOUNT_RANGE_ERROR = '최소 금액은 최대 금액보다 클 수 없습니다.';

/** 금액 범위 검증(slide 11 No.12 "최소 ≤ 최대") — 양끝이 모두 숫자이고 최소 > 최대면 오류 문구. 한쪽만 있으면 열린 범위 */
export function validateAmountRange(min: string, max: string): string | null {
  const lo = parseAmount(min); const hi = parseAmount(max);
  return lo != null && hi != null && lo > hi ? AMOUNT_RANGE_ERROR : null;
}

export const FX_AMOUNT_RANGE_ERROR = '최소 외화금액은 최대 외화금액보다 클 수 없습니다.';

/** 금액(외화) 범위 검증(slide 11 No.14 "최소 ≤ 최대") — validateAmountRange 와 같은 규칙, 문구만 외화 */
export function validateForeignAmountRange(min: string, max: string): string | null {
  const lo = parseAmount(min); const hi = parseAmount(max);
  return lo != null && hi != null && lo > hi ? FX_AMOUNT_RANGE_ERROR : null;
}

/** 라인 금액 = 차변 또는 대변(한 라인은 한쪽만 값을 갖는다) */
export const lineAmount = (r: Pick<SearchLine, 'debit' | 'credit'>): number | null => r.debit ?? r.credit;

/** 정렬 — 작성일 내림차순, 같은 날은 전표번호·분개번호 오름차순(같은 전표 라인이 붙어 보이게) */
export function sortLines(rows: readonly SearchLine[]): SearchLine[] {
  return [...rows].sort((a, b) => (a.writtenDate !== b.writtenDate ? (a.writtenDate < b.writtenDate ? 1 : -1) : a.journalNo.localeCompare(b.journalNo)));
}

const includesCI = (hay: string, needle: string) => {
  const q = needle.trim().toLowerCase();
  return !q || hay.toLowerCase().includes(q);
};
const eq = (v: string, want: string) => !want || v === want;

/** 금액 범위 — 조건이 걸리면 금액 없는 라인은 제외. 숫자로 못 읽는 입력은 그 끝을 무시 */
function amountPasses(r: SearchLine, min: string, max: string): boolean {
  const lo = parseAmount(min); const hi = parseAmount(max);
  if (lo == null && hi == null) return true;
  const v = lineAmount(r);
  return v != null && (lo == null || v >= lo) && (hi == null || v <= hi);
}

/** 금액(외화) 범위 — 원화 금액(amountPasses)과 같은 규칙: 조건이 걸리면 외화금액 없는(원화) 전표는 제외, 숫자 아닌 끝은 무시.
    단, 원화 금액은 라인 단위(차변/대변)인 반면 외화금액은 전표 단위(journal.foreignAmount)라 한 외화 전표의 라인은 함께 통과·탈락한다 */
function foreignAmountPasses(r: SearchLine, min: string, max: string): boolean {
  const lo = parseAmount(min); const hi = parseAmount(max);
  if (lo == null && hi == null) return true;
  const v = r.journal.foreignAmount;
  return v != null && (lo == null || v >= lo) && (hi == null || v <= hi);
}

/** 사업자등록번호 — 입력·데이터 모두 숫자만 비교(하이픈·공백 무시). 숫자가 없는 입력은 무시, 조건이 걸리면 번호 없는 라인 제외 */
function bizNoPasses(r: SearchLine, q: string): boolean {
  const d = q.replace(/\D/g, '');
  return !d || r.partnerBizNo.replace(/\D/g, '').includes(d);
}

/** 상세필터 — 조건끼리 AND. 결과는 sortLines 순서 */
export function filterLines(rows: readonly SearchLine[], f: SearchFilter): SearchLine[] {
  return sortLines(rows.filter((r) =>
    eq(r.fundAccount, f.fundAccount)
    && (!f.from || r.writtenDate >= f.from)
    && (!f.to || r.writtenDate <= f.to)
    && includesCI(r.writer, f.writer)
    && (includesCI(r.accountName, f.account) || includesCI(r.accountCode, f.account))
    && includesCI(r.partner, f.partner)
    && includesCI(r.memo, f.memo)
    && includesCI(r.slipNo, f.slipNo)
    && eq(r.dept, f.dept)
    && eq(r.slipKind, f.slipKind)
    && eq(r.origin, f.origin)
    && includesCI(r.journal.memo, f.headMemo)
    && amountPasses(r, f.amountMin, f.amountMax)
    && eq(r.journal.currency, f.currency)
    && foreignAmountPasses(r, f.foreignAmountMin, f.foreignAmountMax)
    && eq(r.plDept, f.plDept)
    && eq(r.plEmployee, f.plEmployee)
    && eq(r.journal.evidenceType, f.evidenceType)
    && (!f.evidenceFile.trim() || r.journal.attachments.some((a) => includesCI(a, f.evidenceFile)))
    && includesCI(r.noEvidenceReason, f.noEvidenceReason)
    && bizNoPasses(r, f.partnerBizNo)));
}
