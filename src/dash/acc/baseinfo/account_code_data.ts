/* 계정과목 관리(ACC-001) — 타입 + 화면 더미 데이터.
   계층: 레벨1 집계(자산·부채·자본·손익) → 하위 집계 → 입력계정. 입력여부 N = 집계계정(상위계정 후보).
   ⚠ 계정코드는 고유하다 — 설계서 와이어프레임 샘플의 1110000 두 줄 중복은 따르지 않는다(getRowId=계정코드).
   ⚠ 실명 아님(가상 담당자명). 백엔드가 없어 화면 로컬 상태만 바뀐다. */

export const ACCOUNT_CLASSES = ['자산', '부채', '자본', '손익'] as const;
export type AccountClass = typeof ACCOUNT_CLASSES[number];
export const DC_TYPES = ['차변', '대변'] as const;
export type DcType = typeof DC_TYPES[number];
export const CONTRA_TYPES = ['일반', '차감'] as const;
export type ContraType = typeof CONTRA_TYPES[number];
export const YN = ['Y', 'N'] as const;
export type Yn = typeof YN[number];
export const ACCOUNT_LEVELS = ['1', '2', '3', '4', '5', '6'] as const;
export const REQUIRED_ITEMS = ['거래처', '계좌번호', '거래처계좌번호', '손익부서', '손익사원', '통화코드'] as const;
export type RequiredItem = typeof REQUIRED_ITEMS[number];
export const ACCOUNT_NATURES = ['미결', '부가세', '유무형자산'] as const;
export type AccountNature = typeof ACCOUNT_NATURES[number];

/** 데모 사용자 — 등록·수정·삭제 처리자로 기록한다(인증이 없는 프로토타입) */
export const DEMO_USER = '데모사용자';

export type AccountRow = {
  code: string;                 // 계정코드(고유, 7자리)
  name: string;                 // 계정과목명
  nameEn: string;               // 계정과목명(영문)
  cls: AccountClass;            // 계정분류
  contra: ContraType;           // 차감구분
  dc: DcType;                   // 차대구분
  level: number;                // 계정레벨 1~6
  parent: string | null;        // 상위계정 코드(레벨1 = null)
  input: Yn;                    // 입력 가능여부(N = 집계계정)
  use: Yn;                      // 사용여부
  evidence: Yn;                 // 증빙첨부 여부
  required: RequiredItem[];     // 필수입력사항 체크
  nature: AccountNature | '';   // 계정성격(미선택 '')
  createdBy: string;            // 최초등록자
  updatedBy: string;            // 최종수정자
};

type Seed = [code: string, name: string, nameEn: string, cls: AccountClass, dc: DcType, level: number, parent: string | null, input: Yn, extra?: Partial<AccountRow>];

const BY_A = '김회계', BY_B = '박결산', BY_C = '이재무';

