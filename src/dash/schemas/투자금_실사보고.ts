import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '투자금 실사보고',
  title: '투자금 실사보고',
  kind: 'list',
  entity: '실사보고',
  columns: [
    { key: 'no',              label: 'No',          type: 'number', align: 'center' },
    { key: 'gp',              label: '운용사',      type: 'gp',     align: 'left' },
    { key: 'subFund',         label: '자펀드',      type: 'text',   align: 'left' },
    { key: 'investee',        label: '투자기업',    type: 'text',   align: 'left' },
    { key: 'investType',      label: '투자유형',    type: 'text',   align: 'center' },
    { key: 'firstInvestDate', label: '최초 투자일자', type: 'date', align: 'center' },
    { key: 'remainDays',      label: '잔여일수',    type: 'number', align: 'right' },
    { key: 'investDate',      label: '투자일자',    type: 'date',   align: 'center' },
    { key: 'dueDiligDate',    label: '실사일자',    type: 'date',   align: 'center' },
    { key: 'reportDate',      label: '보고일자',    type: 'date',   align: 'center' },
    { key: 'reportFile',      label: '보고서',      type: 'text',   align: 'center' },
    { key: 'updatedAt',       label: '수정일시',    type: 'date',   align: 'center' },
    { key: 'isConfirmed',     label: '확정여부',    type: 'status', align: 'center' },
    { key: 'note',            label: '비고',        type: 'text',   align: 'left' },
  ],
  fields: [
    { key: 'investee',     label: '투자기업',  control: 'text', long: true, required: true },
    { key: 'investType',   label: '투자유형',  control: 'select', options: ['주식', '전환사채', 'BW', '기타'] },
    { key: 'dueDiligDate', label: '실사일자',  control: 'date', required: true },
    { key: 'reportDate',   label: '보고일자',  control: 'date', required: true },
    { key: 'reportFile',   label: '보고서',    control: 'filepond' },
    { key: 'note',         label: '비고',      control: 'textarea' },
  ],
  filters: ['운용사', '자펀드', '계정구분', '투자기간'],
  statusDomain: [
    { label: '확정',   tone: 'success' },
    { label: '미확정', tone: 'warning' },
  ],
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_40_투자금실사보고.html',
  },
};
