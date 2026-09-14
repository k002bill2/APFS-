/* 전체 보고현황 — 모니터링 > 전체 보고현황.
   S1_44 참조. 투심현황/수시보고/정기보고 3개 섹션으로 구성된 복합 화면.
   스키마 트랙에서는 투심현황(주요 섹션)을 기본 리스트로 표현. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '전체 보고현황',
  title: '전체 보고현황',
  kind: 'list',
  entity: '보고현황',
  columns: [
    { key: 'no',            label: 'No',          type: 'number', align: 'center' },
    { key: 'gp',            label: '운용사',      type: 'gp',     align: 'left' },
    { key: 'subFund',       label: '자펀드',      type: 'text',   align: 'left' },
    { key: 'investee',      label: '투자기업',    type: 'text',   align: 'left' },
    { key: 'investStatus',  label: '투심상태',    type: 'status', align: 'center' },
    { key: 'investDate',    label: '투심일자',    type: 'date',   align: 'center' },
    { key: 'investAmt',     label: '투자금액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'investType',    label: '투자유형',    type: 'text',   align: 'center' },
    { key: 'isMandatory',   label: '의무투자',    type: 'status', align: 'center' },
    { key: 'isSmallScale',  label: '일정규모 이하투자', type: 'status', align: 'center' },
    { key: 'isAgri',        label: '농어업투자',  type: 'status', align: 'center' },
    { key: 'approvedAmt',   label: '승인금액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'paymentDue',    label: '투자금 납입예정일', type: 'date', align: 'center' },
  ],
  fields: [],
  filters: ['운용사', '자펀드', '계정구분', '기준일자'],
  statusDomain: [
    { label: '승인',   tone: 'success' },
    { label: '검토중', tone: 'warning' },
    { label: '반려',   tone: 'danger' },
    { label: '대기',   tone: 'info' },
  ],
  searchable: true,
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_44_전체_보고현황.html',
  },
};
