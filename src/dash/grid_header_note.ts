/* AG Grid 2단 그룹헤더 접기 — `ColumnSpec.group` 계약(types.ts)의 소비처.
   GenericListPage·전용 페이지가 같이 쓴다. */
import type { ColDef, ColGroupDef } from 'ag-grid-community';
import type { ColumnSpec } from './schemas/types';

/** **연속한** 같은 group 컬럼을 하나의 ColGroupDef 로 접는다(types.ts ColumnSpec.group 계약).
 *  group 이 없는 컬럼은 그대로 최상위에 남는다. 비연속 동명 그룹은 각각 별도 그룹이 된다 —
 *  원문 2단 헤더가 그렇게 생겼기 때문이고, 억지로 합치면 컬럼 순서가 원문과 달라진다. */
export function foldGroups<T>(cols: readonly ColDef<T>[], specs: readonly ColumnSpec[]): (ColDef<T> | ColGroupDef<T>)[] {
  const out: (ColDef<T> | ColGroupDef<T>)[] = [];
  cols.forEach((def, i) => {
    const group = specs[i]?.group;
    const last = out[out.length - 1];
    if (group && last && 'children' in last && last.headerName === group) { (last.children as ColDef<T>[]).push(def); return; }
    if (group) { out.push({ headerName: group, children: [def] }); return; }
    out.push(def);
  });
  return out;
}
