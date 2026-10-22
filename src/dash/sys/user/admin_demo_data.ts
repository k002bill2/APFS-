/* 관리자 화면 공용 데모 데이터 — 목업 S0_1xx 공통 스크립트(`APFS.ORGS`·`ROLES`)의 APFS 대응. 실명·실기관 계정 아님.
   사용자관리·사용자 초대(운용사)·권한 변경이력·로그인 데모가 같은 기관·권한 명칭을 본다(한 곳에서만 바꾼다).
   ⚠ 실제 인증·RBAC 이 아니다 — 화면 로컬 더미 상태의 초기값일 뿐이다(브리프). */

export type OrgType = 'GP' | '수탁';
export interface Org { readonly id: string; readonly type: OrgType; readonly name: string }

/* 목업 ORGS 그대로(운용사 4 · 수탁 3) */
export const ORGS: readonly Org[] = Object.freeze([
  { id: 'KB', type: 'GP', name: 'KB증권' },
  { id: 'IMM', type: 'GP', name: 'IMM인베스트먼트' },
  { id: 'HTP', type: 'GP', name: '한국투자파트너스' },
  { id: 'YT', type: 'GP', name: '유안타인베스트먼트' },
  { id: 'NH', type: '수탁', name: '농협은행' },
  { id: 'IBK', type: '수탁', name: 'IBK기업은행' },
  { id: 'KDB', type: '수탁', name: 'KDB산업은행' },
]);
export const orgName = (id?: string): string => ORGS.find((o) => o.id === id)?.name ?? (id || '-');
export const orgsOf = (type: OrgType): Org[] => ORGS.filter((o) => o.type === type);

/* 권한(권한관리 데모 5건과 동일 명칭 — user_permission_manage DEMO) */
export const ROLE_NAMES = ['전산(관리자)', '투자팀', '운용사', '수탁', '부처'] as const;
export type RoleName = typeof ROLE_NAMES[number];

/* LNB 대분류 순서(data.ts MENU top) — 유효 메뉴 힌트의 정렬 기준 */
export const TOP_MENUS = ['대시보드', '투자자산관리', '조기경보', '자펀드 보고', '회계', '부처보고', '수탁보고', '관리자'] as const;

/* 권한별 조회 가능한 대분류 — 권한관리 데모 시드(SEED)와 같은 집합. 사용자 등록 모달의 "유효 메뉴(권한 합집합)" 힌트용 */
export const ROLE_MENUS: Readonly<Record<RoleName, readonly string[]>> = Object.freeze({
  '전산(관리자)': TOP_MENUS,
  '투자팀': ['대시보드', '투자자산관리', '조기경보', '자펀드 보고', '수탁보고', '부처보고'],
  '운용사': ['대시보드', '투자자산관리', '자펀드 보고'],
  '수탁': ['대시보드', '투자자산관리', '수탁보고'],
  '부처': ['대시보드', '부처보고'],
});

/** 권한 합집합의 유효 대분류 — LNB 순서로 정렬, 모르는 권한명은 무시 */
export function effectiveMenus(roles: readonly string[]): string[] {
  const on = new Set<string>();
  for (const r of roles) for (const m of ROLE_MENUS[r as RoleName] ?? []) on.add(m);
  return TOP_MENUS.filter((m) => on.has(m));
}
