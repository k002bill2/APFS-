/* 수탁보고 > 자펀드 수탁 6리프의 원문 데이터(순수 모듈, React import 금지).
   - 실물자료관리(업로드) = S3_98 실물자료 조회(월별) — 업로드 박스 + 14열 목록(선택 체크박스 포함)
   - 실물검증비교조회     = S3_101 실물검증 조회 — 2단 헤더 표 3장(투자자산 · 미투자자산 거래 · 미투자자산)
   - 유가증권관리(업로드) = 신규(현행 목업 없음) — 형제 S3_98 구조의 빈 화면
   - 유가증권비교조회     = 신규(현행 목업 없음) — 형제 S3_101 섹션1 구조의 빈 화면
   - 공통코드조회         = S3_100 공통코드 — 코드구분 9종 → 코드 목록
   - 자펀드코드 조회      = S3_99 조합코드 관리 — 편집형 목록 4행
   출처: docs/mockups/03_자산수탁/*.html 의 `<tbody>`·`<script> DATA/LISTS` 를 2026-09-23 파싱 실측으로 옮겼다.
   값·순서·개수를 바꾸지 않는다(원문이 "데모 행"이라 적은 행도 원문 DATA 에 있는 한 그대로 싣는다 — 합성 금지는
   makeRows 식 생성에 대한 것이다). 원문에 행이 없으면 원문 빈 상태 문구로 둔다. */
import type { TableMeta, Provenance, Row, ColMeta } from './risk_table_meta';
import type { Tone } from './components';

export const TRUST_DIR = 'docs/mockups/03_자산수탁';
export const trustSrc = (file: string): string => `${TRUST_DIR}/${file}`;

const prov = (file: string): Provenance => ({ capturedAt: '2026-09-23', sourceSystem: 'TRUST', captureFiles: [trustSrc(file)] });

/** 신규 화면 출처 — 원천 목업 없음(브리프 규칙 3). captureFiles 는 빈 배열(존재하지 않는 경로를 적지 않는다) */
const NEW_PROVENANCE: Provenance = { capturedAt: '2026-09-23', sourceSystem: 'NEW', captureFiles: [] };

/** S3_101 원문 fmt() 소수 자릿수 — 원 정수 · 백만원 최대 1자리 · 억원 최대 2자리(공용 규칙은 백만원도 2자리) */
export const VERIFY_DIGITS: TableMeta['unitDigits'] = { 원: { min: 0, max: 0 }, 백만원: { min: 0, max: 1 }, 억원: { min: 0, max: 2 } };

/** 원문 `.tag g`(일치) — 불일치 값은 원문에 없지만 같은 배지 칸이 받을 수 있게 위험색만 둔다 */
const MATCH_TONES: Record<string, Tone> = { 일치: 'success', 불일치: 'danger' };

/* ═══════════════ S3_98 실물자료 조회(월별) → 실물자료관리(업로드) ═══════════════ */
export const PHYSICAL_PROVENANCE = prov('S3_98_실물자료_조회__월별_.html');

/** 원문 `BIG_LABEL` — 대분류 8종(검색조건 옵션 `[A] 유동자산` … 과 같은 체계) */
export const BIG_LABEL: Record<string, string> = {
  A: '유동자산', B: '채권', C: '대여', D: '주식', E: '프로젝트투자', F: '기타', G: '채권(미투자산)', H: '주식(미투자산)',
};
/** 원문 `MID_LABEL` — 중분류 15종 */
export const MID_LABEL: Record<string, string> = {
  A1: 'CALL', A2: '청약증거금', A3: 'CD', A4: 'CP', A5: '정기예금', A6: '보통예금', A7: 'MMDA', A8: 'RP', A9: '기타',
  B1: '일반채권', B2: '신주인수권부사채', B3: '교환사채', B4: '전환사채', B5: '기타', F1: '기타',
};
/** 검색조건 옵션 표기 — 원문 `<option>[A] 유동자산</option>` 그대로 */
export const BIG_OPTIONS = Object.entries(BIG_LABEL).map(([k, v]) => `[${k}] ${v}`);
export const MID_OPTIONS = Object.entries(MID_LABEL).map(([k, v]) => `[${k}] ${v}`);
/** '[B] 채권' → 'B' */
export const optionCode = (opt: string): string => opt.match(/^\[(\w+)\]/)?.[1] ?? '';
/** 원문 운용사 select 의 유일한 옵션(빈 값) 표기 */
export const GP_PLACEHOLDER = '------ G.P ------';
export const PHYSICAL_BASE_YM = '2026-07';

