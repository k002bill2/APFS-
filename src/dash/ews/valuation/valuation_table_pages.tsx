/* 조기경보 > 가치평가 표 조회 5리프 — 공용 골격 TablesPage(risk_tables_page.tsx)의 화면별 설정.
   검색조건 항목·순서·기본값은 목업 검색박스 원문 그대로다. 데이터는 risk_valuation_data.ts SSOT.
   같은 골격의 자펀드정보 리프(S2_77)는 ews/sfund/subfund_return_compare.tsx.

   | 리프                              | 원본  | 표                          | 검색조건(→ 행 필터 키)                                  |
   |-----------------------------------|-------|-----------------------------|---------------------------------------------------------|
   | 투자조합 가치평가 결과조회        | S2_81 | 1 + 합계                    | 자펀드(fn) · 결성년도(fy 접두) · 평가년월(ym)           |
   | 피투자회사 가치평가 결과조회      | S2_82 | 내역 집계 + 상세·합계       | 자펀드(fund) · 결성년도(fy 접두) · 평가년월(ym)         |
   | 자펀드 투자자산 및 거래내역 조회  | S2_84 | 투자잔액관리 · 거래내역     | 자펀드(fund*) · 투자기업(co) · 조회일자(dt ≤)           |
   | 예외사항레포트                    | S2_85 | 4 (②는 원문 0건)            | 평가년월(ym*)                                           |
   | Portfolio Report                  | S2_83 | 3 (③ 합계)                  | 자펀드(fn, ②③ fn*) · 평가년월(ym, ②③ ym*)               |
   * = 숨은 행 속성(그리드 컬럼 없음 — 2026-11-16 사용자 지시 "미연동 필터 전부 동작"으로 시드, 종전엔 미연동).
   (dt ≤) = 조회 시점(mode asOf — 일자가 조회일자 이전·같은 날인 행). 평가년월은 평가 스냅샷이라 같은 값(eq)이고,
   직전 분기(PREV_YM) 평가분 더미 행을 덧붙여 평가년월을 바꾸면 행이 바뀐다 — 기본 평가년월에선 걸러져 행 수·합계가 종전과 같다.
   데이터 모듈(risk_valuation_data)은 모태펀드 화면도 써서 시드·더미는 이 파일이 파생한다. 원문 `조회` 버튼은 두지 않는다(즉시 반영). */
import React from 'react';
import { TablesPage } from '../../risk_tables_page';
import type { TablesPageConfig } from '../../risk_tables_page';
import type { TableMeta, Row } from '../../risk_table_meta';
import {
  EVAL_BASE_YM, FUND_VAL, FUND_VAL_FUNDS, INVESTEE_SUMMARY, INVESTEE_DETAIL, INVESTEE_VAL_FUNDS,
  ASSET_BALANCE, ASSET_TX, ASSET_TX_FUNDS, ASSET_TX_COMPANIES, ASSET_TX_BASE_DATE,
  EXC_TABLES, PORTFOLIO_TABLES, PORTFOLIO_FUNDS,
} from './risk_valuation_data';

type P = { onNav?: (r: string) => void };

/** 직전 분기 평가년월 — 더미 평가분의 시점(예외사항레포트가 "해당분기·직전분기"로 비교하는 분기 주기) */
export const PREV_YM = '2025-09';

/** 표 파생 — 원문 행에 숨은 키를 싣고(attrs) 더미 행을 덧붙인다. 모듈 상수라 참조가 안정(ReadGrid 메모) */
const derive = (t: TableMeta, attrs: (r: Row) => Record<string, string>, extra: Row[] = []): TableMeta =>
  ({ ...t, rows: [...t.rows.map((r) => ({ ...r, ...attrs(r) })), ...extra] });

const FUND_VALUATION: TablesPageConfig = {
  group: '가치평가', label: '투자조합 가치평가 결과조회', route: 'fund-valuation',
  tables: [FUND_VAL], unit: true,
  filters: [
    { label: '자펀드', kind: 'select', def: '', options: FUND_VAL_FUNDS, key: 'fn' },
    /* 원문 placeholder '전체' — 기본 미선택. 행 값이 '2012년도' 형식이라 연도 접두 매칭 */
    { label: '결성년도', kind: 'year', def: '', key: 'fy', mode: 'prefix' },
    { label: '평가년월', kind: 'month', def: EVAL_BASE_YM, key: 'ym' },
  ],
};

