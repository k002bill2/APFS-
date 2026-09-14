/* 자펀드수탁관리(실물검증) — 자펀드 관리 > 자펀드수탁관리(실물검증).
   S1_26 참조. 수탁기관 실물자산 데이터와 운용사 보유 데이터 일치 여부 검증 화면. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '자펀드수탁관리(실물검증)',
  title: '자펀드수탁관리(실물검증)',
  kind: 'list',
  entity: '수탁관리',
  columns: [
    { key: 'no',          label: 'No',       type: 'number', align: 'center' },
    { key: 'subFund',     label: '자펀드',   type: 'text',   align: 'left' },
    { key: 'gp',          label: '운용사',   type: 'gp',     align: 'left' },
    { key: 'custodian',   label: '수탁기관', type: 'text',   align: 'left' },
    { key: 'matchStatus', label: '일치여부', type: 'status', align: 'center' },
    { key: 'memo',        label: '메모',     type: 'text',   align: 'left' },
    { key: 'investee',    label: '투자기업', type: 'text',   align: 'left' },
    { key: 'shareCount',  label: '보유주수', type: 'number', align: 'right' },
    { key: 'principal',   label: '원금(A)',  type: 'amount', unit: '원', align: 'right' },
    { key: 'writedown',   label: '감액금액(B)', type: 'amount', unit: '원', align: 'right' },
    { key: 'balance',     label: '잔액(A-B)', type: 'amount', unit: '원', align: 'right' },
    { key: 'verifyDate',  label: '날짜',     type: 'date',   align: 'center' },
  ],
  fields: [
    { key: 'subFund',     label: '자펀드',   control: 'text' },
    { key: 'custodian',   label: '수탁기관', control: 'text' },
    { key: 'memo',        label: '메모',     control: 'textarea' },
  ],
  filters: ['자펀드', '기준일'],
  statusDomain: [
    { label: '일치',  tone: 'success' },
    { label: '불일치', tone: 'danger' },
    { label: '미검증', tone: 'warning' },
  ],
  hideCardView: true,
  provenance: {
    capturedAt: '2026-09-12',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합/01_투자자산관리/S1_26_자펀드수탁관리_실물검증_.html',
  },
};
