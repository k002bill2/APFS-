/* 회계 > 결산관리 > 결산전표 관리(ACC-015) — 더미 결산전표.
   설계서 정본: ACC-015 슬라이드 10(그리드 예시 — 9/30 가결산 + 10/1 가결산(환원) 2행).

   더미 규약
   - 행은 **런타임 오늘** 기준(`demoClosingJournals(today)`). 원전표 전표일은 오늘−1 ~ 오늘−27일 · 전월 말일이라
     환원전표(다음날)까지 기본 기간(전월 1일 ~ 오늘) 안에 든다. 전월 말일 → 당월 1일 쌍이 slide 10 의 9/30 → 10/1 예시다.
   - 가결산 쌍은 commitClosing 으로 만든다(화면 저장과 같은 경로 — 환원 분개·전표번호 `-R`·pairId·결재 상태 일치).
   - 가결산 9쌍(18행) + 결산 9건 = 27행. 결재 4종이 가결산·결산 양쪽에 다 있다.
   - 계정구분·거래처·작성자는 가상 명칭(일반전표 더미 원장 재사용). */
import { endOfMonth, format, subDays, subMonths } from 'date-fns';
import { ACCOUNTS } from '../account_data';
import { BASE_CURRENCY, FUND_ACCOUNTS, PARTNERS, SLIP_KINDS, lineTotals, todayStr } from '../slip/general_journal_data';
import type { ApprovalStatus, EvidenceType, JournalLine, JournalRow, Partner } from '../slip/general_journal_data';
import { commitClosing } from './closing_journal_model';
import type { ClosingRow } from './closing_journal_model';

const accountName = (code: string) => ACCOUNTS.find((a) => a.code === code)?.name ?? '-';
const line = (code: string, memo: string, debit: number | null, credit: number | null, p?: Partner): JournalLine => ({
  accountCode: code, accountName: accountName(code), memo,
  mgmtNo: p ? p.mgmtNo : '-', partner: p ? p.name : '-', accountNo: p ? p.accountNo : '-',
  debit, credit,
});

/* 시드 — d = 오늘−n일(null = 전월 말일), og 가결산/결산, 분개 [계정코드, 차변, 대변](차변 합 = 대변 합) */
type Seed = {
  d: number | null; fa: number; ap: ApprovalStatus; og: '가결산' | '결산'; p: number; memo: string; writer: string;
  att: string[]; due: number | null; ev: EvidenceType; lines: [string, number | null, number | null][];
};
/* 오래된 것부터 — commitClosing 이 신규를 맨 앞에 넣으므로 결과는 최신이 위 */
const SEEDS: Seed[] = [
  { d: 27, fa: 0, ap: '승인', og: '결산', p: -1, memo: '전월 결산 감가상각비 확정', writer: '최유나', att: ['감가상각명세.xlsx'], due: null, ev: '해당없음',
    lines: [['5100400', 1250000, null], ['1200200', null, 1250000]] },
  { d: 26, fa: 1, ap: '승인', og: '가결산', p: 0, memo: '관리보수 미지급비용 가결산', writer: '이서연', att: [], due: null, ev: '청구서',
    lines: [['5100100', 12500000, null], ['2100300', null, 12500000]] },
  { d: 24, fa: 2, ap: '반려', og: '결산', p: -1, memo: '정기예금 미수이자 결산 정리', writer: '박지훈', att: [], due: null, ev: '해당없음',
    lines: [['1100300', 845000, null], ['4100100', null, 845000]] },
  { d: 22, fa: 0, ap: '상신', og: '가결산', p: 5, memo: '회계감사 수수료 가결산 계상', writer: '김민준', att: ['감사계약서.pdf'], due: 5, ev: '세금계산서',
    lines: [['5100200', 3300000, null], ['2100300', null, 3300000]] },
  { d: 20, fa: 1, ap: '미상신', og: '결산', p: 7, memo: '조합분배금 미수 결산 계상', writer: '이서연', att: [], due: null, ev: '운용지시서',
    lines: [['1100300', 28000000, null], ['4100300', null, 28000000]] },
  { d: 18, fa: 0, ap: '반려', og: '가결산', p: -1, memo: '비품 감가상각 가결산', writer: '최유나', att: [], due: null, ev: '해당없음',
    lines: [['5100400', 330000, null], ['1200200', null, 330000]] },
  { d: 15, fa: 2, ap: '승인', og: '결산', p: 1, memo: '수산 모태계정 미지급비용 결산', writer: '박지훈', att: ['정산서.pdf'], due: null, ev: '청구서',
    lines: [['5100100', 4300000, null], ['2100300', null, 4300000]] },
  { d: null, fa: 0, ap: '미상신', og: '가결산', p: -1, memo: '월말 미수이자 가결산 계상', writer: '김민준', att: [], due: null, ev: '해당없음',
    lines: [['1100300', 1000000, null], ['4100100', null, 1000000]] },
  { d: 12, fa: 1, ap: '승인', og: '가결산', p: 3, memo: '영농조합 배당 미수 가결산', writer: '이서연', att: ['배당통지서.pdf'], due: null, ev: '이체내역',
    lines: [['1100300', 6400000, null], ['4100200', null, 6400000]] },
  { d: 10, fa: 0, ap: '상신', og: '결산', p: -1, memo: '분기 결산 감가상각비 계상', writer: '최유나', att: [], due: null, ev: '해당없음',
    lines: [['5100400', 2600000, null], ['1200200', null, 1300000], ['1200300', null, 1300000]] },
  { d: 8, fa: 2, ap: '미상신', og: '가결산', p: 2, memo: '사무용품비 미지급 가결산', writer: '박지훈', att: [], due: 3, ev: '카드영수증',
    lines: [['5100300', 264000, null], ['2100300', null, 264000]] },
  { d: 6, fa: 1, ap: '반려', og: '결산', p: 0, memo: '관리보수 결산 확정', writer: '김민준', att: ['관리보수 산정표.xlsx'], due: 10, ev: '청구서',
    lines: [['5100100', 12500000, null], ['2100100', null, 12500000]] },
  { d: 5, fa: 0, ap: '승인', og: '가결산', p: 6, memo: '용역비 미지급 가결산', writer: '최유나', att: [], due: null, ev: '품의서',
    lines: [['5100200', 22000000, null], ['2100300', null, 22000000]] },
  { d: 4, fa: 2, ap: '미상신', og: '결산', p: -1, memo: '정기예금 이자 결산 정리', writer: '이서연', att: [], due: null, ev: '해당없음',
    lines: [['1100300', 520000, null], ['4100100', null, 520000]] },
  { d: 3, fa: 1, ap: '상신', og: '가결산', p: 9, memo: '자문료 예수금 가결산', writer: '박지훈', att: ['자문계약서.pdf'], due: 7, ev: '기타',
    lines: [['5100200', 1500000, null], ['2100200', null, 49500], ['2100300', null, 1450500]] },
  { d: 2, fa: 0, ap: '승인', og: '결산', p: 5, memo: '회계감사 수수료 결산 확정', writer: '김민준', att: [], due: null, ev: '세금계산서',
    lines: [['5100200', 3300000, null], ['2100100', null, 3300000]] },
  { d: 1, fa: 2, ap: '미상신', og: '가결산', p: -1, memo: '출자 관련 미지급비용 가결산', writer: '최유나', att: [], due: null, ev: '해당없음',
    lines: [['5100100', 900000, null], ['2100300', null, 900000]] },
  { d: 1, fa: 1, ap: '미상신', og: '결산', p: 4, memo: '소프트웨어 상각 결산', writer: '이서연', att: [], due: null, ev: '해당없음',
    lines: [['5100400', 733000, null], ['1200300', null, 733000]] },
];

