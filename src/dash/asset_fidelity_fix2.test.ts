/* 투자자산관리 원본 충실도 후속 수정(2026-09-24, CHECK_REPORT ISSUE 나머지) 회귀 가드.
   원본 HTML(docs/mockups)을 **직접 파싱**해 구현과 대조한다 — 기대값을 손으로 옮겨 적으면 원문이 바뀌어도 통과한다.
   A. 검색조건 6화면(S1_32·S1_33·S1_38·S1_40·S1_42·S1_43): 라벨 순서·옵션·기본값·'전체' 유무 = 원문 `.searchbox`,
      원문에 없던 필터 부재, 기본값이 원문 행을 줄이지 않음, 범위 필터 동작, 미선언 스키마 불변.
   B. 투자기업정보(통합) 주주명부: 단일 헤더 12열 = 원문 S1_30 thead, 행 값 불변.
      이 표(company_profile_model ShareTable)의 소비처는 페이지(investee_profile)·팝업(company_profile_modal) 둘 다
      S1_30 출처이고, S2_64(조기경보 투자기업정보 전체)에는 주주명부 표가 없다 → 화면별 opt-in 불필요. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveSchema, ALL_SCHEMAS } from './schemas';
import { parsePageSchema } from './schemas/types';
import type { PageSchema, SchemaFilterSpec } from './schemas/types';
import { resolveFilterField, filterValueMatches, defaultFilterValues, filterChipText } from './schemas/filter_field';
import { SHARE_HEADERS, SHARE_ROWS } from './company_profile_data';

const read = (p: string) => readFileSync(p, 'utf8');
const src = (f: string) => readFileSync(new URL('./' + f, import.meta.url), 'utf8');
const M1 = (f: string) => read(`docs/mockups/01_투자자산관리/${f}`);
const strip = (s: string) => s.replace(/<button[\s\S]*?<\/button>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
const ALL = ['전체', '(전체)'];

/* ─────────────── 원문 `.searchbox` 파서 ───────────────
   각 `.field` → { label, spec(원문에서 도출한 기대 명세) }. 모펀드는 CHECK_REPORT 모펀드 규칙으로 제외(라벨 텍스트로 거른다 —
   S1_40 모펀드는 data-mf-visible 속성이 없는 읽기전용 표시 칸이다). 라벨 없는 칸(S1_38 조회 버튼)은 항목이 아니다. */
type Expected = { label: string; spec: SchemaFilterSpec };
function searchbox(html: string): Expected[] {
  const box = html.slice(html.indexOf('class="searchbox"'), html.indexOf('class="listbar"'));
  const chunks = box.split(/<div class="field/).slice(1);
  const out: Expected[] = [];
  for (const c of chunks) {
    const lm = c.match(/<label[^>]*>([\s\S]*?)<\/label>/);
    if (!lm) continue;
    const label = strip(lm[1]);
    if (label === '모펀드') continue;
    out.push({ label, spec: fieldSpec(html, c) });
  }
  return out;
}
function selectLike(opts: string[], def: string): SchemaFilterSpec {
  const hasAll = opts.some((o) => ALL.includes(o));
  const options = opts.filter((o) => !ALL.includes(o));
  const spec: SchemaFilterSpec = { kind: 'select' };
  if (options.length) spec.options = options;
  if (!ALL.includes(def)) spec.def = def;
  if (!hasAll) spec.allLabel = null;
  return spec;
}
function fieldSpec(html: string, c: string): SchemaFilterSpec {
  const sel = c.match(/<select[^>]*>([\s\S]*?)<\/select>/);
  if (sel) {
    const opts = [...sel[1].matchAll(/<option([^>]*)>([\s\S]*?)<\/option>/g)].map((m) => ({ attr: m[1], text: strip(m[2]) }));
    const def = (opts.find((o) => /\bselected\b/.test(o.attr)) ?? opts[0]).text;
    return selectLike(opts.map((o) => o.text), def);
  }
  const grp = c.match(/role="group"[^>]*id="([^"]+)"/);
  if (grp) {
    const m = html.match(new RegExp(`chipGroup\\('${grp[1]}',(\\[[^\\]]*\\]),'([^']*)'\\)`));
    expect(m, `chipGroup ${grp[1]}`).not.toBeNull();
    // eslint-disable-next-line no-new-func
    return selectLike(new Function(`return ${m![1]};`)() as string[], m![2]);
  }
  const inputs = [...c.matchAll(/<input([^>]*)>/g)].map((m) => ({
    type: m[1].match(/type="([^"]+)"/)?.[1] ?? 'text',
    value: m[1].match(/value="([^"]*)"/)?.[1] ?? '',
  }));
  const isMonth = (v: string) => /^\d{4}-\d{2}$/.test(v);
  // 코드+명칭+돋보기(원문 `.iconbtn-sq` 검색 버튼) 묶음 — 검색박스 끝의 `조회` 버튼(.btn#search)과 구분한다
  if (inputs.length === 2 && /class="iconbtn-sq"/.test(c)) {
    const [a, b] = inputs.map((i) => i.value);
    return a || b ? { kind: 'codeName', def: `${a}~${b}` } : { kind: 'codeName' };
  }
  if (inputs.length === 2) {
    const [a, b] = inputs.map((i) => i.value);
    return { kind: inputs[0].type === 'date' ? 'dayRange' : isMonth(a) ? 'monthRange' : 'dayRange', def: `${a}~${b}` };
  }
  expect(inputs, '단일 입력 칸').toHaveLength(1);
  return { kind: inputs[0].type === 'date' ? 'day' : isMonth(inputs[0].value) ? 'month' : 'text', def: inputs[0].value };
}

