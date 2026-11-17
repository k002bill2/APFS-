/* 투자기업정보(통합) 상세필터 — 4항목이 기업 1건((주)선양)의 소속과 대조돼 본문/빈 상태를 가른다
   (2026-11-16 "미연동 필터 전부 동작" — 종전: 4항목 미연동 캡션, 본문 불변). */
import { describe, it, expect } from 'vitest';
import { readSrc } from '../../test_src';
import { profileMatches } from './investee_profile';
import { CO_NAME } from './company_profile_data';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const SRC = strip(readSrc('investee_profile.tsx'));
const DEF = ['농식품모태펀드', 'KB증권', '현대동양농식품사모투자전문회사', CO_NAME];

describe('투자기업정보(통합) — 조회 대상 필터', () => {
  it('원문 기본값(초기·초기화 상태)은 기업 본문을 그대로 보인다', () => {
    expect(profileMatches(DEF)).toBe(true);
  });
  it('항목을 전체(빈 값)로 풀어도 같은 기업이 남는다', () => {
    expect(profileMatches(['', '', '', ''])).toBe(true);
    expect(profileMatches(['', 'KB증권', '', ''])).toBe(true);
  });
  it('모펀드 MOAF = 해당 기업 없음(빈 상태)', () => {
    expect(profileMatches(['MOAF', 'KB증권', '현대동양농식품사모투자전문회사', CO_NAME])).toBe(false);
    expect(profileMatches(['MOAF', '', '', ''])).toBe(false);
  });
  it('항목마다 소속과 어긋나면 빈 상태', () => {
    for (let i = 0; i < 4; i += 1) {
      const p = [...DEF];
      p[i] = '다른값';
      expect(profileMatches(p), String(i)).toBe(false);
    }
  });
  it('본문은 profileMatches 로 분기하고 미연동 캡션이 없다', () => {
    expect(SRC).toContain('const found = profileMatches(path);');
    expect(SRC).toMatch(/found\s*\? <CompanyProfileBody/);
    expect(SRC).not.toContain('데이터 연동 후');
    expect(SRC).not.toMatch(/\bnoop\b/);
  });
});
