/* 자펀드 전체 보고현황(route `전체 보고현황`) — 3개 표의 컬럼·데모 행 SSOT.
   출처: `~/Downloads/통합 2/01_투자자산관리/S1_44_전체_보고현황.html`

   ⚠ 이 화면이 13개 중 **전용 컴포넌트가 정당한 유일한 축**인 이유: 원문이 한 화면에 여러 표를 쌓아 두는데
   `PageSchema`는 `columns` 배열이 **하나**뿐이라 담지 못한다(DESIGN_RECOMMENDATION §5.13).
   그래서 표 정의를 여기 데이터로 두고, 페이지(all_report_status.tsx)가 SegTabs로 전환한다.

   ⚠ 1번 탭(투자심의)의 컬럼은 **`schemas/전체_보고현황.ts`에서 그대로 가져온다** — 복사하면 두 곳이
   갈라진다. 그 스키마는 라우트 레지스트리·provenance 기록으로 계속 살아 있다(삭제 금지).

   범위: 승인된 계획이 지정한 3표(투자심의 / 수시보고 / 조합원총회)만 담는다. 원문에는 뒤이어
   관리보수관리·(운용사)출자배분관리·(농금원)출자배분관리 표가 더 있으나 **각각 별도 메뉴 리프**라
   이 화면에서 재현하지 않는다(중복 화면 방지).

   데이터: 각 표의 **1행은 목업 원문 값 그대로**이고, 뒤따르는 행은 표·필터·단위토글을 조작해 볼 수 있게
   더한 데모다(원문에 없다 — 현행시스템 실적으로 읽지 말 것). 금액은 원(KRW) 정수 = `schemas/unit.ts` 저장 단위 계약. */
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
}

/* 목업 원문 태그 값 + Y/N 배지 톤. 스키마의 statusDomain(승인·검토중·반려·대기)에 **덧붙이기만** 한다 —
   원문 1행의 투심상태는 실제로 `결과`(.tag.g = ok)이고, 의무투자·일정규모·농어업투자 3컬럼은 Y/N이다.
   스키마 쪽을 건드리지 않는 이유: 그 파일은 라우트 레지스트리 정본이라 이 화면 사정으로 넓히지 않는다. */
const YN_TONES: StatusDomainEntry[] = [
  { label: '결과', tone: 'success' },
  { label: 'Y', tone: 'success' },
  { label: 'N', tone: 'info' },
];

/* ── 1. 투자심의 현황 ── 컬럼 13개(원문 그대로) */
const 투심Rows: ReportRow[] = [
  // 목업 원문 1행 (data-amt="5000000000" ×2)
  { id: 'rv-1', no: 1, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', investee: '(주)코스온',
    investStatus: '결과', investDate: '2014-09-15', investAmt: 5_000_000_000, investType: '전환사채',
    isMandatory: 'Y', isSmallScale: 'Y', isAgri: 'Y', approvedAmt: 5_000_000_000, paymentDue: '2014-09-19' },
  // ↓ 데모 확장(원문 없음)
  { id: 'rv-2', no: 2, gp: 'IMM인베스트먼트', subFund: 'IMM농식품벤처투자조합', investee: '(주)그린팜테크',
    investStatus: '승인', investDate: '2026-05-18', investAmt: 1_200_000_000, investType: '보통주',
    isMandatory: 'Y', isSmallScale: 'N', isAgri: 'Y', approvedAmt: 1_200_000_000, paymentDue: '2026-05-29' },
  { id: 'rv-3', no: 3, gp: '한국투자파트너스', subFund: '한투농림수산식품투자조합', investee: '스마트어업(주)',
    investStatus: '검토중', investDate: '2026-06-02', investAmt: 800_000_000, investType: '상환전환우선주',
    isMandatory: 'N', isSmallScale: 'Y', isAgri: 'Y', approvedAmt: 0, paymentDue: '-' },
  { id: 'rv-4', no: 4, gp: '유안타인베스트먼트', subFund: '유안타푸드테크투자조합', investee: '(주)델리쿡',
    investStatus: '반려', investDate: '2026-04-21', investAmt: 2_500_000_000, investType: '전환사채',
    isMandatory: 'N', isSmallScale: 'N', isAgri: 'N', approvedAmt: 0, paymentDue: '-' },
  { id: 'rv-5', no: 5, gp: 'IMM인베스트먼트', subFund: 'IMM농식품벤처투자조합', investee: '농심바이오(주)',
    investStatus: '대기', investDate: '2026-06-11', investAmt: 3_400_000_000, investType: '보통주',
    isMandatory: 'Y', isSmallScale: 'N', isAgri: 'Y', approvedAmt: 0, paymentDue: '-' },
];

/* ── 2. 수시보고 현황 ── 컬럼 8개(원문 그대로) */
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
  // 목업 원문 1행
  { id: 'oc-1', no: 1, inputDate: '2018-06-08', occurDate: '2018-06-08', gp: 'KB증권(주)',
    subFund: '현대동양농식품사모투자전문회사', title: '체리부로 투자금 회수 완료 보고', reviewer: '신상준', riskManager: '임은미' },
  // ↓ 데모 확장(원문 없음)
  { id: 'oc-2', no: 2, inputDate: '2026-06-03', occurDate: '2026-05-30', gp: 'IMM인베스트먼트',
    subFund: 'IMM농식품벤처투자조합', title: '피투자기업 대표이사 변경 통지', reviewer: '박심사', riskManager: '정리스크' },
  { id: 'oc-3', no: 3, inputDate: '2026-05-27', occurDate: '2026-05-26', gp: '한국투자파트너스',
    subFund: '한투농림수산식품투자조합', title: '투자기업 회생절차 개시 신청', reviewer: '김심사', riskManager: '임은미' },
  { id: 'oc-4', no: 4, inputDate: '2026-04-15', occurDate: '2026-04-12', gp: '유안타인베스트먼트',
    subFund: '유안타푸드테크투자조합', title: '조합 규약 일부 변경 보고', reviewer: '신상준', riskManager: '정리스크' },
];

/* ── 3. 조합원총회 현황 ── 컬럼 8개(원문 그대로) */
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
  // 목업 원문 1행
  { id: 'mt-1', no: 1, gp: 'KB증권(주)', subFund: '현대동양농식품사모투자전문회사', reportStatus: '결과',
    meetingType: '청산총회', meetingDate: '2018-06-28', title: '임시사원(청산)총회', agenda: '청산 재무제표 승인의 건' },
  // ↓ 데모 확장(원문 없음)
  { id: 'mt-2', no: 2, gp: 'IMM인베스트먼트', subFund: 'IMM농식품벤처투자조합', reportStatus: '승인',
    meetingType: '정기총회', meetingDate: '2026-03-27', title: '제5기 정기조합원총회', agenda: '결산 재무제표 승인의 건' },
  { id: 'mt-3', no: 3, gp: '한국투자파트너스', subFund: '한투농림수산식품투자조합', reportStatus: '검토중',
    meetingType: '임시총회', meetingDate: '2026-06-09', title: '임시조합원총회', agenda: '존속기간 연장의 건' },
  { id: 'mt-4', no: 4, gp: '유안타인베스트먼트', subFund: '유안타푸드테크투자조합', reportStatus: '대기',
    meetingType: '서면결의', meetingDate: '2026-06-20', title: '서면결의 안건 통지', agenda: '업무집행조합원 보수 변경의 건' },
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
