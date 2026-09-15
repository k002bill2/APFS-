/* GridFrame — 리스트/그리드/매트릭스 페이지 공통 양식 프레임(셸).
   generic_list.tsx의 시각 양식(PageHeader · Card pad0 · 카드헤더+KPI · 툴바 · 푸터)을
   SSOT로 표준화한다. 테이블 본체는 children으로 주입 —
   리스트(체크박스·CRUD)든 매트릭스(2단헤더·합계행)든 동일 프레임을 입는다.
   apfs-grid 스킬 규약의 정본 구현. */
import React from 'react';
import { createPortal } from 'react-dom';
import { Shell } from './shell';
import { UI } from './components';
import { MT } from './mask';
import { Icon } from './icons';
import { APFS_DATA, MenuStore, useMenuSel } from './data';

const { PageHeader } = Shell;
const { Card, ColorChip } = UI;

/* 플로팅 액션 바 전역 스위치(복구 레버) — false 로 바꾸면 전 화면에서 바가 사라지고
   `contextActions` 는 툴바에만 렌더되고 플로팅 바는 뜨지 않는다. IntersectionObserver 도 걸리지 않는다. */
const FLOATING_ACTIONS = true;

/* 떠 있는 바의 z. 셸 chrome 계층(≤60)에 속한다 — 푸터(20) 위, FAB(60) 아래, 모달(80)이 항상 덮는다.
   오버레이가 아니므로 토큰 스케일(75~90)을 쓰지 않는다(→ z-index 스킬 규칙 2). */
const FLOATING_Z = 55;

/* sticky GNB(shell.tsx `<header>` height:58, z50) 높이 — 하드코딩 금지, 실측. */
const gnbHeight = () => Math.round(document.querySelector('header')?.getBoundingClientRect().height ?? 58);

/* 바가 앉을 y = **그리드 헤더의 실측 하단** + 여백(헤더 바로 아래 = 행 체크박스 위).
   ⚠️ `gnb + 헤더높이` 로 계산하면 안 된다 — 그리드 헤더는 top:58 에 닿기 전까지 sticky 가 아니라
   아직 아래에 있어서, 고정값으로 두면 스크롤 도중 **아직 보이는 헤더를 바가 덮는다**(Codex P2).
   실측이라 헤더가 붙는 동안 바도 따라 올라와 항상 헤더 아래에 도킹한다.
   그리드가 없는 children(수제 표 등)은 GNB 아래로 폴백. */
const barTopFor = (frame: HTMLElement | null) => {
  const gh = frame?.querySelector('.ag-header')?.getBoundingClientRect();
  return Math.round(gh ? gh.bottom + 8 : gnbHeight() + 10);
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

/* 헤더 우측 KPI 배지 — generic_list.tsx에서 verbatim 추출(라벨 MT 마스킹 포함).
   value는 호출자가 이미 mn() 처리해 넘기는 ReactNode(숫자/단위), 라벨은 MT(원본 동일). */
export function KpiBadge({ icon, color, label, value, valueColor, valueSize }: { icon: string; color: string; label: string; value: React.ReactNode; valueColor?: string; valueSize?: number }) {
  return (
    <div className="flex items-center gap-2.5 py-2 px-3.5 bg-card" style={{ border: "1px solid var(--border)", borderRadius: 12 }}>
      <ColorChip icon={icon} color={color} size={30} iconSize={16} />
      <div className="flex flex-col" style={{ gap: 1, lineHeight: 1.2 }}>
        <span className="font-semibold text-caption" style={{ fontSize: 11 }}><MT>{label}</MT></span>
        <span className="tabular font-extrabold" style={{ fontSize: valueSize ?? 14, color: valueColor || "var(--foreground)" }}>{value}</span>
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
  toolbarLeft, toolbarRight, contextActions, footerLeft, footerCenter, footerRight, children,
}: GridFrameProps) {
  const hasToolbar = Boolean(toolbarLeft || toolbarRight || contextActions);
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
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [toolbarOut, setToolbarOut] = React.useState(false);
  /* 바의 위치는 하드코딩하지 않고 실측으로 정한다.
     - left: 뷰포트 중앙이 아니라 **프레임 카드 중앙** (LNB 폭만큼 왼쪽으로 치우치는 것 방지)
     - top: **그리드 헤더 실측 하단** + 8 = 헤더 바로 아래(행 체크박스 위).
       헤더를 밀어내는 방식은 버려진 띠로 행이 비쳐 보여서 폐기했다.
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
    const el = sentinelRef.current;
    if (!wantsFloating || !el || typeof IntersectionObserver === 'undefined') { setToolbarOut(false); return; }
    /* sticky GNB 가 뷰포트 상단을 덮는다. 보정하지 않으면 툴바가 GNB **뒤에 숨은 동안에도**
       isIntersecting=true 라, 액션이 안 보이는데 바도 안 뜨는 사각지대가 생긴다(Codex P2).
       ⚠️ 여기에 그리드 헤더 높이를 더하면 안 된다 — 툴바는 그리드보다 위에 있어서 GNB 뒤로
       먼저 들어가고, 그리드 헤더는 그 뒤에야 붙는다. 더하면 40px 일찍 발화한다(Codex P2). */
    const headerH = gnbHeight();
    const io = new IntersectionObserver(([e]) => {
      /* 리렌더 전이라 activeElement 가 아직 이동 전 버튼이다 — 지금 순번을 적어 둔다. */
      const ae = document.activeElement as HTMLElement | null;
      const host = ae && ae.closest('[data-apfs-actions]');
      pendingFocus.current = host ? Array.from(host.querySelectorAll('button')).indexOf(ae as HTMLButtonElement) : null;
      setToolbarOut(!e.isIntersecting);
    }, { threshold: 0, rootMargin: `-${headerH}px 0px 0px 0px` });
    io.observe(el);
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


  React.useEffect(() => {
    const root = rootRef.current;
    if (!wantsFloating || !root) return;
    const measure = () => {
      const r = root.getBoundingClientRect();
      setBarPos({ left: Math.round(r.left + r.width / 2), top: barTopFor(root) });
    };
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
  return (
    <div ref={rootRef} style={{ maxWidth: 1280, margin: '0 auto', animation: 'dashFade .3s var(--ease) both' }}>
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

        {/* 툴바 */}
        {hasToolbar && (
          <div className="flex items-center justify-between flex-wrap gap-3" style={{ padding: '6px 18px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--muted) 35%, transparent)' }}>
            {/* 액션은 툴바가 화면 안일 때만 여기 — 밖이면 아래 플로팅 바로 **이동**한다(복제 아님) */}
            <div ref={actionsHostRef} data-apfs-actions={contextActions && !toolbarOut ? '' : undefined} className="flex items-center gap-2 flex-wrap" style={{ position: 'relative' }}>
              {!toolbarOut && contextActions}{toolbarLeft}
              {/* 센티넬 — absolute 라 flex 흐름·gap 에 영향 없음. relative 는 z-index 가 없으면
                  쌓임맥락을 만들지 않는다(→ z-index 스킬 "비-맥락: position:relative"). */}
              <div ref={sentinelRef} aria-hidden="true" style={{ position: 'absolute', bottom: 0, left: 0, width: 1, height: 1, pointerEvents: 'none' }} />
            </div>
            <div className="flex items-center gap-1 flex-wrap">{toolbarRight}</div>
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

      {/* 플로팅 액션 바(그리드 헤더 바로 아래 = 행 체크박스 위) — ⚠️ **반드시 body Portal**.
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
