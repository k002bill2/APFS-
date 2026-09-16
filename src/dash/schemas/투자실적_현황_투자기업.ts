/* 투자실적 현황(투자기업) — 투자자산관리 > 투자기업정보 > 투자실적현황(투자기업).
   출처: docs/mockups/01_투자자산관리/S1_34_투자실적_현황_투자기업_.html (2026-09-15 파싱 실측)

   ── 이 파일의 역할 ──
   화면은 전용 페이지 `investee_invest_stats.tsx` 가 그린다. 원문이 **집계 매트릭스 3장**이고
   ①②는 `구분` 열을 rowspan 으로 묶는 블록 구조 + 3단 헤더라 PageSchema(평평한 columns 한 벌)로
   담기지 않는다. 이 파일은 라우트 레지스트리(DEFAULT_SCHEMA 폴백 차단) + 출처 기록으로 남는다.

   아래 columns 는 원문 **③ 소재지별 투자실적** 표의 헤더 그대로다(3장 중 유일하게 평평한 표).
   ①②를 여기 접어 넣지 않는다 — 이전 버전이 그렇게 6컬럼으로 축소해 ①②를 통째로 잃었다.
   행 데이터는 `investee_invest_stats_model.ts` 가 갖는다(전용 페이지가 소비 — 두 벌로 만들지 않는다). */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '투자실적 현황(투자기업)',
  title: '투자실적 현황(투자기업)',
  kind: 'list',
  entity: '투자실적',
  // 원문 ③ 소재지별 표 — 투자건수(건수·비율)·투자금액(금액·비율) 2단 헤더. 금액 단위는 억원이다.
  columns: [
    { key: 'no',          label: 'NO',       type: 'number', align: 'center' },
    { key: 'region',      label: '소재지',   type: 'text',   align: 'left' },
    { key: 'investCount', label: '건수',     type: 'number', align: 'right', group: '투자건수' },
    { key: 'countRatio',  label: '비율(%)',  type: 'rate',   align: 'right', group: '투자건수' },
    { key: 'investAmt',   label: '금액',     type: 'number', unit: '억원', align: 'right', group: '투자금액' },
    { key: 'amtRatio',    label: '비율(%)',  type: 'rate',   align: 'right', group: '투자금액' },
  ],
  fields: [],
  filters: ['계정구분', '연도기준', '투자실적구분', '데이터기준', '기준일자'],
  hideCardView: true,
  hideKpis: true,
  hideMetrics: true,
  provenance: {
    capturedAt: '2026-09-15',
    sourceSystem: 'FFMS',
    captureFile: 'docs/mockups/01_투자자산관리/S1_34_투자실적_현황_투자기업_.html',
  },
};
