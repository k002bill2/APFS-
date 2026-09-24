/* 투자기업명세서(통합) — 투자자산관리 > 투자기업정보 > 투자기업명세서(통합).

   출처: S1_31_투자기업정보_전체_.html 의 `var COLS=[…]` 배열을 **원문 순서 그대로** 58컬럼 이식
   (2026-09-15 파싱 실측). 보조 참조 S2_64(조기경보 모듈의 동일 화면, 필터만 기준일자로 축소).

   #1 투자기업정보(통합)과 목적이 다르다 — 그쪽은 컴플라이언스 **운영 목록**(의무투자·후속투자 여부 등)이고
   이 화면은 기업 1건 = 1행의 **와이드 명세표**로 엑셀 내보내기가 주 목적이다. 그래서 통합하지 않는다.

   ⚠ 헤더는 **단일 단**이다. 원문에 colspan/colgroup 이 0건이고 `COLS` 가 평평한 배열 하나다
     (2026-09-16 실측). 이전 버전이 달아 둔 `group:`(기본·대표자·기업식별·투자·회수·재무)은
     소비처가 없어 죽어 있었는데, 2단 헤더 접기(grid_header_note.foldGroups)를 배선하는 순간
     **원문에 없는 상위 헤더 행**이 생겼다 → 제거. 섹션 구분은 아래 주석으로만 남긴다.

   ⚠ 58컬럼은 이 작업 최대의 반응형 리스크다. 가로 스크롤은 **AG Grid 내부에만** 두고
     페이지 전체(documentElement)에 생기지 않게 한다. 좌측 고정 3열(운용사·자펀드·투자기업)은
     고정 폭이 아니라 하한 폭이다(400% 확대 시 화면을 다 먹지 않도록). */
import type { PageSchema } from './types';
import { ACCOUNT_OPTIONS } from './filter_domains';

