/* 관리보수관리 (메뉴 라벨: 관리보수/성과보수 조회) — 투자자산관리 > 운용사 모니터링.
   출처: docs/mockups/01_투자자산관리/S1_43_관리보수관리.html (2026-09-15 파싱 실측)

   원문은 **조회 + 확정여부 관리** 화면이다(등록 폼 없음). 그래서 `fields: []` — fields 를 채우면
   `editable` 이 켜져 원문에 없는 `등록` 버튼이 생긴다.
   원문 데이터는 1건뿐이고 그 이유가 목업 주석에 적혀 있다: "상세팝업까지 실측 확인된 건은
   no:1(제이비인베스트먼트) 1건뿐이라, 다른 19건은 근거 없는 추정 데이터가 되므로" 제외.
   그 판단을 그대로 승계한다 — 표를 채우려고 행을 만들지 않는다.

   미구현(창작 아님) 2건:
   ① 지급일자 클릭 → `관리보수보고 상세조회` 팝업(산출내역: 기간 2025-01-01~2025-12-31 ·
      기준금액 8,509,289,613 · 일수 365).
   ② `확정여부` **셀 내 select**(미확정 ↔ 확정). 원문의 핵심 액션인데 GenericListPage 에
      인라인 셀 편집 기능이 없다. `fields` 를 채워 되살릴 수 있는 것이 **아니다** — fields 는
      등록/수정 모달을 켜므로 원문에 없는 `등록` 버튼이 생긴다(이전 버전이 그 상태였다).
      인라인 확정 컨트롤은 별도 기능이라 이번 범위 밖으로 남긴다(2026-09-16 Codex 4R P1). 팝업이 생기면 그때 원문 값을 싣는다.
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
    { key: 'payDate',    label: '지급일자', type: 'date',   align: 'center' },
    { key: 'payType',    label: '지급구분', type: 'text',   align: 'center' },
    { key: 'amount',     label: '금액(원)', type: 'amount', unit: '원', align: 'right' },
    { key: 'isConfirmed', label: '확정여부', type: 'status', align: 'center' },
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
