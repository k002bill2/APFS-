import { describe, it, expect } from 'vitest';
import { reseqSiblings, applyReseq } from './reseq';

const sib = [
  { id: 'a', ord: 1 }, { id: 'b', ord: 2 }, { id: 'c', ord: 3 }, { id: 'd', ord: 4 },
];

describe('reseqSiblings — 목업 APFS.reseqSiblings 동작 보존', () => {
  it('뒤 항목을 앞으로 옮기면 사이 항목이 한 칸씩 밀린다', () => {
    const m = reseqSiblings(sib, 'd', 2);
    expect([...m.entries()]).toEqual([['a', 1], ['d', 2], ['b', 3], ['c', 4]]);
  });
  it('범위를 넘는 정렬번호는 맨 뒤로 클램프된다', () => {
    const m = reseqSiblings(sib, 'a', 99);
    expect(m.get('a')).toBe(4);
    expect(m.get('b')).toBe(1);
  });
  it('1 미만·소수는 정수 1로 취급한다(원문 |0)', () => {
    expect(reseqSiblings(sib, 'c', 0).get('c')).toBe(1);
    expect(reseqSiblings(sib, 'c', 2.9).get('c')).toBe(2);
  });
  it('신규 항목(정렬번호 충돌)을 넣어도 1..n 연속 번호가 된다', () => {
    const withNew = [...sib, { id: 'n', ord: 2 }];
    const m = reseqSiblings(withNew, 'n', 2);
    expect([...m.values()].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5]);
    expect(m.get('n')).toBe(2);
    expect(m.get('b')).toBe(3);
  });
  it('이동 항목이 형제 목록에 없으면 빈 맵(no-op)', () => {
    expect(reseqSiblings(sib, 'zzz', 1).size).toBe(0);
  });
  it('입력 배열을 변경하지 않는다', () => {
    const copy = sib.map((s) => ({ ...s }));
    reseqSiblings(sib, 'd', 1);
    expect(sib).toEqual(copy);
  });
});

describe('applyReseq', () => {
  it('바뀐 행만 새 객체, 나머지는 참조 유지', () => {
    const rows = sib.map((s) => ({ ...s, name: s.id }));
    const next = applyReseq(rows, reseqSiblings(rows, 'd', 2));
    expect(next[0]).toBe(rows[0]);           // a: 1→1 유지
    expect(next[1]).not.toBe(rows[1]);       // b: 2→3
    expect(next.map((r) => r.ord)).toEqual([1, 3, 4, 2]);
  });
});
