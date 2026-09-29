import { describe, it, expect } from 'vitest';
import { schema } from './조합별_반기보고_현황';
import { parsePageSchema } from './types';

/* 원문 S5_119 반기보고 조회 — 헤더 순서·라벨·행 수를 못박는다.
   (레지스트리 전수 가드 sample_keys.test.ts 는 index.ts ALL 등록 후에야 이 스키마를 본다 — 등록 전에도 같은 불변식을 여기서 건다) */
const MOCKUP_HEADERS = [
  'No', '보고기준년월', '운용사코드', '운용사펀드코드', '조합명', '존속시작일자', '존속종료일자', '존속기간(년)',
  '투자종료일자', '투자기간(년)', '납입방법', '납입회수', '약정총액', '납입총액', '주요투자분야', '의무투자분야',
  '의무투자비율(%)', '우선투자분야', '우선투자비율(%)',
];

describe('조합별 반기보고 현황 스키마', () => {
  it('zod 검증을 통과한다', () => {
    expect(() => parsePageSchema(schema)).not.toThrow();
  });

  it('route·title 은 메뉴 리프 라벨 그대로다', () => {
    expect(schema.route).toBe('조합별 반기보고 현황');
    expect(schema.title).toBe('조합별 반기보고 현황');
  });

  it('컬럼은 원문 thead 19개와 순서·라벨이 같다', () => {
    expect(schema.columns.map((c) => c.label)).toEqual(MOCKUP_HEADERS);
  });

  it('원문엔 검색영역이 없다 — 필터 0개, 읽기전용(fields·행 선택 없음), 단위 토글 on', () => {
    expect(schema.filters).toEqual([]);
    expect(schema.fields).toEqual([]);
    expect(schema.hideRowSelection).toBe(true);
    expect(schema.unitToggle).toBe(true);
  });

  it('sample = 원문 DATA 2행, 키는 columns 와 정확히 같다', () => {
    const keys = schema.columns.map((c) => c.key).sort();
    expect(schema.sample).toHaveLength(2);
    for (const r of schema.sample!) expect(Object.keys(r).sort()).toEqual(keys);
  });

  it('금액은 원 단위 숫자, 값 없음은 "-"', () => {
    const [a, b] = schema.sample!;
    expect(a.commitTotal).toBe(1_000_000_000);
    expect(a.paidTotal).toBe(1_000_000_000);
    expect(b.commitTotal).toBe(3_000_000_000);
    expect(b.paidTotal).toBe('-');
    expect(schema.columns.filter((c) => c.type === 'amount').map((c) => c.key)).toEqual(['commitTotal', 'paidTotal']);
  });
});
