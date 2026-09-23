/* trust_manage_rows.ts — 관리형 화면 폼 ↔ 행 변환(순수 모듈, React import 금지 — node 테스트가 직접 쓴다).
   표 선언(TableMeta.cols[].kind)이 SSOT. */
import type { PageSchema } from './schemas/types';
import type { TableMeta, Row, Cell } from './risk_table_meta';

const NUMERIC = new Set(['number', 'amount']);

/** 행 → 폼 값(문자열 계약). null·'-'(값 없음 표식)는 빈 칸으로 */
export function formFromRow(schema: PageSchema, row?: Row): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of schema.fields) {
    const v = row?.[f.key];
    out[f.key] = v == null || v === '-' ? '' : String(v);
  }
  return out;
}

/** 폼 값 → 행 조각. 숫자·금액 칸은 Number, 빈 값은 null(→ 화면 '-', 엑셀 '-' — 0 으로 바꾸지 않는다) */
export function rowPatch(table: TableMeta, vals: Record<string, string>): Record<string, Cell> {
  const out: Record<string, Cell> = {};
  for (const [k, raw] of Object.entries(vals)) {
    const v = raw.trim();
    const col = table.cols.find((c) => c.key === k);
    if (!v) { out[k] = null; continue; }
    if (col && NUMERIC.has(col.kind)) { const n = Number(v.replace(/,/g, '')); out[k] = Number.isFinite(n) ? n : null; continue; }
    out[k] = v;
  }
  return out;
}

/** 신규 행 id·No — 기존 최대 No + 1 */
export function nextRow(rows: readonly Row[], prefix: string): { id: string; no: number } {
  const no = rows.reduce((m, r) => Math.max(m, typeof r.no === 'number' ? r.no : 0), 0) + 1;
  return { id: `${prefix}-new-${Date.now()}`, no };
}
