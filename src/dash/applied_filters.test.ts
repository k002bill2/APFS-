/* 적용된 필터 줄 가드(2026-09-24 사용자 결정 — 전 화면 공통 2줄 툴바).
   적용 칩(값 + × '필터 제거')은 applied_filters.tsx 만 그린다. 페이지는 GridFrame `appliedFilters` 로 배열만 넘긴다.
   페이지마다 칩을 복사하면 말줄임·전체 해제·aria 규칙이 다시 32벌로 갈라진다. */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { activeFilters, planChips, valueSig, freshLabels } from './applied_filters';
import { readSrc } from './test_src';

describe('freshLabels — 필터를 건 직후 툴팁을 띄울 칩(2026-10-26)', () => {
  const sig = (...kv: [string, string][]) => valueSig(kv.map(([label, value]) => ({ label, value })));
  it('첫 렌더(prev=null)는 기준선만 — 페이지 진입 기본값 칩은 띄우지 않는다', () => {
    expect(freshLabels(null, sig(['기간', '2026-08-01 ~ 2026-09-13']))).toEqual([]);
  });
  it('새로 걸린 항목만 고른다', () => {
    expect(freshLabels(sig(['기간', 'a']), sig(['기간', 'a'], ['사업연도', '2026']))).toEqual(['사업연도']);
  });
  it('값이 바뀐 항목도 고른다', () => {
    expect(freshLabels(sig(['사업연도', '2025']), sig(['사업연도', '2026']))).toEqual(['사업연도']);
  });
  it('해제·무변화는 고르지 않는다', () => {
    expect(freshLabels(sig(['기간', 'a'], ['사업연도', '2026']), sig(['기간', 'a']))).toEqual([]);
    expect(freshLabels(sig(['기간', 'a']), sig(['기간', 'a']))).toEqual([]);
  });
  it('빈 상태에서 여러 개를 한꺼번에 걸면 전부 고른다', () => {
    expect(freshLabels(sig(), sig(['계정구분', '농식품'], ['정기/수시', '정기']))).toEqual(['계정구분', '정기/수시']);
  });
});

const ROOT = new URL('..', import.meta.url).pathname;   // src/
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
  });
}
const OWNER = 'dash/applied_filters.tsx';

describe('적용 칩 = applied_filters.tsx 단일 소유', () => {
  it.each([
    ["'필터 제거' aria", /필터 제거/],
    ['AppliedChip 지역 사본', /\bfunction AppliedChips?\b/],
    ['FilterPill 지역 사본', /\bfunction FilterPill\b/],
  ])('%s 가 소유 파일 밖에 없다', (_n, re) => {
    const hits = walk(ROOT).filter((f) => relative(ROOT, f) !== OWNER && re.test(strip(readFileSync(f, 'utf8'))))
      .map((f) => relative(ROOT, f));
    expect(hits).toEqual([]);
  });
});

describe('깔때기 = GridFrame 단일 소유', () => {
  it('페이지가 툴바 깔때기 아이콘을 직접 그리지 않는다(프레임이 항상 그린다)', () => {
    const hits = walk(ROOT).filter((f) => relative(ROOT, f) !== 'dash/grid_frame.tsx' && /<Icon name="filter"/.test(strip(readFileSync(f, 'utf8'))))
      .map((f) => relative(ROOT, f));
    expect(hits).toEqual([]);
  });
});

describe('기본 필터 칩 = FilterChipRow 단일 소유', () => {
  /* GridFrame/RiskPage 소비 화면은 FilterChip 을 직접 그리지 않고 filterChips 로 넘긴다(+N 접기·끌어올리기를 프레임이 맡는다).
     GridFrame 밖 위젯(메인 대시보드·일정·디자인시스템·리스크 요약)은 대상이 아니다. */
  it('GridFrame 소비 화면에 <FilterChip 이 없다', () => {
    const hits = walk(ROOT).filter((f) => relative(ROOT, f) !== OWNER && relative(ROOT, f) !== 'dash/components.tsx')
      .filter((f) => { const t = strip(readFileSync(f, 'utf8')); return /<GridFrame\b|<RiskPage\b/.test(t) && /<FilterChip\b/.test(t); })
      .map((f) => relative(ROOT, f));
    expect(hits).toEqual([]);
  });
});

