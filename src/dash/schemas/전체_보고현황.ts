/* 전체 보고현황 — 투자자산관리 > 운용사 모니터링 > 자펀드 전체 보고현황.
   S1_44 참조. 원문은 한 화면에 투자심의/수시보고/조합원총회 3개 표를 쌓는 복합 화면이다.

   ⚠ 이 스키마는 더 이상 화면을 그리지 않는다(2026-09-15) — `columns`가 한 벌뿐이라 3표를 담지 못해
   전용 페이지 `all_report_status.tsx`가 SegTabs로 전환하며 렌더한다(app.tsx가 GenericListPage 앞에서 분기).
   그래도 이 파일은 **삭제하지 않는다**: 라우트 레지스트리(resolveSchema)·출처(provenance) 기록의 정본이고,
   아래 컬럼 13개는 `all_report_status_model.ts`가 투자심의 탭의 컬럼으로 그대로 가져다 쓴다(복사본 금지). */
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
