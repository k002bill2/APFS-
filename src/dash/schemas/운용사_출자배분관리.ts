/* (운용사)출자배분관리 — 자펀드 관리 > (운용사)출자배분관리.
   S1_14 참조. 원본에는 원금배분/수익배분/성과보수/원천징수/합계 등 중첩 컬럼 그룹이 있으나
   스키마 트랙에서 주요 평탄화 컬럼만 등록. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '(운용사)출자배분관리',
  title: '(운용사)출자배분관리',
  kind: 'list',
  entity: '출자배분',
  columns: [
    { key: 'no',            label: 'No',          type: 'number', align: 'center' },
    { key: 'gp',            label: '운용사',      type: 'gp',     align: 'left' },
    { key: 'subFund',       label: '자펀드',      type: 'text',   align: 'left' },
    { key: 'totalCommit',   label: '약정총액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'moeCommit',     label: '모태펀드 약정액', type: 'amount', unit: '원', align: 'right' },
    { key: 'divType',       label: '구분',        type: 'text',   align: 'center' },
    { key: 'baseDate',      label: '기준일자',    type: 'date',   align: 'center' },
    { key: 'totalPaid',     label: '납입총액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'moePaid',       label: '모태펀드 납입액', type: 'amount', unit: '원', align: 'right' },
    { key: 'otherDiv',      label: '기타조합원 배분', type: 'amount', unit: '원', align: 'right' },
    { key: 'moeDiv',        label: '모태펀드 배분',   type: 'amount', unit: '원', align: 'right' },
    { key: 'divTotal',      label: '배분합계',    type: 'amount', unit: '원', align: 'right' },
    { key: 'balance',       label: '출자잔액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'custodyMatch',  label: '수탁일치여부', type: 'status', align: 'center' },
  ],
  fields: [
    { key: 'gp',       label: '운용사',   control: 'text', long: true },
    { key: 'subFund',  label: '자펀드',   control: 'text', long: true },
    { key: 'divType',  label: '구분',     control: 'select', options: ['원금배분', '수익배분', '성과보수', '원천징수', '기타'] },
    { key: 'baseDate', label: '기준일자', control: 'date', required: true },
    { key: 'moeDiv',   label: '모태펀드 배분액', control: 'number' },
  ],
  filters: ['운용사', '자펀드', '계정구분', '출자/배분', '기준일자'],
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_14__운용사_출자배분관리.html',
  },
};
