import type { PageSchema } from '../../schemas/types';

export const schema: PageSchema = {
  route: 'annual-invest-status',
  title: '연도별 투자현황',
  kind: 'list',
  entity: '모태펀드',
  columns: [
    { key: 'gubun',        label: '구분',           type: 'text',   align: 'left' },
    { key: 'selectYear',   label: '선정년도',        type: 'text' },
    { key: 'fundCount',    label: '조합수',          type: 'number', align: 'right' },
    { key: 'commitTotal',  label: '약정총액',        type: 'amount', unit: '원', align: 'right' },
    { key: 'moaeCommit',   label: '모태펀드약정액',   type: 'amount', unit: '원', align: 'right' },
    { key: 'paidTotal',    label: '납입총액(A)',      type: 'amount', unit: '원', align: 'right' },
    { key: 'moaePaid',     label: '모태펀드납입액',   type: 'amount', unit: '원', align: 'right' },
    { key: 'cashB1',       label: '현금성자산(B1)',   type: 'amount', unit: '원', align: 'right' },
    // 우측 컬럼 image1.png 에서 잘림 — 추가 컬럼 미확인
  ],
  fields: [],
  /* 상세필터 — sample 이 없어 행은 generic_list makeRows 합성 행이다(컬럼 키만 시드 — 숨은 속성을 실을 자리가 없다).
     · 기준일 → 선정년도(selectYear, 연도 축) **조회 시점(asOf)**: 고른 날짜 이후 선정년도 행은 아직 없던 행이라 뺀다
       — 2026-11-16 사용자 지시 "미연동 필터 전부 동작"(종전 미연동 캡션). 기본값이 없어(빈 값 = 전체) 기본 상태는 그대로다.
     · 계정구분·조회기준 = 판단 보류(미연동 캡션 유지): 계정구분은 숨은 키를 합성 행에 실을 경로가 없고(sample 신설 금지·공용
       makeRows 수정 금지), 조회기준은 수치 재계산 기준인데 GenericListPage 에 재계산 슬롯이 없다. */
  filters: ['기준일', '계정구분', '조회기준'],
  filterSpecs: {
    기준일: { kind: 'day', key: 'selectYear', mode: 'asOf' },
  },
  provenance: {
    capturedAt: '2026-05-28',
    sourceSystem: 'BRIEF',
    captureFile: 'image1.png',
  },
};
