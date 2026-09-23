/* 체크리스트 관리 — 투자자산관리 > 사후보고관리 > 체크리스트 관리.

   ⚠⚠ 이 화면은 **현행시스템 복원이 아니다. 신규 화면 골격이다.** ⚠⚠
   docs/메뉴구성도_v0.2.md 매칭 열이 "신규(현행 없음)"이고 docs/mockups 에 대응 목업이 없다(2026-09-24 확인).
   그래서 `provenance.sourceSystem = 'NEW'` · `captureFile = ''` 로 원천 없음을 기록한다(우수투자기업 관리 선례).

   행 데이터는 넣지 않는다 — `sample: []`(빈 배열)이 "행 0건"을 명시한다(합성 더미 방지, 우수투자기업 관리 주석 참조).
   KPI 배지 행 없음(HITL 기본값 '미포함' → hideKpis), 카드뷰 없음.

   ── 명시적 가정(확정 아님 · 발주처 확인 필요) ──
   A1 "체크리스트"는 형제 화면 '투심보고 확정 및 승인'(S1_01 투자심의관리) 상세의 **체크리스트 관리 · 첨부파일**
      섹션이 요구하는 제출 항목의 마스터다 — 이 화면에서 항목을 정의하고, S1_01 에서 건별로 첨부·확인한다.
   A2 구분 선택지 = S1_01 원문 체크리스트 첨부 목록의 구분값 3종(`gb:'투심일정'|'투심결과'|'투자계약서'`)
      그대로다(창작 아님). 다른 사후보고(수시·정기·총회)로 넓히면 구분을 추가한다.
   A3 1행 = 체크리스트 항목 1건. 필수여부·정렬순서·사용여부는 항목 마스터의 **구조 제안**이다.
   A4 등록/수정/삭제 CRUD 가 있다(항목 폐기는 삭제 대신 사용여부 '부'). */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '체크리스트 관리',   // ⚠️ data.ts 메뉴 리프 라벨과 정확히 일치(라우팅 키, NFC)
  title: '체크리스트 관리',
  kind: 'list',
  entity: '체크리스트 항목',
  columns: [
    { key: 'no',       label: 'No',             type: 'number', align: 'center' },
    { key: 'category', label: '구분',           type: 'text',   align: 'center' },
    { key: 'item',     label: '체크리스트 항목', type: 'text',   align: 'left' },
    { key: 'desc',     label: '설명',           type: 'text',   align: 'left' },
    { key: 'required', label: '필수여부',       type: 'text',   align: 'center' },
    { key: 'order',    label: '정렬순서',       type: 'number', align: 'right' },
    { key: 'use',      label: '사용여부',       type: 'text',   align: 'center' },
    { key: 'regDate',  label: '등록일자',       type: 'date',   align: 'center' },
  ],
  fields: [
    { key: 'category', label: '구분',           control: 'select',   required: true, options: ['투심일정', '투심결과', '투자계약서'] },
    { key: 'item',     label: '체크리스트 항목', control: 'text',     required: true, long: true },
    { key: 'desc',     label: '설명',           control: 'textarea', long: true },
    { key: 'required', label: '필수여부',       control: 'switch',   options: ['여', '부'] },
    { key: 'order',    label: '정렬순서',       control: 'number' },
    { key: 'use',      label: '사용여부',       control: 'switch',   options: ['여', '부'] },
  ],
  filters: ['구분', '필수여부', '사용여부'],
  hideKpis: true,   // KPI: 미포함(apfs-capture-schema HITL 기본값 — 비대화 세션 2026-09-24)
  hideCardView: true,
  // 원천 없음 = 행 0건. 빈 배열이 SSOT 다.
  sample: [],
  provenance: {
    capturedAt: '',
    sourceSystem: 'NEW',   // 원천 없음 — 신규 화면(위 주석 참조). 가짜 출처를 적지 않는다.
    captureFile: '',
  },
};
