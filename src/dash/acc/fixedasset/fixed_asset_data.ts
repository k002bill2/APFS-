/* 유무형자산관리(ACC-017) — 코드 목록·행 타입·더미 데이터.
   - 계정구분 = 회계 공용 FUND_ACCOUNTS 앞 2개(설계서 샘플 '예시계정구분A/B' 자리).
   - 자산유형 = 계정성격 '유무형자산' 계정과목(설계서 slide10 컬럼4). 계정과목 관리 더미에는 비품(1220100)만 있어
     나머지 유형·계정코드는 이 파일이 정의한다(계정코드 매핑표 확정 필요 — 설계서 slide15 ④).
   - 변동내역 시드는 fixed_asset_model.commitChange 로 순서대로 쌓는다(산식 스냅샷이 모델과 같은 규칙을 따르게). */
import { FUND_ACCOUNTS, PL_EMPLOYEES } from '../slip/general_journal_data';

export const FA_FUNDS = [FUND_ACCOUNTS[0], FUND_ACCOUNTS[1]] as const;
export type FaFund = typeof FA_FUNDS[number];

export interface AssetType {
  name: string;
  code: string;          // 계정코드(차변 계정)
  life: number;          // 기준내용연수 기본값(년)
  vehicle?: boolean;     // 차량번호 입력 대상
}
export const ASSET_TYPES: Record<FaFund, readonly AssetType[]> = {
  [FA_FUNDS[0]]: [
    { name: '비품', code: '1220100', life: 5 },
    { name: '차량운반구', code: '1220300', life: 5, vehicle: true },
    { name: '소프트웨어', code: '1230100', life: 5 },
  ],
  [FA_FUNDS[1]]: [
    { name: '비품', code: '1220100', life: 5 },
    { name: '집기비품', code: '1220400', life: 5 },
    { name: '시설장치', code: '1220500', life: 8 },
    { name: '소프트웨어', code: '1230100', life: 5 },
  ],
};
export const typesOf = (fund: string): readonly AssetType[] => (FA_FUNDS as readonly string[]).includes(fund) ? ASSET_TYPES[fund as FaFund] : [];
/** 계정구분 미선택(전체)이면 모든 계정구분의 자산유형 이름(중복 제거) */
export const typeNamesOf = (fund: string): string[] =>
  [...new Set((fund ? typesOf(fund) : FA_FUNDS.flatMap((f) => ASSET_TYPES[f])).map((t) => t.name))];
export const findType = (fund: string, name: string): AssetType | undefined => typesOf(fund).find((t) => t.name === name);

export const ACQ_KINDS = ['구입', '중고'] as const;
export type AcqKind = typeof ACQ_KINDS[number];
export const DEPR_KINDS = ['정액법', '정률법'] as const;
export type DeprKind = typeof DEPR_KINDS[number];
export const USER_KINDS = ['개인', '부서', '공용'] as const;
export type UserKind = typeof USER_KINDS[number];
export const CHANGE_KINDS = ['처분', '불용'] as const;
export type ChangeKind = typeof CHANGE_KINDS[number];
export const PROC_KINDS = ['전체', '부분'] as const;
export type ProcKind = typeof PROC_KINDS[number];
export type BaseStatus = '미상각' | '상각완료';
export type AssetStatus = BaseStatus | ChangeKind;
/** 전표결재상태(설계서 slide10 컬럼20) — 전표번호가 없으면 null(미생성) */
export const VOUCHER_STATUSES = ['미상신', '결재중', '승인', '반려'] as const;
export type VoucherStatus = typeof VOUCHER_STATUSES[number];

export const DEPARTMENTS = ['경영지원팀', '투자운용팀', '리스크관리팀', '회계팀'] as const;
export const EMPLOYEES = PL_EMPLOYEES;

