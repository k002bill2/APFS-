import { describe, it, expect } from 'vitest';
import { readSrc } from '../../test_src';

/* 2026-11-02 사용자 결정 — 메뉴마다 칩 1개씩(전체 + 7메뉴 = 8칩)은 과하다: 툴바 주 필터 칩을 두지 않고,
   개인정보 관련메뉴 조건은 상세필터 드로어 select 로 둔다(목업 첫 조회 조건이라 조건 자체는 유지). */
describe('개인정보 접속관리 — 툴바 메뉴 칩 없음', () => {
  const src = readSrc('privacy_access_log.tsx');
  it('GridFrame 에 filterChips 를 넘기지 않는다', () => {
    expect(src).not.toContain('filterChips=');
  });
  it('메뉴 조건은 드로어 select + 적용 칩으로 남는다', () => {
    expect(src).toContain('<DrawerField label="개인정보 관련메뉴">');
    expect(src).toContain("{ label: '개인정보 관련메뉴', value: menuLabel(a.menu)");
  });
});

/* 2026-11-02 — 초안(draft) 드로어는 메뉴를 고르고 X·Esc 로 닫으면 선택이 버려져 '메뉴 필터가 안 된다'로 보였다(실측: 53건 그대로).
   같은 중분류 골드 audit_log 처럼 바꾸는 즉시 applied 에 반영한다. */
describe('개인정보 접속관리 — 상세필터는 즉시 반영', () => {
  const src = readSrc('privacy_access_log.tsx');
  it('드로어가 applied 를 직접 패치한다(초안 사본·커밋 없음)', () => {
    expect(src).toContain('value={applied} onPatch={f.patch}');
    expect(src).not.toMatch(/\bsetDraft\b|\bcommit\(/);
  });
});

describe('개인정보 접속관리 — 기간별 추이는 선 차트', () => {
  const stats = readSrc('privacy_access_stats.tsx');
  it('추이는 공용 MultiLineTrend(숨김 표 포함)로, 표(ReadGrid)로 그리지 않는다', () => {
    expect(stats).toContain('<Charts.MultiLineTrend');
    expect(stats).toContain('tableCaption=');
    expect(stats).not.toContain('table={TREND_TABLE}');
  });
  it('플롯 호버 툴팁을 켠다 — 점 <title> 만으로는 값이 사실상 안 보였다(2026-11-02 사용자 요청)', () => {
    expect(stats).toMatch(/<Charts\.MultiLineTrend[\s\S]*?\bhoverTip\b/);
    expect(stats).toContain("unit: '명'");
  });
});

