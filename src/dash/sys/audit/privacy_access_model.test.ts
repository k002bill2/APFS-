import { describe, it, expect } from 'vitest';
import { demoAccessRows, PRIVACY_MENUS, DEFAULT_PERIOD, ACTS } from './privacy_access_data';
import type { AccessRow } from './privacy_access_data';
import { filterAccess, validatePeriod, trendBuckets, trendChartData, menuPivot, userStats, userKindOf, buildStats, ACT_KEY, PERIOD_ERROR, MENU_TABLE, TREND_MAX_X_LABELS } from './privacy_access_model';
import type { AccessFilter } from './privacy_access_model';
import { computeTotal } from '../../risk_table_meta';

const rows = demoAccessRows();
const ALL: AccessFilter = { menu: '', from: '', to: '', actor: '', ip: '' };

/* 고정 표본 — 경계·집계를 손으로 셀 수 있게 */
const r = (id: string, ts: string, actor: string, menuId: string, act: AccessRow['act'], ip: string): AccessRow =>
  ({ id, ts, actor, menuId, menu: PRIVACY_MENUS.find((m) => m.id === menuId)!.label, act, ip });
const FIX: AccessRow[] = [
  r('f1', '2026-10-06 09:00:00', 'kimjh@apfs.kr', 'ADM-001', '조회', '10.0.1.15'),       // 화
  r('f2', '2026-10-05 18:00:00', 'kimjh@apfs.kr', 'ADM-001', '수정', '175.223.14.9'),    // 월(주 시작)
  r('f3', '2026-10-05 10:00:00', 'gp.manager@greenvc.co.kr', 'IAM-026', '다운로드', '211.45.17.120'),
  r('f4', '2026-10-01 11:00:00', 'leesy@apfs.kr', 'ADM-001', '조회', '10.0.1.42'),
  r('f5', '2026-09-30 12:00:00', 'leesy@apfs.kr', 'IAM-026', '조회', '10.0.1.42'),
];

describe('demoAccessRows — 목업 결정적 생성기', () => {
  it('152건(목업 140 + 사용자 초대 12) · id 유일 · 호출마다 같은 값(새 배열)', () => {
    expect(rows).toHaveLength(152);
    expect(new Set(rows.map((x) => x.id)).size).toBe(152);
    const again = demoAccessRows();
    expect(again).toEqual(rows);
    expect(again).not.toBe(rows);
  });
  it('일시 최신순 · 근무시간(08~19시) · 형식', () => {
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].ts.slice(0, 16) >= rows[i].ts.slice(0, 16)).toBe(true);
    for (const x of rows) {
      expect(x.ts).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      const h = Number(x.ts.slice(11, 13));
      expect(h >= 8 && h <= 19).toBe(true);
    }
  });
  it('사용자 초대는 목업 140건엔 없고 덧붙임 12건(pa-inv-*)에만 — 7메뉴 모두 고르면 행이 나온다', () => {
    const inv = rows.filter((x) => x.id.startsWith('pa-inv-'));
    expect(inv).toHaveLength(12);
    expect(inv.every((x) => x.menuId === 'ADM-002' && x.actor.endsWith('@apfs.kr'))).toBe(true);
    expect(rows.filter((x) => !x.id.startsWith('pa-inv-')).some((x) => x.menuId === 'ADM-002')).toBe(false);
    for (const m of PRIVACY_MENUS) expect(filterAccess(rows, { ...ALL, ...DEFAULT_PERIOD, menu: m.id }).length, m.label).toBeGreaterThan(0);
    for (const x of rows) expect(PRIVACY_MENUS.find((m) => m.id === x.menuId)!.acts).toContain(x.act);
  });
  it('외부 IP 표본(175.223.14.x)이 섞여 있다', () => {
    expect(rows.filter((x) => x.ip.startsWith('175.223.14.')).length).toBeGreaterThan(0);
  });
  it('기본 조회기간 = 기준일 한 달 전 ~ 기준일, 그 안에 행이 있다', () => {
    expect(DEFAULT_PERIOD).toEqual({ from: '2026-09-28', to: '2026-10-28' });
    const inRange = filterAccess(rows, { ...ALL, ...DEFAULT_PERIOD });
    expect(inRange.length).toBeGreaterThan(0);
    expect(inRange.length).toBeLessThan(rows.length);
  });
});

describe('validatePeriod', () => {
  it('시작 > 종료만 오류, 한쪽이 비면 통과', () => {
    expect(validatePeriod('2026-10-02', '2026-10-01')).toBe(PERIOD_ERROR);
    expect(validatePeriod('2026-10-01', '2026-10-01')).toBeNull();
    expect(validatePeriod('', '2026-10-01')).toBeNull();
    expect(validatePeriod('2026-10-01', '')).toBeNull();
  });
});

