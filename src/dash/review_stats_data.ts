/* 투자자산관리 > 사후보고관리 > 투심보고 통계 의 원문 데이터(순수 모듈, React import 금지).
   출처: docs/메뉴구성도_v0.2.md 의 매칭 "ffms > 통계 > 투심승인정보조회" = S1_28_투심승인정보조회.html
   - 표 = 단일 헤더 27열(`<thead>` 원문 순서) · 행 = `<script> var DATA` 27건("사용자 제공 실 화면 캡처 기반") · 합계행 없음
   - 검색조건 = 모펀드(농식품모태펀드/MOAF) · 운용사 · 자펀드 · 계정구분(전체/농식품/수산) · 기준일자(2026-07-13 ~ 2026-08-12)
   값·순서·개수를 바꾸지 않는다. 원문 null(값 없음)은 null 그대로 — 화면은 '-'(원문 cell()/yn() 과 같다).
   (구 schemas/투심승인정보조회.ts 는 route 가 메뉴와 달라 도달 불가였고 컬럼 19/27·행 0건·출처 절대경로였다 — 이 모듈로 대체) */
import type { TableMeta, Provenance, Row } from './risk_table_meta';

export const REVIEW_STATS_PROVENANCE: Provenance = {
  capturedAt: '2026-09-24',
  sourceSystem: 'FFMS',
  captureFiles: ['docs/mockups/01_투자자산관리/S1_28_투심승인정보조회.html'],
};

/** 원문 yn(): 'Y' = `.tag g`(success) · 'N' = `.tag n`(muted). 그 외 문자열('해당 없음')은 원문이 태그 없이 적는다 */
const YN = { Y: 'success', N: 'muted' } as const;

