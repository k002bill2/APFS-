/* 농식품경영체(ACC-023 경영체 정보 조회 · ACC-024 IR정보 조회) — 더미 데이터.
   기업·운용사·자펀드·사람 이름은 전부 가상 명칭이다(실존 기업명을 피했다).
   - 경영체 18건: 기본정보 + 재무 3개년(2023.12/2024.12/2025.12, 백만원) + 주주 3~5명.
     자본총계 = 자산총계 − 부채총계로 만든다(값을 따로 적어 어긋나지 않게).
     지분율은 발행주식 100,000주 기준 보유주식수/1,000(소수 1자리) — 주주 합계가 100.0 이 아닌 경영체 1건(EN07, 주요 주주만 기재)을 둔다.
     설립 첫해 매출 0인 경영체 1건(EN12, 2023.12) — 영업이익률 N/A('-') 표시를 보이기 위함.
   - IR 10건: 참가경영체는 경영체 id 로 참조한다. 참가수는 화면이 참가 배열 길이로 센다(여기에 숫자를 적지 않는다). */

export type CorpKind = '법인' | '개인' | '조합';
export type StockKind = '상장' | '비상장';
export type WomenYn = '해당' | '미해당';
export type Yn = 'Y' | 'N';
export type VentureType = '신기술' | '연구개발' | '벤처투자';
export type HolderRelation = '대표이사' | '임원' | '투자조합' | '기타';
export type StockType = '보통주' | '우선주';

export const CORP_KINDS: readonly CorpKind[] = ['법인', '개인', '조합'];
export const STOCK_KINDS: readonly StockKind[] = ['상장', '비상장'];
export const WOMEN_YN: readonly WomenYn[] = ['해당', '미해당'];
export const YN: readonly Yn[] = ['Y', 'N'];
export const FIN_YMS = ['2023.12', '2024.12', '2025.12'] as const;

/** 재무 1개년(단위 백만원) */
export interface Financial {
  ym: string;            // 기준년월 'YYYY.MM'
  assets: number;        // 자산총계
  liabilities: number;   // 부채총계
  equity: number;        // 자본총계
  revenue: number;       // 매출액
  opIncome: number;      // 영업이익
  netIncome: number;     // 당기순이익
}

export interface Shareholder {
  name: string;
  relation: HolderRelation;
  stockType: StockType;
  shares: number;        // 보유주식수
  ratio: number;         // 지분율(%) 소수 1자리
  parValue: number;      // 액면가(원)
  acquiredAt: string;    // 취득일 'YYYY-MM-DD'
  note: string;          // 비고('' = 없음)
}

export interface AgriEntity {
  id: string;
  bizNo: string;          // 사업자번호 '000-00-00000'
  name: string;           // 기업명
  nameEn: string;         // 기업명(영문)
  ceo: string;            // 대표자
  corpKind: CorpKind;     // 기업구분
  stockKind: StockKind;   // 주식구분 = 상세보기 '상장구분'(설계서 코드 '상장'/'비상장' — 같은 값)
  womenYn: WomenYn;       // 여성기업여부
  auditYn: Yn;            // 외부감사여부
  useYn: Yn;              // 사용여부
  createdBy: string;      // 최초등록자
  updatedBy: string;      // 최종수정자
  foundedAt: string;      // 설립일자 'YYYY-MM-DD'
  industry: string;       // 표준산업분류 '작물재배업 (011)'
  fiscalMonth: string;    // 결산월 '12월'
  employees: number;      // 종업원수(명)
  ventureType: VentureType | null;   // 벤처유형(null = 미인증 '-')
  mainProduct: string;    // 주요제품
  gp: string;             // 소속 운용사
  fund: string;           // 소속 자펀드
  financials: Financial[];
  shareholders: Shareholder[];
  govSupports: GovSupport[];   // 정부지원사업(설계서 v1.1 — 농식품 투자정보 플랫폼 API 연계, 데모)
  materials: BizMaterial[];    // 사업계획서·홍보자료(같은 출처, 데모)
}

