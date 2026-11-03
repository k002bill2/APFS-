import { describe, it, expect } from 'vitest';
import type { ColDef, ColGroupDef } from 'ag-grid-community';
import { NO_COL_ID } from '../../aggrid_theme';
import { TRSM_COLS, PRCS_COLS, PRCS_X, flattenForExcel } from './integration_monitor_columns';

/* 제네릭 화살표(<T>(…))는 file_ext_rule 의 JSX 휴리스틱에 걸려 any 로 둔다 */
const leaves = (defs: (ColDef<any> | ColGroupDef<any>)[]): ColDef<any>[] =>
  defs.flatMap((d) => ('children' in d && d.children ? (d.children as ColDef<any>[]) : [d as ColDef<any>]));

describe('송수신이력 엑셀 헤더 — columnDefs 에서 자동 산출', () => {
  const { head1, head2, keys, merges } = flattenForExcel(TRSM_COLS);
  it('No 를 빼고 화면 리프 순서 그대로', () => {
    expect(keys).toEqual(['sn', 'trsmId', 'inst', 'ifId', 'trrc', 'mth', 'rsn', 'req', 'rsp', 'whol', 'scs', 'fail', 'cd']);
    expect(head1[0]).toBe('연계일련번호');
    expect(head1.length).toBe(keys.length);
    expect(head2.length).toBe(keys.length);
  });
  it("'건수' 그룹은 가로 병합, 나머지는 세로 병합", () => {
    expect(head1.slice(9, 12)).toEqual(['건수', '', '']);
    expect(head2.slice(9, 12)).toEqual(['전체', '성공', '실패']);
    expect(merges).toContainEqual({ s: { r: 0, c: 9 }, e: { r: 0, c: 11 } });
    expect(merges).toContainEqual({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
    expect(merges.length).toBe(11);   // 세로 10 + 그룹 1
  });
});

describe('연계처리이력 — 화면 = 엑셀', () => {
  it('엑셀 헤더가 화면 헤더(No 제외)와 같은 순서', () => {
    const screen = PRCS_COLS.filter((c) => c.colId !== NO_COL_ID).map((c) => c.headerName);
    expect(PRCS_X.map((x) => x.header)).toEqual(screen);
  });
});

describe('정렬 규약 — 수량형만 우측', () => {
  it('송수신 = 건수 3열, 처리이력 = 재처리만 rightAligned', () => {
    const right = (cols: ColDef<any>[]) => cols.filter((c) => c.type === 'rightAligned').map((c) => c.field);
    expect(right(leaves(TRSM_COLS))).toEqual(['whol', 'scs', 'fail']);
    expect(right(PRCS_COLS)).toEqual(['retry']);
  });
});