describe('filterAccess', () => {
  it('기간 경계는 양끝 포함, 빈 값은 열린 경계', () => {
    expect(filterAccess(FIX, { ...ALL, from: '2026-10-05', to: '2026-10-05' }).map((x) => x.id)).toEqual(['f2', 'f3']);
    expect(filterAccess(FIX, { ...ALL, from: '2026-10-01' }).map((x) => x.id)).toEqual(['f1', 'f2', 'f3', 'f4']);
    expect(filterAccess(FIX, { ...ALL, to: '2026-09-30' }).map((x) => x.id)).toEqual(['f5']);
  });
  it('메뉴 정확일치', () => {
    expect(filterAccess(FIX, { ...ALL, menu: 'IAM-026' }).map((x) => x.id)).toEqual(['f3', 'f5']);
  });
  it('행위자 = 대소문자 무시 부분일치(앞뒤 공백 무시)', () => {
    expect(filterAccess(FIX, { ...ALL, actor: ' GREENVC ' }).map((x) => x.id)).toEqual(['f3']);
    expect(filterAccess(FIX, { ...ALL, actor: 'apfs' })).toHaveLength(4);
  });
  it('IP = 앞부분 일치(목업 indexOf===0) — 가운데 일치는 거르지 않는다', () => {
    expect(filterAccess(FIX, { ...ALL, ip: '10.0.1' }).map((x) => x.id)).toEqual(['f1', 'f4', 'f5']);
    expect(filterAccess(FIX, { ...ALL, ip: '175.223' }).map((x) => x.id)).toEqual(['f2']);
    expect(filterAccess(FIX, { ...ALL, ip: '0.1.15' })).toEqual([]);
  });
  it('입력을 바꾸지 않고 순서를 유지한다', () => {
    const copy = FIX.map((x) => ({ ...x }));
    filterAccess(FIX, { ...ALL, actor: 'kim' });
    expect(FIX).toEqual(copy);
  });
});

describe('trendBuckets — 일/주/월', () => {
  it('일별: 기간 모든 날(0건 포함) 최신순, 방문자 = 고유 행위자', () => {
    const t = trendBuckets(FIX, '2026-09-30', '2026-10-06', 'd');
    expect(t.map((b) => b.period)).toEqual(['2026-10-06', '2026-10-05', '2026-10-04', '2026-10-03', '2026-10-02', '2026-10-01', '2026-09-30']);
    expect(t[1]).toMatchObject({ visitors: 2, pv: 2 });
    expect(t[2]).toMatchObject({ visitors: 0, pv: 0 });
  });
  it('주별: 월요일 시작, 라벨은 기간 안쪽으로 잘린 시작 ~ 끝(MM-DD)', () => {
    const t = trendBuckets(FIX, '2026-09-30', '2026-10-06', 'w');
    expect(t.map((b) => b.period)).toEqual(['2026-10-05 ~ 10-06', '2026-09-30 ~ 10-04']);
    expect(t[0]).toMatchObject({ visitors: 2, pv: 3 });   // 10-05(월)~10-06 — kim·gp
    expect(t[1]).toMatchObject({ visitors: 1, pv: 2 });   // leesy 2건
  });
  it('월별: YYYY-MM 최신순', () => {
    const t = trendBuckets(FIX, '2026-09-30', '2026-10-06', 'm');
    expect(t.map((b) => [b.period, b.visitors, b.pv])).toEqual([['2026-10', 3, 4], ['2026-09', 1, 1]]);
  });
  it('어느 단위든 페이지뷰 합 = 기간 안 행 수', () => {
    const inRange = filterAccess(rows, { ...ALL, ...DEFAULT_PERIOD });
    for (const u of ['d', 'w', 'm'] as const) {
      expect(trendBuckets(inRange, DEFAULT_PERIOD.from, DEFAULT_PERIOD.to, u).reduce((a, b) => a + b.pv, 0)).toBe(inRange.length);
    }
  });
  it('기간이 비면 결과 행의 최소~최대 날짜, 행도 없으면 빈 배열', () => {
    const t = trendBuckets(FIX, '', '', 'd');
    expect(t[0].period).toBe('2026-10-06');
    expect(t[t.length - 1].period).toBe('2026-09-30');
    expect(trendBuckets([], '', '', 'd')).toEqual([]);
    expect(trendBuckets([], '2026-10-01', '2026-10-02', 'd')).toHaveLength(2);
  });
});

