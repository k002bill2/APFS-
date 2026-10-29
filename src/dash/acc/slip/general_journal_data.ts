/* 회계 > 전표관리 > 일반전표 관리(ACC-003) — 더미 데이터·코드 옵션·계정과목·거래처.
   설계서 정본: ACC-003 슬라이드 9~27(목록·상세필터·전표등록·계정과목 검색·거래처 검색).
   청크 B(전표등록·계정과목/거래처 검색)·청크 C(업로드)가 이 파일의 타입·옵션을 재사용한다.

   더미 규약(브리프):
   - 행은 **런타임 오늘** 기준으로 만든다(`demoJournals(today)`). 전표일은 오늘−0~27일이라 기본 기간
     (전월 1일 ~ 오늘) 안에 항상 들어간다(1일에도 전월 1일까지 ≥28일 거리).
   - 작성일(writtenDate)은 전표일과 별개 필드다. 최소 2행이 작성일 = 오늘(삭제 경로 검증용).
   - 숫자 N/A = null, 텍스트 N/A = '-'. 각 전표의 차변 합 = 대변 합, 목록 금액 = 차변 합.
   - 계정구분·거래처·작성자는 전부 가상 명칭(실존 회사·인물 아님). */
import { format, subDays } from 'date-fns';
import { ACCOUNTS } from '../account_data';

/* ── 코드 옵션 (ADM-008 코드관리 확정 전 — 설계서 표기값 그대로) ── */
/** 계정구분 — 기금계정 계열(설계서 "계정구분 항목 확인 필요" — 데모 값) */
export const FUND_ACCOUNTS = ['농림수산식품모태펀드(기금)', '농식품 투자조합 계정', '수산 모태계정'] as const;
export type FundAccount = typeof FUND_ACCOUNTS[number];

/** 결재 상태(slide 10 컬럼 8) */
export const APPROVAL_STATUSES = ['미상신', '상신', '승인', '반려'] as const;
export type ApprovalStatus = typeof APPROVAL_STATUSES[number];

/** 전표발생구분(slide 11 조건 4) */
export const JOURNAL_ORIGINS = ['일반', '미결', '결산', '유무형자산'] as const;
export type JournalOrigin = typeof JOURNAL_ORIGINS[number];

/** 전표구분(slide 12 헤더 — 기본 '정상', 비활성) */
export const SLIP_KINDS = ['정상'] as const;

/** 승인여부(slide 11 조건 3) — 여 = 결재 승인, 부 = 그 외 */
export const APPROVAL_YN = ['여', '부'] as const;

/** 증빙구분 17종(slide 12 · 표시 순서 그대로) */
export const EVIDENCE_TYPES = [
  '해당없음', '이체내역', '계산서', '세금계산서', '전자(세금)계산서', '현금영수증(법인)',
  '현금영수증(개인)', '카드영수증', '영수증', '품의서', '전자결재', '청구서',
  '운용지시서', '법인카드', '개인카드', '기타', '명세서',
] as const;
export type EvidenceType = typeof EVIDENCE_TYPES[number];

/** 통화(slide 12 ⑤ — 기본 대한민국(원), 외화 선택 시 환율·외화금액 활성) */
export const CURRENCIES = ['대한민국(원)', '미국(달러)', '유럽연합(유로)', '일본(엔)', '중국(위안)'] as const;
export type Currency = typeof CURRENCIES[number];
export const BASE_CURRENCY: Currency = '대한민국(원)';

/** 로그인 사용자(데모) — 전표등록 작성자·역분개 작성자 기본값 */
export const CURRENT_USER = '김민준';

/** 거래처계좌번호(slide 12 ⑤ — "계정구분 선택 후 조회") — 계정구분별 데모 운용계좌(가상 번호) */
export const FUND_BANK_ACCOUNTS: Record<FundAccount, string[]> = {
  '농림수산식품모태펀드(기금)': ['기금 운용계좌 301-0101-0001-01', '기금 출자계좌 301-0101-0002-01', '기금 예치계좌 301-0101-0003-01'],
  '농식품 투자조합 계정': ['조합 운용계좌 302-0202-0001-01', '조합 분배계좌 302-0202-0002-01'],
  '수산 모태계정': ['수산 운용계좌 303-0303-0001-01', '수산 출자계좌 303-0303-0002-01'],
};

/** 손익부서·손익사원(slide 12 ⑤ 손익계정 — 데모 값) */
export const PL_DEPTS = ['경영지원팀', '투자운용팀', '리스크관리팀', '회계팀'] as const;
export const PL_EMPLOYEES = ['김민준', '이서연', '박지훈', '최유나'] as const;

/* ── 계정과목 — 회계 공용 `acc/account_data.ts`(계정과목 검색 팝업과 공유, 수정 금지 파일)를 쓴다 ── */
const accountName = (code: string) => ACCOUNTS.find((a) => a.code === code)?.name ?? '-';

