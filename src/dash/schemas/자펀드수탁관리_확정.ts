import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '자펀드수탁관리(확정)',
  title: '자펀드수탁관리(확정)',
  kind: 'list',
  entity: '수탁관리',
  columns: [
    { key: 'no',           label: 'No',       type: 'number', align: 'center' },
    { key: 'gp',           label: '운용사',   type: 'gp',     align: 'left' },
    { key: 'subFund',      label: '자펀드',   type: 'text',   align: 'left' },
    { key: 'matchStatus',  label: '일치여부', type: 'status', align: 'center' },
    { key: 'confirmed',    label: '확정여부', type: 'status', align: 'center' },
    { key: 'investShares', label: '투자자산 보유주수', type: 'number', align: 'right' },
    { key: 'investBalance', label: '투자자산 잔액', type: 'amount', unit: '원', align: 'right' },
    { key: 'nonInvestShares', label: '미투자자산 보유주수', type: 'number', align: 'right' },
    { key: 'nonInvestBalance', label: '미투자자산 잔액', type: 'amount', unit: '원', align: 'right' },
    { key: 'totalBalance',  label: '잔액(합계)', type: 'amount', unit: '원', align: 'right' },
  ],
  fields: [
    { key: 'subFund',    label: '자펀드',   control: 'text', long: true },
    { key: 'confirmed',  label: '확정여부', control: 'select', options: ['미확정', '확정'] },
  ],
  filters: [],
  statusDomain: [
    { label: '확정',  tone: 'success' },
    { label: '미확정', tone: 'warning' },
    { label: '일치',  tone: 'success' },
    { label: '불일치', tone: 'danger' },
  ],
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_27_자펀드수탁관리_확정_.html',
  },
};