const SCREENS = [
  ['S1_32_투자기업_고용현황보고.html', '투자기업 고용현황보고'],
  ['S1_33_전체_투자실적.html', '전체 투자실적'],
  ['S1_38_운용사_재무정보_조회.html', '운용사 재무정보 조회'],
  ['S1_40_투자금실사보고.html', '투자금 실사보고'],
  ['S1_42_사후관리기록.html', '사후관리기록 관리'],
  ['S1_43_관리보수관리.html', '관리보수관리'],
] as const;

/** 행 매칭 키는 원문 판단(스키마 머리 주석)이라 대조에서 뺀다 — 나머지(kind·options·def·allLabel)는 원문 그대로여야 한다 */
const shape = (s: SchemaFilterSpec | undefined) => {
  if (!s) return undefined;
  const { key: _key, ...rest } = s;
  return rest;
};
const rowsOf = (sc: PageSchema) => sc.sample ?? [];
/** GenericListPage rowMatchesFilters 와 같은 판정(값-필터 AND, columnKey 없는 필터는 no-op) */
const passes = (sc: PageSchema, row: Record<string, unknown>, fv: Record<string, string>) =>
  Object.entries(fv).every(([label, v]) => {
    const ff = resolveFilterField(label, sc);
    return !v || !ff.columnKey || filterValueMatches(ff, v, row[ff.columnKey]);
  });
const count = (sc: PageSchema, fv: Record<string, string>) => rowsOf(sc).filter((r) => passes(sc, r, fv)).length;

/* ─────────────── A. 검색조건 6화면 ─────────────── */
describe('A. 검색조건 = 원문 .searchbox (라벨 순서·옵션·기본값·전체 유무)', () => {
  it.each(SCREENS)('%s → %s: 필터 라벨 순서가 원문 검색박스와 같다(모펀드 제외)', (file, route) => {
    const want = searchbox(M1(file)).map((e) => e.label);
    expect(want.length).toBeGreaterThan(1);
    expect(resolveSchema(route).filters).toEqual(want);
  });

  it.each(SCREENS)('%s → %s: 각 항목의 컨트롤·옵션·기본값이 원문 그대로다', (file, route) => {
    const sc = resolveSchema(route);
    for (const { label, spec } of searchbox(M1(file))) {
      expect(shape(sc.filterSpecs?.[label]), `${route} · ${label}`).toEqual(spec);
    }
  });

  it('원문에 없던 필터가 없다', () => {
    const gone: [string, string[]][] = [
      ['운용사 재무정보 조회', ['GP구분', '운용사명']],
      ['투자금 실사보고', ['투자기업', '투자유형', '확정여부']],
      ['사후관리기록 관리', ['대분류', '유형', '전달형태']],
      ['관리보수관리', ['지급일자']],
    ];
    for (const [route, labels] of gone) for (const l of labels) expect(resolveSchema(route).filters, `${route} · ${l}`).not.toContain(l);
  });

  it.each(SCREENS)('%s → %s: 원문 기본값이 원문 행을 줄이지 않는다(초기 화면 = 원문 행 전부)', (_f, route) => {
    const sc = resolveSchema(route);
    expect(rowsOf(sc).length).toBeGreaterThan(0);
    expect(count(sc, defaultFilterValues(sc))).toBe(rowsOf(sc).length);
  });

  it.each(SCREENS)('%s → %s: 행을 거르는 select 는 원문 옵션 중 하나가 실제 행 값이다(선택 즉시 0건 방지)', (_f, route) => {
    const sc = resolveSchema(route);
    for (const [label, f] of Object.entries(sc.filterSpecs ?? {})) {
      if (f.kind !== 'select' || !f.key || !f.options?.length) continue;
      const vals = new Set(rowsOf(sc).map((r) => String(r[f.key!])));
      expect(f.options.some((o) => vals.has(o)), `${route} · ${label}`).toBe(true);
    }
  });

  it('원문 옵션이 행 값과 어긋나는 select 는 no-op 이다(스키마 머리 주석 판단의 근거)', () => {
    const cases: [string, string, string][] = [['투자기업 고용현황보고', '자펀드', 'subFund'], ['투자금 실사보고', '운용사', 'gp']];
    for (const [route, label, rowKey] of cases) {
      const sc = resolveSchema(route);
      const vals = new Set(rowsOf(sc).map((r) => String(r[rowKey])));
      expect(sc.filterSpecs![label].options!.some((o) => vals.has(o)), `${route} · ${label} 원문 불일치`).toBe(false);
      expect(resolveFilterField(label, sc).columnKey).toBeUndefined();
    }
    // S1_38 운용사: 원문 설계 메모가 "NH투자증권으로 조회했는데 2건이 함께 나옴"이라 적었다 → no-op
    expect(M1('S1_38_운용사_재무정보_조회.html')).toContain('운용사 필터가 실제로 결과를 좁히는지');
    expect(resolveFilterField('운용사', resolveSchema('운용사 재무정보 조회')).columnKey).toBeUndefined();
  });

  it('명세 라벨은 tag 로 떨어지지 않는다(표 0건 폴백 금지)', () => {
    for (const [, route] of SCREENS) {
      const sc = resolveSchema(route);
      for (const l of sc.filters ?? []) expect(resolveFilterField(l, sc).kind, `${route} · ${l}`).not.toBe('tag');
    }
  });
});

