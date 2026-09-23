/* 조기경보 > 가치평가 6리프의 원문 데이터(순수 모듈). (평가시점 데이터 확인은 스키마 트랙, IRR 3종은 risk_irr_data.ts)
   - 모태펀드 가치평가 결과조회       = S2_80 (결과 요약 표 + 2단 헤더 상세 표)
   - 투자조합 가치평가 결과조회       = S2_81 (단일 헤더 + 합계행)
   - 피투자회사 가치평가 결과조회     = S2_82 (내역 2단 헤더 집계 표 + 상세 표·합계행)
   - 자펀드 투자자산 및 거래내역 조회 = S2_84 (보통주·우선주 2단 헤더 표 + 거래내역 표)
   - 예외사항레포트                   = S2_85 (표 4개, ②는 원문 0건)
   - Portfolio Report                 = S2_83 (표 3개, ③ 합계행)
   출처: docs/mockups/02_조기경보/*.html `<tbody>`·`<script> DATA` 를 2026-09-23 파싱 실측으로 옮겼다.
   원문이 "확정 실데이터 1건"만 남긴 화면이 대부분이다 — 행을 늘리지 않는다. */
import type { TableMeta, Provenance, Row } from './risk_table_meta';
import { src, ratioOf } from './risk_table_meta';

/** 평가년월 기본값 — S2_80·81·82·83·85·86 원문 `f-ym` value */
export const EVAL_BASE_YM = '2025-12';

/* ═══════════════ S2_80 모태펀드 가치평가 결과조회 ═══════════════ */
/** 원문 결과 요약 1행. 미투자자산·기타자산·기타부채는 원문이 **입력칸**(value 0)이다 */
export const MF_SUMMARY_ROW: Row = {
  id: 'mfsum-1', aval: 831493784761, dist: 464842713190, uninv: 0, oa: 0, ol: 0,
  total: 1296336497951, found: 977250000000, paid: 918298750000, mult: '1.41배',
};
/** 원문 `recomputeTotal()` — 모태펀드 총운영성과 = 투자자산평가 + 기분배내역 + 미투자자산 + 기타자산 − 기타부채 */
export function mfTotal(r: { aval: number; dist: number; uninv: number; oa: number; ol: number }): number {
  return r.aval + r.dist + r.uninv + r.oa - r.ol;
}
export const MF_SUMMARY: TableMeta = {
  id: 'mfSummary', title: '농식품모태펀드 가치평가 결과',
  cols: [
    { key: 'aval', label: '투자자산 평가액', kind: 'amount' },
    { key: 'dist', label: '기분배내역', kind: 'amount' },
    { key: 'uninv', label: '미투자자산', kind: 'amount', editable: true },
    { key: 'oa', label: '기타자산', kind: 'amount', editable: true },
    { key: 'ol', label: '기타부채', kind: 'amount', editable: true },
    { key: 'total', label: '모태펀드 총운영성과', kind: 'amount', strong: true },
    { key: 'found', label: '결성총액', kind: 'amount' },
    { key: 'paid', label: '납입총액', kind: 'amount' },
    { key: 'mult', label: '출자액대비 수익배수', kind: 'number', align: 'center', strong: true },
  ],
  rows: [MF_SUMMARY_ROW],
};
const MF = '농식품모태펀드';
export const MF_DETAIL: TableMeta = {
  id: 'mfDetail', title: '가치평가 상세내역',
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64 },
    { key: 'ym', label: '평가년월', kind: 'date' },
    { key: 'fy', label: '결성년도', kind: 'center' },
    { key: 'fn', label: '자펀드', kind: 'text', width: 200 },
    { key: 'gp', label: 'GP명', kind: 'text', width: 170 },
    { key: 'found', label: '결성총액', kind: 'amount' },
    { key: 'paid', label: '납입총액', kind: 'amount' },
    { key: 'mfFound', label: '결성총액', kind: 'amount', group: MF },
    { key: 'mfPaid', label: '납입총액', kind: 'amount', group: MF },
    { key: 'share', label: '출자지분율', kind: 'number', align: 'center' },
    { key: 'cinv', label: '누적투자금액', kind: 'amount' },
    { key: 'pbal', label: '투자원금잔액', kind: 'amount' },
    { key: 'perf', label: '조합운용성과', kind: 'amount' },
    { key: 'mul', label: '수익배수', kind: 'number', align: 'center' },
  ],
  rows: [{ id: 'mfdet-1', no: 1, ym: '2025-12', fy: '2012년도', fn: '엘앤에스 농수산업 투자조합', gp: '엘앤에스벤처캐피탈(주)',
    found: 16000000000, paid: 16000000000, mfFound: 8000000000, mfPaid: 8000000000, share: '50.00',
    cinv: 15340000000, pbal: 5398269586, perf: 13537164579, mul: '0.85' }],
};
export const MF_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS', captureFiles: [src('S2_80_모태펀드_가치평가_결과조회.html')],
};

