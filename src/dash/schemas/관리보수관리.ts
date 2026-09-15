import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '관리보수관리',
  title: '관리보수관리',
  kind: 'list',
  entity: '관리보수',
  columns: [
    { key: 'no',         label: 'No',       type: 'number', align: 'center' },
    { key: 'gp',         label: '운용사',   type: 'gp',     align: 'left' },
    { key: 'subFund',    label: '자펀드',   type: 'text',   align: 'left' },
    { key: 'reportType', label: '보고구분', type: 'text',   align: 'center' },
    { key: 'payDate',    label: '지급일자', type: 'date',   align: 'center' },
    { key: 'payType',    label: '지급구분', type: 'text',   align: 'center' },
    { key: 'amount',     label: '금액(원)', type: 'amount', unit: '원', align: 'right' },
    { key: 'isConfirmed', label: '확정여부', type: 'status', align: 'center' },
  ],
  fields: [
    { key: 'gp',         label: '운용사',   control: 'text', long: true },
    { key: 'subFund',    label: '자펀드',   control: 'text', long: true },
    { key: 'reportType', label: '보고구분', control: 'select', required: true, options: ['월간', '반기', '연간'] },
    { key: 'payDate',    label: '지급일자', control: 'date', required: true },
    { key: 'payType',    label: '지급구분', control: 'select', required: true, options: ['선지급', '후지급', '기타'] },
    { key: 'amount',     label: '금액',     control: 'number', required: true },
  ],
  filters: ['운용사', '자펀드', '계정구분', '지급기간'],
  statusDomain: [
    { label: '확정',   tone: 'success' },
    { label: '미확정', tone: 'warning' },
  ],
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_43_관리보수관리.html',
  },
};
