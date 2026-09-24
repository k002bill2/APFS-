/* risk_grid 폭 규약 — compact 컬럼(No·순번·상태 배지)은 flex 에서 빠져 내용폭 고정,
   남는 폭은 나머지(텍스트·금액) 컬럼만 나눠 갖는다(2026-09-24 사용자 결정 — apfs-aggrid ⑩). */
import { describe, expect, it } from 'vitest';
import type { ColDef } from 'ag-grid-community';
import { buildColumnDefs, isCompactCol } from './risk_grid';
import { LEDGER_TABLE } from './brief_data';
import type { TableMeta } from './risk_table_meta';

const leaves = (t: TableMeta) => buildColumnDefs(t, t.rows, null) as ColDef[];
const byId = (t: TableMeta) => Object.fromEntries(leaves(t).map((d) => [d.colId, d]));

describe('risk_grid compact 컬럼', () => {
  it('등록원부관리: No·활성상태는 flex 없이 고정폭, 나머지는 flex', () => {
    const d = byId(LEDGER_TABLE);
    for (const k of ['no', 'active']) {
      expect(d[k].flex).toBeUndefined();
      expect(d[k].width).toBe(d[k].minWidth);
      expect(d[k].maxWidth).toBe(d[k].width);
    }
    for (const k of ['regno', 'nm', 'dur', 'amt', 'gp']) expect(d[k].flex).toBe(1);
  });
  it('활성상태는 원문 폭(120)보다 좁은 내용폭이다', () => {
    expect(byId(LEDGER_TABLE).active.width).toBeLessThan(120);
  });
  it('판정: No/순번 라벨·badge 는 compact, flex 명시가 자동 판정을 이긴다', () => {
    expect(isCompactCol({ key: 'x', label: '순번', kind: 'number' })).toBe(true);
    expect(isCompactCol({ key: 'x', label: '상태', kind: 'badge' })).toBe(true);
    expect(isCompactCol({ key: 'x', label: '상태', kind: 'badge', flex: 1 })).toBe(false);
    expect(isCompactCol({ key: 'x', label: '코드', kind: 'text', flex: 0 })).toBe(true);
    expect(isCompactCol({ key: 'x', label: '명칭', kind: 'text' })).toBe(false);
  });
  it('전 컬럼이 compact 면 flex 를 유지한다(우측 빈 거터 방지)', () => {
    const t: TableMeta = { id: 't', cols: [{ key: 'no', label: 'No', kind: 'number' }, { key: 's', label: '상태', kind: 'badge' }], rows: [] };
    expect(leaves(t).every((d) => d.flex === 1)).toBe(true);
  });
});

describe('compact 폭은 종류 하한(KIND_MIN)을 쓰지 않는다', () => {
  it('No 칸은 숫자 하한 84 가 아니라 원문 폭 64', () => {
    expect(byId(LEDGER_TABLE).no.width).toBe(64);
  });
});
