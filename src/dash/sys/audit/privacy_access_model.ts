/* 개인정보 접속관리(ADM-010) — 순수 모델(UI 없음). 출처: 개인정보 접속관리.html 하단 스크립트 `query`·`renderStat`·`renderTrend`.
   조회 조건(메뉴·기간·행위자·IP) → 접근기록 목록, 같은 결과에서 통계 표 3장(기간별 추이·메뉴별·사용자별)을 **집계로 파생**한다
   (목업도 통계용 리터럴 없이 `view` 를 집계한다 — 별도 값 없음). 표 선언(TableMeta)도 여기 둔다(엑셀·화면 공용). */
import type { Row, TableMeta } from '../../risk_table_meta';
import { ACTS, PRIVACY_MENUS } from './privacy_access_data';
import type { AccessRow, Act, PrivacyMenu } from './privacy_access_data';

/* ──────────────────────────────
   조회 조건
────────────────────────────── */
export interface AccessFilter {
  menu: string;    // PrivacyMenu.id('' = 전체)
  from: string;    // 'YYYY-MM-DD'(포함, '' = 열린 경계)
  to: string;      // 'YYYY-MM-DD'(포함, '' = 열린 경계)
  actor: string;   // 행위자 — 대소문자 무시 부분일치
  ip: string;      // IP — 앞부분 일치(목업 `ip.indexOf(cond.ip)===0`, placeholder "예: 10.0.1")
}

export const PERIOD_ERROR = '시작일은 종료일보다 늦을 수 없습니다.';

/** 기간 검증(목업 [조회]) — 둘 다 있고 시작 > 종료면 오류 문구, 아니면 null. 'YYYY-MM-DD' 문자열 비교 = 시간순 */
export function validatePeriod(from: string, to: string): string | null {
  return from && to && from > to ? PERIOD_ERROR : null;
}

/** 접근기록 필터 — 조건끼리 AND. 입력 순서(일시 최신순)를 유지한 새 배열 */
export function filterAccess(rows: readonly AccessRow[], f: AccessFilter): AccessRow[] {
  const actor = f.actor.trim().toLowerCase();
  const ip = f.ip.trim();
  return rows.filter((r) => {
    const d = r.ts.slice(0, 10);
    if (f.from && d < f.from) return false;
    if (f.to && d > f.to) return false;
    if (f.menu && r.menuId !== f.menu) return false;
    if (actor && !r.actor.toLowerCase().includes(actor)) return false;
    if (ip && !r.ip.startsWith(ip)) return false;
    return true;
  });
}

/* ──────────────────────────────
   기간별 추이 — 일(날짜)·주(월요일 시작)·월. 조회 기간의 모든 버킷을 0건 포함해 최신순으로
────────────────────────────── */
export const TREND_UNITS = [{ value: 'd', label: '일별' }, { value: 'w', label: '주별' }, { value: 'm', label: '월별' }] as const;
export type TrendUnit = typeof TREND_UNITS[number]['value'];

const DAY = 24 * 3600 * 1000;
const toMs = (ymd: string) => Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)));
const toYmd = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** 버킷 키 — 월 'YYYY-MM' · 주 = 그 주 월요일 · 일 = 날짜(목업 bkey) */
function bucketKey(ms: number, unit: TrendUnit): string {
  if (unit === 'm') return toYmd(ms).slice(0, 7);
  if (unit === 'w') return toYmd(ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY);
  return toYmd(ms);
}

export type TrendRow = { id: string; period: string; visitors: number; pv: number };

/** 기간 경계 — 빈 쪽은 결과 행의 최소/최대 날짜(목업은 기간 필수, 우리는 빈 값 = 전 기간이라 행에서 정한다) */
function trendRange(rows: readonly AccessRow[], from: string, to: string): [string, string] | null {
  const days = rows.map((r) => r.ts.slice(0, 10));
  const lo = from || (days.length ? days.reduce((a, b) => (b < a ? b : a)) : '');
  const hi = to || (days.length ? days.reduce((a, b) => (b > a ? b : a)) : '');
  return lo && hi && lo <= hi ? [lo, hi] : null;
}

