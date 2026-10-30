/* 보고양식·가이드 조회 데이터 — 출처 목업 docs/mockups/05_MOAF/SRP_007_보고양식_가이드_조회.html(SRP-007 · KRDS TO-BE).
   원문 DATA 리터럴 14건(AS-IS MOAF REPORT System 양식) 그대로. 버전 이력 3건도 원문 샘플 그대로 — 원문 설계 메모상
   "원본에 이력 샘플이 없어 임의로 추가(검토필요)" 한 값이다. 실데이터 연동 시 교체 대상.
   - 목록 순서 = 등록일시 최신순(원문 `DATA.sort`), No 는 정렬 뒤 1부터 매긴다.
   - 파일명은 화면 칸이 아니라 Download 버튼의 대상이라 컬럼 없이 행 값(`file`)으로만 싣는다.
   - 버전 이력은 배열이라 Row(Cell 값만)에 못 담는다 → 행 id 로 찾는 `GUIDE_HISTORY` 로 분리. */
import type { ColMeta, Row, TableMeta } from '../../risk_table_meta';

export const REPORT_GUIDE_LABEL = '보고양식·가이드 조회';
export const REPORT_GUIDE_ROUTE = 'report-guide';
export const REPORT_GUIDE_SOURCE = 'docs/mockups/05_MOAF/SRP_007_보고양식_가이드_조회.html';

/** 버전 이력 1건 — 첫 항목이 현재(최신) 버전 */
export interface GuideVersion { v: string; desc: string; file: string; reg: string }
interface GuideSrc { title: string; desc: string; file: string; reg: string; history?: readonly GuideVersion[] }

/* 원문 DATA 리터럴 — 원문 배열 순서 그대로(정렬은 아래에서) */
const SRC: readonly GuideSrc[] = [
  { title: '사모투자전문회사 준법감시보고서', desc: '', file: '사모투자전문회사_준법감시보고서.hwp', reg: '2012-12-06 09:35:00' },
  { title: '농식품투자조합 투자자산 회수예정보고', desc: '', file: '농식품투자조합_투자자산_회수예정보고.hwp', reg: '2013-10-23 09:32:00' },
  { title: '농식품투자조합 준법감시보고서(수산분야)', desc: '', file: '농식품투자조합_준법감시보고서_수산분야.hwp', reg: '2016-01-25 14:33:00' },
  { title: '농식품투자조합 예상 Capital Call 요청보고', desc: '', file: '농식품투자조합_예상_Capital_Call_요청보고.hwp', reg: '2019-09-26 11:31:00' },
  { title: '농식품투자조합 반기 영업보고서', desc: '2024.03 Ver.', file: '농식품투자조합_반기_영업보고서.hwp', reg: '2024-03-29 13:22:38',
    history: [
      { v: '2024년 버전', desc: '2024.03 Ver.', file: '농식품투자조합_반기_영업보고서_2024.hwp', reg: '2024-03-29 13:22:38' },
      { v: '2021년 버전', desc: '최초 배포', file: '농식품투자조합_반기_영업보고서_2021.hwp', reg: '2021-05-10 10:00:00' },
    ] },
  { title: '농식품투자조합 회계처리 가이드라인', desc: '개정 2024. 6. 5.', file: '농식품투자조합_회계처리_가이드라인.pdf', reg: '2024-06-13 10:59:59',
    history: [
      { v: '2024년 버전', desc: '개정 2024. 6. 5.', file: '농식품투자조합_회계처리_가이드라인_2024.pdf', reg: '2024-06-13 10:59:59' },
      { v: '2022년 버전', desc: '최초 제정', file: '농식품투자조합_회계처리_가이드라인_2022.pdf', reg: '2022-03-02 09:00:00' },
    ] },
  { title: '농림수산식품모태펀드 ESG 투자 가이드라인', desc: '24.12.27 신규 가이드라인', file: '농림수산식품모태펀드_ESG_투자_가이드라인.pdf', reg: '2024-12-27 17:32:04' },
  { title: '농식품투자조합 준법감시보고서(일반분야)', desc: '25.02.20. 개정', file: '농식품투자조합_준법감시보고서_일반분야.hwp', reg: '2025-02-20 16:42:39' },
  { title: '농식품투자조합 준법감시보고서(창업보육분야)', desc: '25.02.20. 개정', file: '농식품투자조합_준법감시보고서_창업보육분야.hwp', reg: '2025-02-20 16:44:05' },
  { title: '농식품투자조합 준법감시보고서(세컨더리분야)', desc: '25.02.20. 개정', file: '농식품투자조합_준법감시보고서_세컨더리분야.hwp', reg: '2025-02-20 16:44:14' },
  { title: '개인(신용)정보 수집 이용 동의서', desc: '농식품투자조합 (등록 시_투자인력 변경 시 첨부)', file: '개인신용정보_수집_이용_동의서.hwp', reg: '2025-02-24 09:03:50' },
  { title: '농식품투자조합 월간보고 양식_수정', desc: '', file: '농식품투자조합_월간보고_양식_수정.hwp', reg: '2025-08-06 09:05:20',
    history: [
      { v: '2025년 버전', desc: '양식 수정', file: '농식품투자조합_월간보고_양식_수정_2025.hwp', reg: '2025-08-06 09:05:20' },
      { v: '2023년 버전', desc: '최초 배포', file: '농식품투자조합_월간보고_양식_2023.hwp', reg: '2023-01-11 09:00:00' },
    ] },
  { title: '농식품모태펀드 출자 자펀드사후관리가이드라인', desc: '26.01.22. 개정', file: '농식품모태펀드_출자_자펀드사후관리가이드라인.pdf', reg: '2026-01-22 15:37:11' },
  { title: '농식품모태펀드 자펀드 손상차손 처리기준', desc: '2026.2.26. 개정', file: '농식품모태펀드_자펀드_손상차손_처리기준.pdf', reg: '2026-03-10 15:12:19' },
];

