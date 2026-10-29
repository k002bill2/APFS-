/* 삭제전표 관리(ACC-004) — 더미 데이터. 타입·코드값은 일반전표(ACC-003) general_journal_data 를 그대로 쓴다
   (삭제전표 = 일반전표 행 + 삭제일시·삭제자). 전표상세는 ACC-003 전표 화면(journal_entry_screen, mode 'deleted')이 그린다.
   전표일은 런타임 오늘 기준(오늘−0~27일). 계정과목은 회계 공용 ACCOUNTS(입력여부 Y)의 코드·이름.
   거래처·사람 이름은 전부 가상 명칭(general_journal_data 의 PARTNERS·PL_EMPLOYEES).
   결재는 '미상신'·'반려'만 — 일반전표 삭제 게이트상 그 둘만 삭제될 수 있다.
   ⚠ 백엔드가 없어 복원은 화면 로컬 상태에서 행을 빼는 것으로 끝난다(일반전표 목록으로 실제 이동하지 않음). */
import { addDays, format, subDays } from 'date-fns';
import { ACCOUNTS } from '../account_data';
import { BASE_CURRENCY, FUND_BANK_ACCOUNTS, PARTNERS, PL_DEPTS, PL_EMPLOYEES, SLIP_KINDS, lineTotals } from './general_journal_data';
import type { ApprovalStatus, Currency, EvidenceType, FundAccount, JournalLine, JournalOrigin, JournalRow, Partner } from './general_journal_data';

/** 삭제전표 1건 — 일반전표 행 + 삭제 정보 */
export interface DeletedJournal extends JournalRow {
  deletedAt: string;          // 삭제일시 'YYYY-MM-DD HH:mm'
  deletedBy: string;          // 삭제자
}

/** 입력여부 Y 계정만 라인에 쓴다 — 코드가 없거나 집계(N) 계정이면 더미 작성 실수라 즉시 실패시킨다 */
function line(code: string, debit: number | null, credit: number | null, memo: string, p?: Partner): JournalLine {
  const a = ACCOUNTS.find((x) => x.code === code && x.inputYn === 'Y');
  if (!a) throw new Error(`삭제전표 더미: 입력 가능 계정이 아님 ${code}`);
  return { accountCode: a.code, accountName: a.name, memo, mgmtNo: p ? p.mgmtNo : '-', partner: p ? p.name : '-', accountNo: p ? p.accountNo : '-', debit, credit };
}

/* 시드 — off=전표일(오늘−n일), p=PARTNERS idx(-1=없음), writer=PL_EMPLOYEES idx, usd=외화(미국 달러) 환율 */
type Seed = {
  off: number; fund: FundAccount; ap: ApprovalStatus; origin: JournalOrigin; memo: string; p: number; writer: number;
  files: string[]; ev: EvidenceType; lines: (p?: Partner) => JournalLine[]; usd?: number; noEv?: boolean;
};

