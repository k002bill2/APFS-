/* 다중 선택 값 계약(순수 모듈 — React import 금지: filter_field.ts 가 import 한다).
   MultiSelect 의 값은 string[] 이지만 스키마 폼 vals 와 상세필터 filterValues 는 둘 다 Record<string, string> 이다.
   그래서 문자열로 저장해야 하는 곳은 **JSON 배열 문자열**로 감싼다 — tags 컨트롤과 같은 계약(2026-11-03).
   · 빈 배열 = '' — 필수 검사(.trim())가 비었다고 판정하고, 상세필터는 키째 빠져 비활성이 된다.
   · 구분자 이어 붙이기('A, B')는 쓰지 않는다 — 라벨에 쉼표가 들면 값이 갈라진다.
   · parseMulti 는 JSON 배열이 아닌 문자열을 **값 1개**로 받는다 — 단일 select 컬럼 셀('농식품계정')과
     filterSpecs def 문자열을 따로 분기하지 않고 같은 매칭 규칙(교집합)에 태우기 위해서다. */

/** JSON 배열 문자열 ↔ string[] — 배열이 아닌 문자열은 [그 문자열], ''·null 은 [] */
export function parseMulti(v: unknown): string[] {
  if (v == null) return [];
  const s = String(v);
  if (s === '') return [];
  const arr = jsonStringArray(s);
  return arr ?? [s];
}

/** string[] → 저장 문자열. [] = '' */
export function joinMulti(arr: readonly string[]): string {
  return arr.length ? JSON.stringify(arr) : '';
}

/** 그리드 셀·엑셀 표시 — 다중 선택 저장값이면 'A, B', 그 외는 그대로(원시 '["A","B"]' 노출 방지) */
export function formatMultiCell(s: string): string {
  const arr = jsonStringArray(s);
  return arr ? arr.join(', ') : s;
}

/* '[' 로 시작하고 JSON.parse 결과가 문자열 배열일 때만 배열로 본다 — '[A]'·'[미완' 같은 평문을 오인하지 않게. */
function jsonStringArray(s: string): string[] | null {
  if (!s.startsWith('[')) return null;
  try {
    const a: unknown = JSON.parse(s);
    return Array.isArray(a) && a.every((x) => typeof x === 'string') ? a : null;
  } catch {
    return null;
  }
}

/** 트리거 문구 두 조각 — head(라벨, 좁으면 말줄임) + rest(' 외 N', 줄지 않음). 0개 emptyLabel · 1개 라벨 · 2개 이상 '첫 라벨 외 N' */
export function multiSelectSummaryParts(labels: readonly string[], emptyLabel: string): { head: string; rest: string } {
  if (!labels.length) return { head: emptyLabel, rest: '' };
  return { head: labels[0], rest: labels.length === 1 ? '' : ` 외 ${String(labels.length - 1)}` };
}

/** 트리거 문구 한 줄(접근名·적용 칩용) — multiSelectSummaryParts 를 이어 붙인 것 */
export function multiSelectSummary(labels: readonly string[], emptyLabel: string): string {
  const { head, rest } = multiSelectSummaryParts(labels, emptyLabel);
  return head + rest;
}
