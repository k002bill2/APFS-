/* 운용사 유형별 정량지표 변동 조회 — 모펀드 필터가 차트 데이터셋을 바꾼다(2026-11-16 미연동 필터 전부 동작).
   기본 상태(농식품모태펀드)는 원문 TREND_SECTIONS 그 자체(R0), MOAF 는 결정적 대안 데이터셋. */
import { describe, it, expect } from 'vitest';
import { trendSectionsFor, MOAF_FACTOR } from './gp_type_indicator_trend';
import { TREND_SECTIONS, MF_OPTIONS, TREND_TYPES } from './risk_subfund_info_data';
import { readSrc } from '../../test_src';

describe('운용사 유형별 정량지표 변동 — 모펀드', () => {
  it('기본 모펀드(농식품모태펀드)는 원문 시계열·평균 그대로(같은 객체)', () => {
    expect(MF_OPTIONS[0]).toBe('농식품모태펀드');
    expect(trendSectionsFor(MF_OPTIONS[0])).toBe(TREND_SECTIONS);
  });

  it('MOAF 는 월별 값·평균이 지표별 고정 비율만큼 달라진다(점 수·월·이름·색은 그대로)', () => {
    const alt = trendSectionsFor('MOAF');
    expect(alt).not.toBe(TREND_SECTIONS);
    alt.forEach((sec, i) => sec.series.forEach((s, j) => {
      const base = TREND_SECTIONS[i].series[j];
      expect(s.name).toBe(base.name);
      expect(s.color).toBe(base.color);
      expect(s.data).toHaveLength(base.data.length);
      expect(MOAF_FACTOR[s.name], s.name).toBeDefined();
      expect(s.avg).toBe(Math.round(base.avg * MOAF_FACTOR[s.name] * 100) / 100);
      expect(s.avg).not.toBe(base.avg);
      expect(s.data[0]).not.toBe(base.data[0]);
    }));
  });

  it('결정적 — 두 번 계산해도 같은 값', () => {
    expect(trendSectionsFor('MOAF')).toEqual(trendSectionsFor('MOAF'));
  });

  it('원문 데이터는 바뀌지 않는다(입력 불변)', () => {
    const before = JSON.stringify(TREND_SECTIONS);
    trendSectionsFor('MOAF');
    expect(JSON.stringify(TREND_SECTIONS)).toBe(before);
  });
});

describe('운용사 유형별 정량지표 변동 — 미연동 캡션 제거', () => {
  it('운용사 유형 선택지는 원문 1개(벤처투자회사) — 전체 ≡ 벤처투자회사라 데이터셋은 모펀드만 가른다', () => {
    expect(TREND_TYPES).toEqual(['벤처투자회사']);
  });
  it('화면 소스에 noop 플래그가 없다', () => {
    expect(readSrc('gp_type_indicator_trend.tsx')).not.toMatch(/noop/);
  });
});
