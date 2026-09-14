import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '정기보고회수내역',
  title: '정기보고회수내역',
  kind: 'list',
  entity: '회수내역',
  columns: [
    { key: 'no',           label: 'NO',       type: 'number', align: 'center' },
    { key: 'gp',           label: '운용사',   type: 'gp',     align: 'left' },
    { key: 'subFund',      label: '자펀드',   type: 'text',   align: 'left' },
    { key: 'investee',     label: '투자기업', type: 'text',   align: 'left' },
    { key: 'investDate',   label: '투자시점', type: 'date',   align: 'center' },
    { key: 'investAmt',    label: '투자금액', type: 'amount', unit: '원', align: 'right' },
    { key: 'isFullRecovered', label: '회수완료 여부', type: 'status', align: 'center' },
    { key: 'recoverDate',  label: '회수일자', type: 'date',   align: 'center' },
    { key: 'recoverPrincipal', label: '회수원금(A)', type: 'amount', unit: '원', align: 'right' },
    { key: 'recoverTotal', label: '회수금액(B)', type: 'amount', unit: '원', align: 'right' },
    { key: 'profit',       label: '수익금액(B-A)', type: 'amount', unit: '원', align: 'right' },
    { key: 'writedown',    label: '감액금액', type: 'amount', unit: '원', align: 'right' },
    { key: 'recoverStatus', label: '회수 상태', type: 'status', align: 'center' },
    { key: 'note',         label: '비고',     type: 'text',   align: 'left' },
  ],
  fields: [],
  filters: ['운용사', '자펀드', '계정구분', '기준년월'],
  statusDomain: [
    { label: '회수완료', tone: 'success' },
    { label: '부분회수', tone: 'warning' },
    { label: '미회수',   tone: 'danger' },
  ],
  searchable: true,
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_29_정기보고회수내역.html',
  },
};
