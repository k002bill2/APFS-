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
  it('컬럼의 attachFrom(첨부 칩 연결 필드)을 보존한다', () => {
    const withAttach = { ...valid, columns: [{ key: 'title', label: '제목', type: 'text', attachFrom: 'attachment' }] };
    expect(parsePageSchema(withAttach).columns[0].attachFrom).toBe('attachment');
  });
});
