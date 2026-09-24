/* 전체 투자실적 — 투자자산관리 > 투자기업정보 > 전체 투자실적.
   출처: docs/mockups/01_투자자산관리/S1_33_전체_투자실적.html (2026-09-15 파싱 실측)

   ── 왜 컬럼이 21 → 33으로 늘었나 ──
   이전 버전은 원문의 `회수실적` 2단 헤더(회수원금·회수수익·회수총액·감액금액 4컬럼)를 `회수실적`
   단일 컬럼으로 접고, 규모이하/창업투자 여부·창업일자·소재지·경영형태·연번을 통째로 뺐다.
   원문을 줄이면 화면이 "비슷해 보이는 다른 표"가 된다 — 원문 헤더 순서 그대로 전부 싣는다.

   ── 값 없음(null) 2컬럼 ──
   `농식품 투자비중`·`결성액대비 투자비율`은 원문에서 값이 null 이다.
   비율을 계산해 채우지 않는다: 원문 자신이 "원문 데이터 값 없음(null) — 임의 생성 안 함"이라고 적어 둔 자리다.

   ── 합계 행 ──
   원문 tfoot 의 `합계 1건` 행은 행이 아니라 집계라 `sample`(데이터 행)에 섞지 않는다(섞으면 건수가 2건).
   대신 `totals`(opt-in)로 pinned 합계 행을 그린다(S1_33:257-270): `합계 {n}건`(colspan 5 = No~등록일자) ·
   결성액·투자금액·회수 4칸·(전환금액)·투자잔액 = 합산(원문 data-base 리터럴 = 1행 값) ·
   투자업체~투자건 No(colspan 7)·비율 2칸·투자기간·여부 6칸~경영형태(colspan 9) = `-` ·
   연번 = 행 수 + 1(원문 캡션: "연번은 소계·합계 행을 포함해 전체 행을 순서대로 매긴 일련번호" → 1건이면 2).

   ── 검색조건(S1_33:187-196) ── 원문 `.searchbox` 라벨 순서 그대로: 계정구분·통계기준·데이터기준·기준일자
   (모펀드 제외 — CHECK_REPORT 모펀드 규칙). 옵션·기본값은 원문 그대로:
   계정구분 = chipGroup 전체·농식품·수산(기본 전체) · 통계기준 = <select> 자펀드기준 1개(기본 선택, '전체' 없음) ·
   데이터기준 = chipGroup 운용사보고·월말확정(기본 운용사보고, '전체' 없음) · 기준일자 = 2026-07-31.
   네 항목 모두 **원문 행에 대응 값이 없다**(계정구분·통계기준·데이터기준·기준일자 컬럼 없음 — `농식품 여부` Y/N 은
   계정구분과 다른 축이라 대신 쓰지 않는다) → 전부 no-op(`· 데이터 연동 후 적용`). 원문 조회 버튼도 토스트뿐(S1_33:398). */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '전체 투자실적',
  title: '전체 투자실적',
  kind: 'list',
  entity: '투자실적',
  columns: [
    { key: 'no',              label: 'No',          type: 'number', align: 'center' },
    { key: 'year',            label: '연도',        type: 'text',   align: 'center' },
    { key: 'sector',          label: '분야',        type: 'text',   align: 'center' },
    { key: 'fundName',        label: '펀드명',      type: 'text',   align: 'left', pinned: 'left' },
    { key: 'registeredAt',    label: '등록일자',    type: 'date',   align: 'center' },
    { key: 'fundAmount',      label: '결성액',      type: 'amount', unit: '원', align: 'right' },
    { key: 'investee',        label: '투자업체',    type: 'text',   align: 'left', pinned: 'left' },
    { key: 'bizSector',       label: '사업분야',    type: 'text',   align: 'left' },
    { key: 'bizContent',      label: '사업내용',    type: 'text',   align: 'left' },
    { key: 'investMethod',    label: '투자방식',    type: 'text',   align: 'center' },
    { key: 'reviewDate',      label: '투심일자',    type: 'date',   align: 'center' },
    { key: 'firstInvestDate', label: '최초 투자일자', type: 'date', align: 'center' },
    { key: 'investSeqNo',     label: '투자건 No',   type: 'text',   align: 'center' },
    { key: 'investAmt',       label: '투자금액',    type: 'amount', unit: '원', align: 'right' },
    // 원문 값 null.
    /* type 은 'text' 다 — 'rate' 로 두면 Cell 이 DeltaBadge 로 보내 `Number('')===0` 이 되어
       **값이 없는데 "0" 하락 배지**가 뜬다(원문은 `-`). 원문에 값 자체가 없으므로 비율 서식을 쓰지 않는다. */
    { key: 'agriInvestRatio', label: '농식품 투자비중', type: 'text', align: 'right' },
    { key: 'fundInvestRatio', label: '결성액대비 투자비율', type: 'text', align: 'right' },
    { key: 'investPeriod',    label: '투자기간',    type: 'text',   align: 'center' },
    // ── 회수실적 (원문 2단 헤더) ──
    { key: 'recoverPrincipal', label: '회수원금',   type: 'amount', unit: '원', align: 'right', group: '회수실적' },
    { key: 'recoverProfit',   label: '회수수익',    type: 'amount', unit: '원', align: 'right', group: '회수실적' },
    { key: 'recoverTotal',    label: '회수총액',    type: 'amount', unit: '원', align: 'right', group: '회수실적' },
    { key: 'writedown',       label: '감액금액',    type: 'amount', unit: '원', align: 'right', group: '회수실적' },
    { key: 'convertedAmt',    label: '(전환금액)',  type: 'amount', unit: '원', align: 'right' },
    { key: 'investBalance',   label: '투자잔액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'isFullRecovered', label: '회수완료 여부', type: 'status', align: 'center' },
    { key: 'isAgri',          label: '농식품 여부', type: 'status', align: 'center' },
    { key: 'isVenture',       label: '벤처투자 여부', type: 'status', align: 'center' },
    { key: 'isMandatory',     label: '의무투자 여부', type: 'status', align: 'center' },
    { key: 'isBelowScale',    label: '규모이하 여부', type: 'status', align: 'center' },
    { key: 'isStartupInvest', label: '창업투자 여부', type: 'status', align: 'center' },
    { key: 'foundDate',       label: '창업일자',    type: 'date',   align: 'center' },
    { key: 'location',        label: '소재지',      type: 'text',   align: 'center' },
    { key: 'mgmtType',        label: '경영형태',    type: 'text',   align: 'center' },
    { key: 'seqNo',           label: '연번',        type: 'number', align: 'center' },
  ],
  // 조회 전용 — 원문에 등록/수정이 없다. fields를 채우면 editable이 켜져 등록 버튼이 생긴다.
  fields: [],
  filters: ['계정구분', '통계기준', '데이터기준', '기준일자'],
  filterSpecs: {
    계정구분: { kind: 'select', options: ['농식품', '수산'] },
    통계기준: { kind: 'select', options: ['자펀드기준'], def: '자펀드기준', allLabel: null },
    데이터기준: { kind: 'select', options: ['운용사보고', '월말확정'], def: '운용사보고', allLabel: null },
    기준일자: { kind: 'day', def: '2026-07-31' },
  },
  // 원문 Y/N/O/X 태그 도메인 — 여부 6컬럼이 공유한다(.tag g/n/d).
  statusDomain: [
    { label: 'Y', tone: 'success' },
    { label: 'O', tone: 'success' },
    { label: 'N', tone: 'info' },
    { label: 'X', tone: 'warning' },
  ],
  searchable: true,
  hideCardView: true,
  // 조회 전용 — 선택으로 실행할 액션이 없어 체크박스 컬럼을 두지 않는다(apfs-grid hideRowSelection).
  hideRowSelection: true,
  hideKpis: true,
  hideMetrics: true,
  unitToggle: true,
  // 원문이 `var unit='억원'`으로 시작한다(S1_33:319). 원으로 열면 결성액이 32,000,000,000 으로
  // 보여 첫 화면부터 원문과 다르다.
  defaultUnit: '억원',
  totals: {
    label: '합계 {n}건',
    rules: {
      fundAmount: 'sum',
      investee: 'dash', bizSector: 'dash', bizContent: 'dash', investMethod: 'dash', reviewDate: 'dash', firstInvestDate: 'dash', investSeqNo: 'dash',
      investAmt: 'sum',
      agriInvestRatio: 'dash', fundInvestRatio: 'dash', investPeriod: 'dash',
      recoverPrincipal: 'sum', recoverProfit: 'sum', recoverTotal: 'sum', writedown: 'sum', convertedAmt: 'sum', investBalance: 'sum',
      isFullRecovered: 'dash', isAgri: 'dash', isVenture: 'dash', isMandatory: 'dash', isBelowScale: 'dash', isStartupInvest: 'dash',
      foundDate: 'dash', location: 'dash', mgmtType: 'dash',
      seqNo: 'nextSeq',
    },
  },
  sample: [
    { no: 1, year: '2010', sector: '8대사업', fundName: '현대동양농식품사모투자전문회사', registeredAt: '2011-04-04', fundAmount: 32000000000, investee: '(주)진바이오텍', bizSector: '축산관련산업', bizContent: '동물사료 원료 생산(동물자원과학 R&D)', investMethod: 'BW', reviewDate: '2011-10-13', firstInvestDate: '2011-10-25', investSeqNo: '1', investAmt: 5000000000, agriInvestRatio: '-', fundInvestRatio: '-', investPeriod: '4년', recoverPrincipal: 5000000000, recoverProfit: 2500000000, recoverTotal: 7500000000, writedown: 0, convertedAmt: 0, investBalance: 0, isFullRecovered: 'O', isAgri: 'Y', isVenture: 'N', isMandatory: 'Y', isBelowScale: 'Y', isStartupInvest: 'X', foundDate: '2000-03-15', location: '충남', mgmtType: '일반기업', seqNo: 1 },
  ],
  provenance: {
    capturedAt: '2026-09-15',
    sourceSystem: 'FFMS',
    captureFile: 'docs/mockups/01_투자자산관리/S1_33_전체_투자실적.html',
  },
};
