import { describe, it, expect } from 'vitest';
import { renderKind } from './dispatch';

describe('renderKind 분류 정책', () => {
  it('text/code/pii/미지 타입 → maskedText(일반 텍스트)', () => {
    for (const t of ['text','code','pii'] as const) expect(renderKind(t)).toBe('maskedText');
    expect(renderKind('bogus' as any)).toBe('maskedText');
  });
  it('amount/date/number → numeric', () => {
    for (const t of ['amount','date','number'] as const) expect(renderKind(t)).toBe('numeric');
  });
  it('status/rate/gp → 전용 렌더 분류', () => {
    expect(renderKind('status')).toBe('status');
    expect(renderKind('rate')).toBe('rate');
    expect(renderKind('gp')).toBe('gp');
  });
});
