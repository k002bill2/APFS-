/* 조기경보 > 기업정보 2리프의 원문 데이터(순수 모듈).
   - 투자기업정보(NICE평가정보) = S2_65 기업개요 + S2_66 업체사업장정보 + S2_67 법정관리및화의정보 (탭 3)
   - 투자기업신용정보 조회     = S2_69 신용등급 + S2_68 현금흐름등급 (탭 2)
   출처: docs/mockups/02_조기경보/*.html 의 `<tbody>`·`<script> DATA` 를 2026-09-23 파싱 실측으로 옮겼다.

   행은 원문 그대로다 — 값·순서·개수를 바꾸지 않는다(원문 스스로 "실데이터 1건 + 도메인 정합 예시"라 적은 행도
   원문에 있는 행이므로 그대로 싣고, 원문에 없는 행은 만들지 않는다).
   배지 톤은 목업 `.tag` 색 클래스를 옮긴다: g=success · a=warning · d=danger · b=info · n=muted. */
import type { TableMeta, Provenance, Row } from './risk_table_meta';
import { src } from './risk_table_meta';

/* ─────────────── 검색조건(목업 검색박스 원문) ─────────────── */
/** 구분 — 원문 `<select>` 2종 고정(설계메모 "운용사/자펀드 2가지로 고정") */
export const GUBUN_OPTIONS = ['운용사', '자펀드'] as const;
export type Gubun = typeof GUBUN_OPTIONS[number];
/** 기준일자 기본값 — 원문 `<input type=date value>` */
export const CORP_BASE_DATE = '2026-08-12';

/** 구분별 운용사/자펀드 목록 — 원문 스크립트가 탭(화면)마다 **서로 다른** 표본을 둔다. '전체'는 원문 첫 옵션이며
    드로어의 빈 값(전체)으로 대신한다. S2_65 는 목록 스크립트가 없어 '전체'만 있다(라벨만 바뀐다). */
export type TargetLists = Record<Gubun, string[]>;

/* ─────────────── S2_65 기업개요 — 2단 헤더(기업개요 24 · 휴폐업정보 3 · 당좌거래정지정보 4), 1행 ─────────────── */
const OV = '기업개요', CL = '휴폐업정보', SU = '당좌거래정지정보';
export const OVERVIEW: TableMeta = {
  id: 'overview',
  cols: [
    { key: 'biz', label: '사업자번호', kind: 'center', pinned: true, width: 130 },
    { key: 'co', label: '투자기업', kind: 'text', width: 120 },
    { key: 'bal', label: '투자잔액', kind: 'amount' },
    { key: 'cut', label: '감액금액', kind: 'amount' },
    { key: 'corpNo', label: '법인번호', kind: 'center', group: OV },
    { key: 'dataStatus', label: '기업자료상태구분', kind: 'badge', group: OV, tones: { 정상: 'success' } },
    { key: 'entity', label: '기업주체구분', kind: 'center', group: OV },
    { key: 'scale', label: '기업규모구분', kind: 'center', group: OV },
    { key: 'detail', label: '기업상세구분', kind: 'center', group: OV },
    { key: 'market', label: '상장시장구분', kind: 'center', group: OV },
    { key: 'managed', label: '관리종목여부', kind: 'badge', group: OV, tones: { 정상: 'success' } },
    { key: 'audit', label: '외부감사여부', kind: 'center', group: OV },
    { key: 'alive', label: '기업존속여부', kind: 'badge', group: OV, tones: { '死(Die)': 'danger' } },
    { key: 'finType', label: '재무구분', kind: 'center', group: OV },
    { key: 'closeMonth', label: '결산월', kind: 'center', group: OV },
    { key: 'startDate', label: '창업일', kind: 'date', group: OV },
    { key: 'foundDate', label: '설립일', kind: 'date', group: OV },
    { key: 'empDate', label: '종업원기준일', kind: 'date', group: OV },
    { key: 'emp', label: '종업원수', kind: 'number', group: OV, align: 'center' },
    { key: 'korName', label: '한글기업명', kind: 'text', group: OV },
    { key: 'shortName', label: '약식기업명', kind: 'text', group: OV },
    { key: 'ceo', label: '한글대표자명', kind: 'center', group: OV },
    { key: 'closed', label: '폐쇄여부구분', kind: 'badge', group: OV, tones: { 폐쇄: 'danger' } },
    { key: 'industry', label: '산업코드', kind: 'text', group: OV },
    { key: 'bank', label: '한글은행지점명', kind: 'center', group: OV },
    { key: 'product', label: '한글주요제품명', kind: 'text', group: OV },
    { key: 'homepage', label: '홈페이지URL', kind: 'text', group: OV },
    { key: 'email', label: '이메일', kind: 'text', group: OV },
    { key: 'bizStatus', label: '휴폐업구분', kind: 'badge', group: CL, tones: { 폐업자: 'danger' } },
    { key: 'closeDate', label: '폐업일자', kind: 'date', group: CL },
    { key: 'lastQuery', label: '최종조회일', kind: 'date', group: CL },
    { key: 'clearing', label: '교환소', kind: 'center', group: SU },
    { key: 'susStart', label: '발생시작일자', kind: 'date', group: SU },
    { key: 'susEnd', label: '종료일자', kind: 'date', group: SU },
    { key: 'susCancel', label: '취소일자', kind: 'date', group: SU },
    { key: 'fund', label: '자펀드', kind: 'text' },
  ],
  /* 원문 `<tbody>` 1행 — 창업일·홈페이지URL·이메일·취소일자는 원문도 `-`(값 없음)라 null */
  rows: [{
    id: 'ov-1', biz: '101-81-91496', co: '(주)장수채', bal: 0, cut: 108000000,
    corpNo: '110111-2707135', dataStatus: '정상', entity: '일반법인', scale: '중소기업', detail: '주식회사', market: '대상아님',
    managed: '정상', audit: '외부감사비대상', alive: '死(Die)', finType: '제조', closeMonth: '12', startDate: null,
    foundDate: '2003-01-29', empDate: '2014-12-31', emp: 5, korName: '농업회사법인(주)장수채', shortName: '농업회사법인장수채',
    ceo: '이정록', closed: '폐쇄', industry: '기타 시설작물 재배업', bank: '길동', product: '작물(새싹땅콩) 재배',
    homepage: null, email: null, bizStatus: '폐업자', closeDate: '2018-09-20', lastQuery: '2026-08-24',
    clearing: '통합', susStart: '2019-08-20', susEnd: '2021-08-20', susCancel: null, fund: '세종R&D(20150828)',
  }],
};

