/* 투심보고 통계 — 투자자산관리 > 사후보고관리 (원본 S1_28_투심승인정보조회.html). 공용 골격 TablesPage(risk_tables_page.tsx).
   데이터 SSOT = review_stats_data.ts.

   스키마 트랙이 아닌 이유(trust_table_pages.tsx 계좌정보 비교조회와 같다): 원문 검색조건이 **기본값 있는 모펀드 select**와
   **기본 기간(2026-07-13 ~ 2026-08-12)** 인데 PageSchema.filters 는 라벨 문자열 배열이라 기본값·기간을 담지 못한다.

   | 검색조건(원문 순서) | 컨트롤                           | 행 필터                                  |
   |---------------------|----------------------------------|------------------------------------------|
   | 모펀드              | select 농식품모태펀드/MOAF(기본 앞) | — (행에 모펀드 칸 없음 → 데이터 연동 후 적용) |
   | 운용사 · 자펀드     | select 전체 + 원문 행 값          | gp · fund 일치                           |
   | 계정구분            | select 전체/농식품/수산            | — (행에 계정구분 칸 없음)                  |
   | 기준일자            | 기간(기본 원문 값)                 | — (행에 기준일자 칸 없음)                  |
   원문 `조회` 버튼은 두지 않는다(즉시 반영). 금액 단위 토글(원/백만원/억원) = 원문 seg. 엑셀 = 공통 푸터 내보내기.
   계정구분은 원문 칩 버튼(전체/농식품/수산)이지만 '전체' 값을 칩으로 띄우지 않도록 전체=빈 값인 select 로 둔다. */
import React from 'react';
import { TablesPage } from './risk_tables_page';
import type { TablesPageConfig } from './risk_tables_page';
import { REVIEW_STATS_TABLE, MOTHER_FUNDS, ACCOUNT_KINDS, REVIEW_STATS_RANGE, GP_OPTIONS, FUND_OPTIONS } from './review_stats_data';

const LABEL = '투심보고 통계';

export const REVIEW_STATS_PAGE: TablesPageConfig = {
  system: '투자자산관리', group: '사후보고관리', label: LABEL, route: LABEL,
  tables: [REVIEW_STATS_TABLE], unit: true,
  filters: [
    { label: '모펀드', kind: 'select', def: MOTHER_FUNDS[0], options: MOTHER_FUNDS, allLabel: null },
    { label: '운용사', kind: 'select', def: '', options: GP_OPTIONS, key: 'gp' },
    { label: '자펀드', kind: 'select', def: '', options: FUND_OPTIONS, key: 'fund' },
    { label: '계정구분', kind: 'select', def: '', options: ACCOUNT_KINDS },
    { label: '기준일자', kind: 'dayRange', def: REVIEW_STATS_RANGE },
  ],
};

/** 투심보고 통계 — S1_28 */
export function ReviewStats({ onNav }: { onNav?: (r: string) => void }) {
  return <TablesPage cfg={REVIEW_STATS_PAGE} onNav={onNav} />;
}
