/* 투자금 실사보고 (메뉴 라벨: 투자금 실사보고 조회) — 투자자산관리 > 운용사 모니터링.
   출처: docs/mockups/01_투자자산관리/S1_40_투자금실사보고.html (2026-09-15 파싱 실측)

   원문은 **조회 + 확정 처리** 화면이다(등록 폼 없음, 툴바는 엑셀 1개). 그래서 `fields: []` 다 —
   fields를 채우면 `editable`이 켜져 원문에 없는 `등록` 버튼이 툴바에 생긴다(types.ts 주석 참조).
   원문의 `확정` 처리와 실사일자 클릭 → 체크리스트 조회 팝업은 아직 이 화면에 없다(미구현, 창작 아님).

   ⚠ 값 없음은 빈칸이 아니라 **`-`** 다. 원문 `dash(v){return (v==null||v==='')?'-':v}` 가
     모든 셀을 그렇게 정규화한다 — 빈칸으로 두면 "데이터가 없다"와 "화면이 안 그려졌다"를
     구분할 수 없다(2026-09-16 Codex 5R P2).

   ⚠ `잔여일수`는 숫자가 아니라 상태 문구다 — 원문 값이 `보고완료` / `171일 전` / `45일 전` /
     `보고 대상 제외` / `130일 초과` 다. type:'number'로 두면 셀이 우측정렬 숫자 포맷을 시도한다. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '투자금 실사보고',
  title: '투자금 실사보고',
  kind: 'list',
  entity: '실사보고',
  columns: [
    { key: 'no',              label: 'No',          type: 'number', align: 'center' },
    { key: 'gp',              label: '운용사',      type: 'gp',     align: 'left', pinned: 'left' },
    { key: 'subFund',         label: '자펀드',      type: 'text',   align: 'left', pinned: 'left' },
    { key: 'investee',        label: '투자기업',    type: 'text',   align: 'left', pinned: 'left' },
    { key: 'investType',      label: '투자유형',    type: 'text',   align: 'center' },
    { key: 'firstInvestDate', label: '최초 투자일자', type: 'date', align: 'center' },
    { key: 'remainDays',      label: '잔여일수',    type: 'text',   align: 'center' },
    { key: 'investDate',      label: '투자일자',    type: 'date',   align: 'center' },
    { key: 'dueDiligDate',    label: '실사일자',    type: 'date',   align: 'center' },
    { key: 'reportDate',      label: '보고일자',    type: 'date',   align: 'center' },
    { key: 'reportFile',      label: '보고서',      type: 'text',   align: 'left' },
    { key: 'updatedAt',       label: '수정일시',    type: 'date',   align: 'center' },
    { key: 'isConfirmed',     label: '확정여부',    type: 'status', align: 'center' },
    { key: 'note',            label: '비고',        type: 'text',   align: 'left' },
  ],
  fields: [],
  /* 원문 검색조건 6종(모펀드·계정구분·담당자·자펀드·보고여부·투자기간) 중 **행 데이터에 대응
     필드가 있는 것만** 노출한다. `담당자`·`보고여부`·`투자기간`·`모펀드`는 원문 행에 그 값이
     없어 라벨이 tag 로 떨어지고, rowMatchesFilters 가 row.category 와 대조해 표가 조용히
     0건이 된다(filter_field.ts resolveFilterField 3단계 — 2026-09-16 Codex 지적).
     없는 값을 지어내 채우지 않고, 도메인이 확인되면 그때 되살린다. */
  filters: ['운용사', '자펀드', '투자기업', '투자유형', '확정여부'],
  statusDomain: [
    { label: '확정',   tone: 'success' },
    { label: '미확정', tone: 'warning' },
  ],
  searchable: true,
  hideCardView: true,
  // 조회 전용 — 선택으로 실행할 액션이 없어 체크박스 컬럼을 두지 않는다(apfs-grid hideRowSelection).
  hideRowSelection: true,
  hideKpis: true,
  hideMetrics: true,
  sample: [
    { no: 1, gp: '원익투자파트너스(주)', subFund: '2022 원익 스마트 혁신 Agtech투자조합', investee: '(주)어비스컴퍼니', investType: 'CB', firstInvestDate: '2025-11-04', remainDays: '보고완료', investDate: '2025-11-04', dueDiligDate: '2026-06-22', reportDate: '2026-06-23', reportFile: '어비스컴퍼니_투자금실사보고서.pdf', updatedAt: '-', isConfirmed: '-', note: '-' },
    { no: 2, gp: '원익투자파트너스(주)', subFund: '2022 원익 스마트 혁신 Agtech투자조합', investee: '(주)애즈위메이크', investType: '우선주(신주)', firstInvestDate: '2025-05-29', remainDays: '보고완료', investDate: '2025-05-29', dueDiligDate: '2026-05-29', reportDate: '2026-06-22', reportFile: '애즈위메이크_투자금실사보고서.pdf', updatedAt: '-', isConfirmed: '-', note: '-' },
    { no: 3, gp: '원익투자파트너스(주)', subFund: '2022 원익 스마트 혁신 Agtech투자조합', investee: '농업회사법인 삼진푸드(주)', investType: '우선주(신주)', firstInvestDate: '2026-01-30', remainDays: '171일 전', investDate: '-', dueDiligDate: '-', reportDate: '-', reportFile: '-', updatedAt: '-', isConfirmed: '-', note: '-' },
    { no: 4, gp: '원익투자파트너스(주)', subFund: '2022 원익 스마트 혁신 Agtech투자조합', investee: '(주)라피고', investType: '우선주(신주)', firstInvestDate: '2025-09-26', remainDays: '45일 전', investDate: '-', dueDiligDate: '-', reportDate: '-', reportFile: '-', updatedAt: '-', isConfirmed: '-', note: '-' },
    { no: 5, gp: '원익투자파트너스(주)', subFund: '2022 원익 스마트 혁신 Agtech투자조합', investee: '(주)당근마켓', investType: '보통주(구주)', firstInvestDate: '2025-07-25', remainDays: '보고 대상 제외', investDate: '-', dueDiligDate: 'X', reportDate: '-', reportFile: '-', updatedAt: '-', isConfirmed: '-', note: '-' },
    { no: 6, gp: '원익투자파트너스(주)', subFund: '2022 원익 스마트 혁신 Agtech투자조합', investee: '(주)로보스', investType: '우선주(신주)', firstInvestDate: '2025-05-23', remainDays: '보고완료', investDate: '2025-05-23', dueDiligDate: '2026-05-12', reportDate: '2026-05-27', reportFile: '로보스_투자금실사보고서.pdf', updatedAt: '-', isConfirmed: '-', note: '-' },
    { no: 7, gp: '원익투자파트너스(주)', subFund: '2022 원익 스마트 혁신 Agtech투자조합', investee: '인테이크(주)', investType: '우선주(신주)', firstInvestDate: '2025-04-04', remainDays: '130일 초과', investDate: '-', dueDiligDate: '-', reportDate: '-', reportFile: '-', updatedAt: '-', isConfirmed: '-', note: '-' },
  ],
  provenance: {
    capturedAt: '2026-09-15',
    sourceSystem: 'FFMS',
    captureFile: 'docs/mockups/01_투자자산관리/S1_40_투자금실사보고.html',
  },
};