/* ─────────────── S2_66 업체사업장정보 — 단일 헤더 11, 5행 ─────────────── */
const siteRow = (no: number, biz: string, comp: string, sbiz: string, kind: string, name: string, tel: string, fax: string, zip: string, addr: string, open: string): Row =>
  ({ id: `site-${no}`, no, biz, comp, sbiz, kind, name, tel, fax, zip, addr, open });
export const SITES: TableMeta = {
  id: 'sites',
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64 },
    { key: 'biz', label: '사업자번호', kind: 'center' },
    { key: 'comp', label: '투자기업', kind: 'text' },
    { key: 'sbiz', label: '사업장사업자번호', kind: 'center' },
    /* 원문 siteTag: 본사=.tag b · 그 외=.tag n */
    { key: 'kind', label: '사업장구분', kind: 'badge', tones: { 본사: 'info', 공장: 'muted', 지점: 'muted' } },
    { key: 'name', label: '한글사업장명칭', kind: 'text' },
    { key: 'tel', label: '전화번호', kind: 'center' },
    { key: 'fax', label: '팩스번호', kind: 'center' },
    { key: 'zip', label: '우편번호', kind: 'center' },
    { key: 'addr', label: '한글사업장주소', kind: 'text', width: 220 },
    { key: 'open', label: '설립일자', kind: 'date' },
  ],
  rows: [
    siteRow(1, '101-81-91496', '(주)장수채', '101-81-91496', '본사', '본사', '02-479-1966', '02-479-1967', '24232', '강원 춘천시 소양강로 32, 5동 301호', '2003-02-01'),
    siteRow(2, '101-81-91496', '(주)장수채', '221-85-33012', '공장', '춘천제1공장', '033-262-4410', '033-262-4411', '24399', '강원 춘천시 신북읍 맥국길 120', '2008-05-19'),
    siteRow(3, '134-81-27185', '(주)그린바이오텍', '134-81-27185', '본사', '본사', '031-8005-2200', '031-8005-2201', '16679', '경기 수원시 영통구 광교로 145', '2015-11-03'),
    siteRow(4, '134-81-27185', '(주)그린바이오텍', '134-81-27185', '지점', '서울영업소', '02-555-8820', '02-555-8821', '06158', '서울 강남구 테헤란로 322, 12층', '2019-04-15'),
    siteRow(5, '506-81-64912', '해양수산기업(주)', '506-81-64912', '본사', '본사', '051-405-7700', '051-405-7701', '48792', '부산 남구 감만동 우암로 84', '2011-07-22'),
  ],
};

