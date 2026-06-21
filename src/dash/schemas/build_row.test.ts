import { describe, it, expect } from 'vitest';
import { buildRow } from './build_row';
import { DEFAULT_SCHEMA } from './_default';

const schema = DEFAULT_SCHEMA('test');

describe('buildRow — 숫자 필드 타입 보호', () => {
  it('vals.amount/change가 문자열이어도 Row.amount/change는 number여야 한다', () => {
    const vals: Record<string, string> = { amount: '1234', change: '5.6', name: 'x', status: '정상' };
    const row = buildRow(vals, undefined, schema);
    expect(typeof row.amount).toBe('number');
    expect(row.amount).toBe(1234);
    expect(typeof row.change).toBe('number');
    expect(row.change).toBe(5.6);
  });

  it('빈 string amount/change → 0 (NaN 방지)', () => {
    const vals: Record<string, string> = { amount: '', change: '', name: 'y', status: '정상' };
    const row = buildRow(vals, undefined, schema);
    expect(row.amount).toBe(0);
    expect(row.change).toBe(0);
  });

  it('name이 trim되어야 한다', () => {
    const vals: Record<string, string> = { amount: '0', change: '0', name: '  test  ', status: '정상' };
    const row = buildRow(vals, undefined, schema);
    expect(row.name).toBe('test');
  });

  it('initial이 있으면 id/icon/color/trend를 상속한다', () => {
    const initial = { id: 'abc', icon: 'star', color: '#f00', name: 'old', category: 'cat', amount: 9, change: 1, status: '정상', trend: [1,2,3] };
    const vals: Record<string, string> = { amount: '5', change: '2', name: 'new', status: '완료' };
    const row = buildRow(vals, initial, schema);
    expect(row.id).toBe('abc');
    expect(row.icon).toBe('star');
    expect(row.color).toBe('#f00');
    expect(row.trend).toEqual([1,2,3]);
  });
});
