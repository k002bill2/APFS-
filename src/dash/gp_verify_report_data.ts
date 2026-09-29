/* 자펀드 보고 > 실물검증 > 조합별 실물검증 결과 보고 — 원문 데이터(순수 모듈, React import 금지).
   출처: docs/mockups/05_MOAF/S5_120_실물검증_조회.html (MOAF REPORT System · 실물검증 조회, KRDS TO-BE).
   - 표 3장(투자자산 · 미투자자산 거래 · 미투자자산) — 각각 운용사·수탁기관·일치여부 2단 헤더 + tfoot 합계.
   - 행·합계는 원문 정적 `<tbody>`/`<tfoot>` 리터럴 그대로(값·순서·개수 불변). 금액은 원문 `data-won`(원 단위 숫자),
     원문 칸이 `-`(data-won 없음)면 null(화면 `-`).
   - 형제 수탁보고 S3_101(trust_sub_data.ts VERIFY_*)과 구조는 닮았지만 **컬럼 순서·펀드·행이 다르다**
     (S5_120 은 수탁기관 묶음이 투자기업/종목/계좌번호 → 보유주수 → 잔액 순) — 공유하지 않고 원문대로 따로 둔다. */
import type { TableMeta, Provenance, ColMeta } from './risk_table_meta';
import type { Tone } from './components';

export const GP_VERIFY_SRC = 'docs/mockups/05_MOAF/S5_120_실물검증_조회.html';
export const GP_VERIFY_PROVENANCE: Provenance = { capturedAt: '2026-09-29', sourceSystem: 'MOAF', captureFiles: [GP_VERIFY_SRC] };

/** 원문 검색박스 — 자펀드 select 옵션 1개(전체 없음) · 기준년월 기본 2026-04 */
export const GP_VERIFY_FUND = '농식품새싹키움매칭펀드';
export const GP_VERIFY_BASE_YM = '2026-04';

/** 원문 fmt() — 원 정수 · 백만원 최대 1자리 · 억원 최대 2자리 */
const DIGITS: TableMeta['unitDigits'] = { 원: { min: 0, max: 0 }, 백만원: { min: 0, max: 1 }, 억원: { min: 0, max: 2 } };

/** 원문 `.tag g`(일치). 불일치는 원문에 없지만 같은 배지 칸이 받을 수 있게 위험색만 둔다 */
const MATCH_TONES: Record<string, Tone> = { 일치: 'success', 불일치: 'danger' };

const O = '운용사';
const C = '수탁기관';
const M = '일치여부';
const noCol: ColMeta = { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64 };
/** 원문 보유주수 칸은 가운데 정렬(`td.c`) */
const shares = (key: string, group: string, total: ColMeta['total']): ColMeta => ({ key, label: '보유주수', kind: 'number', align: 'center', group, total });
const match = (key: string, label: string): ColMeta => ({ key, label, kind: 'badge', group: M, tones: MATCH_TONES, total: 'dash' });

/* ═══════════════ 섹션1 투자자산 ═══════════════
   원문 tfoot = 표시 5행의 합(보유주수 19,915 · 원금/잔액 899,039,257)이라 'sum' 으로 파생한다(테스트가 원문 tfoot 와 대조). */