export type GovSupportType = '보조금' | 'R&D' | '바우처' | '융자';
export type GovSupportStatus = '예정' | '진행' | '완료' | '취소';
export const GOV_SUPPORT_STATUSES: readonly GovSupportStatus[] = ['예정', '진행', '완료', '취소'];

/** 정부지원사업 1건(지원금액 단위 백만원) */
export interface GovSupport {
  id: string;
  year: string;            // 사업연도 'YYYY'
  name: string;            // 사업명
  agency: string;          // 주관기관
  supportType: GovSupportType;
  period: string;          // 지원기간 'YYYY.MM~YYYY.MM'
  amount: number;          // 지원금액(백만원)
  status: GovSupportStatus;
  note: string;            // 비고('' = 없음)
}

export type MaterialKind = '사업계획서' | '홍보자료';
/** 사업계획서·홍보자료 1건 */
export interface BizMaterial {
  id: string;
  kind: MaterialKind;
  title: string;           // 자료명
  fileName: string;        // 파일명
  updatedAt: string;       // 수정일자 'YYYY.MM.DD'
}

export type ConsultKind = '집합' | '개별';
export type IrConsultType = '집합IR' | '개별IR';
export type IrHost = '농금원' | '운용사';

export interface IrParticipant {
  entityId: string;       // AgriEntity.id
  consultDate: string;    // 상담일자 'YYYY-MM-DD'
  consultKind: ConsultKind;
  opinion: string;        // 상담의견
  manager: string;        // 담당자
}

export interface IrEvent {
  id: string;
  name: string;           // IR명
  date: string;           // IR일자 'YYYY-MM-DD'
  place: string;          // 장소
  host: IrHost;           // 주관(주관기관)
  gp: string;             // 운용사
  fund: string;           // 자펀드
  consultType: IrConsultType;   // 상담구분
  manager: string;        // 담당자
  useYn: Yn;              // 사용여부(그리드 열 없음 — 상세필터 전용)
  regBy: string;          // 등록자
  regAt: string;          // 등록일 'YYYY-MM-DD'
  attachment: string | null;    // 첨부파일명(null = 없음)
  note: string;           // 비고
  participants: IrParticipant[];
}

/* ── 운용사 → 자펀드(상세필터 연동 옵션의 정본) ── */
export const GP_FUNDS: Readonly<Record<string, readonly string[]>> = {
  '그린씨드인베스트먼트': ['그린씨드 스마트팜 1호 조합', '그린씨드 애그테크 2호 조합'],
  '한결벤처파트너스': ['한결 농식품 성장 조합', '한결 푸드테크 투자조합'],
  '푸른들자산운용': ['푸른들 청년창업 농식품 조합'],
  '바다숲캐피탈': ['바다숲 수산혁신 1호 조합', '바다숲 블루푸드 2호 조합'],
};
export const GPS: readonly string[] = Object.keys(GP_FUNDS);
export const ALL_FUNDS: readonly string[] = GPS.flatMap((g) => GP_FUNDS[g]);

const STAFF = ['김민준', '이서연', '박지훈', '최유나'] as const;

/* ── 경영체 시드 — scale = 2025.12 자산총계(백만원) 기준 규모, debt = 부채 비중, margin = 영업이익률 대략값 ── */
type EntSeed = {
  bizNo: string; name: string; nameEn: string; ceo: string; corp: CorpKind; stock: StockKind;
  women: WomenYn; audit: Yn; use: Yn; founded: string; industry: string; emp: number; venture: VentureType | null;
  product: string; gp: number; fund: number; scale: number; debt: number; margin: number;
};

