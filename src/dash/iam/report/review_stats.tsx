/* 투심보고 통계 — 투자자산관리 > 사후보고관리 (원본 S1_28_투심승인정보조회.html). 공용 골격 TablesPage(risk_tables_page.tsx).
   데이터 SSOT = review_stats_data.ts.

   스키마 트랙이 아닌 이유(trs/mfund/trust_mother_table_pages.tsx 계좌정보 비교조회와 같다): 원문 검색조건이 **기본값 있는 모펀드 select**와
   **기본 기간(2026-07-13 ~ 2026-08-12)** 인데 PageSchema.filters 는 라벨 문자열 배열이라 기본값·기간을 담지 못한다.

   | 검색조건(원문 순서) | 컨트롤                           | 행 필터                                  |
   |---------------------|----------------------------------|------------------------------------------|
   | 모펀드              | select 농식품모태펀드/MOAF(기본 앞) | 숨은 행 속성 mf 일치                      |
   | 운용사 · 자펀드     | select 전체 + 행 값               | gp · fund 일치                           |
   | 계정구분            | select 전체/농식품/수산            | 숨은 행 속성 acct 일치                    |
   | 기준일자            | 기간(기본 원문 값)                 | 투자금 납입 예정일(payd) 기간 안           |
   원문 `조회` 버튼은 두지 않는다(즉시 반영). 금액 단위 토글(원/백만원/억원) = 원문 seg. 엑셀 = 공통 푸터 내보내기.
   계정구분은 원문 칩 버튼(전체/농식품/수산)이지만 '전체' 값을 칩으로 띄우지 않도록 전체=빈 값인 select 로 둔다.

   2026-11-16 사용자 지시("미연동 필터 전부 동작")로 모펀드·계정구분·기준일자가 행을 거른다(종전 no-op).
   원문 27행(review_stats_data — 원문 DATA 대조 테스트 대상)은 건드리지 않고 **이 화면에서 파생**한다. 그리드 컬럼은 늘리지 않는다
   (TablesPage 가 행에 시드된 키로 거른다 — risk_tables_page 머리 주석).
   - mf: 원문 27행 = 원문 기본값 농식품모태펀드. '전체'가 없는 고정 기본값이라 MOAF 를 고르면 보일 더미 3행(MOAF_ROWS)을 덧붙인다 —
     기본 상태에선 모펀드 조건에 걸러져 표·건수가 원문 27행 그대로다. 운용사·자펀드 선택지 = 원문 행 값 ∪ 더미 행 값.
   - acct: 자펀드명에 '수산'이 든 조합 = 수산(원문 4행), 나머지 농식품.
   - 기준일자: 원문 목업은 어느 칸을 거르는지 적지 않았다 — 원문 27행의 투자금 납입 예정일이 전부 기본 기간 안(07-14~08-11)이라 그 칸에 건다.
   합계 행이 없는 표라 재계산할 집계는 푸터 건수뿐이다(TablesPage 가 걸러진 행으로 센다). */
import React from 'react';
import { TablesPage } from '../../risk_tables_page';
import type { TablesPageConfig } from '../../risk_tables_page';
import type { Row, TableMeta } from '../../risk_table_meta';
import { REVIEW_STATS_TABLE, MOTHER_FUNDS, ACCOUNT_KINDS, REVIEW_STATS_RANGE, GP_OPTIONS, FUND_OPTIONS } from './review_stats_data';

const LABEL = '투심보고 통계';

/* MOAF 더미 3행 — 원문 행과 같은 모양(27열 키 전부, 값 없는 칸 null). 납입 예정일은 기본 기간 안이라 MOAF 만 고르면 보인다.
   id·No 는 원문(rs-1~27 · 1~27)과 겹치지 않게 잇는다 */