export const GP_VERIFY_INVEST: TableMeta = {
  id: 'gpVerifyInvest', title: '투자자산', totalLabel: '합계', unitDigits: DIGITS,
  cols: [
    noCol,
    { key: 'oCo', label: '투자기업', kind: 'text', group: O, width: 160, total: 'dash' },
    shares('oSh', O, 'sum'),
    { key: 'oPr', label: '원금(A)', kind: 'amount', group: O, total: 'sum' },
    { key: 'oRd', label: '감액금액(B)', kind: 'amount', group: O, total: 'dash' },
    { key: 'oBal', label: '잔액(A-B)', kind: 'amount', group: O, total: 'sum' },
    { key: 'cCo', label: '투자기업', kind: 'text', group: C, width: 220, total: 'dash' },
    shares('cSh', C, 'sum'),
    { key: 'cBal', label: '잔액', kind: 'amount', group: C, total: 'sum' },
    match('mSh', '보유주수'),
    match('mBal', '잔액'),
  ],
  rows: [
    { id: 'gvi-1', no: 1, oCo: '(주)로버스', oSh: 206, oPr: 199746252, oRd: null, oBal: 199746252, cCo: '(주)로버스(구,로버스컴퍼니) 우선주', cSh: 206, cBal: 199746252, mSh: '일치', mBal: '일치' },
    { id: 'gvi-2', no: 2, oCo: '토포랩 주식회사', oSh: 1667, oPr: 100021667, oRd: null, oBal: 100021667, cCo: '(주)토포랩 우선주', cSh: 1667, cBal: 100021667, mSh: '일치', mBal: '일치' },
    { id: 'gvi-3', no: 3, oCo: '주식회사 이너프유', oSh: 9441, oPr: 199979262, oRd: null, oBal: 199979262, cCo: '(주)이너프유 우선주', cSh: 9441, cBal: 199979262, mSh: '일치', mBal: '일치' },
    { id: 'gvi-4', no: 4, oCo: '이엑스첼스케어', oSh: 8333, oPr: 199992000, oRd: null, oBal: 199992000, cCo: '이엑스첼스케어(주) 우선주', cSh: 8333, cBal: 199992000, mSh: '일치', mBal: '일치' },
    { id: 'gvi-5', no: 5, oCo: '주식회사 비체담', oSh: 268, oPr: 199300076, oRd: null, oBal: 199300076, cCo: '(주)비체담 우선주', cSh: 268, cBal: 199300076, mSh: '일치', mBal: '일치' },
  ],
};

/* ═══════════════ 섹션2 미투자자산 거래 — 원문 0행(빈 상태 문구) · tfoot 전부 '-' ═══════════════ */
export const GP_VERIFY_UNINV_TX: TableMeta = {
  id: 'gpVerifyUninvTx', title: '미투자자산 거래', totalLabel: '합계', unitDigits: DIGITS,
  cols: [
    noCol,
    { key: 'oItem', label: '종목', kind: 'text', group: O, width: 160, total: 'dash' },
    shares('oSh', O, 'dash'),
    { key: 'oBal', label: '잔액', kind: 'amount', group: O, total: 'dash' },
    { key: 'cItem', label: '종목', kind: 'text', group: C, width: 160, total: 'dash' },
    shares('cSh', C, 'dash'),
    { key: 'cBal', label: '잔액', kind: 'amount', group: C, total: 'dash' },
    match('mSh', '보유주수'),
    match('mBal', '잔액'),
  ],
  rows: [],
  empty: '해당 기준월에 조회된 미투자자산 거래가 없습니다.',
};

/* ═══════════════ 섹션3 미투자자산(예치금) ═══════════════ */
export const GP_VERIFY_UNINV: TableMeta = {
  id: 'gpVerifyUninv', title: '미투자자산', totalLabel: '합계', unitDigits: DIGITS,
  cols: [
    noCol,
    { key: 'oAcct', label: '계좌번호', kind: 'text', group: O, width: 200, total: 'dash' },
    { key: 'oBal', label: '잔액', kind: 'amount', group: O, total: 'sum' },
    { key: 'cAcct', label: '계좌번호', kind: 'text', group: C, width: 240, total: 'dash' },
    { key: 'cBal', label: '잔액', kind: 'amount', group: C, total: 'sum' },
    match('mBal', '잔액'),
  ],
  rows: [
    { id: 'gvu-1', no: 1, oAcct: '3170026409581(농협은행)', oBal: 96606212, cAcct: '3170026409581(MMDA(농협)(공통))', cBal: 96606212, mBal: '일치' },
  ],
};

export const GP_VERIFY_TABLES: TableMeta[] = [GP_VERIFY_INVEST, GP_VERIFY_UNINV_TX, GP_VERIFY_UNINV];
