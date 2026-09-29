/* 조합별 월간보고 현황 — 자펀드 보고 > 월간보고조회 > 조합별 월간보고 현황.
   출처: docs/mockups/05_MOAF/S5_118_월간보고_조회.html (2026-09-29 파싱 실측, KRDS TO-BE)
   (종전 스키마는 잘린 캡처 image3.png 기반이라 우측 컬럼 미확인 상태였다 — 목업으로 교체)

   원문은 운용사가 제출한 월간보고의 **펀드개요** 섹션을 보여주는 읽기전용 조회 화면이다.
   · 검색박스 없음(원문에 .searchbox 마크업이 없다) → filters 비움.
   · 목록바: 총 N건 + 금액 단위(원/백만원/억원) 토글 + 엑셀 → unitToggle + 푸터 내보내기(공용).
   · 단일 헤더 9컬럼, 합계행·팝업·등록 폼 없음 → 스키마 트랙(GenericListPage).
   · 행 2건은 원문 tbody 리터럴 그대로. 존속기간은 원문이 '8년' 문자열이라 text 로 둔다.
   · 조회 전용이라 행 선택 체크박스·KPI 배지·카드뷰를 두지 않는다. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '조합별 월간보고 현황',
  title: '조합별 월간보고 현황',
  kind: 'list',
  entity: '월간보고',
  columns: [
    { key: 'no',          label: 'No',             type: 'number', align: 'center' },
    { key: 'reportYm',    label: '보고기준년월',   type: 'text',   align: 'center' },
    { key: 'gpCode',      label: '운용사코드',     type: 'code',   align: 'left' },
    { key: 'fundCode',    label: '운용사펀드코드', type: 'code',   align: 'center' },
    { key: 'establishDt', label: '결성일',         type: 'date',   align: 'center' },
    { key: 'existStart',  label: '존속시작일자',   type: 'date',   align: 'center' },
    { key: 'existEnd',    label: '존속종료일자',   type: 'date',   align: 'center' },
    { key: 'existPeriod', label: '존속기간',       type: 'text',   align: 'center' },
    { key: 'fundAmount',  label: '결성액',         type: 'amount', unit: '원', align: 'right' },
  ],
  fields: [],
  filters: [],
  hideCardView: true,
  hideRowSelection: true,
  hideKpis: true,
  hideMetrics: true,
  unitToggle: true,
  sample: [
    { no: 1, reportYm: '2026-04', gpCode: 'APFSLIB', fundCode: '102', establishDt: '2022-12-20', existStart: '2022-12-20', existEnd: '2030-12-25', existPeriod: '8년', fundAmount: 1000000000 },
    { no: 2, reportYm: '2026-04', gpCode: 'APFSLIB', fundCode: '103', establishDt: '2023-07-06', existStart: '2023-07-31', existEnd: '2031-07-30', existPeriod: '8년', fundAmount: 3000000000 },
  ],
  provenance: {
    capturedAt: '2026-09-29',
    sourceSystem: 'REPORT',
    captureFile: 'docs/mockups/05_MOAF/S5_118_월간보고_조회.html',
  },
};
