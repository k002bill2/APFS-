/* autoHeight 그리드의 가로 넘침 가드(2026-09-24).
   증상: 400px 에서 로드 직후 ~300ms 동안 페이지가 가로로 넘쳤다(자펀드 관리 129px · 투자금 회수현황 265px).
   원인: pinned-left 컬럼 폭 합이 뷰포트보다 넓으면 가로 스크롤바의 `.ag-horizontal-left-spacer` 가 그 폭으로
        그려지는데, sticky 헤더 때문에 wrapper 를 overflow:visible 로 풀어 둬서 문서 밖으로 샌다.
        (AG Grid 가 곧 초과 컬럼을 unpin 해 사라지지만 그 사이가 깜빡임.)
   수정: wrapper 에 overflow-x:clip — clip 은 스크롤 컨테이너를 만들지 않아 sticky 헤더를 깨지 않는다.
        hidden/auto 로 바꾸면 sticky 가 wrapper 에 갇혀 헤더 고정이 죽는다 — 되돌리지 말 것. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./aggrid_shared.css', import.meta.url), 'utf8');

describe('autoHeight 그리드 wrapper 가로 클립', () => {
  it('wrapper 는 overflow-x:clip (가로 스필 차단)', () => {
    expect(css).toMatch(/\.ag-root-wrapper\.ag-layout-auto-height\s*\{[^}]*overflow-x:\s*clip\s*!important/);
  });
  it('세로는 visible 유지 (sticky 헤더)', () => {
    expect(css).toMatch(/\.ag-root-wrapper\.ag-layout-auto-height[^{]*\{[^}]*overflow:\s*visible\s*!important/);
  });
  it('hidden/auto/scroll 로 가로를 막지 않는다 (sticky 가 wrapper 에 갇힘)', () => {
    expect(css).not.toMatch(/\.ag-root-wrapper\.ag-layout-auto-height\s*\{[^}]*overflow-x:\s*(hidden|auto|scroll)/);
  });
});
