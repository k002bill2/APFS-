/* 자펀드 전체 보고현황(route `전체 보고현황`) — 원문 6개 표의 컬럼·행 SSOT.
   출처: docs/mockups/01_투자자산관리/S1_44_전체_보고현황.html (2026-09-15 파싱 실측)

   ⚠ 이 화면이 전용 컴포넌트인 이유: 원문이 한 화면에 표 6개를 쌓아 두는데 `PageSchema`는
   `columns` 배열이 **하나**뿐이라 담지 못한다. 그래서 표 정의를 여기 데이터로 두고,
   페이지(all_report_status.tsx)가 SegTabs 로 전환한다.

   ⚠ 1번 탭(투자심의)의 컬럼은 **`schemas/전체_보고현황.ts`에서 그대로 가져온다** — 복사하면
   두 곳이 갈라진다. 그 스키마는 라우트 레지스트리·provenance 기록으로 계속 살아 있다(삭제 금지).

   ── 2026-09-15 정정 ──
   ① 범위: 이전 버전은 3표(투자심의/수시보고/조합원총회)만 담고 "나머지 3표는 별도 메뉴 리프라
      재현하지 않는다"고 적었다. 그 판단을 되돌린다 — 화면 이름이 `전체 보고현황`인데 원문의
      1/2만 보이면 제목이 거짓이 된다. 관리보수관리·(운용사)출자배분관리·(농금원)출자배분관리를
      포함해 **6표 전부**를 탭으로 싣는다.
   ② 데이터: 이전 버전은 각 표 1행만 원문이고 뒤에 "데모 확장" 행을 더했다. 전부 제거했다 —
      원문에 없는 행은 이 화면에서 만들지 않는다. 그래서 표당 행 수가 원문 그대로 작다.
   ③ `관리보수관리` 탭은 원문이 "조회된 데이터가 없습니다"라 **행 0건**이다. 빈 표가 정답이다.
   ④ (운용사)출자배분관리 표의 `소계`·`합계` 2줄은 데이터 행이 아니라 집계라 `pinnedBottom`에
      둔다. rows 에 섞으면 건수가 14건이 되고 필터·정렬에 끼어든다.
   ⑤ 원문 rowspan(운용사·자펀드·약정총액·모태펀드 약정액이 12행 병합)은 행마다 **값을 다시 펼쳐**
      담았다 — 병합 셀을 비워 두면 2행부터 식별자가 빈칸이 된다.

   금액은 원(KRW) 정수 = `schemas/unit.ts` 저장 단위 계약. 원문 셀은 `data-amt` 속성이 원값이고
   화면 텍스트는 단위 토글이 덮어쓰므로, 텍스트가 아니라 `data-amt` 를 옮겼다. */
import type { ColumnSpec, StatusDomainEntry } from './schemas/types';
import { schema as 전체보고현황Schema } from './schemas/전체_보고현황';

export type ReportRow = Record<string, string | number> & { id: string };

export interface ReportTab {
  key: string;
  label: string;          // SegTabs 라벨 (축 = 비마스킹)
  sheet: string;          // Excel 시트명
  dateKey: string;        // 기준일자 필터가 비교할 날짜 컬럼
  columns: readonly ColumnSpec[];
  statusDomain: readonly StatusDomainEntry[];
  rows: readonly ReportRow[];
  /** 집계 행(소계·합계). 데이터가 아니므로 rows 와 분리해 그리드 하단에 고정한다. */
  pinnedBottom?: readonly ReportRow[];
}

/* 목업 원문 태그 값 + Y/N 배지 톤. 스키마의 statusDomain(승인·검토중·반려·대기)에 **덧붙이기만** 한다 —
   원문 1행의 투심상태는 실제로 `결과`(.tag.g = ok)이고, 의무투자·일정규모·농어업투자 3컬럼은 Y/N이다.
   스키마 쪽을 건드리지 않는 이유: 그 파일은 라우트 레지스트리 정본이라 이 화면 사정으로 넓히지 않는다. */
const YN_TONES: StatusDomainEntry[] = [
  { label: '결과', tone: 'success' },
  { label: 'Y', tone: 'success' },
  { label: 'N', tone: 'info' },
];