/** 자산 원장 행(등록 값 + 상각 값). 수량·잔존가액·자산상태의 현재값은 변동내역을 반영해 모델이 파생한다 */
export interface FixedAsset {
  id: string;
  assetNo: string;          // 취득일 YYYYMMDD + 일련번호 4자리
  fund: FaFund;
  assetType: string;
  name: string;
  model: string;
  purchase: number;         // 구입가액(A)
  extra: number;            // 부대비용(B)
  qty: number;              // 취득 수량
  unitPrice: number;
  spec: string;
  unit: string;
  acqKind: AcqKind;
  acqDate: string;
  supplier: string;
  vehicleNo: string;
  maker: string;
  makeDate: string;
  deprKind: DeprKind;
  life: number;
  userKind: UserKind;
  userName: string;         // 개인 = 사원 · 부서 = 부서명 · 공용 = ''
  location: string;
  memo: string;
  files: string;            // DocumentsField 값(첨부 파일명 목록 문자열)
  prevAccum: number;        // 전기말상각누계액
  accum: number;            // 감가상각누계액(기준년월까지)
  baseStatus: BaseStatus;
  slipNo: string | null;
  approval: VoucherStatus | null;
}

/** 변동내역(처분·불용) — 저장 시점의 산식 스냅샷을 함께 가진다 */
export interface AssetChange {
  id: string;
  seq: number;              // 등록 순서(같은 자산의 최근 변동 판정)
  assetId: string;
  date: string;
  kind: ChangeKind;
  proc: ProcKind;
  qty: number;              // 처리수량(C)
  sale: number;             // 매각액(E) — 불용은 0
  bookBefore: number;       // 미상각잔액(A)
  qtyBefore: number;        // 잔여수량(B)
  decrease: number;         // 취득가액 감소액(F = A ÷ B × C)
  deprPart: number;         // 개별상각액(D)
  prevAccumPart: number;    // 전기말누계액(G)
  gain: number;             // 처분손익(H = D − E − G + F)
  costPart: number;         // 분개 — 대변 자산 계정(취득원가 해당분)
  accumPart: number;        // 분개 — 차변 감가상각누계액(= costPart − F)
  memo: string;
  slipNo: string | null;
  approval: VoucherStatus | null;
}

type Seed = [no: string, fi: 0 | 1, type: string, name: string, model: string, purchase: number, extra: number, qty: number,
  acqKind: AcqKind, deprKind: DeprKind, userKind: UserKind, userName: string, prevAccum: number, accum: number,
  slip?: [string, VoucherStatus]];

const SEEDS: Seed[] = [
  ['202210180001', 0, '비품', '자산명2', 'AX-200', 22_300, 0, 1, '구입', '정률법', '공용', '', 9_397, 9_397],
  ['202210180002', 0, '비품', '자산명', 'AX-100', 1_690, 0, 1, '구입', '정액법', '개인', '김민준', 1_122, 1_122],
  ['202303150001', 0, '비품', '사무용 노트북', 'NT-15', 2_400_000, 60_000, 4, '구입', '정액법', '부서', '투자운용팀', 1_312_000, 1_640_000, ['20230320-001', '승인']],
  ['202305020001', 0, '비품', '회의실 의자', 'CH-01', 1_800_000, 0, 10, '구입', '정액법', '부서', '경영지원팀', 900_000, 1_200_000],
  ['202401100001', 0, '차량운반구', '업무용 승용차', 'SONATA', 32_500_000, 1_200_000, 1, '구입', '정률법', '공용', '', 15_202_000, 22_410_000, ['20240112-001', '승인']],
  ['202406030001', 0, '차량운반구', '현장점검 승합차', 'STARIA', 41_000_000, 900_000, 1, '중고', '정액법', '부서', '리스크관리팀', 4_190_000, 11_173_000],
  ['202402200001', 0, '소프트웨어', '회계 ERP 라이선스', 'ERP v3', 18_000_000, 0, 1, '구입', '정액법', '공용', '', 5_400_000, 9_000_000, ['20240221-001', '결재중']],
  ['202508110001', 0, '소프트웨어', '문서보안 솔루션', 'DRM-9', 6_600_000, 0, 1, '구입', '정액법', '공용', '', 0, 1_100_000],
  ['202304170001', 1, '비품', '복합기', 'MF-7200', 4_200_000, 150_000, 1, '구입', '정액법', '공용', '', 2_175_000, 2_755_000],
  ['202304170002', 1, '비품', '프로젝터', 'PJ-30', 1_350_000, 0, 2, '구입', '정률법', '부서', '회계팀', 980_000, 1_088_000],
  ['202209050001', 1, '집기비품', '사무용 책상', 'DK-12', 3_600_000, 240_000, 12, '구입', '정액법', '부서', '경영지원팀', 2_560_000, 3_072_000],
  ['202509010001', 1, '집기비품', '서고 캐비닛', 'CB-04', 2_100_000, 0, 6, '구입', '정액법', '부서', '회계팀', 0, 140_000],
  ['202112200001', 1, '시설장치', '사무실 인테리어', '-', 48_000_000, 2_000_000, 1, '구입', '정액법', '공용', '', 25_000_000, 31_250_000, ['20211222-001', '승인']],
  ['202407150001', 1, '소프트웨어', '그룹웨어', 'GW-5', 12_000_000, 0, 1, '구입', '정액법', '공용', '', 1_000_000, 3_400_000],
  ['202610050001', 1, '소프트웨어', '전자결재 모듈', 'EA-2', 4_800_000, 0, 1, '구입', '정액법', '공용', '', 0, 80_000, ['20261006-001', '미상신']],
];

