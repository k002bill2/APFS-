/* 회계 > 전표관리 > 미결계정 관리(ACC-005) — 타입·더미 데이터·전표 fixture.
   설계서 정본: ACC-005(목록 15컬럼·상세필터 7개·정리/상계/계좌변경 모달·E09 전표상세).

   데이터 규약
   - 미결 계정과목 = 계정과목 관리(ACC-001) `demoAccounts()` 의 계정성격 '미결' + 입력 Y + 사용 Y.
     채권/채무 구분은 그 계정분류에서 파생한다(자산 = 채권, 부채 = 채무) — 하드코딩 목록 금지.
   - 상대 계정(발생 전표 차/대 상대·정리 예금)은 회계 공용 `acc/account_data.ts` 의 과목을 쓴다(두 원장의 코드 체계가 달라
     미결 코드는 `findAccount` 로 풀리지 않는다 — 분개 행은 이 파일의 `jline` 이 과목명을 직접 싣는다).
   - 정리 이력은 행의 `clearings` 목록이다(부분정리·상계·정리취소가 전표 단위로 맞물리게). 누적정리금액·정리여부·화면 정리 칸은 전부 파생.
   - 숫자 N/A = null, 텍스트 N/A = '-'. 날짜는 고정값(2021~2026) — 기본 발생기간(2022-01-01~) 밖 1건 포함.
   - 거래처는 PARTNERS(가상 명칭), 거래처별 등록 계좌는 `PARTNER_ACCOUNTS`(일부 거래처는 2개 이상). */
import { ACCOUNTS } from '../account_data';
import { demoAccounts } from '../baseinfo/account_code_data';
import { BASE_CURRENCY, FUND_ACCOUNTS, FUND_BANK_ACCOUNTS, PARTNERS, SLIP_KINDS, lineTotals } from './general_journal_data';
import type { ApprovalStatus, FundAccount, JournalLine, JournalOrigin, JournalRow, Partner } from './general_journal_data';

/* ── 미결 계정과목 ── */
export type SuspenseKind = '채권' | '채무';
export interface SuspenseAccount { code: string; name: string; kind: SuspenseKind }

export const SUSPENSE_ACCOUNTS: SuspenseAccount[] = demoAccounts()
  .filter((a) => a.nature === '미결' && a.input === 'Y' && a.use === 'Y' && (a.cls === '자산' || a.cls === '부채'))
  .map((a) => ({ code: a.code, name: a.name, kind: a.cls === '자산' ? '채권' : '채무' }));

export const suspenseAccount = (code: string): SuspenseAccount | undefined => SUSPENSE_ACCOUNTS.find((a) => a.code === code);
/** 채권/채무 — 계정과목 분류에서 파생. 미결 과목이 아니면 undefined */
export const kindOf = (code: string): SuspenseKind | undefined => suspenseAccount(code)?.kind;

/** 정리 계정과목 = 예금(계좌 선택 시 자동) — 회계 공용 계정과목의 '보통예금' */
export const DEPOSIT_ACCOUNT = ACCOUNTS.find((a) => a.name === '보통예금' && a.inputYn === 'Y');

const commonName = (code: string): string => ACCOUNTS.find((a) => a.code === code)?.name ?? '-';

/* ── 거래처 등록 계좌(계좌번호 변경 팝업) — Partner.accountNo 는 1개뿐이라 별도 맵(custNo → 계좌 목록) ── */
export interface PartnerAccount { accountNo: string; holder: string }
const EXTRA_ACCOUNTS: Record<string, string[]> = {
  C000101: ['352-0101-2201-11'],
  C000102: ['352-0102-2201-12', '110-0102-3301-05'],
  C000106: ['352-0106-2201-16'],
};
export const PARTNER_ACCOUNTS: Record<string, PartnerAccount[]> = Object.fromEntries(
  PARTNERS.map((p) => [p.custNo, [p.accountNo, ...(EXTRA_ACCOUNTS[p.custNo] ?? [])].filter((n) => n && n !== '-').map((n) => ({ accountNo: n, holder: p.name }))]),
);

