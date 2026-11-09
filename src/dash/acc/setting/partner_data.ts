/* 회계거래처관리(ACC-026) — 타입·코드 상수·더미 seed.
   - 전표 거래처 10건(이름·대표자·전화·관리번호)은 acc/slip/general_journal_data `PARTNERS` 와 **값만 같게 복사**했다(데모 일관성).
     중분류 간 import 는 하지 않는다(setting ↔ slip 의존 금지). 내부거래처코드 = 전표 고객번호(C000101~C000110)
     — '회계 거래처코드 ↔ 거래처번호 매핑 키'.
   - 텍스트 N/A = '-'. 이메일 등 가상 도메인 `.example`. 실존 기업명 아님.
   - hasJournal = 연결 전표 존재 여부(데모 플래그 — 실제로는 전표 테이블 조회). */

export const PARTNER_TYPES = ['법인', '개인'] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export const REGIONS = ['국내', '해외'] as const;
export type Region = (typeof REGIONS)[number];

/** 국가 — seed 에 있는 국가(상세필터 선택지 = 이 목록, 테스트가 seed 와 일치를 검사) */
export const DOMESTIC_COUNTRY = '대한민국';
export const COUNTRIES = ['대한민국', '미국', '일본', '싱가포르'] as const;

export const ACCOUNT_KINDS = ['수익', '비용', '출자', '분배', '기타'] as const;
export const BANKS = [
  'KB국민은행', '신한은행', '우리은행', '하나은행', 'NH농협은행', 'IBK기업은행', 'SC제일은행', '한국씨티은행',
  '카카오뱅크', '토스뱅크', '수협은행', '부산은행', '대구은행', '광주은행', '경남은행', '전북은행', '제주은행',
] as const;
export const USE_YN = ['여', '부'] as const;
export type UseYn = (typeof USE_YN)[number];

export interface BankAccount {
  id: string;           // 행 안정 id(편집 그리드 getRowId)
  main: boolean;        // 주계좌(거래처당 1개)
  kind: string;         // 계좌구분(ACCOUNT_KINDS)
  bank: string;         // 은행명(BANKS)
  accountNo: string;
  holder: string;       // 예금주
  use: UseYn;
}

/** 거래처정보 변경 이력(자동 기록·읽기전용) — 거래처명 또는 사업자등록번호가 바뀐 수정 저장 1건 = 1행 */
export interface PartnerHistory {
  date: string;         // YYYY-MM-DD
  oldName: string; newName: string;
  oldBizNo: string; newBizNo: string;
}

export interface PartnerRow {
  partnerNo: string;    // 거래처번호 P000NNN(자동채번) — getRowId
  internalCode: string; // 내부거래처코드
  type: PartnerType;
  name: string;
  nameEn: string;
  bizNo: string;        // 사업자등록번호 000-00-00000 (해외 '-')
  corpNo: string;       // 법인등록번호 (개인 '-')
  ceo: string;          // 대표자명
  mgmtNo: string;       // 관리번호(목록 표시 — 모달 입력 항목 아님)
  region: Region;
  country: string;
  foreignRegNo: string; // 해외등록번호 (국내 '-')
  phone: string;        // 대표회사전화번호
  bizType: string;      // 업태
  bizItem: string;      // 종목
  address: string;      // 법인주소 — address 컨트롤 값 계약 '(12345) 본문'
  accounts: BankAccount[];
  history: PartnerHistory[];
  attachments: string[];
  hasJournal: boolean;
}

/* ── seed ── */
type Seed = Omit<PartnerRow, 'partnerNo' | 'accounts'> & { accounts: Omit<BankAccount, 'id'>[] };
const acct = (kind: string, bank: string, accountNo: string, holder: string, main = false, use: UseYn = '여'): Omit<BankAccount, 'id'> => ({ main, kind, bank, accountNo, holder, use });
const none = { history: [] as PartnerHistory[], attachments: [] as string[] };