/* ── 1. 투자심의관리 ── 컬럼 13개(원문 그대로) · 원문 1행 */
const 투심Rows: ReportRow[] = [
  { id: 'rv-1', no: 1, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', investee: '(주)코스온',
    investStatus: '결과', investDate: '2014-09-15', investAmt: 5_000_000_000, investType: '전환사채',
    isMandatory: 'Y', isSmallScale: 'Y', isAgri: 'Y', approvedAmt: 5_000_000_000, paymentDue: '2014-09-19' },
];

/* ── 2. 수시보고 ── 컬럼 8개(원문 그대로) · 원문 1행 */
const 수시보고Columns: readonly ColumnSpec[] = [
  { key: 'no',          label: 'No',            type: 'number', align: 'center' },
  { key: 'inputDate',   label: '입력일자',      type: 'date',   align: 'center' },
  { key: 'occurDate',   label: '상황 발생일자', type: 'date',   align: 'center' },
  { key: 'gp',          label: '운용사',        type: 'gp',     align: 'left' },
  { key: 'subFund',     label: '자펀드',        type: 'text',   align: 'left' },
  { key: 'title',       label: '제목',          type: 'text',   align: 'left' },
  { key: 'reviewer',    label: '심사담당',      type: 'pii',    align: 'center' },
  { key: 'riskManager', label: '리스크담당',    type: 'pii',    align: 'center' },
];
const 수시보고Rows: ReportRow[] = [
  { id: 'oc-1', no: 1, inputDate: '2018-06-08', occurDate: '2018-06-08', gp: 'KB증권(주)',
    subFund: '현대동양농식품사모투자전문회사', title: '체리부로 투자금 회수 완료 보고', reviewer: '신상준', riskManager: '임은미' },
];

/* ── 3. 조합원총회 ── 컬럼 8개(원문 그대로) · 원문 1행 */
const 조합원총회Columns: readonly ColumnSpec[] = [
  { key: 'no',           label: 'No',       type: 'number', align: 'center' },
  { key: 'gp',           label: '운용사',   type: 'gp',     align: 'left' },
  { key: 'subFund',      label: '자펀드',   type: 'text',   align: 'left' },
  { key: 'reportStatus', label: '보고상태', type: 'status', align: 'center' },
  { key: 'meetingType',  label: '총회구분', type: 'text',   align: 'center' },
  { key: 'meetingDate',  label: '총회일자', type: 'date',   align: 'center' },
  { key: 'title',        label: '제목',     type: 'text',   align: 'left' },
  { key: 'agenda',       label: '안건',     type: 'text',   align: 'left' },
];
const 조합원총회Rows: ReportRow[] = [
  { id: 'mt-1', no: 1, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', reportStatus: '결과',
    meetingType: '청산총회', meetingDate: '2018-06-28', title: '임시사원(청산)총회', agenda: '청산 재무제표 승인의 건' },
];

/* ── 4. 관리보수관리 ── 컬럼 7개(원문 그대로) · 원문 "조회된 데이터가 없습니다" → 0건 */
const 관리보수Columns: readonly ColumnSpec[] = [
  { key: 'no',         label: 'No',       type: 'number', align: 'center' },
  { key: 'gp',         label: '운용사',   type: 'gp',     align: 'left' },
  { key: 'subFund',    label: '자펀드',   type: 'text',   align: 'left' },
  { key: 'reportType', label: '보고구분', type: 'text',   align: 'center' },
  { key: 'payDate',    label: '지급일자', type: 'date',   align: 'center' },
  { key: 'payType',    label: '지급구분', type: 'text',   align: 'center' },
  { key: 'amount',     label: '금액',     type: 'amount', unit: '원', align: 'right' },
];

