/* 투자및회수상세정보 — 투자기업정보 > 투자및회수상세정보.
   S1_36 참조. 상세 필터 선택 후 투자·회수 내역을 드릴다운하는 화면.
   원본 HTML에서 테이블 헤더 미노출(filter-only 진입 후 상세). 주요 내역 컬럼 구성. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '투자및회수상세정보',
  title: '투자및회수상세정보',
  kind: 'list',
  entity: '투자회수내역',
  columns: [
    { key: 'gp',              label: '운용사',      type: 'gp',     align: 'left' },
    { key: 'subFund',         label: '자펀드',      type: 'text',   align: 'left' },
    { key: 'accountType',     label: '계정구분',    type: 'text',   align: 'center' },
    { key: 'investee',        label: '투자기업',    type: 'text',   align: 'left' },
    { key: 'investDate',      label: '투자일자',    type: 'date',   align: 'center' },
    { key: 'investAmt',       label: '투자금액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'investMethod',    label: '투자방식',    type: 'text',   align: 'center' },
    { key: 'recoverDate',     label: '회수일자',    type: 'date',   align: 'center' },
    { key: 'recoverAmt',      label: '회수금액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'recoverPrincipal', label: '회수원금',   type: 'amount', unit: '원', align: 'right' },
    { key: 'balance',         label: '투자잔액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'recoverStatus',   label: '회수상태',    type: 'status', align: 'center' },
  ],
  fields: [],
  filters: ['운용사', '자펀드', '계정구분', '조회기준', '기준일자'],
  statusDomain: [
    { label: '회수완료', tone: 'success' },
    { label: '부분회수', tone: 'warning' },
    { label: '미회수',   tone: 'danger' },
  ],
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_36_투자_및_회수_상세정보.html',
  },
};