/* ═══════════════ S2_81 투자조합 가치평가 결과조회 ═══════════════ */
/** 자펀드 검색조건 표본 — 원문 `<select id="f-fund">`('전체' 제외) */
export const FUND_VAL_FUNDS = ['엘앤에스 농수산업 투자조합'] as const;
export const FUND_VAL: TableMeta = {
  id: 'fundVal', totalLabel: '합계',
  cols: [
    { key: 'ym', label: '평가년월', kind: 'date' },
    { key: 'fy', label: '결성년도', kind: 'center' },
    { key: 'fn', label: '자펀드', kind: 'text', width: 200 },
    { key: 'gp', label: 'GP명', kind: 'text', width: 170 },
    { key: 'found', label: '결성총액', kind: 'amount', total: 'sum' },
    { key: 'paid', label: '납입총액', kind: 'amount', total: 'sum' },
    { key: 'cinv', label: '누적투자금액', kind: 'amount', total: 'sum' },
    { key: 'pbal', label: '투자원금잔액', kind: 'amount', total: 'sum' },
    { key: 'perf', label: '조합운용성과', kind: 'amount', total: 'sum' },
    { key: 'mul', label: '수익배수', kind: 'number', align: 'center', total: 'dash' },
    /* 원문 gradeTag: 주의=a · 경고=d · 우수|양호=g · 그 외 n (원문 실값은 '주의' 1건) */
    { key: 'grade', label: '관리등급', kind: 'badge', tones: { 주의: 'warning', 경고: 'danger', 우수: 'success', 양호: 'success' }, total: 'dash' },
    { key: 'aval', label: '투자자산평가', kind: 'amount', total: 'sum' },
    { key: 'dist', label: '기분배내역', kind: 'amount', total: 'sum' },
    { key: 'uninv', label: '미투자자산', kind: 'amount', total: 'sum' },
    { key: 'oa', label: '기타자산', kind: 'amount', total: 'sum' },
    { key: 'ol', label: '기타부채', kind: 'amount', total: 'sum' },
  ],
  /* 결성년도는 원문 P열 공란 → null(표시 '-').
     ⚠ 원문 tfoot 은 `colspan="5"` 라 합계 칸이 한 칸씩 밀려 17칸(컬럼 16개)이 된다 — 원문 오류다.
       여기서는 각 합계를 **자기 컬럼 아래**에 둔다(밀림을 재현하지 않는다). */
  rows: [{ id: 'fundval-1', ym: '2025-12', fy: null, fn: '엘앤에스 농수산업 투자조합', gp: '엘앤에스벤처캐피탈(주)',
    found: 16000000000, paid: 16000000000, cinv: 15340000000, pbal: 1260000000, perf: 13551152618, mul: '0.85', grade: '주의',
    aval: 2205000000, dist: 11320000000, uninv: 1305964428, oa: 13988039, ol: 1293799849 }],
};
export const FUND_VAL_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS', captureFiles: [src('S2_81_투자조합_가치평가_결과조회.html')],
};

