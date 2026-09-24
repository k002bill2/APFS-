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
   원문이 "확정 여부를 다루는 관리 화면이므로 금액 단위전환 토글은 규칙상 미적용"이라 unitToggle 도 두지 않는다.

   ── 검색조건 ── 원문 `.searchbox` 항목·옵션·기본값과 행 매칭(key) 판단 근거는 아래 `filters`/`filterSpecs` 위 주석에 있다(2026-09-24). */
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
  /* 검색조건(S1_43:204-217) — 원문 `.searchbox` 라벨 순서 그대로:
     운용사·자펀드·계정구분·담당자·보고구분·지급구분·지급기간(모펀드 제외 — CHECK_REPORT 모펀드 규칙).
     지급기간은 원문 그대로 **범위**(dayRange, 기본 2026-05-12~2026-08-12)이고 payDate 로 거른다 — 종전의
     단일 `지급일자` 대체는 원문과 다른 조건이라 되돌렸다(범위는 filterSpecs 가 표현하므로 tag 로 떨어지지 않는다).
     행 매칭(`key`) — 원문 옵션 값이 원문 행에 있는 항목만 거른다:
     · 운용사(원문 16개 옵션 — 행 값 제이비인베스트먼트(주) 포함) → gp · 보고구분(관리보수) → reportType ·
       지급구분(지급·삭감) → payType · 자펀드(원문 옵션 '전체'뿐 → text 격하) → subFund 부분일치.
     · 계정구분(chipGroup 전체·농식품·수산) · 담당자(원문 옵션 '전체'뿐 → text 격하) = 행에 값 없음 → no-op.
     원문 1행(2026-07-03)은 기본 지급기간 안이라 기본값이 행을 줄이지 않는다. */
  filters: ['운용사', '자펀드', '계정구분', '담당자', '보고구분', '지급구분', '지급기간'],
  filterSpecs: {
    운용사: { kind: 'select', key: 'gp', options: ['제이비인베스트먼트(주)', '씨제이인베스트먼트(주)', '어니스트벤처스(유)', '미시간벤처캐피탈주식회사', '롯데벤처스(주)', '씨케이디창업투자(주)', '가이아벤처파트너스(유)', '타임윅스인베스트먼트(주)', '엔브이씨파트너스 주식회사', '하랑기술투자 주식회사', '시너지아이비투자 주식회사', '(주)데일리파트너스', '(주)탭엔젤파트너스', '인라이트벤처스(주)', '(주)넥스트지인베스트먼트', '(주)노틸러스인베스트먼트'] },
    자펀드: { kind: 'select', key: 'subFund' },
    계정구분: { kind: 'select', options: ['농식품', '수산'] },
    담당자: { kind: 'select' },
    보고구분: { kind: 'select', options: ['관리보수'], key: 'reportType' },
    지급구분: { kind: 'select', options: ['지급', '삭감'], key: 'payType' },
    지급기간: { kind: 'dayRange', def: '2026-05-12~2026-08-12', key: 'payDate' },
  },
  statusDomain: [
    { label: '확정',   tone: 'success' },
    { label: '미확정', tone: 'warning' },
  ],
  hideCardView: true,
  /* 체크박스 선택을 둔다(2026-09-24 사용자 결정) — 선택 바에서 확정여부를 여러 건 한 번에 바꾼다
     (generic_list 가 확정/미확정 inlineSelect 컬럼을 보고 ConfirmCombo 를 붙인다) + 기본 선택 액션(삭제·선택 해제). */
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
