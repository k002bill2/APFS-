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
import type { ValueFormatterParams, CellStyle, AutoSizeStrategy } from 'ag-grid-community';
import { mn } from './mask';

ModuleRegistry.registerModules([AllCommunityModule]);

/* 컬럼 폭 = 내용 폭(잘림 방지) — autoSizeStrategy 기본(2026-09-08 사용자 결정). 첫 데이터 렌더 때 헤더+셀 내용으로 자동 산정.
   → 컬럼이 많아 프레임 폭을 넘는 넓은 테이블(자펀드관리 등)용. 긴 텍스트 컬럼은 colDef.maxWidth로 상한.
   ⚠ 내용이 프레임보다 좁으면 우측에 빈 공간이 남는다. 이때는 이 전략 대신 컬럼 flex로 채운다(아래).
   사용: <AgGridReact autoSizeStrategy={AUTO_SIZE_CONTENT} …>

   ── 우측 빈 공간을 없애려면(좁은 매트릭스/집계 그리드, 조성·출자현황 등): autoSizeStrategy를 빼고 컬럼에 `flex:1` + `minWidth`.
   flex는 그리드 폭을 동적으로 채우고 리사이즈에도 자동 재분배한다(JS 이벤트 불필요). minWidth가 하한이라 좁으면 가로 스크롤.
   ✗ autoSizeStrategy `fitGridWidth`는 domLayout=autoHeight+지연 레이아웃에서 생성 시점 폭에 1회만 맞춰 빈 공간이 남는다(2026-09-11 실측). flex를 쓴다. */
export const AUTO_SIZE_CONTENT: AutoSizeStrategy = { type: 'fitCellContents' };

/* 그리드 폭을 채우는 전략(우측 빈 공간 제거) — maxWidth 없는 컬럼이 잉여를 흡수한다.
   나머지 컬럼에 `maxWidth`를 걸어 성장을 막으면 특정 컬럼 하나로만 잉여가 흘러간다. */
export const FIT_GRID_WIDTH: AutoSizeStrategy = { type: 'fitGridWidth' };

/* 공용 defaultColDef — **반드시 이 상수를 쓴다. 소비처에서 인라인 리터럴로 쓰지 말 것.**
   ⚠ `defaultColDef={{ … }}`처럼 인라인으로 두면 렌더마다 새 객체가 되어 AG Grid가 컬럼을 재생성하고
     폭을 **선언 폭(colDef.width)으로 되돌린다**. autoSizeStrategy는 최초 렌더 1회만 적용되므로
     한 번 되돌아가면 복구되지 않는다 — 상태가 바뀌는 어떤 클릭(필터 칩·셀 버튼·모달 개폐)에서도 발생한다.
     실측(2026-09-12): 수시보고 컨테이너 1513→1232px, 자펀드관리 합계폭 1831→1788px(fn 279→240).
     뷰포트 폭은 그대로였다 — 모달 스크롤바 보정 문제가 아니다. */
export const DEFAULT_COL_DEF = { sortable: true, resizable: true, suppressHeaderMenuButton: true } as const;

export const apfsTheme = themeQuartz.withParams({
  backgroundColor: 'var(--card)',
  foregroundColor: 'var(--foreground)',
  accentColor: 'var(--primary)',                 // 체크박스/포커스링/정렬표시 — 브랜드색 유지
  borderColor: 'var(--border)',
  selectedRowBackgroundColor: 'var(--row-selected)',  // 행선택 = 회색(토큰). accentColor와 분리
  fontFamily: 'inherit',
  headerHeight: 40,       // 헤더 행 높이(기본 48 축소). 2단 그룹헤더는 이 값×2=80px. 그룹/리프 공통 적용
  headerFontWeight: 600,
  headerBackgroundColor: 'var(--grid-header)',  // Quartz 기본(chromeBackgroundColor=fg 2% onto bg)과 동일 값을 토큰으로 명시 고정 — 색 불변, 명세 팝업 표 헤더와 SSOT 공유. tokens.css의 --grid-header
  wrapperBorderRadius: 0,
  wrapperBorder: false,   // .ag-root-wrapper 외곽 테두리만 제거(2026-09-08) — 컬럼선·행선·헤더선은 유지. 프레임 카드가 테두리 없는 페이지 배경이라 맞춤
  // 세로 컬럼 구분선 — 헤더·본문 모두. 구조(축)라 마스크와 무관하게 상시 표시. 색은 토큰(라이트/다크 추종).
  columnBorder: { color: 'var(--border)' },
  headerColumnBorder: { color: 'var(--border)' },
  headerColumnBorderHeight: '100%',
  // 리사이즈 핸들 표시선(기본 30% 높이 회색 바)을 숨김 — headerColumnBorder(full-height)와 겹쳐
  // 짧은 중첩선으로 보이던 것 제거. 드래그 리사이즈 기능은 유지(핸들 영역은 그대로, 선만 투명).
  headerColumnResizeHandleColor: 'transparent',
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