const SEEDS: Seed[] = [
  { off: 0, fund: '농림수산식품모태펀드(기금)', ap: '미상신', origin: '일반', memo: '10월 회계감사 수수료 지급', p: 5, writer: 0, files: ['감사수수료_세금계산서.pdf'], ev: '세금계산서',
    lines: (p) => [line('5100200', 3_300_000, null, '회계감사 수수료', p), line('1100100', null, 3_300_000, '보통예금 출금', p)] },
  { off: 1, fund: '농식품 투자조합 계정', ap: '반려', origin: '일반', memo: '3분기 관리보수 지급', p: 7, writer: 1, files: ['관리보수_청구서.pdf', '관리보수_산정내역.xlsx'], ev: '청구서',
    lines: (p) => [line('5100100', 48_500_000, null, '3분기 관리보수', p), line('2100200', null, 1_455_000, '원천세 예수'), line('1100100', null, 47_045_000, '보통예금 출금', p)] },
  { off: 2, fund: '수산 모태계정', ap: '미상신', origin: '미결', memo: '조합 출자금 납입(2차)', p: 1, writer: 2, files: [], ev: '해당없음', noEv: true,
    lines: (p) => [line('1200100', 250_000_000, null, '2차 출자금 납입', p), line('1100100', null, 250_000_000, '보통예금 출금', p)] },
  { off: 2, fund: '수산 모태계정', ap: '반려', origin: '일반', memo: '사무용품 구입', p: 6, writer: 3, files: ['사무용품_영수증.jpg'], ev: '카드영수증',
    lines: (p) => [line('5100300', 286_000, null, '복사용지·토너', p), line('1100100', null, 286_000, '법인카드 결제')] },
  { off: 4, fund: '농림수산식품모태펀드(기금)', ap: '미상신', origin: '결산', memo: '9월 미수이자 계상', p: -1, writer: 0, files: [], ev: '해당없음',
    lines: () => [line('1100300', 12_840_000, null, '정기예금 미수이자'), line('4100100', null, 12_840_000, '이자수익 계상')] },
  { off: 6, fund: '농식품 투자조합 계정', ap: '미상신', origin: '일반', memo: '조합 분배금 수령', p: 3, writer: 1, files: ['분배금_통지서.pdf'], ev: '운용지시서',
    lines: (p) => [line('1100100', 63_200_000, null, '분배금 입금', p), line('4100300', null, 63_200_000, '조합분배금수익', p)] },
  { off: 7, fund: '농림수산식품모태펀드(기금)', ap: '반려', origin: '유무형자산', memo: '회계 소프트웨어 라이선스 취득', p: 4, writer: 2, files: ['라이선스_계약서.pdf', '세금계산서.pdf'], ev: '전자(세금)계산서',
    lines: (p) => [line('1200300', 9_900_000, null, '라이선스 취득', p), line('2100100', null, 9_900_000, '미지급금 계상', p)] },
  { off: 9, fund: '수산 모태계정', ap: '미상신', origin: '일반', memo: '해외 실사 자문료 지급(USD)', p: 5, writer: 3, files: ['자문료_인보이스.pdf'], ev: '청구서', usd: 1385.5,
    lines: (p) => [line('5100200', 6_927_500, null, '해외 실사 자문료', p), line('1100100', null, 6_927_500, '외화예금 출금', p)] },
  { off: 11, fund: '농식품 투자조합 계정', ap: '반려', origin: '미결', memo: '선급 실사비용 지급', p: 5, writer: 0, files: [], ev: '품의서',
    lines: (p) => [line('1100400', 5_500_000, null, '실사비용 선급', p), line('1100100', null, 5_500_000, '보통예금 출금', p)] },
  { off: 13, fund: '농림수산식품모태펀드(기금)', ap: '미상신', origin: '결산', memo: '비품 감가상각비 계상', p: -1, writer: 1, files: ['감가상각_명세.xlsx'], ev: '명세서',
    lines: () => [line('5100400', 1_250_000, null, '9월 감가상각비'), line('1200200', null, 1_250_000, '비품 감가상각')] },
  { off: 15, fund: '수산 모태계정', ap: '미상신', origin: '일반', memo: '배당금 수령', p: 3, writer: 2, files: ['배당_통지서.pdf'], ev: '이체내역',
    lines: (p) => [line('1100100', 18_000_000, null, '배당금 입금', p), line('4100200', null, 18_000_000, '배당금수익', p)] },
  { off: 15, fund: '수산 모태계정', ap: '반려', origin: '미결', memo: '미지급 수수료 계상', p: 5, writer: 3, files: [], ev: '해당없음', noEv: true,
    lines: (p) => [line('5100200', 2_200_000, null, '세무조정 수수료', p), line('2100300', null, 2_200_000, '미지급비용 계상', p)] },
  { off: 18, fund: '농식품 투자조합 계정', ap: '미상신', origin: '유무형자산', memo: '사무용 비품 구입', p: 6, writer: 0, files: ['비품_견적서.pdf'], ev: '세금계산서',
    lines: (p) => [line('1200200', 4_620_000, null, '사무용 책상·의자', p), line('1100100', null, 4_620_000, '보통예금 출금', p)] },
  { off: 21, fund: '농림수산식품모태펀드(기금)', ap: '반려', origin: '일반', memo: '정기예금 가입', p: -1, writer: 1, files: ['정기예금_증서.pdf'], ev: '이체내역',
    lines: () => [line('1100200', 500_000_000, null, '정기예금 가입'), line('1100100', null, 500_000_000, '보통예금 대체')] },
  { off: 24, fund: '수산 모태계정', ap: '미상신', origin: '결산', memo: '출자금 수령 정리', p: 7, writer: 2, files: [], ev: '이체내역',
    lines: (p) => [line('1100100', 120_000_000, null, '출자금 입금', p), line('3100300', null, 120_000_000, '출자금', p)] },
  { off: 27, fund: '농식품 투자조합 계정', ap: '반려', origin: '일반', memo: '조합 운영 수수료 지급(USD)', p: 5, writer: 3, files: ['운영수수료_인보이스.pdf'], ev: '청구서', usd: 1392.0,
    lines: (p) => [line('5100200', 4_176_000, null, '운영 수수료', p), line('1100100', null, 4_176_000, '외화예금 출금', p)] },
];

