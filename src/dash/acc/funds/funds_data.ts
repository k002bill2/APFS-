/* 자금관리 공용 더미 마스터 — 계좌(ACC-019 계좌관리)·계좌 입출금(ACC-020 계좌잔액 · ACC-021 자금일보)이 함께 쓴다.
   출처: 화면설계서 ACC-019 계좌관리 · ACC-020 계좌잔액 · ACC-021 자금일보(2026.10.26 v1.0).
   결정·가정
   - 계좌번호는 실제 형태 그대로 둔다(데이터 마스크 없음 — 프로젝트 규칙 no_demo_mask).
   - 값은 시드 PRNG(mulberry32)로 만든다 — Math.random 금지(새로고침·테스트마다 같은 값).
   - 거래는 2023-01-01 ~ DEMO_TODAY(2026-11-05) 범위. 개설일이 그 이전이면 개설일에 최초 입금 1건만 남긴다.
   - 만기 계좌(정기예금 등)는 만기일에 잔액 전액 인출 후 거래가 끊긴다. 미사용 계좌는 비활성 시점 이후 거래가 없다. */
import { ACCOUNTS } from '../account_data';
import { PARTNERS } from '../slip/general_journal_data';

/** 데모 기준일 — 거래 생성 상한 · 만기 판정 기본값 */
export const DEMO_TODAY = '2026-11-05';

/* ── 계정구분(설계서 표기 순서) — 농안기금은 자금일보에서 2024년까지만 노출(계좌·거래는 유지) ── */
export const FUNDS_ACCOUNT_TYPES = ['농식품투자계정(농특기금)', '농식품투자계정(농안기금)', '수산투자계정', '농식품모태펀드(비용정산)'] as const;
export type FundsAccountType = typeof FUNDS_ACCOUNT_TYPES[number];

/* ── 금융기관 · 지점 ── */
export const BANKS = ['NH농협은행', '신한은행', 'KB국민은행', '우리은행', '하나은행', 'IBK기업은행', 'KDB산업은행', '한국은행'] as const;
export type Bank = typeof BANKS[number];
export const BANK_BRANCHES: Record<Bank, string[]> = {
  NH농협은행: ['본점영업부', '서초지점', '세종청사지점', '나주혁신도시지점'],
  신한은행: ['본점영업부', '강남중앙지점', '여의도지점'],
  KB국민은행: ['본점영업부', '역삼지점', '세종지점'],
  우리은행: ['본점영업부', '삼성동지점', '광화문지점'],
  하나은행: ['본점영업부', '테헤란로지점', '을지로지점'],
  IBK기업은행: ['본점영업부', '선릉역지점', '대전중앙지점'],
  KDB산업은행: ['본점영업부', '여의도지점'],
  한국은행: ['본부', '세종본부'],
};

/* ── 계정과목(계좌번호 필수 예금 계정) — account_data 에 있는 과목은 코드를 같이 둔다 ── */
export interface DepositKind { name: string; code: string | null; }
const codeOf = (name: string): string | null => ACCOUNTS.find((a) => a.name === name)?.code ?? null;
export const DEPOSIT_KINDS: readonly DepositKind[] = ['보통예금', '정기예금', 'MMDA', '기업자유예금', '정기적금']
  .map((name) => ({ name, code: codeOf(name) }));
/** 계좌번호를 필수로 받는 계정과목명 */
export const ACCOUNT_NO_REQUIRED_SUBJECTS: readonly string[] = DEPOSIT_KINDS.map((d) => d.name);

/* ── 통화(기본 KRW) ── */
export const CURRENCIES = [
  { code: 'KRW', label: '대한민국(원)' },
  { code: 'USD', label: '미국(달러)' },
  { code: 'EUR', label: '유럽연합(유로)' },
  { code: 'JPY', label: '일본(엔)' },
  { code: 'CNY', label: '중국(위안)' },
] as const;
export type CurrencyCode = typeof CURRENCIES[number]['code'];
export const DEFAULT_CURRENCY: CurrencyCode = 'KRW';

/* ── 연동정보 3종 ── */
export const LINK_FLAGS = ['수탁기본계좌', '우선손실충당계좌', '외부연동이체계좌'] as const;
export type LinkFlag = typeof LINK_FLAGS[number];

