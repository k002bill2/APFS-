/* 전역 셸 — GNB / LNB / 브레드크럼 / 알림센터 / RBAC 게이팅 / 테마 토글 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Icon } from './icons';
import { UI } from './components';
import { APFS_DATA, useMenuSel, MenuStore, HistoryStore } from './data';
import { mn, MT } from './mask';
import { MainWidgets } from './main_widgets';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator } from './ui/dropdown-menu';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './ui/command';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from './ui/navigation-menu';
import logoUrl from './assets/logo.svg';
import logoWhiteUrl from './assets/logo_white.svg';

const { useState, useEffect, useLayoutEffect, useContext, useRef } = React;
const { ColorChip, IconBtn, StatusBadge, Button, SegTabs } = UI;
const D = APFS_DATA;

function useIsMobile(bp) {
  bp = bp || 760;
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth <= bp);
  useEffect(() => {
    const on = () => setM(window.innerWidth <= bp);
    window.addEventListener("resize", on); on();
    return () => window.removeEventListener("resize", on);
  }, [bp]);
  return m;
}

const rollup = (item) => item.children ? item.children.reduce((s, c) => s + (c.badge || 0), 0) || (item.badge || 0) : (item.badge || 0);

/* 새 항목(badge) 표시용 작은 점 — 숫자 카운트 대신 사용. urgent면 빨강(--danger). */
const NewDot = ({ urgent }: { urgent?: boolean }) => <span className="shrink-0" style={{ width: 6, height: 6, borderRadius: 99, background: urgent ? "var(--danger)" : "var(--primary)" }} />;

/* 모든 중분류 서브그룹(`m.id:s{i}`)을 펼친 상태로 초기화 — 서브메뉴 기본 오픈. 키 인덱스는 MenuChildren의 c.map((c,i)) 인덱스와 일치해야 한다. */
const allSubGroupsExpanded = () => {
  const map: Record<string, boolean> = {};
  D.MENU.forEach((m) => {
    if (!m.children) return;
    m.children.forEach((c, i) => { if (c.sub && c.children) map[m.id + ":s" + i] = true; });
  });
  return map;
};

/* ---------- 메뉴 자식 렌더링 (Lnb·RailNav 공유 — 3레벨: 하위그룹/리프/직접리프, 카운터는 조기경보만) ---------- */
function MenuChildren({ m, expanded, setExpanded, onNav }) {
  const showDots = m.id === "risk";
  return (
    <>{m.children.map((c, i) => {
      if (c.sub && c.children) {
        const subKey = m.id + ":s" + i;
        const subOpen = expanded[subKey];
        const subCount = c.children.reduce((s, x) => s + (x.badge || 0), 0) || (c.badge || 0);
        return (
          <div key={i} style={{ marginBottom: 1 }}><button
              onClick={() => setExpanded((e) => ({ ...e, [subKey]: !e[subKey] }))}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              className="w-full flex items-center justify-between gap-1.5 cursor-pointer py-1 px-2.5 text-foreground"
              style={{
                border: "none", font: "inherit", fontWeight: 700, borderRadius: 6,
                background: "transparent", fontSize: 13, transition: "background .15s",
              }}><span
                className="whitespace-nowrap overflow-hidden text-left"
                style={{ textOverflow: "ellipsis" }}>{c.label}</span><div className="flex items-center gap-1.5 shrink-0">{showDots && subCount > 0 && <NewDot urgent={m.urgent} />}<Icon
                  name="chevron-down"
                  size={12}
                  style={{ transform: subOpen ? "rotate(0)" : "rotate(-90deg)", transition: "transform .15s", opacity: .5 }} /></div></button>{subOpen && <div className="mb-0.5 pl-3.5">{c.children.map((leaf, j) => <button
                key={j}
                onClick={() => onNav(leaf.path || leaf.label)}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                className="w-full flex items-center justify-between gap-2 cursor-pointer px-2.5 text-muted-foreground"
                style={{
                  border: "none", font: "inherit", fontWeight: 500,
                  borderRadius: 6, paddingTop: 5, paddingBottom: 5,
                  background: "transparent", fontSize: 13, transition: "background .15s",
                }}><span
                  className="whitespace-nowrap overflow-hidden text-left"
                  style={{ textOverflow: "ellipsis" }}>{leaf.label}</span>{showDots && leaf.badge > 0 && <NewDot urgent={m.urgent} />}</button>)}</div>}</div>
        );
      }
      return (
        <button
          key={i}
          onClick={() => onNav(c.path || c.label)}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          className="w-full flex items-center justify-between gap-2 cursor-pointer py-1.5 px-2.5 text-muted-foreground"
          style={{
            border: "none", font: "inherit", fontWeight: 500, borderRadius: 7,
            background: "transparent", fontSize: 13, transition: "background .15s",
          }}><span
            className="whitespace-nowrap overflow-hidden text-left"
            style={{ textOverflow: "ellipsis" }}>{c.label}</span>{showDots && c.badge > 0 && <NewDot urgent={m.urgent} />}</button>
      );
    })}</>
  );
}

/* ---------- 접힘 LNB 플라이아웃 아이템 (Radix NavigationMenu — 키보드 진입 경로) ----------
   트리거(아이콘) hover/포커스/Enter로 플라이아웃 오픈(기존 hover-전용 갭 해소). Content는 fixed로
   레일 overflow 클리핑 탈출(top은 트리거 위치로 계산). 자식 없는 항목은 단순 NavigationMenuLink. */
