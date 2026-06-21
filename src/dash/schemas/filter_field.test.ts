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
    const ff = resolveFilterField('사업년도', gongo);
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

  it('field-only 키(컬럼 부재) → columnKey 없음 (시드 안 됨 → 침묵 0건 방지)', () => {
    // gongo의 자펀드계정 필드(key:fundAccount)는 columns에 없음
    expect(resolveFilterField('자펀드계정', gongo).columnKey).toBeUndefined();
  });

  it('빈 옵션 select 필드 → text 격하 (빈 <select> 금지)', () => {
    const emptySelect = { ...gongo, fields: [{ key: 'x', label: '빈셀렉트', control: 'select' as const, options: [] }] };
    expect(resolveFilterField('빈셀렉트', emptySelect).kind).toBe('text');
  });
});
