/* 조기경보 결과정보 관리 — 순수 로직(React/AG Grid 무의존, 유닛 테스트 대상). 페이지: ew_result_manage.tsx */

/** 전월 'YYYY-MM' — 연 경계(2026-01 → 2025-12) 처리. 형식이 아니면 '' */
export function prevYm(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || '');
  if (!m) return '';
  let y = Number(m[1]); let mo = Number(m[2]) - 1;
  if (mo < 1) { mo = 12; y -= 1; }
  return `${y}-${String(mo).padStart(2, '0')}`;
}