/* ── 거래처(거래처 검색 팝업 — 간편추가) ── */
export interface Partner {
  custNo: string;        // 고객번호(= 업로드 거래처코드)
  mgmtNo: string;        // 관리번호
  name: string;
  kind: '법인' | '개인';
  ceo: string;           // 대표자명(개인은 본인)
  email: string;
  phone: string;
  accountNo: string;     // 거래처 계좌번호(데모) — 없으면 '-'
  /* 간편추가(slide 13 ④)로 등록할 때만 채워지는 항목 — 더미 원장 행엔 없다 */
  region?: '국내' | '해외';  // 국내외구분
  bizNo?: string;        // 사업자등록번호(숫자 10자리)
  corpNo?: string;       // 법인등록번호(법인만)
}
export const PARTNERS: Partner[] = [
  { custNo: 'C000101', mgmtNo: 'M-2026-001', name: '(주)가람팜텍', kind: '법인', ceo: '정가람', email: 'acct@garam-farmtech.example', phone: '02-555-0101', accountNo: '100-201-000101' },
  { custNo: 'C000102', mgmtNo: 'M-2026-002', name: '들빛수산(주)', kind: '법인', ceo: '한들빛', email: 'fin@deulbit-sea.example', phone: '051-555-0102', accountNo: '100-201-000102' },
  { custNo: 'C000103', mgmtNo: 'M-2026-003', name: '온새미식품(주)', kind: '법인', ceo: '서온새', email: 'ir@onsaemi-food.example', phone: '031-555-0103', accountNo: '100-201-000103' },
  { custNo: 'C000104', mgmtNo: 'M-2026-004', name: '해솔영농조합법인', kind: '법인', ceo: '문해솔', email: 'office@haesol-farm.example', phone: '061-555-0104', accountNo: '100-201-000104' },
  { custNo: 'C000105', mgmtNo: 'M-2026-005', name: '(주)나래애그로', kind: '법인', ceo: '오나래', email: 'pay@narae-agro.example', phone: '044-555-0105', accountNo: '100-201-000105' },
  { custNo: 'C000106', mgmtNo: 'M-2026-006', name: '도담회계법인', kind: '법인', ceo: '윤도담', email: 'audit@dodam-cpa.example', phone: '02-555-0106', accountNo: '100-201-000106' },
  { custNo: 'C000107', mgmtNo: 'M-2026-007', name: '(주)다온유통', kind: '법인', ceo: '배다온', email: 'biz@daon-dist.example', phone: '032-555-0107', accountNo: '100-201-000107' },
  { custNo: 'C000108', mgmtNo: 'M-2026-008', name: '새벽들 농식품 투자조합 1호', kind: '법인', ceo: '권새벽', email: 'fund@saebyeok-fund.example', phone: '02-555-0108', accountNo: '100-201-000108' },
  { custNo: 'C000109', mgmtNo: 'M-2026-009', name: '하늘찬', kind: '개인', ceo: '하늘찬', email: 'skychan@mail.example', phone: '010-5550-0109', accountNo: '100-201-000109' },
  { custNo: 'C000110', mgmtNo: 'M-2026-010', name: '서도윤', kind: '개인', ceo: '서도윤', email: 'doyun@mail.example', phone: '010-5550-0110', accountNo: '100-201-000110' },
];

/* ── 전표 ── */
/** 분개 행(slide 12 분개 그리드: 계정코드·계정과목·적요·관리번호·거래처·계좌번호·차변·대변) */
export interface JournalLine {
  accountCode: string;
  accountName: string;
  memo: string;
  mgmtNo: string;        // 텍스트 N/A '-'
  partner: string;       // 텍스트 N/A '-'
  accountNo: string;     // 텍스트 N/A '-'
  debit: number | null;  // 숫자 N/A null
  credit: number | null;
}