/** 더미 결산전표 27행 — 가결산 9쌍(원전표 + 환원전표) + 결산 9건. `today`(YYYY-MM-DD) 기준 */
export function demoClosingJournals(today: string = todayStr()): ClosingRow[] {
  const base = new Date(today + 'T00:00:00');
  const prevMonthEnd = format(endOfMonth(subMonths(base, 1)), 'yyyy-MM-dd');
  let rows: ClosingRow[] = [];
  SEEDS.forEach((s, i) => {
    const slipDate = s.d == null ? prevMonthEnd : format(subDays(base, s.d), 'yyyy-MM-dd');
    const p = s.p >= 0 ? PARTNERS[s.p] : undefined;
    const lines = s.lines.map(([code, dr, cr], li) => line(code, s.memo, dr, cr, li === 0 || cr != null ? p : undefined));
    const pl = s.lines.some(([c]) => c.startsWith('4') || c.startsWith('5'));
    const j: JournalRow = {
      id: '', fundAccount: FUND_ACCOUNTS[s.fa], slipDate, seq: '', memo: s.memo, amount: lineTotals(lines).debit,
      partner: p ? p.name : '-', approval: s.ap, attachments: s.att, writer: s.writer, origin: s.og, slipNo: '',
      fundDueDate: s.due == null ? '-' : format(subDays(new Date(slipDate + 'T00:00:00'), -s.due), 'yyyy-MM-dd'),
      createdBy: s.writer, updatedBy: s.writer, writtenDate: slipDate, slipKind: SLIP_KINDS[0],
      evidenceType: s.ev, storage: s.att.length ? '회계팀 문서함' : '-', noEvidence: s.ev === '해당없음',
      currency: BASE_CURRENCY, exchangeRate: null, foreignAmount: null,
      plDept: pl ? '회계팀' : '-', plEmployee: pl ? s.writer : '-', lines,
    };
    /* 최종수정자 — 일부는 다른 사람(목록 컬럼 구분용) */
    rows = commitClosing(rows, j, { user: i % 4 === 0 ? '이서연' : s.writer }).rows;
  });
  /* commitClosing 은 신규의 최초등록자를 user 로 둔다 — 원전표 최초등록자는 작성자로 맞춘다(환원전표도 같은 작성자) */
  return rows.map((r) => ({ ...r, createdBy: r.writer }));
}
