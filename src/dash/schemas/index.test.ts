import { describe, it, expect } from 'vitest';
import { resolveSchema, buildRegistry, ALL_SCHEMAS } from './index';
import { linksDetail } from './detail_link';
import { DEFAULT_SCHEMA } from './_default';
import { resolveFilterField } from './filter_field';

describe('resolveSchema', () => {
  it('미등록 route는 DEFAULT(오늘 동작) 스키마를 반환한다', () => {
    const s = resolveSchema('존재하지않는메뉴');
    expect(s.columns.map(c => c.key)).toEqual(DEFAULT_SCHEMA('x').columns.map(c => c.key));
    expect(s.title).toBe('존재하지않는메뉴');
  });
});

describe('buildRegistry', () => {
  it('중복 route는 빌드타임 에러를 던진다', () => {
    const base = DEFAULT_SCHEMA('a');
    expect(() => buildRegistry([{ ...base, route: 'dup' }, { ...base, route: 'dup' }])).toThrow(/Duplicate/);
  });
});

describe('상세 팝업(detail) 옵트인 불변식', () => {
  /* detailWhen 은 **행에 실제로 나타나는 값**이어야 링크가 뜬다. makeRows 는 select 필드의 options 를
     순환 시드하므로, detailWhen 이 그 options(또는 sample 행의 값)에 없으면 링크가 조용히 안 나타난다.
     실제 함정: 원문 목업 표기는 '월간보고서'인데 스키마 도메인은 '월간보고'다 — 원문 문자열을 그대로
     detailWhen 에 넣으면 아무 행도 매칭되지 않는다(에러도 안 난다). */
  it('detailWhen 은 해당 컬럼의 값 도메인(select options 또는 sample)에 존재한다', () => {
    for (const s of ALL_SCHEMAS) {
      for (const c of s.columns) {
        if (!c.detail || c.detailWhen == null) continue;
        const opts = s.fields.find((f) => f.key === c.key)?.options ?? [];
        const inSample = (s.sample ?? []).some((r) => String(r[c.key]) === c.detailWhen);
        expect(opts.includes(c.detailWhen) || inSample, `${s.route}.${c.key} detailWhen='${c.detailWhen}'`).toBe(true);
      }
    }
  });

  /* detailPattern 은 detailWhen 과 **같은 무음 실패 모드**를 갖는다 — 어느 행과도 안 맞으면
     링크가 그냥 안 뜨고 에러는 없다. 그래서 같은 모양의 가드를 둔다. */
  it('detailPattern 은 sample 행 중 최소 1건과 맞는다', () => {
    for (const s of ALL_SCHEMAS) {
      for (const c of s.columns) {
        if (!c.detail || c.detailPattern == null) continue;
        const hit = (s.sample ?? []).filter((r) => linksDetail(c, r[c.key])).length;
        expect(hit, `${s.route}.${c.key} detailPattern='${c.detailPattern}' 과 맞는 행 0건`).toBeGreaterThan(0);
      }
    }
  });

  /* 원문 S1_40 `dueCell` 은 실사일자가 yyyy-mm-dd 일 때만 버튼이다. 7행 중 no 1·2·6 만 해당하고
     나머지는 `-`(미실사) 또는 `X`(보고 대상 제외)라 **평상 셀이어야 한다** — 전 행을 링크로 만들면
     열리지 않는 죽은 링크가 4개 생긴다. 건수를 못박아 그 퇴행을 잡는다. */
  it('투자금 실사보고는 7행 중 실사일자가 날짜인 3행만 체크리스트 링크다', () => {
    const s = resolveSchema('투자금 실사보고');
    const col = s.columns.find((c) => c.key === 'dueDiligDate');
    expect(col?.detail).toBe('dueDiligChecklist');
    const linked = (s.sample ?? []).filter((r) => linksDetail(col, r.dueDiligDate));
    expect(s.sample).toHaveLength(7);
    expect(linked.map((r) => r.no)).toEqual([1, 2, 6]);
    expect(linked.map((r) => r.dueDiligDate)).toEqual(['2026-06-22', '2026-05-29', '2026-05-12']);
  });

  it('관리보수관리는 지급일자 전 행이 상세조회 링크다(원문도 전 행이 버튼)', () => {
    const s = resolveSchema('관리보수관리');
    const col = s.columns.find((c) => c.key === 'payDate');
    expect(col?.detail).toBe('mgmtFeeDetail');
    expect(col?.detailWhen).toBeUndefined();
    expect(col?.detailPattern).toBeUndefined();
    expect((s.sample ?? []).every((r) => linksDetail(col, r.payDate))).toBe(true);
  });
});

