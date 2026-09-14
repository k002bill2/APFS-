/* 종합통계 — 자펀드 관리 > 종합통계.
   S1_25 참조. 집계 중첩 테이블(결성연도×분야별 투자/회수 실적). 주요 컬럼만 평탄화 등록. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '종합통계',
  title: '종합통계',
  kind: 'list',
  entity: '통계',
  columns: [
    { key: 'no',            label: 'NO',         type: 'number', align: 'center' },
    { key: 'establishYear', label: '결성연도',   type: 'text',   align: 'center' },
    { key: 'sector',        label: '분야',       type: 'text',   align: 'center' },
    { key: 'fundName',      label: '조합',       type: 'text',   align: 'left' },
    { key: 'fundAmount',    label: '결성액',     type: 'amount', unit: '원', align: 'right' },
    { key: 'govAmt',        label: '정부',       type: 'amount', unit: '원', align: 'right' },
    { key: 'privateAmt',    label: '민간',       type: 'amount', unit: '원', align: 'right' },
    { key: 'privateRate',   label: '민간비율',   type: 'rate',   align: 'right' },
    { key: 'investCount',   label: '투자건수(개)', type: 'number', align: 'right' },
    { key: 'agriAmt',       label: '농식품 투자', type: 'amount', unit: '원', align: 'right' },
    { key: 'recoverAmt',    label: '회수실적',   type: 'amount', unit: '원', align: 'right' },
    { key: 'establishDate', label: '결성일',     type: 'date',   align: 'center' },
    { key: 'irr',           label: '투자승수',   type: 'rate',   align: 'right' },
  ],
  fields: [],
  filters: ['계정구분', '데이터기준', '기준일자'],
  hideCardView: true,
  hideKpis: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_25_종합통계.html',
  },
};
