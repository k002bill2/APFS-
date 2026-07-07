/* 투자 성과·포트폴리오 — 통계조회 > 투자 성과·포트폴리오.
   기존 바스포크 페이지(performance.tsx)를 스키마 주도 GenericListPage로 통일한 결과.
   route는 한글 리프 라벨로 등록 — MENU(LNB)에는 없는 고아 페이지라 findMenuContext가
   route 문자열 자체를 제목으로 fallback한다(영문 'performance'면 제목이 깨짐).
   메인 대시보드 QUICKWIDGETS/QUICKMENU 숏컷의 to도 이 라벨로 맞춰 진입시킨다. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '투자 성과·포트폴리오',
  title: '투자 성과·포트폴리오',
  kind: 'list',
  entity: '투자자산',
  // ── 목록 컬럼 ──
  // 특수 키(name=2줄·amount·change·status·trend=스파크라인)는 GenericListPage가 전용 렌더한다.
  // 필터 대상(assetClass·region·status)은 컬럼+필드가 키를 공유해야 makeRows가 enum을 시드한다.
  columns: [
    { key: 'name',       label: '자산명',        type: 'text',   align: 'left' },
    { key: 'assetClass', label: '자산분류',      type: 'text',   align: 'center' },
    { key: 'amount',     label: '평가금액',      type: 'amount', unit: '백만원', align: 'right' },
    { key: 'change',     label: '수익률',        type: 'rate',   align: 'right' },
    { key: 'status',     label: '리스크등급',    type: 'status', align: 'center' },
    { key: 'region',     label: '지역',          type: 'text',   align: 'center' },
    { key: 'trend',      label: '성과추이',      type: 'number', align: 'center' },
  ],
  // ── 등록/수정 모달 양식 ──
  fields: [
    { key: 'name',       label: '자산명',        control: 'text', required: true },
    { key: 'category',   label: '구분',          control: 'text' },
    { key: 'assetClass', label: '자산분류',      control: 'select', options: ['주식', '채권', '실물자산', '사모펀드', '혼합자산'] },
    { key: 'amount',     label: '평가금액 (백만원)', control: 'number' },
    { key: 'change',     label: '수익률 (%)',    control: 'number' },
    { key: 'currency',   label: '통화',          control: 'select', options: ['KRW', 'USD', 'EUR', 'JPY'] },
    { key: 'region',     label: '지역',          control: 'select', options: ['국내', '북미', '유럽', '아시아', '신흥국'] },
    { key: 'status',     label: '리스크등급',    control: 'select', options: ['안정', '보통', '주의', '위험'] },
    { key: 'manager',    label: '담당자',        control: 'text' },
    { key: 'remark',     label: '비고',          control: 'textarea' },
  ],
  filters: ['자산분류', '지역', '리스크등급'],
  statusDomain: [
    { label: '안정', tone: 'success' },
    { label: '보통', tone: 'info' },
    { label: '주의', tone: 'warning' },
    { label: '위험', tone: 'danger' },
  ],
  provenance: {
    capturedAt: '2026-07-07',
    sourceSystem: 'APFS',
    captureFile: 'performance.tsx (바스포크 → 스키마 전환)',
  },
};
