/* GridFrame — 리스트/그리드/매트릭스 페이지 공통 양식 프레임(셸).
   generic_list.tsx의 시각 양식(PageHeader · Card pad0 · 카드헤더+KPI · 툴바 · 푸터)을
   SSOT로 표준화한다. 테이블 본체는 children으로 주입 —
   리스트(체크박스·CRUD)든 매트릭스(2단헤더·합계행)든 동일 프레임을 입는다.
   apfs-grid 스킬 규약의 정본 구현. */
import React from 'react';
import { createPortal } from 'react-dom';
import { Shell } from './shell';
import { UI } from './components';
import { Icon } from './icons';
import { SplitButton } from './ui/split-button';
import { FilterChipRow, activeFilters } from './applied_filters';
import type { AppliedFilter, FilterChipItem } from './applied_filters';
import type { SplitButtonItem } from './ui/split-button';
import { APFS_DATA, MenuStore, useMenuSel } from './data';

const { PageHeader } = Shell;
const { Card, ColorChip, IconBtn } = UI;

/* ===== 푸터 액션 4종 — 전 페이지 공통(2026-09-17 사용자 결정) =====
   순서 고정: 전체보기(⛶) · 새 창(⧉) · 내보내기(⤓) · 인쇄(🖨). **항시 노출**이며 kebab(⋯) 은 폐기됐다
   (종전엔 내보내기·인쇄가 툴바 kebab / 등록 combo ⌄ / 푸터 폴백 kebab 안에 숨어 있었다).
   - `onToggleAll` 을 넘기지 않는 화면(페이지네이션 없는 집계·매트릭스표)은 전체보기 버튼이 빠져 3개만 렌더된다.
   - 페이지마다 복사하지 말고 이 컴포넌트를 쓴다 — 아이콘 순서·라벨·크기가 갈라지지 않게 하는 SSOT.
   - 단축키(⌥D 내보내기 · ⌘P 인쇄)는 페이지의 `useHotkey` 가 그대로 소유한다(여기서 바인딩하지 않는다).
   - `printItems` 를 넘기면 인쇄가 combo(SplitButton iconOnly)가 된다 — 본체 = 화면 인쇄, ▾ = 화면 전용 출력물
     (등록원부 출력·발급이력 출력 등, 2026-09-24 사용자 결정). 툴바에 별도 [출력▾] 을 두지 않는다. */
export function FooterActions({ onExport, onPrint, printItems, showAll, onToggleAll, size = 32 }: {
  onExport?: () => void; onPrint?: () => void; printItems?: SplitButtonItem[]; showAll?: boolean; onToggleAll?: () => void; size?: number;
}) {
  const print = onPrint ?? (() => window.print());
  return (
    <>
      {onToggleAll && <IconBtn icon="maximize" label="전체보기" size={size} active={showAll} pressed={showAll} onClick={onToggleAll} />}
      <IconBtn icon="external" label="새 창" size={size} onClick={() => window.open(location.href, '_blank')} />
      {onExport && <IconBtn icon="download" label="내보내기" size={size} onClick={onExport} />}
      {printItems?.length
        ? <SplitButton iconOnly size={size} label="인쇄" leadingIcon="printer" menuLabel="출력 메뉴" onClick={print} items={printItems} />
        : <IconBtn icon="printer" label="인쇄" size={size} onClick={print} />}
    </>
  );
}


/* 플로팅 액션 바 전역 스위치(복구 레버) — false 로 바꾸면 전 화면에서 바가 사라지고
   `contextActions` 는 툴바에만 렌더되고 플로팅 바는 뜨지 않는다. IntersectionObserver 도 걸리지 않는다. */
const FLOATING_ACTIONS = true;

/* 떠 있는 바의 z. 셸 chrome 계층(≤60)에 속한다 — 푸터(20) 위, FAB(60) 아래, 모달(80)이 항상 덮는다.
   오버레이가 아니므로 토큰 스케일(75~90)을 쓰지 않는다(→ z-index 스킬 규칙 2). */