/* ═══════════════ S2_82 피투자회사 가치평가 결과조회 ═══════════════ */
export const INVESTEE_VAL_FUNDS = ['2022 원익 스마트 혁신 Agtech투자조합'] as const;
const NS = '내역';
export const INVESTEE_SUMMARY: TableMeta = {
  id: 'investeeSummary',
  cols: [
    { key: 'funds', label: '자펀드수', kind: 'number', group: NS },
    { key: 'gps', label: '운용사수', kind: 'number', group: NS },
    { key: 'evalFunds', label: '평가대상 자펀드수', kind: 'number', group: NS },
    { key: 'cos', label: '투자기업수', kind: 'number', group: NS },
    { key: 'evalCos', label: '평가대상기업수', kind: 'number', group: NS },
    { key: 'fundCos', label: '자펀드별 투자기업수', kind: 'number', group: NS },
    { key: 'fundEvalCos', label: '자펀드별 평가대상기업수', kind: 'number', group: NS },
  ],
  rows: [{ id: 'invsum-1', funds: 159, gps: 159, evalFunds: 110, cos: 892, evalCos: 528, fundCos: 1274, fundEvalCos: 816 }],
};
/* 원문 mult(perf, inv) — 운용성과 ÷ 투자금액, 소수 2자리 */
const multOf = (perf: number, inv: number): string => (inv ? (perf / inv).toFixed(2) : '-');
const invRow = { ym: '2025-12', fy: '2022년도', fund: '2022 원익 스마트 혁신 Agtech투자조합', gp: '원익투자파트너스(주)', co: '(주)당근마켓',
  ft0: '보통주', fa0: 999960000, ft: '보통주', fa: 999960000, mtd: 'Milestones', opt: '-', bal: 999960000, ev: 999960000,
  rec: 0, perf: 999960000, g: 'B' };
export const INVESTEE_DETAIL: TableMeta = {
  id: 'investeeDetail', totalLabel: '합계',
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64 },
    { key: 'ym', label: '평가년월', kind: 'date' },
    { key: 'fy', label: '결성년도', kind: 'center' },
    { key: 'fund', label: '자펀드', kind: 'text', width: 240 },
    { key: 'gp', label: 'GP명', kind: 'text', width: 160 },
    { key: 'co', label: '투자기업', kind: 'text', width: 130 },
    { key: 'ft0', label: '최초투자유형', kind: 'center' },
    { key: 'fa0', label: '최초투자금액', kind: 'amount', total: 'sum' },
    { key: 'ft', label: '투자유형', kind: 'center', total: 'dash' },
    { key: 'fa', label: '투자금액', kind: 'amount', total: 'sum' },
    { key: 'mtd', label: '평가방법론', kind: 'center', total: 'dash' },
    { key: 'opt', label: '옵션평가여부', kind: 'center', total: 'dash' },
    { key: 'bal', label: '투자잔액', kind: 'amount', total: 'sum' },
    { key: 'ev', label: '평가금액', kind: 'amount', total: 'sum' },
    { key: 'rec', label: '누적회수총액', kind: 'amount', total: 'sum' },
    { key: 'perf', label: '운용성과', kind: 'amount', total: 'sum' },
    /* 파생값 — 행·합계 모두 원문처럼 운용성과 ÷ 투자금액 */
    { key: 'mult', label: '누적Multiple', kind: 'number', align: 'center', derived: true, total: ratioOf('perf', 'fa') },
    /* 원문 grade(): {A:'a', B:'b', C:'c', D:'d'} → B=.tag b(info). 원문 실값은 'B' 1건 */
    { key: 'g', label: '관리등급', kind: 'badge', tones: { A: 'warning', B: 'info', D: 'danger' }, total: 'dash' },
  ],
  rows: [{ id: 'invdet-1', no: 1, ...invRow, mult: multOf(invRow.perf, invRow.fa) }],
};
export const INVESTEE_VAL_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS', captureFiles: [src('S2_82_피투자회사_가치평가_결과조회.html')],
};

