import { describe, expect, it } from 'vitest';
import { apportion } from './stat_apportion';

describe('apportion — 최대 잉여 배분', () => {
  it('정수 가중치 합 = target 이면 그대로(기본 상태 불변)', () => {
    expect(apportion([3, 0, 7, 4], 14)).toEqual([3, 0, 7, 4]);
  });
  it('몫의 합 = target, 비율대로', () => {
    const out = apportion([3, 1, 2, 4], 5);
    expect(out.reduce((a, b) => a + b, 0)).toBe(5);
    expect(out[3]).toBeGreaterThanOrEqual(out[1]);
  });
  it('용량(caps)을 넘지 않고, 넘친 몫은 다른 칸에 다시 준다(버리지 않는다)', () => {
    const out = apportion([10, 1, 1], 6, [2, 5, 5]);
    expect(out[0]).toBeLessThanOrEqual(2);
    expect(out.reduce((a, b) => a + b, 0)).toBe(6);
  });
  it('용량 합이 모자라면 용량 합까지만', () => {
    expect(apportion([1, 1], 10, [2, 3])).toEqual([2, 3]);
  });
  it('가중치가 모두 0 이면 0', () => {
    expect(apportion([0, 0], 3)).toEqual([0, 0]);
  });
});
