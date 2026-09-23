/* 부처보고 2리프의 원문 데이터(순수 모듈, React import 금지).
   - 연도별투자현황(route report-bucheo) = 03_연도별투자현황 목업 + 04_연도별투자현황상세 목업(탭 2 — 메뉴 리프가 하나라 상세를 탭으로 통합)
   - 등록원부관리 = S4_108_등록원부_관리 — 목록 + 팝업 6종(입력/수정 · 조합원 · 전문인력 · 업로드 · 출력 · 발급이력)
   출처: docs/mockups/04_모태펀드보고/** 의 `<script> DATA` 를 2026-09-23 파싱 실측으로 옮겼다. 값·순서·개수를 바꾸지 않는다.

   금액 저장 계약(risk_table_meta): 'amount' 칸은 **원 단위 숫자**. 연도별투자현황 원문 DATA 는 백만원 문자열('16,000')이라
   ×10⁶ 해서 싣고, 원문 기본 단위(백만원)를 화면 기본값으로 둔다 — 그러면 첫 화면 표시값이 원문 리터럴과 같다. */
import type { TableMeta, Provenance, Row, ColMeta, Cell } from './risk_table_meta';

const MOCK = 'docs/mockups/04_모태펀드보고';
export const YEARLY_SRC = `${MOCK}/03_연도별투자현황/mockup/연도별투자현황_목업.html`;
export const YEARLY_DETAIL_SRC = `${MOCK}/04_연도별투자현황상세/mockup/연도별투자현황상세_목업.html`;
export const LEDGER_SRC = `${MOCK}/S4_108_등록원부_관리.html`;

export const YEARLY_PROVENANCE: Provenance = { capturedAt: '2026-09-23', sourceSystem: 'BRIEF', captureFiles: [YEARLY_SRC, YEARLY_DETAIL_SRC] };
export const LEDGER_PROVENANCE: Provenance = { capturedAt: '2026-09-23', sourceSystem: 'BRIEF', captureFiles: [LEDGER_SRC] };

/* ═══════════════ 연도별투자현황 — 검색조건 ═══════════════ */
export const YEARLY_BASE_YM = '2026-08';
export const ACCOUNT_TYPES = ['농식품', '수산'] as const;          // 원문 계정구분 select(전체 + 2)
export const BASES = ['선정년도', '결성년도'] as const;            // 원문 조회기준 라디오 — 그리드 연도 컬럼 라벨·집계축
export type Basis = typeof BASES[number];
export const COMB_TYPES = ['전체', '운영조합', '청산조합'] as const;  // 상세 원문 조합구분 라디오 — 행 필터
/** 원문 `.foot-note` 3줄(화면 안내문 — 설계메모 `.note` 와 다르다, spec 이 "원문 사용·임의 문구 금지") */
export const YEARLY_FOOTNOTES = [
  '* 현금성자산 = 미투자자산의 금융상품',
  '* 결성년도 집계기준은 조합정보의 등록일을 기준으로 Sorting',
  '* 기배분액은 세전을 나타냄(수익배당(세후)+원천징수)',
] as const;

/* 공통 금액 컬럼(원문 두 화면이 같은 9열 순서) */
const AMOUNT_COLS: ColMeta[] = [
  { key: 'ct', label: '약정총액', kind: 'amount' },
  { key: 'mc', label: '모태펀드약정액', kind: 'amount' },
  { key: 'a', label: '납입총액(A)', kind: 'amount' },
  { key: 'ma', label: '모태펀드납입액', kind: 'amount' },
  { key: 'b1', label: '현금성자산(B1)', kind: 'amount' },
  { key: 'b2', label: '투자자산잔액(B2)', kind: 'amount' },
  { key: 'cc', label: '기배분액(C)', kind: 'amount' },
  { key: 'rec', label: '회수금', kind: 'amount' },
  { key: 'pf', label: '수익', kind: 'amount' },
];
/** 투자배수 헤더 — 원문 `투자배수<br><span>(B1+B2+C)/A</span>` */
export const MULTIPLE_LABEL = '투자배수 (B1+B2+C)/A';