/* ── 행 ── */
/** 정리 이력 1건 = 정리전표(또는 상계전표) 1장. 상계는 짝 2행이 같은 slipNo 를 갖는다 */
export interface Clearing {
  slipNo: string;
  date: string;              // 정리일
  amount: number;            // 이 전표로 정리한 금액
  approval: ApprovalStatus;  // 정리결재상태
  offset: boolean;           // 채권채무상계 전표 여부
}

export interface SuspenseRow {
  id: string;
  fundAccount: FundAccount;      // 계정구분
  custNo: string;                // 거래처 고객번호 — 없으면 '-'
  mgmtNo: string;                // 거래처 관리번호 — 없으면 '-'
  partner: string;               // 거래처명 — 없으면 '-'
  memo: string;                  // 적요(발생)
  accountCode: string;           // 미결 계정코드
  accountName: string;           // 계정과목
  occurDate: string;             // 발생일
  occurAmount: number;           // 발생금액
  occurSlipNo: string;           // 발생전표번호
  occurApproval: ApprovalStatus; // 발생결재상태
  dueDate: string;               // 정리예정일 — 없으면 '-'
  clearings: Clearing[];         // 정리 이력(등록 순)
  bankAccount: string;           // 계좌정보(거래처 계좌) — 채무 건만 의미, 없으면 '-'
  holder: string;                // 예금주 — 없으면 '-'
}

/* ── 전표(JournalRow) 조립 — 전표상세(journal_entry_screen)가 formFromRow 로 전 필드를 읽으므로 기본값을 빠짐없이 채운다 ── */
export interface SlipSpec {
  slipNo: string; slipDate: string; fundAccount: FundAccount; memo: string; partner: string;
  approval: ApprovalStatus; origin: JournalOrigin; writer: string; lines: JournalLine[];
}
export function buildSlip(s: SlipSpec): JournalRow {
  const pl = s.lines.some((l) => l.accountCode.startsWith('4') || l.accountCode.startsWith('5'));
  return {
    id: 'slip-' + s.slipNo,
    fundAccount: s.fundAccount, slipDate: s.slipDate, seq: s.slipNo.split('-')[1] ?? '001',
    memo: s.memo, amount: lineTotals(s.lines).debit, partner: s.partner, approval: s.approval,
    attachments: [], writer: s.writer, origin: s.origin, slipNo: s.slipNo, fundDueDate: '-',
    createdBy: s.writer, updatedBy: s.writer, writtenDate: s.slipDate, slipKind: SLIP_KINDS[0],
    evidenceType: '해당없음', storage: '-', noEvidence: true, currency: BASE_CURRENCY,
    exchangeRate: null, foreignAmount: null,
    plDept: pl ? '경영지원팀' : '-', plEmployee: pl ? s.writer : '-',
    lines: s.lines,
  };
}

/** 분개 행 — 과목명을 직접 싣는다(미결 코드는 공용 ACCOUNTS 로 풀리지 않는다) */
export function jline(code: string, name: string, memo: string, debit: number | null, credit: number | null, p?: { mgmtNo: string; partner: string; accountNo: string }): JournalLine {
  return { accountCode: code, accountName: name, memo, mgmtNo: p?.mgmtNo ?? '-', partner: p?.partner ?? '-', accountNo: p?.accountNo ?? '-', debit, credit };
}

/** 'YYYY-MM-DD' + 순번 → 전표번호 'YYYYMMDD-NNN' */
export const slipNoOf = (date: string, seq: string): string => date.replace(/-/g, '') + '-' + seq;

/* 발생 전표의 상대 계정(미결 과목별) — 채무: 차) 비용 / 대) 미결 · 채권: 차) 미결 / 대) 수익·예금 */
const COUNTER: Record<string, string> = {
  '1110500': '4100300',   // 미수금 ← 조합분배금수익
  '1110600': '4100100',   // 미수수익 ← 이자수익
  '1110700': '1100100',   // 선급금 ← 보통예금
  '2100100': '5100200',   // 미지급금 ← 지급수수료
  '2100200': '5100100',   // 미지급비용 ← 관리보수
};

/* 시드 — [계정구분 idx, 거래처 idx(-1 없음), 미결코드, 적요, 발생일, 발생금액, 발생결재, 정리예정일, 정리이력[정리일, 금액, 결재, 상계키?]]
   상계키가 같은 두 행은 상계전표 1장을 공유한다. */
