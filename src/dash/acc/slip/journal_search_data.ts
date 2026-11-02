/* 전표검색(ACC-008) — 더미 데이터. 전표 원장은 일반전표(ACC-003) general_journal_data 의 demoJournals 를 그대로 쓰고
   (시드 복사 없음) 분개 라인 1줄 = 그리드 1행으로 펼친다(slide 10 그리드 20열에 분개번호·코드·계정과목·세목명·차변·대변이 있어서).
   원본에 없는 필드는 결정적으로 파생한다:
   - 분개번호 = 전표번호-라인번호(2자리) · 작성부서 = 작성자 순번으로 PL_DEPTS · 세목명 = 계정별 데모 세목(없으면 '-')
   - 전표구분 = 정상/취소/정정(slide 10 컬럼 14). 공용 SLIP_KINDS 는 ['정상'] 뿐이라 이 화면 로컬 상수로 두고,
     전표상세에 넘기는 원본 행의 slipKind 도 같은 값으로 덮어 목록·상세가 어긋나지 않게 한다.
   - 외화 전표(상세필터 No.13 통화·No.14 금액(외화)) — demoJournals 는 전부 원화라 원장 순번 FX_SEEDS 의 전표만 외화로 바꾼다
     (currency·exchangeRate·foreignAmount, 원 전표 사본에만 — 공용 더미 무수정). 외화금액 = round2(원화 금액 ÷ 환율)라
     원화 ≈ 외화 × 환율(오차 ≤ 환율 × 0.005). 환율은 외화 1단위당 원(엔도 1엔당 — 100엔 단위 고시와 다름, 데모).
     원장 0번(작성일 = 오늘)을 포함해 기본 기간(당월)에도 외화 전표가 보인다.
   - 증빙미첨부사유(No.19) — 원장에 사유 필드가 없어 증빙미첨부(noEvidence) 전표 일부에만 가상 사유를 채운다(나머지 '').
   - 거래처 사업자등록번호(No.20) — 분개 라인 거래처를 관리번호로 PARTNERS 에 조인하고, PARTNERS 에 bizNo 가 없으면
     이 파일의 데모 사업자번호(DEMO_BIZ_NO, 법인 거래처만 — 가상 번호)로 채운다. 개인·거래처 없음 = ''(숫자 10자리, 하이픈 없음).
   날짜는 demoJournals 와 같이 런타임 오늘 기준(오늘−0~27일). 거래처·사람 이름은 전부 가상 명칭. */
import { PARTNERS, PL_DEPTS, PL_EMPLOYEES, demoJournals, todayStr } from './general_journal_data';
import type { Currency, FundAccount, JournalOrigin, JournalRow } from './general_journal_data';

/** 전표구분(slide 10 컬럼 14 · slide 11 조건 9) — 1 정상 / 2 취소 / 3 정정 */
export const SEARCH_SLIP_KINDS = ['정상', '취소', '정정'] as const;
export type SearchSlipKind = typeof SEARCH_SLIP_KINDS[number];

/** 세목명 — 계정코드별 데모 세목(코드관리 확정 전). 없으면 '-' */
const SUB_ITEMS: Record<string, string> = {
  '1100100': '운용계좌', '1100200': '정기예치', '1200100': '조합출자', '2100100': '일반미지급',
  '5100100': '관리보수', '5100200': '용역·자문', '5100300': '사무용품', '5100400': '비품상각',
};

/** 외화 전표 — demoJournals 순번 → [통화(CURRENCIES 라벨), 환율(외화 1단위당 원)] */
const FX_SEEDS: Record<number, [Currency, number]> = {
  0: ['미국(달러)', 1385.5],     // 회계감사 수수료(작성일 = 오늘 — 기본 기간에 보이는 외화 전표)
  6: ['유럽연합(유로)', 1492.3], // 회계 소프트웨어 라이선스
  8: ['일본(엔)', 9.15],         // 용역대금 선급금(1엔당)
};
const round2 = (n: number) => Math.round(n * 100) / 100;

/** 증빙미첨부사유 — demoJournals 순번 → 가상 사유(증빙미첨부 전표 일부만, 나머지 '') */
const NO_EVIDENCE_REASONS: Record<number, string> = {
  2: '추후 제출 예정',
  5: '내부 결산 전표로 외부 증빙 없음',
};