const INVESTEE_VALUATION: TablesPageConfig = {
  group: '가치평가', label: '피투자회사 가치평가 결과조회', route: 'investee-valuation',
  /* 원문이 [섹션1] "요약"·[섹션2] "상세내역" 제목을 사용자 지시로 삭제했다 — 제목 없이 구분선으로만 쌓는다(창작 금지) */
  tables: [INVESTEE_SUMMARY, INVESTEE_DETAIL],
  unit: true,
  filters: [
    { label: '자펀드', kind: 'select', def: '', options: INVESTEE_VAL_FUNDS, key: 'fund' },
    { label: '결성년도', kind: 'year', def: '', key: 'fy', mode: 'prefix' },
    { label: '평가년월', kind: 'month', def: EVAL_BASE_YM, key: 'ym' },
  ],
};

/* 자펀드 숨은 키 fund — 원문 표에 자펀드 컬럼이 없다. 두 표의 원문 행이 서로 다른 투자기업이라 원문 선택지 순서대로 하나씩 싣는다
   (현대동양 = 셀미트(주) 잔액 · 한투 = (주)윌로그 거래). 기본 '선택하세요'(빈 값)는 전부 통과 */
const ASSET_FUND_OF: Record<string, string> = { '셀미트(주)': ASSET_TX_FUNDS[0], '(주)윌로그': ASSET_TX_FUNDS[1] };
const assetFund = (r: Row) => ({ fund: ASSET_FUND_OF[String(r.co)] });

export const ASSET_TX_PAGE: TablesPageConfig = {
  group: '가치평가', label: '자펀드 투자자산 및 거래내역 조회', route: 'subfund-asset-txn',
  tables: [derive(ASSET_BALANCE, assetFund), derive(ASSET_TX, assetFund)], unit: true, unitNote: '주식수 제외',
  filters: [
    /* 원문 첫 옵션 '선택하세요' — 필수 선택형. 숨은 키 fund 같은 값으로 거른다 */
    { label: '자펀드', kind: 'select', def: '', options: ASSET_TX_FUNDS, allLabel: '선택하세요', key: 'fund' },
    { label: '투자기업', kind: 'select', def: '', options: ASSET_TX_COMPANIES, key: 'co' },
    /* 조회 시점 — 두 표의 일자(dt)가 조회일자 이전·같은 날인 행(원문 일자 2022-10-20·2023-09-08 은 기본값 이전) */
    { label: '조회일자', kind: 'day', def: ASSET_TX_BASE_DATE, key: 'dt', mode: 'asOf' },
  ],
};

/* 예외사항레포트 직전 분기 더미 — ① ③ ④ 에 1건씩(② 동일기업 가치조정은 원문 0건이라 더미도 두지 않는다 — 키가 없어 거르지 않는다).
   표시 길이는 원문 행 이하로 둔다(열 폭은 필터 전 행으로 정해진다 — 기본 화면 폭 불변) */
const ymOf = (ym: string) => () => ({ ym });
const [EXC_METHOD, EXC_SAME, EXC_EDITED, EXC_MISSING] = EXC_TABLES;
export const EXCEPTION_TABLES: TableMeta[] = [
  derive(EXC_METHOD, ymOf(EVAL_BASE_YM), [{ id: 'exc1-prev-1', ym: PREV_YM, fund: '농식품혁신투자조합', co: '(주)미래팜', biz: '220-87-61503',
    type: '우선주', amt: 0, curM: 'Milestones', curV: 620000000, prevM: '3자거래', prevV: 500000000 }]),
  EXC_SAME,
  derive(EXC_EDITED, ymOf(EVAL_BASE_YM), [{ id: 'exc3-prev-1', ym: PREV_YM, fund: '현대Agro-Bio펀드1호', co: '게임펍', biz: '279-81-00148',
    type: '우선주', amt: 999990000, mtd: 'Milestones', ev: 350000000 }]),
  derive(EXC_MISSING, ymOf(EVAL_BASE_YM), [{ id: 'exc4-prev-1', ym: PREV_YM, gp: '농업정책보험금융원', fund: '농식품새싹키움매칭펀드', co: '(주)미래팜',
    type: '우선주', amt: 150000000, rec: 0, bal: 150000000 }]),
];