/* 등록일시 최신순 — 'YYYY-MM-DD HH:MM:SS' 문자열 비교가 곧 시간순 */
const SORTED = [...SRC].sort((a, b) => (b.reg < a.reg ? -1 : b.reg > a.reg ? 1 : 0));
const idOf = (i: number) => `rg-${String(i + 1)}`;

/** 행 id → 버전 이력(이력이 있는 양식만) */
export const GUIDE_HISTORY: Readonly<Record<string, readonly GuideVersion[]>> = Object.fromEntries(
  SORTED.flatMap((s, i) => (s.history ? [[idOf(i), s.history]] : [])),
);

/* 목록 6열 = 원문 thead 순서. 정렬 규약상 가운데 정렬 없음 — No·등록일시도 좌측.
   Download 는 행 버튼만 있는 조작 칸이라 엑셀에서 뺀다(파일명은 화면에 없는 값). 이력 칸은 건수 문구라 엑셀에 남긴다. */
const COLS: ColMeta[] = [
  { key: 'no', label: 'No', kind: 'number', align: 'left', width: 56, flex: 0 },
  { key: 'title', label: '양식·가이드명', kind: 'text', width: 280 },
  { key: 'desc', label: '설명', kind: 'text', width: 220 },
  { key: 'dl', label: 'Download', kind: 'text', width: 120, flex: 0, noExport: true },
  { key: 'reg', label: '등록일시', kind: 'date', width: 160, flex: 0 },
  { key: 'hist', label: '이력', kind: 'text', width: 104, flex: 0 },
];

const ROWS: Row[] = SORTED.map((s, i) => ({
  id: idOf(i), no: i + 1, title: s.title, desc: s.desc || null, dl: null, file: s.file, reg: s.reg,
  hist: s.history ? `이력 ${String(s.history.length)}건` : '이력없음',
}));

export const REPORT_GUIDE_TABLE: TableMeta = {
  id: 'reportGuide', cols: COLS, rows: ROWS, empty: '검색 결과가 없습니다.',
};
