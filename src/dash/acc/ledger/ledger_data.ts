/* 회계 > 장부조회(ACC-009~014) 공용 더미 원장 — 전표(slip) 단위 정본 + 분개 라인 평탄화 + 결산서 계정 계층.
   6화면(일/월계표·계정별보조부·총계정원장·재무상태표·손익계산서·합계잔액시산표)의 모든 숫자는 이 데이터에서 파생한다
   (ledger_model.ts). 화면이 숫자를 하드코딩하지 않는다.

   데이터 규약
   - 정본 = 전표(LedgerSlip). 분개 라인(LedgerLine)은 전표를 펼친 것이고 분개번호 = 전표 안 행 순번(1부터).
     전표마다 차변 합 = 대변 합(테스트로 보증) → 어떤 필터 조합으로 전표를 빼도 시산표 대차·회계 등식이 유지된다.
   - 미결재(결재 ≠ 승인)·결산전표(전표발생구분 '결산')는 **전표 단위** 플래그다 — 라인 단위로 섞지 않는다.
   - 결산전표 = 연말 수정분개(미지급비용·미수수익 계상, 외화환산손실). 손익을 이익잉여금으로 대체하는 마감분개는 **넣지 않는다**
     — 이익잉여금(전기이월·당기순이익)은 ledger_model 이 손익 계정에서 파생한다(마감분개를 넣으면 이중 계상).
   - 계정과목·계층(레벨·상위·차대)은 계정과목 관리(ACC-001) `demoAccounts()` 를 그대로 쓴다(새 계정 체계 금지).
     결산서에만 있는 행(Ⅲ. 이익잉여금·전기이월이익잉여금·당기순이익, 손익계산서 Ⅲ. 영업이익·Ⅳ. 당기순이익)만 계층 메타로 덧붙인다.
   - 계정구분 = 일반전표 FUND_ACCOUNTS. 거래처 = PARTNERS(가상 명칭). 작성자 = PL_EMPLOYEES(가상 인물).
   - 기간: 2025-01(제1기 — 조합 결성) ~ 2026-10 고정 일자 + 일계표 기본값(기준일 = 오늘)용으로 오늘·어제 날짜 전표 몇 건
     (`demoLedger(today)` — 테스트는 고정 today 주입).
   - 금액 0 은 0(숫자), 텍스트 N/A 는 '-'. */
import { format, subDays } from 'date-fns';
import { demoAccounts } from '../baseinfo/account_code_data';
import type { AccountClass, DcType, AccountRow } from '../baseinfo/account_code_data';
import { FUND_ACCOUNTS, FUND_BANK_ACCOUNTS, PARTNERS, PL_EMPLOYEES } from '../slip/general_journal_data';
import type { ApprovalStatus, FundAccount, JournalOrigin } from '../slip/general_journal_data';

/* ══════════════════════════════════════════════════════════════
   계정 계층 — 결산서·시산표 공용
══════════════════════════════════════════════════════════════ */
/** 첫 회기 연도(조합 결성) — 제N기 = 연도 − FISCAL_FIRST_YEAR + 1. 회기 = 역년(결산월 12월) */
export const FISCAL_FIRST_YEAR = 2025;

export interface LedgerAccount {
  code: string;
  name: string;            // 계정과목명(원장 표기)
  label: string;           // 결산서 표시명 — 레벨2 'Ⅰ. 유동자산', 레벨3 집계 '(1) 당좌자산', 입력계정은 name 그대로
  cls: AccountClass;
  dc: DcType;              // 정상잔액 방향(차변 계정 = 차−대, 대변 계정 = 대−차)
  level: number;
  parent: string | null;
  input: boolean;          // 입력계정(전표 입력 가능) — 원장·보조부·시산표 합계의 대상
  derived?: boolean;       // 결산서 전용 파생 행(이익잉여금 계열) — 전표에 쓰이지 않는다
}

