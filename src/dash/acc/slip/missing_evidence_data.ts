/* 전표증빙 미첨부 관리(ACC-006) — 더미 데이터. 타입·코드값은 일반전표(ACC-003) general_journal_data 를 그대로 쓴다
   (미첨부 전표 = 일반전표 행 중 isMissingEvidence 가 참인 것). 증빙첨부 화면은 ACC-003 전표 화면(journal_entry_screen, mode 'evidence').

   더미 규약
   - 전표일은 런타임 오늘 기준 **당월 안**(1일 ~ 오늘)에 펼친다 — 기본 기간이 당월이라 진입 직후 목록이 비지 않게
     (1일이면 당월 행은 전부 1일). 별도로 2건은 전월(기간 조건 × 로 전 기간을 볼 때만 보인다).
   - 미첨부 사유 3가지가 모두 나온다: 증빙구분·첨부 모두 없음 / 첨부는 있으나 증빙구분 미선택 / 증빙미첨부 체크했으나 증빙구분 미선택.
   - 결재는 승인 위주(미결재포함 미체크 = 승인만) + 미상신·상신·반려 몇 건(미결재포함 체크 시 보인다).
   - 계정과목은 회계 공용 ACCOUNTS(입력여부 Y)의 코드·이름, 거래처·사람 이름은 전부 가상 명칭. */
import { addDays, format, startOfMonth, subMonths } from 'date-fns';
import { ACCOUNTS } from '../account_data';
import { BASE_CURRENCY, FUND_BANK_ACCOUNTS, PARTNERS, PL_DEPTS, PL_EMPLOYEES, SLIP_KINDS, lineTotals, todayStr } from './general_journal_data';
import type { ApprovalStatus, EvidenceType, FundAccount, JournalLine, JournalOrigin, JournalRow, Partner } from './general_journal_data';

/** 입력여부 Y 계정만 라인에 쓴다 — 코드가 없거나 집계(N) 계정이면 더미 작성 실수라 즉시 실패시킨다 */
function line(code: string, debit: number | null, credit: number | null, memo: string, p?: Partner): JournalLine {
  const a = ACCOUNTS.find((x) => x.code === code && x.inputYn === 'Y');
  if (!a) throw new Error(`미첨부 전표 더미: 입력 가능 계정이 아님 ${code}`);
  return { accountCode: a.code, accountName: a.name, memo, mgmtNo: p ? p.mgmtNo : '-', partner: p ? p.name : '-', accountNo: p ? p.accountNo : '-', debit, credit };
}

/* 시드 — k = 당월 내 위치(경과일수로 나눈 나머지 → 1일 + n일), prev = 전월 행(전월 1일 + k일),
   p = PARTNERS idx(-1=없음), writer = PL_EMPLOYEES idx, files = 첨부(있으면 증빙구분만 빠진 미첨부), ev = 증빙구분('' = 미선택), noEv = 증빙미첨부 체크 */
type Seed = {
  k: number; prev?: boolean; fund: FundAccount; ap: ApprovalStatus; origin: JournalOrigin; memo: string; p: number; writer: number;
  files?: string[]; ev?: EvidenceType | ''; noEv?: boolean; lines: (p?: Partner) => JournalLine[];
};