const n = (v: Cell) => (typeof v === 'number' ? v : 0);
/** 합계 투자배수 = (ΣB1+ΣB2+ΣC)/ΣA — 원문 tfoot 1.63(두 기준 모두 같은 합계라 같은 값) */
export const multipleOf = (rows: readonly Row[]): Cell => {
  const a = rows.reduce((s, r) => s + n(r.a), 0);
  const num = rows.reduce((s, r) => s + n(r.b1) + n(r.b2) + n(r.cc), 0);
  return a ? (num / a).toFixed(2) : '-';
};

/* ═══════════════ 탭 1 — 연도별 투자현황(03 목업) ═══════════════ */
/** 원문 행(백만원 문자열) → 원 단위 행 */
const M = 1e6;
type YearlyLit = [g: string, y: string, c: number, ct: number, mc: number, a: number, ma: number, b1: number, b2: number, cc: number, rec: number, pf: number, mul: string];
const yearlyRow = (prefix: string) => ([g, y, c, ct, mc, a, ma, b1, b2, cc, rec, pf, mul]: YearlyLit, i: number): Row => ({
  id: `${prefix}-${i + 1}`, g, y, c, ct: ct * M, mc: mc * M, a: a * M, ma: ma * M, b1: b1 * M, b2: b2 * M, cc: cc * M, rec: rec * M, pf: pf * M, mul,
});
/** 원문 DATA_SEL(선정년도 기준) 4행 — 백만원 */
const DATA_SEL: YearlyLit[] = [
  ['운영', '2011', 1, 16000, 8000, 0, 0, 270, 1764, 0, 1836, 19, '-'],
  ['운영', '2012', 3, 45000, 22000, 22000, 22000, 3000, 28000, 5000, 8000, 1200, '1.64'],
  ['운영', '2013', 5, 70000, 34000, 34000, 34000, 4000, 41000, 9000, 12000, 2100, '1.59'],
  ['청산', '2014', 2, 20000, 10000, 10000, 10000, 500, 0, 15000, 15000, 5000, '1.55'],
];
/** 원문 DATA_FORM(결성년도 기준 — 조합 등록일로 재집계) 4행 — 백만원 */
const DATA_FORM: YearlyLit[] = [
  ['운영', '2012', 2, 30000, 15000, 12000, 12000, 1500, 14000, 2000, 5000, 700, '1.46'],
  ['운영', '2013', 3, 51000, 25000, 25000, 25000, 3200, 30000, 6000, 9000, 1400, '1.57'],
  ['운영', '2014', 4, 50000, 24000, 24000, 24000, 2600, 26764, 6000, 8836, 1219, '1.48'],
  ['청산', '2015', 2, 20000, 10000, 5000, 5000, 470, 0, 15000, 14000, 5000, '3.09'],
];
/** 원문 TOTALS(백만원) + 조합수 11 + 투자배수 1.63 — 테스트가 합계 규칙과 대조한다 */
export const YEARLY_TOTALS_LIT = { c: 11, ct: 151000, mc: 74000, a: 66000, ma: 66000, b1: 7770, b2: 70764, cc: 29000, rec: 36836, pf: 8319, mul: '1.63' } as const;

/** 원문 fmt() 소수 자릿수 — 요약: 백만원 정수 · 억원 최대 1자리 / 상세: 백만원 반올림 정수 · 억원 항상 1자리 */
export const YEARLY_DIGITS: TableMeta['unitDigits'] = { 원: { min: 0, max: 0 }, 백만원: { min: 0, max: 0 }, 억원: { min: 0, max: 1 } };
export const DETAIL_DIGITS: TableMeta['unitDigits'] = { 원: { min: 0, max: 0 }, 백만원: { min: 0, max: 0 }, 억원: { min: 1, max: 1 } };

const yearlyTable = (basis: Basis, rows: YearlyLit[]): TableMeta => ({
  id: `yearly-${basis}`, totalLabel: '합계', unitDigits: YEARLY_DIGITS,
  cols: [
    { key: 'g', label: '구분', kind: 'badge', tones: { 운영: 'info', 청산: 'muted' }, pinned: true },
    /* 원문 `#basisCol` — 조회기준 라디오 값이 곧 헤더 라벨. 합계행은 '-' */
    { key: 'y', label: basis, kind: 'center', total: 'dash' },
    { key: 'c', label: '조합수', kind: 'number', align: 'center', total: 'sum' },
    ...AMOUNT_COLS.map((c) => ({ ...c, total: 'sum' as const })),
    { key: 'mul', label: MULTIPLE_LABEL, kind: 'number', align: 'center', total: multipleOf },
  ],
  rows: rows.map(yearlyRow(basis === '선정년도' ? 'sel' : 'form')),
});
export const YEARLY_TABLES: Record<Basis, TableMeta> = { 선정년도: yearlyTable('선정년도', DATA_SEL), 결성년도: yearlyTable('결성년도', DATA_FORM) };