const ROMAN = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ'];
/** 'I. 유동자산' / 'II. 비유동자산' → 'Ⅰ. 유동자산' (ACC-001 은 ASCII 로마숫자, 결산서는 Ⅰ 문자) */
const romanLabel = (name: string) => name.replace(/^(I{1,3}|IV|V|VI{0,3}|IX|X)\.\s*/, (_m, r: string) => {
  const n = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'].indexOf(r);
  return (ROMAN[n] ?? r) + '. ';
});

/* 결산서 전용 파생 행 — 자본 아래 이익잉여금(손익에서 파생). 코드는 ACC-001 에 없는 자리(35xxxxx)를 쓴다 */
export const RETAINED_GROUP = '3500000';
export const RETAINED_PRIOR = '3500100';   // 전기이월이익잉여금 = 당기 회기 시작 전 손익 누계
export const NET_INCOME_BS = '3500200';    // 당기순이익(재무상태표) = 당기 회기 시작 ~ 기준일 손익
/* 손익계산서 계산 행 코드(설계서 샘플 표기 4299999·4999999 를 따른다) */
export const OPERATING_INCOME = '4299999';
export const NET_INCOME_IS = '4999999';

function buildAccounts(rows: readonly AccountRow[]): LedgerAccount[] {
  const base: LedgerAccount[] = rows.map((a) => ({
    code: a.code, name: a.name, label: a.level === 2 ? romanLabel(a.name) : a.name,
    cls: a.cls, dc: a.dc, level: a.level, parent: a.parent, input: a.input === 'Y',
  }));
  /* 레벨2 아래 집계계정(입력 N) = '(n) 이름' — 같은 상위 안 집계계정 순번 */
  const seq: Record<string, number> = {};
  for (const a of base) {
    if (a.level >= 3 && !a.input && a.parent) {
      seq[a.parent] = (seq[a.parent] ?? 0) + 1;
      a.label = `(${String(seq[a.parent])}) ${a.name}`;
    }
  }
  const lastL2 = base.filter((a) => a.parent === '3000000').length;
  base.push(
    { code: RETAINED_GROUP, name: '이익잉여금', label: `${ROMAN[lastL2] ?? 'Ⅲ'}. 이익잉여금`, cls: '자본', dc: '대변', level: 2, parent: '3000000', input: false, derived: true },
    { code: RETAINED_PRIOR, name: '전기이월이익잉여금', label: '전기이월이익잉여금', cls: '자본', dc: '대변', level: 3, parent: RETAINED_GROUP, input: false, derived: true },
    { code: NET_INCOME_BS, name: '당기순이익', label: '당기순이익', cls: '자본', dc: '대변', level: 3, parent: RETAINED_GROUP, input: false, derived: true },
  );
  return base.sort((a, b) => a.code.localeCompare(b.code));
}

/** 장부조회 계정 원장(코드 오름차순) — ACC-001 계정과목 + 결산서 파생 행 */
export const LEDGER_ACCOUNTS: readonly LedgerAccount[] = buildAccounts(demoAccounts());
const BY_CODE = new Map(LEDGER_ACCOUNTS.map((a) => [a.code, a]));
export const accountOf = (code: string): LedgerAccount | undefined => BY_CODE.get(code);
export const childrenOf = (code: string | null): LedgerAccount[] => LEDGER_ACCOUNTS.filter((a) => a.parent === code);
/** 입력계정(원장·보조부·시산표 대상) — 파생 행 제외 */
export const INPUT_ACCOUNTS: readonly LedgerAccount[] = LEDGER_ACCOUNTS.filter((a) => a.input);
/** 손익 계정 여부 — 회기마다 0 에서 다시 시작(기초 = 회기 시작 ~ 조회 시작 전) */
export const isPL = (code: string): boolean => accountOf(code)?.cls === '손익';