const SEEDS: EntSeed[] = [
  { bizNo: '101-81-23456', name: '푸른들팜(주)', nameEn: 'Pureundeul Farm Co., Ltd.', ceo: '정하늘', corp: '법인', stock: '비상장', women: '미해당', audit: 'Y', use: 'Y', founded: '2016-03-14', industry: '작물재배업 (011)', emp: 42, venture: '벤처투자', product: '수경재배 엽채류', gp: 0, fund: 0, scale: 18_400, debt: 0.42, margin: 0.08 },
  { bizNo: '214-86-34567', name: '해담수산(주)', nameEn: 'Haedam Fisheries Co., Ltd.', ceo: '윤바다', corp: '법인', stock: '비상장', women: '미해당', audit: 'Y', use: 'Y', founded: '2012-07-02', industry: '수산물 가공 및 저장 처리업 (102)', emp: 88, venture: null, product: '냉동 전복·해삼 가공품', gp: 3, fund: 0, scale: 32_600, debt: 0.55, margin: 0.06 },
  { bizNo: '312-82-45678', name: '새벽농원 영농조합법인', nameEn: 'Saebyeok Farming Association', ceo: '오정민', corp: '조합', stock: '비상장', women: '해당', audit: 'N', use: 'Y', founded: '2018-02-20', industry: '작물재배업 (011)', emp: 17, venture: null, product: '유기농 토마토·파프리카', gp: 2, fund: 0, scale: 4_200, debt: 0.38, margin: 0.05 },
  { bizNo: '120-87-56789', name: '그린루트바이오(주)', nameEn: 'GreenRoot Bio Inc.', ceo: '한서진', corp: '법인', stock: '상장', women: '해당', audit: 'Y', use: 'Y', founded: '2011-09-30', industry: '연구개발업 (701)', emp: 136, venture: '연구개발', product: '식물성 대체단백 원료', gp: 1, fund: 1, scale: 96_800, debt: 0.31, margin: 0.11 },
  { bizNo: '608-90-11223', name: '청정한우목장', nameEn: 'Cheongjeong Hanwoo Ranch', ceo: '강도윤', corp: '개인', stock: '비상장', women: '미해당', audit: 'N', use: 'Y', founded: '2009-05-11', industry: '축산업 (012)', emp: 9, venture: null, product: '한우 번식·비육', gp: 0, fund: 1, scale: 2_900, debt: 0.61, margin: 0.04 },
  { bizNo: '135-86-67890', name: '바른곡물(주)', nameEn: 'Bareun Grain Co., Ltd.', ceo: '서지후', corp: '법인', stock: '비상장', women: '미해당', audit: 'Y', use: 'Y', founded: '2014-11-03', industry: '곡물 가공품 제조업 (106)', emp: 64, venture: '신기술', product: '발아현미·잡곡 가공품', gp: 1, fund: 0, scale: 21_300, debt: 0.47, margin: 0.07 },
  { bizNo: '220-88-78901', name: '스마트팜랩(주)', nameEn: 'SmartFarm Lab Inc.', ceo: '임수아', corp: '법인', stock: '비상장', women: '해당', audit: 'Y', use: 'Y', founded: '2019-06-17', industry: '연구개발업 (701)', emp: 38, venture: '연구개발', product: '수직농장 환경제어 솔루션', gp: 0, fund: 1, scale: 12_700, debt: 0.29, margin: 0.03 },
  { bizNo: '409-81-89012', name: '해오름식품(주)', nameEn: 'Haeoreum Foods Co., Ltd.', ceo: '조은별', corp: '법인', stock: '상장', women: '미해당', audit: 'Y', use: 'Y', founded: '2010-04-22', industry: '과실, 채소 가공 및 저장 처리업 (103)', emp: 112, venture: null, product: '과채 착즙 주스', gp: 1, fund: 1, scale: 58_200, debt: 0.52, margin: 0.09 },
  { bizNo: '503-82-90123', name: '산들버섯 영농조합법인', nameEn: 'Sandeul Mushroom Farming Association', ceo: '배하린', corp: '조합', stock: '비상장', women: '미해당', audit: 'N', use: 'N', founded: '2015-08-08', industry: '작물재배업 (011)', emp: 21, venture: null, product: '표고·느타리버섯', gp: 2, fund: 0, scale: 3_600, debt: 0.44, margin: 0.06 },
  { bizNo: '214-87-01234', name: '온새미로푸드(주)', nameEn: 'Onsaemiro Food Inc.', ceo: '신예린', corp: '법인', stock: '비상장', women: '해당', audit: 'Y', use: 'Y', founded: '2017-01-25', industry: '기타 식품 제조업 (107)', emp: 73, venture: '벤처투자', product: '간편식 반찬·밀키트', gp: 1, fund: 1, scale: 26_900, debt: 0.58, margin: 0.05 },
  { bizNo: '305-86-12345', name: '대지애그테크(주)', nameEn: 'Daeji Agtech Co., Ltd.', ceo: '노태윤', corp: '법인', stock: '비상장', women: '미해당', audit: 'Y', use: 'Y', founded: '2020-10-05', industry: '농업 및 임업용 기계 제조업 (2921)', emp: 29, venture: '신기술', product: '자율주행 방제 드론', gp: 0, fund: 0, scale: 9_800, debt: 0.36, margin: 0.02 },
  { bizNo: '617-88-23456', name: '물빛양식(주)', nameEn: 'Mulbit Aquaculture Inc.', ceo: '황지안', corp: '법인', stock: '비상장', women: '미해당', audit: 'N', use: 'Y', founded: '2022-03-02', industry: '양식 어업 (032)', emp: 14, venture: '연구개발', product: '순환여과식 새우 양식', gp: 3, fund: 1, scale: 5_400, debt: 0.49, margin: 0.04 },
  { bizNo: '128-81-34567', name: '다온발효(주)', nameEn: 'Daon Fermentation Co., Ltd.', ceo: '문서하', corp: '법인', stock: '비상장', women: '해당', audit: 'Y', use: 'Y', founded: '2013-12-12', industry: '기타 식품 제조업 (107)', emp: 51, venture: null, product: '전통 장류·발효소스', gp: 2, fund: 0, scale: 15_200, debt: 0.4, margin: 0.07 },
  { bizNo: '406-82-45678', name: '초록잎허브 영농조합법인', nameEn: 'Chorokip Herb Farming Association', ceo: '양소율', corp: '조합', stock: '비상장', women: '해당', audit: 'N', use: 'Y', founded: '2016-05-19', industry: '작물재배업 (011)', emp: 12, venture: null, product: '허브·식용꽃', gp: 2, fund: 0, scale: 2_300, debt: 0.33, margin: 0.06 },
  { bizNo: '712-90-56789', name: '한마루축산', nameEn: 'Hanmaru Livestock', ceo: '권민재', corp: '개인', stock: '비상장', women: '미해당', audit: 'N', use: 'N', founded: '2008-02-28', industry: '축산업 (012)', emp: 7, venture: null, product: '양돈', gp: 0, fund: 1, scale: 3_100, debt: 0.66, margin: 0.03 },
  { bizNo: '113-86-67890', name: '가람식품(주)', nameEn: 'Garam Food Co., Ltd.', ceo: '홍유진', corp: '법인', stock: '비상장', women: '미해당', audit: 'Y', use: 'Y', founded: '2011-06-30', industry: '도축, 육류 가공 및 저장 처리업 (101)', emp: 95, venture: null, product: '육가공 HMR', gp: 1, fund: 0, scale: 41_500, debt: 0.57, margin: 0.06 },
  { bizNo: '217-87-78901', name: '누리펫푸드(주)', nameEn: 'Nuri Pet Food Inc.', ceo: '전하은', corp: '법인', stock: '비상장', women: '해당', audit: 'Y', use: 'Y', founded: '2018-09-14', industry: '동물용 사료 및 조제식품 제조업 (108)', emp: 46, venture: '벤처투자', product: '국산 원료 반려동물 사료', gp: 3, fund: 1, scale: 13_900, debt: 0.45, margin: 0.08 },
  { bizNo: '514-90-89012', name: '별빛딸기농장', nameEn: 'Byeolbit Strawberry Farm', ceo: '최다인', corp: '개인', stock: '비상장', women: '해당', audit: 'N', use: 'Y', founded: '2019-11-21', industry: '작물재배업 (011)', emp: 6, venture: null, product: '설향 딸기', gp: 2, fund: 0, scale: 1_700, debt: 0.5, margin: 0.05 },
];