export const schema: PageSchema = {
  route: '투자기업명세서(통합)',   // ⚠️ data.ts 메뉴 리프 라벨과 정확히 일치(라우팅 키, NFC)
  title: '투자기업명세서(통합)',
  kind: 'list',
  entity: '투자기업명세',
  columns: [
    // ── 기본 ──
    { key: 'no',            label: 'No',                 type: 'number', align: 'center' },
    { key: 'fundNature',    label: '조합성격',           type: 'text',   align: 'center' },
    { key: 'gp',            label: '운용사',             type: 'gp',     align: 'left', pinned: 'left' },
    { key: 'subFund',       label: '자펀드',             type: 'text',   align: 'left', pinned: 'left' },
    { key: 'investee',      label: '투자기업',           type: 'text',   align: 'left', pinned: 'left' },
    { key: 'investeeEn',    label: '투자기업(영문)',     type: 'text',   align: 'left' },
    // ── 대표자 ──
    { key: 'ceo1',          label: '대표자1',            type: 'text',   align: 'center' },
    { key: 'ceo1Birth',     label: '대표자1 생년월일',   type: 'pii',    align: 'center' },
    { key: 'ceo1Gender',    label: '대표자1 성별',       type: 'text',   align: 'center' },
    { key: 'ceo2',          label: '대표자2',            type: 'text',   align: 'center' },
    { key: 'ceo2Birth',     label: '대표자2 생년월일',   type: 'pii',    align: 'center' },
    { key: 'ceo2Gender',    label: '대표자2 성별',       type: 'text',   align: 'center' },
    // ── 기업식별 ──
    { key: 'bizNo',         label: '사업자번호',         type: 'pii',    align: 'center' },
    { key: 'corpNo',        label: '법인번호',           type: 'pii',    align: 'center' },
    { key: 'sicCode',       label: '표준산업분류코드',   type: 'code',   align: 'center' },
    { key: 'sicName',       label: '표준산업분류코드명', type: 'text',   align: 'left' },
    { key: 'location',      label: '소재지',             type: 'text',   align: 'center' },
    { key: 'zipCode',       label: '우편번호',           type: 'code',   align: 'center' },
    { key: 'address',       label: '주소',               type: 'text',   align: 'left' },
    { key: 'addressDetail', label: '나머지주소',         type: 'text',   align: 'left' },
    { key: 'tel',           label: '업체전화',           type: 'pii',    align: 'center' },
    { key: 'fax',           label: '업체FAX',            type: 'pii',    align: 'center' },
    { key: 'homepage',      label: '홈페이지',           type: 'text',   align: 'left' },
    { key: 'establishDate', label: '설립일자',           type: 'date',   align: 'center' },
    { key: 'isStartupInvest', label: '창업투자여부',     type: 'text',   align: 'center' },
    { key: 'mainProduct',   label: '주요제품',           type: 'text',   align: 'left' },
    { key: 'ventureType',   label: '벤처유형',           type: 'text',   align: 'center' },
    { key: 'ventureNo',     label: '벤처기업확인번호',   type: 'code',   align: 'center' },
    { key: 'ventureTerm',   label: '벤처유형기간',       type: 'text',   align: 'center' },
    { key: 'entType',       label: '기업유형',           type: 'text',   align: 'center' },
    { key: 'entTypeTerm',   label: '기업유형기간',       type: 'text',   align: 'center' },
    { key: 'settlementMonth', label: '결산월',           type: 'text',   align: 'center' },
    { key: 'isWomanOwned',  label: '여성기업여부',       type: 'text',   align: 'center' },
    { key: 'auditor',       label: '회계감사기관',       type: 'text',   align: 'left' },
    { key: 'defaultDate',   label: '부도일',             type: 'date',   align: 'center' },
    { key: 'closeDate',     label: '폐업일자',           type: 'date',   align: 'center' },
    { key: 'ipoDate',       label: '상장일',             type: 'date',   align: 'center' },
    { key: 'stockType',     label: '주식구분',           type: 'text',   align: 'center' },
    // 주식 4개는 원문에 정렬 지정이 없다(=우측 기본). 금액(won)으로도 표시돼 있지 않아 단위 토글 대상이 아니다.
    { key: 'commonShares',  label: '보통주 총발행주수',  type: 'number', align: 'right' },
    { key: 'commonPar',     label: '보통주 주식액면가',  type: 'number', align: 'right' },
    { key: 'preferredShares', label: '우선주 총발행주수', type: 'number', align: 'right' },
    { key: 'preferredPar',  label: '우선주 주식액면가',  type: 'number', align: 'right' },
    // ── 투자·회수 ──
    { key: 'firstInvestDate', label: '최초투자 (전환)일자', type: 'date', align: 'center' },
    { key: 'investAmt',     label: '투자금액(A)',        type: 'amount', unit: '원', align: 'right' },
    { key: 'recoverPrincipal', label: '회수원금(B)',     type: 'amount', unit: '원', align: 'right' },
    { key: 'recoverProfit', label: '회수수익',           type: 'amount', unit: '원', align: 'right' },
    { key: 'recoverTotal',  label: '회수총액',           type: 'amount', unit: '원', align: 'right' },
    { key: 'writedown',     label: '감액금액',           type: 'amount', unit: '원', align: 'right' },
    { key: 'convertedAmt',  label: '(전환금액)(C)',      type: 'amount', unit: '원', align: 'right' },
    { key: 'investBalance', label: '투자잔액(A+B+C)',    type: 'amount', unit: '원', align: 'right' },
    // ── 재무 ──
    { key: 'baseYm',        label: '기준년월',           type: 'text',   align: 'center' },
    { key: 'totalAssets',   label: '자산총계',           type: 'amount', unit: '원', align: 'right' },
    { key: 'totalLiab',     label: '부채총계',           type: 'amount', unit: '원', align: 'right' },
    { key: 'totalEquity',   label: '자본총계',           type: 'amount', unit: '원', align: 'right' },
    { key: 'sales',         label: '매출액',             type: 'amount', unit: '원', align: 'right' },
    { key: 'operatingProfit', label: '영업이익',         type: 'amount', unit: '원', align: 'right' },
    { key: 'netProfit',     label: '당기순이익',         type: 'amount', unit: '원', align: 'right' },
    { key: 'employees',     label: '종업원수',           type: 'number', align: 'right' },
  ],
  // 조회 전용 — 등록/수정 없음. fields를 채우면 editable이 켜져 툴바에 등록 버튼이 생긴다.
  fields: [],
  /* 목업 필터 5종 중 `모펀드`는 두지 않는다. 원문 자신이 조건부 노출로 적어 뒀고
     (`data-mf-visible` "다중모펀드 옵션 ON 가정(단일=표시, 1개 초과 시 무조건 표시)"),
     APFS는 농식품모태펀드 단일이라 항상 한 값이다. 게다가 현 resolveFilterField는 이 라벨을
     카테고리 태그로 판정해(kind:'tag') 체크 시 row.category와 대조하므로 표가 조용히 0건이 된다. */
  filters: ['운용사', '자펀드', '계정구분', '기준일자'],
  /* 상세필터 명세 — 합성 행 없음 — sample 4행의 실제 값에서 선택지 도출(목업 'KB증권' ≠ 행 'KB증권(주)') (2026-09-24 전수조사) */
  filterSpecs: {
    운용사: { kind: 'select', key: 'gp' },
    자펀드: { kind: 'select', key: 'subFund' },
    계정구분: { kind: 'select', options: [...ACCOUNT_OPTIONS] },
  },
  searchable: true,
  hideRowSelection: true,
  hideCardView: true,
  hideKpis: true,
  hideMetrics: true,
  unitToggle: true,
  sample: [
    { no: '1', fundNature: '8대사업', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', investee: '(주)진바이오텍', investeeEn: '', ceo1: '이찬호', ceo1Birth: '640405-1', ceo1Gender: '남자', ceo2: '', ceo2Birth: '', ceo2Gender: '', bizNo: '307-81-14821', corpNo: '', sicCode: '10801', sicName: '배합 사료 제조업', location: '충남', zipCode: '314831', address: '충청남도 공주시 계룡면', addressDetail: '진바이오텍', tel: '041-853-9961', fax: '', homepage: 'www.genebiotech.co.kr', establishDate: '2000-03-15', isStartupInvest: 'x', mainProduct: '기능성 펩타이드, 환경개선 생균제등', ventureType: '', ventureNo: '', ventureTerm: '', entType: '벤처기업', entTypeTerm: '', settlementMonth: '12', isWomanOwned: 'x', auditor: '신우회계법인', defaultDate: '', closeDate: '', ipoDate: '2006-04-28', stockType: '코스닥', commonShares: 7903833, commonPar: 500, preferredShares: 0, preferredPar: 500, firstInvestDate: '2011-10-25', investAmt: 5000000000, recoverPrincipal: 5000000000, recoverProfit: 2537708910, recoverTotal: 7537708910, writedown: 0, convertedAmt: 0, investBalance: 0, baseYm: '201412', totalAssets: 47342870212, totalLiab: 23922582644, totalEquity: 23420287568, sales: 51589120626, operatingProfit: 1010942879, netProfit: 146370672, employees: 36 },
    { no: '2', fundNature: '8대사업', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', investee: '(주)선양', investeeEn: '', ceo1: '윤영옥', ceo1Birth: '491212-1', ceo1Gender: '남자', ceo2: '', ceo2Birth: '', ceo2Gender: '', bizNo: '123-81-11041', corpNo: '', sicCode: '18119', sicName: '기타 인쇄업', location: '울산', zipCode: '445843', address: '경기도 화성시 푸른들판로1153번길', addressDetail: '25', tel: '', fax: '', homepage: '', establishDate: '', isStartupInvest: 'x', mainProduct: '', ventureType: '', ventureNo: '', ventureTerm: '', entType: '', entTypeTerm: '', settlementMonth: '', isWomanOwned: 'x', auditor: '', defaultDate: '', closeDate: '', ipoDate: '', stockType: '', commonShares: '', commonPar: '', preferredShares: '', preferredPar: '', firstInvestDate: '', investAmt: '', recoverPrincipal: '', recoverProfit: '', recoverTotal: '', writedown: '', convertedAmt: '', investBalance: '', baseYm: '', totalAssets: '', totalLiab: '', totalEquity: '', sales: '', operatingProfit: '', netProfit: '', employees: '' },
    { no: '3', fundNature: '8대사업', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', investee: '(주)체리부로', investeeEn: '', ceo1: '김인식', ceo1Birth: '420413-1', ceo1Gender: '남자', ceo2: '', ceo2Birth: '', ceo2Gender: '', bizNo: '301-81-12903', corpNo: '154311-0001997', sicCode: '01231', sicName: '양계업', location: '경북', zipCode: '365822', address: '충청북도 진천군 생거진천로', addressDetail: '1770(중', tel: '', fax: '', homepage: '', establishDate: '', isStartupInvest: 'x', mainProduct: '', ventureType: '', ventureNo: '', ventureTerm: '', entType: '', entTypeTerm: '', settlementMonth: '', isWomanOwned: 'x', auditor: '', defaultDate: '', closeDate: '', ipoDate: '', stockType: '', commonShares: '', commonPar: '', preferredShares: '', preferredPar: '', firstInvestDate: '', investAmt: '', recoverPrincipal: '', recoverProfit: '', recoverTotal: '', writedown: '', convertedAmt: '', investBalance: '', baseYm: '', totalAssets: '', totalLiab: '', totalEquity: '', sales: '', operatingProfit: '', netProfit: '', employees: '' },
    { no: '4', fundNature: '8대사업', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', investee: '(주)코스온', investeeEn: '', ceo1: '이동건', ceo1Birth: '680127-1', ceo1Gender: '남자', ceo2: '', ceo2Birth: '', ceo2Gender: '', bizNo: '106-81-84011', corpNo: '110111-1823289', sicCode: '20423', sicName: '화장품 제조업', location: '경기', zipCode: '135736', address: '서울특별시 강남구 영동대로', addressDetail: '일동빌', tel: '', fax: '', homepage: '', establishDate: '', isStartupInvest: 'x', mainProduct: '', ventureType: '', ventureNo: '', ventureTerm: '', entType: '', entTypeTerm: '', settlementMonth: '', isWomanOwned: 'x', auditor: '', defaultDate: '', closeDate: '', ipoDate: '', stockType: '', commonShares: '', commonPar: '', preferredShares: '', preferredPar: '', firstInvestDate: '', investAmt: '', recoverPrincipal: '', recoverProfit: '', recoverTotal: '', writedown: '', convertedAmt: '', investBalance: '', baseYm: '', totalAssets: '', totalLiab: '', totalEquity: '', sales: '', operatingProfit: '', netProfit: '', employees: '' },
  ],
  provenance: {
    capturedAt: '2026-09-15',
    sourceSystem: 'FFMS',
    captureFile: 'docs/mockups/01_투자자산관리/S1_31_투자기업정보_전체_.html',
  },
};