/** 목록 행(slide 10 그리드 15컬럼 + 전표등록이 쓰는 헤더·증빙·관리항목) */
export interface JournalRow {
  id: string;
  fundAccount: FundAccount;        // 계정구분
  slipDate: string;                // 전표일 YYYY-MM-DD
  seq: string;                     // 순번(전표일 내 일련 — 코드성, 좌측 정렬)
  memo: string;                    // 적요(대표)
  amount: number;                  // 금액 = 차변 합
  partner: string;                 // 거래처(대표) — 없으면 '-'
  approval: ApprovalStatus;        // 결재
  attachments: string[];           // 첨부 파일명 — 비어 있으면 아이콘 없음
  writer: string;                  // 작성자
  origin: JournalOrigin;           // 전표발생구분
  slipNo: string;                  // 전표번호
  fundDueDate: string;             // 자금집행예정일 — 없으면 '-'
  createdBy: string;               // 최초등록자
  updatedBy: string;               // 최종수정자
  writtenDate: string;             // 작성일(삭제 당일자 게이트 기준) — 전표일과 별개
  slipKind: string;                // 전표구분(정상)
  evidenceType: EvidenceType | ''; // 증빙구분 — '' = 미선택(전표등록에서 고르지 않고 저장)
  storage: string;                 // 보관위치 — 없으면 '-'
  noEvidence: boolean;             // 증빙미첨부
  currency: Currency;
  exchangeRate: number | null;     // 외화일 때만
  foreignAmount: number | null;    // 외화일 때만
  plDept: string;                  // 손익부서 — 없으면 '-'
  plEmployee: string;              // 손익사원 — 없으면 '-'
  partnerAccountNo?: string;       // 거래처계좌번호(전표등록 ⑤ 관리항목) — 미입력이면 없음/'-'
  lines: JournalLine[];
}

export const todayStr = (): string => format(new Date(), 'yyyy-MM-dd');   // 로컬 달력일(toISOString 은 KST 00~09시 전날)

/** 분개 합계 — 차변 합·대변 합 */
export function lineTotals(lines: readonly JournalLine[]): { debit: number; credit: number } {
  return lines.reduce((s, l) => ({ debit: s.debit + (l.debit ?? 0), credit: s.credit + (l.credit ?? 0) }), { debit: 0, credit: 0 });
}

const line = (code: string, memo: string, debit: number | null, credit: number | null, p?: Partner): JournalLine => ({
  accountCode: code, accountName: accountName(code), memo,
  mgmtNo: p ? p.mgmtNo : '-', partner: p ? p.name : '-', accountNo: p ? p.accountNo : '-',
  debit, credit,
});

/* 시드 — [전표일 offset(오늘−n일), 작성일 offset, 계정구분 idx, 결재, 발생구분, 거래처 idx(-1=없음), 적요, 작성자, 첨부, 자금집행 offset(null='-'), 증빙구분, 분개]
   분개는 [계정코드, 차변, 대변] — 차변 합 = 대변 합이 되도록 쌍으로 적는다. */
type Seed = {
  d: number; w: number; fa: number; ap: ApprovalStatus; og: JournalOrigin; p: number; memo: string; writer: string;
  att: string[]; due: number | null; ev: EvidenceType; lines: [string, number | null, number | null][];
};
const SEEDS: Seed[] = [
  { d: 0, w: 0, fa: 0, ap: '미상신', og: '일반', p: 5, memo: '10월 회계감사 수수료 지급', writer: '김민준', att: ['감사계약서.pdf'], due: -3, ev: '세금계산서',
    lines: [['5100200', 3300000, null], ['1100100', null, 3300000]] },
  { d: 0, w: 0, fa: 1, ap: '반려', og: '일반', p: 0, memo: '투자조합 관리보수 미지급 계상', writer: '이서연', att: [], due: -10, ev: '청구서',
    lines: [['5100100', 12500000, null], ['2100100', null, 12500000]] },
  { d: 1, w: 0, fa: 0, ap: '미상신', og: '미결', p: -1, memo: '정기예금 이자 미수 계상', writer: '김민준', att: [], due: null, ev: '해당없음',
    lines: [['1100300', 845000, null], ['4100100', null, 845000]] },
  { d: 2, w: 2, fa: 2, ap: '상신', og: '일반', p: 1, memo: '수산 모태계정 조합 출자 이행', writer: '박지훈', att: ['출자요청서.pdf', '이체확인증.png'], due: -5, ev: '이체내역',
    lines: [['1200100', 500000000, null], ['1100100', null, 500000000]] },
  { d: 3, w: 3, fa: 0, ap: '승인', og: '일반', p: 7, memo: '조합 분배금 수령', writer: '이서연', att: ['분배통지서.pdf'], due: null, ev: '운용지시서',
    lines: [['1100100', 128000000, null], ['1200100', null, 100000000], ['4100300', null, 28000000]] },
  { d: 5, w: 5, fa: 1, ap: '승인', og: '결산', p: -1, memo: '분기 결산 감가상각비 계상', writer: '최유나', att: [], due: null, ev: '해당없음',
    lines: [['5100400', 1250000, null], ['1200200', null, 1250000]] },
  { d: 6, w: 6, fa: 0, ap: '미상신', og: '유무형자산', p: 4, memo: '회계 소프트웨어 라이선스 취득', writer: '박지훈', att: ['견적서.pdf'], due: -2, ev: '전자(세금)계산서',
    lines: [['1200300', 8800000, null], ['2100100', null, 8800000]] },
  { d: 8, w: 8, fa: 2, ap: '반려', og: '일반', p: 2, memo: '사무용품 구입', writer: '최유나', att: [], due: -1, ev: '카드영수증',
    lines: [['5100300', 264000, null], ['1100100', null, 264000]] },
  { d: 9, w: 9, fa: 0, ap: '상신', og: '일반', p: 6, memo: '용역대금 선급금 지급', writer: '김민준', att: ['용역계약서.pdf'], due: -4, ev: '품의서',
    lines: [['1100400', 22000000, null], ['1100100', null, 22000000]] },
  { d: 11, w: 11, fa: 1, ap: '승인', og: '일반', p: 3, memo: '영농조합 배당금 수령', writer: '이서연', att: [], due: null, ev: '이체내역',
    lines: [['1100100', 6400000, null], ['4100200', null, 6400000]] },
  { d: 13, w: 13, fa: 0, ap: '미상신', og: '미결', p: 8, memo: '개인 자문료 예수금 처리', writer: '박지훈', att: ['자문계약서.pdf'], due: -6, ev: '기타',
    lines: [['5100200', 1500000, null], ['2100200', null, 49500], ['2100100', null, 1450500]] },
  { d: 15, w: 15, fa: 2, ap: '승인', og: '결산', p: -1, memo: '미지급비용 결산 정리', writer: '최유나', att: [], due: null, ev: '해당없음',
    lines: [['5100100', 4300000, null], ['2100300', null, 4300000]] },
  { d: 17, w: 17, fa: 0, ap: '상신', og: '일반', p: 9, memo: '자문위원 수당 지급', writer: '이서연', att: [], due: -8, ev: '이체내역',
    lines: [['5100200', 900000, null], ['1100100', null, 900000]] },
  { d: 20, w: 20, fa: 1, ap: '승인', og: '일반', p: 0, memo: '정기예금 신규 예치', writer: '김민준', att: ['예금증서.pdf'], due: null, ev: '이체내역',
    lines: [['1100200', 300000000, null], ['1100100', null, 300000000]] },
  { d: 23, w: 23, fa: 0, ap: '반려', og: '유무형자산', p: 4, memo: '사무용 비품 취득', writer: '박지훈', att: [], due: -12, ev: '세금계산서',
    lines: [['1200200', 3960000, null], ['2100100', null, 3960000]] },
  { d: 27, w: 27, fa: 2, ap: '승인', og: '일반', p: 1, memo: '출자금 납입 수령', writer: '최유나', att: ['납입확인서.pdf'], due: null, ev: '이체내역',
    lines: [['1100100', 250000000, null], ['3100300', null, 250000000]] },
];