const USD: Currency = '미국(달러)';
const round2 = (n: number) => Math.round(n * 100) / 100;

/** 더미 삭제전표 — 호출 시점의 오늘 기준. 호출마다 새 배열(화면 로컬 state 초기값) */
export function demoDeletedJournals(today: Date = new Date()): DeletedJournal[] {
  const seqByDate: Record<string, number> = {};
  return SEEDS.map((s, i) => {
    const day = (o: number) => format(subDays(today, Math.max(o, 0)), 'yyyy-MM-dd');
    const slipDate = day(s.off);
    const seq = String((seqByDate[slipDate] = (seqByDate[slipDate] ?? 0) + 1)).padStart(3, '0');
    const p = s.p >= 0 ? PARTNERS[s.p] : undefined;
    const lines = s.lines(p);
    const amount = lineTotals(lines).debit;
    const writer = PL_EMPLOYEES[s.writer];
    const deleter = PL_EMPLOYEES[(s.writer + 1) % PL_EMPLOYEES.length];
    const hh = String(9 + (i % 8)).padStart(2, '0'), mm = String((i * 7) % 60).padStart(2, '0');
    const pl = lines.some((l) => /^[45]/.test(l.accountCode));
    return {
      id: 'dj-' + String(i + 1).padStart(3, '0'),
      fundAccount: s.fund,
      slipDate, seq, memo: s.memo, amount,
      partner: p ? p.name : '-',
      approval: s.ap,
      attachments: [...s.files],
      writer,
      origin: s.origin,
      slipNo: slipDate.replace(/-/g, '') + '-' + seq,
      fundDueDate: format(addDays(subDays(today, s.off), 2), 'yyyy-MM-dd'),   // 전표일 + 2일(오늘 전표면 미래일)
      createdBy: writer,
      updatedBy: i % 3 === 0 ? deleter : writer,
      writtenDate: slipDate,
      slipKind: SLIP_KINDS[0],
      evidenceType: s.ev,
      storage: s.files.length ? '회계팀 문서함' : '-',
      noEvidence: !!s.noEv,
      currency: s.usd ? USD : BASE_CURRENCY,
      exchangeRate: s.usd ?? null,
      foreignAmount: s.usd ? round2(amount / s.usd) : null,
      plDept: pl ? PL_DEPTS[i % PL_DEPTS.length] : '-',
      plEmployee: pl ? writer : '-',
      partnerAccountNo: FUND_BANK_ACCOUNTS[s.fund][i % FUND_BANK_ACCOUNTS[s.fund].length],   // 거래처계좌번호 = 계정구분 운용계좌 중 하나
      lines,
      deletedAt: `${day(s.off - 1 - (i % 2))} ${hh}:${mm}`,
      deletedBy: deleter,
    };
  });
}