const PHYSICAL_COLS: ColMeta[] = [
  { key: 'custodian', label: '수탁기관', kind: 'center' },
  { key: 'ym', label: '기준년월', kind: 'date' },
  { key: 'seq', label: '순번', kind: 'number', align: 'center', width: 64 },
  { key: 'big', label: '자산분류(대분류)', kind: 'center' },
  { key: 'mid', label: '유형분류(중분류)', kind: 'center' },
  { key: 'union', label: '조합명', kind: 'text', width: 180 },
  { key: 'item', label: '종목명', kind: 'text', width: 240 },
  { key: 'code', label: '종목코드', kind: 'center' },
  { key: 'biz', label: '사업자번호', kind: 'center' },
  { key: 'acct', label: '계좌번호', kind: 'center' },
  { key: 'shares', label: '잔여주수', kind: 'number' },
  { key: 'balance', label: '보유잔액', kind: 'amount' },
  { key: 'interest', label: '이자', kind: 'amount' },
];

/** 원문 DATA 1건. 표시값은 원문 render() 결과 그대로 — 자산/유형분류 = 코드 + (한글명), 사업자번호 = bizFmt 하이픈.
    계좌번호·잔여주수·보유잔액·이자는 원문 null(`dash()` → '-'). bigCode·midCode 는 검색조건 매칭용 숨은 키(원문 r.big·r.mid). */
export const PHYSICAL_ROWS: Row[] = [
  { id: 'phys-1', custodian: 'NONGHYUP', ym: '2026-07', seq: 1, big: 'B (채권)', mid: 'B2 (신주인수권부사채)',
    union: 'KB신농사직설 투자조합', item: '(주)에이피테크놀로지 제1회신주인수권부사', code: 'KR_BD0001892V', biz: '124-81-89654',
    acct: null, shares: null, balance: null, interest: null, bigCode: 'B', midCode: 'B2' },
];

export const PHYSICAL_TABLE: TableMeta = {
  id: 'physical', cols: PHYSICAL_COLS, rows: PHYSICAL_ROWS, empty: '조회된 실물자료가 없습니다.',
};

/* ═══════════════ 신규 — 유가증권관리(업로드) ═══════════════
   원천 목업이 없다. 형제 화면 S3_98(실물자료 조회(월별))의 검색조건·업로드 박스·목록 컬럼을 **그대로 준용**하고,
   원문 근거가 없는 추정이므로 모든 컬럼에 ⚠검토필요 마커를 단다. 행은 만들지 않는다(빈 상태). */
export const SECURITIES_PROVENANCE = NEW_PROVENANCE;
export const NEW_SCREEN_CAPTION = '신규 화면 — 현행 목업 없음(업무 정의 확인 필요)';
export const SECURITIES_TABLE: TableMeta = {
  id: 'securities', cols: PHYSICAL_COLS.map((c) => ({ ...c })), rows: [],
};

/* ═══════════════ S3_101 실물검증 조회 → 실물검증비교조회 ═══════════════ */
export const VERIFY_PROVENANCE = prov('S3_101_실물검증_조회.html');
export const VERIFY_FUND = '2022 원익 스마트 혁신 Agtech투자조합';
export const VERIFY_BASE_YM = '2026-07';
const O = '운용사';
const C = '수탁기관';
const M = '일치여부';
const noCol: ColMeta = { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64 };

/** 섹션1 투자자산 — 원문 tfoot 는 **표시된 1행의 합이 아닌** 보유 합계 리터럴(보유주수 287,260 · 잔액 16,112,429,939)이다.
    값을 다시 계산하지 않고 원문 그대로 싣는다('sum' 이면 24,462 · 1,810,188,000 으로 원문 값이 바뀐다). */
