import { describe, it, expect } from 'vitest';
import { parsePageSchema } from './types';
import { resolveSchema } from './index';
import { schema as s1 } from '../brief/mfund/annual_invest_status';
import { schema as s2 } from '../sfund/fxtmrpt/gp_monthly_report_status';
import { schema as s3 } from '../ffms/mfund/subfund_notice_manage';

describe('파일럿 스키마 zod 검증', () => {
  it('연도별투자현황 — parsePageSchema 통과', () => {
    expect(parsePageSchema(s1).route).toBe('annual-invest-status');
  });

  it('조합별 월간보고 현황 — parsePageSchema 통과', () => {
    expect(parsePageSchema(s2).route).toBe('gp-monthly-report-status');
  });

  it('자펀드 공고 정보관리 — parsePageSchema 통과', () => {
    expect(parsePageSchema(s3).route).toBe('subfund-notice-manage');
  });
});

describe('resolveSchema 파일럿 등록 확인', () => {
  it('연도별투자현황 — 추출 스키마 반환 (컬럼>0, route 일치)', () => {
    const s = resolveSchema('annual-invest-status');
    expect(s.route).toBe('annual-invest-status');
    expect(s.columns.length).toBeGreaterThan(0);
    expect(s.provenance.sourceSystem).toBe('BRIEF');
  });

  it('조합별 월간보고 현황 — 추출 스키마 반환 (컬럼>0, route 일치)', () => {
    const s = resolveSchema('gp-monthly-report-status');
    expect(s.route).toBe('gp-monthly-report-status');
    expect(s.columns.length).toBeGreaterThan(0);
    expect(s.provenance.sourceSystem).toBe('REPORT');
  });

  it('자펀드 공고 정보관리 — 추출 스키마 반환 (DEFAULT 아님, fields>0, SchemaField 컨트롤 실증)', () => {
    const s = resolveSchema('subfund-notice-manage');
    expect(s.route).toBe('subfund-notice-manage');
    expect(s.provenance.sourceSystem).toBe('FFMS');
    expect(s.fields.length).toBeGreaterThan(0);
    const controls = s.fields.map((f) => f.control);
    expect(controls).toContain('richtext'); // 공고내용 = Plate 에디터(textarea에서 전환)
    expect(controls).toContain('filepond'); // 첨부파일 = FilePond 드롭존(네이티브 file 입력에서 전환)
    expect(controls).toContain('radio');  // 모펀드·정기/수시·계정구분 = radio(2026-09-29 select에서 전환)
  });

  it('미등록 route는 여전히 DEFAULT 반환 (회귀 0)', () => {
    const s = resolveSchema('존재하지않는메뉴XYZ');
    expect(s.provenance.sourceSystem).toBe('DEFAULT');
  });
});