const SEEDS: Seed[] = [
  /* 전표 거래처 10건(general_journal_data PARTNERS 값 복사) */
  { internalCode: 'C000101', type: '법인', name: '(주)가람팜텍', nameEn: 'Garam Farmtech Co., Ltd.', bizNo: '214-81-30101', corpNo: '110111-3010101', ceo: '정가람', mgmtNo: 'M-2026-001',
    region: '국내', country: '대한민국', foreignRegNo: '-', phone: '02-555-0101', bizType: '제조업', bizItem: '스마트팜 설비', address: '(06236) 서울특별시 강남구 테헤란로 101 7층',
    accounts: [acct('수익', 'KB국민은행', '100-201-000101', '(주)가람팜텍', true), acct('비용', '신한은행', '140-011-300101', '(주)가람팜텍')],
    history: [{ date: '2026-03-12', oldName: '(주)가람농기술', newName: '(주)가람팜텍', oldBizNo: '214-81-30101', newBizNo: '214-81-30101' }],
    attachments: ['사업자등록증_가람팜텍.pdf', '통장사본_가람팜텍.pdf'], hasJournal: true },
  { internalCode: 'C000102', type: '법인', name: '들빛수산(주)', nameEn: 'Deulbit Seafood Inc.', bizNo: '602-81-30102', corpNo: '180111-3010202', ceo: '한들빛', mgmtNo: 'M-2026-002',
    region: '국내', country: '대한민국', foreignRegNo: '-', phone: '051-555-0102', bizType: '도소매업', bizItem: '수산물 가공·유통', address: '(48943) 부산광역시 중구 해안로 102',
    accounts: [acct('출자', 'NH농협은행', '100-201-000102', '들빛수산(주)', true)], ...none, attachments: ['사업자등록증_들빛수산.pdf'], hasJournal: true },
  { internalCode: 'C000103', type: '법인', name: '온새미식품(주)', nameEn: 'Onsaemi Foods Corp.', bizNo: '135-81-30103', corpNo: '134111-3010303', ceo: '서온새', mgmtNo: 'M-2026-003',
    region: '국내', country: '대한민국', foreignRegNo: '-', phone: '031-555-0103', bizType: '제조업', bizItem: '가공식품', address: '(16490) 경기도 수원시 팔달구 효원로 103',
    accounts: [acct('수익', '우리은행', '100-201-000103', '온새미식품(주)', true), acct('분배', 'IBK기업은행', '010-300103-01-011', '온새미식품(주)')], ...none, hasJournal: true },
  { internalCode: 'C000104', type: '법인', name: '해솔영농조합법인', nameEn: 'Haesol Farming Association', bizNo: '411-82-30104', corpNo: '204171-3010404', ceo: '문해솔', mgmtNo: 'M-2026-004',
    region: '국내', country: '대한민국', foreignRegNo: '-', phone: '061-555-0104', bizType: '농업', bizItem: '작물 재배', address: '(58217) 전라남도 나주시 빛가람로 104',
    accounts: [acct('출자', 'NH농협은행', '100-201-000104', '해솔영농조합법인', true)], ...none, hasJournal: false },
  { internalCode: 'C000105', type: '법인', name: '(주)나래애그로', nameEn: 'Narae Agro Co., Ltd.', bizNo: '307-81-30105', corpNo: '164711-3010505', ceo: '오나래', mgmtNo: 'M-2026-005',
    region: '국내', country: '대한민국', foreignRegNo: '-', phone: '044-555-0105', bizType: '서비스업', bizItem: '농업 기술 컨설팅', address: '(30121) 세종특별자치시 한누리대로 105',
    accounts: [acct('비용', '하나은행', '100-201-000105', '(주)나래애그로', true)],
    history: [{ date: '2026-05-20', oldName: '(주)나래애그로', newName: '(주)나래애그로', oldBizNo: '307-81-30150', newBizNo: '307-81-30105' }],
    attachments: [], hasJournal: true },
  { internalCode: 'C000106', type: '법인', name: '도담회계법인', nameEn: 'Dodam CPA', bizNo: '120-86-30106', corpNo: '110171-3010606', ceo: '윤도담', mgmtNo: 'M-2026-006',
    region: '국내', country: '대한민국', foreignRegNo: '-', phone: '02-555-0106', bizType: '서비스업', bizItem: '회계 감사', address: '(04524) 서울특별시 중구 세종대로 106 12층',
    accounts: [acct('비용', '신한은행', '100-201-000106', '도담회계법인', true)], ...none, hasJournal: true },
  { internalCode: 'C000107', type: '법인', name: '(주)다온유통', nameEn: 'Daon Distribution Co., Ltd.', bizNo: '121-81-30107', corpNo: '120111-3010707', ceo: '배다온', mgmtNo: 'M-2026-007',
    region: '국내', country: '대한민국', foreignRegNo: '-', phone: '032-555-0107', bizType: '도소매업', bizItem: '농산물 유통', address: '(21999) 인천광역시 연수구 센트럴로 107',
    accounts: [acct('수익', '우리은행', '100-201-000107', '(주)다온유통', true), acct('기타', '카카오뱅크', '3333-01-3010707', '(주)다온유통', false, '부')], ...none, hasJournal: false },
  { internalCode: 'C000108', type: '법인', name: '새벽들 농식품 투자조합 1호', nameEn: 'Saebyeokdeul Agrifood Fund No.1', bizNo: '220-89-30108', corpNo: '-', ceo: '권새벽', mgmtNo: 'M-2026-008',
    region: '국내', country: '대한민국', foreignRegNo: '-', phone: '02-555-0108', bizType: '금융업', bizItem: '투자조합', address: '(07327) 서울특별시 영등포구 여의대로 108',
    accounts: [acct('출자', 'IBK기업은행', '100-201-000108', '새벽들 농식품 투자조합 1호', true), acct('분배', 'KB국민은행', '470-01-3010808', '새벽들 농식품 투자조합 1호')], ...none, hasJournal: true },
  { internalCode: 'C000109', type: '개인', name: '하늘찬', nameEn: 'Ha Neulchan', bizNo: '210-12-30109', corpNo: '-', ceo: '하늘찬', mgmtNo: 'M-2026-009',
    region: '국내', country: '대한민국', foreignRegNo: '-', phone: '010-5550-0109', bizType: '서비스업', bizItem: '농업 자문', address: '(35208) 대전광역시 서구 둔산로 109',
    accounts: [acct('비용', '토스뱅크', '100-201-000109', '하늘찬', true)], ...none, hasJournal: false },
  { internalCode: 'C000110', type: '개인', name: '서도윤', nameEn: 'Seo Doyun', bizNo: '317-25-30110', corpNo: '-', ceo: '서도윤', mgmtNo: 'M-2026-010',
    region: '국내', country: '대한민국', foreignRegNo: '-', phone: '010-5550-0110', bizType: '서비스업', bizItem: '번역', address: '(61475) 광주광역시 동구 금남로 110',
    accounts: [acct('비용', '광주은행', '100-201-000110', '서도윤', true)], ...none, hasJournal: false },
  /* 국내 법인 추가 3건 */
  { internalCode: 'C000111', type: '법인', name: '(주)솔가람농산', nameEn: 'Solgaram Agri Co., Ltd.', bizNo: '503-81-30111', corpNo: '170111-3011101', ceo: '김솔', mgmtNo: 'M-2026-011',
    region: '국내', country: '대한민국', foreignRegNo: '-', phone: '053-555-0111', bizType: '농업', bizItem: '과수 재배', address: '(41911) 대구광역시 중구 국채보상로 111',
    accounts: [acct('수익', '대구은행', '505-10-3011101', '(주)솔가람농산', true)], ...none, hasJournal: false },
  { internalCode: 'C000112', type: '법인', name: '누리바다(주)', nameEn: 'Nuribada Corp.', bizNo: '615-81-30112', corpNo: '194211-3011202', ceo: '이누리', mgmtNo: 'M-2026-012',
    region: '국내', country: '대한민국', foreignRegNo: '-', phone: '055-555-0112', bizType: '어업', bizItem: '양식', address: '(51430) 경상남도 창원시 성산구 중앙대로 112',
    accounts: [acct('수익', '경남은행', '207-0030-1120-1', '누리바다(주)', true), acct('기타', '수협은행', '1010-3011-2001', '누리바다(주)')], ...none, hasJournal: false },
  { internalCode: 'C000113', type: '법인', name: '(주)다래팜', nameEn: 'Darae Farm Co., Ltd.', bizNo: '402-81-30113', corpNo: '210111-3011303', ceo: '최다래', mgmtNo: 'M-2026-013',
    region: '국내', country: '대한민국', foreignRegNo: '-', phone: '063-555-0113', bizType: '제조업', bizItem: '친환경 비료', address: '(54999) 전북특별자치도 전주시 완산구 홍산로 113',
    accounts: [acct('비용', '전북은행', '1013-01-3011303', '(주)다래팜', true)], ...none, hasJournal: false },
  /* 해외 3건 — 사업자등록번호 '-', 해외등록번호 채움 */
  { internalCode: 'C000114', type: '법인', name: 'Lumora Agritech Inc.', nameEn: 'Lumora Agritech Inc.', bizNo: '-', corpNo: '-', ceo: 'Avery Lumen', mgmtNo: 'M-2026-014',
    region: '해외', country: '미국', foreignRegNo: 'US-98-7650114', phone: '+1-415-555-0114', bizType: '서비스업', bizItem: '농업 데이터 분석', address: '1140 Harbor View Ave, San Francisco, CA',
    accounts: [acct('출자', '하나은행', '1-555-0114-01', 'Lumora Agritech Inc.', true)], ...none, attachments: ['Certificate_of_Incorporation_Lumora.pdf'], hasJournal: false },
  { internalCode: 'C000115', type: '법인', name: 'Hoshizora Foods K.K.', nameEn: 'Hoshizora Foods K.K.', bizNo: '-', corpNo: '-', ceo: 'Sora Hoshino', mgmtNo: 'M-2026-015',
    region: '해외', country: '일본', foreignRegNo: 'JP-4010001900115', phone: '+81-3-5550-0115', bizType: '도소매업', bizItem: '식품 수입', address: '1-15 Nihonbashi, Chuo-ku, Tokyo',
    accounts: [acct('수익', '신한은행', '2-555-0115-02', 'Hoshizora Foods K.K.', true)], ...none, hasJournal: false },
  { internalCode: 'C000116', type: '법인', name: 'Meranti Harvest Pte. Ltd.', nameEn: 'Meranti Harvest Pte. Ltd.', bizNo: '-', corpNo: '-', ceo: 'Lin Meranti', mgmtNo: 'M-2026-016',
    region: '해외', country: '싱가포르', foreignRegNo: 'SG-202600116K', phone: '+65-6555-0116', bizType: '금융업', bizItem: '농식품 투자', address: '116 Marina Way, Singapore',
    accounts: [acct('분배', '한국씨티은행', '3-555-0116-03', 'Meranti Harvest Pte. Ltd.', true)], ...none, hasJournal: false },
];

/** 더미 거래처 — 호출마다 새 배열·새 객체(원본 오염 없음). 거래처번호 = P000001~ seed 순서 */
export function demoPartners(): PartnerRow[] {
  return SEEDS.map((s, i) => {
    const partnerNo = 'P' + String(i + 1).padStart(6, '0');
    return {
      ...s,
      partnerNo,
      accounts: s.accounts.map((a, k) => ({ ...a, id: `${partnerNo}-a${String(k + 1)}` })),
      history: s.history.map((h) => ({ ...h })),
      attachments: [...s.attachments],
    };
  });
}
