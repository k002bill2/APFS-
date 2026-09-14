/* 정렬 자동 재배치 — 현행시스템 목업 공통 스크립트 `APFS.reseqSiblings`의 불변(immutable) 이식.
   같은 부모(형제 그룹) 안에서 한 항목의 정렬번호를 바꾸면 나머지가 밀려 1..n 연속 번호가 되도록 다시 매긴다.
   메뉴 관리(같은 레벨·같은 상위메뉴)와 공통코드 관리(같은 코드구분)가 공유한다.

   원문 동작: rest = 형제(이동 항목 제외)를 ord 오름차순 정렬 → newOrd-1 위치에 삽입(범위 클램프) → 1부터 재번호.
   여기서는 입력을 변경하지 않고 `id → 새 ord` 맵을 돌려주며, 적용은 `applyReseq`가 새 배열로 만든다. */

export interface Ordered { id: string; ord: number }

/** 형제 목록(이동 항목 포함) 안에서 `movedId`를 `newOrd` 위치로 옮긴 뒤의 `id → ord` 맵.
    이동 항목이 목록에 없으면 빈 맵(no-op). newOrd는 정수로 내림(원문 `|0`), 1 미만은 1, 형제 수 초과는 맨 뒤. */
export function reseqSiblings<T extends Ordered>(siblings: readonly T[], movedId: string, newOrd: number): Map<string, number> {
  const out = new Map<string, number>();
  const moved = siblings.find((s) => s.id === movedId);
  if (!moved) return out;
  const rest = siblings.filter((s) => s.id !== movedId).sort((a, b) => a.ord - b.ord);
  const pos = Math.max(0, Math.min(rest.length, Math.trunc(newOrd) - 1));
  const next = [...rest.slice(0, pos), moved, ...rest.slice(pos)];
  next.forEach((s, i) => out.set(s.id, i + 1));
  return out;
}

/** 맵에 있는 행만 ord를 갱신한 새 배열. 값이 같은 행은 참조를 유지한다(불필요한 리렌더 방지). */
export function applyReseq<T extends Ordered>(rows: readonly T[], ords: ReadonlyMap<string, number>): T[] {
  return rows.map((r) => {
    const o = ords.get(r.id);
    return o == null || o === r.ord ? r : { ...r, ord: o };
  });
}