const MOAF_ROWS: Row[] = [
  { id: 'rs-moaf-1', no: 28, mf: 'MOAF', acct: '수산', gp: '수산벤처투자(주)', fund: '블루오션수산투자조합2호', corp: '(주)씨그린', payd: '2026-08-06', amt: 800000000, birth: null, venture: 'Y', woman: 'N', youth: 'N', estd: '2019-04-02', bizno: null, mand: 'Y', small: 'Y', agri: 'Y', field: '수산관련산업', biz: '해조류 양식 및 가공', method: 'RCPS', period: '10년', found: '2019-04-02', mgmt: '일반기업', region: '전남', addr: null, sector: '수산관련산업', sub: '해조류 가공', product: '김·미역 가공품', ind: '②' },
  { id: 'rs-moaf-2', no: 29, mf: 'MOAF', acct: '수산', gp: '유안타인베스트먼트', fund: '유안타 수산투자조합', corp: '(주)블루씨푸드', payd: '2026-07-28', amt: 1200000000, birth: null, venture: 'N', woman: 'N', youth: 'Y', estd: '2021-09-13', bizno: null, mand: 'Y', small: 'Y', agri: 'Y', field: '수산관련산업', biz: '수산물 가공 및 온라인 유통', method: '보통주', period: '10년', found: '2021-09-13', mgmt: '일반기업', region: '부산', addr: null, sector: '식품/유통', sub: '수산물 유통', product: '수산 가공식품', ind: '②' },
  { id: 'rs-moaf-3', no: 30, mf: 'MOAF', acct: '농식품', gp: '(주)지티오인베스트먼트', fund: '지티오 애그리푸드 2호 투자조합', corp: '(주)그린팜랩', payd: '2026-07-17', amt: 500000000, birth: null, venture: 'N', woman: 'N', youth: 'N', estd: '2022-03-02', bizno: null, mand: null, small: null, agri: null, field: null, biz: null, method: null, period: null, found: null, mgmt: null, region: null, addr: null, sector: null, sub: null, product: null, ind: null },
];

/** 화면 표 = 원문 27행 + 숨은 행 속성(mf·acct) + MOAF 더미 3행. 컬럼은 원문 그대로 */
export const REVIEW_STATS_VIEW_TABLE: TableMeta = {
  ...REVIEW_STATS_TABLE,
  rows: [
    ...REVIEW_STATS_TABLE.rows.map((r) => ({ ...r, mf: MOTHER_FUNDS[0], acct: String(r.fund).includes('수산') ? '수산' : '농식품' })),
    ...MOAF_ROWS,
  ],
};

/* 선택지 = 원문 행 값(review_stats_data) ∪ 더미 행 값 — 등장 순서·중복 제거 */
const union = (base: readonly string[], key: string): string[] => [...new Set([...base, ...MOAF_ROWS.map((r) => String(r[key]))])];

export const REVIEW_STATS_PAGE: TablesPageConfig = {
  system: '투자자산관리', group: '사후보고관리', label: LABEL, route: 'review-stats',
  tables: [REVIEW_STATS_VIEW_TABLE], unit: true,
  filters: [
    { label: '모펀드', kind: 'select', def: MOTHER_FUNDS[0], options: MOTHER_FUNDS, allLabel: null, key: 'mf' },
    { label: '운용사', kind: 'select', def: '', options: union(GP_OPTIONS, 'gp'), key: 'gp' },
    { label: '자펀드', kind: 'select', def: '', options: union(FUND_OPTIONS, 'fund'), key: 'fund' },
    { label: '계정구분', kind: 'select', def: '', options: ACCOUNT_KINDS, key: 'acct' },
    { label: '기준일자', kind: 'dayRange', def: REVIEW_STATS_RANGE, key: 'payd' },
  ],
};

/** 투심보고 통계 — S1_28 */
export function ReviewStats({ onNav }: { onNav?: (r: string) => void }) {
  return <TablesPage cfg={REVIEW_STATS_PAGE} onNav={onNav} />;
}
