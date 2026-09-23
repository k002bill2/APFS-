/* 평가시점 데이터 확인 — 조기경보 > 가치평가 > 평가시점 데이터 확인.
   출처: docs/mockups/02_조기경보/S2_86_평가시점_데이터_확인.html (2026-09-23 파싱 실측)

   트랙: 스키마(단일 헤더 26컬럼 · 1행 · 합계행/팝업/다중 표 없음). 원문 `DATA` 1건을 그대로 싣는다.
   원문 셀 표시값을 옮긴다 — 금액 칸이 null 이면 원문 amtCell 이 '미보고' 를 그리므로 '미보고' 문자열,
   '해당없음' 은 그대로, 상장여부는 원문 listedTag('N') 가 그리는 '비상장'. 무형자산상각비는 원문이 0 이다
   (설계메모 [확인 필요]: 실보고 0 인지 결측인지 원문 확인 필요 — 값은 바꾸지 않는다).
   검색조건 `평가년월`(원문 기본 2025-12)은 행에 평가년월 컬럼이 없는 **조회 기준**이다 → 상세필터에 월 선택으로 두되
   행을 거르지 않는다(filter_field.ts '…년월' 휴리스틱 → kind month · columnKey 없음 → `· 데이터 연동 후 적용` 캡션).
   스키마 필터에는 기본값 메커니즘이 없어 2025-12 를 미리 고르지 않는다(골드 fund_early_warning 과 같은 "기본값 없음").
   부채비율·ROE 는 원문 pctCell(백분율 텍스트)이라 'text'. 조회 전용 — fields 없음. KPI: 미포함(브리프 규칙 5). */
import type { PageSchema } from './types';

const amt = (key: string, label: string) => ({ key, label, type: 'amount' as const, unit: '원', align: 'right' as const });

export const schema: PageSchema = {
  route: '평가시점 데이터 확인',
  title: '평가시점 데이터 확인',
  kind: 'list',
  entity: '투자자산',
  columns: [
    { key: 'fund', label: '조합', type: 'text', align: 'left' },
    { key: 'comp', label: '투자기업명', type: 'text', align: 'left' },
    { key: 'biz', label: '사업자번호', type: 'code', align: 'center' },
    { key: 'kind', label: '투자자산 종류', type: 'text', align: 'center' },
    amt('invest', '총투자 금액'), amt('bal', '투자잔액'),
    { key: 'shares', label: '보유 주식수', type: 'text', align: 'center' },
    { key: 'totShares', label: '총발행주식수', type: 'text', align: 'right' },
    { key: 'ratio', label: '펀드지분율(희석전)', type: 'text', align: 'center' },
    { key: 'listed', label: '상장여부', type: 'text', align: 'center' },
    amt('asset', '총자산'), amt('capital', '자본총계'), amt('debt', '부채총계'), amt('sales', '매출액'),
    amt('opInc', '영업이익'), amt('netInc', '당기순이익'), amt('ebit', 'EBIT'), amt('dep', '감가상각비'), amt('amort', '무형자산상각비'),
    { key: 'debtRatio', label: '부채비율', type: 'text', align: 'center' },
    amt('ebitda', 'EBITDA'), amt('recovered', '회수총액'), amt('netAsset', '순자산'),
    { key: 'roe', label: 'ROE', type: 'text', align: 'center' },
    { key: 'parValue', label: '액면가', type: 'text', align: 'center' },
    { key: 'closeMonth', label: '결산기', type: 'text', align: 'center' },
  ],
  fields: [],
  filters: ['평가년월'],
  hideCardView: true,
  hideRowSelection: true,
  hideKpis: true,
  hideMetrics: true,
  unitToggle: true,
  sample: [
    { fund: '유니 수산식품 투자조합1호', comp: '어업회사법인 페리프씨웍스 주식회사', biz: '214-88-75812', kind: 'CB',
      invest: 1000000000, bal: 1000000000, shares: '해당없음', totShares: '166,000', ratio: '해당없음', listed: '비상장',
      asset: '미보고', capital: '미보고', debt: '미보고', sales: '미보고', opInc: '미보고', netInc: '미보고', ebit: '미보고',
      dep: '미보고', amort: 0, debtRatio: '미보고', ebitda: '미보고', recovered: 19489041, netAsset: '미보고', roe: '미보고',
      parValue: '해당없음', closeMonth: '12' },
  ],
  provenance: {
    capturedAt: '2026-09-23',
    sourceSystem: 'EWS',
    captureFile: 'docs/mockups/02_조기경보/S2_86_평가시점_데이터_확인.html',
  },
};