const FLOATING_Z = 55;

/* sticky GNB(shell.tsx `<header>` height:58, z50) 높이 — 하드코딩 금지, 실측. */
const gnbHeight = () => Math.round(document.querySelector('header')?.getBoundingClientRect().height ?? 58);

/* 바가 마운트되기 전 1프레임 동안만 쓰는 높이 추정치(실측 45px). */
const BAR_H_FALLBACK = 45;

/* 바의 **왼쪽 엣지** x = 체크박스(행선택) 열의 왼쪽 경계(2026-09-15 사용자 지시 — 가운데 정렬 폐기).
   AG Grid 의 선택 열은 `col-id="ag-Grid-SelectionColumn"`(pinned-left, 폭 44px)이고 그 왼쪽 경계는
   그리드 왼쪽과 같다. querySelector 는 헤더 셀을 먼저 집지만 본문 셀과 left 가 동일하다.
   선택 열이 없는 화면(`hideRowSelection`·조회 전용)도 있어 폴백을 3단으로 둔다:
   선택 열 → 첫 헤더 셀(=그리드 왼쪽) → 프레임 좌측 + 카드 좌우 패딩(18px). */
const barLeftFor = (frame: HTMLElement | null) => {
  const col = frame?.querySelector('[col-id="ag-Grid-SelectionColumn"]') ?? frame?.querySelector('.ag-header-cell');
  if (col) return Math.round(col.getBoundingClientRect().left);
  const r = frame?.getBoundingClientRect();
  return Math.round(r ? r.left + 18 : 18);
};

/* 바가 앉을 y = **선택된 행 바로 위**(사용자 지시 2026-09-15). 액션이 대상 행에 붙어 다녀
   "무엇을 대상으로 하는지"가 분명해진다. 선택 행은 페이지 state 라 GridFrame 은 알 수 없어
   DOM(`.ag-row-selected`)으로 찾는다 — `.ag-header` 와 같은 수준의 국소 결합, 없으면 폴백.
   (AG Grid 는 pinned/center 컨테이너에 같은 행을 쌍둥이로 그려 2개가 잡히지만 rect.top 은 동일.)

   상·하 clamp 가 필요하다 — 선택 행이 화면 밖으로 나가도 바는 조작 가능해야 한다:
   - 위: **그리드 헤더 실측 하단** + 8. `gnb + 헤더높이` 고정값으로 두면 안 된다 — 그리드 헤더는
     top:58 에 닿기 전까지 sticky 가 아니라 아직 아래에 있어, 스크롤 도중 아직 보이는 헤더를
     바가 덮는다(Codex P2). 실측이라 헤더가 붙는 동안 바도 따라 움직인다.
   - 아래: 뷰포트 하단 − 바 높이 − 12.
   그리드가 없는 children(수제 표 등)은 GNB 아래로 폴백. */
const barTopFor = (frame: HTMLElement | null, barH: number) => {
  const gh = frame?.querySelector('.ag-header')?.getBoundingClientRect();
  const minTop = Math.round(gh ? gh.bottom + 8 : gnbHeight() + 10);
  const row = frame?.querySelector('.ag-row-selected')?.getBoundingClientRect();
  if (!row) return minTop;
  const maxTop = Math.round(window.innerHeight - barH - 12);
  return Math.max(minTop, Math.min(maxTop, Math.round(row.top - barH - 8)));
};

/* 카드헤더 즐겨찾기 토글(★) — 현재 페이지(route)를 MenuStore 'fav'에 on/off. 개수 제한 없음.
   route가 메뉴(ALLMENU, key=라우트)에 없으면 렌더하지 않는다(FAB에서 표시·딥링크 불가). */