/* ═══════════════ 탭 2 — 연도별투자현황상세(04 목업) ═══════════════ */
/** 원문 DATA 4행(원 단위). ys=선정년도 · yf=결성년도(조회기준에 따라 연도 칸이 바뀐다) · g=운영/청산(조합구분 필터 — 화면 칸 아님) */
export const DETAIL_ROWS: Row[] = [
  { id: 'det-1', ys: '2010', yf: '2011', r: '1', gp: 'KB증권(주)', fn: '현대동양농식품사모투자전문회사', ct: 32000000000, mc: 15700000000, a: 32000000000, ma: 15700000000, b1: 0, b2: 0, cc: 39713485321, rec: 39713485321, pf: 7713485321, mul: '1.24', g: '청산' },
  { id: 'det-2', ys: '2012', yf: '2012', r: '1', gp: '한국투자파트너스', fn: '한투 농식품 투자조합', ct: 20000000000, mc: 10000000000, a: 20000000000, ma: 10000000000, b1: 2000000000, b2: 22000000000, cc: 3000000000, rec: 5000000000, pf: 1000000000, mul: '1.35', g: '운영' },
  { id: 'det-3', ys: '2013', yf: '2014', r: '2', gp: 'IMM인베스트먼트', fn: 'IMM 스마트농업 투자조합', ct: 40000000000, mc: 20000000000, a: 40000000000, ma: 20000000000, b1: 5000000000, b2: 45000000000, cc: 8000000000, rec: 12000000000, pf: 3000000000, mul: '1.45', g: '운영' },
  { id: 'det-4', ys: '2015', yf: '2015', r: '1', gp: '수산벤처파트너스', fn: '블루푸드테크 투자조합', ct: 15000000000, mc: 7500000000, a: 5000000000, ma: 2500000000, b1: 0, b2: 0, cc: 12000000000, rec: 11000000000, pf: 4000000000, mul: '2.40', g: '청산' },
];
export const DETAIL_EMPTY = '조건에 맞는 자펀드가 없습니다.';

/** 상세 표 — No 는 원문이 필터 후 `i+1` 로 다시 매기는 파생 칸, 연도 칸은 조회기준에 따라 ys/yf 를 싣는다 */
export const detailTable = (basis: Basis): TableMeta => ({
  id: `detail-${basis}`, empty: DETAIL_EMPTY, unitDigits: DETAIL_DIGITS,
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64, derived: true },
    { key: 'y', label: basis, kind: 'center', derived: true },
    { key: 'r', label: '차수', kind: 'center' },
    { key: 'gp', label: '운용사', kind: 'text', width: 150 },
    { key: 'fn', label: '자펀드', kind: 'text', width: 220 },
    ...AMOUNT_COLS,
    { key: 'mul', label: MULTIPLE_LABEL, kind: 'number', align: 'center' },
  ],
  rows: DETAIL_ROWS,
});
/** 원문 render(): 조합구분 필터 → 연도 칸(basis) → No 재부여 */
export function detailRows(basis: Basis, comb: string): Row[] {
  const g = comb === '운영조합' ? '운영' : comb === '청산조합' ? '청산' : '';
  return DETAIL_ROWS.filter((r) => !g || r.g === g).map((r, i) => ({ ...r, no: i + 1, y: basis === '결성년도' ? r.yf : r.ys }));
}

/* ═══════════════ 등록원부관리(S4_108) — 목록 ═══════════════ */
/** 원문 DATA 3행("행1=원천 샘플, 행2·3=도메인 정합 샘플" — 원문 주석 그대로, 3행 모두 원문 리터럴).
    출자약정총액은 원문 문자열('16,000,000,000') → 원 단위 숫자. active(boolean) → 활성상태 '활성'/'비활성'(원문 스위치 라벨) */
