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
