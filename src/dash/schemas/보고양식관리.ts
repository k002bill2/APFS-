import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '보고양식관리',
  title: '보고양식관리',
  kind: 'list',
  entity: '보고양식',
  columns: [
    { key: 'no',       label: 'No',      type: 'number', align: 'center' },
    { key: 'title',    label: '양식제목', type: 'text',   align: 'left' },
    { key: 'desc',     label: '설명',    type: 'text',   align: 'left' },
    { key: 'fileExt',  label: '형식',    type: 'text',   align: 'center' },
    { key: 'updatedAt', label: '수정일', type: 'date',   align: 'center' },
  ],
  fields: [
    { key: 'title',   label: '양식제목', control: 'text', long: true, required: true },
    { key: 'desc',    label: '설명',    control: 'textarea' },
    { key: 'file',    label: '파일',    control: 'filepond' },
  ],
  filters: [],
  searchable: true,
  hideMetrics: true,
  hideCardView: true,
  hideRowSelection: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_09_보고양식관리.html',
  },
};