/* ─────────────── S2_67 법정관리및화의정보 — 단일 헤더 6, 6행 ─────────────── */
const courtRow = (no: number, biz: string, co: string, dt: string, ct: string, fn: string): Row => ({ id: `court-${no}`, no, biz, co, dt, ct, fn });
export const COURT: TableMeta = {
  id: 'court',
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64 },
    { key: 'biz', label: '사업자번호', kind: 'center' },
    { key: 'co', label: '투자기업', kind: 'text' },
    { key: 'dt', label: '기준일자', kind: 'date' },
    /* 원문 ctag: '화의'=b · '종결'|'인가'=g · '파산'|'금지'=d · 그 외 n — 원문 6값을 그 규칙으로 미리 풀어 둔다 */
    { key: 'ct', label: '내용', kind: 'badge', width: 180, tones: {
      포괄적금지명령공고: 'danger', 회생절차개시결정공고: 'muted', 회생계획인가결정공고: 'success',
      화의개시결정공고: 'info', 회생절차종결결정공고: 'success', 파산선고공고: 'danger',
    } },
    { key: 'fn', label: '자펀드', kind: 'text', width: 220 },
  ],
  empty: '조회 결과가 없습니다.',
  rows: [
    courtRow(1, '101-81-91496', '(주)장수채', '2016-10-12', '포괄적금지명령공고', '세종R&D(20150828)'),
    courtRow(2, '214-88-52140', '(주)그린바이오텍', '2017-03-08', '회생절차개시결정공고', '세종R&D(20150828)'),
    courtRow(3, '128-81-33027', '농우식품(주)', '2018-05-21', '회생계획인가결정공고', '농식품혁신투자조합(20160411)'),
    courtRow(4, '305-81-77419', '(주)한들수산', '2019-11-04', '화의개시결정공고', '수산가치성장투자조합(20170922)'),
    courtRow(5, '220-87-61503', '(주)미래팜', '2020-07-16', '회생절차종결결정공고', '농식품혁신투자조합(20160411)'),
    courtRow(6, '134-86-40218', '(주)블루오션푸드', '2021-02-28', '파산선고공고', '수산가치성장투자조합(20170922)'),
  ],
};

/* ─────────────── S2_69 신용등급 — 단일 헤더 10(원문 No 없음), 4행 ─────────────── */
const creditRow = (i: number, fd: string, co: string, bn: string, gr: string, gn: string, gk: string, s: string, e: string, cri: string | null, crib: string): Row =>
  ({ id: `credit-${i}`, bn, co, s, e, gr, gn, gk, fd, cri, crib });
export const CREDIT: TableMeta = {
  id: 'credit',
  cols: [
    { key: 'bn', label: '사업자번호', kind: 'center' },
    { key: 'co', label: '투자기업', kind: 'text' },
    { key: 's', label: '등급시작일자', kind: 'date' },
    { key: 'e', label: '등급종료일자', kind: 'date' },
    /* 원문 gradeTag: R=n · A*=g · BBB*=b · B*|C*=a */
    { key: 'gr', label: '신용등급', kind: 'badge', tones: { R: 'muted', BBB: 'info', BB: 'warning', A: 'success' } },
    { key: 'gn', label: '신용등급명', kind: 'text' },
    { key: 'gk', label: '신용등급구분', kind: 'center' },
    { key: 'fd', label: '자펀드', kind: 'text', width: 220 },
    { key: 'cri', label: 'CRI기준일자', kind: 'date', width: 140 },
    { key: 'crib', label: 'CRI배치기준일자', kind: 'date' },
  ],
  /* 1행 cri 는 원문 `cri:''`(값 없음, 화면 `-`) → null */
  rows: [
    creditRow(1, '세종R&D(20150828)', '(주)장수채', '101-81-91496', 'R', '평가제외(R)', '모형등급', '2006-11-07', '2011-06-14', null, '2006-11-07'),
    creditRow(2, '세종R&D(20150828)', '(주)그린바이오텍', '214-88-52341', 'BBB', '투자적격(BBB)', '모형등급', '2016-03-15', '2021-03-14', '2016-03-15', '2016-03-15'),
    creditRow(3, '농식품첨단투자조합(20180612)', '(주)에코팜스', '312-81-44902', 'BB', '투자주의(BB)', 'E-Credit등급', '2019-05-20', '2024-05-19', '2019-05-20', '2019-05-20'),
    creditRow(4, '농식품첨단투자조합(20180612)', '(주)한들식품', '128-86-77310', 'A', '우량(A)', '휴폐업', '2020-09-01', '2025-08-31', '2020-09-01', '2020-09-01'),
  ],
};