export const EXCEPTION: TablesPageConfig = {
  group: '가치평가', label: '예외사항레포트', route: 'exception-report',
  tables: EXCEPTION_TABLES, unit: true,
  filters: [{ label: '평가년월', kind: 'month', def: EVAL_BASE_YM, key: 'ym', allLabel: null }],
};

/* Portfolio Report — ① 조합의 현황은 원문 자펀드(fn)·평가년월(ym) 컬럼이 있다. ② ③ 에는 같은 키를 숨은 속성으로 실어 세 표가 같은 시점을 본다.
   직전 분기 더미 = 같은 조합의 그 시점 값(표시 길이 원문 이하). 자펀드는 원문 선택지 1개('전체' 없음)라 키만 배선한다 */
const PF_FUND = PORTFOLIO_FUNDS[0];
const [PF_STATUS, PF_PERF, PF_DETAIL] = PORTFOLIO_TABLES;
const pfKeys = () => ({ fn: PF_FUND, ym: EVAL_BASE_YM });
export const PORTFOLIO_VIEW_TABLES: TableMeta[] = [
  derive(PF_STATUS, () => ({}), [{ ...PF_STATUS.rows[0], id: 'pf1-prev-1', paid: 19950000000, ym: PREV_YM }]),
  derive(PF_PERF, pfKeys, [{ id: 'pf2-prev-1', fn: PF_FUND, ym: PREV_YM, total: 20788393912, mult: '0.99', cinv: 19302262939, bal: 15412427939,
    aval: 15010548039, rec: 5547282719, perf: 20557830758, dist: 4851000000, uninv: 1326327031, oa: 0, ol: 99481158 }]),
  derive(PF_DETAIL, pfKeys, [{ ...PF_DETAIL.rows[0], id: 'pf3-prev-1', no: 2, fn: PF_FUND, ym: PREV_YM, d: 949962000, mdc: '0.95', f: 949962000, mfa: '0.95' }]),
];

export const PORTFOLIO: TablesPageConfig = {
  group: '가치평가', label: 'Portfolio Report', route: 'portfolio-report',
  tables: PORTFOLIO_VIEW_TABLES, unit: true,
  filters: [
    /* 원문 자펀드 select 옵션 1개(전체 없음) — 보고서 대상 파라미터. 세 표의 fn 같은 값 */
    { label: '자펀드', kind: 'select', def: PF_FUND, options: PORTFOLIO_FUNDS, allLabel: null, key: 'fn' },
    { label: '평가년월', kind: 'month', def: EVAL_BASE_YM, key: 'ym', allLabel: null },
  ],
};

/** 투자조합 가치평가 결과조회 — S2_81 */
export function FundValuationResult({ onNav }: P) { return <TablesPage cfg={FUND_VALUATION} onNav={onNav} />; }
/** 피투자회사 가치평가 결과조회 — S2_82 */
export function InvesteeValuationResult({ onNav }: P) { return <TablesPage cfg={INVESTEE_VALUATION} onNav={onNav} />; }
/** 자펀드 투자자산 및 거래내역 조회 — S2_84 */
export function SubfundAssetTx({ onNav }: P) { return <TablesPage cfg={ASSET_TX_PAGE} onNav={onNav} />; }
/** 예외사항레포트(route 예외사항리포트) — S2_85 */
export function ValuationExceptionReport({ onNav }: P) { return <TablesPage cfg={EXCEPTION} onNav={onNav} />; }
/** Portfolio Report — S2_83 */
export function PortfolioReport({ onNav }: P) { return <TablesPage cfg={PORTFOLIO} onNav={onNav} />; }