export const VERIFY_INVEST_TOTAL = { shares: 287260, balance: 16112429939 } as const;
const VERIFY_INVEST_COLS: ColMeta[] = [
  noCol,
  { key: 'oCo', label: '투자기업', kind: 'text', group: O, width: 150 },
  { key: 'oSh', label: '보유주수', kind: 'number', group: O, total: () => VERIFY_INVEST_TOTAL.shares },
  { key: 'oPr', label: '원금(A)', kind: 'amount', group: O },
  { key: 'oRd', label: '감액금액(B)', kind: 'amount', group: O, align: 'center' },
  { key: 'oBal', label: '잔액(A-B)', kind: 'amount', group: O, total: () => VERIFY_INVEST_TOTAL.balance },
  { key: 'cSh', label: '보유주수', kind: 'number', group: C },
  { key: 'cBal', label: '잔액', kind: 'amount', group: C },
  { key: 'cCo', label: '투자기업', kind: 'text', group: C, width: 200 },
  { key: 'mSh', label: '보유주수', kind: 'badge', group: M, tones: MATCH_TONES },
  { key: 'mBal', label: '잔액', kind: 'badge', group: M, tones: MATCH_TONES },
];
export const VERIFY_INVEST: TableMeta = {
  id: 'verifyInvest', title: '투자자산', totalLabel: '합계', cols: VERIFY_INVEST_COLS, unitDigits: VERIFY_DIGITS,
  /* 감액금액(B) 는 원문이 문자열 '-' 를 가운데 정렬로 적었다 — 숫자로 바꾸지 않는다 */
  rows: [{ id: 'vinv-1', no: 1, oCo: '두나무(주)', oSh: 24462, oPr: 1810188000, oRd: '-', oBal: 1810188000,
    cSh: 24462, cBal: 1810188000, cCo: '(주)두나무 보통주(구주)', mSh: '일치', mBal: '일치' }],
};

export const VERIFY_UNINV_TX: TableMeta = {
  id: 'verifyUninvTx', title: '미투자자산 거래', unitDigits: VERIFY_DIGITS,
  cols: [
    noCol,
    { key: 'oItem', label: '종목', kind: 'text', group: O },
    { key: 'oSh', label: '보유주수', kind: 'number', group: O },
    { key: 'oBal', label: '잔액', kind: 'amount', group: O },
    { key: 'cSh', label: '보유주수', kind: 'number', group: C },
    { key: 'cBal', label: '잔액', kind: 'amount', group: C },
    { key: 'cItem', label: '종목', kind: 'text', group: C },
    { key: 'mSh', label: '보유주수', kind: 'badge', group: M, tones: MATCH_TONES },
    { key: 'mBal', label: '잔액', kind: 'badge', group: M, tones: MATCH_TONES },
  ],
  rows: [],
  empty: '조회된 미투자자산 거래 내역이 없습니다.',
};

export const VERIFY_UNINV: TableMeta = {
  id: 'verifyUninv', title: '미투자자산', totalLabel: '합계', unitDigits: VERIFY_DIGITS,
  cols: [
    noCol,
    { key: 'oAcct', label: '계좌번호', kind: 'text', group: O },
    { key: 'oBal', label: '잔액', kind: 'amount', group: O, total: 'sum' },
    { key: 'cBal', label: '잔액', kind: 'amount', group: C },
    { key: 'cAcct', label: '계좌번호', kind: 'text', group: C, width: 240 },
    { key: 'mBal', label: '잔액', kind: 'badge', group: M, tones: MATCH_TONES },
  ],
  rows: [{ id: 'vun-1', no: 1, oAcct: '3170025994621', oBal: 157699996, cBal: 157699996, cAcct: '3170025994621 (MMDA(농협)(공통))', mBal: '일치' }],
};

export const VERIFY_TABLES: TableMeta[] = [VERIFY_INVEST, VERIFY_UNINV_TX, VERIFY_UNINV];