/* ══════════════════════════════════════════════════════════════
   전표 · 분개 라인
══════════════════════════════════════════════════════════════ */
/** 전표구분(계정별 상세내역 '전표구분' 컬럼) — 현금 계정이 차변에만 = 입금, 대변에만 = 출금, 그 외 대체 */
export type SlipType = '입금' | '출금' | '대체';

export interface SlipLine {
  accountCode: string;
  memo: string;
  partner: string;      // 거래처명 — 없으면 '-'
  mgmtNo: string;       // 거래처 관리번호 — 없으면 '-'
  accountNo: string;    // 계좌번호 — 없으면 '-'
  debit: number;
  credit: number;
}

export interface LedgerSlip {
  slipNo: string;        // 'YYYYMMDD-NNN'
  slipDate: string;      // 전표일
  seq: string;           // 순번(전표일 안 일련 — 'NNN')
  fundAccount: FundAccount;
  approval: ApprovalStatus;
  origin: JournalOrigin;
  closing: boolean;      // 결산전표(= origin '결산')
  slipType: SlipType;
  writer: string;        // 작성자
  memo: string;          // 대표 적요
  partner: string;       // 대표 거래처 — 없으면 '-'
  plDept: string;        // 손익부서 — 손익 계정 전표만, 없으면 '-'
  plEmployee: string;    // 손익사원 — 없으면 '-'
  createdBy: string;     // 최초등록자
  updatedBy: string;     // 최종수정자
  lines: SlipLine[];
}

/** 분개 라인 — 원장·보조부·결산서의 집계 단위. 전표 헤더 필드를 함께 싣는다(그리드 한 행 = 라인 한 개) */
export interface LedgerLine {
  id: string;            // `${slipNo}#${lineNo}`
  slipNo: string;
  lineNo: number;        // 분개번호
  seq: string;           // 순번
  slipDate: string;
  fundAccount: FundAccount;
  approval: ApprovalStatus;
  origin: JournalOrigin;
  closing: boolean;
  slipType: SlipType;
  writer: string;
  memo: string;
  accountCode: string;
  accountName: string;
  partner: string;
  mgmtNo: string;
  accountNo: string;
  debit: number;
  credit: number;
  plDept: string;
  plEmployee: string;
  createdBy: string;
  updatedBy: string;
}

/** 원장 묶음 — 페이지가 useMemo 로 한 번 만들어 팝업(AccountDetailModal)·전표상세 어댑터에 넘긴다 */
export interface LedgerSource { slips: LedgerSlip[]; lines: LedgerLine[]; bySlipNo: Map<string, LedgerSlip> }

/* ── 시드 헬퍼 ── */
const A = {
  cash: '1110100', deposit: '1110200', timeDeposit: '1110300', receivable: '1110500', accrued: '1110600', advance: '1110700',
  fundInvest: '1210100', ltSecurities: '1210200', equipment: '1220100',
  payable: '2100100', accruedExp: '2100200', withholding: '2100300',
  capital: '3100300',
  mgmtFeeIncome: '4100100', interest: '4100200',
  salary: '4200100', commission: '4200200', fxLoss: '4200300',
} as const;

const bankNo = (fa: FundAccount) => (FUND_BANK_ACCOUNTS[fa][0] ?? '-').split(' ').pop() ?? '-';
const FA_SCALE: Record<FundAccount, number> = { '농림수산식품모태펀드(기금)': 1, '농식품 투자조합 계정': 0.4, '수산 모태계정': 0.25 };
const round1000 = (n: number) => Math.round(n / 1000) * 1000;

type P = typeof PARTNERS[number] | undefined;
interface SeedLine { code: string; dr?: number; cr?: number; p?: P }
interface Seed {
  date: string; fa: FundAccount; memo: string; writer: string; lines: SeedLine[];
  approval?: ApprovalStatus; origin?: JournalOrigin; p?: P;
}

const W = PL_EMPLOYEES;   // ['김민준', '이서연', '박지훈', '최유나']
const [FA_FUND, FA_COOP, FA_SEA] = FUND_ACCOUNTS;
const PT = PARTNERS;

