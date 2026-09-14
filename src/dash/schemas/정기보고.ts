import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '정기보고',
  title: '정기보고',
  kind: 'list',
  entity: '정기보고',
  columns: [
    { key: 'no',         label: 'No',       type: 'number', align: 'center' },
    { key: 'gp',         label: '운용사',   type: 'gp',     align: 'left' },
    { key: 'subFund',    label: '자펀드',   type: 'text',   align: 'left' },
    { key: 'reportYm',   label: '보고년월', type: 'text',   align: 'center' },
    /* 보고구분 = 상세 보고서 진입점. 원문 설계 메모: "보고구분(월간보고서 태그) 또는 상세조회 클릭으로만
       진입" — '보고서' 열(첨부파일명)에는 링크를 걸지 않는다. 월간보고 행만 상세가 있다. */
    { key: 'reportType', label: '보고구분', type: 'text',   align: 'center', detail: 'monthlyReport', detailWhen: '월간보고' },
    { key: 'reportFile', label: '보고서',   type: 'text',   align: 'center' },
    { key: 'updatedAt',  label: '수정일시', type: 'date',   align: 'center' },
    { key: 'fundStatus', label: '조합상태', type: 'status', align: 'center' },
  ],
  fields: [
    { key: 'gp',         label: '운용사',   control: 'text' },
    { key: 'subFund',    label: '자펀드',   control: 'text' },
    { key: 'reportYm',   label: '보고년월', control: 'text', required: true },
    { key: 'reportType', label: '보고구분', control: 'select', required: true, options: ['월간보고', '반기보고', '연간보고'] },
    { key: 'reportFile', label: '보고서',   control: 'file' },
  ],
  filters: ['운용사', '자펀드', '계정구분', '보고구분', '기준년월'],
  statusDomain: [
    { label: '제출완료', tone: 'success' },
    { label: '미제출',   tone: 'danger' },
    { label: '검토중',   tone: 'warning' },
    { label: '반려',     tone: 'danger' },
  ],
  searchable: true,
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_06_정기보고.html',
  },
};