const SUPPLIERS = ['(주)가람팜텍', '들빛수산(주)', '온새미식품(주)'];
const LOCATIONS = ['본사 3층 사무실', '본사 4층 회의실', '본사 지하 주차장', '서버실'];

const isoOf = (no: string) => `${no.slice(0, 4)}-${no.slice(4, 6)}-${no.slice(6, 8)}`;

/** 자산 원장 초기 데이터(호출마다 새 배열) */
export function demoAssets(): FixedAsset[] {
  return SEEDS.map(([no, fi, type, name, model, purchase, extra, qty, acqKind, deprKind, userKind, userName, prevAccum, accum, slip], i) => {
    const fund = FA_FUNDS[fi];
    const t = ASSET_TYPES[fund].find((x) => x.name === type);
    const cost = purchase + extra;
    return {
      id: 'fa-' + String(i + 1).padStart(3, '0'),
      assetNo: no, fund, assetType: type, name, model,
      purchase, extra, qty, unitPrice: Math.round(purchase / qty),
      spec: '', unit: qty > 1 ? '개' : '대',
      acqKind, acqDate: isoOf(no),
      supplier: SUPPLIERS[i % SUPPLIERS.length], vehicleNo: t?.vehicle ? `12가 ${String(3400 + i)}` : '',
      maker: '', makeDate: '',
      deprKind, life: t?.life ?? 5,
      userKind, userName,
      location: LOCATIONS[i % LOCATIONS.length], memo: '', files: '',
      prevAccum, accum,
      baseStatus: accum >= cost ? '상각완료' : '미상각',
      slipNo: slip ? slip[0] : null, approval: slip ? slip[1] : null,
    };
  });
}

/** 변동내역 시드 — [자산번호, 변동일, 변동구분, 처리구분, 처리수량, 매각액, 전표] (모델이 산식으로 펼친다) */
export const CHANGE_SEEDS: [string, string, ChangeKind, ProcKind, number, number, [string, VoucherStatus]?][] = [
  ['202210180002', '2023-05-02', '처분', '전체', 1, 500],
  ['202305020001', '2025-03-14', '처분', '부분', 3, 150_000, ['20250317-001', '승인']],
  ['202305020001', '2026-02-10', '불용', '부분', 2, 0],
  ['202209050001', '2026-06-30', '불용', '부분', 4, 0, ['20260701-001', '반려']],
  ['202304170002', '2026-09-08', '처분', '부분', 1, 200_000],
];
