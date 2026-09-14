/* 투자실적 현황(투자기업) — 투자기업정보 > 투자실적 현황(투자기업).
   S1_34 참조. 원본은 투자규모/유형별 집계 중첩 테이블 + 지역별 리스트. 주요 지역별 리스트 컬럼 등록. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '투자실적 현황(투자기업)',
  title: '투자실적 현황(투자기업)',
  kind: 'list',
  entity: '투자실적',
  columns: [
    { key: 'location',    label: '소재지',      type: 'text',   align: 'left' },
    { key: 'investCount', label: '투자건수',    type: 'number', align: 'right' },
    { key: 'investAmt',   label: '투자금액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'ratio',       label: '비율(%)',     type: 'rate',   align: 'right' },
    { key: 'agriAmt',     label: '농식품 투자', type: 'amount', unit: '원', align: 'right' },
    { key: 'recoverAmt',  label: '회수금액',    type: 'amount', unit: '원', align: 'right' },
  ],
  fields: [],
  filters: ['계정구분', '연도기준', '투자실적구분', '데이터기준', '기준일자'],
  hideCardView: true,
  hideKpis: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_34_투자실적_현황_투자기업_.html',
  },
};
