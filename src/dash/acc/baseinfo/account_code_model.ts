/* 계정과목 관리(ACC-001) — 순수 로직(필터·정렬·저장 검증 순서·상위계정 후보·논리삭제). 화면과 분리해 vitest 로 검증한다. */
import type { AccountClass, AccountRow } from './account_code_data';

/* ── 목록 ── */
export const sortByCode = (rows: readonly AccountRow[]): AccountRow[] => [...rows].sort((a, b) => a.code.localeCompare(b.code));

/** 상세필터 6개 — 빈 문자열 = 전체(비활성) */
export type AccountFilter = { name?: string; cls?: string; dc?: string; contra?: string; input?: string; use?: string };

export function filterAccounts(rows: readonly AccountRow[], f: AccountFilter): AccountRow[] {
  const kw = (f.name ?? '').trim().toLowerCase();
  return sortByCode(rows.filter((r) =>
    (!kw || r.name.toLowerCase().includes(kw))
    && (!f.cls || r.cls === f.cls)
    && (!f.dc || r.dc === f.dc)
    && (!f.contra || r.contra === f.contra)
    && (!f.input || r.input === f.input)
    && (!f.use || r.use === f.use)));
}

/* ── 저장 검증(설계서 slide12 ③ — 화면 필드 순서 위→아래, 첫 미충족만) ── */
export type AccountFormValues = {
  code: string; name: string; cls: string; dc: string; level: string; parentCode: string;
};
export type ValidationKey = 'code' | 'name' | 'cls' | 'dc' | 'level' | 'parent';
export type ValidationResult = { ok: true } | { ok: false; key: ValidationKey; msg: string };

export const DUP_CODE_MSG = '이미 존재하는 계정코드입니다.';
export const PARENT_CLS_MSG = '상위계정과목과 계정분류가 일치하지 않습니다.';
export const PARENT_LEVEL_MSG = '상위계정과목의 하위 레벨로 선택해 주세요.';

/** takenCodes: 등록 모드에서 중복으로 볼 코드(활성 + 논리삭제 — 논리삭제 행도 키를 점유한다). 수정 모드는 빈 집합.
    parent: parentCode 에 해당하는 상위 행 — 계층 무결성(계정분류 일치 → 레벨 = 상위 레벨 + 1)을 필수값 검증 뒤에 본다.
    순서는 화면 필드 위→아래(계정분류가 계정레벨·상위계정과목보다 위)라 분류 불일치를 먼저 알린다. */
export function validateAccount(v: AccountFormValues, takenCodes: ReadonlySet<string> = new Set(), parent?: Pick<AccountRow, 'cls' | 'level'> | null): ValidationResult {
  const code = v.code.trim();
  if (!code) return { ok: false, key: 'code', msg: '계정코드를 입력해 주세요.' };
  if (takenCodes.has(code)) return { ok: false, key: 'code', msg: DUP_CODE_MSG };
  if (!v.name.trim()) return { ok: false, key: 'name', msg: '계정과목명을 입력해 주세요.' };
  if (!v.cls) return { ok: false, key: 'cls', msg: '계정분류를 선택해 주세요.' };
  if (!v.dc) return { ok: false, key: 'dc', msg: '차대구분을 선택해 주세요.' };
  if (!v.level) return { ok: false, key: 'level', msg: '계정레벨을 선택해 주세요.' };
  if (v.level === '1') return { ok: true };
  if (!v.parentCode || !parent) return { ok: false, key: 'parent', msg: '상위계정과목을 선택해 주세요.' };
  if (parent.cls !== v.cls) return { ok: false, key: 'cls', msg: PARENT_CLS_MSG };
  if (Number(v.level) !== parent.level + 1) return { ok: false, key: 'parent', msg: PARENT_LEVEL_MSG };
  return { ok: true };
}

/** 폼에서 계정분류·계정레벨을 바꿨을 때 기존 상위가 여전히 맞는지(빈 값은 판정 보류) */
export function parentFits(parent: Pick<AccountRow, 'cls' | 'level'>, cls: string, level: string): boolean {
  if (level === '1') return false;
  if (cls && parent.cls !== cls) return false;
  if (level && parent.level !== Number(level) - 1) return false;
  return true;
}

/* ── 상위계정과목 검색(설계서 slide13) ── */
/** code 의 하위(자손) 코드 집합 — 수정 시 자기 자손을 상위로 고르면 순환이 생긴다 */
export function descendantCodes(rows: readonly AccountRow[], code: string): Set<string> {
  const out = new Set<string>();
  const walk = (p: string) => rows.forEach((r) => { if (r.parent === p && !out.has(r.code)) { out.add(r.code); walk(r.code); } });
  walk(code);
  return out;
}

/** level = 등록/수정 중인 계정의 레벨(후보는 그 바로 위 레벨만) */
export type ParentQuery = { keyword?: string; cls?: AccountClass | ''; selfCode?: string; level?: number };

/** 후보 = 입력여부 N(집계계정)·사용여부 Y만 · 자기 자신과 자손 제외 · 레벨 = level-1 · 계정분류 · 검색어(계정코드/계정과목명 부분일치). 계정코드 오름차순 */
export function parentCandidates(rows: readonly AccountRow[], q: ParentQuery): AccountRow[] {
  const kw = (q.keyword ?? '').trim().toLowerCase();
  const self = q.selfCode?.trim();
  const banned = self ? descendantCodes(rows, self) : new Set<string>();
  return sortByCode(rows.filter((r) =>
    r.input === 'N' && r.use === 'Y'
    && (q.level == null || r.level === q.level - 1)
    && r.code !== self && !banned.has(r.code)
    && (!q.cls || r.cls === q.cls)
    && (!kw || r.code.includes(kw) || r.name.toLowerCase().includes(kw))));
}

/** 상위계정 표시 문자열 "코드 계정명"(저장값은 코드) */
export const parentLabel = (r: Pick<AccountRow, 'code' | 'name'>): string => `${r.code} ${r.name}`;

/** 활성 하위 계정이 있는지 — 수정 시 계정레벨·계정분류·상위·입력 가능여부 잠금 판정 */
export const hasChildren = (rows: readonly AccountRow[], code: string): boolean => rows.some((r) => r.parent === code);

/** 삭제 차단 대상 — 선택 중 '선택에 포함되지 않은 활성 자손'이 있는 코드. 자손까지 모두 선택했으면 차단하지 않는다 */
export function blockedDeletes(rows: readonly AccountRow[], codes: readonly string[]): string[] {
  const sel = new Set(codes);
  return codes.filter((c) => [...descendantCodes(rows, c)].some((d) => !sel.has(d)));
}
export const DELETE_BLOCKED_MSG = '하위 계정이 있는 계정과목은 삭제할 수 없습니다.';

/* ── 논리삭제 — 목록에서 빼서 삭제이력으로 옮긴다. 최종수정자 = 삭제 처리자 ── */
export function logicalDelete(rows: readonly AccountRow[], deleted: readonly AccountRow[], codes: readonly string[], by: string): { rows: AccountRow[]; deleted: AccountRow[] } {
  const del = new Set(codes);
  const moved = rows.filter((r) => del.has(r.code)).map((r) => ({ ...r, updatedBy: by }));
  return { rows: rows.filter((r) => !del.has(r.code)), deleted: sortByCode([...deleted, ...moved]) };
}
