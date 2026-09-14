/* 투자금 회수현황 — S1_35 참조. 출자사업연도별 회수실적 집계 화면.
   메뉴 라벨 미확정이나 레퍼런스 반영을 위해 스키마로 등록. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '투자금 회수현황',
  title: '투자금 회수현황',
  kind: 'list',
  entity: '회수현황',
  columns: [
    { key: 'bizYear',      label: '구분(출자사업연도)', type: 'text',   align: 'center' },
    { key: 'recoverCount', label: '회수건수',       type: 'number', align: 'right' },
    { key: 'investPrincipal', label: '투자원금',    type: 'amount', unit: '원', align: 'right' },
    { key: 'recoverAmt',   label: '회수금액',       type: 'amount', unit: '원', align: 'right' },
    { key: 'recoverRate',  label: '회수비율(%)',    type: 'rate',   align: 'right' },
    { key: 'investCount',  label: '투자건수',       type: 'number', align: 'right' },
    { key: 'investeeCount', label: '투자기업수',   type: 'number', align: 'right' },
    { key: 'recoverPrincipal', label: '회수원금',  type: 'amount', unit: '원', align: 'right' },
    { key: 'recoverProfit', label: '회수수익',     type: 'amount', unit: '원', align: 'right' },
    { key: 'recoverTotal', label: '회수총액',      type: 'amount', unit: '원', align: 'right' },
    { key: 'writedown',    label: '감액금액',      type: 'amount', unit: '원', align: 'right' },
  ],
  fields: [],
  filters: ['계정구분', '데이터기준', '기준일자'],
  hideCardView: true,
  hideKpis: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_35_투자금_회수현황.html',
  },
};
