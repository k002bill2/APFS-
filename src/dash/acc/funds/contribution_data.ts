/* 출자금현황 정보관리(ACC-022) — 더미 데이터·코드 상수.
   출처: 화면설계서 ACC-022(2026.10.26 v1.0) slide 10~14. 계좌(funds_data 계좌 원장)와 무관한 화면이다.
   - 계정구분 3종은 이 화면 전용(설계서 '농식품/수산/비용') — 계좌관리·계좌잔액·자금일보(ACC-019~021)의 4종(FUNDS_ACCOUNT_TYPES)과 다르다.
   - 금액은 전부 원 단위 정수로 저장한다(단위 환산은 표시·엑셀 경계에서만).
   - 출자잔액은 저장하지 않는다 — contribution_model withBalances 가 계정별 누계로 계산한다. */

export const CONTRIB_ACCOUNTS = ['농식품(투자계정)', '수산(투자계정)', '비용(비용정산)'] as const;
export type ContribAccount = typeof CONTRIB_ACCOUNTS[number];

/** 상세필터 계정구분 라벨(설계서 '농식품/수산/비용') → 행 값 */
export const ACCOUNT_FILTER_LABELS = ['농식품', '수산', '비용'] as const;
export type AccountFilterLabel = typeof ACCOUNT_FILTER_LABELS[number];
export const ACCOUNT_BY_LABEL: Record<AccountFilterLabel, ContribAccount> = {
  농식품: '농식품(투자계정)', 수산: '수산(투자계정)', 비용: '비용(비용정산)',
};

export const CONTRIB_KINDS = ['출자', '분배'] as const;
export type ContribKind = typeof CONTRIB_KINDS[number];

export const DIST_KINDS = ['원금', '수익', '원금+수익'] as const;
export type DistKind = typeof DIST_KINDS[number];

export const UNITS = ['원', '천원', '백만원'] as const;
export type Unit = typeof UNITS[number];
export const DEFAULT_UNIT: Unit = '원';

export interface ContribRow {
  id: string;
  account: ContribAccount;
  date: string;              // 기준일(출자일·분배일) 'YYYY-MM-DD'
  seq: number | null;        // 차수/회차 — 계정·구분별 자동 채번(null = 미채번 → '-')
  kind: ContribKind;
  distKind: DistKind | '';   // 분배 구분(출자 행은 '')
  invest: number;            // 출자원금(이번 회차 납입금액)
  principal: number;         // 분배원금(A)
  income: number;            // 수익(B)
  withholding: number;       // 원천세(C) — 등록 모달에 입력칸이 없다(설계서). 신규 0, 수정 시 기존값 유지
  perfFee: number;           // 성과보수(D)
  incentive: number;         // 초과인센티브(E)
  lac: number;               // LAC
  memo: string;
  attachments: string[];     // 첨부 파일명
}

export const DEMO_USER = '회계담당자';

let seqId = 0;
const nextId = () => `CT-${String(++seqId).padStart(4, '0')}`;

const invest = (account: ContribAccount, date: string, seq: number, amount: number, memo = ''): ContribRow => ({
  id: nextId(), account, date, seq, kind: '출자', distKind: '', invest: amount,
  principal: 0, income: 0, withholding: 0, perfFee: 0, incentive: 0, lac: 0, memo, attachments: [],
});
/** 원천세(C) 데모 = 수익(B)의 15.4%(소득세 14% + 지방소득세 1.4%) — 원 미만 절사 */
const tax = (b: number) => Math.floor(b * 0.154);
const dist = (account: ContribAccount, date: string, seq: number, distKind: DistKind, a: number, b: number, d = 0, e = 0, lac = 0, memo = ''): ContribRow => ({
  id: nextId(), account, date, seq, kind: '분배', distKind, invest: 0,
  principal: a, income: b, withholding: tax(b), perfFee: d, incentive: e, lac, memo, attachments: [],
});

/** 데모 16건(2024~2026, 3계정). 호출마다 새 배열·새 id 순서(CT-0001~) */
export function demoContributions(): ContribRow[] {
  seqId = 0;
  return [
    invest('농식품(투자계정)', '2024-03-15', 1, 5_000_000_000, '1차 출자금 납입'),
    invest('농식품(투자계정)', '2024-09-20', 2, 3_000_000_000, '2차 출자금 납입'),
    dist('농식품(투자계정)', '2025-02-14', 1, '원금', 1_000_000_000, 0, 0, 0, 0, '투자회수 원금 분배'),
    invest('농식품(투자계정)', '2025-06-30', 3, 2_000_000_000, '3차 출자금 납입'),
    { ...dist('농식품(투자계정)', '2025-12-10', 2, '원금+수익', 1_500_000_000, 420_000_000, 63_000_000, 21_000_000, 12_000_000, '청산 분배'), attachments: ['분배통지서_2025-12.pdf'] },
    dist('농식품(투자계정)', '2026-05-20', 3, '수익', 0, 180_000_000, 27_000_000, 0, 0, '수익 분배'),
    invest('농식품(투자계정)', '2026-08-03', 4, 5_000_000_000, '4차 출자금 납입'),
    dist('농식품(투자계정)', '2026-08-12', 4, '원금', 2_000_000_000, 0, 0, 0, 0, ''),
    invest('수산(투자계정)', '2024-05-10', 1, 1_500_000_000, '1차 출자금 납입'),
    invest('수산(투자계정)', '2025-04-18', 2, 500_000_000, '2차 출자금 납입'),
    dist('수산(투자계정)', '2025-11-21', 1, '원금', 10_000_000, 0, 0, 0, 0, ''),
    dist('수산(투자계정)', '2026-03-27', 2, '수익', 0, 85_000_000, 0, 4_250_000, 0, '수익 분배'),
    invest('비용(비용정산)', '2024-02-01', 1, 300_000_000, '관리비용 출자'),
    invest('비용(비용정산)', '2025-02-03', 2, 300_000_000, '관리비용 출자'),
    dist('비용(비용정산)', '2026-01-30', 1, '원금', 120_000_000, 0, 0, 0, 0, '비용정산 반환'),
    invest('비용(비용정산)', '2026-02-02', 3, 300_000_000, '관리비용 출자'),
  ];
}
