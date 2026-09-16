/* 관리보수관리 (메뉴 라벨: 관리보수/성과보수 조회) — 투자자산관리 > 운용사 모니터링.
   출처: docs/mockups/01_투자자산관리/S1_43_관리보수관리.html (2026-09-15 파싱 실측)

   원문은 **조회 + 확정여부 관리** 화면이다(등록 폼 없음). 그래서 `fields: []` — fields 를 채우면
   `editable` 이 켜져 원문에 없는 `등록` 버튼이 생긴다.
   원문 데이터는 1건뿐이고 그 이유가 목업 주석에 적혀 있다: "상세팝업까지 실측 확인된 건은
   no:1(제이비인베스트먼트) 1건뿐이라, 다른 19건은 근거 없는 추정 데이터가 되므로" 제외.
   그 판단을 그대로 승계한다 — 표를 채우려고 행을 만들지 않는다.

   ✅ 지급일자 클릭 → `관리보수보고 상세조회` 팝업 구현(2026-09-16). `detail: 'mgmtFeeDetail'`.
      팝업 전용 값(기간 2025-01-01~2025-12-31 · 기준금액 8,509,289,613 · 일수 365)은 목록 컬럼이
      아니라서 `mgmt_fee_detail_model.ts` 가 갖는다 — sample 에 넣으면 레지스트리 불변식
      (sample 키 ⊆ columns ∪ fields)이 깨진다.

   ✅ `확정여부` 셀 내 select 구현(2026-09-16). `ColumnSpec.inlineSelect`.
      `fields` 로는 못 한다 — fields 는 `editable = fields.length > 0` 을 켜서 원문에 없는 `등록`
      버튼과 등록/수정 모달을 함께 만든다(이전 버전이 그 상태였다). 그래서 컬럼 수준 계약을 뒀다.
      원문 옵션 순서(확정 → 미확정)와 변경 시 데이터 갱신(`DATA[i].cfm = s.value`)을 그대로 옮겼다.
   원문이 "확정 여부를 다루는 관리 화면이므로 금액 단위전환 토글은 규칙상 미적용"이라 unitToggle 도 두지 않는다. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '관리보수관리',
  title: '관리보수관리',
  kind: 'list',
  entity: '관리보수',
  columns: [
    { key: 'no',         label: 'No',       type: 'number', align: 'center' },
    { key: 'gp',         label: '운용사',   type: 'gp',     align: 'left' },
    { key: 'subFund',    label: '자펀드',   type: 'text',   align: 'left' },
    { key: 'reportType', label: '보고구분', type: 'text',   align: 'center' },
    /* 원문 `.paylink` — 지급일자 클릭 시 `관리보수보고 상세조회` 팝업. detailWhen/detailPattern 이
       없으므로 모든 행이 링크다(원문도 전 행이 버튼). 산출내역 값은 mgmt_fee_detail_model.ts. */
    { key: 'payDate',    label: '지급일자', type: 'date',   align: 'center', detail: 'mgmtFeeDetail' },
    { key: 'payType',    label: '지급구분', type: 'text',   align: 'center' },
    /* ⚠ 라벨에 단위를 박지 않는다 — generic_list 가 `c.unit` 을 헤더에 덧붙이므로
       label:'금액(원)' + unit:'원' 이면 헤더가 `금액(원) (원)` 이 된다(2026-09-16 런타임 실측). */
    { key: 'amount',     label: '금액',     type: 'amount', unit: '원', align: 'right' },
    /* 원문 `<select class="cellsel" data-cfm>` — 이 화면의 핵심 액션이다(조회 화면인데 이 컬럼만 편집).
       원문은 StatusBadge 격인 `cfmTag()` 를 정의해 놓고 **쓰지 않는다** — 셀에 select 만 그린다.
       type:'status' 는 남겨 둔다: 필터 도메인(statusDomain)이 그 값을 쓰고, 렌더는 inlineSelect 가 이긴다. */
    { key: 'isConfirmed', label: '확정여부', type: 'status', align: 'center', inlineSelect: ['확정', '미확정'] },
  ],
  fields: [],
  /* `지급기간`은 행에 대응 필드가 없어 tag 로 떨어져 표를 0건으로 만든다(2026-09-16 Codex 지적).
     같은 뜻을 컬럼 라벨 `지급일자`(date 필터)로 대신한다 — 원문 검색조건의 기간 범위와 동치다. */
  filters: ['운용사', '자펀드', '보고구분', '지급일자'],
  statusDomain: [
    { label: '확정',   tone: 'success' },
    { label: '미확정', tone: 'warning' },
  ],
  hideCardView: true,
  // 조회 전용 — 선택으로 실행할 액션이 없어 체크박스 컬럼을 두지 않는다(apfs-grid hideRowSelection).
  hideRowSelection: true,
  hideKpis: true,
  hideMetrics: true,
  sample: [
    { no: 1, gp: '제이비인베스트먼트(주)', subFund: '메가농식품벤처투자조합3호', reportType: '관리보수', payDate: '2026-07-03', payType: '지급', amount: 191482240, isConfirmed: '미확정' },
  ],
  provenance: {
    capturedAt: '2026-09-15',
    sourceSystem: 'FFMS',
    captureFile: 'docs/mockups/01_투자자산관리/S1_43_관리보수관리.html',
  },
};