/** 더미 전표 16행 — `today`(YYYY-MM-DD) 기준으로 날짜를 만든다(테스트는 고정 today 주입). */
export function demoJournals(today: string = todayStr()): JournalRow[] {
  const base = new Date(today + 'T00:00:00');
  const ymd = (offset: number) => format(subDays(base, offset), 'yyyy-MM-dd');
  const seqByDate: Record<string, number> = {};
  return SEEDS.map((s, i) => {
    const slipDate = ymd(s.d);
    const n = (seqByDate[slipDate] = (seqByDate[slipDate] ?? 0) + 1);
    const seq = String(n).padStart(3, '0');
    const p = s.p >= 0 ? PARTNERS[s.p] : undefined;
    const lines = s.lines.map(([code, dr, cr], li) => line(code, s.memo, dr, cr, li === 0 || cr != null ? p : undefined));
    const amount = lineTotals(lines).debit;
    return {
      id: 'gj-' + String(i + 1).padStart(3, '0'),
      fundAccount: FUND_ACCOUNTS[s.fa],
      slipDate, seq, memo: s.memo, amount,
      partner: p ? p.name : '-',
      approval: s.ap,
      attachments: s.att,
      writer: s.writer,
      origin: s.og,
      slipNo: slipDate.replace(/-/g, '') + '-' + seq,
      /* 자금집행예정일 = 전표일 + n일(음수 offset) — 오늘 이후일 수 있다 */
      fundDueDate: s.due == null ? '-' : format(subDays(new Date(slipDate + 'T00:00:00'), s.due), 'yyyy-MM-dd'),
      createdBy: s.writer,
      updatedBy: i % 3 === 0 ? '이서연' : s.writer,
      writtenDate: ymd(s.w),
      slipKind: SLIP_KINDS[0],
      evidenceType: s.ev,
      storage: s.att.length ? '회계팀 문서함' : '-',
      noEvidence: s.ev === '해당없음',
      currency: BASE_CURRENCY,
      exchangeRate: null,
      foreignAmount: null,
      plDept: s.lines.some(([c]) => c.startsWith('4') || c.startsWith('5')) ? '경영지원팀' : '-',
      plEmployee: s.lines.some(([c]) => c.startsWith('4') || c.startsWith('5')) ? s.writer : '-',
      lines,
    };
  });
}
