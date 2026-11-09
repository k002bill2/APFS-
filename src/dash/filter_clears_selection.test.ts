/* 필터 변경 = 선택 해제 가드(2026-10-27 사용자 결정 — "필터를 바꾸면 선택을 전부 해제").
   AG Grid 외부 필터는 걸러진 행을 숨기기만 하고 선택은 그대로 두며 selectionChanged 도 쏘지 않는다.
   그래서 "1건 선택됨"이 화면에 없는 행을 가리키고(삭제·해제등록이 보이지 않는 행에 걸린다),
   GridFrame 은 선택 중 필터 칩 줄을 감추므로(2026-09-24 결정) 걸어 둔 필터도 안 보인다.
   규칙: 외부 필터 + 행 선택을 함께 쓰는 화면은 필터 effect 안에서 onFilterChanged() 직후 deselectAll() 한다
   (정본 custody_confirm_manage — 이 결정 이전부터 같은 동작이었다). */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { walkDash } from './test_src';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const pages = walkDash()
  .filter((p) => /\.tsx$/.test(p))
  .map((p) => ({ f: basename(p), src: strip(readFileSync(p, 'utf8')) }))
  .filter(({ src }) => /isExternalFilterPresent=\{/.test(src) && /rowSelection=\{/.test(src));

/* 필터 effect — `useEffect(() => { …onFilterChanged(); …deselectAll(…); … }, [deps])` */
const FILTER_EFFECT_DESELECTS = /useEffect\(\(\) => \{[^}]*\.onFilterChanged\(\);[^}]*\.deselectAll\([^)]*\);[^}]*\}, \[/;
/* 데이터 변경 경로 — 선택한 행을 수정·단계 전이로 조건 밖에 내보내면 필터 effect 는 돌지 않는다(passes 불변).
   모델이 바뀔 때마다 숨은 선택을 정리하는 공용 헬퍼를 건다(aggrid_selection.tsx). */
const MODEL_UPDATED_DROPS_HIDDEN = /onModelUpdated=\{dropHiddenSelection\}/;

describe('필터 변경 시 선택 해제 가드', () => {
  it('외부 필터 + 행 선택 화면이 있다', () => expect(pages.length).toBeGreaterThanOrEqual(12));
  it.each(pages.map(({ f, src }) => [f, src] as const))('%s — 필터 effect 가 deselectAll 한다', (_f, src) => {
    expect(src).toMatch(FILTER_EFFECT_DESELECTS);
  });
  it.each(pages.map(({ f, src }) => [f, src] as const))('%s — 행이 조건 밖으로 나가면 선택을 푼다(onModelUpdated)', (_f, src) => {
    expect(src).toMatch(MODEL_UPDATED_DROPS_HIDDEN);
  });
});

/* 사전 필터형 화면(2026-11-09) — 외부 필터 대신 걸러진 배열을 rowData 로 넘기고 onRowDataUpdated 에서
   restoreSelection(api, <ref>.current) 로 선택을 되살리는 화면. 위 가드(isExternalFilterPresent 기준)에 걸리지 않는다.
   필터 effect 가 deselectAll() 만 부르면 뒤이은 rowData 갱신의 restoreSelection 이 아직 렌더 전의 낡은 ref 로
   필터를 통과한 행을 다시 고른다 — 회계거래처관리·출자금현황 정보관리 실측: 16→14·16→8행인데 "2건 선택됨" 유지.
   규칙: 그 ref 를 쓰는 화면에서 deselectAll 을 부르는 effect 는 ref 를 먼저 비운다(`<ref>.current = []`,
   또는 그렇게 하는 clearSel()). 정본 sys/board/board_manage.tsx · acc/fixedasset/depreciation_manage.tsx. */
const restoring = walkDash()
  .filter((p) => /\.tsx$/.test(p))
  .map((p) => ({ f: basename(p), src: strip(readFileSync(p, 'utf8')) }))
  .filter(({ src }) => /rowSelection=\{/.test(src) && !/isExternalFilterPresent=\{/.test(src))
  .map(({ f, src }) => ({ f, src, ref: src.match(/restoreSelection\([\w.]+, (\w+)\.current\)/)?.[1] }))
  .filter((p): p is { f: string; src: string; ref: string } => !!p.ref);

/* 한 줄 effect 본문(중첩 중괄호 없음) 중 선택을 푸는 것 */
const deselectEffects = (src: string) =>
  [...src.matchAll(/useEffect\(\(\) => \{([^}]*)\}, \[/g)].map((m) => m[1]).filter((b) => /deselectAll\(|clearSel\(\)/.test(b));

describe('사전 필터 화면 — 선택 해제 effect 가 복원 ref 를 먼저 비운다', () => {
  it('대상 화면이 있다(경로·이름이 바뀌어 0건 통과하지 않게)', () => expect(restoring.length).toBeGreaterThanOrEqual(10));
  it.each(restoring.map(({ f, src, ref }) => [f, src, ref] as const))('%s', (_f, src, ref) => {
    const clearsRef = new RegExp(`${ref}\\.current = \\[\\];`);
    const clearSelClearsRef = new RegExp(`const clearSel = [^\\n]*${ref}\\.current = \\[\\];`).test(src);
    for (const body of deselectEffects(src)) {
      const ok = /clearSel\(\)/.test(body)
        ? clearSelClearsRef
        : clearsRef.test(body.slice(0, body.indexOf('deselectAll(')));
      expect(ok, body.trim()).toBe(true);
    }
  });
});