export const LEDGER_TABLE: TableMeta = {
  id: 'ledger',
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64 },
    { key: 'regno', label: '등록번호', kind: 'center' },
    { key: 'nm', label: '명칭', kind: 'text', width: 200 },
    { key: 'dur', label: '존속기간', kind: 'center', width: 210 },
    { key: 'amt', label: '출자약정총액(원)', kind: 'number' },   // 라벨에 단위가 박혀 있고 단위 토글이 없다 — amount 면 엑셀 헤더가 '(원) (원)' 이 된다
    { key: 'gp', label: '업무집행조합원명', kind: 'text', width: 170 },
    /* 원문 `관리` 칸(행 버튼 3개)·활성상태 스위치는 옮기지 않는다 — 수정·조합원관리·전문인력관리·활성화/비활성화는
       체크박스 선택 → 선택 바(2026-09-23 관리형 규약). 활성상태는 표시 전용 배지 */
    { key: 'active', label: '활성상태', kind: 'badge', tones: { 활성: 'success', 비활성: 'muted' } },   // compact — 내용폭(원문 120 하한 제거)
  ],
  rows: [
    { id: 'lg-1', no: 1, regno: '2011-10', nm: '유니 수산식품 투자조합 1호', dur: '2011-12-26 ~ 2018-12-25', amt: 16000000000, gp: '(주)유니창업투자', active: '활성' },
    { id: 'lg-2', no: 2, regno: '2012-05', nm: '농식품 벤처투자조합 2호', dur: '2012-06-01 ~ 2019-05-31', amt: 20000000000, gp: '(주)케이벤처파트너스', active: '활성' },
    { id: 'lg-3', no: 3, regno: '2015-03', nm: '수산식품 성장투자조합', dur: '2015-04-01 ~ 2023-03-31', amt: 12000000000, gp: '한국투자파트너스', active: '비활성' },
  ],
};
/** 폼 값 → 목록 행 조각(등록번호·명칭·존속기간·출자약정총액·업무집행조합원명) */
export function ledgerPatch(v: Record<string, string>): Partial<Row> {
  const n = Number(v.amt.replace(/,/g, ''));
  return {
    regno: v.regno.trim(), nm: v.nm.trim(), dur: v.dur1 || v.dur2 ? `${v.dur1} ~ ${v.dur2}` : null,
    amt: v.amt.trim() && Number.isFinite(n) ? n : null, gp: v.gpname.trim() || null,
  };
}

/** 원문 비활성원부 라디오(기본 '제외') */
export const INACTIVE_OPTIONS = ['제외', '포함'] as const;
/** 검색조건 적용 — 명칭 부분일치 · 비활성원부 '제외' 면 활성상태 '비활성' 행을 숨긴다 */
export function ledgerRows(rows: readonly Row[], name: string, inactive: string): Row[] {
  const q = name.trim();
  return rows.filter((r) => (!q || String(r.nm).includes(q)) && (inactive === '포함' || r.active !== '비활성'));
}
/** 화면 표시 행 — 조건 미적용(첫 화면·초기화)이면 원문처럼 전 행, 사용자가 조건을 바꾼 뒤에만 ledgerRows 로 거른다
    (원문 [조회]는 토스트뿐이라 기본 '제외'가 첫 화면에 적용되지 않는다) */
export function ledgerShown(rows: readonly Row[], name: string, inactive: string, applied: boolean): Row[] {
  return applied ? ledgerRows(rows, name, inactive) : [...rows];
}