/* ═══════════════ S2_84 자펀드 투자자산 및 거래내역 조회 ═══════════════ */
/** 검색조건 표본 — 원문 `f-fund`('선택하세요' 제외) · `f-comp`('전체' 제외) · `f-date` value */
export const ASSET_TX_FUNDS = ['현대동양농식품사모투자전문회사', '한투 청년농식품투자조합'] as const;
export const ASSET_TX_COMPANIES = ['셀미트(주)', '(주)윌로그'] as const;
export const ASSET_TX_BASE_DATE = '2026-07-01';
const CS = '보통주', PS = '우선주';
export const ASSET_BALANCE: TableMeta = {
  id: 'assetBalance', title: '투자잔액관리',
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64 },
    { key: 'co', label: '투자기업', kind: 'text', width: 130 },
    { key: 'dt', label: '일자', kind: 'date' },
    { key: 'cAmt', label: '금액', kind: 'amount', group: CS },
    { key: 'cSh', label: '주식수', kind: 'number', group: CS },
    { key: 'pAmt', label: '금액', kind: 'amount', group: PS },
    { key: 'pSh', label: '주식수', kind: 'number', group: PS },
    { key: 'cps', label: '전환우선주', kind: 'amount' },
    { key: 'rcps', label: '전환상환우선주', kind: 'amount' },
    { key: 'bw', label: '신주인수권부사채', kind: 'amount' },
    { key: 'cb', label: '전환사채', kind: 'amount' },
    { key: 'proj', label: '프로젝트 방식투자', kind: 'amount' },
  ],
  rows: [{ id: 'bal-1', no: 1, co: '셀미트(주)', dt: '2022-10-20', cAmt: 0, cSh: 0, pAmt: 0, pSh: 0,
    cps: 1000045800, rcps: 0, bw: 0, cb: 0, proj: 0 }],
};
export const ASSET_TX: TableMeta = {
  id: 'assetTx', title: '거래내역',
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64 },
    { key: 'co', label: '투자기업', kind: 'text', width: 130 },
    { key: 'kind', label: '자산의종류', kind: 'center' },
    { key: 'dt', label: '일자', kind: 'date' },
    /* 원문 값 미기재(표시 '-'). 값 도메인은 설계메모 확정: 투자·유상증자(실권)·자본금변경·액면분할 */
    { key: 'tx', label: '거래내역', kind: 'center' },
    { key: 'amt', label: '거래금액', kind: 'amount' },
    { key: 'sh', label: '주식수', kind: 'number' },
  ],
  rows: [{ id: 'tx-1', no: 1, co: '(주)윌로그', kind: '우선주', dt: '2023-09-08', tx: null, amt: 1000032025, sh: 3475 }],
};
export const ASSET_TX_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS', captureFiles: [src('S2_84_자펀드_투자자산_및_거래내역_조회.html')],
};