type ClearSeed = [date: string, amount: number, approval: ApprovalStatus, offsetKey?: string];
type Seed = [fa: number, p: number, code: string, memo: string, date: string, amount: number, ap: ApprovalStatus, due: string, clears: ClearSeed[]];
const SEEDS: Seed[] = [
  /* 승인·미정리 채무(같은 계정구분·과목, 거래처 상이) — 다건 정리 */
  [0, 5, '2100100', '회계감사 수수료 미지급', '2026-09-15', 3300000, '승인', '2026-10-31', []],
  [0, 6, '2100100', '용역대금 미지급', '2026-09-20', 22000000, '승인', '2026-11-15', []],
  [0, 8, '2100100', '자문료 미지급', '2026-10-02', 1450500, '승인', '2026-11-10', []],
  /* 부분정리(채무) — 잔액 7,500,000 */
  [0, 0, '2100100', '조합 관리보수 미지급', '2026-08-11', 12500000, '승인', '2026-10-31', [['2026-09-10', 5000000, '승인']]],
  /* 상계 가능 쌍 — 거래처·계정구분·잔액 동일 채권 + 채무 */
  [1, 1, '1110500', '출자 반환금 미수', '2026-07-14', 8000000, '승인', '2026-10-30', []],
  [1, 1, '2100100', '수산물 구매대금 미지급', '2026-07-20', 8000000, '승인', '2026-10-30', []],
  /* 이미 상계된 쌍 — 같은 정리전표번호 */
  [0, 4, '1110500', '종자 판매대금 미수', '2025-11-03', 4200000, '승인', '2025-12-31', [['2025-12-01', 4200000, '승인', 'OFS-1']]],
  [0, 4, '2100100', '방제 용역비 미지급', '2025-11-10', 4200000, '승인', '2025-12-31', [['2025-12-01', 4200000, '승인', 'OFS-1']]],
  /* 정리완료 */
  [0, 7, '1110600', '정기예금 이자 미수', '2026-06-30', 845000, '승인', '2026-07-15', [['2026-07-15', 845000, '승인']]],
  [2, 2, '1110700', '용역 선급금 지급', '2026-05-12', 15000000, '승인', '2026-08-31', [['2026-08-20', 15000000, '미상신']]],
  [2, 1, '2100100', '수산 조합 출자 미지급', '2023-04-25', 50000000, '승인', '2023-05-10', [['2023-05-10', 50000000, '승인']]],
  [0, 7, '1110500', '조합 분배금 미수', '2022-08-16', 128000000, '승인', '2022-09-30', [['2022-09-30', 128000000, '승인']]],
  /* 계정구분·과목 다른 미정리 */
  [2, 3, '2100200', '결산 미지급비용 계상', '2025-12-31', 4300000, '승인', '2026-01-31', []],
  [1, 5, '2100200', '분기 감사비용 미지급', '2026-09-30', 1650000, '승인', '2026-10-31', []],
  [2, -1, '1110600', '예치금 이자 미수', '2026-09-30', 312000, '승인', '-', []],
  /* 부분정리 2회(채권) — 잔액 15,000,000 */
  [1, 0, '1110700', '시설 선급금 지급', '2024-03-18', 30000000, '승인', '2025-03-31', [['2024-06-30', 10000000, '승인'], ['2025-01-15', 5000000, '승인']]],
  /* 미승인(미상신·상신·반려) */
  [0, 9, '2100100', '자문위원 수당 미지급', '2026-10-10', 900000, '미상신', '2026-10-31', []],
  [0, 2, '2100100', '사무용품 대금 미지급', '2026-10-05', 264000, '상신', '2026-10-31', []],
  [1, 6, '1110500', '판매대금 미수', '2026-09-01', 6400000, '반려', '2026-10-15', []],
  /* 기본 발생기간(2022-01-01~) 밖 */
  [0, 3, '2100100', '영농조합 위탁수수료 미지급', '2021-12-20', 2000000, '승인', '2022-01-31', []],
];

const WRITERS = ['김민준', '이서연', '박지훈', '최유나'] as const;