/* ═══════════════ 등록원부관리 — 팝업 원문 ═══════════════ */
/** 팝업 A(입력/수정) 이력 섹션 6개 — 원문 histSec(key, 제목, 입력칸, 이력 그리드 헤더). 수정 모드 기본값·기존 이력은 원문 리터럴 */
export interface HistSection {
  key: 'nm' | 'dur' | 'addr' | 'amt' | 'gpname' | 'gpaddr';
  title: string;
  /** 이력 그리드 헤더(원문 순서, 마지막 '관리' 포함) */
  heads: string[];
  /** 수정 모드 입력칸 기본값(원문 isEdit 분기) */
  editValue?: string;
  /** 수정 모드 기존 이력 1행(원문 isEdit 분기 — 소재지·업무집행조합원의 주소만) */
  editHistory?: string[];
}
const HIST_TAIL = ['변경일자', '등록일자', '관리'];
const PAST_ADDR = ['서울특별시 종로구 사직로 8길 24 경희궁의 아침 2단지 820호', '2015-10-01', '2015-10-06'];
const EDIT_ADDR = '서울특별시 강남구 역삼로 110 태양21빌딩 10층';
export const HIST_SECTIONS: HistSection[] = [
  { key: 'nm', title: '조합 명칭 / 등록번호', heads: ['조합명', ...HIST_TAIL] },
  { key: 'dur', title: '존속기간', heads: ['시작일', '종료일', ...HIST_TAIL], editValue: '2011-12-26~2018-12-25' },
  { key: 'addr', title: '소재지', heads: ['소재지', ...HIST_TAIL], editValue: EDIT_ADDR, editHistory: PAST_ADDR },
  { key: 'amt', title: '출자약정총액', heads: ['출자약정총액', ...HIST_TAIL], editValue: '16,000,000,000' },
  { key: 'gpname', title: '업무집행조합원 명칭', heads: ['업무집행조합원 명칭', ...HIST_TAIL], editValue: '(주)유니창업투자' },
  { key: 'gpaddr', title: '업무집행조합원의 주소', heads: ['업무집행조합원의 주소', ...HIST_TAIL], editValue: EDIT_ADDR, editHistory: PAST_ADDR },
];
/** 팝업 A 마지막 섹션 '출자 좌당 금액 / 최초등록' 수정 모드 값 */
export const LEDGER_UNIT_PRICE = '100,000,000';
export const LEDGER_FIRST_REG = '2011-12-26';
/** 입력칸 비었을 때 원문 flashErr 문구 */
export const HIST_REQUIRED: Record<HistSection['key'], string> = {
  nm: '조합명칭을 입력하세요', dur: '존속기간 시작일을 입력하세요', addr: '소재지를 입력하세요',
  amt: '출자약정총액을 입력하세요', gpname: '업무집행조합원 명칭을 입력하세요', gpaddr: '업무집행조합원의 주소를 입력하세요',
};

/** 팝업 B(조합원 및 납입출자금 관리) — 원문 리터럴 */
export const MEMBER_HEADS = ['명칭', '주민(사업자)등록번호', '조합원구분', '약정액', '출자좌수', '관리'];
export const MEMBER_ROWS = [['엘앤에스벤처캐피탈주식회사', '120-87-07123', '업무집행조합원', '1,600,000,000', '1,600']];
export const MEMBER_KINDS = ['업무집행조합원', '유한책임조합원', '특별조합원'] as const;
export const MEMBER_FORM = { name: '엘앤에스벤처캐피탈 주식회사', kind: '업무집행조합원', regNo: '120-87-07123', regDate: '', amount: '1,600,000,000', units: '1,600' };
export const PAYMENT_HEADS = ['등록일', '금회출자액', '원인', '출자좌수', '출자누계', '관리'];
export const PAYMENT_ROWS = [['2012-07-27', '400,000,000', '설립출자금 납입(2012.7.19)', '400', '400,000,000']];

/** 팝업 C(전문인력 관리) — 원문 리터럴 */
export const EXPERT_HEADS = ['명칭', '주민(사업자)등록번호', '전문인력구분', '담당시작일', '담당종료일', '관리'];
export const EXPERT_ROWS = [['박형철', '680722-1******', '대표전문인력', '2011-12-26', '2012-11-27']];
export const EXPERT_KINDS = ['대표전문인력', '일반전문인력'] as const;
export const EXPERT_FORM = { name: '박형철', kind: '대표전문인력', regNo: '680722-1******', regDate: '2011-12-26', from: '2011-12-26', to: '2012-11-27', cause: '퇴사(2012.11.30)' };
export const CAREER_HEADS = ['약력', '시작일', '종료일', '관리'];
export const CAREER_ROWS = [['(주)유니창업투자 투자팀 이사', '2002.5', '2011.9']];
export const INVEST_CAREER_HEADS = ['투자경력', '시작일', '종료일', '관리'];
export const INVEST_CAREER_ROWS = [['에어미디어 인수&개발(CRC조합) 등 CRC투자', '2005', '2009']];

/** 팝업 E(등록원부 출력) · F(발급이력 출력) — 원문 리터럴 */
export const PRINT_DATE = '2016-01-19';
export const PRINT_PAGES = ['명칭란', '조합원란', '전문인력란'] as const;
export const ISSUE_HISTORY = [{ no: 1, date: '2016-01-19' }];
