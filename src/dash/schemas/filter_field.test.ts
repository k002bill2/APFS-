import { describe, it, expect } from 'vitest';
import { resolveFilterField, YEAR_OPTIONS } from './filter_field';
import { schema as gongo } from './자펀드_공고_정보관리';
import { schema as yearInv } from './연도별투자현황';
import { DEFAULT_SCHEMA } from './_default';

describe('resolveFilterField — 필터 라벨 → 컨트롤 타입 도출', () => {
  it('select 필드 → enum + 필드 options + columnKey', () => {
    const ff = resolveFilterField('정기/수시', gongo);
    expect(ff.kind).toBe('enum');
    expect(ff.options).toEqual(['정기', '수시']);
    expect(ff.columnKey).toBe('periodType');
  });

  it('number 필드 + 년도 라벨 → year + YEAR_OPTIONS + columnKey', () => {
    const ff = resolveFilterField('사업연도', gongo);
    expect(ff.kind).toBe('year');
    expect(ff.options).toEqual(YEAR_OPTIONS);
    expect(ff.columnKey).toBe('bizYear');
  });

  it('스키마(fields:[]) 무매칭 날짜형 라벨 → date, columnKey 없음(행필터 불가)', () => {
    const ff = resolveFilterField('기준일', yearInv);
    expect(ff.kind).toBe('date');
    expect(ff.columnKey).toBeUndefined();
  });

  it('도메인 없는 enum성 라벨 → text degrade (빈 select 금지)', () => {
    expect(resolveFilterField('계정구분', yearInv).kind).toBe('text');
    expect(resolveFilterField('조회기준', yearInv).kind).toBe('text');
  });

  it('카테고리 태그(값 도메인 없음) → tag (on/off 토글)', () => {
    const d = DEFAULT_SCHEMA('x');
    for (const f of ['투자성과', '리스크', '회계마감', '운용사보고'])
      expect(resolveFilterField(f, d).kind).toBe('tag');
  });

  it('field-only 키 + sample 부재 → columnKey 없음 (시드 안 됨 → 침묵 0건 방지)', () => {
    // 모펀드 필드(key:moeFund)는 select+options지만 columns에 없다. sample도 없으면 makeRows가 시드하지 않으므로
    // enum이되 행필터 불가(no-op+캡션)로 격하돼야 한다.
    const { sample, ...noSample } = gongo;
    const ff = resolveFilterField('모펀드', noSample);
    expect(ff.kind).toBe('enum');
    expect(ff.columnKey).toBeUndefined();
  });

  it('field-only 키 + sample에 값 존재 → columnKey 부여 (리터럴 행이 시드 경로)', () => {
    // 자펀드 공고는 sample 4건이 moeFund를 싣는다 → 컬럼이 아니어도 행을 실제로 거를 수 있다(2026-09-12)
    const ff = resolveFilterField('모펀드', gongo);
    expect(ff.kind).toBe('enum');
    expect(ff.columnKey).toBe('moeFund');
  });

  it("address 컨트롤 → text 필터로 격하 (주소는 열거형이 아니다)", () => {
    const withAddr = { ...gongo, fields: [{ key: 'address', label: '주소', control: 'address' as const, long: true }] };
    expect(resolveFilterField('주소', withAddr).kind).toBe('text');
  });

  it("month 컨트롤 → month 필터 (년도 라벨 휴리스틱이 없어도 텍스트로 격하되지 않는다)", () => {
    // '기준년월'에는 '년도/연도'가 없어 isYearLabel을 못 넘긴다 — control:'month' 분기가 없으면 자유 텍스트로 격하됐다.
    const withMonth = { ...gongo, fields: [{ key: 'baseYm', label: '기준년월', control: 'month' as const }] };
    const ff = resolveFilterField('기준년월', withMonth);
    expect(ff.kind).toBe('month');
    expect(ff.options).toEqual([]);
  });

  it('빈 옵션 select 필드 → text 격하 (빈 <select> 금지)', () => {
    const emptySelect = { ...gongo, fields: [{ key: 'x', label: '빈셀렉트', control: 'select' as const, options: [] }] };
    expect(resolveFilterField('빈셀렉트', emptySelect).kind).toBe('text');
  });
});