/* ─────────────── S2_68 현금흐름등급 — 단일 헤더 6, 4행 ─────────────── */
const cashRow = (no: number, biz: string, co: string, cd: string, g: string, fn: string): Row => ({ id: `cash-${no}`, no, biz, co, cd, g, fn });
export const CASHFLOW: TableMeta = {
  id: 'cashflow',
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64 },
    { key: 'biz', label: '사업자번호', kind: 'center' },
    { key: 'co', label: '투자기업', kind: 'text' },
    { key: 'cd', label: '결산일자', kind: 'date' },
    /* 원문 gradeTag: 우수=g · 보통=n · 위험|열위=a · 부실=d (척도 확정: 우수·보통·위험·열위·부실) */
    { key: 'g', label: '현금흐름등급', kind: 'badge', tones: { 우수: 'success', 보통: 'muted', 위험: 'warning', 열위: 'warning', 부실: 'danger' } },
    { key: 'fn', label: '자펀드', kind: 'text', width: 220 },
  ],
  rows: [
    cashRow(1, '101-81-91496', '(주)장수채', '2010-12-31', '보통', '세종R&D(20150828)'),
    cashRow(2, '220-88-12345', '(주)그린바이오', '2023-12-31', '우수', '농식품벤처1호(20200401)'),
    cashRow(3, '314-81-55678', '팜스토리(주)', '2023-12-31', '열위', '스마트농업투자조합(20210615)'),
    cashRow(4, '128-86-33210', '(주)한국축산', '2023-12-31', '부실', '세종R&D(20150828)'),
  ],
};

/* ─────────────── 탭 정의 — 탭 1개 = 원문 화면 1개 ─────────────── */
export interface CorpTab {
  id: string;
  /** 탭 라벨 = 원문 화면 제목(`<h1>`) */
  label: string;
  table: TableMeta;
  /** 이 탭이 옮긴 원문 파일 */
  source: string;
  /** 원문 스크립트의 구분별 운용사/자펀드 표본('전체' 제외) */
  targets: TargetLists;
  /** 행의 자펀드 컬럼 키 — 구분=자펀드일 때 대상 선택이 실제로 행을 거른다. 없으면 no-op(데이터 연동 후 적용) */
  fundKey?: string;
}

export const NICE_TABS: CorpTab[] = [
  { id: 'overview', label: '기업개요', table: OVERVIEW, source: src('S2_65_기업개요.html'),
    targets: { 운용사: [], 자펀드: [] }, fundKey: 'fund' },
  { id: 'sites', label: '투자기업사업장정보', table: SITES, source: src('S2_66_업체사업장정보.html'),
    targets: {
      운용사: ['케이비인베스트먼트', '한국투자파트너스', '아이엠엠인베스트먼트'],
      자펀드: ['케이비 농식품투자조합', '한투 청년농식품투자조합', '아이엠엠 스마트농업투자조합'],
    } },
  { id: 'court', label: '법정관리및화의정보', table: COURT, source: src('S2_67_법정관리및화의정보.html'),
    targets: {
      운용사: ['세종벤처파트너스', '농심캐피탈', '수산자산운용'],
      자펀드: ['세종R&D(20150828)', '농식품혁신투자조합(20160411)', '수산가치성장투자조합(20170922)'],
    }, fundKey: 'fn' },
];

export const CREDIT_TABS: CorpTab[] = [
  { id: 'credit', label: '신용등급', table: CREDIT, source: src('S2_69_신용등급.html'),
    /* 원문: 운용사는 원천에 운용사 컬럼이 없어 '전체'만(임의 생성 안 함) */
    targets: { 운용사: [], 자펀드: ['세종R&D(20150828)', '농식품첨단투자조합(20180612)'] }, fundKey: 'fd' },
  { id: 'cashflow', label: '현금흐름등급', table: CASHFLOW, source: src('S2_68_현금흐름등급.html'),
    targets: {
      운용사: ['KB증권', 'IMM인베스트먼트', '한국투자파트너스'],
      자펀드: ['세종R&D(20150828)', '농식품벤처1호(20200401)', '스마트농업투자조합(20210615)'],
    }, fundKey: 'fn' },
];

export const NICE_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS', captureFiles: NICE_TABS.map((t) => t.source),
};
export const CREDIT_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS', captureFiles: CREDIT_TABS.map((t) => t.source),
};
