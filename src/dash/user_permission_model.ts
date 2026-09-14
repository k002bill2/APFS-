/* 사용자 권한 관리 — 권한 매트릭스 순수 모델(UI 없음).
   목업 S0_102 `model`(key → {v,d,c,a})·`refreshChecks`(행/중/대/열/전체 집계)·change 핸들러를 불변 함수로 이식한다.
   ⚠ 실제 인가가 아니다 — 백엔드/RBAC 없이 화면 로컬 더미 상태만 바꾼다(브리프). 체크 상태는 UI 프로토타입 표현일 뿐. */
import type { MenuRow } from './admin_menu_tree';
import { isLeaf, rowById } from './admin_menu_tree';

export const PERM_KEYS = ['v', 'd', 'c', 'a'] as const;
export type PermKey = typeof PERM_KEYS[number];
/* 목업 열 머리글 원문 그대로 */
export const PERM_LABELS: Record<PermKey, string> = { v: '조회', d: '인쇄/다운로드', c: '등록/수정', a: '관리자' };

export type PermCell = Readonly<Record<PermKey, boolean>>;
/** leafId → 4기능 셀. 없는 리프는 전부 false 로 본다. */
export type PermMap = Readonly<Record<string, PermCell>>;
export const EMPTY_CELL: PermCell = Object.freeze({ v: false, d: false, c: false, a: false });

export type Tri = 'all' | 'some' | 'none';

/** 매트릭스 한 행(리프 메뉴) — 대/중/소 라벨과 프로그램ID. 대시보드처럼 상위가 없는 리프는 중메뉴 '-'(목업 `mid:'-'`). */
export interface MatrixRow { leafId: string; daeId: string; dae: string; midId: string; mid: string; name: string; pid: string }

/** 메뉴 행 → 매트릭스 행(트리 순서 유지). 대분류 없이 홀로 있는 리프(대시보드)는 대=자기 자신, 중='-'. */
export function matrixRows(rows: readonly MenuRow[]): MatrixRow[] {
  const out: MatrixRow[] = [];
  for (const r of rows) {
    if (!isLeaf(rows, r)) continue;
    if (r.lvl === 1) { out.push({ leafId: r.id, daeId: r.id, dae: r.name, midId: r.id, mid: '-', name: r.name, pid: r.pid }); continue; }
    const mid = r.lvl === 3 ? rowById(rows, r.parentId) : undefined;
    const dae = rowById(rows, (mid ?? r).parentId);
    out.push({ leafId: r.id, daeId: dae?.id ?? r.id, dae: dae?.name ?? '-', midId: mid?.id ?? `${dae?.id ?? r.id}:-`, mid: mid?.name ?? '-', name: r.name, pid: r.pid });
  }
  return out;
}

export const cellOf = (perms: PermMap, leafId: string): PermCell => perms[leafId] ?? EMPTY_CELL;

/** 여러 리프 × 여러 기능을 한 번에 on/off — 새 맵을 돌려주며 입력은 그대로. */
export function setCells(perms: PermMap, leafIds: readonly string[], keys: readonly PermKey[], on: boolean): PermMap {
  const next: Record<string, PermCell> = { ...perms };
  for (const id of leafIds) {
    const cur = cellOf(perms, id);
    const cell: Record<PermKey, boolean> = { ...cur };
    for (const k of keys) cell[k] = on;
    next[id] = cell;
  }
  return next;
}

/** 지정 리프×기능 집합의 체크 상태 — 전부/일부/없음(indeterminate 표현의 근거). 대상이 비면 'none'. */
export function triOf(perms: PermMap, leafIds: readonly string[], keys: readonly PermKey[]): Tri {
  const total = leafIds.length * keys.length;
  if (total === 0) return 'none';
  let on = 0;
  for (const id of leafIds) { const c = cellOf(perms, id); for (const k of keys) if (c[k]) on++; }
  return on === total ? 'all' : on > 0 ? 'some' : 'none';
}

/** 켜진 셀 수(요약 캡션용) */
export function countOn(perms: PermMap, leafIds: readonly string[]): number {
  let n = 0;
  for (const id of leafIds) { const c = cellOf(perms, id); for (const k of PERM_KEYS) if (c[k]) n++; }
  return n;
}

/** 조건에 맞는 리프에 기능 집합을 켠 맵 — 데모 권한 시드용(대분류 id·기능 지정) */
export function grant(perms: PermMap, rows: readonly MatrixRow[], pick: (r: MatrixRow) => boolean, keys: readonly PermKey[]): PermMap {
  return setCells(perms, rows.filter(pick).map((r) => r.leafId), keys, true);
}

/** 권한 명칭 중복 — 앞뒤 공백 제거 + NFC 정규화 후 비교(한글 자모 분리 입력 대비). 수정 중인 자기 자신은 `excludeId` 로 제외. */
export function permNameTaken(rows: readonly { id: string; name: string }[], name: string, excludeId?: string): boolean {
  const norm = (s: string) => s.trim().normalize('NFC');
  const n = norm(name);
  return rows.some((r) => r.id !== excludeId && norm(r.name) === n);
}
