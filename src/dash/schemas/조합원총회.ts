import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '조합원총회',
  title: '조합원총회',
  kind: 'list',
  entity: '조합원총회',
  columns: [
    { key: 'no',              label: 'No',          type: 'number', align: 'center' },
    { key: 'gp',              label: '운용사',      type: 'gp',     align: 'left' },
    { key: 'subFund',         label: '자펀드',      type: 'text',   align: 'left' },
    { key: 'status',          label: '보고상태',    type: 'status', align: 'center' },
    { key: 'meetingType',     label: '총회구분',    type: 'text',   align: 'center' },
    { key: 'meetingDate',     label: '총회일자',    type: 'date',   align: 'center' },
    { key: 'title',           label: '제목',        type: 'text',   align: 'left' },
    { key: 'agenda',          label: '안건',        type: 'text',   align: 'left' },
    { key: 'scheduleFixed',   label: '일정 확정여부',  type: 'status', align: 'center' },
    { key: 'resultFixed',     label: '결과 확정여부',  type: 'status', align: 'center' },
  ],
  fields: [
    { key: 'gp',          label: '운용사',   control: 'text', long: true },
    { key: 'subFund',     label: '자펀드',   control: 'text', long: true },
    { key: 'meetingType', label: '총회구분', control: 'select', required: true, options: ['정기총회', '임시총회', '서면결의'] },
    { key: 'meetingDate', label: '총회일자', control: 'date', required: true },
    { key: 'title',       label: '제목',     control: 'text', long: true, required: true },
    { key: 'agenda',      label: '안건',     control: 'textarea' },
  ],
  filters: ['운용사', '자펀드', '계정구분', '총회구분', '총회기간'],
  statusDomain: [
    { label: '예정',   tone: 'info' },
    { label: '완료',   tone: 'success' },
    { label: '미확정', tone: 'warning' },
  ],
  searchable: true,
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_07_조합원총회.html',
  },
};
