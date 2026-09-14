import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '운용사별 재무제표',
  title: '운용사별 재무제표',
  kind: 'list',
  entity: '재무제표',
  columns: [
    { key: 'no',           label: 'No',       type: 'number', align: 'center' },
    { key: 'gp',           label: '운용사',   type: 'gp',     align: 'left' },
    { key: 'subFund',      label: '자펀드',   type: 'text',   align: 'left' },
    { key: 'investee',     label: '투자기업', type: 'text',   align: 'left' },
    { key: 'baseYm',       label: '기준년월', type: 'text',   align: 'center' },
    { key: 'totalAssets',  label: '자산총계', type: 'amount', unit: '원', align: 'right' },
    { key: 'totalLiab',    label: '부채총계', type: 'amount', unit: '원', align: 'right' },
    { key: 'totalEquity',  label: '자본총계', type: 'amount', unit: '원', align: 'right' },
    { key: 'sales',        label: '매출액',   type: 'amount', unit: '원', align: 'right' },
    { key: 'operProfit',   label: '영업이익', type: 'amount', unit: '원', align: 'right' },
    { key: 'netProfit',    label: '당기순이익', type: 'amount', unit: '원', align: 'right' },
  ],
  fields: [
    { key: 'investee',    label: '투자기업', control: 'text', required: true },
    { key: 'baseYm',      label: '기준년월', control: 'text', required: true },
    { key: 'totalAssets', label: '자산총계', control: 'number' },
    { key: 'totalLiab',   label: '부채총계', control: 'number' },
    { key: 'totalEquity', label: '자본총계', control: 'number' },
    { key: 'sales',       label: '매출액',   control: 'number' },
    { key: 'operProfit',  label: '영업이익', control: 'number' },
    { key: 'netProfit',   label: '당기순이익', control: 'number' },
  ],
  filters: ['운용사', '자펀드'],
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_37_운용사별_재무제표.html',
  },
};
