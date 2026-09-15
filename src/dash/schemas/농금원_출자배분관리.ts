/* (농금원)출자배분관리 — 자펀드 관리 > (농금원)출자배분관리.
   S1_21 참조. 25개 이상의 컬럼이 있는 복잡한 화면으로, 주요 컬럼만 스키마 등록. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '(농금원)출자배분관리',
  title: '(농금원)출자배분관리',
  kind: 'list',
  entity: '출자배분',
  columns: [
    { key: 'no',            label: 'NO',          type: 'number', align: 'center' },
    { key: 'gp',            label: '운용사',      type: 'gp',     align: 'left' },
    { key: 'subFund',       label: '자펀드',      type: 'text',   align: 'left' },
    { key: 'accountType',   label: '계정구분',    type: 'text',   align: 'center' },
    { key: 'registeredAt',  label: '등록일',      type: 'date',   align: 'center' },
    { key: 'fundAmount',    label: '결성액',      type: 'amount', unit: '원', align: 'right' },
    { key: 'member',        label: '조합원',      type: 'text',   align: 'left' },
    { key: 'memberType',    label: '조합원구분',  type: 'text',   align: 'center' },
    { key: 'memberCommit',  label: '조합원 약정금액',  type: 'amount', unit: '원', align: 'right' },
    { key: 'totalCommit',   label: '조합원 약정총액',  type: 'amount', unit: '원', align: 'right' },
    { key: 'txType',        label: '거래구분',    type: 'text',   align: 'center' },
    { key: 'txDetail',      label: '상세구분',    type: 'text',   align: 'center' },
    { key: 'txDate',        label: '거래일자',    type: 'date',   align: 'center' },
    { key: 'paidAmt',       label: '납입금액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'totalPaid',     label: '조합 납입총액', type: 'amount', unit: '원', align: 'right' },
    { key: 'principalDiv',  label: '원금배분액',  type: 'amount', unit: '원', align: 'right' },
    { key: 'profitDiv',     label: '수익배분액(세전)', type: 'amount', unit: '원', align: 'right' },
    { key: 'perfFee',       label: '성과보수액',  type: 'amount', unit: '원', align: 'right' },
    { key: 'totalDiv',      label: '조합 배분총액', type: 'amount', unit: '원', align: 'right' },
    { key: 'netAmt',        label: '실 입금액',   type: 'amount', unit: '원', align: 'right' },
    { key: 'balance',       label: '보유잔액',    type: 'amount', unit: '원', align: 'right' },
  ],
  fields: [
    { key: 'gp',          label: '운용사',   control: 'text', long: true },
    { key: 'subFund',     label: '자펀드',   control: 'text', long: true },
    { key: 'txType',      label: '거래구분', control: 'select', options: ['납입', '배분', '기타'] },
    { key: 'txDate',      label: '거래일자', control: 'date', required: true },
    { key: 'paidAmt',     label: '납입금액', control: 'number' },
    { key: 'principalDiv', label: '원금배분액', control: 'number' },
  ],
  filters: ['계정구분', '조회기준', '기준일자'],
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_21__농금원_출자배분관리.html',
  },
};
