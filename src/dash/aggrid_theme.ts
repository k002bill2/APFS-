/* ── AG Grid 공유 테마·포매터 (SSOT) ───────────────────────────────────────
   모든 게시판/그리드가 같은 테마를 쓰도록 한곳에서 소유한다. 변경은 여기서만.

   핵심:
   - 시맨틱 파라미터만 토큰 바인딩 → 라이트/다크 자동 추종(파생 크롬은 derive).
   - 행선택 배경은 accentColor가 아니라 **selectedRowBackgroundColor**로 격리한다.
     accentColor를 바꾸면 체크박스·포커스링·정렬표시까지 물들기 때문. 회색은
     tokens.css의 --row-selected(브랜드색 비종속 중립 회색) 한 곳에서 제어.
   - v33+ 필수: AllCommunityModule을 import 시 1회 등록(미등록 시 런타임 blank grid).
     이 모듈을 import하는 모든 그리드가 등록을 공유한다.
   - ⚠️ 레거시 CSS(ag-grid.css/ag-theme-*.css) import 금지 — Theming API와 충돌. */
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
import type { ValueFormatterParams, CellStyle } from 'ag-grid-community';
import { mn } from './mask';

ModuleRegistry.registerModules([AllCommunityModule]);

export const apfsTheme = themeQuartz.withParams({
  backgroundColor: 'var(--card)',
  foregroundColor: 'var(--foreground)',
  accentColor: 'var(--primary)',                 // 체크박스/포커스링/정렬표시 — 브랜드색 유지
  borderColor: 'var(--border)',
  selectedRowBackgroundColor: 'var(--row-selected)',  // 행선택 = 회색(토큰). accentColor와 분리
  fontFamily: 'inherit',
  headerFontWeight: 600,
  wrapperBorderRadius: 0,
});

/* 정수=천단위 콤마, 소수=1자리 — 프로젝트 공통 숫자 표기 */
export const fmt = (n: number): string =>
  Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/* 숫자 셀 valueFormatter — mn() 마스킹 통합("축은 두고 데이터는 가린다") */
export const numFmt = (p: ValueFormatterParams): string => (p.value == null ? '' : mn(fmt(p.value as number)));

/* 0=muted, 강조/합계행=bold. 색은 var(--token) → 다크 자동추종 */
export const numStyle = (strong?: boolean) => (p: { value: unknown; node: { rowPinned?: string | null } }): CellStyle => ({
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: strong || p.node.rowPinned ? 700 : 500,
  color: p.value === 0 ? 'var(--muted-foreground)' : 'var(--foreground)',
});
