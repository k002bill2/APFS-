import { describe, it, expect } from 'vitest';
import { pickCaption } from './filter_field_jump';

/* 적용 칩 → 상세필터 항목 이동의 캡션 고르기(2026-11-02). 엉뚱한 칸으로 가느니 드로어만 여는 게 낫다 — 모호하면 null */
const c = (...ts: string[]) => ts.map((text) => ({ text }));

describe('pickCaption — 칩 항목명 → 드로어 캡션', () => {
  it('정확일치가 최우선(앞부분 일치 후보가 있어도)', () => {
    expect(pickCaption(c('기간 구분', '기간', '행위자'), '기간')?.text).toBe('기간');
  });
  it('정확일치가 없으면 유일한 앞부분 일치', () => {
    expect(pickCaption(c('기준년월(시작~종료)', '운용사'), '기준년월')?.text).toBe('기준년월(시작~종료)');
  });
  it('앞부분 일치도 없으면 유일한 포함 일치', () => {
    expect(pickCaption(c('조회기간', '운용사'), '기간')?.text).toBe('조회기간');
  });
  it('후보가 여럿이면 고르지 않는다(드로어만 열린다)', () => {
    expect(pickCaption(c('결성기간', '조회기간'), '기간')).toBeNull();
    expect(pickCaption(c('운용사명', '운용사구분'), '운용사')).toBeNull();
  });
  it('공백 차이는 무시, 빈 라벨은 null', () => {
    expect(pickCaption(c('개인정보 관련메뉴'), '  개인정보  관련메뉴 ')?.text).toBe('개인정보 관련메뉴');
    expect(pickCaption(c('기간'), '  ')).toBeNull();
  });
});