/* 술어 자체의 단위 테스트 — 소비처 3곳(셀 렌더러·셀 Enter·우클릭)이 이 함수 하나를 공유하므로
   여기가 깨지면 셋이 함께 깨진다(=흩어진 복제본이 따로 깨지는 종전 상태보다 낫다). */
describe('linksDetail', () => {
  const base = { key: 'v', label: 'V', type: 'text' } as const;
  it('detail 선언이 없으면 어떤 값도 링크가 아니다', () => {
    expect(linksDetail({ ...base }, '아무값')).toBe(false);
    expect(linksDetail(undefined, '아무값')).toBe(false);
  });
  it('detailWhen 은 정확히 같은 값만 링크다', () => {
    const c = { ...base, detail: 'monthlyReport' as const, detailWhen: '월간보고' };
    expect(linksDetail(c, '월간보고')).toBe(true);
    expect(linksDetail(c, '월간보고서')).toBe(false);
    expect(linksDetail(c, '')).toBe(false);
  });
  it('detailPattern 은 형식이 맞는 값만 링크다', () => {
    const c = { ...base, detail: 'dueDiligChecklist' as const, detailPattern: '^\\d{4}-\\d{2}-\\d{2}$' };
    expect(linksDetail(c, '2026-06-22')).toBe(true);
    expect(linksDetail(c, 'X')).toBe(false);
    expect(linksDetail(c, '-')).toBe(false);
    expect(linksDetail(c, null)).toBe(false);
    expect(linksDetail(c, '2026-06-22 ')).toBe(false);   // 앵커가 살아 있는가
  });
  it('둘 다 없으면 전 행이 링크다(종전 동작)', () => {
    const c = { ...base, detail: 'mgmtFeeDetail' as const };
    expect(linksDetail(c, '2026-07-03')).toBe(true);
    expect(linksDetail(c, '')).toBe(true);
  });
});


/* generic_list.tsx:593 이 `c.label + (c.unit ? ` (${c.unit})` : '')` 로 헤더를 만든다.
   라벨에 이미 단위가 박혀 있으면 헤더가 `금액(원) (원)` 으로 두 번 찍힌다 — 빌드도 테스트도
   통과하고 화면에서만 보이는 부류라 레지스트리 전수로 못박는다(2026-09-16 런타임 실측으로 2건 발견).
   단위의 소유자는 `unit` 필드 하나다. */
describe('금액 컬럼 헤더 — 단위 중복 금지', () => {
  it('unit 을 가진 컬럼의 label 에 그 단위가 다시 들어 있지 않다', () => {
    for (const s of ALL_SCHEMAS) {
      for (const c of s.columns) {
        if (!c.unit) continue;
        expect(c.label, `${s.route}.${c.key} label='${c.label}' unit='${c.unit}'`).not.toContain(`(${c.unit})`);
      }
    }
  });
});

/* 2026-09-24 상세필터 전수조사 — 원문 <select> 는 select 로, 그리고 **선택해도 표가 조용히 비지 않게**.
   filterSpecs 로 선언한 keyed select 가 행 값과 어긋나면(목업 'KB증권' vs 행 'KB증권(주)') 어떤 선택지도
   행에 맞지 않아 0건이 된다. sample 없는 스키마의 행은 '운용사 001' 같은 합성값이라 선언 선택지와 맞을 수 없다. */
describe('상세필터 select 명세 ↔ 행 값 정합', () => {
  const keyedSpecEnums = ALL_SCHEMAS.flatMap((s) => (s.filters ?? [])
    .filter((l) => s.filterSpecs?.[l]?.kind === 'select')
    .map((l) => ({ s, l, ff: resolveFilterField(l, s) }))
    .filter(({ ff }) => ff.kind === 'enum' && ff.columnKey));

  it('sample 없는(합성 행) 스키마는 keyed select 명세를 두지 않는다', () => {
    const bad = keyedSpecEnums.filter(({ s }) => !s.sample).map(({ s, l }) => `${s.route}/${l}`);
    expect(bad).toEqual([]);
  });

  it('sample 행이 있으면 keyed select 선택지 중 최소 1개는 행 값과 정확일치한다', () => {
    const bad = keyedSpecEnums.filter(({ s }) => s.sample?.length).filter(({ s, ff }) => {
      const vals = new Set(s.sample!.map((r) => String(r[ff.columnKey!] ?? '')));
      return !ff.options.some((o) => vals.has(o));
    }).map(({ s, l }) => `${s.route}/${l}`);
    expect(bad).toEqual([]);
  });
});
