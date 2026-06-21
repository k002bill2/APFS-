import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '자펀드 공고 정보관리',
  title: '자펀드 공고 정보관리',
  kind: 'form',
  entity: '공고',
  columns: [
    { key: 'bizYear',    label: '사업년도',  type: 'text',   align: 'center' },
    { key: 'periodType', label: '정기/수시',  type: 'text',   align: 'center' },
    { key: 'seqNo',      label: '차수',       type: 'number', align: 'center' },
    { key: 'title',      label: '제목',       type: 'text',   align: 'left' },
    { key: 'status',     label: '상태',       type: 'status', align: 'center' },
  ],
  fields: [
    { key: 'moeFund',    label: '모펀드',    control: 'readonly' },
    { key: 'bizYear',    label: '사업년도',  control: 'number' },
    { key: 'periodType', label: '정기/수시', control: 'select', options: ['정기', '수시'] },
    { key: 'seqNo',      label: '차수',      control: 'number' },
    { key: 'fundAccount',label: '자펀드계정', control: 'select', options: ['전체'] },
    { key: 'title',      label: '제목',      control: 'text', required: true },
    { key: 'content',    label: '공고내용',  control: 'textarea' },
    { key: 'attachment', label: '첨부파일',  control: 'file' },
  ],
  filters: ['사업년도', '정기/수시'],
  statusDomain: [
    { label: '게시중', tone: 'success' },
    { label: '마감',   tone: 'danger' },
  ],
  provenance: {
    capturedAt: '2026-05-28',
    sourceSystem: 'FFMS',
    captureFile: 'image1.png',
  },
};
