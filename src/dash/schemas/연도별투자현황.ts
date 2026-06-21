import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '연도별투자현황',
  title: '연도별 투자현황',
  kind: 'list',
  entity: '모태펀드',
  columns: [
    { key: 'gubun',        label: '구분',           type: 'text',   align: 'left' },
    { key: 'selectYear',   label: '선정년도',        type: 'text',   align: 'center' },
    { key: 'fundCount',    label: '조합수',          type: 'number', align: 'right' },
    { key: 'commitTotal',  label: '약정총액',        type: 'amount', unit: '원', align: 'right' },
    { key: 'moaeCommit',   label: '모태펀드약정액',   type: 'amount', unit: '원', align: 'right' },
    { key: 'paidTotal',    label: '납입총액(A)',      type: 'amount', unit: '원', align: 'right' },
    { key: 'moaePaid',     label: '모태펀드납입액',   type: 'amount', unit: '원', align: 'right' },
    { key: 'cashB1',       label: '현금성자산(B1)',   type: 'amount', unit: '원', align: 'right' },
    // 우측 컬럼 image1.png 에서 잘림 — 추가 컬럼 미확인
  ],
  fields: [],
  filters: ['기준일', '계정구분', '조회기준'],
  provenance: {
    capturedAt: '2026-05-28',
    sourceSystem: 'BRIEF',
    captureFile: 'image1.png',
  },
};
