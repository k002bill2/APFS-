import { describe, it, expect } from 'vitest';
import { parsePageSchema } from './types';
import { resolveSchema } from './index';
import { schema as s1 } from './연도별투자현황';
import { schema as s2 } from './조합별_월간보고_현황';
import { schema as s3 } from './자펀드_공고_정보관리';

describe('파일럿 스키마 zod 검증', () => {
  it('연도별투자현황 — parsePageSchema 통과', () => {
    expect(parsePageSchema(s1).route).toBe('연도별투자현황');
  });

  it('조합별 월간보고 현황 — parsePageSchema 통과', () => {
    expect(parsePageSchema(s2).route).toBe('조합별 월간보고 현황');
  });

  it('자펀드 공고 정보관리 — parsePageSchema 통과', () => {
    expect(parsePageSchema(s3).route).toBe('자펀드 공고 정보관리');
  });
});

describe('resolveSchema 파일럿 등록 확인', () => {
  it('연도별투자현황 — 추출 스키마 반환 (컬럼>0, route 일치)', () => {
    const s = resolveSchema('연도별투자현황');
    expect(s.route).toBe('연도별투자현황');
    expect(s.columns.length).toBeGreaterThan(0);
    expect(s.provenance.sourceSystem).toBe('BRIEF');
  });

  it('조합별 월간보고 현황 — 추출 스키마 반환 (컬럼>0, route 일치)', () => {
    const s = resolveSchema('조합별 월간보고 현황');
    expect(s.route).toBe('조합별 월간보고 현황');
    expect(s.columns.length).toBeGreaterThan(0);
    expect(s.provenance.sourceSystem).toBe('REPORT');
  });

  it('자펀드 공고 정보관리 — 추출 스키마 반환 (DEFAULT 아님, fields>0, SchemaField 컨트롤 실증)', () => {
    const s = resolveSchema('자펀드 공고 정보관리');
    expect(s.route).toBe('자펀드 공고 정보관리');
    expect(s.provenance.sourceSystem).toBe('FFMS');
    expect(s.fields.length).toBeGreaterThan(0);
    const controls = s.fields.map((f) => f.control);
    expect(controls).toContain('richtext'); // 공고내용 = Tiptap 에디터(textarea에서 전환)
    expect(controls).toContain('filepond'); // 첨부파일 = FilePond 드롭존(네이티브 file 입력에서 전환)
    expect(controls).toContain('select');
  });

  it('미등록 route는 여전히 DEFAULT 반환 (회귀 0)', () => {
    const s = resolveSchema('존재하지않는메뉴XYZ');
    expect(s.provenance.sourceSystem).toBe('DEFAULT');
  });
});
