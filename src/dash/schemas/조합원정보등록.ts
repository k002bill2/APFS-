import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '조합원정보등록',
  title: '조합원정보등록',
  kind: 'list',
  entity: '조합원',
  columns: [
    { key: 'no',         label: 'NO',              type: 'number', align: 'center' },
    { key: 'member',     label: '조합원',          type: 'text',   align: 'left' },
    { key: 'bizNo',      label: '사업자번호/주민번호', type: 'pii',  align: 'center' },
    { key: 'address',    label: '주소',            type: 'text',   align: 'left' },
    { key: 'tel',        label: '전화번호',        type: 'pii',    align: 'center' },
    { key: 'note',       label: '비고',            type: 'text',   align: 'left' },
  ],
  fields: [
    { key: 'member',   label: '조합원',          control: 'text', required: true },
    { key: 'bizNo',    label: '사업자번호/주민번호', control: 'text', pii: true },
    { key: 'address',  label: '주소',            control: 'address', long: true },
    { key: 'tel',      label: '전화번호',        control: 'text', pii: true },
    { key: 'note',     label: '비고',            control: 'textarea' },
  ],
  filters: ['모펀드'],
  searchable: true,
  hideMetrics: true,
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_15_조합원정보등록.html',
  },
};
