/* AG Grid 2단 그룹헤더 접기 + ColumnSpec.note → 헤더 마커 배선.
   둘 다 `ColumnSpec` 이 이미 선언하고 있던 계약(types.ts `group`·`note`)인데 소비처가 없어
   **선언만 되고 화면에 안 나오던** 자리다(2026-09-15 확인). 여기서 한 번만 배선해
   GenericListPage·전용 페이지가 같이 쓴다.

   ⚠ 마커 컴포넌트는 새로 만들지 않는다 — `review_marker.tsx` 의 `reviewInnerHeader` 가 정본이다
     (apfs-grid "검토필요 마커" 절). `headerComponent`(전체 교체)가 아니라 `innerHeaderComponent`
     (라벨만 교체)를 쓰는 이유도 거기 있다: 전체를 갈아끼우면 정렬 화살표·메뉴가 함께 사라진다. */
import type { ColDef, ColGroupDef } from 'ag-grid-community';
import { reviewInnerHeader } from './review_marker';
import type { ColumnSpec } from './schemas/types';

/** ColumnSpec.note → 헤더 라벨 옆 마커. note 가 없으면 빈 객체(기존 헤더 그대로).
 *  제네릭 T 로 열어 둔다 — `Partial<ColDef>`(=ColDef<any>)를 ColDef<Row> 에 전개하면
 *  `tooltipField` 등 T 의존 프로퍼티가 string 으로 넓어져 타입이 깨진다.
 *  `suppressHeaderKeyboardEvent`: AG Grid 가 Tab 을 가로채면 헤더 안 마커 버튼에 키보드로
 *  도달할 수 없다(apfs-grid 규약 — regular_report_manage 와 동형). */
const HEADER_CACHE = new WeakMap<object, ReturnType<typeof reviewInnerHeader>>();

export function noteHeader<T>(note?: ColumnSpec['note']): Partial<ColDef<T>> {
  if (!note) return {};
  /* ⚠ 렌더마다 새 컴포넌트 타입을 만들면 AG Grid 가 헤더를 통째로 remount 한다(apfs-grid 규약:
     "모듈 스코프에 한 번만"). 여기서는 컬럼 정의가 useMemo 안에서 만들어지므로 note 객체
     (스키마의 리터럴 = 참조 고정)를 키로 캐시해 같은 컴포넌트 타입을 재사용한다. */
  let inner = HEADER_CACHE.get(note);
  if (!inner) { inner = reviewInnerHeader(note); HEADER_CACHE.set(note, inner); }
  return {
    headerComponentParams: { innerHeaderComponent: inner },
    suppressHeaderKeyboardEvent: (p) => p.event.key === 'Tab',
  };
}

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