/* ═══════════════ 신규 — 유가증권비교조회 ═══════════════
   원천 목업이 없다. 형제 S3_101 섹션1(투자자산: 운용사·수탁기관·일치여부 2단 헤더)의 컬럼을 그대로 준용한 표 1장,
   모든 컬럼에 ⚠검토필요 마커. 섹션 제목·합계·행은 만들지 않는다(원문 근거 없음). */
export const SECURITIES_COMPARE_PROVENANCE = NEW_PROVENANCE;
export const SECURITIES_COMPARE: TableMeta = {
  id: 'securitiesCompare', unitDigits: VERIFY_DIGITS,
  cols: VERIFY_INVEST_COLS.map(({ total: _t, ...c }) => ({ ...c })),
  rows: [],
};

/* ═══════════════ S3_100 공통코드 → 공통코드조회 ═══════════════ */
export const CODE_PROVENANCE = prov('S3_100_공통코드.html');
/** 원문 코드구분 9종(옵션 순서 그대로) · 기본 '유형분류'(원문 selected) */
export const CODE_GROUPS = ['해외기업고유번호', '트랜잭션구분', '자산분류', '유형분류', '거래유형', '거래상세유형', '거래구분', '매입매도구분', '종목구분'] as const;
export const CODE_DEFAULT = '유형분류';
/** 원문 `LISTS` — 확정 실데이터는 '유형분류' 1건(A1/CALL)뿐, 나머지 8종은 빈 배열. grp = LISTS 키(화면에 그리지 않는 분류 키) */
export const CODE_TABLE: TableMeta = {
  id: 'commonCode',
  cols: [
    { key: 'code', label: '코드', kind: 'badge', tone: 'info', width: 180 },
    { key: 'name', label: '코드명', kind: 'text', width: 320 },
    { key: 'note', label: '비고', kind: 'text' },
  ],
  /* 원문 note '' → render `(r.note||'-')` */
  rows: [{ id: 'cc-1', grp: '유형분류', code: 'A1', name: 'CALL', note: null }],
  empty: '조회된 공통코드가 없습니다.',
};

/* ═══════════════ S3_99 조합코드 관리 → 자펀드코드 조회 ═══════════════ */
export const FUND_CODE_PROVENANCE = prov('S3_99_조합코드_관리.html');
export const FUND_CODE_ORGS = ['농협중앙회'] as const;
/** 원문 DATA 4행("1행은 원본 실데이터, 이하 데모 행" — 원문 주석 그대로, 4행 모두 원문 리터럴).
    자조합수탁·모태수탁은 원문 boolean(체크박스) → 'Y'/'N'(Cell 계약 — 엑셀에도 그대로 나간다) */
export const FUND_CODE_TABLE: TableMeta = {
  id: 'fundCode',
  cols: [
    { key: 'no', label: 'NO', kind: 'number', align: 'center', width: 64 },
    { key: 'nm', label: '조합이름', kind: 'text', width: 260 },
    { key: 'code', label: '수탁기관조합코드', kind: 'center', width: 200 },
    /* 원문 셀 체크박스 → 표시 전용 Y/N 배지(편집은 선택 바 [수정] 모달 — 2026-09-23 관리형 규약) */
    { key: 'sub', label: '자조합수탁', kind: 'badge', tones: { Y: 'success', N: 'muted' }, width: 110 },
    { key: 'mo', label: '모태수탁', kind: 'badge', tones: { Y: 'success', N: 'muted' }, width: 110 },
  ],
  rows: [
    { id: 'fc-1', no: 1, nm: '와이앤아처 로컬 리노베이션 투자조합', code: 'CAZ00001', sub: 'Y', mo: 'Y' },
    { id: 'fc-2', no: 2, nm: '농식품 스마트팜 투자조합 제1호', code: 'CAZ00002', sub: 'N', mo: 'Y' },
    { id: 'fc-3', no: 3, nm: '청년농업인 창업 투자조합', code: 'CAZ00003', sub: 'N', mo: 'N' },
    { id: 'fc-4', no: 4, nm: '수산식품 벤처투자조합', code: 'CAZ00004', sub: 'Y', mo: 'N' },
  ],
};