/** 데모 원장 — 행 + 전표 fixture(전표번호 → JournalRow: 발생전표·정리전표·상계전표 전부). 호출마다 새 객체 */
export function demoSuspense(): { rows: SuspenseRow[]; slips: Record<string, JournalRow> } {
  const slips: Record<string, JournalRow> = {};
  const seqByDate: Record<string, number> = {};
  const newSlipNo = (date: string) => slipNoOf(date, String((seqByDate[date] = (seqByDate[date] ?? 0) + 1)).padStart(3, '0'));
  const offsetSlip: Record<string, string> = {};   // 상계키 → 전표번호
  const rows: SuspenseRow[] = SEEDS.map(([fa, pi, code, memo, date, amount, ap, due, clears], i) => {
    const p: Partner | undefined = pi >= 0 ? PARTNERS[pi] : undefined;
    const acc = suspenseAccount(code);
    if (!acc) throw new Error('미결 계정과목 없음: ' + code);
    const fundAccount = FUND_ACCOUNTS[fa];
    const writer = WRITERS[i % WRITERS.length];
    const pp = p ? { mgmtNo: p.mgmtNo, partner: p.name, accountNo: p.accountNo } : undefined;
    const counterCode = COUNTER[code];
    const occurSlipNo = newSlipNo(date);
    const occurLines = acc.kind === '채무'
      ? [jline(counterCode, commonName(counterCode), memo, amount, null), jline(code, acc.name, memo, null, amount, pp)]
      : [jline(code, acc.name, memo, amount, null, pp), jline(counterCode, commonName(counterCode), memo, null, amount)];
    slips[occurSlipNo] = buildSlip({ slipNo: occurSlipNo, slipDate: date, fundAccount, memo, partner: p?.name ?? '-', approval: ap, origin: '일반', writer, lines: occurLines });

    const bank = FUND_BANK_ACCOUNTS[fundAccount][0];
    const clearings: Clearing[] = clears.map(([cd, camt, cap, key]) => {
      if (key && offsetSlip[key]) return { slipNo: offsetSlip[key], date: cd, amount: camt, approval: cap, offset: true };
      const no = newSlipNo(cd);
      if (key) {
        offsetSlip[key] = no;
        /* 상계전표 — 짝(다음 시드)의 채무 과목을 차변, 채권 과목을 대변. 시드 쌍은 채권이 먼저 온다 */
        const debt = SEEDS[i + 1];
        const debtAcc = suspenseAccount(debt[2]);
        slips[no] = buildSlip({ slipNo: no, slipDate: cd, fundAccount, memo: '채권채무 상계', partner: p?.name ?? '-', approval: cap, origin: '미결', writer,
          lines: [jline(debt[2], debtAcc?.name ?? '-', '채권채무 상계', camt, null, pp), jline(code, acc.name, '채권채무 상계', null, camt, pp)] });
        return { slipNo: no, date: cd, amount: camt, approval: cap, offset: true };
      }
      const cm = memo + ' 정리';
      const dep = DEPOSIT_ACCOUNT ? [DEPOSIT_ACCOUNT.code, DEPOSIT_ACCOUNT.name] as const : ['-', '-'] as const;
      const bankLine = { mgmtNo: '-', partner: '-', accountNo: bank };
      const lines = acc.kind === '채무'
        ? [jline(code, acc.name, cm, camt, null, pp), jline(dep[0], dep[1], cm, null, camt, bankLine)]
        : [jline(dep[0], dep[1], cm, camt, null, bankLine), jline(code, acc.name, cm, null, camt, pp)];
      slips[no] = buildSlip({ slipNo: no, slipDate: cd, fundAccount, memo: cm, partner: p?.name ?? '-', approval: cap, origin: '미결', writer, lines });
      return { slipNo: no, date: cd, amount: camt, approval: cap, offset: false };
    });

    const debt = acc.kind === '채무' && p;
    return {
      id: 'su-' + String(i + 1).padStart(3, '0'),
      fundAccount, custNo: p?.custNo ?? '-', mgmtNo: p?.mgmtNo ?? '-', partner: p?.name ?? '-',
      memo, accountCode: code, accountName: acc.name,
      occurDate: date, occurAmount: amount, occurSlipNo, occurApproval: ap, dueDate: due,
      clearings,
      bankAccount: debt ? p.accountNo : '-', holder: debt ? p.name : '-',
    };
  });
  return { rows, slips };
}
