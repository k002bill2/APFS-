/* charts.tsx `MultiLineTrend` 렌더 범위 방어 회귀 가드 (Codex 리뷰 P2).
   `MultiLineTrend`는 공유 프리미티브라 호출부가 라벨/데이터 길이를 어긋나게 넘길 수 있다.
   좌표는 라벨 수 기준으로 잡히므로 방어가 없으면 (a) 데이터가 길 때 점이 플롯 밖으로 나가고
   (b) `<title>`·sr-only 표의 라벨이 `undefined`가 되며 (c) n===1에서 0-division이 난다.
   화면으로는 재현되지 않는 경로라(앱 소비처는 항상 길이가 맞다) 순수 함수로 잘라 테스트한다. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { trendPlotRange } from './charts';
import type { TrendSeries } from './charts';

const S: TrendSeries[] = [
  { key: 'normal', name: '정상', color: 'var(--success)' },
  { key: 'warn', name: '경고', color: 'var(--danger)' },
];
const L3 = ['25.07', '25.08', '25.09'];

describe('trendPlotRange — 길이 일치(정상 경로)', () => {
  it('라벨 수를 그대로 쓰고 축 상한은 최댓값을 10/20/50 단위로 올린다', () => {
    const r = trendPlotRange(L3, { normal: [92, 94, 95], warn: [5, 6, 7] }, S);
    expect(r.n).toBe(3);
    expect(r.ymax).toBe(100);     // max 95 → 50<95<=120 이므로 20 단위 올림
  });
  it('목업 실데이터(13개월·최댓값 118)는 120으로 잡힌다', () => {
    const labels = Array.from({ length: 13 }, (_, i) => 'm' + i);
    const total = [111, 113, 114, 114, 114, 113, 114, 115, 115, 116, 116, 118, 118];
    const r = trendPlotRange(labels, { total }, [{ key: 'total', name: 'TOTAL', color: 'var(--primary)', dash: true }]);
    expect(r).toEqual({ n: 13, ymax: 120 });
  });
  it('값이 작으면 축 상한 하한 10을 유지한다', () => {
    expect(trendPlotRange(L3, { normal: [1, 2, 3], warn: [0, 0, 1] }, S).ymax).toBe(10);
  });
});

describe('trendPlotRange — 길이 불일치 clamp', () => {
  it('데이터가 라벨보다 길면 라벨 수로 자른다(점이 플롯 밖으로 나가지 않게)', () => {
    const r = trendPlotRange(L3, { normal: [1, 2, 3, 4, 5], warn: [1, 2, 3, 4, 5] }, S);
    expect(r.n).toBe(3);
  });
  it('데이터가 라벨보다 짧으면 **가장 짧은 시리즈**에 맞춘다(라벨 undefined 방지)', () => {
    const r = trendPlotRange(L3, { normal: [1, 2, 3], warn: [1, 2] }, S);
    expect(r.n).toBe(2);
  });
  it('축 상한은 잘려나갈 값을 보지 않는다(clamp 구간만)', () => {
    // 4·5번째의 900은 렌더되지 않으므로 축을 부풀리면 안 된다
    const r = trendPlotRange(L3, { normal: [1, 2, 3, 900, 900], warn: [1, 2, 3, 900, 900] }, S);
    expect(r.n).toBe(3);
    expect(r.ymax).toBe(10);
  });
});

describe('trendPlotRange — 빈 입력·단일 포인트', () => {
  it('라벨이 비면 n=0 (축조차 그리지 않는다)', () => {
    expect(trendPlotRange([], { normal: [1, 2] }, S).n).toBe(0);
  });
  it('시리즈가 비면 n=0', () => {
    expect(trendPlotRange(L3, { normal: [1, 2, 3] }, []).n).toBe(0);
  });
  it('시리즈 키에 대응하는 데이터가 없으면 n=0 (빈 배열로 폴백)', () => {
    expect(trendPlotRange(L3, {}, S).n).toBe(0);
    expect(trendPlotRange(L3, { normal: [1, 2, 3] }, S).n).toBe(0);   // warn 누락
  });
  it('포인트가 1개면 n=1 — 0-division 없이 점 하나를 그린다', () => {
    const r = trendPlotRange(['25.07'], { normal: [42], warn: [3] }, S);
    expect(r).toEqual({ n: 1, ymax: 50 });
  });
  it('n=0 이어도 ymax는 0이 아니다(그리지 않더라도 0 나눗셈이 생기지 않게)', () => {
    expect(trendPlotRange([], {}, []).ymax).toBeGreaterThan(0);
  });
});

/* hoverTip 십자선 모션(2026-11-02 사용자 "좀더 부드럽게 인터렉션") — 위치는 CSS transform 으로만 옮기고(SVG x1·cx 속성은 전환 불가),
   transition 은 전역 저모션 규칙이 못 막으므로 transitions.css 의 저모션 가드가 유일한 안전장치다. */
describe('MultiLineTrend hoverTip 모션 계약', () => {
  const css = readFileSync(new URL('../styles/transitions.css', import.meta.url), 'utf8');
  const src = readFileSync(new URL('./charts.tsx', import.meta.url), 'utf8');
  it('glide(위치 미끄러짐)·fade(제자리 흐려짐) 두 클래스와 저모션 가드가 있다', () => {
    expect(css).toMatch(/\.chart-xhair-glide\s*\{[^}]*transform var\(--dur\)/);
    expect(css).toMatch(/\.chart-xhair-fade\s*\{[^}]*opacity var\(--dur-fast\)/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.chart-xhair-glide, \.chart-xhair-fade \{ transition: none; \}/);
  });
  it('안내선·점·툴팁 위치는 transform 으로 옮긴다', () => {
    expect(src).toContain('style={{ transform: `translateX(${x(at)}px)`');
    expect(src).toContain('style={{ transform: `translate(${x(at)}px, ${y(v)}px)`');
  });
});