function LnbFlyItem({ m, count, isActive, expanded, setExpanded, onNav }) {
  const triggerRef = React.useRef<any>(null);
  const [top, setTop] = useState(64);
  const place = () => { const r = triggerRef.current?.getBoundingClientRect(); if (r) setTop(Math.max(64, Math.min(r.top, window.innerHeight - 360))); };
  const dot = count > 0 ? <span className="absolute top-1.5 right-2" style={{ width: 7, height: 7, borderRadius: 99, background: m.urgent ? "var(--danger)" : "var(--primary)" }} /> : null;
  const btnStyle: React.CSSProperties = {
    gap: 11, border: "none", font: "inherit", borderRadius: 9, padding: "10px", justifyContent: "center",
    background: isActive ? "color-mix(in srgb,var(--primary) 12%,transparent)" : "transparent",
    color: isActive ? "var(--primary)" : "var(--foreground)", fontWeight: isActive ? 700 : 500, transition: "background .15s",
  };
  if (!m.children) {
    return (
      <NavigationMenuItem className="mb-0.5">
        <NavigationMenuLink asChild>
          <button onClick={() => m.path && onNav(m.path)} aria-label={m.label} aria-current={isActive ? "page" : undefined}
            className="relative w-full flex items-center cursor-pointer" style={btnStyle}>
            <Icon name={m.icon} size={20} stroke={isActive ? 2.3 : 2} />{dot}</button>
        </NavigationMenuLink>
      </NavigationMenuItem>
    );
  }
  return (
    <NavigationMenuItem value={m.id} className="mb-0.5">
      <NavigationMenuTrigger ref={triggerRef} onPointerEnter={place} onFocus={place} aria-label={m.label}
        className="relative w-full flex items-center" style={btnStyle}>
        <Icon name={m.icon} size={20} stroke={isActive ? 2.3 : 2} />{dot}</NavigationMenuTrigger>
      <NavigationMenuContent style={{ left: 70, top, width: 264, maxHeight: `calc(100vh - ${top + 16}px)`, animation: "railSlide .18s var(--ease) both" }}>
        <div className="flex items-center shrink-0 pt-3.5 px-4 pb-2.5" style={{ gap: 9, borderBottom: "1px solid var(--border)" }}>
          <ColorChip icon={m.icon} color={m.urgent ? "var(--danger)" : "var(--primary)"} size={30} iconSize={16} />
          <span className="font-bold" style={{ fontSize: 13.5 }}>{m.label}</span>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5">{m.path && <NavigationMenuLink asChild>
          <button onClick={() => onNav(m.path)}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            className="w-full flex items-center gap-2 cursor-pointer py-2 px-2.5 text-primary mb-1"
            style={{ border: "none", font: "inherit", fontWeight: 700, borderRadius: 8, background: "transparent", fontSize: 12.5 }}>
            <Icon name="arrow-right" size={14} />전체 보기</button></NavigationMenuLink>}
          <MenuChildren m={m} expanded={expanded} setExpanded={setExpanded} onNav={onNav} /></div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

/* ---------- LNB ---------- */
function Lnb({ open, role, route, onNav, mobile, drawerOpen }) {
  const [expanded, setExpanded] = useState(() => ({ ...allSubGroupsExpanded(), risk: true }));
  const [navValue, setNavValue] = useState("");
  const menu = D.MENU.filter((m) => m.roles.includes(role));
  const collapsed = !open && !mobile;
  const navTo = (r) => { onNav(r); setNavValue(""); };
  const posStyle: React.CSSProperties = mobile
    ? { position: "fixed", top: 58, left: 0, width: 270, height: "calc(100vh - 58px)", zIndex: 45,
        transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
        boxShadow: drawerOpen ? "var(--shadow-lg)" : "none", transition: "transform .24s var(--ease)" }
    : { width: open ? 260 : 66, position: "sticky", top: 58, height: "calc(100vh - 58px)", zIndex: 48, transition: "width .22s var(--ease)" };
  return (
    <nav
      aria-label="주 메뉴"
      {...(mobile && !drawerOpen ? { inert: "" } : {})}
      className="shrink-0 bg-card flex flex-col overflow-hidden"
      style={{
        borderRight: "1px solid var(--border)", ...posStyle,
      }}>{collapsed
        ? <NavigationMenu orientation="vertical" value={navValue} onValueChange={setNavValue}
            className="flex-1 overflow-y-auto overflow-x-hidden block max-w-none" style={{ padding: "14px 8px 8px" }}><NavigationMenuList className="gap-0.5">{menu.map((m) => <LnbFlyItem
              key={m.id} m={m} count={m.id === "risk" ? rollup(m) : 0}
              isActive={!!(m.path && m.path === route)}
              expanded={expanded} setExpanded={setExpanded} onNav={navTo} />)}</NavigationMenuList></NavigationMenu>
        : <div
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ padding: open ? "14px 14px 8px" : "14px 8px 8px" }}>{menu.map((m) => {
          const showCounts = m.id === "risk";
          const count = showCounts ? rollup(m) : 0;
          const isActive = m.path && m.path === route;
          const hasKids = !!m.children;
          const isOpen = expanded[m.id];
          return (
            <div key={m.id} className="mb-0.5"><button
                onClick={() => { if (m.path) onNav(m.path); if (hasKids && open) setExpanded((e) => ({ ...e, [m.id]: !e[m.id] })); }}
                aria-current={isActive ? "page" : undefined}
                title={!open ? m.label : undefined}
                className="relative w-full flex items-center cursor-pointer"
                style={{
                  gap: 11, border: "none", font: "inherit", borderRadius: 9, padding: open ? "9px 10px" : "10px", justifyContent: open ? "flex-start" : "center",
                  background: isActive ? "color-mix(in srgb,var(--primary) 12%,transparent)" : "transparent",
                  color: isActive ? "var(--primary)" : "var(--foreground)", fontWeight: isActive ? 700 : 500, fontSize: 13.5,
                  transition: "background .15s",
                }}><Icon name={m.icon} size={20} stroke={isActive ? 2.3 : 2} />{open && <span className="flex-1 text-left whitespace-nowrap">{m.label}</span>}{open && (m as any).isNew && <span className="font-extrabold text-accent" style={{ fontSize: 9.5 }}>NEW</span>}{count > 0 && (open
                  ? <span style={{ width: 7, height: 7, borderRadius: 99, flexShrink: 0, background: m.urgent ? "var(--danger)" : "var(--primary)" }} />
                  : <span
                  className="absolute top-1.5 right-2"
                  style={{ width: 7, height: 7, borderRadius: 99, background: m.urgent ? "var(--danger)" : "var(--primary)" }} />)}{open && hasKids && <Icon
                  name="chevron-down"
                  size={15}
                  style={{ transform: isOpen ? "rotate(0)" : "rotate(-90deg)", transition: "transform .18s", opacity: .6 }} />}</button>{open && hasKids && isOpen && <div className="mt-0.5 mb-1 mx-0 pl-4"><MenuChildren m={m} expanded={expanded} setExpanded={setExpanded} onNav={onNav} /></div>}</div>
          );
        })}</div>}<div
        style={{ borderTop: "1px solid var(--border)", padding: open ? "8px 10px" : "8px" }}><button
          onClick={() => onNav("designsystem")}
          aria-current={route === "designsystem" ? "page" : undefined}
          title={collapsed ? "디자인 시스템" : undefined}
          className="relative w-full flex items-center cursor-pointer"
          style={{
            gap: 11, border: "none", font: "inherit", borderRadius: 9, padding: open ? "9px 10px" : "10px", justifyContent: open ? "flex-start" : "center",
            background: route === "designsystem" ? "color-mix(in srgb,var(--primary) 12%,transparent)" : "transparent",
            color: route === "designsystem" ? "var(--primary)" : "var(--muted-foreground)", fontWeight: route === "designsystem" ? 700 : 500, fontSize: 13.5,
          }}><Icon name="layers" size={20} />{open && <span className="whitespace-nowrap">디자인 시스템</span>}</button></div><div
        style={{ borderTop: "1px solid var(--border)", padding: open ? "10px 14px" : "10px 8px" }}>{open
          ? <div className="flex items-center gap-2.5"><ColorChip icon="shield-check" color="var(--success)" size={30} iconSize={16} /><div style={{ lineHeight: 1.3 }}><div className="font-bold" style={{ fontSize: 11.5 }}>보안 접속 정상</div><div className="t-caption" style={{ fontSize: 10.5 }}>내부망 · TLS 1.3</div></div></div>
          : <div className="flex justify-center"><Icon name="shield-check" size={18} style={{ color: "var(--success)" }} /></div>}</div>
      </nav>
  );
}