/* ═══════════════ S2_85 예외사항레포트 ═══════════════ */
/* 원문 `.tag` — 투자유형=n(muted) · 평가방법론 Milestones=a(warning) / 3자거래=n(muted) */
const TYPE_TONES = { 보통주: 'muted', 우선주: 'muted' } as const;
const METHOD_TONES = { Milestones: 'warning', '3자거래': 'muted' } as const;
const CUR = '해당분기 평가내역', PREV = '직전분기 평가내역', BY_GP = '운용사별 평가결과';
export const EXC_METHOD: TableMeta = {
  id: 'excMethod', title: '평가방법론이 변경된 내역',
  cols: [
    { key: 'fund', label: '조합', kind: 'text', width: 200 },
    { key: 'co', label: '투자기업명', kind: 'text', width: 130 },
    { key: 'biz', label: '사업자번호', kind: 'center' },
    { key: 'type', label: '투자유형', kind: 'badge', tones: TYPE_TONES },
    { key: 'amt', label: '투자금액', kind: 'amount' },
    { key: 'curM', label: '평가방법론', kind: 'badge', group: CUR, tones: METHOD_TONES },
    { key: 'curV', label: '평가금액', kind: 'amount', group: CUR },
    { key: 'prevM', label: '평가방법론', kind: 'badge', group: PREV, tones: METHOD_TONES },
    { key: 'prevV', label: '평가금액', kind: 'amount', group: PREV },
  ],
  rows: [{ id: 'exc1-1', fund: '세종농식품R&D사업화투자조합', co: '(주)바이오앱', biz: '506-81-76875', type: '보통주', amt: 0,
    curM: 'Milestones', curV: 1000000000, prevM: '3자거래', prevV: 1120000000 }],
};
export const EXC_SAME: TableMeta = {
  id: 'excSame', title: '동일기업 가치조정',
  cols: [
    { key: 'fund', label: '조합', kind: 'text', width: 200 },
    { key: 'co', label: '투자기업명', kind: 'text', width: 130 },
    { key: 'biz', label: '사업자번호', kind: 'center' },
    { key: 'type', label: '투자유형', kind: 'badge', tones: TYPE_TONES },
    { key: 'amt', label: '투자금액', kind: 'amount' },
    { key: 'mtd', label: '평가방법론', kind: 'badge', tones: METHOD_TONES },
    { key: 'pre', label: '할인율 적용 전 회사가치', kind: 'amount', group: BY_GP },
    { key: 'rate', label: '적용 할인율(유동성할인율 등)', kind: 'number', group: BY_GP },
    { key: 'post', label: '할인율 적용 후 회사가치', kind: 'amount', group: BY_GP },
  ],
  /* 원문 O열 "조회 내역 없음" — 0건 그대로(임의 데이터 생성하지 않음) */
  rows: [],
  empty: '해당 평가년월에 조회된 내역이 없습니다.',
};
export const EXC_EDITED: TableMeta = {
  id: 'excEdited', title: '데이터 수정 후 평가한 내역',
  cols: [
    { key: 'fund', label: '조합', kind: 'text', width: 200 },
    { key: 'co', label: '투자기업명', kind: 'text', width: 130 },
    { key: 'biz', label: '사업자번호', kind: 'center' },
    { key: 'type', label: '투자유형', kind: 'badge', tones: TYPE_TONES },
    { key: 'amt', label: '투자금액', kind: 'amount' },
    { key: 'mtd', label: '평가방법론', kind: 'badge', tones: METHOD_TONES },
    { key: 'ev', label: '평가금액', kind: 'amount' },
  ],
  rows: [{ id: 'exc3-1', fund: '현대Agro-Bio펀드1호', co: '게임펍', biz: '279-81-00148', type: '우선주', amt: 999990000,
    mtd: 'Milestones', ev: 200000000 }],
};
export const EXC_MISSING: TableMeta = {
  id: 'excMissing', title: '평가 누락된 내역',
  cols: [
    { key: 'gp', label: 'GP명', kind: 'text', width: 170 },
    { key: 'fund', label: '조합', kind: 'text', width: 200 },
    { key: 'co', label: '투자기업명', kind: 'text', width: 130 },
    { key: 'type', label: '투자유형', kind: 'badge', tones: TYPE_TONES },
    { key: 'amt', label: '투자금액', kind: 'amount' },
    { key: 'rec', label: '회수총액', kind: 'amount' },
    { key: 'bal', label: '투자잔액', kind: 'amount' },
  ],
  rows: [{ id: 'exc4-1', gp: '농업정책보험금융원', fund: '농식품새싹키움매칭펀드', co: '(주)로버스', type: '우선주',
    amt: 199746252, rec: 0, bal: 199746252 }],
};
export const EXC_TABLES: TableMeta[] = [EXC_METHOD, EXC_SAME, EXC_EDITED, EXC_MISSING];
export const EXC_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS', captureFiles: [src('S2_85_예외사항_레포트.html')],
};

