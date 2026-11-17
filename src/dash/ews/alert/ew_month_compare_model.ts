/* 조기경보 전월 비교 조회 — 순수 로직(데이터·변동 판정·필터·전월 계산·엑셀 AOA).
   출처: docs/mockups/02_조기경보/S2_63_조기경보_전월_데이터_비교_조회.html 하단 <script>
   (`DATA`·`ORDER`·`chg`·`chgKey`·`passFilter`·`prevMonth`)를 **그대로** 옮겼다.
   화면(`ew_month_compare.tsx`)과 분리한 이유: vitest 는 `src/dash` 하위 `.test.ts` 만 읽으므로
   판정 로직을 JSX 없는 모듈에 두어야 단위 테스트가 가능하다(선례 `audit_log_model.ts`). */
import { EW_BASE_YM, EW_PREV_YM, ewYm } from './ew_period';

export type Grade = '정상' | '주의' | '경고';
/* 변동 버킷 — 목업 범례 `data-k`(up=악화 · down=개선/해소 · same=지속). 신규는 버킷이 없다(null). */
export type ChgKey = 'up' | 'down' | 'same';

export const GRADES: Grade[] = ['정상', '주의', '경고'];
export const CHG_KEYS: ChgKey[] = ['up', 'down', 'same'];
/* 드로어·적용 칩 라벨 — 목업 범례 버튼 문구(`▲ 악화`·`▼ 개선/해소`·`= 지속`)에서 기호를 뗀 값 */
export const CHG_KEY_LABEL: Record<ChgKey, string> = { up: '악화', down: '개선·해소', same: '지속' };

export interface EwCompareRow {
  id: string;
  gu: string;         // 구분
  mf: string;         // 모펀드
  it: string;         // 항목
  gp: string;         // 운용사
  cur: Grade | '';    // 당월 등급('' = 당월 대상 아님)
  prev: Grade | '';   // 전월 등급('' = 전월 대상 아님)
}

/* 목업 `ORDER` — 정상0 < 주의1 < 경고2 */
const ORDER: Record<Grade, number> = { 정상: 0, 주의: 1, 경고: 2 };

/* 목업 `DATA` 실측 6행 그대로 — 운용사·항목 창작 금지 */
export const ROWS: EwCompareRow[] = [
  { id: 'ewmc-1', gu: '운용사 조기경보', mf: '농식품투자조합', it: '자본충실도',           gp: '(유)와프인베스트먼트', cur: '주의', prev: '주의' },
  { id: 'ewmc-2', gu: '운용사 조기경보', mf: '농식품투자조합', it: '자본충실도',           gp: '(유)그린농식품투자',  cur: '경고', prev: '주의' },
  { id: 'ewmc-3', gu: '운용사 조기경보', mf: '농식품투자조합', it: '부채비율(유동성비율)', gp: '(유)한들벤처스',      cur: '정상', prev: '주의' },
  { id: 'ewmc-4', gu: '운용사 조기경보', mf: '농식품투자조합', it: '영업용순자본비율',     gp: '(유)케이팜파트너스',  cur: '주의', prev: '' },
  { id: 'ewmc-5', gu: '자펀드 조기경보', mf: '농식품투자조합', it: '유동성비율',           gp: '(유)와프인베스트먼트', cur: '',     prev: '정상' },
  { id: 'ewmc-6', gu: '자펀드 조기경보', mf: '농식품투자조합', it: '자기자본이익률',       gp: '(유)에버그로우인베',  cur: '주의', prev: '주의' },
];

/* 기준년월별 비교 행(2026-11-17 사용자 지시 "기준년월이 표를 거르게" — ew_period.ts).
   ROWS = 기준 2026-07 vs 전월 2026-06(원문). 2026-06 기준 보기는 원문 행의 **전월 등급을 당월로** 올리고,
   그 전월(2026-05) 등급만 창작 더미(원문 아님)로 단다 → 두 보기가 2026-06 을 같은 등급으로 보여 준다(테스트가 단언).
   두 달 모두 대상이 아닌 행(2026-07 신규였던 ewmc-4)은 그 보기에 없다. 그 밖의 달은 0건. */