const ymd = (y: number, m: number, d: number) => `${String(y)}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate();

/** 고정 일자 시드 — 2025-01 ~ 2026-10 */
function fixedSeeds(): Seed[] {
  const s: Seed[] = [];
  /* ① 개시 — 조합 결성 출자금 납입(계정구분별) */
  const capital: [FundAccount, number, P][] = [[FA_FUND, 30_000_000_000, PT[7]], [FA_COOP, 8_000_000_000, PT[7]], [FA_SEA, 5_000_000_000, PT[1]]];
  for (const [fa, amt, p] of capital) {
    s.push({ date: '2025-01-02', fa, memo: '결성 출자금 납입', writer: W[0], p,
      lines: [{ code: A.deposit, dr: amt }, { code: A.capital, cr: amt, p }] });
  }
  /* ② 월 반복(2025-01 ~ 2026-10) — 이자수익·급여(원천세 예수)·원천세 납부 */
  for (let y = 2025; y <= 2026; y++) {
    const lastM = y === 2026 ? 10 : 12;
    for (let m = 1; m <= lastM; m++) {
      FUND_ACCOUNTS.forEach((fa, fi) => {
        const k = FA_SCALE[fa];
        const interest = round1000(18_500_000 * k * (1 + ((m + fi) % 5) / 10));
        s.push({ date: ymd(y, m, lastDay(y, m)), fa, memo: `${String(m)}월 예금 이자 수령`, writer: W[(m + fi) % 4],
          lines: [{ code: A.deposit, dr: interest }, { code: A.interest, cr: interest }] });
        const gross = round1000(12_000_000 * k * (y === 2026 ? 1.05 : 1));
        const tax = round1000(gross * 0.1);
        s.push({ date: ymd(y, m, 25), fa, memo: `${String(m)}월 급여 지급`, writer: W[(m + fi + 1) % 4],
          lines: [{ code: A.salary, dr: gross }, { code: A.deposit, cr: gross - tax }, { code: A.withholding, cr: tax }] });
        if (!(y === 2025 && m === 1)) {
          const pm = m === 1 ? 12 : m - 1;
          const ptax = round1000(round1000(12_000_000 * k * (y === 2026 && m > 1 ? 1.05 : 1)) * 0.1);
          s.push({ date: ymd(y, m, 10), fa, memo: `${String(pm)}월 원천세 납부`, writer: W[(m + fi + 2) % 4],
            lines: [{ code: A.withholding, dr: ptax }, { code: A.deposit, cr: ptax }] });
        }
      });
    }
  }
  /* ③ 분기 — 투자조합 관리보수(미수 → 회수) · 회계감사 수수료(미지급 → 지급) */
  for (const [y, q] of [[2025, 1], [2025, 2], [2025, 3], [2025, 4], [2026, 1], [2026, 2], [2026, 3]] as const) {
    const m = q * 3;
    FUND_ACCOUNTS.forEach((fa, fi) => {
      const k = FA_SCALE[fa];
      const fee = round1000(42_000_000 * k);
      const p = PT[7 - (fi % 2)];
      s.push({ date: ymd(y, m, 20), fa, memo: `${String(q)}분기 관리보수 청구`, writer: W[fi], p,
        lines: [{ code: A.receivable, dr: fee, p }, { code: A.mgmtFeeIncome, cr: fee, p }] });
      const nm = m === 12 ? 1 : m + 1, ny = m === 12 ? y + 1 : y;
      if (ny < 2026 || (ny === 2026 && nm <= 10)) {
        s.push({ date: ymd(ny, nm, 15), fa, memo: `${String(q)}분기 관리보수 회수`, writer: W[(fi + 1) % 4], p,
          lines: [{ code: A.deposit, dr: fee }, { code: A.receivable, cr: fee, p }] });
      }
      const audit = round1000(6_600_000 * k);
      s.push({ date: ymd(y, m, 28), fa, memo: `${String(q)}분기 회계감사 수수료`, writer: W[(fi + 2) % 4], p: PT[5],
        lines: [{ code: A.commission, dr: audit }, { code: A.payable, cr: audit, p: PT[5] }] });
      if (ny < 2026 || (ny === 2026 && nm <= 10)) {
        s.push({ date: ymd(ny, nm, 5), fa, memo: `${String(q)}분기 감사 수수료 지급`, writer: W[(fi + 3) % 4], p: PT[5],
          lines: [{ code: A.payable, dr: audit, p: PT[5] }, { code: A.deposit, cr: audit }] });
      }
    });
  }
  /* ④ 출자 이행 · 분배(투자 원금 회수) · 정기예금 · 비품 · 현금 */
  const invest: [string, FundAccount, number, P][] = [
    ['2025-03-14', FA_FUND, 3_500_000_000, PT[0]], ['2025-05-22', FA_FUND, 2_800_000_000, PT[2]], ['2025-08-19', FA_COOP, 1_200_000_000, PT[3]],
    ['2025-11-06', FA_SEA, 900_000_000, PT[1]], ['2026-02-17', FA_FUND, 4_100_000_000, PT[4]], ['2026-06-09', FA_COOP, 1_500_000_000, PT[0]],
    ['2026-09-24', FA_SEA, 700_000_000, PT[1]],
  ];
  invest.forEach(([date, fa, amt, p], i) => s.push({ date, fa, memo: `${p?.name ?? ''} 출자 이행`, writer: W[i % 4], p,
    lines: [{ code: A.fundInvest, dr: amt, p }, { code: A.deposit, cr: amt }] }));
  s.push({ date: '2026-07-30', fa: FA_FUND, memo: '조합 원금 분배 수령', writer: W[1], p: PT[0],
    lines: [{ code: A.deposit, dr: 600_000_000 }, { code: A.fundInvest, cr: 600_000_000, p: PT[0] }] });
  s.push({ date: '2025-04-01', fa: FA_FUND, memo: '정기예금 신규 예치', writer: W[2],
    lines: [{ code: A.timeDeposit, dr: 5_000_000_000 }, { code: A.deposit, cr: 5_000_000_000 }] });
  s.push({ date: '2026-04-01', fa: FA_FUND, memo: '정기예금 만기 해지', writer: W[2],
    lines: [{ code: A.deposit, dr: 5_000_000_000 }, { code: A.timeDeposit, cr: 5_000_000_000 }] });
  s.push({ date: '2025-06-12', fa: FA_COOP, memo: '장기투자증권 매입', writer: W[3],
    lines: [{ code: A.ltSecurities, dr: 650_000_000 }, { code: A.deposit, cr: 650_000_000 }] });
  s.push({ date: '2025-02-11', fa: FA_FUND, memo: '사무용 비품 취득', writer: W[0], p: PT[6],
    lines: [{ code: A.equipment, dr: 13_200_000, p: PT[6] }, { code: A.payable, cr: 13_200_000, p: PT[6] }] });
  s.push({ date: '2025-03-10', fa: FA_FUND, memo: '비품 대금 지급', writer: W[0], p: PT[6],
    lines: [{ code: A.payable, dr: 13_200_000, p: PT[6] }, { code: A.deposit, cr: 13_200_000 }] });
  s.push({ date: '2025-01-06', fa: FA_FUND, memo: '소액 현금 인출', writer: W[3],
    lines: [{ code: A.cash, dr: 3_000_000 }, { code: A.deposit, cr: 3_000_000 }] });
  s.push({ date: '2025-09-03', fa: FA_FUND, memo: '경조사비 현금 지급', writer: W[1],
    lines: [{ code: A.commission, dr: 300_000 }, { code: A.cash, cr: 300_000 }] });
  s.push({ date: '2026-05-08', fa: FA_FUND, memo: '선급금 지급(용역)', writer: W[2], p: PT[6],
    lines: [{ code: A.advance, dr: 22_000_000, p: PT[6] }, { code: A.deposit, cr: 22_000_000 }] });
  /* ⑤ 결산전표(2025-12-31) — 연말 수정분개. 손익 마감분개는 없다(이익잉여금은 파생) */
  FUND_ACCOUNTS.forEach((fa, fi) => {
    const k = FA_SCALE[fa];
    const accr = round1000(9_800_000 * k);
    s.push({ date: '2025-12-31', fa, memo: '결산 미지급비용 계상', writer: W[3], origin: '결산', p: PT[5],
      lines: [{ code: A.commission, dr: accr }, { code: A.accruedExp, cr: accr, p: PT[5] }] });
    const inc = round1000(7_250_000 * k);
    s.push({ date: '2025-12-31', fa, memo: '결산 미수수익 계상', writer: W[3], origin: '결산',
      lines: [{ code: A.accrued, dr: inc }, { code: A.interest, cr: inc }] });
    if (fi === 1) {
      s.push({ date: '2025-12-31', fa, memo: '결산 외화증권 환산', writer: W[3], origin: '결산',
        lines: [{ code: A.fxLoss, dr: 18_400_000 }, { code: A.ltSecurities, cr: 18_400_000 }] });
    }
  });
  /* ⑥ 미결재(미상신·상신·반려) — 기본 조회(미결재포함 = 부)에서 빠진다 */
  s.push({ date: '2026-10-27', fa: FA_FUND, memo: '자문위원 수당 지급', writer: W[1], approval: '미상신', p: PT[9],
    lines: [{ code: A.commission, dr: 900_000, p: PT[9] }, { code: A.deposit, cr: 900_000 }] });
  s.push({ date: '2026-10-28', fa: FA_COOP, memo: '수산 조합 출자 이행(예정)', writer: W[2], approval: '상신', p: PT[1],
    lines: [{ code: A.fundInvest, dr: 400_000_000, p: PT[1] }, { code: A.deposit, cr: 400_000_000 }] });
  s.push({ date: '2026-10-29', fa: FA_SEA, memo: '사무용품 구입', writer: W[3], approval: '반려', p: PT[2],
    lines: [{ code: A.commission, dr: 264_000, p: PT[2] }, { code: A.payable, cr: 264_000, p: PT[2] }] });
  return s;
}

/** 오늘·어제 날짜 전표 — 일계표(기준일 기본 = 오늘)가 빈 화면으로 시작하지 않게 */
function recentSeeds(today: string): Seed[] {
  const base = new Date(today + 'T00:00:00');
  const d0 = today, d1 = format(subDays(base, 1), 'yyyy-MM-dd');
  return [
    { date: d1, fa: FA_FUND, memo: '조합 관리보수 회수', writer: W[0], p: PT[7],
      lines: [{ code: A.deposit, dr: 12_600_000 }, { code: A.mgmtFeeIncome, cr: 12_600_000, p: PT[7] }] },
    { date: d1, fa: FA_COOP, memo: '법률 자문 수수료', writer: W[1], p: PT[5],
      lines: [{ code: A.commission, dr: 1_650_000, p: PT[5] }, { code: A.deposit, cr: 1_650_000 }] },
    { date: d0, fa: FA_FUND, memo: '소액 현금 보충', writer: W[2],
      lines: [{ code: A.cash, dr: 500_000 }, { code: A.deposit, cr: 500_000 }] },
    { date: d0, fa: FA_FUND, memo: '회의비 현금 지급', writer: W[2],
      lines: [{ code: A.commission, dr: 180_000 }, { code: A.cash, cr: 180_000 }] },
    { date: d0, fa: FA_SEA, memo: '예금 이자 수령', writer: W[3],
      lines: [{ code: A.deposit, dr: 2_340_000 }, { code: A.interest, cr: 2_340_000 }] },
    { date: d0, fa: FA_COOP, memo: '자문료 지급(결재 대기)', writer: W[1], approval: '상신', p: PT[8],
      lines: [{ code: A.commission, dr: 800_000, p: PT[8] }, { code: A.deposit, cr: 800_000 }] },
  ];
}

function slipTypeOf(lines: readonly SlipLine[]): SlipType {
  const cash = lines.filter((l) => l.accountCode === A.cash);
  if (!cash.length) return '대체';
  if (cash.every((l) => l.debit > 0)) return '입금';
  if (cash.every((l) => l.credit > 0)) return '출금';
  return '대체';
}

function toSlips(seeds: Seed[]): LedgerSlip[] {
  const sorted = seeds.map((s, i) => ({ s, i })).sort((a, b) => a.s.date.localeCompare(b.s.date) || a.i - b.i);
  const seqByDate: Record<string, number> = {};
  return sorted.map(({ s }, i) => {
    const n = (seqByDate[s.date] = (seqByDate[s.date] ?? 0) + 1);
    const seq = String(n).padStart(3, '0');
    const lines: SlipLine[] = s.lines.map((l) => ({
      accountCode: l.code, memo: s.memo,
      partner: l.p?.name ?? '-', mgmtNo: l.p?.mgmtNo ?? '-',
      accountNo: l.code === A.deposit || l.code === A.timeDeposit ? bankNo(s.fa) : l.p?.accountNo ?? '-',
      debit: l.dr ?? 0, credit: l.cr ?? 0,
    }));
    const pl = lines.some((l) => isPL(l.accountCode));
    const origin = s.origin ?? '일반';
    return {
      slipNo: s.date.replace(/-/g, '') + '-' + seq, slipDate: s.date, seq,
      fundAccount: s.fa, approval: s.approval ?? '승인', origin, closing: origin === '결산',
      slipType: slipTypeOf(lines), writer: s.writer, memo: s.memo, partner: s.p?.name ?? '-',
      plDept: pl ? '경영지원팀' : '-', plEmployee: pl ? s.writer : '-',
      createdBy: s.writer, updatedBy: i % 5 === 0 ? W[(W.indexOf(s.writer as typeof W[number]) + 1) % 4] : s.writer,
      lines,
    };
  });
}

/** 전표 → 분개 라인(분개번호 = 행 순번) */
export function flattenSlips(slips: readonly LedgerSlip[]): LedgerLine[] {
  return slips.flatMap((s) => s.lines.map((l, li) => ({
    id: `${s.slipNo}#${String(li + 1)}`, slipNo: s.slipNo, lineNo: li + 1, seq: s.seq, slipDate: s.slipDate,
    fundAccount: s.fundAccount, approval: s.approval, origin: s.origin, closing: s.closing, slipType: s.slipType,
    writer: s.writer, memo: l.memo, accountCode: l.accountCode, accountName: accountOf(l.accountCode)?.name ?? '-',
    partner: l.partner, mgmtNo: l.mgmtNo, accountNo: l.accountNo, debit: l.debit, credit: l.credit,
    plDept: s.plDept, plEmployee: s.plEmployee, createdBy: s.createdBy, updatedBy: s.updatedBy,
  })));
}

export const todayStr = (): string => format(new Date(), 'yyyy-MM-dd');   // 로컬 달력일(toISOString 금지 — KST 하루 밀림)

/** 데모 원장 — 호출마다 새 객체. `today`(YYYY-MM-DD) 는 오늘·어제 전표의 기준(테스트는 고정값 주입) */
export function demoLedger(today: string = todayStr()): LedgerSource {
  const slips = toSlips([...fixedSeeds(), ...recentSeeds(today)]);
  return { slips, lines: flattenSlips(slips), bySlipNo: new Map(slips.map((s) => [s.slipNo, s])) };
}
