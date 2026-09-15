/* 투자기업명세서(통합) — 투자자산관리 > 투자기업정보 > 투자기업명세서(통합).

   출처: S1_31_투자기업정보_전체_.html 의 `var COLS=[…]` 배열을 **원문 순서 그대로** 58컬럼 이식
   (2026-09-15 파싱 실측). 보조 참조 S2_64(조기경보 모듈의 동일 화면, 필터만 기준일자로 축소).

   #1 투자기업정보(통합)과 목적이 다르다 — 그쪽은 컴플라이언스 **운영 목록**(의무투자·후속투자 여부 등)이고
   이 화면은 기업 1건 = 1행의 **와이드 명세표**로 엑셀 내보내기가 주 목적이다. 그래서 통합하지 않는다.

   ⚠ 58컬럼은 이 작업 최대의 반응형 리스크다. 가로 스크롤은 **AG Grid 내부에만** 두고
     페이지 전체(documentElement)에 생기지 않게 한다. 좌측 고정 3열(운용사·자펀드·투자기업)은
     고정 폭이 아니라 하한 폭이다(400% 확대 시 화면을 다 먹지 않도록). */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '투자기업명세서(통합)',   // ⚠️ data.ts 메뉴 리프 라벨과 정확히 일치(라우팅 키, NFC)
  title: '투자기업명세서(통합)',
  kind: 'list',
  entity: '투자기업명세',
  columns: [
    // ── 기본 ──
    { key: 'no',            label: 'No',                 type: 'number', align: 'center', group: '기본' },
    { key: 'fundNature',    label: '조합성격',           type: 'text',   align: 'center', group: '기본' },
    { key: 'gp',            label: '운용사',             type: 'gp',     align: 'left',   group: '기본', pinned: 'left' },
    { key: 'subFund',       label: '자펀드',             type: 'text',   align: 'left',   group: '기본', pinned: 'left' },
    { key: 'investee',      label: '투자기업',           type: 'text',   align: 'left',   group: '기본', pinned: 'left' },
    { key: 'investeeEn',    label: '투자기업(영문)',     type: 'text',   align: 'left',   group: '기본' },
    // ── 대표자 ──
    { key: 'ceo1',          label: '대표자1',            type: 'text',   align: 'center', group: '대표자' },
    { key: 'ceo1Birth',     label: '대표자1 생년월일',   type: 'pii',    align: 'center', group: '대표자' },
    { key: 'ceo1Gender',    label: '대표자1 성별',       type: 'text',   align: 'center', group: '대표자' },
    { key: 'ceo2',          label: '대표자2',            type: 'text',   align: 'center', group: '대표자' },
    { key: 'ceo2Birth',     label: '대표자2 생년월일',   type: 'pii',    align: 'center', group: '대표자' },
    { key: 'ceo2Gender',    label: '대표자2 성별',       type: 'text',   align: 'center', group: '대표자' },
    // ── 기업식별 ──
    { key: 'bizNo',         label: '사업자번호',         type: 'pii',    align: 'center', group: '기업식별' },
    { key: 'corpNo',        label: '법인번호',           type: 'pii',    align: 'center', group: '기업식별' },
    { key: 'sicCode',       label: '표준산업분류코드',   type: 'code',   align: 'center', group: '기업식별' },
    { key: 'sicName',       label: '표준산업분류코드명', type: 'text',   align: 'left',   group: '기업식별' },
    { key: 'location',      label: '소재지',             type: 'text',   align: 'center', group: '기업식별' },
    { key: 'zipCode',       label: '우편번호',           type: 'code',   align: 'center', group: '기업식별' },
    { key: 'address',       label: '주소',               type: 'text',   align: 'left',   group: '기업식별' },
    { key: 'addressDetail', label: '나머지주소',         type: 'text',   align: 'left',   group: '기업식별' },
    { key: 'tel',           label: '업체전화',           type: 'pii',    align: 'center', group: '기업식별' },
    { key: 'fax',           label: '업체FAX',            type: 'pii',    align: 'center', group: '기업식별' },
    { key: 'homepage',      label: '홈페이지',           type: 'text',   align: 'left',   group: '기업식별' },
    { key: 'establishDate', label: '설립일자',           type: 'date',   align: 'center', group: '기업식별' },
    { key: 'isStartupInvest', label: '창업투자여부',     type: 'text',   align: 'center', group: '기업식별' },
    { key: 'mainProduct',   label: '주요제품',           type: 'text',   align: 'left',   group: '기업식별' },
    { key: 'ventureType',   label: '벤처유형',           type: 'text',   align: 'center', group: '기업식별' },
    { key: 'ventureNo',     label: '벤처기업확인번호',   type: 'code',   align: 'center', group: '기업식별' },
    { key: 'ventureTerm',   label: '벤처유형기간',       type: 'text',   align: 'center', group: '기업식별' },
    { key: 'entType',       label: '기업유형',           type: 'text',   align: 'center', group: '기업식별' },
    { key: 'entTypeTerm',   label: '기업유형기간',       type: 'text',   align: 'center', group: '기업식별' },
    { key: 'settlementMonth', label: '결산월',           type: 'text',   align: 'center', group: '기업식별' },
    { key: 'isWomanOwned',  label: '여성기업여부',       type: 'text',   align: 'center', group: '기업식별' },
    { key: 'auditor',       label: '회계감사기관',       type: 'text',   align: 'left',   group: '기업식별' },
    { key: 'defaultDate',   label: '부도일',             type: 'date',   align: 'center', group: '기업식별' },
    { key: 'closeDate',     label: '폐업일자',           type: 'date',   align: 'center', group: '기업식별' },
    { key: 'ipoDate',       label: '상장일',             type: 'date',   align: 'center', group: '기업식별' },
    { key: 'stockType',     label: '주식구분',           type: 'text',   align: 'center', group: '기업식별' },
    // 주식 4개는 원문에 정렬 지정이 없다(=우측 기본). 금액(won)으로도 표시돼 있지 않아 단위 토글 대상이 아니다.
    { key: 'commonShares',  label: '보통주 총발행주수',  type: 'number', align: 'right',  group: '기업식별' },
    { key: 'commonPar',     label: '보통주 주식액면가',  type: 'number', align: 'right',  group: '기업식별' },
    { key: 'preferredShares', label: '우선주 총발행주수', type: 'number', align: 'right', group: '기업식별' },
    { key: 'preferredPar',  label: '우선주 주식액면가',  type: 'number', align: 'right',  group: '기업식별' },
    // ── 투자·회수 ──
    { key: 'firstInvestDate', label: '최초투자 (전환)일자', type: 'date', align: 'center', group: '투자·회수' },
    { key: 'investAmt',     label: '투자금액(A)',        type: 'amount', unit: '원', align: 'right', group: '투자·회수' },
    { key: 'recoverPrincipal', label: '회수원금(B)',     type: 'amount', unit: '원', align: 'right', group: '투자·회수' },
    { key: 'recoverProfit', label: '회수수익',           type: 'amount', unit: '원', align: 'right', group: '투자·회수' },
    { key: 'recoverTotal',  label: '회수총액',           type: 'amount', unit: '원', align: 'right', group: '투자·회수' },
    { key: 'writedown',     label: '감액금액',           type: 'amount', unit: '원', align: 'right', group: '투자·회수' },
    { key: 'convertedAmt',  label: '(전환금액)(C)',      type: 'amount', unit: '원', align: 'right', group: '투자·회수' },
    { key: 'investBalance', label: '투자잔액(A+B+C)',    type: 'amount', unit: '원', align: 'right', group: '투자·회수' },
    // ── 재무 ──
    { key: 'baseYm',        label: '기준년월',           type: 'text',   align: 'center', group: '재무' },
    { key: 'totalAssets',   label: '자산총계',           type: 'amount', unit: '원', align: 'right', group: '재무' },
    { key: 'totalLiab',     label: '부채총계',           type: 'amount', unit: '원', align: 'right', group: '재무' },
    { key: 'totalEquity',   label: '자본총계',           type: 'amount', unit: '원', align: 'right', group: '재무' },
    { key: 'sales',         label: '매출액',             type: 'amount', unit: '원', align: 'right', group: '재무' },
    { key: 'operatingProfit', label: '영업이익',         type: 'amount', unit: '원', align: 'right', group: '재무' },
    { key: 'netProfit',     label: '당기순이익',         type: 'amount', unit: '원', align: 'right', group: '재무' },
    { key: 'employees',     label: '종업원수',           type: 'number', align: 'right', group: '재무' },
  ],
  // 조회 전용 — 등록/수정 없음. fields를 채우면 editable이 켜져 툴바에 등록 버튼이 생긴다.
  fields: [],
  /* 목업 필터 5종 중 `모펀드`는 두지 않는다. 원문 자신이 조건부 노출로 적어 뒀고
     (`data-mf-visible` "다중모펀드 옵션 ON 가정(단일=표시, 1개 초과 시 무조건 표시)"),
     APFS는 농식품모태펀드 단일이라 항상 한 값이다. 게다가 현 resolveFilterField는 이 라벨을
     카테고리 태그로 판정해(kind:'tag') 체크 시 row.category와 대조하므로 표가 조용히 0건이 된다. */
  filters: ['운용사', '자펀드', '계정구분', '기준일자'],
  searchable: true,
  hideRowSelection: true,
  hideCardView: true,
  hideKpis: true,
  hideMetrics: true,
  unitToggle: true,
  provenance: {
    capturedAt: '2026-09-15',
    sourceSystem: 'FFMS',
    captureFile: '/Users/younghwankang/Downloads/통합 2/01_투자자산관리/S1_31_투자기업정보_전체_.html',
  },
};
