import { describe, it, expect } from 'vitest';
import { parsePageSchema } from './types';

const valid = {
  route: '연도별투자현황', title: '연도별 투자현황', kind: 'list', entity: '모태펀드',
  columns: [{ key: 'fund', label: '모펀드', type: 'text' }],
  fields: [{ key: 'fund', label: '모펀드', control: 'text' }],
  provenance: { capturedAt: '2026-05-28', sourceSystem: 'BRIEF', captureFile: 'image1.png' },
};

describe('parsePageSchema', () => {
  it('유효 스키마를 통과시킨다', () => {
    expect(parsePageSchema(valid).route).toBe('연도별투자현황');
  });
  it('미지원 CellType을 거부한다', () => {
    expect(() => parsePageSchema({ ...valid, columns: [{ key: 'x', label: 'X', type: 'bogus' }] })).toThrow();
  });
  it('provenance 누락을 거부한다', () => {
    const { provenance, ...noProv } = valid as any;
    expect(() => parsePageSchema(noProv)).toThrow();
  });
});
