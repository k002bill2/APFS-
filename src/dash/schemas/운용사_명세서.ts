/* 운용사 명세서 — 투자자산관리 > 운용사 모니터링 > 운용사 명세서.

   ── 출처 재정의(브리프의 "원본 매칭 검토 필요" 해소) ──
   브리프는 `S1_37_운용사별_재무제표.html` 을 지목했으나, 실측상 S1_37은 **운용사×자펀드×투자기업
   3중 축의 재무 목록**이지 "명세서"(단일 개체 프로필)가 아니다.
   진짜 출처는 `S1_02_운용사_명세.html` 이다 — 화면 제목이 그대로 `운용사 명세`이고, 구성이
   ① 금액 단위 토글 ② 자펀드 현황 표 ③ 운용사 개요 kv ④ 재무정보 표로 일치한다.
   결정적 근거: 그 구현체(`gp_spec_modal.tsx`)가 이미 저장소에 있고 헤더 주석이 S1_02를 출처로 적고 있다.
   → S1_37 유래 orphan 스키마(`운용사별 재무제표`)는 **삭제하지 않고 보존**한다(발주처 확인 시 되돌릴 수 있게).

   ── 화면 ──
   S1_02는 팝업 한 장이라 "목록"이 원문에 없다. 그래서 이 스키마의 목록 컬럼은 전부
   **S1_02 원문 필드에서만** 가져왔다 — ③ 개요의 단일 값들 + ② 자펀드 현황 표의 집계(자펀드 수·결성액
   합계·모펀드약정액 합계). 새 필드를 창작하지 않았다.
   행 진입(운용사명 셀 클릭 / 셀 Enter / 행 더블클릭 / 우클릭 상세조회) → `GpSpecModal`.

   ⚠ 한계 승계: GpSpecModal은 S1_02 실데이터가 인라이트벤처스(주) 1건뿐이라 어느 행을 눌러도 같은
     회사를 보여준다(그 파일 주석에 이미 명시). 이 목록이 그 한계를 없애지는 않는다. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '운용사 명세서',   // ⚠️ data.ts 메뉴 리프 라벨과 정확히 일치(라우팅 키, NFC)
  title: '운용사 명세서',
  kind: 'list',
  entity: '운용사명세',
  columns: [
    { key: 'no',            label: 'No',            type: 'number', align: 'center' },
    // 명세 팝업 진입점 — 값이 링크가 되고, 셀 Enter로도 열린다(키보드 경로 보장).
    { key: 'gp',            label: '운용사명',      type: 'gp',     align: 'left', detail: 'gpSpec' },
    { key: 'gpType',        label: '운용사종류',    type: 'text',   align: 'center' },
    { key: 'bizNo',         label: '사업자번호',    type: 'pii',    align: 'center' },
    { key: 'ceo1',          label: '대표자1',       type: 'text',   align: 'center' },
    { key: 'establishDate', label: '설립일자',      type: 'date',   align: 'center' },
    { key: 'region',        label: '지역구분',      type: 'text',   align: 'center' },
    { key: 'employees',     label: '종업원수',      type: 'number', align: 'right' },
    // ② 자펀드 현황 표의 집계 — 원문 표의 행 수/합계다(파생이지 창작이 아니다).
    { key: 'fundCount',     label: '운용 자펀드 수', type: 'number', align: 'right' },
    { key: 'fundAmtTotal',  label: '결성액 합계',    type: 'amount', unit: '원', align: 'right' },
    { key: 'moafAmtTotal',  label: '모펀드약정액 합계', type: 'amount', unit: '원', align: 'right' },
    { key: 'baseYm',        label: '기준년월',      type: 'text',   align: 'center' },
  ],
  // 조회 전용 — S1_02는 읽기전용 명세다. fields를 채우면 editable이 켜져 등록 버튼이 생긴다.
  fields: [],
  // 목업의 `G.P 검색` 모달은 별도 팝업을 만들지 않고 상세필터의 운용사명 입력으로 흡수한다(§4.1).
  filters: ['운용사명', '운용사종류', '지역구분', '기준년월'],
  searchable: true,
  // 팝업 진입이 셀 링크·Enter·더블클릭이라 행 선택 체크박스가 필요 없다(다건 액션이 없는 조회 화면).
  hideRowSelection: true,
  hideCardView: true,
  hideKpis: true,
  unitToggle: true,
  provenance: {
    capturedAt: '2026-09-15',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합 2/01_투자자산관리/S1_02_운용사_명세.html',
  },
};
