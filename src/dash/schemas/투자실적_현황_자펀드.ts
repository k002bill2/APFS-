/* 투자실적 현황(자펀드) — 자펀드 관리 > 투자실적 현황(자펀드).
   S1_24 참조. 원본은 차트/집계 위주 화면으로 테이블 헤더 미노출.
   필터 기준(모펀드/계정구분/연도기준/투자실적구분/기준일자)에 따른 자펀드별 투자실적 요약 리스트로 구성. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '투자실적 현황(자펀드)',
  title: '투자실적 현황(자펀드)',
  kind: 'list',
  entity: '투자실적',
  columns: [
    { key: 'gp',            label: '운용사',      type: 'gp',     align: 'left' },
    { key: 'subFund',       label: '자펀드',      type: 'text',   align: 'left' },
    { key: 'accountType',   label: '계정구분',    type: 'text',   align: 'center' },
    { key: 'baseYear',      label: '기준연도',    type: 'text',   align: 'center' },
    { key: 'investCount',   label: '투자건수',    type: 'number', align: 'right' },
    { key: 'investAmt',     label: '투자금액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'recoverAmt',    label: '회수금액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'balance',       label: '투자잔액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'agriInvest',    label: '농식품 투자',  type: 'amount', unit: '원', align: 'right' },
    { key: 'mandatoryRate', label: '의무투자율',  type: 'rate',   align: 'right' },
  ],
  fields: [],
  filters: ['계정구분', '연도기준', '투자실적구분', '기준일자'],
  hideCardView: true,
  hideKpis: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_24_투자실적_현황_자펀드_.html',
  },
};