describe('A. 범위 필터 동작(dayRange·monthRange)', () => {
  it('경계 포함 · 한쪽 열린 경계 · 날짜 아닌 셀은 범위 밖', () => {
    const ff = resolveFilterField('지급기간', resolveSchema('관리보수관리'));
    expect(ff.kind).toBe('dayRange');
    expect(filterValueMatches(ff, '2026-07-03~2026-07-03', '2026-07-03')).toBe(true);
    expect(filterValueMatches(ff, '2026-07-04~2026-08-12', '2026-07-03')).toBe(false);
    expect(filterValueMatches(ff, '2026-05-12~2026-07-02', '2026-07-03')).toBe(false);
    expect(filterValueMatches(ff, '~2026-07-03', '2026-07-03')).toBe(true);
    expect(filterValueMatches(ff, '2026-07-04~', '2026-07-03')).toBe(false);
    expect(filterValueMatches(ff, '~2026-12-31', '-')).toBe(false);
    expect(filterValueMatches(ff, '~2026-12-31', '')).toBe(false);
    const mf = resolveFilterField('기준년월', resolveSchema('투자기업 고용현황보고'));
    expect(mf.kind).toBe('monthRange');
    expect(filterValueMatches(mf, '2026-06~2026-06', '2026-06')).toBe(true);
    expect(filterValueMatches(mf, '2026-07~2026-12', '2026-06')).toBe(false);
  });

  it('화면에서 범위를 좁히면 원문 행이 실제로 줄어든다', () => {
    const fee = resolveSchema('관리보수관리');
    expect(count(fee, { 지급기간: '2026-08-01~2026-08-31' })).toBe(0);
    expect(count(fee, { 지급기간: '2026-07-01~2026-07-31' })).toBe(1);
    const post = resolveSchema('사후관리기록 관리');
    expect(count(post, { 기간: '2014-01-01~2014-12-31' })).toBe(1);   // 2014-04-25 1건
    const dd = resolveSchema('투자금 실사보고');
    expect(count(dd, { 투자기간: '2026-01-01~2026-12-31' })).toBe(1);  // 최초 투자일자 2026-01-30(삼진푸드)
    const emp = resolveSchema('투자기업 고용현황보고');
    expect(count(emp, { 기준년월: '2026-07~2026-12' })).toBe(0);
  });

  it('칩 문자열: 범위는 "a ~ b", 코드/명칭은 "코드 명칭"', () => {
    const fee = resolveSchema('관리보수관리');
    expect(filterChipText(resolveFilterField('지급기간', fee), '2026-05-12~2026-08-12')).toBe('2026-05-12 ~ 2026-08-12');
    const gp = resolveSchema('운용사 재무정보 조회');
    expect(filterChipText(resolveFilterField('운용사', gp), 'NHLIB~NH투자증권')).toBe('NHLIB NH투자증권');
  });

  it('codeName 은 명칭 부분일치로 거른다(S1_42 투자기업 — 원문 행은 투자기업이 비어 있다)', () => {
    const post = resolveSchema('사후관리기록 관리');
    expect(count(post, { 투자기업: 'C001~' })).toBe(3);        // 코드만 = 조회 파라미터(행에 코드 없음)
    expect(count(post, { 투자기업: '~그린' })).toBe(0);
  });
});