/* 재무 3개년 — 2025.12 규모에서 거꾸로(2024 = ×0.88, 2023 = ×0.77). 매출 = 자산의 0.9배, 순이익 = 영업이익의 0.7배.
   부채 비중은 해마다 다르게(경영체별 오프셋 × 연도 계수) — 단일 배율이면 부채비율이 3개년 같게 나온다.
   반올림은 백만원 정수. 자본총계 = 자산 − 부채 */
const GROWTH = [0.77, 0.88, 1] as const;
/* 연도별 부채 비중 가감(2023·2024·2025) — 경영체마다 3가지 추세(감소·증가·등락)를 돌린다 */
const DEBT_DRIFT = [[0.08, 0.04, 0], [-0.06, -0.03, 0], [0.05, -0.04, 0]] as const;
function financials(s: EntSeed, idx: number, noRevenue2023: boolean): Financial[] {
  const drift = DEBT_DRIFT[idx % DEBT_DRIFT.length];
  return FIN_YMS.map((ym, i) => {
    const assets = Math.round(s.scale * GROWTH[i]);
    const liabilities = Math.round(assets * (s.debt + drift[i]));
    const revenue = noRevenue2023 && i === 0 ? 0 : Math.round(assets * 0.9);
    /* 영업이익: 마지막 해 margin, 그 이전 해는 조금 낮게. 첫해 매출 0 이면 영업손실 */
    const opIncome = revenue === 0 ? -Math.round(assets * 0.06) : Math.round(revenue * (s.margin - (2 - i) * 0.01));
    return { ym, assets, liabilities, equity: assets - liabilities, revenue, opIncome, netIncome: Math.round(opIncome * 0.7) };
  });
}

