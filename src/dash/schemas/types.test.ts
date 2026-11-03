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
  it('hideKpis(옵션 KPI 행 플래그)를 통과시킨다', () => {
    // 인터페이스↔zod 손수 이중정의 drift 가드 — KPI 배지 행 opt-in(2026-09-11)
    expect(parsePageSchema({ ...valid, hideKpis: true }).hideKpis).toBe(true);
  });
  it('hideRowSelection(행 선택 체크박스 제거)을 통과시킨다', () => {
    // 같은 drift 가드 — zod에 키가 없으면 .parse()가 조용히 버려 플래그가 런타임에서 증발한다(2026-09-12)
    expect(parsePageSchema({ ...valid, hideRowSelection: true }).hideRowSelection).toBe(true);
  });
  it('컬럼의 detail/detailWhen(상세 팝업 옵트인)을 보존한다', () => {
    // 같은 drift 가드 — zod에 키가 없으면 .parse()가 조용히 버려 링크가 런타임에서 증발한다(2026-09-12)
    const withDetail = { ...valid, columns: [{ key: 'reportType', label: '보고구분', type: 'text', detail: 'monthlyReport', detailWhen: '월간보고' }] };
    const parsed = parsePageSchema(withDetail).columns[0];
    expect(parsed.detail).toBe('monthlyReport');
    expect(parsed.detailWhen).toBe('월간보고');
  });
  it('미지원 detail 키를 거부한다', () => {
    expect(() => parsePageSchema({ ...valid, columns: [{ key: 'x', label: 'X', type: 'text', detail: 'bogusReport' }] })).toThrow();
  });
  it('컬럼의 attachFrom(첨부 칩 연결 필드)을 보존한다', () => {
    const withAttach = { ...valid, columns: [{ key: 'title', label: '제목', type: 'text', attachFrom: 'attachment' }] };
    expect(parsePageSchema(withAttach).columns[0].attachFrom).toBe('attachment');
  });
});


/* 2026-11-03 스키마 트랙 다중 선택 — 폼 토큰 'multiselect' · 필터 kind 'multi'. zod 에 없으면 .parse() 가 throw 하거나 조용히 버린다. */
describe('parsePageSchema — 다중 선택', () => {
  const ms = {
    ...valid,
    columns: [...valid.columns, { key: 'fund', label: '계정구분', type: 'text' }],
    fields: [{ key: 'fund', label: '계정구분', control: 'multiselect', options: ['농식품계정', '수산계정'] }],
    filters: ['계정구분'],
  };
  it('폼 control multiselect 를 통과시킨다', () => {
    expect(parsePageSchema(ms).fields[0].control).toBe('multiselect');
  });
  it('filterSpecs kind multi + 선택지 안의 def(JSON 배열) 를 통과시킨다', () => {
    const s = { ...ms, filterSpecs: { 계정구분: { kind: 'multi', key: 'fund', options: ['농식품계정', '수산계정'], def: '["수산계정"]' } } };
    expect(parsePageSchema(s).filterSpecs?.계정구분.kind).toBe('multi');
  });
  it('filterSpecs kind multi 의 def 가 선택지 밖이면 거부한다(조용한 무효 기본값 방지)', () => {
    const s = { ...ms, filterSpecs: { 계정구분: { kind: 'multi', key: 'fund', options: ['농식품계정'], def: '["농식품계정","없는값"]' } } };
    expect(() => parsePageSchema(s)).toThrow(/def not in options/);
  });
});