/** 기간별 방문자수(고유 행위자)·페이지뷰(건수). 주 라벨 = 'YYYY-MM-DD ~ MM-DD'(기간 안쪽으로 잘린 시작·끝), 최신순 */
export function trendBuckets(rows: readonly AccessRow[], from: string, to: string, unit: TrendUnit): TrendRow[] {
  const range = trendRange(rows, from, to);
  if (!range) return [];
  const buckets: { key: string; s: string; e: string; users: Set<string>; pv: number }[] = [];
  const index = new Map<string, number>();
  for (let ms = toMs(range[0]), end = toMs(range[1]); ms <= end; ms += DAY) {
    const key = bucketKey(ms, unit);
    const day = toYmd(ms);
    const at = index.get(key);
    if (at === undefined) { index.set(key, buckets.length); buckets.push({ key, s: day, e: day, users: new Set(), pv: 0 }); } else buckets[at].e = day;
  }
  for (const r of rows) {
    const at = index.get(bucketKey(toMs(r.ts.slice(0, 10)), unit));
    if (at === undefined) continue;
    buckets[at].users.add(r.actor);
    buckets[at].pv += 1;
  }
  return [...buckets].reverse().map((b) => ({
    id: `${unit}-${b.key}`,
    period: unit === 'w' ? `${b.s} ~ ${b.e.slice(5)}` : b.key,
    visitors: b.users.size,
    pv: b.pv,
  }));
}

/* 기간별 추이 차트 — trendBuckets(최신순 표)를 **시간순**(왼→오)으로 뒤집어 Charts.MultiLineTrend 입력으로.
   축 라벨은 좁게(일·주 = 'MM-DD'(주는 시작일) · 월 = 'YYYY-MM'), 점이 많으면 최신 점 기준 k 개에 하나만 남기고 나머지는 ''.
   툴팁·숨김표는 fullLabels(표의 기간 문자열 그대로)를 쓴다 — 시각 축만 줄이고 비시각 표현은 온전하게. */
export const TREND_MAX_X_LABELS = 16;

export interface TrendChart { labels: string[]; fullLabels: string[]; data: { visitors: number[]; pv: number[] } }

const axisLabel = (period: string, unit: TrendUnit) => (unit === 'm' ? period : period.slice(5, 10));

export function trendChartData(trend: readonly TrendRow[], unit: TrendUnit): TrendChart {
  const asc = [...trend].reverse();
  const n = asc.length;
  const step = Math.max(1, Math.ceil(n / TREND_MAX_X_LABELS));
  return {
    labels: asc.map((b, i) => ((n - 1 - i) % step === 0 ? axisLabel(b.period, unit) : '')),
    fullLabels: asc.map((b) => b.period),
    data: { visitors: asc.map((b) => b.visitors), pv: asc.map((b) => b.pv) },
  };
}

/* ──────────────────────────────
   메뉴별 접근 현황 — 메뉴 × 행위 피벗 + 합계(많은 순)
────────────────────────────── */
export const ACT_KEY: Readonly<Record<Act, string>> = Object.freeze({ '조회': 'view', '등록': 'create', '수정': 'update', '삭제': 'remove', '다운로드': 'download' });

export type MenuPivotRow = { id: string; menu: string; sum: number } & Record<string, string | number>;

/** 7메뉴 전부(0건 포함) → 메뉴 조건이 있으면 그 메뉴만 → 합계 많은 순(같으면 메뉴 순서) */
export function menuPivot(rows: readonly AccessRow[], menuFilter: string, menus: readonly PrivacyMenu[] = PRIVACY_MENUS): MenuPivotRow[] {
  const base = menus.filter((m) => !menuFilter || m.id === menuFilter).map((m) => {
    const mine = rows.filter((r) => r.menuId === m.id);
    const acts = Object.fromEntries(ACTS.map((a) => [ACT_KEY[a], mine.filter((r) => r.act === a).length]));
    return { id: m.id, menu: m.label, ...acts, sum: mine.length } as MenuPivotRow;
  });
  return [...base].sort((a, b) => b.sum - a.sum);
}

