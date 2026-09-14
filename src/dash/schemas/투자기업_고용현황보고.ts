import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '투자기업 고용현황보고',
  title: '투자기업 고용현황보고',
  kind: 'list',
  entity: '고용현황',
  columns: [
    { key: 'no',            label: 'No',          type: 'number', align: 'center' },
    { key: 'gp',            label: '운용사',      type: 'gp',     align: 'left' },
    { key: 'subFund',       label: '자펀드',      type: 'text',   align: 'left' },
    { key: 'bizNo',         label: '사업자번호',  type: 'pii',    align: 'center' },
    { key: 'firstInvestDate', label: '최초투자(전환)일자', type: 'date', align: 'center' },
    { key: 'investee',      label: '투자기업',    type: 'text',   align: 'left' },
    { key: 'baseYm',        label: '기준년월',    type: 'text',   align: 'center' },
    { key: 'salesAmt',      label: '매출액*',     type: 'amount', unit: '원', align: 'right' },
    { key: 'totalEmployees', label: '총고용인수',  type: 'number', align: 'right' },
    { key: 'youthEmployees', label: '청년고용인수', type: 'number', align: 'right' },
    { key: 'attachment',    label: '첨부파일',    type: 'text',   align: 'center' },
    { key: 'updatedAt',     label: '수정일시',    type: 'date',   align: 'center' },
    { key: 'isUploaded',    label: '업로드여부',  type: 'status', align: 'center' },
  ],
  fields: [
    { key: 'investee',      label: '투자기업',    control: 'text', required: true },
    { key: 'baseYm',        label: '기준년월',    control: 'text', required: true },
    { key: 'salesAmt',      label: '매출액',      control: 'number' },
    { key: 'totalEmployees', label: '총고용인수', control: 'number', required: true },
    { key: 'youthEmployees', label: '청년고용인수', control: 'number' },
    { key: 'attachment',    label: '첨부파일',    control: 'filepond' },
  ],
  filters: ['운용사', '자펀드', '계정구분', '기준년월'],
  statusDomain: [
    { label: '업로드', tone: 'success' },
    { label: '미업로드', tone: 'danger' },
  ],
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_32_투자기업_고용현황보고.html',
  },
};
