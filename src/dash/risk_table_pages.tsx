/* 조기경보 표 조회 6리프 — 공용 골격 TablesPage(risk_tables_page.tsx)의 화면별 설정.
   검색조건 항목·순서·기본값은 목업 검색박스 원문 그대로다. 데이터는 risk_subfund_info_data.ts · risk_valuation_data.ts SSOT.

   | 리프                              | 원본  | 표                          | 검색조건(→ 행 필터 키)                                  |
   |-----------------------------------|-------|-----------------------------|---------------------------------------------------------|
   | 자펀드 수익률정보 비교 조회       | S2_77 | 1 + 합계                    | 기준년월(ym)                                            |
   | 투자조합 가치평가 결과조회        | S2_81 | 1 + 합계                    | 자펀드(fn) · 결성년도(fy 접두) · 평가년월(ym)           |
   | 피투자회사 가치평가 결과조회      | S2_82 | 내역 집계 + 상세·합계       | 자펀드(fund) · 결성년도(fy 접두) · 평가년월(ym)         |
   | 자펀드 투자자산 및 거래내역 조회  | S2_84 | 투자잔액관리 · 거래내역     | 자펀드(—) · 투자기업(co) · 조회일자(—)                  |
   | 예외사항레포트                    | S2_85 | 4 (②는 원문 0건)            | 평가년월(—)                                             |
   | Portfolio Report                  | S2_83 | 3 (③ 합계), 번호 칩         | 자펀드(—) · 평가년월(—)                                 |
   (—) = 행에 대응 컬럼 없음 → `· 데이터 연동 후 적용`. 원문 `조회` 버튼은 두지 않는다(즉시 반영). */
import React from 'react';
import { TablesPage } from './risk_tables_page';
import type { TablesPageConfig } from './risk_tables_page';
import { RETURN_TABLE, RETURN_BASE_YM } from './risk_subfund_info_data';
import {
  EVAL_BASE_YM, FUND_VAL, FUND_VAL_FUNDS, INVESTEE_SUMMARY, INVESTEE_DETAIL, INVESTEE_VAL_FUNDS,
  ASSET_BALANCE, ASSET_TX, ASSET_TX_FUNDS, ASSET_TX_COMPANIES, ASSET_TX_BASE_DATE,
  EXC_TABLES, PORTFOLIO_TABLES, PORTFOLIO_FUNDS,
} from './risk_valuation_data';

type P = { onNav?: (r: string) => void };

const RETURN: TablesPageConfig = {
  group: '자펀드정보', label: '자펀드 수익률정보 비교 조회', route: '자펀드 수익률정보 비교 조회',
  tables: [RETURN_TABLE], unit: true,
  filters: [{ label: '기준년월', kind: 'month', def: RETURN_BASE_YM, key: 'ym' }],
};

const FUND_VALUATION: TablesPageConfig = {
  group: '가치평가', label: '투자조합 가치평가 결과조회', route: '투자조합 가치평가 결과조회',
  tables: [FUND_VAL], unit: true,
  filters: [
    { label: '자펀드', kind: 'select', def: '', options: FUND_VAL_FUNDS, key: 'fn' },
    /* 원문 placeholder '전체' — 기본 미선택. 행 값이 '2012년도' 형식이라 연도 접두 매칭 */
    { label: '결성년도', kind: 'year', def: '', key: 'fy', mode: 'prefix' },
    { label: '평가년월', kind: 'month', def: EVAL_BASE_YM, key: 'ym' },
  ],
};

const INVESTEE_VALUATION: TablesPageConfig = {
  group: '가치평가', label: '피투자회사 가치평가 결과조회', route: '피투자회사 가치평가 결과조회',
  /* 원문이 [섹션1] "요약"·[섹션2] "상세내역" 제목을 사용자 지시로 삭제했다 — 제목 없이 구분선으로만 쌓는다(창작 금지) */
  tables: [INVESTEE_SUMMARY, INVESTEE_DETAIL],
  unit: true,
  filters: [
    { label: '자펀드', kind: 'select', def: '', options: INVESTEE_VAL_FUNDS, key: 'fund' },
    { label: '결성년도', kind: 'year', def: '', key: 'fy', mode: 'prefix' },
    { label: '평가년월', kind: 'month', def: EVAL_BASE_YM, key: 'ym' },
  ],
};

const ASSET_TX_PAGE: TablesPageConfig = {
  group: '가치평가', label: '자펀드 투자자산 및 거래내역 조회', route: '자펀드 투자자산 및 거래내역 조회',
  tables: [ASSET_BALANCE, ASSET_TX], unit: true, unitNote: '주식수 제외',
  filters: [
    /* 원문 첫 옵션 '선택하세요' — 필수 선택형. 행에 자펀드 컬럼이 없어 조회 조건으로만 둔다 */
    { label: '자펀드', kind: 'select', def: '', options: ASSET_TX_FUNDS, allLabel: '선택하세요' },
    { label: '투자기업', kind: 'select', def: '', options: ASSET_TX_COMPANIES, key: 'co' },
    { label: '조회일자', kind: 'day', def: ASSET_TX_BASE_DATE },
  ],
};

const EXCEPTION: TablesPageConfig = {
  group: '가치평가', label: '예외사항레포트', route: '예외사항리포트',
  tables: EXC_TABLES, unit: true,
  filters: [{ label: '평가년월', kind: 'month', def: EVAL_BASE_YM }],
};

const PORTFOLIO: TablesPageConfig = {
  group: '가치평가', label: 'Portfolio Report', route: 'Portfolio Report',
  tables: PORTFOLIO_TABLES, unit: true,
  filters: [
    /* 원문 자펀드 select 옵션 1개(전체 없음) — 보고서 대상 파라미터 */
    { label: '자펀드', kind: 'select', def: PORTFOLIO_FUNDS[0], options: PORTFOLIO_FUNDS, allLabel: null },
    { label: '평가년월', kind: 'month', def: EVAL_BASE_YM },
  ],
};

/** 자펀드 수익률정보 비교 조회 — S2_77 */
export function SubfundReturnCompare({ onNav }: P) { return <TablesPage cfg={RETURN} onNav={onNav} />; }
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