const SEEDS: Seed[] = [
  { k: 0, fund: '농림수산식품모태펀드(기금)', ap: '승인', origin: '일반', memo: '회계감사 수수료 지급', p: 5, writer: 0,
    lines: (p) => [line('5100200', 3_300_000, null, '회계감사 수수료', p), line('1100100', null, 3_300_000, '보통예금 출금', p)] },
  { k: 1, fund: '농식품 투자조합 계정', ap: '승인', origin: '일반', memo: '4분기 관리보수 지급', p: 7, writer: 1, files: ['관리보수_청구서.pdf'],
    lines: (p) => [line('5100100', 48_500_000, null, '4분기 관리보수', p), line('2100200', null, 1_455_000, '원천세 예수'), line('1100100', null, 47_045_000, '보통예금 출금', p)] },
  { k: 2, fund: '수산 모태계정', ap: '승인', origin: '미결', memo: '조합 출자금 납입(3차)', p: 1, writer: 2,
    lines: (p) => [line('1200100', 250_000_000, null, '3차 출자금 납입', p), line('1100100', null, 250_000_000, '보통예금 출금', p)] },
  { k: 3, fund: '수산 모태계정', ap: '승인', origin: '일반', memo: '사무용품 구입', p: 6, writer: 3,
    lines: (p) => [line('5100300', 286_000, null, '복사용지·토너', p), line('1100100', null, 286_000, '법인카드 결제')] },
  { k: 4, fund: '농림수산식품모태펀드(기금)', ap: '승인', origin: '결산', memo: '정기예금 미수이자 계상', p: -1, writer: 0, noEv: true,
    lines: () => [line('1100300', 12_840_000, null, '정기예금 미수이자'), line('4100100', null, 12_840_000, '이자수익 계상')] },
  { k: 5, fund: '농식품 투자조합 계정', ap: '승인', origin: '일반', memo: '조합 분배금 수령', p: 3, writer: 1, files: ['분배금_통지서.pdf', '분배내역.xlsx'],
    lines: (p) => [line('1100100', 63_200_000, null, '분배금 입금', p), line('4100300', null, 63_200_000, '조합분배금수익', p)] },
  { k: 6, fund: '농림수산식품모태펀드(기금)', ap: '승인', origin: '유무형자산', memo: '회계 소프트웨어 라이선스 취득', p: 4, writer: 2,
    lines: (p) => [line('1200300', 9_900_000, null, '라이선스 취득', p), line('2100100', null, 9_900_000, '미지급금 계상', p)] },
  { k: 7, fund: '수산 모태계정', ap: '승인', origin: '일반', memo: '배당금 수령', p: 3, writer: 3,
    lines: (p) => [line('1100100', 18_000_000, null, '배당금 입금', p), line('4100200', null, 18_000_000, '배당금수익', p)] },
  { k: 8, fund: '농식품 투자조합 계정', ap: '승인', origin: '결산', memo: '비품 감가상각비 계상', p: -1, writer: 0,
    lines: () => [line('5100400', 1_250_000, null, '감가상각비'), line('1200200', null, 1_250_000, '비품 감가상각')] },
  { k: 9, fund: '농림수산식품모태펀드(기금)', ap: '승인', origin: '미결', memo: '선급 실사비용 지급', p: 5, writer: 1,
    lines: (p) => [line('1100400', 5_500_000, null, '실사비용 선급', p), line('1100100', null, 5_500_000, '보통예금 출금', p)] },
  { k: 1, fund: '수산 모태계정', ap: '미상신', origin: '일반', memo: '자문위원 수당 지급', p: 9, writer: 2,
    lines: (p) => [line('5100200', 900_000, null, '자문위원 수당', p), line('1100100', null, 900_000, '보통예금 출금', p)] },
  { k: 3, fund: '농림수산식품모태펀드(기금)', ap: '상신', origin: '일반', memo: '정기예금 신규 예치', p: -1, writer: 3, files: ['예금증서.pdf'],
    lines: () => [line('1100200', 500_000_000, null, '정기예금 가입'), line('1100100', null, 500_000_000, '보통예금 대체')] },
  { k: 5, fund: '농식품 투자조합 계정', ap: '반려', origin: '유무형자산', memo: '사무용 비품 구입', p: 6, writer: 0,
    lines: (p) => [line('1200200', 4_620_000, null, '사무용 책상·의자', p), line('1100100', null, 4_620_000, '보통예금 출금', p)] },
  { k: 8, fund: '수산 모태계정', ap: '상신', origin: '결산', memo: '미지급 수수료 계상', p: 5, writer: 1, noEv: true,
    lines: (p) => [line('5100200', 2_200_000, null, '세무조정 수수료', p), line('2100300', null, 2_200_000, '미지급비용 계상', p)] },
  { k: 10, prev: true, fund: '농림수산식품모태펀드(기금)', ap: '승인', origin: '일반', memo: '출자금 수령 정리', p: 7, writer: 2,
    lines: (p) => [line('1100100', 120_000_000, null, '출자금 입금', p), line('3100300', null, 120_000_000, '출자금', p)] },
  { k: 20, prev: true, fund: '농식품 투자조합 계정', ap: '승인', origin: '일반', memo: '조합 운영 수수료 지급', p: 5, writer: 3,
    lines: (p) => [line('5100200', 4_176_000, null, '운영 수수료', p), line('1100100', null, 4_176_000, '보통예금 출금', p)] },
];

/** 더미 미첨부 전표 — `today`(YYYY-MM-DD) 기준. 호출마다 새 배열(화면 로컬 state 초기값) */
export function demoMissingEvidence(today: string = todayStr()): JournalRow[] {
  const base = new Date(today + 'T00:00:00');
  const monthStart = startOfMonth(base);
  const prevStart = startOfMonth(subMonths(base, 1));
  const elapsed = base.getDate();   // 당월 경과일수(1~31) — 당월 행은 1일 ~ 오늘 안에 둔다
  const seqByDate: Record<string, number> = {};
  return SEEDS.map((s, i) => {
    const slipDate = format(s.prev ? addDays(prevStart, s.k) : addDays(monthStart, s.k % elapsed), 'yyyy-MM-dd');
    const seq = String((seqByDate[slipDate] = (seqByDate[slipDate] ?? 0) + 1)).padStart(3, '0');
    const p = s.p >= 0 ? PARTNERS[s.p] : undefined;
    const lines = s.lines(p);
    const amount = lineTotals(lines).debit;
    const writer = PL_EMPLOYEES[s.writer];
    const files = s.files ?? [];
    const pl = lines.some((l) => /^[45]/.test(l.accountCode));
    return {
      id: 'me-' + String(i + 1).padStart(3, '0'),
      fundAccount: s.fund,
      slipDate, seq, memo: s.memo, amount,
      partner: p ? p.name : '-',
      approval: s.ap,
      attachments: [...files],
      writer,
      origin: s.origin,
      slipNo: slipDate.replace(/-/g, '') + '-' + seq,
      fundDueDate: format(addDays(new Date(slipDate + 'T00:00:00'), 3), 'yyyy-MM-dd'),   // 전표일 + 3일
      createdBy: writer,
      updatedBy: writer,
      writtenDate: slipDate,
      slipKind: SLIP_KINDS[0],
      evidenceType: s.ev ?? '',
      storage: files.length ? '회계팀 문서함' : '-',
      noEvidence: !!s.noEv,
      currency: BASE_CURRENCY,
      exchangeRate: null,
      foreignAmount: null,
      plDept: pl ? PL_DEPTS[i % PL_DEPTS.length] : '-',
      plEmployee: pl ? writer : '-',
      partnerAccountNo: FUND_BANK_ACCOUNTS[s.fund][i % FUND_BANK_ACCOUNTS[s.fund].length],
      lines,
    };
  });
}
