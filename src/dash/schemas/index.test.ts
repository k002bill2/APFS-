import { describe, it, expect } from 'vitest';
import { resolveSchema, buildRegistry, ALL_SCHEMAS } from './index';
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

describe('상세 팝업(detail) 옵트인 불변식', () => {
  /* detailWhen 은 **행에 실제로 나타나는 값**이어야 링크가 뜬다. makeRows 는 select 필드의 options 를
     순환 시드하므로, detailWhen 이 그 options(또는 sample 행의 값)에 없으면 링크가 조용히 안 나타난다.
     실제 함정: 원문 목업 표기는 '월간보고서'인데 스키마 도메인은 '월간보고'다 — 원문 문자열을 그대로
     detailWhen 에 넣으면 아무 행도 매칭되지 않는다(에러도 안 난다). */
  it('detailWhen 은 해당 컬럼의 값 도메인(select options 또는 sample)에 존재한다', () => {
    for (const s of ALL_SCHEMAS) {
      for (const c of s.columns) {
        if (!c.detail || c.detailWhen == null) continue;
        const opts = s.fields.find((f) => f.key === c.key)?.options ?? [];
        const inSample = (s.sample ?? []).some((r) => String(r[c.key]) === c.detailWhen);
        expect(opts.includes(c.detailWhen) || inSample, `${s.route}.${c.key} detailWhen='${c.detailWhen}'`).toBe(true);
      }
    }
  });

  it('정기보고는 보고구분 컬럼에 월간보고 상세를 선언한다', () => {
    const col = resolveSchema('정기보고').columns.find((c) => c.key === 'reportType');
    expect(col?.detail).toBe('monthlyReport');
    expect(col?.detailWhen).toBe('월간보고');
  });
});
