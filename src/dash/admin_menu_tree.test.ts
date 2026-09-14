import { describe, it, expect } from 'vitest';
import { APFS_DATA } from './data';
import { buildMenuRows, childrenOf, hasChildren, programsOf, programCatalog, pidTakenBy, utypeLabel } from './admin_menu_tree';

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

describe('programCatalog — 프로그램 관리 목록(목업 S0_105 PROGRAMS 근거)', () => {
  it('항목 수 = 프로그램ID가 있는 리프 수(PROGRAMS 와 동일 집합·순서)', () => {
    const cat = programCatalog(rows);
    expect(cat.map((p) => p.pid)).toEqual(programsOf(rows).map((p) => p.pid));
  });
  it('연결 메뉴 경로는 상위 라벨을 › 로 잇고 마지막 조각이 프로그램명', () => {
    for (const p of programCatalog(rows)) { const seg = p.menuPath.split(' › '); expect(seg[seg.length - 1]).toBe(p.pname); }
  });
  it('프로그램관리 리프가 관리자 › 시스템 관리 아래 첫 항목이다(이미지 IA 리프 순서)', () => {
    const sys = rows.find((r) => r.name === '시스템 관리' && r.lvl === 2)!;
    expect(childrenOf(rows, sys.id).map((r) => r.name)).toEqual(['프로그램관리', '메뉴관리', '코드관리']);
    const p = programCatalog(rows).find((x) => x.pname === '프로그램관리')!;
    expect(p.menuPath).toBe('관리자 › 시스템 관리 › 프로그램관리');
  });
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
