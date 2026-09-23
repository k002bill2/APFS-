/* 투자자산관리 > 조합관리 > 자펀드정보관리 의 원문 데이터(순수 모듈, React import 금지).
   출처: docs/메뉴구성도_v0.2.md 의 매칭 "risk > 기초정보 > 자펀드 정보 관리" —
   - 목록 = S2_73_자펀드_정보_관리.html `<thead>`(2단 헤더) + `<script> var DATA` 1건
   - 등록 팝업 = S2_74_자펀드_정보_등록.html · 수정 팝업 = S2_75_자펀드_정보_수정.html
     (둘 다 S2_73 안에 openReg()/openEditFund(r) 로 이미 병합돼 있다 — 수정 팝업은 **클릭한 행**으로 채운다)
   값·순서·개수를 바꾸지 않는다. 원문 행 값이 문자열('60')이면 문자열 그대로 싣는다(숫자로 바꾸지 않는다). */
import type { TableMeta, Provenance, Row } from './risk_table_meta';

/** 조기경보 목업 폴더 — risk_table_meta.MOCKUP_DIR 과 같은 폴더지만 이 화면은 투자자산관리 메뉴라 경로를 따로 적는다 */
const S2 = (file: string) => `docs/mockups/02_조기경보/${file}`;

export const FUND_INFO_PROVENANCE: Provenance = {
  capturedAt: '2026-09-24',
  sourceSystem: 'EWS',
  captureFiles: [S2('S2_73_자펀드_정보_관리.html'), S2('S2_74_자펀드_정보_등록.html'), S2('S2_75_자펀드_정보_수정.html')],
};

/** 공동GP여부 배지 — 원문 cogpTag(): 'O'·'Y' = `.tag g`(success), 그 외('X') = `.tag n`(muted) */
const COGP_TONES = { O: 'success', Y: 'success', X: 'muted' } as const;

/** S2_73 목록 — 투자기간(시작/종료)·투자비율(%)(1~4년차) 2단 헤더. 원문 td 기본 정렬은 우측(text-align:right) */
export const FUND_INFO_TABLE: TableMeta = {
  id: 'fundInfo',
  cols: [
    { key: 'no', label: 'No', kind: 'number', align: 'center', width: 64, flex: 0 },
    { key: 'y', label: '사업연도', kind: 'center' },
    { key: 'ch', label: '차수', kind: 'center', width: 64 },
    { key: 'otype', label: '운용사유형', kind: 'center' },
    { key: 'gp', label: '운용사', kind: 'text' },
    { key: 'fn', label: '자펀드', kind: 'text' },
    { key: 'rd', label: '조합등록일자', kind: 'date' },
    { key: 'cogp', label: '공동GP여부', kind: 'badge', tones: COGP_TONES },
    { key: 'ps', label: '시작', kind: 'date', group: '투자기간' },
    { key: 'pe', label: '종료', kind: 'date', group: '투자기간' },
    { key: 'must', label: '의무투자', kind: 'number' },
    { key: 'small', label: '일정규모이하투자', kind: 'number' },
    { key: 'r1', label: '1년차', kind: 'number', group: '투자비율(%)' },
    { key: 'r2', label: '2년차', kind: 'number', group: '투자비율(%)' },
    { key: 'r3', label: '3년차', kind: 'number', group: '투자비율(%)' },
    { key: 'r4', label: '4년차', kind: 'number', group: '투자비율(%)' },
    { key: 'nia', label: '미투자자산운용비율(상장주식, %)', kind: 'number' },
  ],
  /* 원문 `var DATA` — "표본 데이터 (JSON 실값 1건)" */
  rows: [
    { id: 'fi-1', no: 1, y: '2010', ch: '1', otype: '벤처투자회사', gp: '미시간벤처캐피탈주식회사', fn: '미시간글로벌 식품산업투자조합',
      rd: '2011-04-08', cogp: 'X', ps: '2011-04-08', pe: '2014-04-07', must: '60', small: '12', r1: '0', r2: '40', r3: '60', r4: '80', nia: '10' },
  ],
  empty: '조회 내역이 없습니다.',
};