/* ── 계좌(ACC-019 그리드 + 등록/수정 폼) ── */
export interface BankAccount {
  id: string;
  accountType: FundsAccountType;   // 계정구분
  code: string;                    // 계좌코드 'BA-0001'
  alias: string;                   // 계좌별칭
  accountNo: string;               // 계좌번호(마스크 없음)
  virtualNo: string;               // 가상계좌번호('' = 없음)
  holder: string;                  // 계좌주명
  bank: Bank;                      // 금융기관
  branch: string;                  // 지점
  subject: string;                 // 계정과목(DEPOSIT_KINDS.name)
  partner: string;                 // 거래처명
  openDate: string;                // 개설일 'YYYY-MM-DD'
  maturityDate: string;            // 만기일('' = 없음)
  freeWithdraw: boolean;           // 수시입출금
  active: boolean;                 // 사용여부
  currency: CurrencyCode;          // 통화
  rate: number;                    // 이자율(%)
  productAmount: number | null;    // 상품가입액(원) — 정기예금·적금만
  purpose: string;                 // 개설목적
  memo: string;                    // 적요
  links: LinkFlag[];               // 연동정보
  attachments: string[];           // 첨부파일명
  createdBy: string; createdAt: string;
  updatedBy: string; updatedAt: string;
  draft?: boolean;                 // 임시저장
}

/* ── 계좌 입출금 거래(ACC-020 계좌거래상세 · ACC-021 자금일보) ── */
export interface CashTxn {
  id: string;
  accountId: string;
  date: string;          // 'YYYY-MM-DD'
  deposit: number;       // 입금(예금) 원
  withdraw: number;      // 출금(인출) 원
  partner: string;
  memo: string;
  slipNo: string;        // 'YYYYMMDD-NNN'
}

/* ── 시드 PRNG ── */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 계좌 원본 — [계정구분, 별칭, 금융기관, 지점, 과목, 개설일, 만기일, 사용, 이자율, 상품가입액, 연동, 개설목적] */
type Seed = [FundsAccountType, string, Bank, string, string, string, string, boolean, number, number | null, LinkFlag[], string];
const [T1, T2, T3, T4] = FUNDS_ACCOUNT_TYPES;
const SEEDS: Seed[] = [
  [T1, '농특기금 운용 보통', 'NH농협은행', '본점영업부', '보통예금', '2019-03-04', '', true, 0.1, null, ['수탁기본계좌'], '기금 출자금 수납·집행'],
  [T1, '농특기금 MMDA', 'NH농협은행', '세종청사지점', 'MMDA', '2021-07-01', '', true, 2.35, null, ['외부연동이체계좌'], '단기 유휴자금 운용'],
  [T1, '농특기금 정기예금 23-1', 'KDB산업은행', '여의도지점', '정기예금', '2023-02-01', '2024-02-01', false, 3.85, 5_000_000_000, [], '여유자금 정기예치'],
  [T1, '농특기금 정기예금 25-1', '신한은행', '강남중앙지점', '정기예금', '2025-06-02', '2027-06-02', true, 3.2, 8_000_000_000, [], '여유자금 정기예치'],
  [T2, '농안기금 운용 보통', 'NH농협은행', '서초지점', '보통예금', '2018-05-14', '', true, 0.1, null, ['수탁기본계좌'], '기금 출자금 수납·집행'],
  [T2, '농안기금 손실충당', '우리은행', '광화문지점', '기업자유예금', '2020-09-01', '', true, 1.2, null, ['우선손실충당계좌'], '우선손실충당금 예치'],
  [T2, '농안기금 정기예금 24-1', 'IBK기업은행', '본점영업부', '정기예금', '2024-01-15', '2025-01-15', true, 3.9, 3_000_000_000, [], '여유자금 정기예치'],
  [T2, '농안기금 구 운영계좌', 'KB국민은행', '역삼지점', '보통예금', '2017-11-01', '', false, 0.1, null, [], '구 위탁기관 운영계좌(폐지)'],
  [T3, '수산계정 운용 보통', '하나은행', '을지로지점', '보통예금', '2019-04-01', '', true, 0.1, null, ['수탁기본계좌'], '수산 출자금 수납·집행'],
  [T3, '수산계정 MMDA', 'IBK기업은행', '선릉역지점', 'MMDA', '2022-03-02', '', true, 2.1, null, ['외부연동이체계좌'], '단기 유휴자금 운용'],
  [T3, '수산계정 정기예금 26-1', 'KDB산업은행', '본점영업부', '정기예금', '2026-01-05', '2027-01-05', true, 3.05, 2_000_000_000, [], '여유자금 정기예치'],
  [T3, '수산계정 정기적금', 'NH농협은행', '나주혁신도시지점', '정기적금', '2023-05-02', '2026-05-02', true, 3.4, 600_000_000, [], '적립식 예치'],
  [T4, '비용정산 운영 보통', '신한은행', '여의도지점', '보통예금', '2020-01-02', '', true, 0.1, null, ['수탁기본계좌', '외부연동이체계좌'], '관리보수·운영비 정산'],
  [T4, '비용정산 손실충당', '하나은행', '테헤란로지점', '기업자유예금', '2021-02-01', '', true, 1.1, null, ['우선손실충당계좌'], '우선손실충당금 예치'],
  [T4, '비용정산 MMDA', '우리은행', '삼성동지점', 'MMDA', '2023-08-01', '', true, 2.25, null, [], '단기 유휴자금 운용'],
  [T4, '비용정산 정기예금 24-2', '한국은행', '본부', '정기예금', '2024-07-01', '2026-07-01', true, 3.6, 1_500_000_000, [], '여유자금 정기예치'],
];

