import { describe, it, expect } from 'vitest';
import { ADMIN_PRIMARY_TABS, ADMIN_SYSTEM_TABS, adminTabState } from './admin_tabs_model';

describe('관리 컨텍스트 탭 정의(이미지 IA)', () => {
  it('1차 탭 = 사용자 권한 관리 | 시스템관리 (순서·라벨 고정)', () => {
    expect(ADMIN_PRIMARY_TABS.map((t) => t.label)).toEqual(['사용자 권한 관리', '시스템관리']);
  });
  it('2차 탭 = 프로그램관리 | 메뉴관리 | 코드관리 — 원본 표기(띄어쓰기 없음), 첫 탭이 프로그램관리', () => {
    expect(ADMIN_SYSTEM_TABS.map((t) => t.label)).toEqual(['프로그램관리', '메뉴관리', '코드관리']);
    expect(ADMIN_SYSTEM_TABS.map((t) => t.route)).toEqual(['program-manage', 'menu-manage', 'code-manage']);
  });
  it('시스템관리 1차 탭 클릭은 2차 첫 탭(프로그램관리) route 로 간다', () => {
    const sys = ADMIN_PRIMARY_TABS.find((t) => t.key === 'system')!;
    expect(sys.route).toBe(ADMIN_SYSTEM_TABS[0].route);
  });
  it('사용자 권한 관리 1차 탭 route', () => {
    expect(ADMIN_PRIMARY_TABS.find((t) => t.key === 'user')!.route).toBe('user-permission-manage');
  });
});

describe('adminTabState — route ↔ 활성 탭 동기화', () => {
  it('user-permission-manage → 1차 user 활성, 2차 없음', () => {
    expect(adminTabState('user-permission-manage')).toEqual({ primary: 'user', secondary: null });
  });
  it('시스템관리 3 route → 1차 system 활성 + 2차 자기 route', () => {
    for (const r of ['program-manage', 'menu-manage', 'code-manage']) {
      expect(adminTabState(r)).toEqual({ primary: 'system', secondary: r });
    }
  });
  it('관리 route 가 아니면 둘 다 null', () => {
    expect(adminTabState('main')).toEqual({ primary: null, secondary: null });
  });
});