describe('A. opt-in — 미선언 스키마는 종전 동작', () => {
  // 2026-09-24 상세필터 전수조사로 선언 화면이 늘었다 — 불변식은 "이 6화면 포함 + 미선언은 {}" 다.
  it('filterSpecs 는 이 6화면을 포함하고, 미선언 스키마의 초기 필터값은 {} 다', () => {
    const declared = ALL_SCHEMAS.filter((s) => s.filterSpecs).map((s) => s.route);
    expect(declared).toEqual(expect.arrayContaining(SCREENS.map(([, r]) => r)));
    for (const s of ALL_SCHEMAS.filter((x) => !x.filterSpecs)) expect(defaultFilterValues(s), s.route).toEqual({});
  });

  it('GenericListPage 가 초기값·초기화·행 판정을 filter_field 정본으로 한다', () => {
    const g = src('generic_list.tsx');
    expect(g).toMatch(/useState<Record<string, string>>\(\(\) => defaultFilterValues\(schema\)\)/);
    expect(g).toMatch(/onApply\(defaultFilterValues\(schema\)\)/);
    expect(g).toMatch(/filterValueMatches\(ff, value,/);
  });

  it('zod 가 죽은 필터 명세를 파싱 시점에 거부한다', () => {
    const base = resolveSchema('관리보수관리');
    const bad = (filterSpecs: Record<string, SchemaFilterSpec>, filters = base.filters) =>
      () => parsePageSchema({ ...base, filters, filterSpecs });
    expect(bad({ 없는라벨: { kind: 'text' } })).toThrow(/label not in filters/);
    expect(bad({ 운용사: { kind: 'select', key: 'nope' } })).toThrow(/key not seeded/);
    expect(bad({ 운용사: { kind: 'select', options: ['A'], def: 'B' } })).toThrow(/def not in options/);
    expect(bad({ 운용사: { kind: 'select', options: ['A'], allLabel: null } })).toThrow(/needs def/);
    expect(() => parsePageSchema(base)).not.toThrow();
  });
});

/* ─────────────── B. 주주명부 단일 헤더 ─────────────── */
describe('B. 투자기업정보(통합) 주주명부 = 원문 S1_30 단일 헤더 12열', () => {
  const html = M1('S1_30_투자기업정보.html');
  const sec = html.slice(html.indexOf('id="s3t"'), html.indexOf('</section>', html.indexOf('id="s3t"')));

  it('헤더 = 원문 thead 한 줄 12열 그대로', () => {
    const thead = sec.slice(sec.indexOf('<thead>'), sec.indexOf('</thead>'));
    expect((thead.match(/<tr>/g) ?? []).length).toBe(1);
    const ths = [...thead.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => strip(m[1]));
    expect(ths).toHaveLength(12);
    expect([...SHARE_HEADERS]).toEqual(ths);
  });

  it('ShareTable 은 2단 그룹(colSpan·rowSpan·colgroup)을 그리지 않는다', () => {
    const m = src('company_profile_model.tsx');
    const body = m.slice(m.indexOf('function ShareTable'), m.indexOf('</thead>', m.indexOf('function ShareTable')));
    expect(body).toContain('SHARE_HEADERS.map');
    expect(body).not.toMatch(/colSpan|rowSpan|colgroup/);
  });

  it('행 값은 원문 tbody 그대로다(헤더만 바뀌었다)', () => {
    const tbody = sec.slice(sec.indexOf('<tbody>'), sec.indexOf('</tbody>'));
    const trs = [...tbody.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((t) => strip(t[1]).replace(/,/g, '')));
    expect(trs).toHaveLength(SHARE_ROWS.length);
    trs.forEach((cells, i) => {
      const r = SHARE_ROWS[i];
      expect(cells).toEqual([r.no, r.gp, r.fund, r.date, r.totalCapital, r.totalShares, r.comCapital, r.comShares, r.comPar, r.prfCapital, r.prfShares, r.prfPar].map(String));
    });
  });

  it('S2_64 에는 주주명부 표가 없다 — 화면별 opt-in 이 필요 없다', () => {
    const s264 = read('docs/mockups/02_조기경보/S2_64_투자기업정보_전체_.html');
    expect(s264).not.toMatch(/<th[^>]*>\s*보통주 자본금\s*<\/th>/);
    expect(s264).not.toContain('>주주명부<');
  });
});