const HOLDER = '한국농업정책보험금융원';
const pad = (n: number, w: number): string => String(n).padStart(w, '0');

/** 계좌 16건 — 계정구분별 4건(보통·MMDA·정기예금·기업자유·적금 혼합, 미사용 2 · 만기도래 4 · 만기 미도래 3) */
export function demoBankAccounts(): BankAccount[] {
  const rnd = mulberry32(19019);
  return SEEDS.map(([accountType, alias, bank, branch, subject, openDate, maturityDate, active, rate, productAmount, links, purpose], i) => {
    const n = i + 1;
    const accountNo = `${pad(100 + Math.floor(rnd() * 900), 3)}-${pad(Math.floor(rnd() * 10000), 4)}-${pad(Math.floor(rnd() * 10000), 4)}-${pad(10 + Math.floor(rnd() * 90), 2)}`;
    const hasVirtual = links.includes('외부연동이체계좌');
    return {
      id: `acct-${pad(n, 3)}`,
      accountType, code: `BA-${pad(n, 4)}`, alias,
      accountNo,
      virtualNo: hasVirtual ? `790-${pad(Math.floor(rnd() * 1e6), 6)}-${pad(Math.floor(rnd() * 1e4), 4)}` : '',
      holder: HOLDER, bank, branch, subject,
      partner: PARTNERS[i % PARTNERS.length].name,
      openDate, maturityDate,
      freeWithdraw: subject === '보통예금' || subject === 'MMDA' || subject === '기업자유예금',
      active, currency: DEFAULT_CURRENCY, rate, productAmount,
      purpose, memo: `${accountType} ${subject}`,
      links: [...links],
      attachments: productAmount != null ? [`${alias}_통장사본.pdf`, `${alias}_가입증서.pdf`] : [`${alias}_통장사본.pdf`],
      createdBy: '김회계', createdAt: `${openDate} 09:00`,
      updatedBy: active ? '이자금' : '김회계',
      updatedAt: active ? '2026-10-30 14:20' : `${maturityDate || '2024-12-31'} 17:00`,
    };
  });
}

/* ── 거래 생성 ── */
const TXN_START = '2023-01-01';
const roundTo = (v: number, unit: number): number => Math.max(unit, Math.round(v / unit) * unit);
const addMonths = (ym: [number, number], k: number): [number, number] => {
  const m = ym[1] - 1 + k;
  return [ym[0] + Math.floor(m / 12), (m % 12 + 12) % 12 + 1];
};
const ymd = (y: number, m: number, d: number): string => `${y}-${pad(m, 2)}-${pad(d, 2)}`;
/** 미사용 계좌의 거래 마감일(이 날 잔액 전액 인출) */
const inactiveEnd = (acc: BankAccount): string => acc.maturityDate || '2024-12-31';

const DEPOSIT_MEMOS = ['출자금 수납', '기금 전입', '이자 수입', '분배금 수납', '회수금 입금', '정기예금 만기 이체'];
const WITHDRAW_MEMOS = ['자펀드 출자 집행', '관리보수 지급', '운영비 지급', '자금 이체', '수수료 지급', '세금 납부'];

