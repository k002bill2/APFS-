/* 감가상각비처리(ACC-018) 더미 데이터 — 상각 대상 자산 원장 · 자산유형별 계정 매핑 기본값 · 매핑에 쓰는 계정과목.
   상각액·전기말상각누계액·미상각잔액·종료일은 저장하지 않는다 — depreciation_model 이 기준년월마다 계산한다
   (기준년월 연도가 바뀌면 전기말 누계도 달라져야 해서). 설계서 slide 10 예시 2행 = FA-0001(정액법)·FA-0002(정률법). */
import type { AccountItem } from '../account_data';
import { FUND_ACCOUNTS } from '../slip/general_journal_data';

/** 계정구분 — 일반전표 계정구분 원장의 앞 2개(데모). 필수 칩이라 '전체'가 없다 */
export const DEPR_FUND_ACCOUNTS = [FUND_ACCOUNTS[0], FUND_ACCOUNTS[1]] as const;
export type DeprFundAccount = typeof DEPR_FUND_ACCOUNTS[number];

/** 자산유형 — 계정과목 설정(slide 12) 행 순서 그대로 */
export const ASSET_TYPES = ['건물', '차량운반구', '집기비품', '시설장치', '소프트웨어'] as const;
export type AssetType = typeof ASSET_TYPES[number];

export type DeprMethod = '정액법' | '정률법';

export interface DeprAsset {
  id: string;
  account: DeprFundAccount;
  assetType: AssetType;
  assetNo: string;
  name: string;
  acqDate: string;       // YYYY-MM-DD
  life: number;          // 내용년수(년)
  method: DeprMethod;
  cost: number;          // 취득금액
  residual: number;      // 잔존가치(정액법 산식 · 상각 하한)
}

const [FUND, INVEST] = DEPR_FUND_ACCOUNTS;
const a = (id: string, account: DeprFundAccount, assetType: AssetType, assetNo: string, name: string, acqDate: string, life: number, method: DeprMethod, cost: number, residual = 0): DeprAsset =>
  ({ id, account, assetType, assetNo, name, acqDate, life, method, cost, residual });

export const DEPR_ASSETS: readonly DeprAsset[] = [
  /* slide 10 예시 — 기준년월 2026-10: 상각액 1,000,000 / 206,333, 미상각잔액 38,000,000 / 3,426,670 */
  a('fa-0001', FUND, '집기비품', 'FA-0001', '업무용 장비', '2025-01-02', 5, '정액법', 60_000_000),
  a('fa-0002', FUND, '집기비품', 'FA-0002', '서버 장비', '2025-01-02', 5, '정률법', 10_000_000),
  a('fa-0003', FUND, '시설장치', 'FA-0003', '본사 사무실 인테리어', '2023-07-01', 5, '정액법', 45_000_000),
  a('fa-0004', FUND, '차량운반구', 'FA-0004', '업무용 차량(중형 승용)', '2024-03-15', 5, '정률법', 32_000_000),
  a('fa-0005', FUND, '소프트웨어', 'FA-0005', '회계관리 소프트웨어', '2026-04-01', 5, '정액법', 24_000_000),
  /* 내용년수 경과(2025-08-31 종료) — 상각액 0 으로 표시 */
  a('fa-0006', FUND, '집기비품', 'FA-0006', '업무용 노트북(20대)', '2021-09-01', 4, '정액법', 30_000_000),
  a('fa-0007', FUND, '건물', 'FA-0007', '지역 사무소 건물', '2020-01-02', 40, '정액법', 1_200_000_000),
  a('fa-0008', INVEST, '소프트웨어', 'FA-0008', '투자심사 지원 시스템', '2025-06-01', 5, '정액법', 50_000_000),
  a('fa-0009', INVEST, '시설장치', 'FA-0009', '회의실 영상회의 설비', '2024-01-02', 5, '정률법', 18_000_000),
  a('fa-0010', INVEST, '차량운반구', 'FA-0010', '업무용 차량(승합)', '2025-02-01', 5, '정액법', 42_000_000, 2_000_000),
  a('fa-0011', INVEST, '집기비품', 'FA-0011', '사무용 집기 일괄', '2022-05-01', 5, '정률법', 9_000_000),
  /* 취득일이 기준년월(2026-10) 뒤 — 그 기준년월 조회에서 제외, 2026-12 부터 보인다 */
  a('fa-0012', INVEST, '집기비품', 'FA-0012', '신규 서버랙', '2026-12-01', 5, '정액법', 15_000_000),
];

/* ── 계정과목 설정(E03) ── */
export interface AcctRef { code: string; name: string }
export interface AcctMapping { assetType: AssetType; debit: AcctRef; credit: AcctRef }

/** 기본 매핑 — slide 12 표 그대로 */
export const DEFAULT_MAPPING: readonly AcctMapping[] = [
  { assetType: '건물', debit: { code: '8120100', name: '감가상각비' }, credit: { code: '1213100', name: '감가상각누계액(건물)' } },
  { assetType: '차량운반구', debit: { code: '8120100', name: '감가상각비' }, credit: { code: '1215100', name: '감가상각누계액(차량운반구)' } },
  { assetType: '집기비품', debit: { code: '8120100', name: '감가상각비' }, credit: { code: '1217100', name: '감가상각누계액(집기비품)' } },
  { assetType: '시설장치', debit: { code: '8120100', name: '감가상각비' }, credit: { code: '1219100', name: '감가상각누계액(시설장치)' } },
  { assetType: '소프트웨어', debit: { code: '8120200', name: '무형자산상각비' }, credit: { code: '1231000', name: '소프트웨어' } },
];

/** 매핑 계정과목 — 공용 계정과목(account_data)에 없는 slide 12 코드. 검색 팝업에는 공용 목록과 합쳐 넘긴다(공용 파일은 건드리지 않음) */
const item = (code: string, name: string, drcr: AccountItem['drcr'], cls: AccountItem['cls']): AccountItem => ({ code, name, inputYn: 'Y', drcr, cls });
export const DEPR_ACCOUNTS: readonly AccountItem[] = [
  item('1213100', '감가상각누계액(건물)', '대변', '자산'),
  item('1215100', '감가상각누계액(차량운반구)', '대변', '자산'),
  item('1217100', '감가상각누계액(집기비품)', '대변', '자산'),
  item('1219100', '감가상각누계액(시설장치)', '대변', '자산'),
  item('1231000', '소프트웨어', '차변', '자산'),
  item('8120100', '감가상각비', '차변', '손익'),
  item('8120200', '무형자산상각비', '차변', '손익'),
];