const ROWS: Row[] = [
    { id: 'rs-1', no: 1, gp: '롯데벤처스(주)', fund: '롯데농식품테크펀드2호', corp: '(주)다름달음', payd: '2026-08-11', amt: 2999774712, birth: '19850702-1', venture: null, woman: 'N', youth: 'Y', estd: '2020-05-04', bizno: '106-88-01737', mand: null, small: null, agri: null, field: null, biz: null, method: null, period: null, found: null, mgmt: null, region: null, addr: null, sector: null, sub: null, product: null, ind: null },
    { id: 'rs-2', no: 2, gp: '주식회사 엘에프인베스트먼트', fund: '스마트네이처투자조합1호', corp: '(주)하이퍼나인', payd: '2026-08-11', amt: 1500000000, birth: '19890729-1', venture: null, woman: 'N', youth: 'N', estd: '2026-02-19', bizno: '403-88-03674', mand: null, small: null, agri: null, field: null, biz: null, method: null, period: null, found: null, mgmt: null, region: null, addr: null, sector: null, sub: null, product: null, ind: null },
    { id: 'rs-3', no: 3, gp: '현대기술투자', fund: '현대-파이오니어 농식품펀드1호', corp: '(주)하늘바이오 농업회사법인', payd: '2026-08-11', amt: 1000000806, birth: '19770712-2', venture: null, woman: 'Y', youth: 'N', estd: '2008-11-21', bizno: '611-81-16825', mand: null, small: null, agri: null, field: null, biz: null, method: null, period: null, found: null, mgmt: null, region: null, addr: null, sector: null, sub: null, product: null, ind: null },
    { id: 'rs-4', no: 4, gp: '엔비에이치(NBH)캐피탈 주식회사', fund: '웰투시-NBH 전북애그리푸드 투자조합', corp: '애디드바이옴 주식회사', payd: '2026-08-10', amt: 2000000000, birth: '19731005-1', venture: 'N', woman: 'N', youth: 'N', estd: '2019-11-21', bizno: '373-81-00678', mand: 'Y', small: 'Y', agri: 'Y', field: '식품업', biz: '두부, 견과류, 그래놀라 등 농산물 활용한 스낵 제조, 유통, 판매', method: 'RCPS', period: '2027-12-26', found: '2017-04-25', mgmt: '일반기업', region: '경기', addr: '경기도 화성시 만세구 양감면 정문송산로 146', sector: '식품/제조', sub: '식품 제조', product: '두부스낵, 견과류 그래놀라 등', ind: '③' },
    { id: 'rs-5', no: 5, gp: '현대기술투자', fund: '현대-파이오니어 농식품펀드1호', corp: '애디드바이옴', payd: '2026-08-10', amt: 1000000000, birth: '19731005-1', venture: null, woman: 'N', youth: 'N', estd: '2017-04-25', bizno: '373-81-00678', mand: null, small: null, agri: null, field: null, biz: null, method: null, period: null, found: null, mgmt: null, region: null, addr: null, sector: null, sub: null, product: null, ind: null },
    { id: 'rs-6', no: 6, gp: '(주)경남벤처투자', fund: 'BNK-경남 스마트이노베이션 투자조합', corp: '(주)엔티 농업회사법인', payd: '2026-08-07', amt: 600072500, birth: '19900220-1', venture: null, woman: 'N', youth: 'N', estd: '2017-01-03', bizno: '468-86-00627', mand: null, small: null, agri: null, field: null, biz: null, method: null, period: null, found: null, mgmt: null, region: null, addr: null, sector: null, sub: null, product: null, ind: null },
    { id: 'rs-7', no: 7, gp: '(주)경남벤처투자', fund: 'BNK-경남 스마트이노베이션 투자조합', corp: '(주)엔티 농업회사법인', payd: '2026-08-07', amt: 2000000000, birth: '19900220-1', venture: null, woman: 'N', youth: 'N', estd: '2017-01-03', bizno: '468-86-00627', mand: null, small: null, agri: null, field: null, biz: null, method: null, period: null, found: null, mgmt: null, region: null, addr: null, sector: null, sub: null, product: null, ind: null },
    { id: 'rs-8', no: 8, gp: '(주)지티오인베스트먼트', fund: '지티오 제이커브 그린바이오 투자조합', corp: '(주)휴밀', payd: '2026-08-07', amt: 600148692, birth: '19841007-1', venture: null, woman: 'N', youth: 'N', estd: '2021-08-25', bizno: '437-88-02265', mand: null, small: null, agri: null, field: null, biz: null, method: null, period: null, found: null, mgmt: null, region: null, addr: null, sector: null, sub: null, product: null, ind: null },
    { id: 'rs-9', no: 9, gp: '동훈인베스트먼트(주)', fund: '동훈 농식품벤처스타 3호 투자조합', corp: '(주)데이웰즈', payd: '2026-08-06', amt: 499970678, birth: '19810829-1', venture: null, woman: 'N', youth: 'N', estd: '2021-08-18', bizno: '144-87-02309', mand: null, small: null, agri: null, field: null, biz: null, method: null, period: null, found: null, mgmt: null, region: null, addr: null, sector: null, sub: null, product: null, ind: null },
    { id: 'rs-10', no: 10, gp: '나이스투자파트너스(주)', fund: '미래수산밸류체인펀드', corp: '(주)위밋모빌리티', payd: '2026-08-04', amt: 999992500, birth: '19900611-1', venture: null, woman: 'N', youth: 'Y', estd: '2017-05-31', bizno: '806-87-00694', mand: null, small: null, agri: null, field: null, biz: null, method: null, period: null, found: null, mgmt: null, region: null, addr: null, sector: null, sub: null, product: null, ind: null },
    { id: 'rs-11', no: 11, gp: '(주)지티오인베스트먼트', fund: '지티오 제이커브 그린바이오 투자조합', corp: '이엑스헬스케어(주)', payd: '2026-07-31', amt: 1000000080, birth: '19841017-2', venture: 'Y', woman: 'Y', youth: 'Y', estd: '2022-01-13', bizno: '539-81-02484', mand: 'Y', small: 'Y', agri: 'Y', field: '농업관련산업', biz: '식물 추출 기반 기능성 건강기능식품 및 화장품 개발', method: 'RCPS', period: '10년', found: '2022-01-13', mgmt: '일반기업', region: '강원', addr: '강원특별자치도 춘천시 소양강로 10 907-10호', sector: '농업 관련', sub: '화장품/건강기능식품', product: '근감소 억제 기능 화장품 및 건강기능식품', ind: '③' },
    { id: 'rs-12', no: 12, gp: '인라이트벤처스(주)', fund: '인라이트 농식품 청년기업 성장펀드', corp: '(주)피에이치앤코', payd: '2026-07-31', amt: 300001450, birth: '19750701-2', venture: 'N', woman: 'N', youth: 'N', estd: '2025-08-05', bizno: '671-86-03948', mand: 'N', small: 'N', agri: 'N', field: '축산관련산업', biz: '반려동물 용품 유통 및 서비스 제공', method: 'RCPS', period: '10년', found: '2025-08-05', mgmt: '일반기업', region: '전북', addr: '전북 전주시 완산구 홍산중앙로 20', sector: '서비스/유통', sub: '반려동물 관련', product: '반려동물 관련 용품 등 오프라인 매장 운영', ind: '③' },
    { id: 'rs-13', no: 13, gp: '나우아이비캐피탈(주)', fund: '나우농식품투자펀드5호', corp: '(주)컨포트랩', payd: '2026-07-29', amt: 799996824, birth: '19861127-1', venture: 'N', woman: 'N', youth: 'N', estd: '2022-11-16', bizno: '414-88-02772', mand: 'N', small: 'N', agri: 'N', field: '식품관련산업', biz: 'AI 기반 식품제조 운영관리 솔루션 개발 및 공급', method: 'RCPS', period: '10년', found: '2022-11-16', mgmt: '일반기업', region: '서울', addr: '서울 송파구 송파대로 167', sector: 'R&D/제조', sub: '시스템 및 솔루션 개발', product: '식품 생산시설 및 식품 공정 설비 시스템', ind: '③' },
    { id: 'rs-14', no: 14, gp: '비엔케이벤처투자(주)', fund: '비엔케이 농식품 투자조합 제4호', corp: '(주)더그린', payd: '2026-07-29', amt: 1500183000, birth: '19860823-1', venture: 'N', woman: 'N', youth: 'N', estd: '2016-09-30', bizno: '347-86-00558', mand: 'Y', small: 'Y', agri: 'Y', field: '농업관련산업', biz: '양액 제조, 스마트팜 운영 시스템 제공', method: 'RCPS', period: '10년', found: '2016-09-30', mgmt: '농업회사법인', region: '충남', addr: '충남 천안시 서북구 직산읍 직산리 136', sector: '농업/서비스', sub: '농작물재배, 스마트팜', product: '실내 양액재배시설 및 스마트팜 운영 솔루션 서비스 기반 농산물 유통/판매', ind: '③' },
    { id: 'rs-15', no: 15, gp: '씨케이디창업투자(주)', fund: 'CKD 청년성장농업 1호 농식품투자조합', corp: '(주)해양드론기술', payd: '2026-07-29', amt: 1396820000, birth: '19710714-1', venture: 'N', woman: 'N', youth: 'N', estd: '2021-06-16', bizno: '403-87-02116', mand: 'Y', small: 'Y', agri: 'Y', field: '식품관련산업', biz: '농식품 해상 드론 배송 및 해양용 드론 제조 등', method: 'RCPS', period: '10년', found: '2021-06-16', mgmt: '일반기업', region: '부산', addr: '부산 영도구 해양로 435-1', sector: '식품/유통', sub: '배송서비스', product: '해상 드론 배송, 어군 탐지, 드론 운용 서비스', ind: '③' },
    { id: 'rs-16', no: 16, gp: '프롤로그벤처스(주)', fund: '프롤로그 농식품스케일업투자조합', corp: '주식회사 미스터아빠', payd: '2026-07-28', amt: 1498455000, birth: '19790922-1', venture: 'N', woman: 'N', youth: 'N', estd: '2020-06-30', bizno: '448-87-01712', mand: 'Y', small: 'Y', agri: 'Y', field: '식품관련산업', biz: '신선식품 유통 및 판매', method: 'RCPS', period: '10년', found: '2020-06-30', mgmt: '일반기업', region: '경남', addr: '경남 창원시 마산회원구 내서읍 유통단지로 35-4', sector: '식품/유통', sub: '농산물 유통', product: '농산물, 식자재 B2B 유통', ind: '③' },
    { id: 'rs-17', no: 17, gp: '(주)소풍벤처스', fund: '엔에이치 소풍 청년 그로우 투자조합', corp: '어썸브레드 주식회사', payd: '2026-07-24', amt: 299997495, birth: '19841108-1', venture: 'N', woman: 'N', youth: 'Y', estd: '2024-11-12', bizno: '338-81-03600', mand: 'Y', small: 'Y', agri: 'Y', field: '식품업', biz: '베이커리 제조 및 도소매, 프랜차이즈 가맹업', method: 'RCPS', period: '10년', found: '2024-11-12', mgmt: '일반기업', region: '경기', addr: '남양주시 화도읍 경춘로 2180번길 24-16', sector: '식품/제조', sub: '베이커리', product: '베이커리 제조, 프랜차이즈', ind: '③' },
    { id: 'rs-18', no: 18, gp: '엔브이씨파트너스 주식회사', fund: '넥스트웨이브 2022 수산벤처 투자조합', corp: '(주)하늘바이오', payd: '2026-07-24', amt: 1980064100, birth: '19770712-2', venture: 'N', woman: 'N', youth: 'N', estd: '2008-11-21', bizno: '611-81-16825', mand: 'N', small: 'N', agri: 'N', field: '수산관련산업', biz: '농산물 및 수산물 기반의 식품(부각) 제조', method: '보통주', period: '10년', found: '2008-11-21', mgmt: '농업회사법인', region: '경남', addr: '경상남도 거창군 남상면 홍역길11', sector: '식품/제조', sub: '수산 식품 제조', product: '수산물(김, 미역, 다시마) 부각', ind: '②' },
    { id: 'rs-19', no: 19, gp: '비엔케이벤처투자(주)', fund: '비엔케이 농식품 투자조합 제4호', corp: '(주)긴트', payd: '2026-07-23', amt: 1999998462, birth: '19850621-1', venture: 'N', woman: '해당 없음', youth: 'Y', estd: '2015-10-07', bizno: '266-88-00215', mand: 'N', small: '해당 없음', agri: 'Y', field: '농업관련산업', biz: '농업기계용 자율주행 솔루션', method: 'RCPS', period: '10년', found: '2015-10-07', mgmt: '일반기업', region: '경기', addr: '경기도 성남 분당구 판교로 228번길 17', sector: '농업 관련', sub: '자율주행 농업솔루션', product: '자율주행 농기계', ind: '③' },
    { id: 'rs-20', no: 20, gp: '(주)노틸러스인베스트먼트', fund: '충남미래혁신기술투자조합', corp: '(주)엠디에이아이', payd: '2026-07-22', amt: 200000000, birth: '19731114-1', venture: 'N', woman: '해당 없음', youth: 'N', estd: '2021-12-03', bizno: '461-88-02292', mand: 'N', small: '해당 없음', agri: 'N', field: '비농업', biz: '저선량 온디바이스 AI 진단 솔루션', method: 'RCPS', period: '10년', found: '2021-12-03', mgmt: '일반기업', region: '충남', addr: '충남 천안시 동남구 순천향2길 1', sector: '솔루션', sub: '저선량 온디바이스 AI 진단 솔루션', product: '비농업', ind: '③' },
    { id: 'rs-21', no: 21, gp: '오라클벤처투자 주식회사', fund: '오라클프레쉬펀드', corp: '(주)에스앤이컴퍼니', payd: '2026-07-21', amt: 650325000, birth: '19740416-1', venture: 'Y', woman: 'N', youth: 'N', estd: '2020-08-12', bizno: '737-88-01827', mand: 'Y', small: '해당 없음', agri: 'Y', field: '농업관련산업', biz: 'AI 기반 농산물 거래 및 데이터 분석 솔루션을 통한 농산물 등 식자재 선도거래 등', method: 'RCPS', period: '10년', found: '2020-08-12', mgmt: '일반기업', region: '서울', addr: '서울 서초구 매헌로16길 32', sector: '식품/유통', sub: '농산물 유통 및 가공', product: 'AI 기반 농산물 거래 및 데이터 분석 솔루션', ind: '③' },
    { id: 'rs-22', no: 22, gp: '가이아벤처파트너스(유)', fund: '가이아수산벤처창업투자조합2호', corp: '주식회사 그린오션스', payd: '2026-07-20', amt: 400200000, birth: '19861009-2', venture: 'Y', woman: 'N', youth: 'Y', estd: '2021-11-08', bizno: '836-86-02292', mand: 'Y', small: 'Y', agri: 'Y', field: '수산관련산업', biz: '폐 굴패각 업사이클링 통해 친환경 소재 생산', method: 'RCPS', period: '10', found: '2021-11-08', mgmt: '일반기업', region: '경남', addr: '경남 통영시 도남로 195', sector: 'R&D/제조', sub: '굴패각 업사이클링', product: '업사이클링 소재 그린쉘(친환경 건축자재, 플라스틱 소재 등)', ind: '②' },
    { id: 'rs-23', no: 23, gp: '로이투자파트너스 주식회사', fund: '세종 농식품 벤처펀드', corp: '땡스카본(주)', payd: '2026-07-20', amt: 599994848, birth: '19720422-2', venture: 'Y', woman: 'Y', youth: 'N', estd: '2021-10-12', bizno: '806-88-02286', mand: 'Y', small: 'Y', agri: 'Y', field: '농업관련산업', biz: '논물관리 탄소배출권 발행', method: 'RCPS', period: '10년', found: '2021-10-07', mgmt: '일반기업', region: '광주', addr: '광주광역시 서구 상무대로 773, 312-13호', sector: '농업관련', sub: '탄소크레딧 발급', product: '탄소크레딧 발급 및 d-MRV 솔루션 판매', ind: '③' },
    { id: 'rs-24', no: 24, gp: '엔비에이치(NBH)캐피탈 주식회사', fund: '엔비에이치(NBH)-케이프 2023 K-Farm 투자조합', corp: '농업회사법인 주식회사 더그린', payd: '2026-07-16', amt: 1498485000, birth: '19860823-1', venture: 'Y', woman: 'N', youth: 'N', estd: '2016-09-30', bizno: '347-86-00558', mand: 'Y', small: 'Y', agri: 'Y', field: '농업관련산업', biz: '양액 제조, 스마트팜 운영 시스템 제공', method: 'RCPS', period: '10년', found: '2016-09-30', mgmt: '농업회사법인', region: '충남', addr: '충남 천안시 서북구 직산읍 직산리 136', sector: '농업/서비스', sub: '농작물재배, 스마트팜', product: '실내 양액재배시설 및 스마트팜 운영 솔루션 서비스 기반 농산물 유통/판매', ind: '③' },
    { id: 'rs-25', no: 25, gp: '로이투자파트너스 주식회사', fund: '세종 농식품 벤처펀드', corp: '(주)아그모', payd: '2026-07-15', amt: 999905887, birth: '19941207-1', venture: 'N', woman: 'N', youth: 'N', estd: '2022-08-17', bizno: '210-88-02694', mand: 'Y', small: 'Y', agri: 'Y', field: '농업관련산업', biz: '농업용 자율주행 키트 및 솔루션 제공', method: 'RCPS', period: '10년', found: '2022-08-23', mgmt: '일반기업', region: '전북', addr: '전북특별자치도 익산시 함열읍 익산대로78길 13-6', sector: '농업관련', sub: '농기계 자율주행', product: '농기계 자율주행 솔루션 키트', ind: '③' },
    { id: 'rs-26', no: 26, gp: '비엔케이벤처투자(주)', fund: '비엔케이 농식품 투자조합 제4호', corp: '(주)그린다', payd: '2026-07-15', amt: 1000012800, birth: '19760204-1', venture: 'Y', woman: 'N', youth: 'N', estd: '2022-08-15', bizno: '473-81-02618', mand: 'Y', small: 'Y', agri: 'Y', field: '식품관련산업', biz: '식품 부산물 활용 친환경 식품포장 기술 및 곤충사료 개발 등', method: 'RCPS', period: '10년', found: '2022-08-15', mgmt: '일반기업', region: '충북', addr: '증평군 도안면', sector: 'R&D/개발', sub: '식품 포장재 기술, 곤충사료', product: '바이오플라스틱', ind: '③' },
    { id: 'rs-27', no: 27, gp: '유니온투자파트너스(주)', fund: '유니온수산투자조합', corp: '(주)해양드론기술', payd: '2026-07-14', amt: 998030000, birth: '19710714-1', venture: 'Y', woman: 'N', youth: 'N', estd: '2021-06-16', bizno: '403-87-02116', mand: 'Y', small: 'Y', agri: 'Y', field: '수산관련산업', biz: '해양용 드론 제조 및 서비스업 등', method: 'RCPS', period: '10년', found: '2021-06-16', mgmt: '일반기업', region: '부산', addr: '부산 영도구 해양로 435-1', sector: '수산관련산업', sub: '해양용 드론 제조', product: '해상 드론 배송, 어군 탐지, 드론 운용 서비스', ind: '③' },
];