/* ──────────────────────────────
   사용자별 접근 현황 — 페이지뷰 많은 순, 접속 IP 수 = 고유 IP
────────────────────────────── */
export type UserKind = '내부' | '운용사';
export type UserStatRow = { id: string; actor: string; kind: UserKind; pv: number; ipCount: number };

/** 구분 — 기관 도메인(@apfs.kr) = 내부, 그 외 = 운용사(목업 규칙) */
export const userKindOf = (actor: string): UserKind => (/@apfs\.kr$/.test(actor) ? '내부' : '운용사');

export function userStats(rows: readonly AccessRow[]): UserStatRow[] {
  const by = new Map<string, { pv: number; ips: Set<string> }>();
  for (const r of rows) {
    const u = by.get(r.actor) ?? { pv: 0, ips: new Set<string>() };
    u.pv += 1;
    u.ips.add(r.ip);
    by.set(r.actor, u);
  }
  const list = [...by.entries()].map(([actor, u]) => ({ id: actor, actor, kind: userKindOf(actor), pv: u.pv, ipCount: u.ips.size }));
  return list.sort((a, b) => b.pv - a.pv);   // 안정 정렬 — 같으면 먼저 나타난(최근) 순
}

/* ──────────────────────────────
   통계 표 선언 — 화면(ReadGrid)·엑셀(exportTables) 공용. 행은 rows prop 으로 넘긴다(rows:[] 는 자리표시)
   수량형(방문자수·페이지뷰·건수·합계·접속 IP 수)만 우측(kind number), 기간·메뉴명·행위자·구분은 좌측
────────────────────────────── */
const EMPTY = '집계할 기록이 없습니다.';

export const TREND_TABLE: TableMeta = {
  id: 'trend', title: '기간별 추이', empty: EMPTY, rows: [],
  cols: [
    { key: 'period', label: '기간', kind: 'date', width: 200 },
    { key: 'visitors', label: '방문자수', kind: 'number' },
    { key: 'pv', label: '페이지뷰', kind: 'number' },
  ],
};

export const MENU_TABLE: TableMeta = {
  id: 'menu', title: '메뉴별 접근 현황', empty: EMPTY, rows: [], totalLabel: '합계',
  cols: [
    { key: 'menu', label: '메뉴명', kind: 'text', width: 160 },
    ...ACTS.map((a) => ({ key: ACT_KEY[a], label: a, kind: 'number' as const, total: 'sum' as const })),
    { key: 'sum', label: '합계', kind: 'number', total: 'sum', strong: true },
  ],
};

export const USER_TABLE: TableMeta = {
  id: 'user', title: '사용자별 접근 현황', empty: EMPTY, rows: [],
  cols: [
    { key: 'actor', label: '행위자', kind: 'text', width: 200 },
    { key: 'kind', label: '구분', kind: 'center' },
    { key: 'pv', label: '페이지뷰', kind: 'number' },
    { key: 'ipCount', label: '접속 IP 수', kind: 'number' },
  ],
};

export interface AccessStats { trend: Row[]; menu: Row[]; user: Row[]; chart: TrendChart }

/** 통계 3장(+ 추이 차트 데이터) 한 번에 — 조회 결과 행 + 적용 조건(기간·메뉴) + 추이 단위. 행 타입은 type 별칭이라 Row 에 그대로 대입된다 */
export function buildStats(rows: readonly AccessRow[], f: Pick<AccessFilter, 'menu' | 'from' | 'to'>, unit: TrendUnit): AccessStats {
  const trend = trendBuckets(rows, f.from, f.to, unit);
  return {
    trend,
    chart: trendChartData(trend, unit),
    menu: menuPivot(rows, f.menu),
    user: userStats(rows),
  };
}
