/* 조기경보 > 자펀드정보 4리프의 원문 데이터(순수 모듈). (운용사 재무정보 비교 조회는 스키마 트랙 — schemas/운용사_재무정보_비교_조회.ts)
   - 운용사 정량지표 관리            = S2_70 목록 + S2_71 등록 팝업 + S2_72 수정 팝업
   - 운용사 유형별 정량지표 변동 조회 = S2_78 (평균 카드 + 월별 추이 차트 2섹션)
   - 자펀드 수익률정보 비교 조회      = S2_77 (단일 헤더 + 합계행)
   - 자펀드 종합등급 변동 조회        = S2_79 (자펀드·운용사 종합등급 표 2개 + 연도별 정상 비중 도넛)
   출처: docs/mockups/02_조기경보/*.html `<script>` 를 2026-09-23 파싱 실측으로 옮겼다. 원문에 없는 행·값은 만들지 않는다. */
import type { TableMeta, Provenance, Row } from './risk_table_meta';
import { src } from './risk_table_meta';

/* ═══════════════ S2_70 운용사 정량지표 관리 (+ S2_71 등록 · S2_72 수정) ═══════════════ */

/** 운용사 유형 6종 — 원문 `MGRTYPES`(S2_71 등록 팝업 확정값) */
export const MGR_TYPES = ['벤처투자회사', '증권회사', '여신전문금융회사', '자산운용사', '은행', '보험사'] as const;
/** 지표구분 마스터 7종 — 원문 `INDICATORS`(사용자 제공 실제 화면 캡처 기준 확정) */
export const INDICATORS = ['영업용순자본비율', '유동성비율', '자기자본이익률', '총자산수익률', '자본충실도', '부채비율', '수익성'] as const;

/** 팝업 그리드 한 행 — 원문 `{use, ind, ok, warn, bad, inp}` */
export interface IndicatorSetting { use: boolean; ind: string; ok: string; warn: string; bad: string; inp: boolean }

/** 운용사 유형별 지표 설정값 — 원문 `EDIT_DATA`. 증권회사만 화면 캡처로 확정, 그 외 유형은 원문 미제공 */
export const EDIT_DATA: Partial<Record<string, IndicatorSetting[]>> = {
  증권회사: [
    { use: true, ind: '영업용순자본비율', ok: '400 이상', warn: '150 이상', bad: '150 미만', inp: true },
    { use: true, ind: '유동성비율', ok: '100 이상', warn: '50 이상', bad: '50 미만', inp: true },
    { use: true, ind: '자기자본이익률', ok: '-5 이상', warn: '-10 이상', bad: '-10 미만', inp: false },
    { use: true, ind: '총자산수익률', ok: '-5 이상', warn: '-20 이상', bad: '-20 미만', inp: false },
    { use: false, ind: '자본충실도', ok: '75 이상', warn: '50 이상', bad: '50 미만', inp: false },
    { use: false, ind: '부채비율', ok: '50 이하', warn: '100 이하', bad: '100 초과', inp: false },
    { use: false, ind: '수익성', ok: '-5 이상', warn: '-20 이상', bad: '-20 미만', inp: false },
  ],
};

/** 원문 `metricsFor(type)` — 원문에 없는 유형은 7종 전부 미사용·기준값 없음(최초 상태와 동일) */
export function metricsFor(type: string): IndicatorSetting[] {
  return EDIT_DATA[type] ?? INDICATORS.map((ind) => ({ use: false, ind, ok: '', warn: '', bad: '', inp: false }));
}

/** 팝업 헤더 `입력항목` 의 ⚠검토필요 메모 — 원문 `gridHead()` data-rec/data-dat 그대로 */
export const INPUT_NOTE = { rec: '실측값 직접입력 대상 여부(추정)', dat: '원문 라벨만 존재 · 용도/기본값 미정' };

/* 목록 = 운용사구분별 "사용중" 지표 평탄화 — 원문 `DATA`(벤처투자회사/자본충실도 단건 + 증권회사 사용중 4건) */
const quantRows: Row[] = [
  { type: '벤처투자회사', ind: '자본충실도', ok: '75 이상', warn: '75 미만 50 이상', bad: '50 미만' },
  ...EDIT_DATA.증권회사!.filter((d) => d.use).map((d) => ({ type: '증권회사', ind: d.ind, ok: d.ok, warn: d.warn, bad: d.bad })),
].map((r, i) => ({ id: `quant-${i + 1}`, no: i + 1, ...r }));

