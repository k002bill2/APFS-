/* 운용사 명세서 — 투자자산관리 > 운용사 모니터링 > 운용사 명세서.
   출처: docs/mockups/01_투자자산관리/S1_37_운용사별_재무제표.html (2026-09-15 파싱 실측)

   ── 출처 확정(2026-09-15 사용자 지시) ──
   정본 메뉴 매칭표(docs/메뉴구성도_v0.2.md:100)가 이 리프를 `ffms > 투자기업정보 > 운용사별 재무제표`
   (S1_37)로 지목한다. 표 자체에 `(검토 필요)`가 달려 있으나 그것은 **발주처가 확인할 사항**이고,
   구현이 임의로 다른 화면(S1_02 운용사 명세 팝업)으로 갈아끼울 근거가 아니다.
   → 이전 버전이 S1_02 를 출처로 대체했던 것을 되돌려 S1_37 원문 그대로 싣는다.
   S1_02 구현체(gp_spec_modal.tsx)는 그대로 둔다 — 이 라우트에서 열지 않을 뿐 삭제하지 않는다.

   ── 화면 ──
   운용사 × 자펀드 × 투자기업 × 기준년월 1행 = 재무 요약 12컬럼. 원문 22행(선양2·진바이오텍8·
   체리부로4·코스온8)을 그대로 싣는다 — 원문 주석의 캡처 기준: 2026-08-28, KB증권/현대동양농식품
   사모투자전문회사. 조회 전용이며 금액단위 토글(원/백만원/억원)이 있다. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '운용사 명세서',   // ⚠️ data.ts 메뉴 리프 라벨과 정확히 일치(라우팅 키, NFC)
  title: '운용사 명세서',
  kind: 'list',
  entity: '운용사재무',
  columns: [
    { key: 'no',              label: 'No',          type: 'number', align: 'center' },
    { key: 'gp',              label: '운용사',      type: 'gp',     align: 'left', pinned: 'left' },
    { key: 'subFund',         label: '자펀드',      type: 'text',   align: 'left', pinned: 'left' },
    { key: 'investee',        label: '투자기업',    type: 'text',   align: 'left', pinned: 'left' },
    { key: 'baseYm',          label: '기준년월',    type: 'text',   align: 'center' },
    { key: 'totalAssets',     label: '자산총계',    type: 'amount', unit: '원', align: 'right' },
    { key: 'totalLiab',       label: '부채총계',    type: 'amount', unit: '원', align: 'right' },
    { key: 'totalEquity',     label: '자본총계',    type: 'amount', unit: '원', align: 'right' },
    { key: 'sales',           label: '매출액',      type: 'amount', unit: '원', align: 'right' },
    { key: 'operatingProfit', label: '영업이익',    type: 'amount', unit: '원', align: 'right' },
    { key: 'netProfit',       label: '당기순이익',  type: 'amount', unit: '원', align: 'right' },
    { key: 'employees',       label: '종업원수',    type: 'number', unit: '명', align: 'right' },
  ],
  // 조회 전용 — 원문에 등록/수정이 없다(fields를 채우면 editable이 켜져 등록 버튼이 생긴다).
  fields: [],
  // 원문 검색박스 3종 중 `모펀드`는 두지 않는다 — APFS는 농식품모태펀드 단일이라 항상 한 값이고,
  // resolveFilterField가 이 라벨을 카테고리 태그로 판정해 체크 시 표가 조용히 0건이 된다.
  filters: ['운용사', '자펀드'],
  /* 상세필터 명세 — sample 행의 실제 값에서 선택지 도출 (2026-09-24 전수조사) */
  filterSpecs: {
    운용사: { kind: 'select', key: 'gp' },
    자펀드: { kind: 'select', key: 'subFund' },
  },
  searchable: true,
  hideRowSelection: true,
  hideCardView: true,
  hideKpis: true,
  hideMetrics: true,
  unitToggle: true,
  sample: [
    { no: 1, investee: '(주)선양', baseYm: '2012-12', totalAssets: 17792580021, totalLiab: 17707857826, totalEquity: 84722195, sales: 21735896522, operatingProfit: 384486356, netProfit: -3411871602, employees: 68, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 2, investee: '(주)선양', baseYm: '2013-12', totalAssets: 18308114744, totalLiab: 7913028476, totalEquity: 10395086268, sales: 20591706670, operatingProfit: 192982569, netProfit: 12060466043, employees: 68, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 3, investee: '(주)진바이오텍', baseYm: '2011-09', totalAssets: 22882433102, totalLiab: 3023871569, totalEquity: 19858561533, sales: 12079321573, operatingProfit: 836864011, netProfit: 1008876862, employees: 42, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 4, investee: '(주)진바이오텍', baseYm: '2011-12', totalAssets: 46269250337, totalLiab: 26788982766, totalEquity: 19480267571, sales: 29055364293, operatingProfit: 1286376664, netProfit: 310323510, employees: 44, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 5, investee: '(주)진바이오텍', baseYm: '2012-12', totalAssets: 45775601624, totalLiab: 24501939982, totalEquity: 21273661642, sales: 58904009816, operatingProfit: 1276100706, netProfit: -115071521, employees: 43, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 6, investee: '(주)진바이오텍', baseYm: '2013-12', totalAssets: 48350789261, totalLiab: 25251871204, totalEquity: 23098918057, sales: 55036859556, operatingProfit: 165048036, netProfit: -831771515, employees: 45, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 7, investee: '(주)진바이오텍', baseYm: '2014-03', totalAssets: 48107186962, totalLiab: 25912490317, totalEquity: 22194696645, sales: 11916279210, operatingProfit: -199888513, netProfit: -402343333, employees: 42, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 8, investee: '(주)진바이오텍', baseYm: '2014-06', totalAssets: 48016867917, totalLiab: 25128564151, totalEquity: 22888303766, sales: 24848494313, operatingProfit: 599294299, netProfit: 37426056, employees: 44, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 9, investee: '(주)진바이오텍', baseYm: '2014-09', totalAssets: 47322839057, totalLiab: 24419902644, totalEquity: 22902936413, sales: 38411630907, operatingProfit: 827476502, netProfit: 122633356, employees: 39, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 10, investee: '(주)진바이오텍', baseYm: '2014-12', totalAssets: 47342870212, totalLiab: 23922582644, totalEquity: 23420287568, sales: 51589120626, operatingProfit: 1010942879, netProfit: 146370672, employees: 36, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 11, investee: '(주)체리부로', baseYm: '2013-12', totalAssets: 237695859964, totalLiab: 178640804674, totalEquity: 59055055290, sales: 328670448897, operatingProfit: 10225146538, netProfit: 6468260870, employees: 528, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 12, investee: '(주)체리부로', baseYm: '2014-12', totalAssets: 238725609538, totalLiab: 187157272836, totalEquity: 51568336702, sales: 257381196327, operatingProfit: -8911296970, netProfit: -11978523142, employees: 528, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 13, investee: '(주)체리부로', baseYm: '2015-12', totalAssets: 218966396108, totalLiab: 172661011371, totalEquity: 46305384737, sales: 264257600749, operatingProfit: 3767344202, netProfit: -4391022849, employees: 503, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 14, investee: '(주)체리부로', baseYm: '2016-12', totalAssets: 234186626000, totalLiab: 173309141000, totalEquity: 60877485000, sales: 314406872000, operatingProfit: 25615407000, netProfit: 16855534000, employees: 497, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 15, investee: '(주)코스온', baseYm: '2013-12', totalAssets: 23090426437, totalLiab: 12924008646, totalEquity: 10166417791, sales: 10590780829, operatingProfit: -377513058, netProfit: -2666642783, employees: 30, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 16, investee: '(주)코스온', baseYm: '2014-03', totalAssets: 24424561302, totalLiab: 14671303110, totalEquity: 9753258192, sales: 2700138536, operatingProfit: -206357815, netProfit: -513158986, employees: 43, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 17, investee: '(주)코스온', baseYm: '2014-06', totalAssets: 31211449405, totalLiab: 18941173856, totalEquity: 12270275549, sales: 7934165925, operatingProfit: 225785868, netProfit: -542970733, employees: 50, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 18, investee: '(주)코스온', baseYm: '2014-09', totalAssets: 38123789899, totalLiab: 18074567965, totalEquity: 20049221934, sales: 16025038439, operatingProfit: 1046114441, netProfit: -181391746, employees: 69, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 19, investee: '(주)코스온', baseYm: '2014-12', totalAssets: 40522769700, totalLiab: 16955850733, totalEquity: 23566918967, sales: 26482610974, operatingProfit: 2176013633, netProfit: 533873006, employees: 74, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 20, investee: '(주)코스온', baseYm: '2015-12', totalAssets: 73978303856, totalLiab: 23318691517, totalEquity: 50659612339, sales: 61919904000, operatingProfit: 6919750222, netProfit: 4537212269, employees: 149, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 21, investee: '(주)코스온', baseYm: '2016-12', totalAssets: 101838338610, totalLiab: 40522966395, totalEquity: 61315372215, sales: 83065519087, operatingProfit: 8051950464, netProfit: 6789923175, employees: 227, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
    { no: 22, investee: '(주)코스온', baseYm: '2017-06', totalAssets: 120485432019, totalLiab: 49316770847, totalEquity: 71168661172, sales: 49382777124, operatingProfit: 4180856833, netProfit: 2962673892, employees: 248, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사' },
  ],
  provenance: {
    capturedAt: '2026-09-15',
    sourceSystem: 'FFMS',
    captureFile: 'docs/mockups/01_투자자산관리/S1_37_운용사별_재무제표.html',
  },
};