describe('planChips — 넘치는 만큼 +N, 선택 칩 끌어올림', () => {
  const mk = (ids: string[], active?: string) => ids.map((id) => ({ id, kind: 'chip', chip: { active: id === active } }));
  const w = { a: 50, b: 50, c: 50, d: 50 };
  it('다 들어가면 전부 보인다', () => {
    const r = planChips(mk(['a', 'b', 'c', 'd']), w, 1000, 40);
    expect(r.shown.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']); expect(r.hidden).toEqual([]);
  });
  it('넘치면 트리거 폭을 예약하고 뒤에서부터 숨긴다', () => {
    // 50+8+50+8+50 = 166 ≤ 170 이지만 트리거(40+8) 예약 → 50+8+50 = 108 ≤ 122 → a,b 만
    const r = planChips(mk(['a', 'b', 'c', 'd']), w, 170, 40);
    expect(r.shown.map((x) => x.id)).toEqual(['a', 'b']); expect(r.hidden.map((x) => x.id)).toEqual(['c', 'd']);
  });
  it('숨겨질 선택 칩은 첫 자리로 끌어올린다(순서 자체가 바뀐다)', () => {
    const r = planChips(mk(['a', 'b', 'c', 'd'], 'd'), w, 170, 40);
    expect(r.shown.map((x) => x.id)).toEqual(['d', 'a']); expect(r.hidden.map((x) => x.id)).toEqual(['b', 'c']);
  });
  it('다중 선택: 보이는 선택 칩이 있어도 숨은 선택 칩까지 앞으로 모은다', () => {
    const items = ['a', 'b', 'c', 'd'].map((id) => ({ id, kind: 'chip', chip: { active: id === 'a' || id === 'd' } }));
    const r = planChips(items, w, 170, 40);
    expect(r.shown.map((x) => x.id)).toEqual(['a', 'd']); expect(r.hidden.map((x) => x.id)).toEqual(['b', 'c']);
  });
  it('이미 보이는 선택 칩은 제자리', () => {
    const r = planChips(mk(['a', 'b', 'c', 'd'], 'b'), w, 170, 40);
    expect(r.shown.map((x) => x.id)).toEqual(['a', 'b']);
  });
  it('wide 칩은 avail 이 측정 폭보다 좁아도 hidden 에 들어가지 않는다', () => {
    const items = [{ id: 'a:path', kind: 'applied', f: { wide: true } }];
    const r = planChips(items, { 'a:path': 348 }, 200, 40);
    expect(r.shown.map((x) => x.id)).toEqual(['a:path']); expect(r.hidden).toEqual([]);
  });
  it('wide 칩은 minWidth(160)만 예약 — 뒤 칩을 먼저 접고 wide 는 남긴다', () => {
    const items = [{ id: 'a:path', kind: 'applied', f: { wide: true } }, { id: 'a:x', kind: 'applied', f: {} }, { id: 'a:y', kind: 'applied', f: {} }];
    // 160 + 8 + 50 = 218 ≤ 230 → x 는 들어가지만 y(+58)는 넘친다 → 트리거(40+8) 예약 후 재배치: 230-48=182 → x 도 접힘
    const r = planChips(items, { 'a:path': 348, 'a:x': 50, 'a:y': 50 }, 230, 40);
    expect(r.shown.map((x) => x.id)).toEqual(['a:path']); expect(r.hidden.map((x) => x.id)).toEqual(['a:x', 'a:y']);
    const r2 = planChips(items, { 'a:path': 348, 'a:x': 50, 'a:y': 50 }, 300, 40);
    expect(r2.shown.map((x) => x.id)).toEqual(['a:path', 'a:x', 'a:y']); expect(r2.hidden).toEqual([]);
  });
});

describe('activeFilters', () => {
  it('빈 값·공백 값은 적용되지 않은 것으로 본다', () => {
    const r = activeFilters([{ label: 'a', value: '' }, { label: 'b', value: '  ' }, { label: 'c', value: 'x' }]);
    expect(r.map((f) => f.label)).toEqual(['c']);
  });
  it('undefined 는 빈 배열', () => expect(activeFilters(undefined)).toEqual([]));
});

/* 적용 칩 클릭 → 상세필터의 그 항목(2026-11-02 사용자 요청, filter_field_jump.ts). 칩이 프레임 안 [상세필터] 버튼을 텍스트로 찾으므로
   적용 칩을 쓰는 화면은 그 라벨의 버튼을 반드시 가진다 — 라벨을 바꾸면 칩 클릭이 조용히 아무 일도 안 한다. */
describe('적용 칩 → 상세필터 이동 계약', () => {
  it('appliedFilters 를 넘기는 화면은 모두 `상세필터` 버튼을 그린다', () => {
    const users = walk(ROOT).filter((f) => f.endsWith('.tsx') && /appliedFilters=/.test(strip(readFileSync(f, 'utf8'))));
    expect(users.length).toBeGreaterThan(30);
    const missing = users.filter((f) => !/>상세필터</.test(strip(readFileSync(f, 'utf8')))).map((f) => relative(ROOT, f));
    expect(missing).toEqual([]);
  });
  it('칩 값은 이동 버튼이고, GridFrame 루트가 이동 범위를 표시한다', () => {
    const own = readFileSync(join(ROOT, OWNER), 'utf8');
    expect(own).toContain('jumpToFilterField(boxRef.current, target ?? label)');
    expect(own).toContain('onJump?.(f.label, f.jumpTo)');
    expect(own).toContain('상세필터에서 변경');
    expect(readFileSync(join(ROOT, 'dash/grid_frame.tsx'), 'utf8')).toContain('data-grid-frame=""');
  });
  /* 2026-11-03 전수 점검(116 route · 칩 222개를 실제 jumpToFilterField 로 판정) — 드로어만 열리던 화면 3곳의 교정.
     칩 항목명 = 드로어 캡션이 원칙이고, 칩 하나가 여러 칸을 대표하는 묶음 칩만 jumpTo 로 첫 칸을 가리킨다 */
  it('칩 항목명이 드로어 캡션과 다르던 화면 — 캡션으로 맞추거나 jumpTo 로 첫 칸을 가리킨다', () => {
    const inv = readSrc('investee_profile.tsx');
    expect(inv).toMatch(/label: '조회 대상',[^}]*jumpTo: '모펀드'/);
    const ars = readSrc('all_report_status.tsx');
    expect(ars).toContain("['기준일자', fFrom || fTo");
    expect(ars).toContain('<DrawerField label="기준일자"');
    const ew = readSrc('early_warning_manage.tsx');
    expect(ew).toContain("{ label: '기간', value: periodChanged");
    expect(ew).toContain('<DrawerField label="기간"');
  });
});