const GRADE_2026_05: Record<string, Grade | ''> = {
  'ewmc-1': '정상', 'ewmc-2': '주의', 'ewmc-3': '경고', 'ewmc-4': '', 'ewmc-5': '정상', 'ewmc-6': '',
};
export const PREV_VIEW_ROWS: EwCompareRow[] = ROWS
  .map((r) => ({ ...r, id: `${r.id}-${EW_PREV_YM}`, cur: r.prev, prev: GRADE_2026_05[r.id] ?? '' }))
  .filter((r) => r.cur || r.prev);

/** 기준년월(빈 값 = 원문 시점)의 비교 행 */
export function rowsForMonth(fYm: string): EwCompareRow[] {
  const ym = ewYm(fYm);
  if (ym === EW_BASE_YM) return ROWS;
  return ym === EW_PREV_YM ? PREV_VIEW_ROWS : [];
}

/* 목업 `chgKey` 그대로 — 신규는 범례에 없어 필터 대상 아님(null = 항상 표시), 해소는 down 버킷 */
export function chgKey(cur: Grade | '', prev: Grade | ''): ChgKey | null {
  if (cur && !prev) return null;
  if (!cur && prev) return 'down';
  if (cur && prev) {
    const d = ORDER[cur] - ORDER[prev];
    if (d > 0) return 'up';
    if (d < 0) return 'down';
    return 'same';
  }
  return null;
}

/* 목업 `chg()` 의 배지 문구 — 신규 / 해소 / ▲ 악화 / ▼ 개선 / = 지속 (둘 다 없으면 '') */
export function chgLabel(cur: Grade | '', prev: Grade | ''): string {
  if (cur && !prev) return '신규';
  if (!cur && prev) return '해소';
  if (cur && prev) {
    const d = ORDER[cur] - ORDER[prev];
    if (d > 0) return '▲ 악화';
    if (d < 0) return '▼ 개선';
    return '= 지속';
  }
  return '';
}

/* 목업 `passFilter` 그대로 — 변동 버킷이 꺼졌으면 탈락, 등급은 cur **또는** prev 가 켜진 등급이면 통과 */
export function passFilter(r: EwCompareRow, gradeOn: Record<Grade, boolean>, chgOn: Record<ChgKey, boolean>): boolean {
  const ck = chgKey(r.cur, r.prev);
  if (ck && !chgOn[ck]) return false;
  if (!r.cur && !r.prev) return true;
  return Boolean((r.cur && gradeOn[r.cur]) || (r.prev && gradeOn[r.prev]));
}

/* 당월≠전월 → 당월·전월 셀 음영(목업 `td.diff`) */
export const isDiff = (r: EwCompareRow) => r.cur !== r.prev;

/* 목업 `prevMonth` — 기준년월 -1개월, 1월이면 전년 12월로 롤오버. 빈 값·형식 불일치는 '' */
export function prevMonth(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || '');
  if (!m) return '';
  let y = parseInt(m[1], 10);
  let mo = parseInt(m[2], 10) - 1;
  if (mo < 1) { mo = 12; y -= 1; }
  return `${y}-${mo < 10 ? '0' : ''}${mo}`;
}

/* 필터 후 행 + 1..N 재번호 — 화면·엑셀 공용(화면=엑셀 불변식) */
export type NumberedRow = EwCompareRow & { no: number };
export function visibleRows(rows: EwCompareRow[], gradeOn: Record<Grade, boolean>, chgOn: Record<ChgKey, boolean>): NumberedRow[] {
  return rows.filter((r) => passFilter(r, gradeOn, chgOn)).map((r, i) => ({ ...r, no: i + 1 }));
}

/* 당월/전월 셀 텍스트 — `운용사명 등급`, 대상 아님이면 `–`(목업 `cell()`·`gradeTag()` 의 빈 표기). */
export function sideText(gp: string, g: Grade | ''): string {
  if (!g) return '–';
  return `${gp} ${g}`;
}

export const EXCEL_HEAD = ['No', '구분', '모펀드', '항목', '등급', '당월', '전월'];

/* 엑셀 AOA — 헤더 1행 + 본문. 모든 셀이 문자열/숫자(객체 금지). */
export function buildAoa(rows: NumberedRow[]): (string | number)[][] {
  const body = rows.map((r) => [
    r.no,
    r.gu,
    r.mf,
    r.it,
    chgLabel(r.cur, r.prev),
    sideText(r.gp, r.cur),
    sideText(r.gp, r.prev),
  ]);
  return [EXCEL_HEAD, ...body];
}
