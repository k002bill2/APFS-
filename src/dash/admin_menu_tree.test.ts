import { describe, it, expect } from 'vitest';
import { APFS_DATA } from './data';
import { buildMenuRows, childrenOf, hasChildren, programsOf, pidTakenBy, utypeLabel } from './admin_menu_tree';

const rows = buildMenuRows();

describe('buildMenuRows — LNB MENU 평탄화 불변식', () => {
  it('레벨1 행 수 = MENU 최상위 항목 수', () => {
    expect(rows.filter((r) => r.lvl === 1).length).toBe(APFS_DATA.MENU.length);
  });
  it('메뉴ID·행 id는 유일하다', () => {
    expect(new Set(rows.map((r) => r.code)).size).toBe(rows.length);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });
  it('레벨>1 행의 상위메뉴는 실제 행이며 정확히 한 레벨 위다', () => {
    for (const r of rows.filter((x) => x.lvl > 1)) {
      const p = rows.find((x) => x.id === r.parentId);
      expect(p, `${r.name} 상위 없음`).toBeDefined();
      expect(p!.lvl).toBe(r.lvl - 1);
    }
  });
  it('같은 부모 안 정렬번호는 1..n 연속', () => {
    const parents = new Set(rows.map((r) => r.parentId));
    for (const pid of parents) {
      const ords = childrenOf(rows, pid).map((r) => r.ord);
      expect(ords).toEqual(ords.map((_, i) => i + 1));
    }
  });
  it('프로그램ID는 리프에만 있고 유일하다', () => {
    for (const r of rows) expect(Boolean(r.pid)).toBe(!hasChildren(rows, r.id));
    const pids = programsOf(rows).map((p) => p.pid);
    expect(new Set(pids).size).toBe(pids.length);
  });
  it('리프 수 = LNB ALLMENU 항목 수(즐겨찾기 딥링크 대상과 동일 집합)', () => {
    expect(programsOf(rows).length).toBe(APFS_DATA.ALLMENU.length);
  });
  it('단축번호는 프로그램ID가 있는 행에만 있다', () => {
    for (const r of rows) if (r.short) expect(r.pid).not.toBe('');
  });
  it('호출마다 새 배열(호출자 state가 서로 오염되지 않는다)', () => {
    const again = buildMenuRows();
    expect(again).not.toBe(rows);
    expect(again).toEqual(rows);
  });
});

describe('utypeLabel', () => {
  it('빈 배열은 공통', () => { expect(utypeLabel([])).toBe('공통'); });
  it('복수는 쉼표 연결', () => { expect(utypeLabel(['농금원', '수탁'])).toBe('농금원, 수탁'); });
});

describe('pidTakenBy — 프로그램ID 유일 불변식(메뉴 수정 모달 검증 근거)', () => {
  it('다른 행이 쓰는 프로그램ID면 그 행을 돌려준다', () => {
    const leaf = rows.find((r) => r.pid)!;
    expect(pidTakenBy(rows, leaf.pid)?.id).toBe(leaf.id);
  });
  it('자기 자신은 제외한다(수정 모드)', () => {
    const leaf = rows.find((r) => r.pid)!;
    expect(pidTakenBy(rows, leaf.pid, leaf.id)).toBeUndefined();
  });
  it('빈 프로그램ID는 충돌이 아니다', () => {
    expect(pidTakenBy(rows, '')).toBeUndefined();
  });
});
