/* 조합별 반기보고 현황 — 자펀드 보고 > 반기보고조회 > 조합별 반기보고 현황.
   출처: docs/mockups/05_MOAF/S5_119_반기보고_조회.html (MOAF REPORT System, KRDS TO-BE, 2026-09-29 파싱 실측)

   ── 트랙 판단: 스키마 트랙(GenericListPage, 페이지 코드 0줄) ──
   원문은 **읽기전용 단일 헤더 19컬럼** 그리드 + 금액 단위 토글(원/백만원/억원) + 엑셀뿐이다.
   2단 헤더·합계행·행 선택 액션·편집 팝업·명세 팝업이 없고, 원문이 "원천 정의서에 검색영역 자체가 없어
   검색조건/조회 버튼을 추가하지 않고 그리드만 표시(사용자 지시, 2026-08-31)"라 적었다 → filters: [].
   단위 토글은 PageSchema.unitToggle(공유 unit.ts)로, 엑셀은 GenericListPage 푸터 내보내기로 충족된다.

   ── 원문 이식 규칙 ──
   · 행 = 원문 DATA 2행 그대로(합성 더미 금지). 원문 fmtYM/fmtD 를 거친 **표시값**으로 옮긴다
     ('202512' → '2025-12', '20221220' → '2022-12-20').
   · 값 없음(null)은 원문 DASH 처럼 **'-'** 로 둔다(투자금_실사보고 관례). 금액 '-' 는 비숫자라 단위 환산을 타지 않는다.
   · 금액(약정총액·납입총액)은 **원 단위 정수**로 저장한다(unit.ts 저장 단위 계약).
   · 원문의 검토필요 마커(`.review` — 납입방법 'A1' 코드 미해독, 103번 행 납입총액 이후 캡처 범위 밖)는
     이식하지 않는다(2026-09-24 ReviewMarker 전면 삭제). 값은 원문 그대로('A1', '-')다.
   · 주요/의무/우선투자분야는 긴 법조문 텍스트라 multiline(원문 td.txt white-space:normal).
   · 읽기전용 조회 화면 — 선택이 액션을 만들지 않으므로 행 선택 컬럼 없음(hideRowSelection).
     KPI 배지 행은 기본 미포함(apfs-manage-page HITL 기본값), 카드뷰 없음. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '조합별 반기보고 현황',
  title: '조합별 반기보고 현황',
  kind: 'list',
  entity: '반기보고',
  columns: [
    { key: 'no',          label: 'No',              type: 'number', align: 'center' },
    { key: 'reportYm',    label: '보고기준년월',     type: 'text',   align: 'center' },
    { key: 'gpCode',      label: '운용사코드',       type: 'code',   align: 'center' },
    { key: 'fundCode',    label: '운용사펀드코드',   type: 'code',   align: 'center' },
    { key: 'fundName',    label: '조합명',           type: 'text',   align: 'left', pinned: 'left' },
    { key: 'existStart',  label: '존속시작일자',     type: 'date',   align: 'center' },
    { key: 'existEnd',    label: '존속종료일자',     type: 'date',   align: 'center' },
    { key: 'existYears',  label: '존속기간(년)',     type: 'number', align: 'center' },
    { key: 'investEnd',   label: '투자종료일자',     type: 'date',   align: 'center' },
    { key: 'investYears', label: '투자기간(년)',     type: 'number', align: 'center' },
    { key: 'payMethod',   label: '납입방법',         type: 'code',   align: 'center' },
    { key: 'payCount',    label: '납입회수',         type: 'number', align: 'center' },
    { key: 'commitTotal', label: '약정총액',         type: 'amount', unit: '원', align: 'right' },
    { key: 'paidTotal',   label: '납입총액',         type: 'amount', unit: '원', align: 'right' },
    { key: 'mainField',   label: '주요투자분야',     type: 'text',   align: 'left', multiline: true },
    { key: 'dutyField',   label: '의무투자분야',     type: 'text',   align: 'left', multiline: true },
    { key: 'dutyRatio',   label: '의무투자비율(%)',  type: 'number', align: 'center' },
    { key: 'prefField',   label: '우선투자분야',     type: 'text',   align: 'left', multiline: true },
    { key: 'prefRatio',   label: '우선투자비율(%)',  type: 'number', align: 'center' },
  ],
  fields: [],
  filters: [],
  hideKpis: true,
  hideCardView: true,
  hideRowSelection: true,
  unitToggle: true,
  // 원문 DATA 2행(fmtYM·fmtD 적용 표시값, null → '-')
  sample: [
    {
      no: 1, reportYm: '2025-12', gpCode: 'APFSLIB', fundCode: '102', fundName: '농식품새싹키움매칭펀드',
      existStart: '2022-12-20', existEnd: '2030-12-25', existYears: 8, investEnd: '2026-12-19', investYears: 4,
      payMethod: 'A1', payCount: 0, commitTotal: 1000000000, paidTotal: 1000000000,
      mainField: '농림수산식품투자조합의 결성 및 운용에 관한 법률 제3조',
      dutyField: '중소기업창업지원법 제2조에 따른 창업기업(사업 개시 7년 이내)', dutyRatio: '-',
      prefField: '농림수산식품투자조합의 결성 및 운용에 관한 법률 제3조', prefRatio: '-',
    },
    {
      no: 2, reportYm: '2025-12', gpCode: 'APFSLIB', fundCode: '103', fundName: '농식품혁신스타트업투자조합',
      existStart: '2023-07-31', existEnd: '2031-07-30', existYears: 8, investEnd: '2027-07-30', investYears: 4,
      payMethod: 'A1', payCount: 0, commitTotal: 3000000000, paidTotal: '-',
      mainField: '-', dutyField: '-', dutyRatio: '-', prefField: '-', prefRatio: '-',
    },
  ],
  provenance: {
    capturedAt: '2026-09-29',
    sourceSystem: 'MOAF REPORT',
    captureFile: 'docs/mockups/05_MOAF/S5_119_반기보고_조회.html',
  },
};