export const QUANT_LIST: TableMeta = {
  id: 'quant',
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64 },
    { key: 'type', label: '운용사구분', kind: 'text', width: 150 },
    { key: 'ind', label: '지표구분', kind: 'text', width: 170 },
    /* 원문 `.tag ok / warn / bad` — 값과 무관하게 칸별 고정 톤 */
    { key: 'ok', label: '정상', kind: 'badge', tone: 'success' },
    { key: 'warn', label: '주의', kind: 'badge', tone: 'warning' },
    { key: 'bad', label: '경고', kind: 'badge', tone: 'danger' },
  ],
  rows: quantRows,
};

export const QUANT_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS',
  captureFiles: [src('S2_70_운용사_정량지표_관리.html'), src('S2_71_운용사_정량지표_등록.html'), src('S2_72_운용사_정량지표_수정.html')],
};

/* ═══════════════ S2_78 운용사 유형별 정량지표 변동 ═══════════════ */
export const MF_OPTIONS = ['농식품모태펀드', 'MOAF'] as const;
/** 운용사 유형 — 원문 `<select id="f-type">`(전체 · 벤처투자회사, 기본 선택=벤처투자회사) */
export const TREND_TYPES = ['벤처투자회사'] as const;
/** 기간 기본값 — 원문 `f-from`/`f-to` value */
export const TREND_FROM = '2025-07';
export const TREND_TO = '2026-07';

export interface TrendSeries { name: string; avg: number; color: string; data: number[] }
export interface TrendSection { id: string; title: string; chartTitle: string; series: [TrendSeries, TrendSeries] }

/* 평균값만 원문 실데이터이고, 월별 13점은 원문이 "평균값 주변의 예시 곡선(추론)"이라 명시한 값이다 — 그대로 옮긴다.
   색은 원문 `var(--primary)`/`var(--ok)` 를 우리 토큰(--chart-1/--chart-2)으로 옮긴다. */
export const TREND_SECTIONS: TrendSection[] = [
  { id: 's1', title: '자본 건전성 지표', chartTitle: '자본충실도 / 부채비율 월별 추이', series: [
    { name: '자본충실도', avg: 434.57, color: 'var(--chart-1)', data: [420.1, 428.4, 415.2, 440.6, 451.3, 438.0, 430.5, 445.9, 425.7, 436.2, 442.8, 448.1, 434.6] },
    { name: '부채비율', avg: 32.74, color: 'var(--chart-2)', data: [35.1, 34.2, 33.6, 31.4, 30.2, 32.0, 33.5, 34.1, 32.6, 31.5, 33.2, 34.0, 33.2] },
  ] },
  { id: 's2', title: '수익성 지표', chartTitle: '자기자본이익율 / 총자산수익률 월별 추이', series: [
    { name: '자기자본이익율', avg: 12.8, color: 'var(--chart-1)', data: [11.5, 12.0, 12.4, 13.1, 13.6, 12.9, 12.2, 13.2, 12.6, 12.9, 13.3, 12.7, 12.7] },
    { name: '총자산수익률', avg: 3.73, color: 'var(--chart-2)', data: [3.40, 3.52, 3.61, 3.92, 4.03, 3.80, 3.58, 3.72, 3.75, 3.81, 3.86, 3.70, 3.65] },
  ] },
];