const PEOPLE = ['김태오', '이나래', '박선우', '정다빈', '오세린', '유건우', '남궁찬', '장하율'] as const;

/* 주주 — 발행주식 100,000주 기준. ratio = shares / 1,000.
   variant 로 3~5명 구성을 돌린다. EN07 은 주요 주주만 기재(합계 98.5) */
function shareholders(s: EntSeed, idx: number): Shareholder[] {
  const fund = SEEDS_FUND(s);
  const par = s.corp === '법인' ? 500 : 5_000;
  const a = PEOPLE[idx % PEOPLE.length]; const b = PEOPLE[(idx + 3) % PEOPLE.length];
  const sets: [string, HolderRelation, StockType, number, string, string][][] = [
    [[s.ceo, '대표이사', '보통주', 52_300, s.founded, '최대주주'], [a, '임원', '보통주', 12_700, '2019-03-02', ''], [fund, '투자조합', '우선주', 35_000, '2023-06-15', '상환전환우선주']],
    [[s.ceo, '대표이사', '보통주', 41_000, s.founded, '최대주주'], [a, '임원', '보통주', 9_500, '2018-07-20', ''], [b, '기타', '보통주', 4_500, '2021-01-11', '엔젤투자'], [fund, '투자조합', '우선주', 45_000, '2024-02-28', '전환우선주']],
    [[s.ceo, '대표이사', '보통주', 38_200, s.founded, '최대주주'], [a, '임원', '보통주', 8_800, '2017-05-09', ''], [b, '임원', '보통주', 6_000, '2020-09-01', ''], ['우리사주조합', '기타', '보통주', 7_000, '2022-04-01', ''], [fund, '투자조합', '우선주', 40_000, '2023-11-30', '상환전환우선주']],
  ];
  return sets[idx % sets.length].map(([name, relation, stockType, shares, acquiredAt, note]) =>
    ({ name, relation, stockType, shares, ratio: shares / 1_000, parValue: par, acquiredAt, note }));
}
const SEEDS_FUND = (s: EntSeed) => GP_FUNDS[GPS[s.gp]][s.fund];

