import { describe, it, expect } from 'vitest';
import { UNITS, UNIT_DIV, DEFAULT_UNIT, isUnit, toUnit, formatUnit, amountHeader } from './unit';

describe('금액 단위 전환(원/백만원/억원)', () => {
  it('목업 토글 순서·값 도메인과 같다', () => {
    expect(UNITS).toEqual(['원', '백만원', '억원']);
    expect(DEFAULT_UNIT).toBe('원');
  });

  it('제수는 10⁰·10⁶·10⁸ 이다', () => {
    expect(UNIT_DIV).toEqual({ 원: 1, 백만원: 1_000_000, 억원: 100_000_000 });
  });

  it('원 단위는 원시값을 그대로 보존한다(반올림 손실 없음)', () => {
    expect(toUnit(1_314_563_418, '원')).toBe(1_314_563_418);
  });

  it('백만원·억원은 소수 2자리까지 반올림한다', () => {
    expect(toUnit(1_314_563_418, '백만원')).toBe(1314.56);
    expect(toUnit(1_314_563_418, '억원')).toBe(13.15);
    expect(toUnit(6_500_000_000, '억원')).toBe(65);
  });

  it('음수(적자)도 부호를 유지한다', () => {
    expect(toUnit(-193_116_752, '백만원')).toBe(-193.12);
  });

  it('서식은 천단위 구분 + 정수면 소수점 없음', () => {
    expect(formatUnit(1_314_563_418, '원')).toBe('1,314,563,418');
    expect(formatUnit(6_500_000_000, '억원')).toBe('65');
    expect(formatUnit(1_314_563_418, '백만원')).toBe('1,314.56');
  });

  it('엑셀 헤더는 컬럼 원문 단위 대신 선택 단위를 적는다(의미 불명 방지)', () => {
    expect(amountHeader('투자금액', '억원')).toBe('투자금액 (억원)');
    expect(amountHeader('투자금액', '원')).toBe('투자금액 (원)');
  });

  it('isUnit은 도메인 밖 문자열을 거른다(localStorage·URL 오염 방어)', () => {
    expect(isUnit('억원')).toBe(true);
    expect(isUnit('천원')).toBe(false);
  });
});
