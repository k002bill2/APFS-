/* 조합예상자금 정보보고 — 사후보고관리 > 조합예상자금 정보보고.
   S1_08 참조. 원본은 초순/중순/말 등 중첩 헤더가 있으나 스키마 트랙에서는
   주요 리스트 컬럼만 반영하고 중첩 집계는 상세 팝업에서 처리. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '조합예상자금 정보보고',
  title: '조합예상자금 정보보고',
  kind: 'list',
  entity: '조합예상자금',
  columns: [
    { key: 'no',             label: 'No',              type: 'number', align: 'center' },
    { key: 'gp',             label: '운용사',          type: 'gp',     align: 'left' },
    { key: 'subFund',        label: '자펀드',          type: 'text',   align: 'left' },
    { key: 'accountType',    label: '계정구분',        type: 'text',   align: 'center' },
    { key: 'registeredAt',   label: '등록일시',        type: 'date',   align: 'center' },
    { key: 'totalCommit',    label: '약정총액',        type: 'amount', unit: '원', align: 'right' },
    { key: 'moeCommit',      label: '모태펀드',        type: 'amount', unit: '원', align: 'right' },
    { key: 'nextMonthReq',   label: '다음월 자금요청 예상금액',   type: 'amount', unit: '원', align: 'right' },
    { key: 'afterNextReq',   label: '다다음월 자금요청 예상금액', type: 'amount', unit: '원', align: 'right' },
    { key: 'attachment',     label: '첨부파일',        type: 'text',   align: 'center' },
    { key: 'updatedAt',      label: '수정일시',        type: 'date',   align: 'center' },
  ],
  fields: [
    { key: 'gp',           label: '운용사',          control: 'text', long: true },
    { key: 'subFund',      label: '자펀드',          control: 'text', long: true },
    { key: 'accountType',  label: '계정구분',        control: 'select', options: ['농식품', '수산', '산림', '농어촌'] },
    { key: 'nextMonthReq', label: '다음월 자금요청 예상금액',   control: 'number' },
    { key: 'afterNextReq', label: '다다음월 자금요청 예상금액', control: 'number' },
    { key: 'attachment',   label: '첨부파일',        control: 'filepond' },
  ],
  filters: ['운용사', '자펀드', '계정구분', '기준년월'],
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_08_조합예상자금보고.html',
  },
};
