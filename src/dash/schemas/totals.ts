/* 스키마 합계(pinned bottom) 행 계산 — 순수 모듈(React import 금지). 소비처: generic_list.tsx(화면·엑셀) · 테스트.

   `PageSchema.totals` 를 **선언한 스키마만** 합계 행을 만든다(미선언 = null → pinned 행 없음, 종전 동작 불변).
   규칙 어휘는 typed 트랙 risk_table_meta.ts 와 같다: sum 합산 · dash '-' · 미지정 빈 칸(원문 colspan 라벨 영역),
   그리고 이름 붙은 파생 규칙 nextSeq(행 수 + 1). 라벨의 `{n}` = 합계 대상 행 수.

   합계 대상은 **필터 결과 행**이다 — 원문 tfoot 은 표시 행의 합이고, 필터로 줄면 합계도 따라 준다. */
import type { PageSchema } from './types';

export type TotalValue = string | number;
/** 합계 행 id — AG Grid getRowId·렌더러가 데이터 행과 가른다 */
export const TOTAL_ROW_ID = '__schema_total';

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function computeSchemaTotal(
  schema: Pick<PageSchema, 'columns' | 'totals'>,
  rows: readonly Record<string, unknown>[],
): Record<string, TotalValue> | null {
  const spec = schema.totals;
  if (!spec) return null;
  const labelKey = spec.labelKey ?? schema.columns[0]?.key;
  const out: Record<string, TotalValue> = { id: TOTAL_ROW_ID };
  for (const c of schema.columns) {
    const rule = spec.rules[c.key];
    if (rule === 'sum') out[c.key] = rows.reduce((a, r) => a + num(r[c.key]), 0);
    else if (rule === 'dash') out[c.key] = '-';
    else if (rule === 'nextSeq') out[c.key] = rows.length + 1;
    else out[c.key] = '';
  }
  if (labelKey) out[labelKey] = spec.label.replace('{n}', String(rows.length));
  return out;
}
