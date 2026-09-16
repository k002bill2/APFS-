/* detail 링크 술어 — "이 셀이 상세 팝업 링크가 되는가"의 단일 정본.

   ⚠ 소비처가 셋이다: 셀 렌더러(링크로 그릴까) · 셀 Enter(키보드 진입) · 우클릭 `상세조회`.
   종전에는 같은 판정이 두 벌로 흩어져 있었다(generic_list.tsx 의 hasDetail 과 cellRenderer 인라인).
   한쪽만 고치면 "링크는 보이는데 Enter 는 안 먹는다"(또는 그 반대)가 **에러 없이** 생긴다 —
   이 세션에서 반복해 나온 "선언이 소비처까지 닿지 않는다" 부류와 같은 실패 모양이라 술어를 하나로 둔다.

   판정 3단계:
   ① detailWhen — 값이 **정확히** 그것인 행만 링크(정기보고: 보고구분 '월간보고'만 상세가 있다).
   ② detailPattern — 값이 그 정규식에 맞는 행만 링크. 원문이 "값의 **형식**"으로 링크를 가르는 경우다:
      S1_40 `dueCell(r,idx)` 이 `/^\d{4}-\d{2}-\d{2}$/` 를 통과한 실사일자만 버튼으로 만들고
      `''`(미실사)·`'X'`(보고 대상 제외)는 평상 셀로 둔다. 동등비교로는 표현할 수 없다.
   ③ 둘 다 없으면 detail 을 선언한 컬럼의 **모든** 행이 링크다(종전 동작 — opt-in 스키마 회귀 없음). */
import type { ColumnSpec } from './types';

/* 정규식은 모듈 캐시에 담는다 — 컴포넌트 본문에서 new RegExp 하면 렌더마다 재컴파일된다
   (grid_header_note.tsx 의 HEADER_CACHE 와 같은 이유). 유효성은 스키마 파싱 시점에 zod 가 본다. */
const PATTERN_CACHE = new Map<string, RegExp>();
function compiled(src: string): RegExp {
  let re = PATTERN_CACHE.get(src);
  if (!re) { re = new RegExp(src); PATTERN_CACHE.set(src, re); }
  return re;
}

export function linksDetail(col: ColumnSpec | undefined, value: unknown): boolean {
  if (!col?.detail) return false;
  const v = String(value ?? '');
  if (col.detailWhen != null) return v === col.detailWhen;
  if (col.detailPattern != null) return compiled(col.detailPattern).test(v);
  return true;
}