/* ---------- RailNav 아이템 (Radix NavigationMenu — 키보드 진입 경로) ----------
   ClickUp형 아이콘 레일. 트리거 hover/포커스/Enter로 우측 풀-하이트 슬라이드 패널 오픈,
   Tab으로 패널 진입, Escape 닫기+트리거 복귀(기존 클릭-전용 패널 + 접근불가 호버툴팁 갭 해소).
   자식 없는 항목은 NavigationMenuLink(네비). 패널 식별 라벨은 패널 헤더 + title 속성. */
function RailItem({ m, route, expanded, setExpanded, onNav }) {
  const count = m.id === "risk" ? rollup(m) : 0;
  const isActive = m.path === route;
  const btnCls = "relative cursor-pointer flex items-center justify-center mx-auto my-0 transition-colors hover:bg-[var(--accent-surface)] data-[state=open]:bg-[color-mix(in_srgb,var(--primary)_13%,transparent)]";
  const btnStyle: React.CSSProperties = {
    width: 48, height: 48, borderRadius: 12, border: "none", font: "inherit",
    background: isActive ? "color-mix(in srgb,var(--primary) 13%,transparent)" : "transparent",
    color: isActive ? "var(--primary)" : "var(--foreground)",
  };
  const inner = <><Icon name={m.icon} size={21} stroke={isActive ? 2.3 : 2} />{count > 0 && <span className="absolute right-2" style={{ top: 7, width: 7, height: 7, borderRadius: 99, background: m.urgent ? "var(--danger)" : "var(--primary)" }} />}</>;
  if (!m.children) {
    return (
      <NavigationMenuItem>
        <NavigationMenuLink asChild>
          <button onClick={() => onNav(m.path)} aria-label={m.label} aria-current={isActive ? "page" : undefined} title={m.label} className={btnCls} style={btnStyle}>{inner}</button>
        </NavigationMenuLink>
      </NavigationMenuItem>
    );
  }
  return (
    <NavigationMenuItem value={m.id}>
      <NavigationMenuTrigger aria-label={m.label} aria-current={isActive ? "page" : undefined} title={m.label} className={btnCls} style={btnStyle}>{inner}</NavigationMenuTrigger>
      <NavigationMenuContent className="rounded-none border-0 shadow-lg"
        style={{ left: 64, top: 58, bottom: 0, width: 264, borderRight: "1px solid var(--border)", animation: "railSlide .2s var(--ease) both" }}>
        <div className="flex items-center shrink-0 pt-4 px-4 pb-3.5" style={{ gap: 9, borderBottom: "1px solid var(--border)" }}>
          <ColorChip icon={m.icon} color={m.urgent ? "var(--danger)" : "var(--primary)"} size={30} iconSize={16} />
          <span className="font-bold" style={{ fontSize: 14.5 }}>{m.label}</span>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5">{m.path && <NavigationMenuLink asChild>
          <button onClick={() => onNav(m.path)}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            className="w-full flex items-center gap-2 cursor-pointer py-2 px-2.5 text-primary mb-1"
            style={{ border: "none", font: "inherit", fontWeight: 700, borderRadius: 8, background: "transparent", fontSize: 12.5 }}>
            <Icon name="arrow-right" size={14} />전체 보기</button></NavigationMenuLink>}
          <MenuChildren m={m} expanded={expanded} setExpanded={setExpanded} onNav={onNav} /></div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

/* ---------- RailNav (ClickUp형 아이콘 레일 + 우측 슬라이드 패널) ---------- */
function RailNav({ role, route, onNav, mobile, drawerOpen }) {
  const menu = D.MENU.filter((m) => m.roles.includes(role));
  const [expanded, setExpanded] = useState(allSubGroupsExpanded);
  const [navValue, setNavValue] = useState("");
  useEffect(() => { setNavValue(""); }, [route]);
  if (mobile && !drawerOpen) return null;
  const navTo = (r) => { onNav(r); setNavValue(""); };
  return (
    <nav aria-label="주 메뉴" aria-hidden={mobile && !drawerOpen ? true : undefined}
      className="shrink-0 bg-card flex flex-col"
      style={{
        position: mobile ? "fixed" : "sticky", left: mobile ? 0 : undefined, top: 58,
        height: "calc(100vh - 58px)", width: 64, zIndex: 48, borderRight: "1px solid var(--border)",
      }}>
      <NavigationMenu orientation="vertical" value={navValue} onValueChange={setNavValue}
        className="flex-1 overflow-y-auto overflow-x-hidden block max-w-none">
        <NavigationMenuList className="flex flex-col gap-1 py-3 px-2">{menu.map((m) => <RailItem
          key={m.id} m={m} route={route} expanded={expanded} setExpanded={setExpanded} onNav={navTo} />)}</NavigationMenuList>
      </NavigationMenu>
      <div className="p-2" style={{ borderTop: "1px solid var(--border)" }}><button
        onClick={() => navTo("designsystem")} aria-label="디자인 시스템" aria-current={route === "designsystem" ? "page" : undefined} title="디자인 시스템"
        className="relative cursor-pointer flex items-center justify-center mx-auto my-0 transition-colors hover:bg-[var(--accent-surface)]"
        style={{ width: 48, height: 48, borderRadius: 12, border: "none", font: "inherit",
          background: route === "designsystem" ? "color-mix(in srgb,var(--primary) 13%,transparent)" : "transparent",
          color: route === "designsystem" ? "var(--primary)" : "var(--foreground)" }}><Icon name="layers" size={21} stroke={route === "designsystem" ? 2.3 : 2} /></button></div>
      <div className="py-2.5 px-2 flex justify-center" style={{ borderTop: "1px solid var(--border)" }} title="보안 접속 정상 · 내부망 TLS 1.3"><Icon
        name="shield-check" size={18} style={{ color: "var(--success)" }} /></div>
    </nav>
  );
}

/* ===== 알림 공통 헬퍼 ===== */
const NC_TAGICON: Record<string, string> = {
  결재: "file", 메모: "memo", ToDo: "check-circle", 긴급공지: "alert-triangle", 긴급: "alert-triangle",
  공지: "bell", 환전: "landmark", 보완요청: "alert-triangle", 처리완료: "check-circle",
  준법: "shield-check", 운영: "settings", 회의: "users", 출장: "arrow-right", 휴가: "calendar",
};
const NC_SUMICON: Record<string, string> = { 메모: "memo", 공지사항: "bell", 일정: "calendar", 시스템: "shield-check" };

function ncRow(key: string, p: any) {
  const { tone = "info", icon, tag, title, meta, date, dday } = p;
  const ic = icon || (tag && NC_TAGICON[tag]) || "bell";
  return (
    <button key={key} className="nc-row flex items-center gap-2.5 w-full text-left cursor-pointer mb-1" style={{
      padding: "9px 12px", borderRadius: 10,
      border: "none", background: "color-mix(in srgb, var(--muted) 45%, var(--card))", font: "inherit",
    }}>
      <Icon name={ic} size={16} style={{ color: `var(--${tone})`, flex: "0 0 auto" }} />
      {tag && <StatusBadge tone={tone} label={"　　"} size="sm" />}
      <span className="flex-1 min-w-0 font-semibold text-foreground whitespace-nowrap overflow-hidden" style={{ fontSize: 13.5, textOverflow: "ellipsis" }}><MT>{title}</MT></span>
      {meta && <span className="t-caption nc-meta whitespace-nowrap shrink-0"><MT>{meta}</MT></span>}
      {(date || dday) && <span className="whitespace-nowrap shrink-0" style={{ fontSize: 11.5, fontWeight: dday ? 800 : 600, color: dday ? `var(--${tone})` : "var(--caption)" }}>{mn(dday || date)}</span>}
    </button>
  );
}

function ncMemoBody(withBar: boolean) {
  const T = D.NOTIF_CENTER.todo;
  const all = [...T.delayed, ...T.progress, ...T.upcoming];
  return (
    <div>
      {withBar && <div className="nc-memobar">
        <input type="text" placeholder="검색어를 입력하세요" aria-label="메모 검색" className="nc-search" />
        <button className="nc-addbtn">+ 등록</button>
      </div>}
      {all.map((t: any, i: number) => ncRow("mm" + i, { tone: "info", icon: "memo", title: t.title, meta: t.due ? "마감 " + t.due : (t.start ? "시작 " + t.start : "") }))}
    </div>
  );
}

function NcScheduleBody() {
  const S = D.NOTIF_CENTER.schedule;
  const rows = [...S.today.map((s: any) => ({ ...s, when: "오늘" })), ...S.week.map((s: any) => ({ ...s, when: "이번 주" }))];
  const [sel, setSel] = useState<number | null>(null);
  const YEAR = 2026, MONTH = 5, TODAY = 19;
  const first = new Date(YEAR, MONTH, 1).getDay();
  const daysIn = new Date(YEAR, MONTH + 1, 0).getDate();
  const eventDays: Record<number, any[]> = {};
  rows.forEach((r: any) => { if (r.day) (eventDays[r.day] = eventDays[r.day] || []).push(r); });
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);
  const dow = ["일", "월", "화", "수", "목", "금", "토"];
  const visible = sel ? rows.filter((r: any) => r.day === sel) : rows;
  return (
    <div className="flex gap-4 items-start flex-wrap">
      <div className="shrink-0 pt-0.5 px-0.5 pb-1" style={{ width: "min(250px, 100%)" }}>
        <div className="flex items-center justify-center gap-2 mb-2.5">
          <Icon name="calendar" size={14} style={{ color: "var(--brand-blue)" }} />
          <span className="font-extrabold" style={{ fontSize: 13.5, letterSpacing: "-.01em" }}>2026년 6월</span>
        </div>
        <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
          {dow.map((w, i) => <div key={"h" + i} className="text-center font-bold py-0.5 px-0" style={{ fontSize: 10.5, color: i === 0 ? "var(--danger)" : i === 6 ? "var(--brand-blue)" : "var(--caption)" }}>{w}</div>)}
          {cells.map((d, i) => {
            if (d === null) return <div key={"e" + i} />;
            const evs = eventDays[d];
            const isSel = sel === d, isToday = d === TODAY;
            const tone = evs ? evs[0].tone : null;
            return (
              <button key={"d" + i} onClick={() => evs && setSel(isSel ? null : d)} className="relative flex flex-col items-center justify-center" style={{
                aspectRatio: "1",
                gap: 1, border: "none", borderRadius: 7, font: "inherit", cursor: evs ? "pointer" : "default",
                background: isSel ? "var(--brand-blue)" : isToday ? "var(--muted)" : "transparent",
                color: isSel ? "var(--on-brand-solid)" : "var(--foreground)", fontSize: 11.5, fontWeight: isToday || evs ? 700 : 500,
              }}>
                {String(d)}
                {evs && <span className="w-1 h-1" style={{ borderRadius: 99, background: isSel ? "var(--on-brand-solid)" : `var(--${tone})` }} />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grow shrink min-w-0 pl-4" style={{ flexBasis: "min(100%, 300px)", borderLeft: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 pt-0.5 px-1.5 pb-2">
          <span className="font-extrabold text-foreground" style={{ fontSize: 13 }}>{sel ? "6월 " + sel + "일 일정" : "전체 일정"}</span>
          <span className="font-bold text-muted-foreground" style={{ fontSize: 12 }}>{visible.length}</span>
          {sel && <button onClick={() => setSel(null)} className="ml-auto text-brand-blue cursor-pointer" style={{ border: "none", background: "transparent", font: "inherit", fontWeight: 700, fontSize: 12 }}>전체 보기</button>}
        </div>
        {visible.map((s: any, i: number) => (
          <button key={"sr" + i} onClick={() => s.day && setSel(s.day)} className="nc-row flex items-center gap-2.5 w-full text-left cursor-pointer mb-1" style={{
            padding: "9px 12px", borderRadius: 10,
            border: "none", font: "inherit",
            background: s.day === sel ? "color-mix(in srgb,var(--brand-blue) 12%,var(--card))" : "color-mix(in srgb, var(--muted) 45%, var(--card))",
          }}>
            <Icon name={NC_TAGICON[s.tag] || "calendar"} size={16} style={{ color: `var(--${s.tone})`, flex: "0 0 auto" }} />
            <StatusBadge tone={s.tone} label={"　　"} size="sm" />
            <span className="flex-1 min-w-0 font-semibold whitespace-nowrap overflow-hidden" style={{ fontSize: 13.5, textOverflow: "ellipsis" }}><MT>{s.title}</MT></span>
            <span className="t-caption nc-meta whitespace-nowrap shrink-0"><MT>{s.by + (s.time ? " · " + s.time : "")}</MT></span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- 범용 가운데 모달 ---------- */
function CenterModal({ open, onClose, title, icon, width, children, footer }: {
  open: boolean; onClose: () => void; title: string; icon?: string;
  width?: number; children?: React.ReactNode; footer?: React.ReactNode[];
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[86vh] max-w-[calc(100vw-32px)]" style={{ width: width || 560 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            {icon && <Icon name={icon} size={18} style={{ color: "var(--brand-blue)" }} />}
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto" style={{ padding: "14px 16px 18px" }}>{children}</div>
        {footer && <DialogFooter className="justify-end">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- 알림센터 모달 (5-tab) ---------- */
function NotifCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState("all");
  const NC = D.NOTIF_CENTER;
  useEffect(() => { if (open) setTab("all"); }, [open]);
  const memoCount = NC.todo.delayed.length + NC.todo.progress.length + NC.todo.upcoming.length;
  const scCount = NC.schedule.today.length + NC.schedule.week.length;
  const noCount = NC.notice.length;
  const syCount = NC.system.length;
  const total = memoCount + scCount + noCount + syCount;
  const cap = (n: number) => (n > 99 ? "99+" : String(n));
  const tabs = [
    { id: "all", label: "전체" },
    { id: "memo", label: "메모", count: memoCount },
    { id: "notice", label: "공지사항", count: noCount },
    { id: "schedule", label: "일정", count: scCount },
    { id: "system", label: "시스템", count: syCount },
  ];
  function Body() {
    if (tab === "all") {
      const recent = [
        { tone: "danger",  tag: "결재",     title: "물품구매 신청의 건",                      meta: "물품구매 · 김정원", date: "2026-06-15" },
        { tone: "warning", tag: "메모",     title: "5월 결산 전표 검토·승인",                   meta: "마감 2026.06.21",   dday: "D-2" },
        { tone: "danger",  tag: "긴급공지", title: "휴가 및 휴직 결재선 및 신청 가이드",        meta: "경영지원실",        date: "2026-06-15" },
        { tone: "info",    tag: "환전",     title: "로고스벤처투자조합 1호 환율(1,200원) 확정", meta: "홍길동",            date: "2026-06-11" },
        { tone: "warning", tag: "준법",     title: "투자전확인서류(IL0203) 제출 기한 임박",     meta: "IL0203",            date: "2026-06-15" },
      ];
      return (
        <div className="flex flex-col" style={{ gap: 18 }}>
          <div>
            <div className="nc-section mb-1">최근 알림 · 3일 이내</div>
            <div>{recent.map((r, i) => ncRow("rc" + i, r))}</div>
          </div>
        </div>
      );
    }
    if (tab === "memo") return ncMemoBody(true);
    if (tab === "notice") return <div>{NC.notice.map((n: any, i: number) => ncRow("no" + i, { tone: n.tone, tag: n.tag, title: n.title, meta: n.by, date: n.date }))}</div>;
    if (tab === "schedule") return <NcScheduleBody />;
    if (tab === "system") return <div>{NC.system.map((s: any, i: number) => ncRow("sy" + i, { tone: s.tone, tag: s.tag, title: s.title, meta: s.code, date: s.date }))}</div>;
    return null;
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent hideClose className="max-w-[calc(100vw-32px)] max-h-[90vh]" style={{ width: 1000, height: 680 }}>
        <DialogDescription className="sr-only">메모·공지사항·일정·시스템 알림 모음</DialogDescription>
        <header className="flex items-center" style={{ gap: 9, padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <Icon name="bell" size={18} style={{ color: "var(--brand-blue)" }} />
          <DialogTitle className="font-extrabold" style={{ fontSize: 17, letterSpacing: "-.01em" }}>알림센터</DialogTitle>
          <span className="text-center font-extrabold bg-danger" style={{ fontSize: 12, color: "var(--destructive-foreground)", borderRadius: 99, padding: "2px 9px", minWidth: 22 }}>{cap(total)}</span>
          <div className="flex-1" />
          <button onClick={onClose} className="text-muted-foreground font-semibold cursor-pointer py-1.5 px-2" style={{ border: "none", background: "transparent", fontSize: 13, fontFamily: "inherit" }}>모두 읽음</button>
          <IconBtn icon="x" onClick={onClose} label="닫기" size={36} />
        </header>
        <div role="tablist" className="flex gap-0.5 overflow-x-auto py-0 px-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} role="tab" aria-selected={on} onClick={() => setTab(t.id)} className="flex items-center cursor-pointer whitespace-nowrap relative" style={{ gap: 7, padding: "13px 16px", border: "none", background: "transparent", font: "inherit", color: on ? "var(--brand-blue)" : "var(--muted-foreground)", fontWeight: on ? 800 : 600, fontSize: 14, borderBottom: on ? "2px solid var(--brand-blue)" : "2px solid transparent", marginBottom: -1 }}>
                {t.label}
                {t.count ? <span className="font-extrabold" style={{ fontSize: 11, borderRadius: 99, padding: "1px 7px", background: on ? "var(--brand-blue)" : "var(--muted)", color: on ? "var(--on-brand-solid)" : "var(--muted-foreground)" }}>{cap(t.count)}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto" style={{ padding: "18px 18px 22px" }}><Body /></div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- 사용자 메뉴 ---------- */
function UserMenu({ onUserModal }: { onUserModal: (id: string) => void }) {
  const items = [
    { id: "memo", label: "메모", icon: "memo", danger: false },
    { id: "schedule", label: "일정", icon: "calendar", danger: false },
    { id: "logout", label: "로그아웃", icon: "external", danger: true },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label="사용자 메뉴" className="flex items-center gap-2 cursor-pointer py-0.5 px-1" style={{ border: "none", background: "transparent", font: "inherit" }}>
          <span className="w-8 h-8 flex items-center justify-center" style={{ borderRadius: 99, background: "var(--brand-gray)", color: "var(--on-brand-solid)" }}>
            <Icon name="user" size={18} stroke={2.2} />
          </span>
          <span className="gnb-user font-semibold text-left" style={{ fontSize: 12.5, lineHeight: 1.2 }}>
            <div>김정원</div><div className="t-caption" style={{ fontSize: 10.5 }}>투자운용본부</div>
          </span>
          <Icon name="chevron-down" size={14} style={{ opacity: .5, marginLeft: 2 }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]">
        {items.map((it) => (
          <React.Fragment key={it.id}>
            {it.id === "logout" && <DropdownMenuSeparator />}
            <DropdownMenuItem danger={it.danger} onSelect={() => onUserModal(it.id)}>
              <Icon name={it.icon} size={16} className="shrink-0" />{it.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------- Role switcher — Radix DropdownMenu(RadioGroup, 키보드 내비·radio 시맨틱) ---------- */
function RoleSwitch({ role, onRole }) {
  const cur = D.ROLES.find((r) => r.id === role);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="gnb-rolesw flex items-center gap-2 cursor-pointer bg-card py-1.5 px-2.5"
          style={{ font: "inherit", border: "1px solid var(--border-strong)", borderRadius: 9 }}>
          <span className="bg-success" style={{ width: 7, height: 7, borderRadius: 99 }} />
          <span className="font-semibold" style={{ fontSize: 12.5 }}>{cur.short}</span>
          <Icon name="chevron-down" size={14} style={{ opacity: .5 }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[240px]">
        <DropdownMenuLabel>역할 전환 (RBAC 데모)</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={role} onValueChange={onRole}>
          {D.ROLES.map((r) => (
            <DropdownMenuRadioItem key={r.id} value={r.id}>
              <span className="font-bold" style={{ fontSize: 13, color: r.id === role ? "var(--primary)" : "var(--foreground)" }}>{r.name}</span>
              <span className="t-caption">{r.desc}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------- Favorites FAB (우측하단 플로팅 즐겨찾기) ---------- */
function FavoritesFab({ onNav }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const favKeys = useMenuSel("fav", D.DEFAULT_FAV);
  const favs = MenuStore.resolve(favKeys);
  const { MenuPickerModal } = MainWidgets;
  return (
    <div className="fixed right-6 bottom-6 flex flex-col items-end gap-3" style={{ zIndex: 60 }}>
      <MenuPickerModal open={edit} onClose={() => setEdit(false)} initialTab="fav" />
      {open && <>
        <div onClick={() => setOpen(false)} className="fixed inset-0" style={{ zIndex: -1 }} />
        <div className="bg-card shadow-lg p-2" style={{ width: 244, border: "1px solid var(--border)", borderRadius: 14, animation: "dashFade .16s var(--ease) both" }}>
          <div className="flex items-center gap-1.5 pt-1.5 px-2 pb-2">
            <Icon name="star" size={14} style={{ color: "var(--warning)" }} />
            <span className="font-bold" style={{ fontSize: 12.5 }}>즐겨찾기</span>
            <button
              onClick={() => { setOpen(false); setEdit(true); }}
              aria-label="즐겨찾기 설정"
              title="즐겨찾기 설정"
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--foreground)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--caption)"; }}
              className="ml-auto shrink-0 cursor-pointer flex items-center justify-center"
              style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "transparent", color: "var(--caption)", transition: "background .15s,color .15s" }}>
              <Icon name="settings" size={15} />
            </button>
          </div>
          {favs.length === 0
            ? <div className="t-caption pt-1 px-2.5 pb-2.5">설정(⚙)에서 즐겨찾기를 추가하세요.</div>
            : favs.map((f: any, i: number) => (
              <button
                key={f.key}
                onClick={() => { onNav(f.to); setOpen(false); }}
                title={f.label}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--foreground)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                className="w-full flex items-center gap-2.5 cursor-pointer text-left"
                style={{ border: "none", font: "inherit", fontWeight: 500, borderRadius: 9, padding: "9px 10px", background: "transparent", color: "var(--muted-foreground)", fontSize: 12.5, transition: "background .15s,color .15s" }}>
                <Icon name={f.icon} size={16} stroke={2} style={{ color: "var(--caption)", flex: "0 0 auto" }} />
                <span className="flex-1 whitespace-nowrap overflow-hidden" style={{ textOverflow: "ellipsis" }}>{f.label}</span>
              </button>
            ))}
        </div>
      </>}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="즐겨찾기"
        aria-expanded={open}
        className="cursor-pointer shadow-lg flex items-center justify-center"
        style={{ width: 46, height: 46, borderRadius: 99, border: "none", background: "var(--brand-solid)", color: "var(--on-brand-solid)", transition: "transform .18s var(--ease)", transform: open ? "rotate(90deg) scale(1.04)" : "none" }}>
        <Icon name={open ? "x" : "star"} size={20} stroke={2.2} />
      </button>
    </div>
  );
}

/* ---------- GNB ---------- */

/* ---------- Command 팔레트 (GNB '/' 검색) ---------- */
/* MENU(3-레벨)를 역할 필터링해 평탄화 → {cat, items:[{label, sub, nav}]} 그룹 */
function flattenMenu(role: string) {
  const groups: { cat: string; items: { label: string; sub?: string; nav: string }[] }[] = [];
  for (const top of D.MENU) {
    if (top.roles && !top.roles.includes(role)) continue;
    const items: { label: string; sub?: string; nav: string }[] = [];
    if (top.path && !top.children) items.push({ label: top.label, nav: top.path });
    (top.children || []).forEach((mid: any) => {
      if (mid.children) mid.children.forEach((leaf: any) => items.push({ label: leaf.label, sub: mid.label, nav: leaf.path || leaf.label }));
      else items.push({ label: mid.label, nav: mid.path || mid.label });
    });
    if (items.length) groups.push({ cat: top.label, items });
  }
  return groups;
}

function MenuCommand({ open, onOpenChange, onNav, role }: { open: boolean; onOpenChange: (o: boolean) => void; onNav: (r: string) => void; role: string }) {
  const groups = React.useMemo(() => flattenMenu(role), [role]);
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="메뉴·운용사·자펀드 검색…" />
      {/* min-h를 max-h(340px)와 같게 고정 — 검색 결과가 적어도 리스트가 쪼그라들지 않고 일정 높이 유지 */}
      <CommandList className="min-h-[340px]">
        <CommandEmpty>결과가 없습니다.</CommandEmpty>
        {groups.map((g) => (
          <CommandGroup key={g.cat} heading={g.cat}>
            {g.items.map((it, i) => (
              <CommandItem
                key={g.cat + i}
                value={it.label + " " + (it.sub || "") + " " + g.cat}
                onSelect={() => { onNav(it.nav); onOpenChange(false); }}>
                <Icon name="chevron-right" size={14} className="shrink-0 text-caption" />
                <span className="flex-1 truncate">{it.label}</span>
                {it.sub && <span className="shrink-0 text-[11px] text-caption">{it.sub}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

function Gnb({ theme, onToggleTheme, role, onRole, onToggleLnb, wide, onToggleWide, notifs, onOpenNotif, onNav, onUserModal }) {
  const unread = notifs.filter((n) => !n.read).length;
  const [cmdOpen, setCmdOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCmdOpen((o) => !o); return; }
      if (e.key === "/" && !typing) { e.preventDefault(); setCmdOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
    <MenuCommand open={cmdOpen} onOpenChange={setCmdOpen} onNav={onNav} role={role} />
    <header
      className="sticky top-0 shrink-0 flex items-center"
      style={{
        zIndex: 50, height: 58,
        background: "color-mix(in srgb,var(--card) 86%,transparent)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--border)", gap: "clamp(6px, 1.5vw, 12px)", padding: "0 clamp(8px, 2vw, 16px)",
      }}><IconBtn icon="menu" onClick={onToggleLnb} label="메뉴 접기/펴기" size={38} /><img
        src={theme === "dark" ? logoWhiteUrl : logoUrl}
        alt="APFS 농업정책보험금융원"
        style={{ height: 24, width: "auto" }} /><div className="bg-border" style={{ width: 1, height: 22 }} /><div
        className="gnb-title font-bold whitespace-nowrap"
        style={{ fontSize: 14.5, letterSpacing: "-.01em" }}>농림수산식품모태펀드 투자자산관리시스템</div><div className="flex-1" /><button
        type="button"
        onClick={() => setCmdOpen(true)}
        aria-label="명령 팔레트 열기"
        className="gnb-search flex items-center gap-2 bg-muted text-caption cursor-pointer"
        style={{
          borderRadius: 10, padding: "7px 12px", width: 260, border: "none", font: "inherit",
        }}><Icon name="search" size={16} /><span className="flex-1 text-left" style={{ fontSize: 12.5 }}>메뉴·운용사·자펀드 검색</span><kbd
          className="font-semibold bg-card"
          style={{ fontSize: 10, borderRadius: 5, padding: "1px 5px", border: "1px solid var(--border)" }}>/</kbd></button><RoleSwitch role={role} onRole={onRole} /><div className="flex items-center gap-0.5"><span className="gnb-wide inline-flex"><IconBtn
          icon={wide ? "collapse-h" : "expand-h"}
          onClick={onToggleWide}
          label={wide ? "고정 너비" : "전체 너비"}
          active={wide}
          activeClassName="text-primary border-transparent"
          activeStyle={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
          size={38} /></span><IconBtn
          icon={theme === "dark" ? "sun" : "moon"}
          onClick={onToggleTheme}
          label="라이트/다크"
          size={38} /><IconBtn icon="bell" onClick={onOpenNotif} label="알림" badge={unread} size={38} /></div><UserMenu onUserModal={onUserModal} /></header>
    </>
  );
}

/* ---------- 방문기록 (최근 열어본 페이지 드롭다운) ---------- */

/* PageHeader가 14개 페이지에서 각자 호출되므로, onNav/route를 매번 prop으로 넘기지 않고
   AppShell에서 Context로 한 번 공급한다(소비처: PageHeader → HistoryMenu). */
const NavContext = React.createContext<{ onNav: (r: string) => void; route: string } | null>(null);

/* route(= leaf의 path 또는 path가 없으면 leaf.label) → {label, crumbs, icon} 해석 인덱스.
   D.MENU를 모든 레벨로 한 번 펼쳐 만든다(상위 카테고리 icon 상속). */
const ROUTE_META: Record<string, { label: string; crumbs: string[]; icon: string }> = (() => {
  const idx: Record<string, { label: string; crumbs: string[]; icon: string }> = {};
  for (const top of D.MENU as any[]) {
    const icon = top.icon || "file";
    if (top.path) idx[top.path] = { label: top.label, crumbs: ["홈", top.label], icon };
    const walk = (nodes: any[], trail: string[]) => {
      for (const n of nodes) {
        if (n.children) { walk(n.children, [...trail, n.label]); continue; }   // 그룹 노드는 이동 대상 아님
        const meta = { label: n.label, crumbs: ["홈", top.label, ...trail, n.label], icon };
        if (n.path) idx[n.path] = meta;
        if (!idx[n.label]) idx[n.label] = meta;                                // GenericListPage는 path 없으면 leaf.label로 라우팅
      }
    };
    if (top.children) walk(top.children, []);
  }
  // 하드코딩 페이지(app.tsx에서 직접 라우팅)는 D.MENU 카테고리 라벨이 아니라
  // '사용자가 실제로 본 페이지 제목'(각 페이지 PageHeader의 마지막 crumb)으로 정밀화한다.
  // ⚠ 해당 페이지의 crumbs가 바뀌면 여기도 함께 갱신.
  const pages: Record<string, { label: string; crumbs: string[]; icon: string }> = {
    designsystem: { label: "디자인 시스템", crumbs: ["홈", "디자인 시스템"], icon: "layers" },
    main: { label: "대시보드", crumbs: ["홈", "대시보드"], icon: "home" },
    risk: { label: "리스크 모니터링", crumbs: ["홈", "조기경보", "리스크 모니터링"], icon: "shield-alert" },
    "risk-manage": { label: "조기경보 관리", crumbs: ["홈", "조기경보", "조기경보 관리"], icon: "shield-alert" },
    accounting: { label: "회계·자금 마감", crumbs: ["홈", "회계 관리", "회계·자금 마감"], icon: "wallet" },
    "gp-health": { label: "운용사 건전성", crumbs: ["홈", "운용관리", "운용사 건전성"], icon: "building" },
    performance: { label: "투자 성과·포트폴리오", crumbs: ["홈", "통계조회", "투자 성과·포트폴리오"], icon: "trending" },
    schedule: { label: "일정·알림 센터", crumbs: ["홈", "일정·알림 센터"], icon: "calendar" },
    report: { label: "개요", crumbs: ["홈", "보고관리", "개요"], icon: "file" },
    "report-bucheo": { label: "부처보고", crumbs: ["홈", "보고관리", "부처보고"], icon: "file" },
    "report-sutack": { label: "수탁보고", crumbs: ["홈", "보고관리", "수탁보고"], icon: "file" },
    subfund: { label: "자펀드 정보관리", crumbs: ["홈", "투자자산관리", "자펀드 정보관리"], icon: "landmark" },
    asset: { label: "개요", crumbs: ["홈", "투자자산관리", "개요"], icon: "landmark" },
  };
  for (const k in pages) idx[k] = pages[k];   // 페이지 제목이 카테고리 라벨보다 우선
  return idx;
})();
function routeMeta(route: string) {
  return ROUTE_META[route] || { label: route, crumbs: ["홈", route], icon: "file" };
}

/* localStorage 방문기록 구독 훅(MenuStore의 useMenuSel과 동일한 CustomEvent 패턴) */
function useHistory(): string[] {
  const [list, setList] = useState<string[]>(() => HistoryStore.get());
  useEffect(() => {
    const f = () => setList(HistoryStore.get());
    window.addEventListener("apfs-history-change", f);
    return () => window.removeEventListener("apfs-history-change", f);
  }, []);
  return list;
}

function HistoryMenu({ onNav, route }: { onNav: (r: string) => void; route: string }) {
  const [open, setOpen] = useState(false);
  const hist = useHistory();
  const rootRef = useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = useState(420);
  const items = hist.filter((r) => r !== route).map((r) => ({ r, ...routeMeta(r) }));   // 현재 페이지는 제외
  useEffect(() => { setOpen(false); }, [route]);                                          // 이동하면 닫기
  // 화면 높이에 맞춤: 트리거 하단부터 뷰포트 바닥까지(매직넘버 대신 뷰포트 비례). paint 전 측정으로 깜빡임 방지.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = rootRef.current?.getBoundingClientRect();
      if (r) setMaxH(Math.max(160, window.innerHeight - r.bottom - 22));   // 6px 갭 + 16px 바닥 여백
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);
  // 키보드 닫기: Esc → 닫고 트리거로 포커스 복귀(feat/nav-keyboard-a11y 일관성)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); rootRef.current?.querySelector("button")?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div ref={rootRef} className="relative inline-flex">
      <IconBtn icon="clock" onClick={() => setOpen((o) => !o)} label="방문기록" size={38} active={open} expanded={open} />
      {open && <>
        <div onClick={() => setOpen(false)} className="fixed inset-0" style={{ zIndex: 59 }} />
        <div
          className="bg-card shadow-lg"
          role="menu"
          aria-label="방문기록"
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 60,
            width: "min(284px, calc(100vw - 24px))", maxHeight: maxH, overflowY: "auto",
            border: "1px solid var(--border)", borderRadius: 14, padding: 8,
            animation: "dashFade .16s var(--ease) both",
          }}>
          <div className="flex items-center gap-1.5 pt-1.5 px-2 pb-2">
            <Icon name="clock" size={14} style={{ color: "var(--primary)" }} />
            <span className="font-bold" style={{ fontSize: 12.5 }}>최근 방문</span>
            {items.length > 0 && <button
              onClick={() => HistoryStore.clear()}
              aria-label="방문기록 지우기"
              title="방문기록 지우기"
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--foreground)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--caption)"; }}
              className="ml-auto shrink-0 cursor-pointer inline-flex items-center gap-1"
              style={{ borderRadius: 7, border: "none", background: "transparent", color: "var(--caption)", font: "inherit", fontWeight: 600, fontSize: 11.5, padding: "4px 7px", transition: "background .15s,color .15s" }}>
              <Icon name="trash" size={12} />지우기
            </button>}
          </div>
          {items.length === 0
            ? <div className="t-caption pt-1 px-2.5 pb-2.5" style={{ fontSize: 12 }}>최근 방문한 페이지가 없습니다.</div>
            : items.map(({ r, label, crumbs, icon }) => {
              const parent = crumbs.length > 2 ? crumbs[crumbs.length - 2] : crumbs[0];
              return (
                <button
                  key={r}
                  role="menuitem"
                  onClick={() => { onNav(r); setOpen(false); }}
                  title={crumbs.join(" › ")}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  className="w-full flex items-center gap-2.5 cursor-pointer text-left"
                  style={{ border: "none", font: "inherit", borderRadius: 9, padding: "8px 10px", background: "transparent", color: "var(--foreground)", transition: "background .15s" }}>
                  <Icon name={icon} size={16} stroke={2} style={{ color: "var(--caption)", flex: "0 0 auto" }} />
                  <span className="flex-1 min-w-0">
                    <span className="block whitespace-nowrap overflow-hidden" style={{ textOverflow: "ellipsis", fontSize: 12.5, fontWeight: 600 }}>{label}</span>
                    <span className="block whitespace-nowrap overflow-hidden" style={{ textOverflow: "ellipsis", fontSize: 11, color: "var(--caption)" }}>{parent}</span>
                  </span>
                </button>
              );
            })}
        </div>
      </>}
    </div>
  );
}

/* ---------- PageHeader (breadcrumb + actions; title/sub props accepted but no longer rendered) ---------- */
function PageHeader({ crumbs, actions }: { crumbs: string[]; title?: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode }) {
  const nav = useContext(NavContext);   // 방문기록 버튼이 쓸 onNav/route (AppShell이 공급)
  return (
    <div style={{ marginBottom: 18 }}><div
        className="flex items-center justify-between gap-4 flex-wrap"><nav
          aria-label="위치"
          className="flex items-center gap-1.5 flex-wrap">{crumbs.map((c, i) => <React.Fragment key={i}>{i > 0 && <Icon name="chevron-right" size={13} style={{ color: "var(--caption)" }} />}<span
            aria-current={i === crumbs.length - 1 ? "page" : undefined}
            style={{
              fontSize: 12, fontWeight: i === crumbs.length - 1 ? 700 : 500,
              color: i === crumbs.length - 1 ? "var(--foreground)" : "var(--caption)",
            }}>{c}</span></React.Fragment>)}</nav><div
          className="flex items-center gap-2 shrink-0">{actions}{nav && <HistoryMenu onNav={nav.onNav} route={nav.route} />}</div></div></div>
  );
}

/* ---------- AppShell ---------- */
function AppShell(props) {
  const { wide, onToggleWide } = props;
  const { theme, onToggleTheme, role, onRole, route, onNav, lnbOpen, onToggleLnb, navStyle, notifs, children } = props;
  const [notifOpen, setNotifOpen] = useState(false);
  const [userModal, setUserModal] = useState<string | null>(null);
  const mobile = useIsMobile(760);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => { setDrawer(false); }, [route]);
  const handleMenu = () => (mobile ? setDrawer((d) => !d) : onToggleLnb());
  const navClose = (r) => { onNav(r); setDrawer(false); };
  const rail = navStyle === "rail";
  return (
    <div
      className="bg-bg flex flex-col" style={{ minHeight: "100vh" }}><Gnb
        theme={theme}
        onToggleTheme={onToggleTheme}
        role={role}
        onRole={onRole}
        onToggleLnb={handleMenu}
        wide={wide}
        onToggleWide={onToggleWide}
        notifs={notifs}
        onOpenNotif={() => setNotifOpen(true)}
        onNav={navClose}
        onUserModal={setUserModal} /><div className="flex flex-1 items-start">{rail
          ? <RailNav role={role} route={route} onNav={navClose} mobile={mobile} drawerOpen={drawer} />
          : <Lnb open={mobile ? true : lnbOpen} role={role} route={route} onNav={navClose} mobile={mobile} drawerOpen={drawer} />}<NavContext.Provider value={{ onNav: navClose, route }}><main
          className="dash-main flex-1 min-w-0"
          style={{ padding: "22px 26px 104px" }}>{children}</main></NavContext.Provider></div>{mobile && <div
        className={"lnb-backdrop" + (drawer ? " show" : "")}
        onClick={() => setDrawer(false)} />}<FavoritesFab onNav={navClose} /><NotifCenter open={notifOpen} onClose={() => setNotifOpen(false)} /><CenterModal open={userModal === "memo"} onClose={() => setUserModal(null)} title="메모" icon="memo" width={620}>{ncMemoBody(true)}</CenterModal><CenterModal open={userModal === "schedule"} onClose={() => setUserModal(null)} title="일정" icon="calendar" width={880}><NcScheduleBody /></CenterModal><CenterModal open={userModal === "logout"} onClose={() => setUserModal(null)} title="로그아웃" icon="external" width={400} footer={[<button key="c" onClick={() => setUserModal(null)} className="bg-card cursor-pointer" style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid var(--border-strong)", font: "inherit", fontWeight: 700, fontSize: 13.5 }}>취소</button>, <button key="o" onClick={() => setUserModal(null)} className="bg-brand-blue cursor-pointer" style={{ padding: "9px 16px", borderRadius: 10, border: "none", color: "var(--on-brand-solid)", font: "inherit", fontWeight: 700, fontSize: 13.5 }}>로그아웃</button>]}><div className="py-1.5 px-1 text-foreground" style={{ fontSize: 14, lineHeight: 1.6 }}>정말 로그아웃 하시겠습니까?</div></CenterModal></div>
  );
}

export const Shell = { AppShell, PageHeader };
