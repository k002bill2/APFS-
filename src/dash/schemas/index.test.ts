import { describe, it, expect } from 'vitest';
import { resolveSchema, buildRegistry } from './index';
import { DEFAULT_SCHEMA } from './_default';

describe('resolveSchema', () => {
  it('미등록 route는 DEFAULT(오늘 동작) 스키마를 반환한다', () => {
    const s = resolveSchema('존재하지않는메뉴');
    expect(s.columns.map(c => c.key)).toEqual(DEFAULT_SCHEMA('x').columns.map(c => c.key));
    expect(s.title).toBe('존재하지않는메뉴');
  });
});

describe('buildRegistry', () => {
  it('중복 route는 빌드타임 에러를 던진다', () => {
    const base = DEFAULT_SCHEMA('a');
    expect(() => buildRegistry([{ ...base, route: 'dup' }, { ...base, route: 'dup' }])).toThrow(/Duplicate/);
  });
});
