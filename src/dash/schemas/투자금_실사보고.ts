/* 투자금 실사보고 (메뉴 라벨: 투자금 실사보고 조회) — 투자자산관리 > 운용사 모니터링.
   출처: docs/mockups/01_투자자산관리/S1_40_투자금실사보고.html (2026-09-15 파싱 실측)

   원문은 **조회 전용** 화면이다(등록 폼 없음, 툴바는 엑셀 1개). 그래서 `fields: []` 다 —
   fields를 채우면 `editable`이 켜져 원문에 없는 `등록` 버튼이 툴바에 생긴다(types.ts 주석 참조).

   ✅ 실사일자 클릭 → `투자금실사보고서 체크리스트 조회` 팝업 구현(2026-09-16). `detail: 'dueDiligChecklist'`.

   ⚠ **`확정` 처리는 구현 대상이 아니다**(2026-09-16 정정). 이전 주석은 "원문의 `확정` 처리 … 아직
     이 화면에 없다(미구현)"이라 적어 **원문이 그 액션을 갖고 있는데 우리가 뺀 것**처럼 읽혔다.
     실제는 다르다:
     · 원문 설명문(doc-sub)은 "모니터링하고 확정 처리하는 조회 화면"이라 **업무 의도**를 적는다.
     · 그러나 목업은 그 액션을 **구현하지 않았다** — 확정 컨트롤도 핸들러도 없다. 같은 묶음의
       S1_43 은 확정 select(`data-cfm`)를 실제로 갖고 있어, 없다는 사실이 구조로 확인된다.
     · 원문 281행: "수정일시·확정여부·비고 3개 컬럼은 캡처 밖(가로 스크롤 영역)이라 실값 미확인 —
       전부 '-' 표시." 7행 전부 `cfm:null` 이다.
     → **무엇을 어떤 UI로 어떤 값으로** 그릴지가 원천에 없으므로 만들면 창작이다. 캡처가 보강되면
       그때 판단한다. 가드: investment_asset_routes.test.ts 의 S1_40 팝업 절.

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
    /* 원문 `dueCell` — 실사일자가 `yyyy-mm-dd` 형식인 행만 버튼이고 `''`(미실사)·`'X'`(보고 대상
       제외)는 평상 셀이다. 동등비교(detailWhen)로는 표현 못 해 detailPattern 으로 형식을 싣는다.
       원문 7행 중 3행(no 1·2·6)만 링크다. */
    { key: 'dueDiligDate',    label: '실사일자',    type: 'date',   align: 'center', detail: 'dueDiligChecklist', detailPattern: '^\\d{4}-\\d{2}-\\d{2}$' },
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