/* ── 정부지원사업·자료 풀 — 경영체 순번으로 0~4건씩 돌린다. EN18 은 둘 다 0건(빈 그리드 확인용) ── */
type GovSeed = Omit<GovSupport, 'id'>;
const GOV_POOL: GovSeed[] = [
  { year: '2025', name: '스마트팜 ICT 융복합 확산사업', agency: '농림축산식품부', supportType: '보조금', period: '2025.03~2025.12', amount: 180, status: '진행', note: '' },
  { year: '2024', name: '농식품 기술사업화 지원사업', agency: '농업기술실용화재단', supportType: 'R&D', period: '2024.04~2025.03', amount: 250, status: '완료', note: '성과평가 우수' },
  { year: '2026', name: '농식품 수출 바우처', agency: '한국농수산식품유통공사', supportType: '바우처', period: '2026.03~2026.12', amount: 60, status: '예정', note: '' },
  { year: '2023', name: '농식품 벤처 육성자금', agency: '농림수산식품교육문화정보원', supportType: '융자', period: '2023.06~2026.05', amount: 400, status: '진행', note: '거치 2년' },
  { year: '2024', name: '수산식품 가공설비 현대화사업', agency: '해양수산부', supportType: '보조금', period: '2024.02~2024.11', amount: 320, status: '완료', note: '' },
  { year: '2025', name: '농식품 창업기업 성장지원', agency: '농업기술실용화재단', supportType: 'R&D', period: '2025.05~2026.04', amount: 150, status: '취소', note: '사업계획 변경으로 협약 해지' },
  { year: '2026', name: '푸드테크 실증 지원사업', agency: '농림축산식품부', supportType: 'R&D', period: '2026.04~2027.03', amount: 200, status: '예정', note: '' },
];
const MAT_POOL: Omit<BizMaterial, 'id'>[] = [
  { kind: '사업계획서', title: '2026년 사업계획서', fileName: '2026_사업계획서.pdf', updatedAt: '2026.01.15' },
  { kind: '홍보자료', title: '회사소개서(국문)', fileName: '회사소개서_국문.pdf', updatedAt: '2025.11.20' },
  { kind: '홍보자료', title: '제품 카탈로그', fileName: '제품_카탈로그.pdf', updatedAt: '2025.09.03' },
  { kind: '사업계획서', title: '중장기 성장전략 보고서', fileName: '중장기_성장전략.pptx', updatedAt: '2025.03.10' },
  { kind: '홍보자료', title: 'IR 발표자료', fileName: 'IR_발표자료.pdf', updatedAt: '2026.04.02' },
];
/* 경영체 순번 → 건수(0~4). EN18(i=17) 은 0 */
const govCount = (i: number) => (i === 17 ? 0 : i % 5);
const matCount = (i: number) => (i === 17 ? 0 : (i + 2) % 5);
function govSupports(id: string, i: number): GovSupport[] {
  return Array.from({ length: govCount(i) }, (_, k) => ({ ...GOV_POOL[(i + k) % GOV_POOL.length], id: `${id}-G${String(k + 1)}` }));
}
function materials(id: string, i: number): BizMaterial[] {
  return Array.from({ length: matCount(i) }, (_, k) => ({ ...MAT_POOL[(i + k) % MAT_POOL.length], id: `${id}-M${String(k + 1)}` }));
}

/** 경영체 18건(원본 불변 — 호출마다 새 배열) */
export function demoEntities(): AgriEntity[] {
  return SEEDS.map((s, i) => {
    const id = `EN${String(i + 1).padStart(2, '0')}`;
    let holders = shareholders(s, i);
    /* EN07 — 주요 주주만 기재(소액주주 1.5% 미기재) → 합계 98.5, 화면에 경고 */
    if (id === 'EN07') holders = holders.map((h) => (h.relation === '대표이사' ? { ...h, shares: h.shares - 1_500, ratio: (h.shares - 1_500) / 1_000 } : h));
    return {
      id, bizNo: s.bizNo, name: s.name, nameEn: s.nameEn, ceo: s.ceo, corpKind: s.corp, stockKind: s.stock,
      womenYn: s.women, auditYn: s.audit, useYn: s.use,
      createdBy: STAFF[i % STAFF.length], updatedBy: STAFF[(i + 1) % STAFF.length],
      foundedAt: s.founded, industry: s.industry, fiscalMonth: '12월', employees: s.emp, ventureType: s.venture,
      mainProduct: s.product, gp: GPS[s.gp], fund: SEEDS_FUND(s),
      financials: financials(s, i, id === 'EN12'), shareholders: holders,
      govSupports: govSupports(id, i), materials: materials(id, i),
    };
  });
}

