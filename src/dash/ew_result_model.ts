/* 조기경보 결과정보 관리 — 순수 로직(React/AG Grid 무의존, 유닛 테스트 대상). 페이지: ew_result_manage.tsx */

/** 전월 'YYYY-MM' — 연 경계(2026-01 → 2025-12) 처리. 형식이 아니면 '' */
export function prevYm(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || '');
  if (!m) return '';
  let y = Number(m[1]); let mo = Number(m[2]) - 1;
  if (mo < 1) { mo = 12; y -= 1; }
  return `${y}-${String(mo).padStart(2, '0')}`;
}

/** 선택 행의 O/X 플래그를 불변 갱신 — ids 밖의 행은 같은 참조 그대로(AG Grid 델타 갱신이 바뀐 행만 다시 그린다).
    value 가 함수면 행별 현재값으로 다음 값을 정한다(수정권한처리 = 토글). */
export function setFlag<R extends { id: string }, K extends keyof R>(
  rows: readonly R[], ids: readonly string[], key: K, value: R[K] | ((cur: R[K]) => R[K]),
): R[] {
  const hit = new Set(ids);
  return rows.map((r) => {
    if (!hit.has(r.id)) return r;
    const next = typeof value === 'function' ? (value as (cur: R[K]) => R[K])(r[key]) : value;
    return next === r[key] ? r : { ...r, [key]: next };
  });
}

/** 수정권한여부 토글 — O→X, X·미정(null)→O */
export const togglePerm = (cur: 'O' | 'X' | null): 'O' | 'X' => (cur === 'O' ? 'X' : 'O');
