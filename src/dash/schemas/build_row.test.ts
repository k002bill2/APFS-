import { describe, it, expect } from 'vitest';
import { buildRow } from './build_row';
import { DEFAULT_SCHEMA } from './_default';

const schema = DEFAULT_SCHEMA('test');

describe('buildRow — 숫자 필드 타입 보호', () => {
  it('vals.amount/change가 문자열이어도 Row.amount/change는 number여야 한다', () => {
    const vals: Record<string, string> = { amount: '1234', change: '5.6', name: 'x', status: '정상' };
    const row = buildRow(vals, undefined, schema);
    expect(typeof row.amount).toBe('number');
    expect(row.amount).toBe(1234);
    expect(typeof row.change).toBe('number');
    expect(row.change).toBe(5.6);
  });

  it('빈 string amount/change → 0 (NaN 방지)', () => {
    const vals: Record<string, string> = { amount: '', change: '', name: 'y', status: '정상' };
    const row = buildRow(vals, undefined, schema);
    expect(row.amount).toBe(0);
    expect(row.change).toBe(0);
  });

  it('name이 trim되어야 한다', () => {
    const vals: Record<string, string> = { amount: '0', change: '0', name: '  test  ', status: '정상' };
    const row = buildRow(vals, undefined, schema);
    expect(row.name).toBe('test');
  });

  it('initial이 있으면 id/icon/color/trend를 상속한다', () => {
    const initial = { id: 'abc', icon: 'star', color: '#f00', name: 'old', category: 'cat', amount: 9, change: 1, status: '정상', trend: [1,2,3] };
    const vals: Record<string, string> = { amount: '5', change: '2', name: 'new', status: '완료' };
    const row = buildRow(vals, initial, schema);
    expect(row.id).toBe('abc');
    expect(row.icon).toBe('star');
    expect(row.color).toBe('#f00');
    expect(row.trend).toEqual([1,2,3]);
  });
});

describe('수정 저장 시 폼에 없는 원문 컬럼 보존', () => {
  /* `fields`(등록/수정 폼)는 columns 의 부분집합이다. 원문 리터럴 행이 실린 뒤로는 폼에 없는
     컬럼(no·운용사·자펀드·사업자번호·수정일시·업로드여부 …)이 **수정 저장 한 번에 사라졌다**
     — initial 을 병합하지 않고 vals 만 전개했기 때문(2026-09-16 Codex 5R P1). */
  const schema = { entity: '고용현황', fields: [], statusDomain: [] } as any;

  it('폼이 건드리지 않은 키가 그대로 남는다', () => {
    const initial = {
      id: 'R001', icon: 'layers', color: 'var(--chart-1)', trend: [1, 2],
      name: '', category: '고용현황', amount: 0, change: 0, status: '',
      no: 1, gp: 'NH투자증권', subFund: 'NH농식품밸류업투자조합', bizNo: '214-88-12345',
      firstInvestDate: '2024-03-15', updatedAt: '2026-07-10 14:22', isUploaded: '완료',
    } as any;
    const out = buildRow({ investee: '(주)그린팜테크', totalEmployees: '90' }, initial, schema);
    expect((out as any).no).toBe(1);
    expect((out as any).gp).toBe('NH투자증권');
    expect((out as any).subFund).toBe('NH농식품밸류업투자조합');
    expect((out as any).bizNo).toBe('214-88-12345');
    expect((out as any).firstInvestDate).toBe('2024-03-15');
    expect((out as any).updatedAt).toBe('2026-07-10 14:22');
    expect((out as any).isUploaded).toBe('완료');
    // 폼이 준 값은 덮어쓴다
    expect((out as any).investee).toBe('(주)그린팜테크');
    expect((out as any).totalEmployees).toBe('90');
    // id 는 initial 것을 유지
    expect(out.id).toBe('R001');
  });

  it('신규 등록(initial 없음)은 종전대로 동작한다', () => {
    const out = buildRow({ investee: '(주)신규' }, undefined, schema);
    expect(out.id).toBe('');
    expect((out as any).investee).toBe('(주)신규');
  });
});
