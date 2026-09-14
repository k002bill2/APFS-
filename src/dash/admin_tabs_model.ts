/* 관리 컨텍스트 탭 — 순수 모델(UI 없음). 이미지 IA(사용자 지시, BRIEF "시스템관리 탭 구조") 그대로:
     1차: 사용자 권한 관리 | 시스템관리
     2차(시스템관리 활성 시): 프로그램관리 | 메뉴관리 | 코드관리   ← 원본(S0_105 .subtab) 표기: 띄어쓰기 없음
   route 가 SSOT — 활성 탭은 현재 route 에서 파생되고, 탭 클릭은 onNav(route) 로만 상태를 바꾼다(로컬 탭 state 없음).
   시스템관리 1차 탭은 2차 첫 탭(프로그램관리)으로 진입한다(이미지: 시스템관리 활성 + 프로그램관리 활성). */

export type AdminPrimaryKey = 'user' | 'system';

export interface AdminTab { readonly label: string; readonly route: string }
export interface AdminPrimaryTab extends AdminTab { readonly key: AdminPrimaryKey }

export const ADMIN_SYSTEM_TABS: readonly AdminTab[] = Object.freeze([
  { label: '프로그램관리', route: 'program-manage' },
  { label: '메뉴관리', route: 'menu-manage' },
  { label: '코드관리', route: 'code-manage' },
]);

export const ADMIN_PRIMARY_TABS: readonly AdminPrimaryTab[] = Object.freeze([
  { key: 'user', label: '사용자 권한 관리', route: 'user-permission-manage' },
  { key: 'system', label: '시스템관리', route: ADMIN_SYSTEM_TABS[0].route },
]);

export interface AdminTabState { primary: AdminPrimaryKey | null; secondary: string | null }

/** 현재 route → 활성 1차/2차 탭. 관리 route 가 아니면 둘 다 null(탭 바를 그리지 않는 게 맞다). */
export function adminTabState(route: string): AdminTabState {
  if (route === ADMIN_PRIMARY_TABS[0].route) return { primary: 'user', secondary: null };
  if (ADMIN_SYSTEM_TABS.some((t) => t.route === route)) return { primary: 'system', secondary: route };
  return { primary: null, secondary: null };
}