function FavStar({ route }: { route: string }) {
  const favs = useMenuSel("fav", APFS_DATA.DEFAULT_FAV);
  if (!APFS_DATA.ALLMENU.some((o: any) => o.key === route)) return null;
  const on = favs.includes(route);
  const toggle = () => MenuStore.set("fav", on ? favs.filter((k: string) => k !== route) : [...favs, route]);
  return (
    <button
      type="button" onClick={toggle} aria-pressed={on}
      aria-label={on ? "즐겨찾기 해제" : "즐겨찾기 추가"} title={on ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      className="inline-flex items-center justify-center cursor-pointer shrink-0"
      style={{ width: 30, height: 30, border: "none", borderRadius: 8, background: "transparent", color: on ? "var(--warning)" : "var(--caption)", transition: "color .15s,background .15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      {/* on: 채운 별 — svg 루트 inline fill이 fill="none" 속성을 덮는다(단일 폐곡선 star 글리프) */}
      <Icon name="star" size={17} style={on ? { fill: "var(--warning)" } : undefined} />
    </button>
  );
}

/* 헤더 우측 KPI 배지 — generic_list.tsx에서 verbatim 추출.
   value는 호출자가 넘기는 ReactNode(숫자/단위). */
export function KpiBadge({ icon, color, label, value, valueColor, valueSize }: { icon: string; color: string; label: string; value: React.ReactNode; valueColor?: string; valueSize?: number }) {
  return (
    <div className="flex items-center gap-2.5 py-2 px-3.5 bg-card" style={{ border: "1px solid var(--border)", borderRadius: 12 }}>
      <ColorChip icon={icon} color={color} size={30} iconSize={16} />
      <div className="flex flex-col" style={{ gap: 1, lineHeight: 1.2 }}>
        <span className="font-semibold text-caption" style={{ fontSize: 11 }}>{label}</span>
        <span className="tabular font-extrabold" style={{ fontSize: valueSize ?? 14, color: valueColor || "var(--foreground)" }}><UI.PopNumber value={value} /></span>
      </div>
    </div>
  );
}

export interface GridFrameProps {
  crumbs: string[];
  title: string;
  sub?: string;
  /** PageHeader 우측 액션 (예: 메인으로·내보내기). 내보내기 등 주 액션은 여기 한 곳에만. */
  headerActions?: React.ReactNode;
  /** 카드 헤더 타이틀(미지정 시 title 재사용) */
  cardTitle?: string;
  /** 카드 헤더 우측 KPI 배지군 슬롯 (KpiBadge 나열) */
  kpis?: React.ReactNode;
  /** 즐겨찾기 토글(★) 활성 — 현재 페이지의 라우트(onNav 인자와 동일 문자열).
      지정 시 카드헤더 타이틀 옆에 별 아이콘이 붙고, 클릭으로 MenuStore 'fav'에 on/off 된다. */
  favRoute?: string;
  /** 툴바 좌: 필터칩·선택 액션 */
  toolbarLeft?: React.ReactNode;
  /** 툴바 우: 새로고침·상세필터 등 보조 액션 */
  toolbarRight?: React.ReactNode;
  /** 선택 컨텍스트 액션 묶음(수정·삭제·선택 해제 등). **툴바 좌측에 렌더되다가, 스크롤로 툴바가
      화면 밖으로 나가면 하단 중앙 플로팅 바로 자리를 옮긴다.**
      ⚠️ 두 곳에 **복제하지 않고 한 인스턴스만** 존재한다 — 복제하면 화면 밖 원본이 탭 순서에 남아
      키보드 초점이 보이지 않는 버튼으로 뛴다(Codex P2). 그래서 `toolbarLeft` 와 별도 슬롯이며,
      소비처는 선택 시 `toolbarLeft` 를 비우고 이 prop 에 묶음을 넘긴다.
      이 prop 을 넘기지 않는 페이지는 동작 변화가 없다(기본 off). */
  contextActions?: React.ReactNode;
  /** 적용된 필터 — 툴바 아래 둘째 줄(값이 있는 항목이 있을 때만). 칩·전체 해제·aria 는 applied_filters.tsx 가 소유한다.
      툴바 좌측에 적용 칩을 직접 그리지 않는다(2026-09-24 전 화면 규약, 가드 applied_filters.test.ts). */
  appliedFilters?: readonly AppliedFilter[];
  /** 기본(주) 필터 칩 — 깔때기 뒤 첫 칩 무리. 페이지가 FilterChip 을 직접 그리지 않고 데이터로 넘긴다
      (넘치면 +N 메뉴로 접히고, 숨겨진 칩이 선택되면 첫 자리로 끌어올려진다 — applied_filters.tsx). */
  filterChips?: readonly FilterChipItem[];
  /** 푸터 좌: 건수 등 요약 텍스트 */
  footerLeft?: React.ReactNode;
  /** 푸터 중: 페이지네이션 */
  footerCenter?: React.ReactNode;
  /** 푸터 우: 뷰 토글·다운로드 등 */
  footerRight?: React.ReactNode;
  /** 테이블 본체. ⚠️ Card가 overflow:hidden이므로 가로 스크롤이 필요하면
      이 children이 자체 overflow-x:auto + min-width 래퍼를 반드시 가질 것(아니면 클립됨). */
  children: React.ReactNode;
}

export function GridFrame({
  crumbs, title, sub, headerActions, cardTitle, kpis, favRoute,
  toolbarLeft, toolbarRight, contextActions, appliedFilters, filterChips, footerLeft, footerCenter, footerRight, children,
}: GridFrameProps) {
  const hasToolbar = Boolean(toolbarLeft || toolbarRight || contextActions || (filterChips && filterChips.length) || activeFilters(appliedFilters).length);

  const hasFooter = Boolean(footerLeft || footerCenter || footerRight);

  /* 툴바가 화면 밖으로 스크롤됐는지 추적 → 그때만 하단 플로팅 바를 띄운다.
     페이지들의 `topMoreVisible`(상단 kebab 화면 밖 → 푸터 폴백)과 같은 패턴. */
  /* 관찰 대상은 툴바 전체가 아니라 **액션 줄의 하단 경계**(센티넬)다.
     - 툴바 전체를 보면: 좁은 폭에서 툴바가 2줄로 감길 때 액션 줄만 헤더 뒤로 숨어도
       우측 줄이 보이는 동안 교차 상태가 유지돼 바가 안 뜬다(Codex P2).
     - 액션 호스트를 직접 보면: 액션이 바로 빠져나간 뒤 호스트 높이가 0으로 붕괴해
       영구 non-intersecting → 위로 스크롤해도 바가 안 닫힌다.
     그래서 호스트 안에 **레이아웃 영향 0인 1px 절대배치 센티넬**을 두고 그것만 관찰한다.
     액션이 있을 때는 액션(감긴 줄 포함) 하단, 없을 때는 툴바 콘텐츠 상단을 가리켜
     양방향 모두 안정적이다(빠진 뒤엔 더 위 = 더 확실히 숨음, 되돌아오면 더 아래 = 더 확실히 보임). */
  const topSentinelRef = React.useRef<HTMLDivElement>(null);
  const midSentinelRef = React.useRef<HTMLDivElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [toolbarOut, setToolbarOut] = React.useState(false);
  /* IO 콜백은 [wantsFloating] 클로저 안에 있어 state 를 읽으면 stale 이다 — 현재값 거울. */
  const outRef = React.useRef(false);
  /* 바의 위치는 하드코딩하지 않고 실측으로 정한다. `left` 는 바의 **왼쪽 엣지**다(중앙 아님 —
     CSS 쪽 translateX(-50%) 도 함께 제거했다).
     - left: **체크박스 열 왼쪽 경계** (→ barLeftFor)
     - top: **선택된 행 바로 위**(위: 그리드 헤더 하단, 아래: 뷰포트 하단으로 clamp) (→ barTopFor)
     left 는 LNB 접기/펼치기처럼 window resize 없이 폭이 바뀌는 경우가 있어 ResizeObserver 로 추적한다. */
  const [barPos, setBarPos] = React.useState<{ left: number; top: number } | null>(null);
  const actionsHostRef = React.useRef<HTMLDivElement>(null);   // 툴바 쪽 액션 컨테이너
  const barRef = React.useRef<HTMLDivElement>(null);           // 플로팅 바
  /* 액션 묶음이 툴바↔바로 **이동**하면 포커스된 버튼이 언마운트돼 초점이 document 로 떨어진다.
     IO 콜백(리렌더 전)에 초점 인덱스를 적어 두고, 이동 후 같은 순번 버튼으로 되돌린다. */
  const pendingFocus = React.useRef<number | null>(null);
  /* 의존성은 **불리언**이어야 한다 — ReactNode 인 contextActions 를 그대로 넣으면
     렌더마다 새 참조라 옵저버가 매 렌더 해제·재등록된다. */
  const wantsFloating = FLOATING_ACTIONS && Boolean(contextActions);
  React.useEffect(() => {
    const top = topSentinelRef.current;
    const mid = midSentinelRef.current;
    if (!wantsFloating || !top || !mid || typeof IntersectionObserver === 'undefined') {
      outRef.current = false; setToolbarOut(false); return;
    }
    /* sticky GNB 가 뷰포트 상단을 덮는다. 보정하지 않으면 툴바가 GNB **뒤에 숨은 동안에도**
       isIntersecting=true 라, 액션이 안 보이는데 바도 안 뜨는 사각지대가 생긴다(Codex P2).
       ⚠️ 여기에 그리드 헤더 높이를 더하면 안 된다 — 툴바는 그리드보다 위에 있어서 GNB 뒤로
       먼저 들어가고, 그리드 헤더는 그 뒤에야 붙는다. 더하면 40px 일찍 발화한다(Codex P2). */
    const headerH = gnbHeight();

    const apply = (next: boolean) => {
      if (outRef.current === next) return;
      /* 리렌더 전이라 activeElement 가 아직 이동 전 버튼이다 — 지금 순번을 적어 둔다. */
      const ae = document.activeElement as HTMLElement | null;
      const host = ae && ae.closest('[data-apfs-actions]');
      pendingFocus.current = host ? Array.from(host.querySelectorAll('button')).indexOf(ae as HTMLButtonElement) : null;
      outRef.current = next;
      setToolbarOut(next);
    };

    /* **이력(hysteresis) — 표시와 숨김의 기준선이 다르다.** 센티넬 하나로는 한쪽이 반드시 틀린다:
       - 하단만 보면: 올라올 때 하단 1px 이 GNB 를 벗어나는 순간 바가 사라지는데 그 위 버튼들은
         아직 GNB 에 가려져 있다 → 한 줄 높이만큼 **아무것도 못 쓰는 구간**이 생긴다(Codex P2).
       - 상단만 보면: 내려갈 때 액션이 아직 거의 다 보이는데도 바가 떠서 버튼이 툭 튄다.
       그래서 기준선을 둘로 나눈다:
       - **표시 = 액션 줄의 중앙(top:50%)이 가려질 때.** 하단(=완전히 숨은 시점)으로 두면 그 전에
         "절반 이상 가려졌는데 바는 아직 없는" 구간이 생긴다(실측: y=130~150에서 버튼 상단 8~28px
         가림). 중앙 기준이면 바 없이 가려지는 최대치가 **절반**이라 남은 부분으로 계속 누를 수 있다.
       - **숨김 = 상단이 드러날 때**(액션이 완전히 보이는 시점).
       액션이 바로 옮겨가 호스트가 비면 두 센티넬이 같은 점으로 모이는데, 그 점이 아직 GNB 아래면
       '표시' 상태가 유지돼 깜빡임이 없다. */
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === mid && !e.isIntersecting) apply(true);
        else if (e.target === top && e.isIntersecting) apply(false);
      }
    }, { threshold: 0, rootMargin: `-${headerH}px 0px 0px 0px` });
    io.observe(top);
    io.observe(mid);
    return () => io.disconnect();
  }, [wantsFloating]);

  /* 이동 직후 같은 순번 버튼으로 초점 복귀. `preventScroll` 필수 —
     안 주면 브라우저가 초점 요소를 보이게 스크롤해 사용자의 스크롤과 싸운다. */
  React.useLayoutEffect(() => {
    const i = pendingFocus.current;
    pendingFocus.current = null;
    if (i == null || i < 0) return;
    const host = toolbarOut ? barRef.current : actionsHostRef.current;
    host?.querySelectorAll('button')[i]?.focus({ preventScroll: true });
  }, [toolbarOut]);


  const measureRef = React.useRef<(() => void) | null>(null);

  /* **의존성 배열 없음 = 매 렌더 재측정.** 선택 행이 바뀌면(페이지 state) GridFrame 이 새
     contextActions 로 리렌더되므로, 이것이 "선택이 다른 행으로 옮겨갔다"를 잡는 유일한 신호다
     (contextActions 는 렌더마다 새 ReactNode 라 의존성으로 쓸 수 없고, DOM 클래스 변화를
     MutationObserver 로 쫓는 것보다 가볍다). 비용은 렌더당 rect 읽기 2회.
     무한 루프는 measure 의 값 비교 가드가 막는다. */
  React.useLayoutEffect(() => {
    if (wantsFloating && toolbarOut) measureRef.current?.();
  });
  React.useEffect(() => {
    const root = rootRef.current;
    if (!wantsFloating || !root) return;
    const measure = () => {
      /* 바 높이는 버튼 구성·폰트에 따라 달라 하드코딩하지 않는다. 마운트 첫 프레임엔 아직
         0 이라 BAR_H_FALLBACK 을 쓰고, 아래 layout effect 가 실측값으로 곧바로 한 번 더 잰다. */
      const barH = barRef.current?.offsetHeight || BAR_H_FALLBACK;
      const left = barLeftFor(root);
      const top = barTopFor(root, barH);
      /* ⚠️ **값 비교 가드 필수.** 아래 "매 렌더 재측정" effect 와 맞물려, 매번 새 객체를
         set 하면 setState→렌더→effect→setState 무한 루프가 된다(이 저장소의 AG Grid
         onPaginationChanged 루프와 동형). prev 를 그대로 돌려주면 React 가 렌더를 건너뛴다. */
      setBarPos((prev) => (prev && prev.left === left && prev.top === top ? prev : { left, top }));
    };
    measureRef.current = measure;
    measure();
    /* ⚠️ root 만 관찰하면 안 된다 — 프레임이 maxWidth:1280 으로 캡된 데스크톱에서 LNB 를 접으면
       프레임 **폭은 1280 그대로인데 left 만 이동**해 ResizeObserver 가 울지 않고 바가 어긋난 채 남는다
       (Codex P2). 부모(<main>)는 그때 폭이 바뀌므로 부모까지 관찰하고, window resize 도 보탠다. */
    window.addEventListener('resize', measure);
    /* 바가 떠 있는 동안만 스크롤 추적 — 그리드 헤더가 붙는 구간에서 top 이 계속 변한다.
       rAF 로 합쳐 프레임당 1회만 실측한다. */
    let raf = 0;
    const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; measure(); }); };
    if (toolbarOut) window.addEventListener('scroll', onScroll, { passive: true });
    if (typeof ResizeObserver === 'undefined') return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    if (root.parentElement) ro.observe(root.parentElement);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [wantsFloating, toolbarOut]);
  /* 행 선택 중 — 툴바는 **선택 액션 영역**이 된다. 체크는 액션의 대상일 뿐 필터와 별개라(2026-09-24 사용자 결정)
     깔때기·필터 칩·+N 을 모두 감춘다(접어 두면 색 입은 +N 이 '필터가 걸렸다'로 읽힌다). */
  const selecting = Boolean(contextActions && !toolbarOut);

  return (
    <div ref={rootRef} style={{ maxWidth: 1280, margin: '0 auto', animation: 'dashFade var(--dur-slow) var(--ease) both' }}>
      {/* PageHeader: 현 shell은 title/sub를 렌더하지 않으므로(crumbs·actions만) title/sub는 카드헤더가 직접 그린다.
          title은 forward-compat용으로 계속 넘기되 라이브 제목은 카드 <h3> — 향후 shell이 title 렌더를 복원하면 중복 주의 */}
      <PageHeader crumbs={crumbs} title={title} actions={headerActions} />
      {/* ⚠️ overflow-hidden 제거: 푸터 sticky가 뷰포트 기준으로 달라붙으려면 조상에 scrollport가 없어야 한다.
          가로 클리핑은 이미 각 children이 자체 overflow-x:auto 래퍼로 책임진다(asset_funding=overflow-x-auto+min-w,
          AG Grid=내부 스크롤). 카드 모서리 클리핑은 푸터가 하단 모서리를 직접 라운딩해 보완. */}
      {/* 프레임 카드는 테두리·그림자 없이 페이지 배경과 같은 색(--frame-bg 토큰, tokens.css 한 줄로 전체 변경). inline이 Card의 border/bg 클래스보다 우선 */}
      {/* marginTop:10 — PageHeader가 공용 하단 마진을 버리고 소비처가 간격을 책임지는 규약(page별 mt-2.5)에 맞춰,
          GridFrame 소비처(제네릭 리스트·asset_funding·subfund_manage 등)의 브레드크럼↔카드 간격을 한 곳에서 복구. */}
      <Card pad={0} style={{ marginTop: 0, background: 'var(--frame-bg)', border: 0, boxShadow: 'none' }}>
        {/* 카드 헤더: 타이틀(+sub 캡션) + KPI 슬롯 */}
        <div className="flex items-center justify-between flex-wrap gap-4" style={{ padding: '15px 18px' }}>
          <div className="min-w-0">
            <div className="flex items-center" style={{ gap: 4 }}>
              <h3 className="font-bold" style={{ fontSize: 20, margin: 0, lineHeight: 1.4 }}>{cardTitle ?? title}</h3>
              {favRoute && <FavStar route={favRoute} />}
            </div>
            {sub && <p className="text-caption" style={{ fontSize: 12.5, margin: '2px 0 0', lineHeight: 1.4 }}>{sub}</p>}
          </div>
          {kpis && <div className="flex gap-2.5 flex-wrap">{kpis}</div>}
        </div>

        {/* 툴바 — 한 줄만 쓴다(2026-09-24 사용자 결정): 우측 액션 shrink-0 고정, 좌측 칩은 넘치는 만큼만 +N 메뉴로 접힌다.
            ≤640px 에서만 좌/우 두 줄 적층(좌측 basis-full). */}
        {hasToolbar && (
          <div className="flex items-center justify-between gap-3 max-[640px]:flex-wrap" style={{ padding: '6px 18px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--muted) 35%, transparent)' }}>
            <div className="flex items-center gap-2 min-w-0 flex-1 max-[640px]:basis-full">
              {/* 깔때기 = 필터 영역 표지, 항상 유지(2026-09-24 사용자 결정). 행 선택 중에만 뺀다 */}
              {!selecting && <Icon name="filter" size={16} className="text-caption shrink-0" />}
              {/* 액션은 툴바가 화면 안일 때만 여기 — 밖이면 아래 플로팅 바로 **이동**한다(복제 아님) */}
              <div ref={actionsHostRef} data-apfs-actions={selecting ? '' : undefined} className={`flex items-center gap-2 min-w-0 ${selecting ? 'flex-wrap' : 'flex-nowrap overflow-hidden whitespace-nowrap'}`} style={{ position: 'relative' }}>
                {selecting && contextActions}{toolbarLeft}
                {/* 센티넬 — absolute 라 flex 흐름·gap 에 영향 없음. relative 는 z-index 가 없으면
                    쌓임맥락을 만들지 않는다(→ z-index 스킬 "비-맥락: position:relative"). */}
                <div ref={topSentinelRef} aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, pointerEvents: 'none' }} />
                <div ref={midSentinelRef} aria-hidden="true" style={{ position: 'absolute', top: '50%', left: 0, width: 1, height: 1, pointerEvents: 'none' }} />
              </div>
              {!selecting && <FilterChipRow chips={filterChips} applied={appliedFilters} />}
            </div>
            <div className="flex items-center gap-1 shrink-0 max-[640px]:flex-wrap">{toolbarRight}</div>
          </div>
        )}

        {/* 본문: 테이블 (가로 스크롤은 children 책임 — 상단 계약 주석 참조) */}
        {children}

        {/* 푸터 — sticky 하단 고정: 긴 목록을 스크롤해도 건수·페이지네이션·뷰토글이 항상 보인다.
            background 불투명(스크롤되는 행이 비치지 않게) + 하단 모서리 라운딩(카드 overflow:hidden 제거 보완)
            + zIndex는 FAB(60)보다 낮게 둬 우하단 FAB 클릭성을 침범하지 않게 한다. */}
        {hasFooter && (
          <div className="flex items-center justify-between flex-wrap gap-3" style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', position: 'sticky', bottom: 0, zIndex: 20, background: 'var(--frame-bg)', borderBottomLeftRadius: 'var(--radius)', borderBottomRightRadius: 'var(--radius)' }}>
            <span className="flex items-center min-w-0 text-caption" style={{ fontSize: 12.5 }}>{footerLeft}</span>
            {footerCenter && <div className="flex items-center gap-1 flex-wrap">{footerCenter}</div>}
            <div className="flex items-center gap-1.5 flex-wrap">{footerRight}</div>
          </div>
        )}
      </Card>

      {/* 플로팅 액션 바(선택된 행 바로 위에 붙어 따라다닌다) — ⚠️ **반드시 body Portal**.
          이 컴포넌트 루트에 `animation: dashFade … both` 가 걸려 있어 종료 상태가 항등행렬로 굳고,
          그 transform 이 (a) 새 쌓임맥락 (b) fixed 의 컨테이닝블록을 만든다. 포털 없이 fixed 를 쓰면
          bottom 이 뷰포트가 아니라 카드 기준이 되고 z 도 그 맥락 안에 갇힌다(→ z-index 스킬 규칙 3·5). */}
      {wantsFloating && toolbarOut && createPortal(
        <div
          ref={barRef} data-apfs-actions=""
          role="toolbar" aria-label={(cardTitle ?? title) + ' 선택 항목 작업'}
          className="apfs-floating-actions"
          /* 위치는 **CSS 변수**로 넘긴다 — inline `left` 로 주면 좁은 폭 미디어쿼리(left:12px; right:88px)를
             inline 이 덮어 좁은 화면 레이아웃이 깨진다. 변수는 미디어쿼리가 그대로 무시할 수 있다. */
          style={{ zIndex: FLOATING_Z, ...(barPos ? { '--fab-left': barPos.left + 'px', '--fab-top': barPos.top + 'px' } as React.CSSProperties : null) }}>
          {contextActions}
        </div>,
        document.body,
      )}
    </div>
  );
}
