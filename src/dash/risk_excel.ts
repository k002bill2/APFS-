/* risk_excel.ts — TableMeta → SheetJS 워크시트(조기경보 기업정보·자펀드정보·가치평가 typed 화면 공용).
   AG Grid Community 엔 엑셀 내보내기가 없어 SheetJS(xlsx@0.18.5 **쓰기 전용** — XLSX.read 미사용)로 만든다(apfs-aggrid).

   계약
   - 화면 = 엑셀: 화면이 그리는 표를 **전부** 시트로 쓴다(표 N장 → 시트 N장). 본문은 화면과 같은 필터 결과 행 + 합계행.
   - 2단 헤더는 TableMeta 에서 자동 산출(그룹 가로 병합 · 비그룹 리프 세로 병합) — 손으로 적지 않는다.
   - 금액은 **화면에 보이는 단위**로 쓴다(schemas/unit.ts 엑셀 계약) — 그래서 금액 헤더에 단위를 붙인다(`amountHeader`).
   - 마스크 ON 이면 숫자 0 · 텍스트 '' (실값 비노출). 배지(상태 표식)·헤더·합계 라벨은 화면에서도 가리지 않으므로 그대로 둔다. */
import * as XLSX from 'xlsx';
import { toUnit, amountHeader } from './schemas/unit';
import type { Unit } from './schemas/unit';
import type { TableMeta, Row, ColMeta } from './risk_table_meta';
import { groupRuns, computeTotal } from './risk_table_meta';

/* 금액 헤더는 **항상** 단위를 단다 — 토글이 없는 화면(unit=null)도 값은 원 단위라, 헤더에 없으면 엑셀에서 단위가 모호해진다(Codex 3R P2) */
const headerOf = (c: ColMeta, unit: Unit | null) => (c.kind === 'amount' ? amountHeader(c.label, unit ?? '원') : c.label);

/** 헤더 행(1행 또는 2행)과 병합 범위 */
export function excelHeads(table: TableMeta, unit: Unit | null): { heads: string[][]; merges: XLSX.Range[] } {
  const runs = groupRuns(table.cols);
  const two = runs.some((r) => r.group);
  const h1: string[] = [];
  const h2: string[] = [];
  const merges: XLSX.Range[] = [];
  let c = 0;
  for (const run of runs) {
    if (run.group) {
      run.cols.forEach((col, i) => { h1.push(i === 0 ? run.group! : ''); h2.push(headerOf(col, unit)); });
      if (run.cols.length > 1) merges.push({ s: { r: 0, c }, e: { r: 0, c: c + run.cols.length - 1 } });
      c += run.cols.length;
    } else {
      h1.push(headerOf(run.cols[0], unit));
      h2.push('');
      if (two) merges.push({ s: { r: 0, c }, e: { r: 1, c } });
      c += 1;
    }
  }
  return { heads: two ? [h1, h2] : [h1], merges };
}

const decimals = (v: number) => (String(v).split('.')[1] ?? '').length;
const zFmt = (v: number) => (decimals(v) === 0 ? '#,##0' : `#,##0.${'0'.repeat(Math.min(decimals(v), 2))}`);

/** lead = 표 위에 먼저 쓸 행(팝업 맥락 kv 등). 있으면 한 줄 비우고 표를 이어 쓴다 */
export function tableSheet(full: TableMeta, rows: readonly Row[], unit: Unit | null, masked: boolean, lead: (string | number)[][] = []): XLSX.WorkSheet {
  const table = full.cols.some((c) => c.noExport) ? { ...full, cols: full.cols.filter((c) => !c.noExport) } : full;
  const { heads, merges: m0 } = excelHeads(table, unit);
  const off = lead.length ? lead.length + 1 : 0;
  const merges = m0.map((m) => ({ s: { r: m.s.r + off, c: m.s.c }, e: { r: m.e.r + off, c: m.e.c } }));
  const total = computeTotal({ ...table, rows: [...rows] });
  const body = [...rows, ...(total ? [total] : [])].map((r) => table.cols.map((c) => {
    const v = r[c.key];
    const isTotal = r === total;
    if (v == null) return '-';
    if (typeof v === 'number') {
      if (masked) return 0;
      if (c.kind === 'amount' && unit) return toUnit(v, unit);
      return c.fixed != null ? Number(v.toFixed(c.fixed)) : v;
    }
    if (masked && !isTotal && c.kind !== 'badge') return '';
    return v;
  }));
  const ws = XLSX.utils.aoa_to_sheet([...lead, ...(off ? [[]] : []), ...heads, ...body]);
  ws['!merges'] = merges;
  body.forEach((row, i) => row.forEach((v, j) => {
    if (typeof v !== 'number') return;
    const a = XLSX.utils.encode_cell({ r: off + heads.length + i, c: j });
    if (ws[a]) ws[a].z = zFmt(v);
  }));
  ws['!cols'] = table.cols.map((c) => ({ wch: c.kind === 'text' ? 26 : c.kind === 'amount' ? 18 : 14 }));
  return ws;
}

/** 시트명 — Excel 금지 문자(: \ / ? * [ ]) 제거 + 31자 제한 */
const sheetName = (s: string) => s.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31);

export function exportTables(fileName: string, sheets: { name: string; table: TableMeta; rows?: readonly Row[] }[], unit: Unit | null, masked: boolean): void {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) XLSX.utils.book_append_sheet(wb, tableSheet(s.table, s.rows ?? s.table.rows, unit, masked), sheetName(s.name));
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
