import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '보고 업데이트정보',
  title: '보고 업데이트정보',
  kind: 'list',
  entity: '보고업데이트',
  columns: [
    { key: 'gp',           label: '운용사',           type: 'gp',   align: 'left' },
    { key: 'subFund',      label: '자펀드',           type: 'text', align: 'left' },
    { key: 'investee',     label: '투자기업',         type: 'text', align: 'left' },
    { key: 'investDate',   label: '투심일자',         type: 'date', align: 'center' },
    { key: 'paymentDue',   label: '투자금납입 예정일', type: 'date', align: 'center' },
    { key: 'updatedAt',    label: '등록/변경일시',    type: 'date', align: 'center' },
  ],
  fields: [],
  filters: ['보고구분'],
  searchable: true,
  hideMetrics: true,
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_10_보고_업데이트정보.html',
  },
};
