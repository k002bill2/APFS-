/* autoHeight 그리드 가로 스크롤바 sticky 가드(2026-09-25).
   증상: 긴 목록(투심보고 통계 등)에서 가로 스크롤바가 그리드 맨 끝 = GridFrame sticky 푸터 아래 화면 밖에 있어 안 보였다.
   수정: 스크롤바를 sticky bottom:var(--grid-footer-h) 로 푸터 바로 위에 고정, 높이는 GridFrame 이 ResizeObserver 로 실측. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./aggrid_shared.css', import.meta.url), 'utf8');
const frame = readFileSync(new URL('./grid_frame.tsx', import.meta.url), 'utf8');

describe('autoHeight 그리드 가로 스크롤바 sticky', () => {
  it('스크롤바는 푸터 높이 변수 기준 sticky', () => {
    expect(css).toMatch(/\.ag-layout-auto-height \.ag-body-horizontal-scroll\s*\{[^}]*position:\s*sticky\s*!important[^}]*bottom:\s*var\(--grid-footer-h,\s*0px\)\s*!important/);
  });
  it('GridFrame 이 푸터 높이를 --grid-footer-h 로 내려준다', () => {
    expect(frame).toMatch(/setProperty\('--grid-footer-h'/);
    expect(frame).toMatch(/ref=\{footerRef\}/);
  });
});