/* ── 5. 운용사 출자배분관리 ── 컬럼 19개(기타조합원·모태펀드가 2단 헤더) · 원문 12행 + 소계·합계 */
const 운용사출자배분Columns: readonly ColumnSpec[] = [
  { key: 'no',                label: 'No',             type: 'text',   align: 'center' },
  { key: 'gp',                label: '운용사',         type: 'gp',     align: 'left', pinned: 'left' },
  { key: 'subFund',           label: '자펀드',         type: 'text',   align: 'left', pinned: 'left' },
  { key: 'commitTotal',       label: '약정총액',       type: 'amount', unit: '원', align: 'right' },
  { key: 'moafCommit',        label: '모태펀드 약정액', type: 'amount', unit: '원', align: 'right' },
  { key: 'kind',              label: '구분',           type: 'text',   align: 'center' },
  { key: 'baseDate',          label: '기준일자',       type: 'date',   align: 'center' },
  { key: 'paidTotal',         label: '납입총액',       type: 'amount', unit: '원', align: 'right' },
  { key: 'moafPaid',          label: '모태펀드 납입액', type: 'amount', unit: '원', align: 'right' },
  { key: 'otherPrincipal',    label: '원금배분',       type: 'amount', unit: '원', align: 'right', group: '기타조합원' },
  { key: 'otherProfit',       label: '수익배분(세후)', type: 'amount', unit: '원', align: 'right', group: '기타조합원' },
  { key: 'otherTax',          label: '원천징수세액',   type: 'amount', unit: '원', align: 'right', group: '기타조합원' },
  { key: 'otherSum',          label: '합계',           type: 'amount', unit: '원', align: 'right', group: '기타조합원' },
  { key: 'moafPrincipal',     label: '원금배분',       type: 'amount', unit: '원', align: 'right', group: '모태펀드' },
  { key: 'moafProfit',        label: '수익배분(세후)', type: 'amount', unit: '원', align: 'right', group: '모태펀드' },
  { key: 'moafTax',           label: '원천징수세액',   type: 'amount', unit: '원', align: 'right', group: '모태펀드' },
  { key: 'moafSum',           label: '합계',           type: 'amount', unit: '원', align: 'right', group: '모태펀드' },
  { key: 'distTotal',         label: '배분합계',       type: 'amount', unit: '원', align: 'right' },
  { key: 'contribBalance',    label: '출자잔액',       type: 'amount', unit: '원', align: 'right' },
];
const 운용사출자배분Rows: ReportRow[] = [
  { id: 'gc-1', no: '1', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', commitTotal: 32_000_000_000, moafCommit: 15_700_000_000, kind: '출자', baseDate: '2011-05-13', paidTotal: 1_600_000_000, moafPaid: 785_000_000, otherPrincipal: 0, otherProfit: 0, otherTax: 0, otherSum: 0, moafPrincipal: 0, moafProfit: 0, moafTax: 0, moafSum: 0, distTotal: 0, contribBalance: 1_600_000_000 },
  { id: 'gc-2', no: '2', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', commitTotal: 32_000_000_000, moafCommit: 15_700_000_000, kind: '출자', baseDate: '2011-10-21', paidTotal: 4_800_000_000, moafPaid: 2_355_000_000, otherPrincipal: 0, otherProfit: 0, otherTax: 0, otherSum: 0, moafPrincipal: 0, moafProfit: 0, moafTax: 0, moafSum: 0, distTotal: 0, contribBalance: 6_400_000_000 },
  { id: 'gc-3', no: '3', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', commitTotal: 32_000_000_000, moafCommit: 15_700_000_000, kind: '출자', baseDate: '2012-06-28', paidTotal: 4_800_000_000, moafPaid: 2_355_000_000, otherPrincipal: 0, otherProfit: 0, otherTax: 0, otherSum: 0, moafPrincipal: 0, moafProfit: 0, moafTax: 0, moafSum: 0, distTotal: 0, contribBalance: 11_200_000_000 },
  { id: 'gc-4', no: '4', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', commitTotal: 32_000_000_000, moafCommit: 15_700_000_000, kind: '출자', baseDate: '2014-06-17', paidTotal: 10_240_000_000, moafPaid: 5_024_000_000, otherPrincipal: 0, otherProfit: 0, otherTax: 0, otherSum: 0, moafPrincipal: 0, moafProfit: 0, moafTax: 0, moafSum: 0, distTotal: 0, contribBalance: 13_920_000_000 },
  { id: 'gc-5', no: '5', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', commitTotal: 32_000_000_000, moafCommit: 15_700_000_000, kind: '출자', baseDate: '2014-09-16', paidTotal: 5_202_000_000, moafPaid: 2_552_000_000, otherPrincipal: 0, otherProfit: 0, otherTax: 0, otherSum: 0, moafPrincipal: 0, moafProfit: 0, moafTax: 0, moafSum: 0, distTotal: 0, contribBalance: 19_122_000_000 },
  { id: 'gc-6', no: '6', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', commitTotal: 32_000_000_000, moafCommit: 15_700_000_000, kind: '배분', baseDate: '2013-08-22', paidTotal: 0, moafPaid: 0, otherPrincipal: 2_852_500_000, otherProfit: 0, otherTax: 0, otherSum: 2_852_500_000, moafPrincipal: 2_747_500_000, moafProfit: 0, moafTax: 0, moafSum: 2_747_500_000, distTotal: 5_600_000_000, contribBalance: 5_600_000_000 },
  { id: 'gc-7', no: '7', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', commitTotal: 32_000_000_000, moafCommit: 15_700_000_000, kind: '배분', baseDate: '2014-02-27', paidTotal: 0, moafPaid: 0, otherPrincipal: 978_000_000, otherProfit: 0, otherTax: 0, otherSum: 978_000_000, moafPrincipal: 942_000_000, moafProfit: 0, moafTax: 0, moafSum: 942_000_000, distTotal: 1_920_000_000, contribBalance: 3_680_000_000 },
  { id: 'gc-8', no: '8', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', commitTotal: 32_000_000_000, moafCommit: 15_700_000_000, kind: '배분', baseDate: '2015-03-06', paidTotal: 0, moafPaid: 0, otherPrincipal: 611_200_000, otherProfit: 0, otherTax: 0, otherSum: 611_200_000, moafPrincipal: 588_800_000, moafProfit: 0, moafTax: 0, moafSum: 588_800_000, distTotal: 1_200_000_000, contribBalance: 17_922_000_000 },
  { id: 'gc-9', no: '9', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', commitTotal: 32_000_000_000, moafCommit: 15_700_000_000, kind: '배분', baseDate: '2015-08-18', paidTotal: 0, moafPaid: 0, otherPrincipal: 1_305_300_000, otherProfit: 0, otherTax: 0, otherSum: 1_305_300_000, moafPrincipal: 1_256_700_000, moafProfit: 0, moafTax: 0, moafSum: 1_256_700_000, distTotal: 2_562_000_000, contribBalance: 15_360_000_000 },
  { id: 'gc-10', no: '10', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', commitTotal: 32_000_000_000, moafCommit: 15_700_000_000, kind: '배분', baseDate: '2017-12-26', paidTotal: 0, moafPaid: 0, otherPrincipal: 7_661_000_000, otherProfit: 815_000_000, otherTax: 0, otherSum: 8_476_000_000, moafPrincipal: 7_379_000_000, moafProfit: 785_000_000, moafTax: 0, moafSum: 8_164_000_000, distTotal: 16_640_000_000, contribBalance: 320_000_000 },
  { id: 'gc-11', no: '11', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', commitTotal: 32_000_000_000, moafCommit: 15_700_000_000, kind: '배분', baseDate: '2018-04-23', paidTotal: 0, moafPaid: 0, otherPrincipal: 0, otherProfit: 97_099_605, otherTax: 0, otherSum: 97_099_605, moafPrincipal: 0, moafProfit: 93_525_405, moafTax: 0, moafSum: 93_525_405, distTotal: 190_625_010, contribBalance: 320_000_000 },
  { id: 'gc-12', no: '12', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', commitTotal: 32_000_000_000, moafCommit: 15_700_000_000, kind: '배분', baseDate: '2018-06-28', paidTotal: 0, moafPaid: 0, otherPrincipal: 163_000_000, otherProfit: 937_183_218, otherTax: 0, otherSum: 1_100_183_218, moafPrincipal: 157_000_000, moafProfit: 902_685_709, moafTax: 0, moafSum: 1_059_685_709, distTotal: 2_159_868_927, contribBalance: 0 },
];
/* 소계 = 12행 집계, 합계 = 소계 + 약정액. 원문 tfoot 2줄을 그대로 옮겼다(재계산하지 않는다). */
const 운용사출자배분Totals: ReportRow[] = [
  { id: 'gc-소계', no: '소계', gp: '', subFund: '', commitTotal: '-', moafCommit: '-', kind: '', baseDate: '', paidTotal: 26_642_000_000, moafPaid: 13_071_000_000, otherPrincipal: 13_571_000_000, otherProfit: 1_849_282_823, otherTax: 0, otherSum: 15_420_282_823, moafPrincipal: 13_071_000_000, moafProfit: 1_781_211_114, moafTax: 0, moafSum: 14_852_211_114, distTotal: 30_272_493_937, contribBalance: '-' },
  { id: 'gc-합계', no: '합계', gp: '', subFund: '', commitTotal: 32_000_000_000, moafCommit: 15_700_000_000, kind: '', baseDate: '', paidTotal: 26_642_000_000, moafPaid: 13_071_000_000, otherPrincipal: 13_571_000_000, otherProfit: 1_849_282_823, otherTax: 0, otherSum: 15_420_282_823, moafPrincipal: 13_071_000_000, moafProfit: 1_781_211_114, moafTax: 0, moafSum: 14_852_211_114, distTotal: 30_272_493_937, contribBalance: '-' },
];

/* ── 6. 농금원 출자배분관리 ── 컬럼 22개(원문 그대로) · 원문 1행 */
const 농금원출자배분Columns: readonly ColumnSpec[] = [
  { key: 'no',                label: 'No',               type: 'text',   align: 'center' },
  { key: 'gp',                label: '운용사',           type: 'gp',     align: 'left', pinned: 'left' },
  { key: 'subFund',           label: '자펀드',           type: 'text',   align: 'left', pinned: 'left' },
  { key: 'fundAmount',        label: '결성액',           type: 'amount', unit: '원', align: 'right' },
  { key: 'member',            label: '조합원',           type: 'text',   align: 'left' },
  { key: 'memberType',        label: '조합원 구분',      type: 'text',   align: 'center' },
  { key: 'memberCommit',      label: '조합원 약정금액',  type: 'amount', unit: '원', align: 'right' },
  { key: 'memberCommitTotal', label: '조합원 약정총액',  type: 'amount', unit: '원', align: 'right' },
  { key: 'tradeType',         label: '거래구분',         type: 'text',   align: 'center' },
  { key: 'tradeDetail',       label: '상세구분',         type: 'text',   align: 'center' },
  { key: 'tradeDate',         label: '거래일자',         type: 'date',   align: 'center' },
  { key: 'paidAmt',           label: '납입금액',         type: 'amount', unit: '원', align: 'right' },
  { key: 'fundPaidTotal',     label: '조합 납입총액',    type: 'amount', unit: '원', align: 'right' },
  { key: 'principalDist',     label: '원금배분액',       type: 'amount', unit: '원', align: 'right' },
  { key: 'profitDistPreTax',  label: '수익배분액(세전)', type: 'amount', unit: '원', align: 'right' },
  { key: 'fundDistTotal',     label: '조합 배분총액',    type: 'amount', unit: '원', align: 'right' },
  { key: 'otherDist',         label: '기타배분액(이자 등)', type: 'amount', unit: '원', align: 'right' },
  { key: 'priorLossReserve',  label: '우선손실 충당액',  type: 'amount', unit: '원', align: 'right' },
  { key: 'withholdingTax',    label: '원천징수 세액',    type: 'amount', unit: '원', align: 'right' },
  { key: 'netDeposit',        label: '실 입금액',        type: 'amount', unit: '원', align: 'right' },
  { key: 'netDepositTotal',   label: '실 입금총액',      type: 'amount', unit: '원', align: 'right' },
  { key: 'holdBalance',       label: '보유잔액',         type: 'amount', unit: '원', align: 'right' },
];
const 농금원출자배분Rows: ReportRow[] = [
  { id: 'ac-1', no: '1', gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', fundAmount: 32_000_000_000, member: '농식품모태펀드', memberType: 'SP', memberCommit: 15_700_000_000, memberCommitTotal: 32_000_000_000, tradeType: '출자', tradeDetail: '설립출자', tradeDate: '2011-05-13', paidAmt: 785_000_000, fundPaidTotal: 1_600_000_000, principalDist: '-', profitDistPreTax: '-', fundDistTotal: '-', otherDist: '-', priorLossReserve: '-', withholdingTax: '-', netDeposit: '-', netDepositTotal: '-', holdBalance: 785_000_000 },
];

export const REPORT_TABS: readonly ReportTab[] = [
  {
    key: 'review', label: '투자심의', sheet: '투자심의 현황', dateKey: 'investDate',
    columns: 전체보고현황Schema.columns,   // ← 스키마가 정본(복사 금지)
    statusDomain: [...(전체보고현황Schema.statusDomain ?? []), ...YN_TONES],
    rows: 투심Rows,
  },
  {
    key: 'occasional', label: '수시보고', sheet: '수시보고 현황', dateKey: 'inputDate',
    columns: 수시보고Columns, statusDomain: YN_TONES, rows: 수시보고Rows,
  },
  {
    key: 'meeting', label: '조합원총회', sheet: '조합원총회 현황', dateKey: 'meetingDate',
    columns: 조합원총회Columns,
    statusDomain: [...(전체보고현황Schema.statusDomain ?? []), ...YN_TONES],
    rows: 조합원총회Rows,
  },
  {
    // 원문이 빈 표다. 행을 지어내지 않는다 — 빈 상태가 원문 충실이다.
    key: 'mgmtFee', label: '관리보수', sheet: '관리보수관리', dateKey: 'payDate',
    columns: 관리보수Columns, statusDomain: YN_TONES, rows: [],
  },
  {
    key: 'gpContribution', label: '운용사 출자배분', sheet: '운용사 출자배분관리', dateKey: 'baseDate',
    columns: 운용사출자배분Columns, statusDomain: YN_TONES,
    rows: 운용사출자배분Rows, pinnedBottom: 운용사출자배분Totals,
  },
  {
    key: 'apfsContribution', label: '농금원 출자배분', sheet: '농금원 출자배분관리', dateKey: 'tradeDate',
    columns: 농금원출자배분Columns, statusDomain: YN_TONES, rows: 농금원출자배분Rows,
  },
];

export const findTab = (key: string): ReportTab => REPORT_TABS.find((t) => t.key === key) ?? REPORT_TABS[0];

/** 표에 실제로 등장하는 값의 오름차순 목록 — 필터 select 옵션(없는 값을 지어내지 않는다). */
export const distinctValues = (tab: ReportTab, key: string): string[] =>
  [...new Set(tab.rows.map((r) => String(r[key] ?? '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));

export interface ReportFilters { gp: string; subFund: string; from: string; to: string; kw: string }

/** 행 필터 — 운용사·자펀드는 완전일치, 기준일자는 탭의 주 날짜 컬럼 범위, 검색어는 전 컬럼 부분일치. */
export function filterRows(tab: ReportTab, f: ReportFilters): ReportRow[] {
  const kw = f.kw.trim().toLowerCase();
  return tab.rows.filter((r) => {
    if (f.gp && String(r.gp ?? '') !== f.gp) return false;
    if (f.subFund && String(r.subFund ?? '') !== f.subFund) return false;
    const d = String(r[tab.dateKey] ?? '');
    // '-'(미정) 행은 기간을 걸면 빠진다 — 날짜가 없는 행을 기간 안에 있다고 볼 수 없다.
    if (f.from && !(d >= f.from)) return false;
    if (f.to && !(d && d <= f.to)) return false;
    if (kw && !tab.columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(kw))) return false;
    return true;
  });
}

/* 이 전용 페이지가 **어느 목업에서 왔는가** — 스키마의 provenance 와 같은 역할을 하는 기록.
   라우트는 전용 페이지가 그리므로 출처도 여기에 둔다(테스트가 이 값으로 출처 바꿔치기를 잡는다). */
export const PROVENANCE = {
  capturedAt: '2026-09-15',
  sourceSystem: 'FFMS',
  captureFile: 'docs/mockups/01_투자자산관리/S1_44_전체_보고현황.html',
} as const;