const SEEDS: Seed[] = [
  ['1000000', '자산', 'Assets', '자산', '차변', 1, null, 'N'],
  ['1100000', 'I. 유동자산', 'Current Assets', '자산', '차변', 2, '1000000', 'N'],
  ['1110000', '당좌자산', 'Quick Assets', '자산', '차변', 3, '1100000', 'N'],
  ['1110100', '현금', 'Cash', '자산', '차변', 4, '1110000', 'Y'],
  ['1110200', '보통예금', 'Ordinary Deposits', '자산', '차변', 4, '1110000', 'Y', { required: ['계좌번호'] }],
  ['1110300', '정기예금', 'Time Deposits', '자산', '차변', 4, '1110000', 'Y', { required: ['계좌번호'] }],
  ['1110400', '단기매매증권', 'Trading Securities', '자산', '차변', 4, '1110000', 'Y'],
  ['1110500', '미수금', 'Accounts Receivable - Other', '자산', '차변', 4, '1110000', 'Y', { required: ['거래처'], nature: '미결' }],
  ['1110600', '미수수익', 'Accrued Income', '자산', '차변', 4, '1110000', 'Y', { nature: '미결' }],
  ['1110700', '선급금', 'Advance Payments', '자산', '차변', 4, '1110000', 'Y', { required: ['거래처'], nature: '미결' }],
  ['1110800', '부가세대급금', 'VAT Receivable', '자산', '차변', 4, '1110000', 'Y', { nature: '부가세', evidence: 'Y' }],
  ['1200000', 'II. 비유동자산', 'Non-current Assets', '자산', '차변', 2, '1000000', 'N'],
  ['1210000', '투자자산', 'Investments', '자산', '차변', 3, '1200000', 'N'],
  ['1210100', '출자금', 'Fund Contributions', '자산', '차변', 4, '1210000', 'Y', { required: ['거래처'] }],
  ['1210200', '장기투자증권', 'Long-term Investment Securities', '자산', '차변', 4, '1210000', 'Y'],
  ['1220000', '유형자산', 'Tangible Assets', '자산', '차변', 3, '1200000', 'N'],
  ['1220100', '비품', 'Office Equipment', '자산', '차변', 4, '1220000', 'Y', { nature: '유무형자산', evidence: 'Y' }],
  ['1220200', '감가상각누계액(비품)', 'Accumulated Depreciation - Equipment', '자산', '대변', 4, '1220000', 'Y', { contra: '차감', nature: '유무형자산' }],
  ['2000000', '부채', 'Liabilities', '부채', '대변', 1, null, 'N'],
  ['2100000', 'I. 유동부채', 'Current Liabilities', '부채', '대변', 2, '2000000', 'N'],
  ['2100100', '미지급금', 'Accounts Payable - Other', '부채', '대변', 3, '2100000', 'Y', { required: ['거래처', '거래처계좌번호'], nature: '미결' }],
  ['2100200', '미지급비용', 'Accrued Expenses', '부채', '대변', 3, '2100000', 'Y', { nature: '미결' }],
  ['2100300', '예수금', 'Withholdings', '부채', '대변', 3, '2100000', 'Y'],
  ['2100400', '부가세예수금', 'VAT Payable', '부채', '대변', 3, '2100000', 'Y', { nature: '부가세', evidence: 'Y' }],
  ['3000000', '자본', 'Equity', '자본', '대변', 1, null, 'N'],
  ['3100000', 'I. 자본금', 'Capital Stock', '자본', '대변', 2, '3000000', 'N'],
  ['3100100', '보통주자본금', 'Common Stock', '자본', '대변', 3, '3100000', 'Y'],
  ['3100300', '출자금(자본)', 'Paid-in Contributions', '자본', '대변', 3, '3100000', 'Y'],
  ['3200000', 'II. 자본잉여금', 'Capital Surplus', '자본', '대변', 2, '3000000', 'N'],
  ['3200100', '주식발행초과금', 'Paid-in Capital in Excess of Par', '자본', '대변', 3, '3200000', 'Y'],
  ['4000000', '손익', 'Profit and Loss', '손익', '대변', 1, null, 'N'],
  ['4100000', 'I. 영업수익', 'Operating Revenue', '손익', '대변', 2, '4000000', 'N'],
  ['4100100', '관리보수수익', 'Management Fee Income', '손익', '대변', 3, '4100000', 'Y', { required: ['거래처', '손익부서'] }],
  ['4100200', '이자수익', 'Interest Income', '손익', '대변', 3, '4100000', 'Y', { required: ['계좌번호'] }],
  ['4200000', 'II. 영업비용', 'Operating Expenses', '손익', '차변', 2, '4000000', 'N'],
  ['4200100', '급여', 'Salaries', '손익', '차변', 3, '4200000', 'Y', { required: ['손익부서', '손익사원'] }],
  ['4200200', '지급수수료', 'Commissions Paid', '손익', '차변', 3, '4200000', 'Y', { required: ['거래처', '손익부서'], evidence: 'Y' }],
  ['4200300', '외화환산손실', 'Loss on Foreign Currency Translation', '손익', '차변', 3, '4200000', 'Y', { required: ['통화코드'] }],
];

const toRow = ([code, name, nameEn, cls, dc, level, parent, input, extra]: Seed, i: number): AccountRow => ({
  code, name, nameEn, cls, dc, level, parent, input,
  contra: '일반', use: 'Y', evidence: 'N', required: [], nature: '',
  createdBy: i % 3 === 0 ? BY_A : i % 3 === 1 ? BY_B : BY_C,
  updatedBy: i % 4 === 0 ? BY_C : BY_A,
  ...extra,
});

/** 활성 계정과목 초기 데이터(호출마다 새 배열 — 화면 상태가 원본을 오염시키지 않게) */
export function demoAccounts(): AccountRow[] {
  return SEEDS.map((s, i) => ({ ...toRow(s, i), required: [...(s[8]?.required ?? [])] }));
}

/** 논리삭제된 초기 행 — 삭제이력보기 팝업의 시드. 최종수정자 = 삭제 처리자 */
export function demoDeletedAccounts(): AccountRow[] {
  return [
    { code: '1110900', name: '가지급금', nameEn: 'Suspense Payments', cls: '자산', contra: '일반', dc: '차변', level: 4, parent: '1110000', input: 'Y', use: 'N', evidence: 'N', required: ['거래처'], nature: '미결', createdBy: BY_A, updatedBy: BY_B },
    { code: '3100200', name: '우선주자본금', nameEn: 'Preferred Stock', cls: '자본', contra: '일반', dc: '대변', level: 3, parent: '3100000', input: 'Y', use: 'N', evidence: 'N', required: [], nature: '', createdBy: BY_B, updatedBy: BY_C },
  ];
}
