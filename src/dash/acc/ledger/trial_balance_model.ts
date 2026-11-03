/* 합계잔액시산표(ACC-014) 화면 전용 파생 — 집계 자체는 공용 ledger_model.trialBalance, 여기서는 표시·출력용 가공만.
   - 그리드 행(TbGridRow): No(행 순번) + 상세 진입 가능 여부(입력계정만 — 집계 행·파생 전기이월이익잉여금 행은 무반응).
   - 출력 양식(slide 14): 대분류(자산·부채·자본 + 손익) 구분별 표 · 최하위(입력) 계정만 · 구분별 합계.
     손익 구분: 데모 원장엔 손익 마감분개가 없어(ledger_data 규약) 손익 계정이 시산표에 남는다 → 출력에도 ■ 손익 표를 둬야
     구분 합계의 대차가 맞는다(설계서 샘플은 마감 후라 자산·부채·자본 3구분 — PM 확인).
   - 출력 쪽 나누기: 줄 단위(구분 머리 · 행 · 합계)로 끊고, 쪽이 바뀌어도 구분 머리를 다시 단다(설계서 "헤더 반복(확인 필요)"). */
import { RETAINED_PRIOR } from './ledger_data';
import type { TrialBalance, TrialBalanceRow } from './ledger_model';

export interface TbGridRow extends TrialBalanceRow { no: number; drillable: boolean }
export type TbAmounts = Pick<TrialBalanceRow, 'drBalance' | 'drTotal' | 'crTotal' | 'crBalance'>;

export function gridRows(tb: TrialBalance): TbGridRow[] {
  return tb.rows.map((r, i) => ({ ...r, no: i + 1, drillable: r.kind === 'leaf' && r.code !== RETAINED_PRIOR }));
}

export const PRINT_SECTIONS = ['자산', '부채', '자본', '손익'] as const;
export type PrintSection = typeof PRINT_SECTIONS[number];
export interface TbPrintSection { cls: PrintSection; rows: TrialBalanceRow[]; total: TbAmounts }

const sum = (rows: readonly TbAmounts[]): TbAmounts => ({
  drBalance: rows.reduce((s, r) => s + r.drBalance, 0), drTotal: rows.reduce((s, r) => s + r.drTotal, 0),
  crTotal: rows.reduce((s, r) => s + r.crTotal, 0), crBalance: rows.reduce((s, r) => s + r.crBalance, 0),
});

/** 구분별 표 — 최하위 계정만(상위 집계 행 제외), 행이 없는 구분은 뺀다 */
export function printSections(tb: TrialBalance): TbPrintSection[] {
  return PRINT_SECTIONS
    .map((cls) => { const rows = tb.rows.filter((r) => r.kind === 'leaf' && r.cls === cls); return { cls, rows, total: sum(rows) }; })
    .filter((s) => s.rows.length > 0);
}

export type TbPrintLine =
  | { kind: 'section'; cls: PrintSection; cont: boolean }
  | { kind: 'row'; cls: PrintSection; row: TrialBalanceRow }
  | { kind: 'total'; cls: PrintSection; total: TbAmounts };

/** 출력 줄 → 쪽. 쪽 첫 줄이 구분 머리가 아니면 '(계속)' 머리를 앞에 단다. 빈 결과도 1쪽 */
export function printPages(sections: readonly TbPrintSection[], perPage: number): TbPrintLine[][] {
  const lines: TbPrintLine[] = sections.flatMap((s) => [
    { kind: 'section', cls: s.cls, cont: false } as const,
    ...s.rows.map((row) => ({ kind: 'row', cls: s.cls, row }) as const),
    { kind: 'total', cls: s.cls, total: s.total } as const,
  ]);
  const pages: TbPrintLine[][] = [];
  let cur: TbPrintLine[] = [];
  for (const l of lines) {
    if (cur.length >= perPage) { pages.push(cur); cur = []; }
    if (!cur.length && l.kind !== 'section') cur.push({ kind: 'section', cls: l.cls, cont: true });
    /* 구분 머리가 쪽 마지막 줄로 홀로 남지 않게 다음 쪽으로 넘긴다 */
    if (l.kind === 'section' && cur.length >= perPage - 1 && cur.length) { pages.push(cur); cur = []; }
    cur.push(l);
  }
  if (cur.length) pages.push(cur);
  return pages.length ? pages : [[]];
}