/* ═══════════════ S2_83 Portfolio Report ═══════════════ */
/** 자펀드 검색조건 — 원문 `f-fund` 옵션 1개 */
export const PORTFOLIO_FUNDS = ['2022 원익 스마트 혁신 Agtech투자조합'] as const;
export const PF_STATUS: TableMeta = {
  id: 'pfStatus', title: '조합의 현황',
  cols: [
    { key: 'fn', label: '조합명', kind: 'text', width: 240 },
    { key: 'gp', label: '운용사명', kind: 'text', width: 170 },
    { key: 'fy', label: '결성년도', kind: 'center' },
    { key: 'found', label: '결성총액', kind: 'amount' },
    { key: 'paid', label: '납입총액', kind: 'amount' },
    { key: 'ym', label: '평가년월', kind: 'date' },
  ],
  rows: [{ id: 'pf1-1', fn: '2022 원익 스마트 혁신 Agtech투자조합', gp: '원익투자파트너스(주)', fy: '2022년',
    found: 21000000000, paid: 21000000000, ym: '2025-12' }],
};
export const PF_PERF: TableMeta = {
  id: 'pfPerf', title: '조합의 운용성과',
  cols: [
    { key: 'total', label: '조합 총운용성과', kind: 'amount', strong: true },
    { key: 'mult', label: '출자액대비 수익배수', kind: 'number', align: 'center', strong: true },
    { key: 'cinv', label: '(1) 누적투자금액', kind: 'amount' },
    { key: 'bal', label: '(2) 투자잔액합계', kind: 'amount' },
    { key: 'aval', label: '(3) 투자자산평가액', kind: 'amount' },
    { key: 'rec', label: '(4) 회수금액합계', kind: 'amount' },
    { key: 'perf', label: '(5) 운용성과', kind: 'amount' },
    { key: 'dist', label: '(6) 기분배내역', kind: 'amount' },
    { key: 'uninv', label: '(7) 미투자자산', kind: 'amount' },
    { key: 'oa', label: '(8) 기타자산', kind: 'amount' },
    { key: 'ol', label: '(9) 기타부채', kind: 'amount' },
  ],
  rows: [{ id: 'pf2-1', total: 21088393912, mult: '1.00', cinv: 19302262939, bal: 15112427939, aval: 15210548039,
    rec: 5847282719, perf: 21057830758, dist: 4851000000, uninv: 1126327031, oa: 0, ol: 99481158 }],
};
export const PF_DETAIL: TableMeta = {
  id: 'pfDetail', title: '투자자산 별 상세내역', totalLabel: '합계',
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64 },
    { key: 'co', label: '투자기업', kind: 'text', width: 130 },
    { key: 'kind', label: '자산의 종류', kind: 'center' },
    { key: 'a', label: '누적투자금액(a)', kind: 'amount', total: 'sum' },
    { key: 'b', label: '누적회수원금 (감액포함)(b)', kind: 'amount', total: 'sum' },
    { key: 'c', label: '잔액(c) =((a)-(b))', kind: 'amount', total: 'sum' },
    /* 원문 보유주식수는 문자열 '3,846' 이고 합계 칸은 '-' 다(S2_87 과 달리 합산하지 않는다) */
    { key: 'sh', label: '보유주식수', kind: 'number', align: 'center', total: 'dash' },
    { key: 'd', label: '보유자산의 평가액(d)', kind: 'amount', total: 'sum' },
    { key: 'mdc', label: '평가Multiple (d)/(c)', kind: 'number', align: 'center', total: ratioOf('d', 'c') },
    { key: 'e', label: '누적회수총액(e)', kind: 'amount', total: 'sum' },
    { key: 'f', label: '누적운용성과(f) =((d)+(e))', kind: 'amount', total: 'sum' },
    { key: 'mfa', label: '누적Multiple (f)/(a)', kind: 'number', align: 'center', total: ratioOf('f', 'a') },
    { key: 'm', label: '평가방법론', kind: 'center', total: 'dash' },
  ],
  rows: [{ id: 'pf3-1', no: 1, co: '(주)당근마켓', kind: '보통주', a: 999960000, b: 0, c: 999960000, sh: '3,846',
    d: 999960000, mdc: '1.00', e: 0, f: 999960000, mfa: '1.00', m: 'Milestones' }],
};
export const PORTFOLIO_TABLES: TableMeta[] = [PF_STATUS, PF_PERF, PF_DETAIL];
export const PORTFOLIO_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS', captureFiles: [src('S2_83_Portfolio_Report.html')],
};
