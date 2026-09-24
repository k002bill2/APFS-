/* 내부 투자심의 구성관리 — 투자자산관리 > 사후보고관리 > 내부 투자심의 구성관리.

   ⚠⚠ 이 화면은 **현행시스템 복원이 아니다. 신규 화면 골격이다.** ⚠⚠
   docs/메뉴구성도_v0.2.md 매칭 열이 "신규(현행 없음)"이고 docs/mockups 에 대응 목업이 없다(2026-09-24 확인).
   그래서 `provenance.sourceSystem = 'NEW'` · `captureFile = ''` 로 원천 없음을 기록한다(우수투자기업 관리 선례).

   행 데이터는 넣지 않는다 — `sample: []`(빈 배열)이 "행 0건"을 명시한다. 슬롯을 비워 두면
   generic_list.makeRows 가 합성 더미를 만들어 없는 위원 명단이 표로 뜬다(판정은 길이가 아니라 존재).
   KPI 배지 행 없음(apfs-capture-schema HITL 기본값 '미포함' → hideKpis), 카드뷰 없음.

   ── 명시적 가정(확정 아님 · 발주처 확인 필요) ──
   A1 "내부 투자심의 구성"은 운용사가 자펀드별로 두는 **투자심의위원회의 위원 구성**이다 — 형제 화면
      '투심보고 확정 및 승인'(S1_01 투자심의관리)의 투심 건이 어느 위원회 구성으로 심의됐는지를 관리한다.
   A2 1행 = 자펀드 × 위원 1명. 운용사·자펀드 라벨은 형제 사후보고 화면(S1_01·S1_04·S1_06) 컬럼명을 그대로 쓴다.
   A3 위원구분 선택지(내부/외부)는 **구조 제안**이다. 실제 구분 체계가 확인되면 공통코드(코드관리)로 분리한다.
   A4 위촉·해촉일자와 사용여부로 구성 이력을 남긴다(삭제 대신 해촉). 등록/수정/삭제 CRUD 가 있다. */
import type { PageSchema } from './types';
import { GP_OPTIONS, SUBFUND_OPTIONS } from './filter_domains';

export const schema: PageSchema = {
  route: '내부 투자심의 구성관리',   // ⚠️ data.ts 메뉴 리프 라벨과 정확히 일치(라우팅 키, NFC)
  title: '내부 투자심의 구성관리',
  kind: 'list',
  entity: '투자심의위원',
  columns: [
    { key: 'no',       label: 'No',       type: 'number', align: 'center' },
    { key: 'gp',       label: '운용사',   type: 'gp',     align: 'left' },
    { key: 'subFund',  label: '자펀드',   type: 'text',   align: 'left' },
    { key: 'member',   label: '위원명',   type: 'text',   align: 'left' },
    { key: 'org',      label: '소속',     type: 'text',   align: 'left' },
    { key: 'position', label: '직위',     type: 'text',   align: 'center' },
    { key: 'kind',     label: '위원구분', type: 'text',   align: 'center' },
    { key: 'appointDate', label: '위촉일자', type: 'date', align: 'center' },
    { key: 'dismissDate', label: '해촉일자', type: 'date', align: 'center' },
    { key: 'use',      label: '사용여부', type: 'text',   align: 'center' },
  ],
  // 항목 10개 > 6 → RowFormModal 이 2단 wide 로 자동 렌더한다(schema-form-modal-2col).
  fields: [
    { key: 'gp',          label: '운용사',   control: 'text',  required: true, long: true },
    { key: 'subFund',     label: '자펀드',   control: 'text',  required: true, long: true },
    { key: 'member',      label: '위원명',   control: 'text',  required: true },
    { key: 'org',         label: '소속',     control: 'text' },
    { key: 'position',    label: '직위',     control: 'text' },
    { key: 'kind',        label: '위원구분', control: 'radio', required: true, options: ['내부', '외부'] },
    { key: 'appointDate', label: '위촉일자', control: 'date' },
    { key: 'dismissDate', label: '해촉일자', control: 'date' },
    { key: 'use',         label: '사용여부', control: 'switch', options: ['여', '부'] },
    { key: 'remark',      label: '비고',     control: 'textarea', long: true },
  ],
  filters: ['운용사', '자펀드', '위원구분', '사용여부'],
  /* 상세필터 명세 — 원천 목업 없음(NEW) — 현행 목업 검색박스 실값 도메인(filter_domains.ts) (2026-09-24 전수조사) */
  filterSpecs: {
    운용사: { kind: 'select', options: [...GP_OPTIONS], key: 'gp' },
    자펀드: { kind: 'select', options: [...SUBFUND_OPTIONS], key: 'subFund' },
  },
  hideKpis: true,   // KPI: 미포함(apfs-capture-schema HITL 기본값 — 비대화 세션 2026-09-24)
  hideCardView: true,
  // 원천 없음 = 행 0건. 위 주석 참조 — 빈 배열이 SSOT 다.
  sample: [],
  provenance: {
    capturedAt: '',
    sourceSystem: 'NEW',   // 원천 없음 — 신규 화면(위 주석 참조). 가짜 출처를 적지 않는다.
    captureFile: '',
  },
};