describe('menuPivot — 메뉴 × 행위', () => {
  it('7메뉴 전부(0건 포함), 합계 많은 순, 합계 = 행위별 합', () => {
    const p = menuPivot(FIX, '');
    expect(p).toHaveLength(PRIVACY_MENUS.length);
    expect(p.slice(0, 2).map((x) => [x.menu, x.sum])).toEqual([['사용자관리', 3], ['운용사 명세서', 2]]);
    expect(p[0]).toMatchObject({ [ACT_KEY['조회']]: 2, [ACT_KEY['수정']]: 1, [ACT_KEY['삭제']]: 0 });
    for (const x of menuPivot(rows, '')) expect(ACTS.reduce((a, act) => a + Number(x[ACT_KEY[act]]), 0)).toBe(x.sum);
  });
  it('메뉴 조건이 있으면 그 메뉴 1행', () => {
    expect(menuPivot(FIX, 'IAM-026').map((x) => x.menu)).toEqual(['운용사 명세서']);
  });
  it('합계 행(computeTotal) = 열 합, 총합 = 행 수', () => {
    const p = menuPivot(rows, '');
    const total = computeTotal({ ...MENU_TABLE, rows: p })!;
    expect(total.menu).toBe('합계');
    expect(total.sum).toBe(rows.length);
    for (const act of ACTS) expect(total[ACT_KEY[act]]).toBe(rows.filter((x) => x.act === act).length);
  });
});

describe('userStats — 사용자별', () => {
  it('페이지뷰 많은 순, 접속 IP 수 = 고유 IP, 구분 = 도메인', () => {
    const u = userStats(FIX);
    expect(u.map((x) => [x.actor, x.kind, x.pv, x.ipCount])).toEqual([
      ['kimjh@apfs.kr', '내부', 2, 2],
      ['leesy@apfs.kr', '내부', 2, 1],
      ['gp.manager@greenvc.co.kr', '운용사', 1, 1],
    ]);
    expect(userKindOf('a@apfs.kr.evil.com')).toBe('운용사');
  });
  it('전체 페이지뷰 합 = 행 수, 정렬 비증가', () => {
    const u = userStats(rows);
    expect(u.reduce((a, b) => a + b.pv, 0)).toBe(rows.length);
    for (let i = 1; i < u.length; i++) expect(u[i - 1].pv >= u[i].pv).toBe(true);
  });
  it('buildStats — 세 표(+ 추이 차트)를 같은 조회 결과에서 만든다', () => {
    const s = buildStats(FIX, { menu: '', from: '2026-09-30', to: '2026-10-06' }, 'm');
    expect(s.trend).toHaveLength(2);
    expect(s.chart.fullLabels).toEqual(['2026-09', '2026-10']);
    expect(s.menu).toHaveLength(PRIVACY_MENUS.length);
    expect(s.user).toHaveLength(3);
  });
});

describe('trendChartData — 차트 입력(시간순)', () => {
  it('최신순 표를 시간순으로 뒤집고, 값·완전형 라벨을 같은 순서로 맞춘다', () => {
    const t = trendBuckets(FIX, '2026-09-30', '2026-10-06', 'd');
    const c = trendChartData(t, 'd');
    expect(c.fullLabels).toEqual([...t].reverse().map((b) => b.period));
    expect(c.fullLabels[0]).toBe('2026-09-30');
    expect(c.labels).toEqual(['09-30', '10-01', '10-02', '10-03', '10-04', '10-05', '10-06']);   // 7점 = 전부 표시
    expect(c.data.pv).toEqual([...t].reverse().map((b) => b.pv));
    expect(c.data.visitors).toEqual([...t].reverse().map((b) => b.visitors));
  });
  it('주별 축 라벨 = 시작일 MM-DD, 월별 = YYYY-MM', () => {
    expect(trendChartData(trendBuckets(FIX, '2026-09-30', '2026-10-06', 'w'), 'w').labels).toEqual(['09-30', '10-05']);
    expect(trendChartData(trendBuckets(FIX, '2026-09-30', '2026-10-06', 'm'), 'm').labels).toEqual(['2026-09', '2026-10']);
  });
  it(`점이 많으면 축 라벨은 ${String(TREND_MAX_X_LABELS)}개 이하 — 가장 최근 점은 늘 표시, 숨김표용 라벨은 전부 유지`, () => {
    const c = trendChartData(trendBuckets(rows, '', '', 'd'), 'd');   // 전 기간 일별(80여 점)
    expect(c.fullLabels.length).toBeGreaterThan(TREND_MAX_X_LABELS);
    expect(c.labels.filter(Boolean).length).toBeLessThanOrEqual(TREND_MAX_X_LABELS);
    expect(c.labels[c.labels.length - 1]).not.toBe('');
    expect(c.fullLabels.every(Boolean)).toBe(true);
  });
  it('빈 결과면 빈 배열', () => {
    expect(trendChartData([], 'd')).toEqual({ labels: [], fullLabels: [], data: { visitors: [], pv: [] } });
  });
});