/** 계좌 입출금 거래 — 계좌별 개설 입금 + 월 0~4건, 만기·미사용 계좌는 마감일에 전액 인출. date·id 순 정렬 */
export function demoCashTxns(accounts: readonly BankAccount[] = demoBankAccounts()): CashTxn[] {
  const rnd = mulberry32(20021);
  const out: Omit<CashTxn, 'id' | 'slipNo'>[] = [];
  for (const acc of accounts) {
    const fixed = acc.productAmount != null;           // 정기예금·적금 = 상품가입액 일시 예치(적금은 월 적립)
    const end = !acc.active ? inactiveEnd(acc) : (acc.maturityDate && acc.maturityDate <= DEMO_TODAY ? acc.maturityDate : DEMO_TODAY);
    const scale = acc.subject === '보통예금' ? 1_000_000_000 : acc.subject === 'MMDA' ? 600_000_000 : 300_000_000;
    let bal = 0;
    const push = (date: string, deposit: number, withdraw: number, memo: string): void => {
      bal += deposit - withdraw;
      out.push({ accountId: acc.id, date, deposit, withdraw, partner: PARTNERS[Math.floor(rnd() * PARTNERS.length)].name, memo });
    };
    /* 개설 입금 */
    const opening = fixed ? (acc.subject === '정기적금' ? roundTo(acc.productAmount! / 36, 1_000_000) : acc.productAmount!) : roundTo(scale * (2 + rnd() * 3), 1_000_000);
    push(acc.openDate, opening, 0, acc.subject === '정기적금' ? '적금 1회차 납입' : '계좌 개설 입금');
    if (end < TXN_START) continue;
    /* 월별 거래 — 시작 = max(개설월 다음달, 2023-01) */
    const [oy, om] = acc.openDate.split('-').map(Number) as [number, number];
    let cur: [number, number] = acc.openDate < TXN_START ? [2023, 1] : addMonths([oy, om], 1);
    const [ey, em, ed] = end.split('-').map(Number);
    while (cur[0] < ey || (cur[0] === ey && cur[1] <= em)) {
      const lastDay = cur[0] === ey && cur[1] === em ? Math.max(1, ed - (end === DEMO_TODAY ? 0 : 1)) : 28;
      if (fixed) {
        /* 정기예금 = 월 이자 입금 1건, 적금 = 월 적립 1건 */
        const d = Math.min(lastDay, 25);
        if (acc.subject === '정기적금') push(ymd(cur[0], cur[1], d), opening, 0, '적금 정기 납입');
        else push(ymd(cur[0], cur[1], d), roundTo((acc.productAmount! * acc.rate) / 100 / 12, 1_000), 0, '이자 수입');
      } else {
        const k = Math.floor(rnd() * 5);
        const days = Array.from({ length: k }, () => 1 + Math.floor(rnd() * lastDay)).sort((a, b) => a - b);
        for (const d of days) {
          const dep = rnd() < 0.5;
          if (dep || bal < scale * 0.5) push(ymd(cur[0], cur[1], d), roundTo(scale * (0.05 + rnd() * 0.6), 100_000), 0, DEPOSIT_MEMOS[Math.floor(rnd() * DEPOSIT_MEMOS.length)]);
          else push(ymd(cur[0], cur[1], d), 0, roundTo(bal * (0.05 + rnd() * 0.35), 100_000), WITHDRAW_MEMOS[Math.floor(rnd() * WITHDRAW_MEMOS.length)]);
        }
      }
      cur = addMonths(cur, 1);
    }
    /* 만기·미사용 마감 = 잔액 전액 인출 */
    if (end !== DEMO_TODAY && bal > 0) push(end, 0, bal, acc.maturityDate === end ? '만기 해지' : '계좌 해지');
    /* 자금일보 기준일 데모 — 운영 보통예금은 전일·당일 거래를 보장 */
    if (acc.active && acc.subject === '보통예금' && end === DEMO_TODAY) {
      push('2026-11-04', roundTo(scale * 0.12, 100_000), 0, '출자금 수납');
      push(DEMO_TODAY, roundTo(scale * 0.08, 100_000), 0, '이자 수입');
      push(DEMO_TODAY, 0, roundTo(scale * 0.05, 100_000), '관리보수 지급');
    }
  }
  /* 정렬 → 일자별 전표 순번 */
  const sorted = out.map((t, i) => ({ t, i })).sort((a, b) => (a.t.date < b.t.date ? -1 : a.t.date > b.t.date ? 1 : a.i - b.i));
  const seq = new Map<string, number>();
  return sorted.map(({ t }, i) => {
    const s = (seq.get(t.date) ?? 0) + 1;
    seq.set(t.date, s);
    return { id: `txn-${pad(i + 1, 5)}`, ...t, slipNo: `${t.date.replace(/-/g, '')}-${pad(s, 3)}` };
  });
}
