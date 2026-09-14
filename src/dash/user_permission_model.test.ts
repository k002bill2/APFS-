import { describe, it, expect } from 'vitest';
import { buildMenuRows } from './admin_menu_tree';
import { matrixRows, setCells, triOf, countOn, grant, cellOf, EMPTY_CELL, PERM_KEYS, permNameTaken } from './user_permission_model';

const menu = buildMenuRows();
const mx = matrixRows(menu);

describe('matrixRows — 리프만, 대/중 라벨 결정', () => {
  it('매트릭스 행 수 = 리프(프로그램) 수', () => {
    expect(mx.length).toBe(menu.filter((r) => !menu.some((c) => c.parentId === r.id)).length);
  });
  it('레벨1 리프(대시보드)는 대=자기 자신·중=-', () => {
    const dash = mx.find((r) => r.name === '대시보드');
    expect(dash).toBeDefined();
    expect(dash!.dae).toBe('대시보드');
    expect(dash!.mid).toBe('-');
  });
  it('레벨3 리프는 대/중이 실제 상위 라벨', () => {
    const leaf = menu.find((r) => r.lvl === 3)!;
    const row = mx.find((r) => r.leafId === leaf.id)!;
    const mid = menu.find((r) => r.id === leaf.parentId)!;
    const dae = menu.find((r) => r.id === mid.parentId)!;
    expect(row.mid).toBe(mid.name);
    expect(row.dae).toBe(dae.name);
  });
});

describe('setCells / triOf / countOn — 불변 집계', () => {
  const ids = mx.slice(0, 3).map((r) => r.leafId);
  it('빈 맵은 none, 셀 없음은 EMPTY_CELL', () => {
    expect(triOf({}, ids, PERM_KEYS)).toBe('none');
    expect(cellOf({}, 'nope')).toBe(EMPTY_CELL);
  });
  it('일부만 켜면 some, 전부 켜면 all', () => {
    const a = setCells({}, [ids[0]], ['v'], true);
    expect(triOf(a, ids, PERM_KEYS)).toBe('some');
    expect(triOf(a, [ids[0]], ['v'])).toBe('all');
    const b = setCells(a, ids, PERM_KEYS, true);
    expect(triOf(b, ids, PERM_KEYS)).toBe('all');
    expect(countOn(b, ids)).toBe(12);
  });
  it('끄기는 지정 기능만 건드린다', () => {
    const all = setCells({}, ids, PERM_KEYS, true);
    const off = setCells(all, ids, ['a'], false);
    expect(triOf(off, ids, ['a'])).toBe('none');
    expect(triOf(off, ids, ['v', 'd', 'c'])).toBe('all');
  });
  it('입력 맵은 변경되지 않는다', () => {
    const base = setCells({}, [ids[0]], ['v'], true);
    const snapshot = JSON.stringify(base);
    setCells(base, ids, PERM_KEYS, true);
    expect(JSON.stringify(base)).toBe(snapshot);
  });
  it('대상이 비면 none', () => { expect(triOf({}, [], PERM_KEYS)).toBe('none'); });
});

describe('grant — 데모 시드', () => {
  it('대분류 조건으로 조회를 켜면 그 대분류 리프만 all', () => {
    const dae = mx[mx.length - 1].dae;
    const p = grant({}, mx, (r) => r.dae === dae, ['v']);
    const inDae = mx.filter((r) => r.dae === dae).map((r) => r.leafId);
    const outDae = mx.filter((r) => r.dae !== dae).map((r) => r.leafId);
    expect(triOf(p, inDae, ['v'])).toBe('all');
    expect(triOf(p, outDae, PERM_KEYS)).toBe('none');
  });
});

describe('permNameTaken — 권한 명칭 중복(공백·유니코드 정규화 비교)', () => {
  const list = [{ id: 'p-1', name: '투자팀' }, { id: 'p-2', name: '운용사' }];
  it('앞뒤 공백을 무시하고 같은 명칭이면 중복', () => { expect(permNameTaken(list, ' 투자팀 ')).toBe(true); });
  it('수정 중인 자기 자신은 제외', () => { expect(permNameTaken(list, '투자팀', 'p-1')).toBe(false); });
  it('다른 명칭은 통과', () => { expect(permNameTaken(list, '투자팀 (복사)')).toBe(false); });
});
