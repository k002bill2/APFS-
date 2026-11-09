/* 출자/분배조회(농금원) 조회기준 분리 가드(2026-11-06 사용자 결정 — "둘로 나누기").
   목업 조회기준 select 6값(상세·요약·전체·출자·배분·기타)은 두 차원이 섞여 있었다:
   ① 표시 형태(상세=조합원 행+소계 / 요약=소계만) ② 거래구분(출자·배분·기타 — 그 거래만).
   '전체'는 '상세'와 결과가 똑같은 중복 값이었다.
   → 툴바 칩 = 표시 형태 2개(모드형, 전체 없음) · 거래구분 = 상세필터 select('전체'=빈 값) + 적용 칩. */
import { describe, it, expect } from 'vitest';
import { readSrc } from '../../test_src';
import { VIEWS, DEFAULT_VIEW, TX_FILTERS, txKeepsGroup, flatten, GROUPS } from './apfs_contribution_manage';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const SRC = strip(readSrc('apfs_contribution_manage.tsx'));

describe('조회기준 = 표시 형태만(툴바 칩)', () => {
  it('칩 값은 상세·요약 2개, 기본은 상세', () => {
    expect(VIEWS).toEqual(['상세', '요약']);
    expect(DEFAULT_VIEW).toBe('상세');
  });

  it('상세 = 조합원 행 + 그룹별 소계, 요약 = 소계만', () => {
    const members = GROUPS.reduce((n, g) => n + g.members.length, 0);
    const detail = flatten(GROUPS, '상세');
    expect(detail.filter((r) => r.kind === 'row')).toHaveLength(members);
    expect(detail.filter((r) => r.kind === 'subtotal')).toHaveLength(GROUPS.length);
    const summary = flatten(GROUPS, '요약');
    expect(summary).toHaveLength(GROUPS.length);
    expect(summary.every((r) => r.kind === 'subtotal')).toBe(true);
  });

  it('filterChips 는 VIEWS 로만 만든다(거래구분 값이 칩 줄에 다시 섞이지 않는다)', () => {
    expect(SRC).toMatch(/filterChips=\{VIEWS\.map\(/);
    expect(SRC).not.toMatch(/\bBASES\b/);
  });
});

describe('거래구분 = 상세필터 select + 적용 칩', () => {
  it('선택지는 출자·배분·기타(빈 값 = 전체)', () => {
    expect(TX_FILTERS).toEqual(['출자', '배분', '기타']);
  });

  it('빈 값은 전 그룹, 출자·배분은 그 거래만, 기타는 둘 다 아닌 그룹', () => {
    const keep = (f: Parameters<typeof txKeepsGroup>[0]) => GROUPS.filter((g) => txKeepsGroup(f, g)).map((g) => g.tx);
    expect(keep('')).toEqual(GROUPS.map((g) => g.tx));
    expect(keep('출자')).toEqual(GROUPS.filter((g) => g.tx === '출자').map((g) => g.tx));
    expect(keep('배분')).toEqual(GROUPS.filter((g) => g.tx === '배분').map((g) => g.tx));
    expect(keep('출자').length).toBeGreaterThan(0);   // 데모 데이터에 출자·배분이 둘 다 있어야 의미 있는 단언
    expect(keep('배분').length).toBeGreaterThan(0);
    expect(keep('기타')).toEqual([]);
  });

  it('드로어 필드 캡션과 적용 칩 label 이 같은 "거래구분"이다(칩 클릭 → 그 칸으로 이동 전제)', () => {
    expect(SRC).toMatch(/<DrawerField label="거래구분">/);
    expect(SRC).toMatch(/\{ label: '거래구분', value: fTx,/);
  });
});
