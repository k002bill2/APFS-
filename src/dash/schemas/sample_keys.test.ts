import { describe, it, expect } from 'vitest';
import { ALL_SCHEMAS } from './index';
import type { PageSchema } from './types';

/* 레지스트리 전수 불변식 — `sample`(목업 원문 리터럴 행)의 **키가 화면의 키와 같은가**.

   이 작업 최대의 무음 실패다. 목업 스크립트의 키(`gp/fn/biz/co/ym/sales/tot/yth`)를 그대로
   옮겨 붙이면 타입도 빌드도 통과하고 행 수도 맞는데, 그리드는 columns[].key 로 값을 찾으므로
   **셀이 전부 빈칸**이 된다(에러 없음). 반대로 오타 하나도 같은 증상이다.
   그래서 "샘플 키 ⊆ columns ∪ fields ∪ 표현키"를 레지스트리 전체에 강제한다.

   표현키: generic_list.makeRows 가 Row 계약을 맞추려고 읽는 자리(카드뷰·KPI·정렬). 컬럼이
   아니어도 샘플이 제공할 수 있다 — 예: 관리보수관리는 금액 컬럼 key 가 'amount' 라 겹친다. */
const PRESENTATION_KEYS = new Set(['id', 'icon', 'color', 'trend', 'name', 'title', 'category', 'amount', 'change', 'status']);

const keyUniverse = (s: PageSchema) =>
  new Set<string>([...s.columns.map((c) => c.key), ...s.fields.map((f) => f.key), ...PRESENTATION_KEYS]);

const sampled = ALL_SCHEMAS.filter((s) => s.sample !== undefined);

describe('sample 키 불변식', () => {
  it('sample 을 선언한 스키마가 존재한다(가드 자체가 공회전하지 않도록)', () => {
    expect(sampled.length).toBeGreaterThan(0);
  });

  it.each(sampled.map((s) => [s.route, s] as const))(
    '%s — 모든 sample 키가 columns/fields 에 존재한다',
    (route, s) => {
      const uni = keyUniverse(s);
      const unknown = new Set<string>();
      for (const row of s.sample!) for (const k of Object.keys(row)) if (!uni.has(k)) unknown.add(k);
      expect([...unknown], `${route}: 화면에 없는 키 — 셀이 빈칸으로 렌더된다`).toEqual([]);
    },
  );

  /* 원문 행을 실을 자리에 합성 더미가 남지 않도록 — columns 의 '의미 있는' 키(표현키가 아닌 것)는
     최소 한 행이라도 sample 이 채워야 한다. 전부 비면 화면은 빈 표가 되는데, 그건 `sample: []`
     (원천 0건)로 명시해야 할 상태다.
     ⚠ 행**마다** 같은 키를 요구하지는 않는다 — 원문에 값이 없는 선택 항목(첨부파일 등)은
     그 행에서 키를 빼는 것이 정상이고, 강제하면 빈 문자열을 지어내게 만든다. 판정은 행 합집합. */
  it.each(sampled.filter((s) => s.sample!.length > 0).map((s) => [s.route, s] as const))(
    '%s — sample 이 columns 의 실데이터 키를 실제로 채운다',
    (route, s) => {
      const provided = new Set(s.sample!.flatMap((r) => Object.keys(r)));
      const dataCols = s.columns.map((c) => c.key).filter((k) => !PRESENTATION_KEYS.has(k));
      const missing = dataCols.filter((k) => !provided.has(k));
      expect(missing, `${route}: 어느 행도 값을 주지 않는 컬럼 — 항상 빈칸으로 렌더된다`).toEqual([]);
    },
  );
});
