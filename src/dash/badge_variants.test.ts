/* 배지 변형 소스 가드 — 화면스타일가이드 v1.2 4.2.2(2026-11-05). 렌더 계약은 badge_variants_render.test.ts.
   ⚠ 소스를 읽는 가드는 test_src(readSrc/walkDash)로 찾는다 — 고정 경로 금지(파일 이동 시 조용히 0건 통과). */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { readSrc, walkDash } from './test_src';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

describe('TagBadge 톤 제한', () => {
  it('호출부는 info · primary · muted 톤만 쓴다(상태색 금지 — 등급 배지와 혼동 방지)', () => {
    const bad = walkDash()
      .filter((f) => /\.tsx$/.test(f))
      .filter((f) => /<TagBadge\b[^>]*tone=\{?["'](success|warning|danger|cyan)["']/.test(strip(readFileSync(f, 'utf8'))));
    expect(bad).toEqual([]);
  });
});

describe('조기경보 그리드 적용(가이드 4.2.2)', () => {
  it('구분·확정구분 셀은 TagBadge', () => {
    for (const f of ['violation_manage.tsx', 'workforce_manage.tsx', 'shareholder_manage.tsx', 'litigation_manage.tsx']) {
      const s = strip(readSrc(f));
      expect(s, f).toMatch(/const kindCell = [^\n]*<TagBadge\b/);
    }
    expect(strip(readSrc('litigation_manage.tsx'))).toMatch(/const confCell = [^\n]*<TagBadge\b/);
  });

  it('전월 비교 변동 셀은 TrendBadge', () => {
    expect(strip(readSrc('ew_month_compare.tsx'))).toMatch(/<TrendBadge\b/);
  });

  it('링크형 등급 배지는 손으로 만든 external 아이콘 대신 link prop', () => {
    for (const f of ['fund_early_warning.tsx', 'regular_report_manage.tsx']) {
      const s = strip(readSrc(f));
      expect(s, f).toMatch(/<StatusBadge\b[^>]*\blink\b/);
      expect(s, f).not.toMatch(/<Icon name="external"/);
    }
  });
});
