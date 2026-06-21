import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '조합별 월간보고 현황',
  title: '조합별 월간보고 현황',
  kind: 'list',
  entity: '월간보고',
  columns: [
    { key: 'no',           label: 'No',             type: 'number', align: 'center' },
    { key: 'reportYm',     label: '보고기준년월',    type: 'text',   align: 'center' },
    { key: 'gpCode',       label: '운용사코드',      type: 'code',   align: 'left' },
    { key: 'fundCode',     label: '운용사펀드코드',  type: 'code',   align: 'left' },
    { key: 'establishDt',  label: '결성일',          type: 'date',   align: 'center' },
    { key: 'existStart',   label: '존속시작일자',    type: 'date',   align: 'center' },
    { key: 'existEnd',     label: '존속종료일자',    type: 'date',   align: 'center' },
    { key: 'existPeriod',  label: '존속기간',        type: 'number', align: 'right' },
    { key: 'fundAmount',   label: '결성액',          type: 'amount', unit: '원', align: 'right' },
    // 우측 컬럼 image3.png 에서 잘림 — 추가 컬럼 미확인
  ],
  fields: [],
  filters: [],
  provenance: {
    capturedAt: '2026-05-28',
    sourceSystem: 'REPORT',
    captureFile: 'image3.png',
  },
};