/** 원문 `months(from,to)` — 'YYYY-MM' 범위 → 'YYYY.MM' 라벨(최대 60개) */
export function monthLabels(from: string, to: string): string[] {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  if (!fy || !fm || !ty || !tm) return [];
  const out: string[] = [];
  let y = fy, m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}.${String(m).padStart(2, '0')}`);
    m += 1; if (m > 12) { m = 1; y += 1; }
    if (out.length > 60) break;
  }
  return out;
}

/** 선택 기간('YYYY-MM' ~ 'YYYY-MM')에 드는 시계열 점의 인덱스 — 점은 원문 기본 기간의 월에 고정돼 있어
    범위 밖 월은 원천 값이 없다(그리지 않는다). 빈 끝값 = 열린 범위 */
export function trendPointsInRange(from: string, to: string): number[] {
  return monthLabels(TREND_FROM, TREND_TO)
    .map((l, i) => [l.replace('.', '-'), i] as const)
    .filter(([ym]) => (!from || ym >= from) && (!to || ym <= to))
    .map(([, i]) => i);
}

export const TREND_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS', captureFiles: [src('S2_78_운용사_유형별_정량지표_변동.html')],
};

/* ═══════════════ S2_77 자펀드 수익률정보 비교 조회 ═══════════════ */
/** 기준년월 기본값 — 원문 `f-ym` value */
export const RETURN_BASE_YM = '2026-07';

export const RETURN_TABLE: TableMeta = {
  id: 'return',
  totalLabel: '합계',
  cols: [
    { key: 'no', label: '순번', kind: 'number', align: 'center', width: 72 },
    { key: 'fn', label: '자펀드', kind: 'text', width: 200 },
    { key: 'ym', label: '기준년월', kind: 'date' },
    { key: 'ret', label: '자펀드수익률(%)', kind: 'number', align: 'center', fixed: 2, neg: true, total: 'dash' },
    /* 원문 gradeTag: 정상=g · 주의=a · 경고=r */
    { key: 'grade', label: '등급', kind: 'badge', tones: { 정상: 'success', 주의: 'warning', 경고: 'danger' }, total: 'dash' },
    { key: 'invest', label: '투자잔액', kind: 'amount', total: 'sum' },
    { key: 'acct', label: '계좌잔액', kind: 'amount', total: 'sum' },
    { key: 'uninv', label: '미투자자산투자잔액', kind: 'amount', total: 'sum' },
    { key: 'dist', label: '배분총액', kind: 'amount', total: 'sum' },
    { key: 'contrib', label: '출자금총액', kind: 'amount', total: 'sum' },
    { key: 'formed', label: '결성총액', kind: 'amount', total: 'sum' },
  ],
  /* 원문 확정 실데이터 1건 — 투자잔액·계좌잔액·미투자자산투자잔액·배분총액은 원문 P열 공란(null, 표시 '-').
     합계는 원문 `sum()` 이 null 을 0 으로 더하므로 그 네 칸의 합계는 0 으로 보인다(원문 그대로). */
  rows: [{ id: 'return-1', no: 1, fn: '유니 수산식품 투자조합1호', ym: '2026-07', ret: -100.00, grade: '경고',
    invest: null, acct: null, uninv: null, dist: null, contrib: 7000000000, formed: 7000000000 }],
};

export const RETURN_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS', captureFiles: [src('S2_77_자펀드_수익률정보_비교조회.html')],
};

/* ═══════════════ S2_79 자펀드 종합등급 변동 ═══════════════ */
export const GRADE_YEARS = [2021, 2022, 2023, 2024, 2025] as const;
/** 기준년도 기본값 — 원문 `f-year` value */
export const GRADE_BASE_YEAR = '2025';
/** 원천 '정상' 등급 값 — 원문 `FUND` / `MGR` */
export const FUND_NORMAL = [60, 73, 76, 83, 83] as const;
export const MGR_NORMAL = [50, 54, 58, 57, 64] as const;

const yearKey = (y: number) => `y${y}`;
/* 원문 renderGrid: 정상=원천 실값 · 주의·경고=원문 값 없음이라 0(사용자 지시) · 총계=정상+주의+경고 */
function gradeTable(id: string, title: string, normal: readonly number[]): TableMeta {
  const row = (grade: string, vals: readonly number[]): Row =>
    ({ id: `${id}-${grade}`, grade, ...Object.fromEntries(GRADE_YEARS.map((y, i) => [yearKey(y), vals[i]])) });
  const zeros = normal.map(() => 0);
  return {
    id, title, totalLabel: '총계',
    cols: [
      { key: 'grade', label: '등급', kind: 'badge', tones: { 정상: 'success', 주의: 'warning', 경고: 'danger' }, width: 110 },
      ...GRADE_YEARS.map((y) => ({ key: yearKey(y), label: String(y), kind: 'number' as const, total: 'sum' as const })),
    ],
    rows: [row('정상', normal), row('주의', zeros), row('경고', zeros)],
  };
}
export const FUND_GRADE = gradeTable('fundGrade', '자펀드 종합등급', FUND_NORMAL);
export const MGR_GRADE = gradeTable('mgrGrade', '운용사 종합등급', MGR_NORMAL);
export { yearKey };

export const GRADE_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS', captureFiles: [src('S2_79_종합등급_변동.html')],
};