/** 검색조건 `구분` 선택지(원문 `<select id="f-gu">` — '전체' 없음, 기본 '운용사') */
export const FUND_INFO_KINDS = ['운용사', '자펀드'] as const;
export type FundInfoKind = typeof FUND_INFO_KINDS[number];
/** 원문 `LISTS` — 구분 → 운용사/자펀드 선택지('전체' 제외). 행 필터 키: 운용사=gp · 자펀드=fn */
export const FUND_INFO_LISTS: Record<FundInfoKind, readonly string[]> = {
  운용사: ['미시간벤처캐피탈주식회사'],
  자펀드: ['미시간글로벌 식품산업투자조합'],
};
export const FUND_INFO_KEY: Record<FundInfoKind, string> = { 운용사: 'gp', 자펀드: 'fn' };

/** 팝업 자펀드 선택지 — 원문 FUND_OPTS("확정된 실 자펀드 표본(S2_73 그리드·S2_75 실데이터)") */
export const FUND_OPTS = ['미시간글로벌 식품산업투자조합', '세종농식품R&D사업화투자조합'] as const;
/** 팝업 운용사구분 선택지 — 원문 GPTYPES("S2_71 등록 팝업 확정값 재사용") */
export const GP_TYPES = ['벤처투자회사', '증권회사', '여신전문금융회사', '자산운용사', '은행', '보험사'] as const;
/** 결산월 선택지 — 원문 monthOpts(): 1~12 */
export const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));
/** 한도관리 지표구분 — 원문 "M열이 의무투자비율 단일값" 고정 라벨 */
export const LIMIT_INDICATOR = '의무투자비율';
/** 원문 빈 표 문구(EMPTY_LIMIT · EMPTY_GP) */
export const MODAL_EMPTY = '조회 내역이 없습니다.';

/* ─────────────── 팝업 폼 모델 ─────────────── */
export interface LimitRow { rate: string; start: string; end: string }
export interface GpRow { id: string; rep: boolean; name: string; bizno: string; otype: string; month: string; code: string }
export interface FundInfoForm { fund: string; years: string; start: string; end: string; month: string; limits: LimitRow[]; gps: GpRow[] }

let seq = 0;
export const newGpRow = (p: Partial<GpRow> = {}): GpRow => ({ id: `gp-${++seq}`, rep: false, name: '', bizno: '', otype: '', month: '', code: '', ...p });

/** 등록 팝업 초기값 — 원문 openReg(): 전 필드 빈 값, 한도관리·운용사 그리드 모두 빈 상태("사용자 제공 실제 화면 캡처 기준") */
export const emptyForm = (): FundInfoForm => ({ fund: '', years: '', start: '', end: '', month: '', limits: [], gps: [] });

/** 수정 팝업 초기값 — 원문 S2_73 openEditFund(r) 그대로:
    자펀드=r.fn · 투자기간 = (r.years 없음 → 빈 값) r.ps ~ r.pe · 결산월 = r.month(없음 → 빈 값) ·
    한도관리 = limitRow(r.must, r.ps, r.pe) 1행 · 운용사 = [{ rep:true, name:r.gp, otype:r.otype }] 1행(사업자번호·결산월·코드 빈 값).
    원문 행에 없는 값은 채우지 않는다(S2_75 단독 화면의 세종/로이 표본은 목록에 없는 행이라 쓰지 않는다). */
export const formFromRow = (r: Row): FundInfoForm => ({
  fund: String(r.fn ?? ''),
  years: '',
  start: String(r.ps ?? ''),
  end: String(r.pe ?? ''),
  month: '',
  limits: [{ rate: String(r.must ?? ''), start: String(r.ps ?? ''), end: String(r.pe ?? '') }],
  gps: [newGpRow({ rep: true, name: String(r.gp ?? ''), otype: String(r.otype ?? '') })],
});