/* ── IR 10건 ── */
const p = (entityId: string, consultDate: string, consultKind: ConsultKind, opinion: string, manager: string): IrParticipant =>
  ({ entityId, consultDate, consultKind, opinion, manager });

const IRS: IrEvent[] = [
  { id: 'IR01', name: '2026 상반기 스마트팜 투자설명회', date: '2026-04-16', place: '서울 aT센터 3층 세미나실', host: '농금원', gp: '그린씨드인베스트먼트', fund: '그린씨드 스마트팜 1호 조합', consultType: '집합IR', manager: '이서연', useYn: 'Y', regBy: '이서연', regAt: '2026-04-02', attachment: '스마트팜_IR_발표자료.pdf', note: '',
    participants: [p('EN01', '2026-04-16', '집합', '후속 실사 진행 희망', '이서연'), p('EN07', '2026-04-16', '집합', '기술 검증 자료 추가 요청', '김민준'), p('EN11', '2026-04-16', '집합', '시리즈A 규모 협의', '이서연')] },
  { id: 'IR02', name: '푸드테크 개별 상담회(4월)', date: '2026-04-28', place: '한결벤처파트너스 본사 회의실', host: '운용사', gp: '한결벤처파트너스', fund: '한결 푸드테크 투자조합', consultType: '개별IR', manager: '박지훈', useYn: 'Y', regBy: '박지훈', regAt: '2026-04-20', attachment: null, note: '운용사 자체 개최',
    participants: [p('EN04', '2026-04-28', '개별', '해외 판로 확대 계획 확인', '박지훈'), p('EN10', '2026-04-29', '개별', '밀키트 생산설비 투자 검토', '박지훈')] },
  { id: 'IR03', name: '블루푸드 투자 라운드테이블', date: '2026-03-12', place: '부산 수산과학관 대회의실', host: '농금원', gp: '바다숲캐피탈', fund: '바다숲 수산혁신 1호 조합', consultType: '집합IR', manager: '최유나', useYn: 'Y', regBy: '최유나', regAt: '2026-02-26', attachment: '블루푸드_라운드테이블_안내.hwp', note: '',
    participants: [p('EN02', '2026-03-12', '집합', '가공 공장 증설 자금 수요', '최유나'), p('EN12', '2026-03-12', '집합', '양식 기술 특허 확인 필요', '최유나'), p('EN17', '2026-03-12', '집합', '원료 수급 안정성 질의', '김민준')] },
  { id: 'IR04', name: '청년 농식품 창업기업 IR데이', date: '2026-05-21', place: '세종 농식품창업센터', host: '농금원', gp: '푸른들자산운용', fund: '푸른들 청년창업 농식품 조합', consultType: '집합IR', manager: '김민준', useYn: 'Y', regBy: '김민준', regAt: '2026-05-06', attachment: '청년창업_IR데이_참가기업.xlsx', note: '청년창업 특화',
    participants: [p('EN03', '2026-05-21', '집합', '유통 채널 다변화 제안', '김민준'), p('EN13', '2026-05-21', '집합', '수출 인증 진행 상황 확인', '김민준'), p('EN14', '2026-05-21', '집합', '소규모 시드 투자 적합', '이서연'), p('EN18', '2026-05-21', '집합', '체험농장 사업 확장성 검토', '이서연')] },
  { id: 'IR05', name: '애그테크 개별 상담(대지애그테크)', date: '2026-06-03', place: '그린씨드인베스트먼트 판교 사무소', host: '운용사', gp: '그린씨드인베스트먼트', fund: '그린씨드 애그테크 2호 조합', consultType: '개별IR', manager: '박지훈', useYn: 'Y', regBy: '박지훈', regAt: '2026-05-28', attachment: null, note: '',
    participants: [p('EN11', '2026-06-03', '개별', '드론 실증 결과 공유', '박지훈'), p('EN07', '2026-06-04', '개별', '공동 실증 사업 제안', '박지훈')] },
  { id: 'IR06', name: '농식품 성장기업 하반기 IR', date: '2026-09-10', place: '서울 aT센터 5층 대회의실', host: '농금원', gp: '한결벤처파트너스', fund: '한결 농식품 성장 조합', consultType: '집합IR', manager: '이서연', useYn: 'Y', regBy: '이서연', regAt: '2026-08-25', attachment: '하반기_성장기업_IR_자료집.pdf', note: '',
    participants: [p('EN06', '2026-09-10', '집합', '생산라인 자동화 투자 검토', '이서연'), p('EN16', '2026-09-10', '집합', '육가공 위생 인증 확인', '최유나'), p('EN08', '2026-09-10', '집합', '상장 후 추가 투자 수요 없음', '이서연'), p('EN01', '2026-09-10', '집합', '2차 라운드 일정 협의', '김민준'), p('EN04', '2026-09-10', '집합', '공동 R&D 제안', '최유나')] },
  { id: 'IR07', name: '수산 양식 스타트업 개별 IR', date: '2026-07-15', place: '바다숲캐피탈 여의도 사무소', host: '운용사', gp: '바다숲캐피탈', fund: '바다숲 블루푸드 2호 조합', consultType: '개별IR', manager: '최유나', useYn: 'N', regBy: '최유나', regAt: '2026-07-08', attachment: null, note: '일정 변경으로 미사용 처리',
    participants: [p('EN12', '2026-07-15', '개별', '설비 리스 구조 검토', '최유나')] },
  { id: 'IR08', name: '축산·사료 분야 투자설명회', date: '2025-11-20', place: '대전 농업기술센터 강당', host: '농금원', gp: '그린씨드인베스트먼트', fund: '그린씨드 애그테크 2호 조합', consultType: '집합IR', manager: '김민준', useYn: 'Y', regBy: '김민준', regAt: '2025-11-05', attachment: '축산사료_투자설명회_결과보고.pdf', note: '',
    participants: [p('EN05', '2025-11-20', '집합', '방역 설비 개선 필요', '김민준'), p('EN15', '2025-11-20', '집합', '분뇨 처리 친환경 전환 계획', '박지훈'), p('EN17', '2025-11-20', '집합', '수출용 사료 인증 확인', '김민준')] },
  { id: 'IR09', name: '전통식품 발효 기업 IR', date: '2025-12-09', place: '전주 한국전통식품진흥원', host: '운용사', gp: '푸른들자산운용', fund: '푸른들 청년창업 농식품 조합', consultType: '집합IR', manager: '이서연', useYn: 'Y', regBy: '이서연', regAt: '2025-11-28', attachment: null, note: '',
    participants: [p('EN13', '2025-12-09', '집합', '숙성 창고 확충 자금', '이서연'), p('EN09', '2025-12-09', '집합', '조합원 출자 구조 확인', '박지훈')] },
  { id: 'IR10', name: '과채 가공기업 개별 상담', date: '2026-10-22', place: '한결벤처파트너스 본사 회의실', host: '운용사', gp: '한결벤처파트너스', fund: '한결 푸드테크 투자조합', consultType: '개별IR', manager: '박지훈', useYn: 'Y', regBy: '박지훈', regAt: '2026-10-14', attachment: '해오름식품_상담기록.docx', note: '',
    participants: [p('EN08', '2026-10-22', '개별', '신제품 라인 투자 검토', '박지훈'), p('EN10', '2026-10-23', '개별', '콜드체인 물류 협업 제안', '최유나'), p('EN06', '2026-10-22', '개별', '원재료 가격 변동 대응 질의', '박지훈')] },
];

/** IR 10건(원본 불변 — 호출마다 새 배열) */
export function demoIrs(): IrEvent[] {
  return IRS.map((r) => ({ ...r, participants: r.participants.map((x) => ({ ...x })) }));
}
