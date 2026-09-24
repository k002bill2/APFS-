/* 운용사 재무정보 조회 — 투자자산관리 > 운용사 모니터링 > 운용사 재무정보 조회.
   출처: docs/mockups/01_투자자산관리/S1_38_운용사_재무정보_조회.html (2026-09-15 파싱 실측)

   원문 `DATA` 2건(NH투자증권·농협은행, 2026-01)을 그대로 싣는다. `No` 는 원문에 데이터 필드가
   없고 렌더 시 인덱스로 붙으므로 sample 에서도 1부터 부여한다.
   조회 전용이라 fields 는 비운다(원문에 등록/수정 폼 없음).
   기준년월 셀 → 운용사정량지표상세(재무건정성비율) 팝업(gp_ratio_detail_modal.tsx, 원문 openRatioDetail).

   ── 검색조건(S1_38:221-234) ── 원문은 **운용사·기준년월 2항목**이다(원문에 없는 GP구분 필터는 뺐다).
   · 운용사 = 원문 형태 그대로 `코드 입력(NHLIB) + 명칭(NH투자증권) + G.P 검색` 묶음(codeName, 기본 NHLIB~NH투자증권).
     **no-op** 이다: 원문 설계 메모(S1_38:281)가 "운용사=NH투자증권으로 조회했는데 결과 그리드엔 NH투자증권·농협은행
     2건이 함께 나옴 — 운용사 필터가 실제로 결과를 좁히는지 확인 필요"라 적었다. 기본값으로 거르면 원문 2행이 1행이 된다.
     행에 GP 코드 컬럼도 없다. 검색 팝업(GPLIST) 대신 명칭 입력이 검색어 역할을 한다.
   · 기준년월 = 원문 월 선택 1개(기본 2026-01) → baseYm 정확일치. 2행 모두 2026-01 이라 기본값이 행을 줄이지 않는다. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '운용사 재무정보 조회',
  title: '운용사 재무정보 조회',
  kind: 'list',
  entity: '재무정보',
  columns: [
    { key: 'no',            label: 'No',         type: 'number', align: 'center' },
    { key: 'gp',            label: '운용사명',   type: 'gp',     align: 'left' },
    { key: 'gpType',        label: 'GP구분',     type: 'text',   align: 'center' },
    /* 원문 `.gridlnk-btn` — 모든 행의 기준년월이 운용사정량지표상세(재무건정성비율) 팝업 버튼이다(S1_38:322·419-434).
       detailWhen/detailPattern 없음 = 전 행 링크(detail_link.ts ③) */
    { key: 'baseYm',        label: '기준년월',   type: 'text',   align: 'center', detail: 'gpRatioDetail' },
    { key: 'currentAssets', label: '유동자산',   type: 'amount', unit: '원', align: 'right' },
    { key: 'nonCurrentAssets', label: '비유동자산', type: 'amount', unit: '원', align: 'right' },
    { key: 'totalAssets',   label: '자산총계',   type: 'amount', unit: '원', align: 'right' },
    { key: 'currentLiab',   label: '유동부채',   type: 'amount', unit: '원', align: 'right' },
    { key: 'nonCurrentLiab', label: '비유동부채', type: 'amount', unit: '원', align: 'right' },
    { key: 'totalLiab',     label: '부채총계',   type: 'amount', unit: '원', align: 'right' },
    { key: 'capital',       label: '자본금',     type: 'amount', unit: '원', align: 'right' },
    { key: 'totalEquity',   label: '자본총계',   type: 'amount', unit: '원', align: 'right' },
    { key: 'sales',         label: '매출액',     type: 'amount', unit: '원', align: 'right' },
    { key: 'cogs',          label: '매출원가',   type: 'amount', unit: '원', align: 'right' },
    { key: 'sga',           label: '일반관리비', type: 'amount', unit: '원', align: 'right' },
    { key: 'ordinaryProfit', label: '경상이익',  type: 'amount', unit: '원', align: 'right' },
    { key: 'netProfit',     label: '당기순이익', type: 'amount', unit: '원', align: 'right' },
  ],
  fields: [],
  /* 라벨 '운용사'는 컬럼 라벨('운용사명')과 달라도 filterSpecs 가 명시 명세로 해결한다 — tag 로 떨어지지 않는다. */
  filters: ['운용사', '기준년월'],
  filterSpecs: {
    운용사: { kind: 'codeName', def: 'NHLIB~NH투자증권' },
    기준년월: { kind: 'month', def: '2026-01', key: 'baseYm' },
  },
  searchable: true,
  hideCardView: true,
  // 조회 전용 — 선택으로 실행할 액션이 없어 체크박스 컬럼을 두지 않는다(apfs-grid hideRowSelection).
  hideRowSelection: true,
  hideKpis: true,
  hideMetrics: true,
  unitToggle: true,
  sample: [
    { no: 1, gp: 'NH투자증권', gpType: '증권회사', baseYm: '2026-01', currentAssets: 2644195000000, nonCurrentAssets: 79024930000000, totalAssets: 81669125000000, currentLiab: 11946785000000, nonCurrentLiab: 60596193000000, totalLiab: 72542978000000, capital: 1943851000000, totalEquity: 9126147000000, sales: 2930572000000, cogs: 960201000000, sga: 906334000000, ordinaryProfit: 968385000000, netProfit: 748144000000 },
    { no: 2, gp: '농협은행', gpType: '은행', baseYm: '2026-01', currentAssets: 32113041000000, nonCurrentAssets: 416769614000000, totalAssets: 448882655000000, currentLiab: 340863906000000, nonCurrentLiab: 81789985000000, totalLiab: 422653891000000, capital: 2423567000000, totalEquity: 26228764000000, sales: 17491329000000, cogs: 12145119000000, sga: 2851443000000, ordinaryProfit: 2125463000000, netProfit: 1565023000000 },
  ],
  provenance: {
    capturedAt: '2026-09-15',
    sourceSystem: 'FFMS',
    captureFile: 'docs/mockups/01_투자자산관리/S1_38_운용사_재무정보_조회.html',
  },
};