/** 데모 사업자등록번호(숫자 10자리, 가상) — 고객번호 → 번호. 법인 거래처만(개인은 없음) */
const DEMO_BIZ_NO: Record<string, string> = {
  C000101: '1018112345', C000102: '6028154321', C000103: '1248167890', C000104: '4158209876', C000105: '3078123456',
  C000106: '1068265432', C000107: '1318278901', C000108: '1078290123',
};
/** 분개 라인 거래처 → 사업자등록번호(관리번호로 PARTNERS 조인). 없으면 '' */
function bizNoOf(mgmtNo: string): string {
  const p = PARTNERS.find((x) => x.mgmtNo === mgmtNo);
  if (!p) return '';
  return (p.bizNo ?? DEMO_BIZ_NO[p.custNo] ?? '').replace(/\D/g, '');
}

/** 그리드 1행 = 분개 라인 1줄 */
export interface SearchLine {
  id: string;                 // 전표 id + '-' + 라인번호
  fundAccount: FundAccount;   // 계정구분
  writtenDate: string;        // 작성일 YYYY-MM-DD
  seq: string;                // 순번(전표일 내 일련 — 코드성)
  journalNo: string;          // 분개번호
  memo: string;               // 적요(라인)
  accountCode: string;        // 코드
  accountName: string;        // 계정과목
  subItem: string;            // 세목명 — 없으면 '-'
  debit: number | null;       // 차변금액 — 숫자 N/A null
  credit: number | null;      // 대변금액
  partner: string;            // 거래처(라인) — 없으면 '-'
  partnerBizNo: string;       // 거래처 사업자등록번호(숫자 10자리, 그리드 미표시 — 상세필터 No.20) — 없으면 ''
  noEvidenceReason: string;   // 증빙미첨부사유(전표 단위, 그리드 미표시 — 상세필터 No.19) — 없으면 ''
  dept: string;               // 작성부서
  writer: string;             // 작성자
  slipKind: SearchSlipKind;   // 전표구분
  origin: JournalOrigin;      // 전표발생구분
  slipNo: string;             // 전표번호
  plDept: string;             // 손익부서
  plEmployee: string;         // 손익사원
  createdBy: string;          // 최초등록자
  updatedBy: string;          // 최종수정자
  journal: JournalRow;        // 원 전표(전표상세 = 이 1건, 전표번호 기준)
}

/* 전표구분 — 대부분 정상, 일부 취소·정정(코드값 도메인이 화면에 다 보이게) */
const kindAt = (i: number): SearchSlipKind => (i % 7 === 3 ? '취소' : i % 7 === 5 ? '정정' : '정상');

/** 더미 분개 라인 — `today`(YYYY-MM-DD) 기준. 호출마다 새 배열 */
export function demoSearchLines(today: string = todayStr()): SearchLine[] {
  return demoJournals(today).flatMap((src, i) => {
    const slipKind = kindAt(i);
    const fx = FX_SEEDS[i];
    const journal: JournalRow = fx
      ? { ...src, slipKind, currency: fx[0], exchangeRate: fx[1], foreignAmount: round2(src.amount / fx[1]) }
      : { ...src, slipKind };
    const noEvidenceReason = src.noEvidence ? NO_EVIDENCE_REASONS[i] ?? '' : '';
    const wi = PL_EMPLOYEES.indexOf(src.writer as typeof PL_EMPLOYEES[number]);
    const dept = PL_DEPTS[(wi < 0 ? 0 : wi) % PL_DEPTS.length];
    return src.lines.map((l, li) => {
      const no = String(li + 1).padStart(2, '0');
      return {
        id: src.id + '-' + no,
        fundAccount: src.fundAccount,
        writtenDate: src.writtenDate,
        seq: src.seq,
        journalNo: src.slipNo + '-' + no,
        memo: l.memo,
        accountCode: l.accountCode,
        accountName: l.accountName,
        subItem: SUB_ITEMS[l.accountCode] ?? '-',
        debit: l.debit,
        credit: l.credit,
        partner: l.partner,
        partnerBizNo: bizNoOf(l.mgmtNo),
        noEvidenceReason,
        dept,
        writer: src.writer,
        slipKind,
        origin: src.origin,
        slipNo: src.slipNo,
        plDept: src.plDept,
        plEmployee: src.plEmployee,
        createdBy: src.createdBy,
        updatedBy: src.updatedBy,
        journal,
      };
    });
  });
}
