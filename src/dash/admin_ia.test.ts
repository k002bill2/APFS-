import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { APFS_DATA } from './data';

/* 관리자 메뉴 IA — 사용자 이미지 정본(2026-09-14): 중분류 3 · 리프 8, 표시 순서 그대로, 전 리프 typed route(path) */
const admin = (APFS_DATA.MENU as any[]).find((m) => m.id === 'admin');
const EXPECTED: [group: string, leaves: [label: string, path: string][]][] = [
  ['사용자·권한 관리', [['권한관리', 'user-permission-manage'], ['사용자관리', 'user-manage'], ['사용자 초대(운용사)', 'user-invite-gp']]],
  ['시스템 관리', [['프로그램관리', 'program-manage'], ['메뉴관리', 'menu-manage'], ['코드관리', 'code-manage']]],
  ['감사·기록', [['권한 변경이력', 'permission-history'], ['감사로그', 'audit-log']]],
];

describe('관리자 메뉴 IA(이미지 정본)', () => {
  it('중분류 3개, 순서·라벨 고정', () => {
    expect(admin.children.map((g: any) => g.label)).toEqual(EXPECTED.map(([g]) => g));
    expect(admin.children.every((g: any) => g.sub === true)).toBe(true);
  });
  it('리프 8개 — 라벨·path 순서 고정, GenericListPage 폴백 없음(전 리프 path 보유)', () => {
    const leaves = admin.children.flatMap((g: any) => g.children.map((l: any) => [l.label, l.path]));
    expect(leaves).toEqual(EXPECTED.flatMap(([, ls]) => ls));
    expect(leaves.length).toBe(8);
  });
  it('ALLMENU(즐겨찾기·딥링크)에 8 route 가 모두 등록된다', () => {
    for (const [, ls] of EXPECTED) for (const [label, path] of ls) {
      const o = APFS_DATA.ALLMENU.find((x: any) => x.key === path);
      expect(o, path).toBeDefined(); expect(o.label).toBe(label); expect(o.cat).toBe('관리자');
    }
  });
  it('로그인(login)은 메뉴 리프가 아니다', () => { expect(APFS_DATA.ALLMENU.some((x: any) => x.key === 'login')).toBe(false); });
  it('8개 관리자 리프는 app의 명시 typed route 분기로 렌더된다', () => {
    const app = readFileSync(new URL('./app.tsx', import.meta.url), 'utf8');
    const routes = EXPECTED.flatMap(([, leaves]) => leaves.map(([, path]) => path));
    for (const route of routes) expect(app).toContain(`route === "${route}"`);
    expect(app).toContain('route === "login"');
    // login 조건과 LoginDemo 렌더가 한 분기로 묶여 있어야 한다(둘을 따로 찾으면 죽은 코드도 통과 — Codex P2).
    // 분기 형태는 if-return / 삼항 둘 다 허용 — #218이 저모션 MotionConfig 래핑을 위해 삼항으로 바꾸며 깨진 전례.
    expect(app).toMatch(/route === "login"\)?\s*(?:\?|return)\s*<LoginDemo onNav=\{onNav\} \/>/);
  });
});