export const REVIEW_STATS_TABLE: TableMeta = {
  id: 'reviewStats',
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64, flex: 0 },
    { key: 'gp', label: '운용사', kind: 'text' },
    { key: 'fund', label: '자펀드', kind: 'text' },
    { key: 'corp', label: '투자기업', kind: 'text' },
    { key: 'payd', label: '투자금 납입 예정일', kind: 'date' },
    /* 원문 헤더 `투자금액(원)` — 원문 render() 가 단위에 맞춰 `(원|백만원|억원)` 을 바꿔 적는다 → unitInHeader(화면 헤더 = 라벨 + 선택 단위) */
    { key: 'amt', label: '투자금액', kind: 'amount', unitInHeader: true },
    { key: 'birth', label: '대표이사 생년월일', kind: 'center' },
    { key: 'venture', label: '벤처인증여부', kind: 'badge', tones: YN },
    { key: 'woman', label: '여성기업여부', kind: 'badge', tones: YN },
    { key: 'youth', label: '청년기업여부', kind: 'badge', tones: YN },
    { key: 'estd', label: '설립일자', kind: 'date' },
    { key: 'bizno', label: '사업자번호/주민번호', kind: 'center' },
    { key: 'mand', label: '의무투자', kind: 'badge', tones: YN },
    /* 원문은 이 칸만 yn() 이 아니라 cell() — 태그 없는 텍스트 */
    { key: 'small', label: '일정규모 이하투자', kind: 'center' },
    { key: 'agri', label: '농업투자여부', kind: 'badge', tones: YN },
    { key: 'field', label: '사업분야', kind: 'center' },
    { key: 'biz', label: '사업내용', kind: 'text' },
    { key: 'method', label: '투자방식', kind: 'center' },
    { key: 'period', label: '투자기간', kind: 'center' },
    { key: 'found', label: '창업일자', kind: 'date' },
    { key: 'mgmt', label: '경영형태', kind: 'center' },
    { key: 'region', label: '소재지', kind: 'center' },
    { key: 'addr', label: '시군', kind: 'text' },
    { key: 'sector', label: '업종별', kind: 'center' },
    { key: 'sub', label: '소분류', kind: 'text' },
    { key: 'product', label: '주요제품', kind: 'text' },
    { key: 'ind', label: '산업구분', kind: 'center' },
  ],
  rows: ROWS,
  /* 원문 fmtAmt(): 백만원 = 최대 소수 1자리 · 억원 = 항상 소수 2자리(원 = 정수) */
  unitDigits: { 백만원: { min: 0, max: 1 }, 억원: { min: 2, max: 2 } },
};

/** 원문 모펀드 select 옵션(기본 첫 옵션 '농식품모태펀드', '전체' 없음) */
export const MOTHER_FUNDS = ['농식품모태펀드', 'MOAF'] as const;
/** 원문 계정구분 칩(전체 제외 — '전체' = 빈 값) */
export const ACCOUNT_KINDS = ['농식품', '수산'] as const;
/** 원문 기준일자 기본 범위(f-date1 ~ f-date2) */
export const REVIEW_STATS_RANGE = '2026-07-13~2026-08-12';

/** 원문 운용사·자펀드 select 는 '전체' 뿐(옵션 미적재)이라 **원문 행 값**에서 선택지를 만든다(등장 순서·중복 제거 — 값 창작 없음) */
const distinct = (key: string): string[] => [...new Set(ROWS.map((r) => String(r[key])))];
export const GP_OPTIONS = distinct('gp');
export const FUND_OPTIONS = distinct('fund');
