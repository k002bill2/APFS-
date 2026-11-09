/* 푸터 건수 문구 SSOT — grid_frame.footerCount (apfs-grid "푸터 골드 양식", 2026-11-09 사용자 결정 "통일").
   골드 두 곳(스키마 주도 generic_list · 자펀드 관리)도 이 함수를 불러 문구가 한 곳에서만 정해진다. 회계 화면 가드는 acc_skill_rules ⑪. */
import { describe, it, expect } from 'vitest';
import { footerCount } from './grid_frame';
import { readSrc } from './test_src';

describe('footerCount', () => {
  it('골드 문구 — N = 필터 후 행 수 · M = 이 쪽에 보이는 행 수', () => {
    expect(footerCount(37, 20)).toBe('총 37개 중 20개 항목 표시 중');
    expect(footerCount(0, 0)).toBe('총 0개 중 0개 항목 표시 중');
  });
  it('꼬리 요약은 · 뒤에(보조원장 명세 건수 등)', () => {
    expect(footerCount(720, 20, '명세 640건')).toBe('총 720개 중 20개 항목 표시 중 · 명세 640건');
  });
  it.each(['generic_list.tsx', 'subfund_manage.tsx'])('골드 %s 도 footerCount 를 쓴다', (f) => {
    const src = readSrc(f);
    expect(src).toMatch(/footerLeft=\{[^\n]*footerCount\(/);
    expect(src).not.toMatch(/개 항목 표시 중/);
  });
});
