/* 전역 셸 — GNB / LNB / 브레드크럼 / 알림센터 / RBAC 게이팅 / 테마 토글 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Icon } from './icons';
import { UI } from './components';
import { APFS_DATA, useMenuSel, MenuStore } from './data';
import { MainWidgets } from './main_widgets';
import logoUrl from './assets/logo.svg';
import logoWhiteUrl from './assets/logo_white.svg';

const { useState, useEffect } = React;
const { ColorChip, IconBtn, CountPill, StatusBadge, Button, SegTabs } = UI;
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
  const showCounts = m.id === "risk";
  return (
    <>{m.children.map((c, i) => {
      if (c.sub && c.children) {
        const subKey = m.id + ":s" + i;
        const subOpen = expanded[subKey];
        const subCount = c.children.reduce((s, x) => s + (x.badge || 0), 0) || (c.badge || 0);
        return (
          <div key={i} style={{ marginBottom: 1 }}><button
              onClick={() => setExpanded((e) => ({ ...e, [subKey]: !e[subKey] }))}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
                border: "none", font: "inherit", cursor: "pointer", borderRadius: 6, padding: "4px 10px",
                background: "transparent", color: "var(--foreground)", fontSize: 13, fontWeight: 700,
              }}><span
                style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" }}>{c.label}</span><div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>{showCounts && subCount > 0 && <CountPill count={subCount} urgent={m.urgent} />}<Icon
                  name="chevron-down"
                  size={12}
                  style={{ transform: subOpen ? "rotate(0)" : "rotate(-90deg)", transition: "transform .15s", opacity: .5 }} /></div></button>{subOpen && <div style={{ paddingLeft: 14, marginBottom: 2 }}>{c.children.map((leaf, j) => <button
                key={j}
                onClick={() => leaf.path ? onNav(leaf.path) : m.path ? onNav(m.path) : undefined}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  border: "none", font: "inherit", cursor: (leaf.path || m.path) ? "pointer" : "default",
                  borderRadius: 6, padding: "5px 10px",
                  background: "transparent", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 500,
                }}><span
                  style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" }}>{leaf.label}</span>{showCounts && leaf.badge > 0 && <CountPill count={leaf.badge} urgent={m.urgent} />}</button>)}</div>}</div>
        );
      }
      return (
        <button
          key={i}
          onClick={() => c.path ? onNav(c.path) : m.path ? onNav(m.path) : undefined}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            border: "none", font: "inherit", cursor: "pointer", borderRadius: 7, padding: "6px 10px",
            background: "transparent", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 500,
          }}><span
            style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" }}>{c.label}</span>{showCounts && c.badge > 0 && <CountPill count={c.badge} urgent={m.urgent} />}</button>
      );
    })}</>
  );
}

/* ---------- LNB ---------- */
function Lnb({ open, role, route, onNav, mobile, drawerOpen }) {
  const [expanded, setExpanded] = useState(() => ({ ...allSubGroupsExpanded(), risk: true }));
  const [hover, setHover] = useState<any>(null);
  const hoverTimer = React.useRef<any>(null);
  const menu = D.MENU.filter((m) => m.roles.includes(role));
  const posStyle: React.CSSProperties = mobile
    ? { position: "fixed", top: 58, left: 0, width: 270, height: "calc(100vh - 58px)", zIndex: 45,
        transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
        boxShadow: drawerOpen ? "var(--shadow-lg)" : "none", transition: "transform .24s var(--ease)" }
    : { width: open ? 260 : 66, position: "sticky", top: 58, height: "calc(100vh - 58px)", transition: "width .22s var(--ease)" };
  return (
    <nav
      aria-label="주 메뉴"
      aria-hidden={mobile && !drawerOpen ? true : undefined}
      style={{
        flex: "0 0 auto", background: "var(--card)", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", overflow: "hidden", ...posStyle,
      }}><div
        style={{ padding: open ? "14px 14px 8px" : "14px 8px 8px", flex: 1, overflowY: "auto", overflowX: "hidden" }}>{menu.map((m) => {
          const showCounts = m.id === "risk";
          const count = showCounts ? rollup(m) : 0;
          const isActive = m.path && m.path === route;
          const hasKids = !!m.children;
          const isOpen = expanded[m.id];
          return (
            <div key={m.id} style={{ marginBottom: 2 }}><button
                onClick={() => { if (m.path) onNav(m.path); if (hasKids && open) setExpanded((e) => ({ ...e, [m.id]: !e[m.id] })); }}
                aria-current={isActive ? "page" : undefined}
                title={!open ? m.label : undefined}
                onMouseEnter={(e) => { if (!open && !mobile && hasKids) { clearTimeout(hoverTimer.current); const r = e.currentTarget.getBoundingClientRect(); setHover({ m, top: r.top }); } }}
                onMouseLeave={() => { if (!open) { clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setHover(null), 160); } }}
                style={{
                  position: "relative", width: "100%", display: "flex", alignItems: "center", gap: 11, cursor: "pointer",
                  border: "none", font: "inherit", borderRadius: 9, padding: open ? "9px 10px" : "10px", justifyContent: open ? "flex-start" : "center",
                  background: isActive ? "color-mix(in srgb,var(--primary) 12%,transparent)" : "transparent",
                  color: isActive ? "var(--primary)" : "var(--foreground)", fontWeight: isActive ? 700 : 500, fontSize: 13.5,
                  transition: "background .15s",
                }}><Icon name={m.icon} size={20} stroke={isActive ? 2.3 : 2} />{open && <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap" }}>{m.label}</span>}{open && (m as any).isNew && <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--accent)" }}>NEW</span>}{count > 0 && (open
                  ? <CountPill count={count} urgent={m.urgent} />
                  : <span
                  style={{ position: "absolute", top: 6, right: 8, width: 7, height: 7, borderRadius: 99, background: m.urgent ? "var(--danger)" : "var(--primary)" }} />)}{open && hasKids && <Icon
                  name="chevron-down"
                  size={15}
                  style={{ transform: isOpen ? "rotate(0)" : "rotate(-90deg)", transition: "transform .18s", opacity: .6 }} />}</button>{open && hasKids && isOpen && <div style={{ margin: "2px 0 4px", paddingLeft: 16 }}><MenuChildren m={m} expanded={expanded} setExpanded={setExpanded} onNav={onNav} /></div>}</div>
          );
        })}</div><div
        style={{ borderTop: "1px solid var(--border)", padding: open ? "8px 10px" : "8px" }}><button
          onClick={() => onNav("designsystem")}
          aria-current={route === "designsystem" ? "page" : undefined}
          title={!open ? "디자인 시스템" : undefined}
          style={{
            position: "relative", width: "100%", display: "flex", alignItems: "center", gap: 11, cursor: "pointer",
            border: "none", font: "inherit", borderRadius: 9, padding: open ? "9px 10px" : "10px", justifyContent: open ? "flex-start" : "center",
            background: route === "designsystem" ? "color-mix(in srgb,var(--primary) 12%,transparent)" : "transparent",
            color: route === "designsystem" ? "var(--primary)" : "var(--muted-foreground)", fontWeight: route === "designsystem" ? 700 : 500, fontSize: 13.5,
          }}><Icon name="layers" size={20} />{open && <span style={{ whiteSpace: "nowrap" }}>디자인 시스템</span>}</button></div><div
        style={{ borderTop: "1px solid var(--border)", padding: open ? "10px 14px" : "10px 8px" }}>{open
          ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}><ColorChip icon="shield-check" color="var(--success)" size={30} iconSize={16} /><div style={{ lineHeight: 1.3 }}><div style={{ fontSize: 11.5, fontWeight: 700 }}>보안 접속 정상</div><div className="t-caption" style={{ fontSize: 10.5 }}>내부망 · TLS 1.3</div></div></div>
          : <div style={{ display: "flex", justifyContent: "center" }}><Icon name="shield-check" size={18} style={{ color: "var(--success)" }} /></div>}</div>
      {!open && !mobile && hover && ReactDOM.createPortal(
        <div
          onMouseEnter={() => { clearTimeout(hoverTimer.current); setHover(hover); }}
          onMouseLeave={() => { clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setHover(null), 160); }}
          style={{
            position: "fixed", left: 70, top: Math.max(64, Math.min(hover.top, window.innerHeight - 320)), width: 264, zIndex: 70,
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14,
            boxShadow: "var(--shadow-lg)", padding: 10, animation: "railSlide .18s var(--ease) both",
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px 10px", borderBottom: "1px solid var(--border)", marginBottom: 6 }}>
            <ColorChip icon={hover.m.icon} color={hover.m.urgent ? "var(--danger)" : "var(--primary)"} size={30} iconSize={16} />
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{hover.m.label}</span>
          </div>
          {hover.m.path && <button
            onClick={() => { onNav(hover.m.path); setHover(null); }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8, border: "none", font: "inherit", cursor: "pointer",
              borderRadius: 8, padding: "8px 10px", background: "transparent", color: "var(--primary)", fontSize: 12.5, fontWeight: 700, marginBottom: 4,
            }}><Icon name="arrow-right" size={14} />전체 보기</button>}
          <MenuChildren m={hover.m} expanded={expanded} setExpanded={setExpanded} onNav={(r) => { onNav(r); setHover(null); }} />
        </div>, document.body)}
      </nav>
  );
}

/* ---------- RailNav (ClickUp형 아이콘 레일 + 우측 슬라이드 패널) ---------- */
function RailNav({ role, route, onNav, mobile, drawerOpen }) {
  const menu = D.MENU.filter((m) => m.roles.includes(role));
  const [active, setActive] = useState(null);
  const [hover, setHover] = useState(null);
  const [expanded, setExpanded] = useState(allSubGroupsExpanded);
  const activeM = menu.find((m) => m.id === active);
  useEffect(() => { setActive(null); }, [route]);
  if (mobile && !drawerOpen) return null;

  const railBtn = (key, icon, label, isActive, onClick, count, urgent = false) => (
    <button
      key={key} onClick={onClick} aria-label={label} aria-current={isActive ? "page" : undefined}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--muted)"; const r = e.currentTarget.getBoundingClientRect(); setHover({ label, top: r.top + r.height / 2 }); }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; setHover(null); }}
      style={{
        position: "relative", width: 48, height: 48, borderRadius: 12, cursor: "pointer", border: "none", font: "inherit",
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto",
        background: isActive ? "color-mix(in srgb,var(--primary) 13%,transparent)" : "transparent",
        color: isActive ? "var(--primary)" : "var(--foreground)", transition: "background .15s",
      }}><Icon name={icon} size={21} stroke={isActive ? 2.3 : 2} />{count > 0 && <span
        style={{ position: "absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: 99, background: urgent ? "var(--danger)" : "var(--primary)" }} />}</button>
  );

  return (
    <>{hover && !mobile && <div style={{
        position: "fixed", left: 70, zIndex: 70, pointerEvents: "none",
        ...(hover.bottom != null ? { bottom: hover.bottom } : { top: hover.top, transform: "translateY(-50%)" }),
        background: "color-mix(in srgb,var(--foreground) 92%,transparent)", color: "var(--bg)",
        fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap",
        boxShadow: "var(--shadow-lg)", animation: "dashFade .12s var(--ease) both",
      }}>{hover.label}{hover.sub && <div style={{ fontSize: 10.5, fontWeight: 500, opacity: .78, marginTop: 2 }}>{hover.sub}</div>}</div>}{activeM && <><div
        onClick={() => setActive(null)}
        style={{ position: "fixed", inset: 0, zIndex: 46 }} /><div
        style={{
          position: "fixed", left: 64, top: 58, bottom: 0, width: 264, zIndex: 47,
          background: "var(--card)", borderRight: "1px solid var(--border)", boxShadow: "var(--shadow-lg)",
          display: "flex", flexDirection: "column", animation: "railSlide .2s var(--ease) both",
        }}><div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 16px 14px", borderBottom: "1px solid var(--border)", flex: "0 0 auto" }}><ColorChip
            icon={activeM.icon} color={activeM.urgent ? "var(--danger)" : "var(--primary)"} size={30} iconSize={16} /><span
            style={{ fontSize: 14.5, fontWeight: 700 }}>{activeM.label}</span></div><div
          style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 10 }}>{activeM.path && <button
            onClick={() => { onNav(activeM.path); setActive(null); }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8, border: "none", font: "inherit", cursor: "pointer",
              borderRadius: 8, padding: "8px 10px", background: "transparent", color: "var(--primary)", fontSize: 12.5, fontWeight: 700, marginBottom: 4,
            }}><Icon name="arrow-right" size={14} />전체 보기</button>}<MenuChildren
            m={activeM} expanded={expanded} setExpanded={setExpanded} onNav={(r) => { onNav(r); setActive(null); }} /></div></div></>}<nav
      aria-label="주 메뉴"
      aria-hidden={mobile && !drawerOpen ? true : undefined}
      style={{
        flex: "0 0 auto", position: mobile ? "fixed" : "sticky", left: mobile ? 0 : undefined, top: 58,
        height: "calc(100vh - 58px)", width: 64, zIndex: 48,
        background: "var(--card)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column",
      }}><div
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>{menu.map((m) => railBtn(m.id, m.icon, m.label, m.path === route || active === m.id,
          () => { if (m.children) setActive((a) => (a === m.id ? null : m.id)); else { onNav(m.path); setActive(null); } },
          m.id === "risk" ? rollup(m) : 0, m.urgent))}</div><div
        style={{ borderTop: "1px solid var(--border)", padding: "8px" }}>{railBtn("ds", "layers", "디자인 시스템", route === "designsystem", () => { onNav("designsystem"); setActive(null); }, 0)}</div><div
        style={{ borderTop: "1px solid var(--border)", padding: "10px 8px", display: "flex", justifyContent: "center" }}
        onMouseEnter={() => setHover({ label: "보안 접속 정상", sub: "내부망 · TLS 1.3", bottom: 10 })}
        onMouseLeave={() => setHover(null)}><Icon
          name="shield-check" size={18} style={{ color: "var(--success)" }} /></div></nav></>
  );
}

/* ===== 알림 공통 헬퍼 ===== */
const NC_TAGICON: Record<string, string> = {
  결재: "file", 메모: "check-circle", ToDo: "check-circle", 긴급공지: "alert-triangle", 긴급: "alert-triangle",
  공지: "bell", 환전: "landmark", 보완요청: "alert-triangle", 처리완료: "check-circle",
  준법: "shield-check", 운영: "settings", 회의: "users", 출장: "arrow-right", 휴가: "calendar",
};
const NC_SUMICON: Record<string, string> = { 메모: "check-circle", 공지사항: "bell", 일정: "calendar", 시스템: "shield-check" };

function ncRow(key: string, p: any) {
  const { tone = "info", icon, tag, title, meta, date, dday } = p;
  const ic = icon || (tag && NC_TAGICON[tag]) || "bell";
  return (
    <button key={key} className="nc-row" style={{
      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, width: "100%",
      textAlign: "left", border: "none", background: "color-mix(in srgb, var(--muted) 45%, var(--card))", font: "inherit", cursor: "pointer", marginBottom: 4,
    }}>
      <Icon name={ic} size={16} style={{ color: `var(--${tone})`, flex: "0 0 auto" }} />
      {tag && <StatusBadge tone={tone} label={"　　"} size="sm" />}
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
      {meta && <span className="t-caption nc-meta" style={{ whiteSpace: "nowrap", flex: "0 0 auto" }}>{meta}</span>}
      {(date || dday) && <span style={{ whiteSpace: "nowrap", flex: "0 0 auto", fontSize: 11.5, fontWeight: dday ? 800 : 600, color: dday ? `var(--${tone})` : "var(--caption)" }}>{dday || date}</span>}
    </button>
  );
}

function ncMemoBody(withBar: boolean) {
  const T = D.NOTIF_CENTER.todo;
  const all = [...T.delayed, ...T.progress, ...T.upcoming];
  return (
    <div>
      {withBar && <div className="nc-memobar">
        <input type="text" placeholder="검색어를 입력하세요" className="nc-search" />
        <button className="nc-addbtn">+ 등록</button>
      </div>}
      {all.map((t: any, i: number) => ncRow("mm" + i, { tone: "info", icon: "check-circle", title: t.title, meta: t.due ? "마감 " + t.due : (t.start ? "시작 " + t.start : "") }))}
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
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{ width: 250, flex: "0 0 auto", padding: "2px 2px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
          <Icon name="calendar" size={14} style={{ color: "var(--brand-blue)" }} />
          <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: "-.01em" }}>2026년 6월</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
          {dow.map((w, i) => <div key={"h" + i} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, padding: "2px 0", color: i === 0 ? "var(--danger)" : i === 6 ? "var(--brand-blue)" : "var(--caption)" }}>{w}</div>)}
          {cells.map((d, i) => {
            if (d === null) return <div key={"e" + i} />;
            const evs = eventDays[d];
            const isSel = sel === d, isToday = d === TODAY;
            const tone = evs ? evs[0].tone : null;
            return (
              <button key={"d" + i} onClick={() => evs && setSel(isSel ? null : d)} style={{
                position: "relative", aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 1, border: "none", borderRadius: 7, font: "inherit", cursor: evs ? "pointer" : "default",
                background: isSel ? "var(--brand-blue)" : isToday ? "var(--muted)" : "transparent",
                color: isSel ? "#fff" : "var(--foreground)", fontSize: 11.5, fontWeight: isToday || evs ? 700 : 500,
              }}>
                {String(d)}
                {evs && <span style={{ width: 4, height: 4, borderRadius: 99, background: isSel ? "#fff" : `var(--${tone})` }} />}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, borderLeft: "1px solid var(--border)", paddingLeft: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 6px 8px" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>{sel ? "6월 " + sel + "일 일정" : "전체 일정"}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)" }}>{visible.length}</span>
          {sel && <button onClick={() => setSel(null)} style={{ marginLeft: "auto", border: "none", background: "transparent", color: "var(--brand-blue)", font: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>전체 보기</button>}
        </div>
        {visible.map((s: any, i: number) => (
          <button key={"sr" + i} onClick={() => s.day && setSel(s.day)} className="nc-row" style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, width: "100%",
            textAlign: "left", border: "none", font: "inherit", cursor: "pointer", marginBottom: 4,
            background: s.day === sel ? "color-mix(in srgb,var(--brand-blue) 12%,var(--card))" : "color-mix(in srgb, var(--muted) 45%, var(--card))",
          }}>
            <Icon name={NC_TAGICON[s.tag] || "calendar"} size={16} style={{ color: `var(--${s.tone})`, flex: "0 0 auto" }} />
            <StatusBadge tone={s.tone} label={"　　"} size="sm" />
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</span>
            <span className="t-caption nc-meta" style={{ whiteSpace: "nowrap", flex: "0 0 auto" }}>{s.by + (s.time ? " · " + s.time : "")}</span>
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
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,19,16,.5)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 70, animation: "ncFade .18s var(--ease) both" }} />
      <div role="dialog" aria-label={title} style={{ position: "fixed", inset: 0, zIndex: 71, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, pointerEvents: "none" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: width || 560, maxWidth: "100%", maxHeight: "86vh", background: "var(--card)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden", pointerEvents: "auto", animation: "ncPop .2s var(--ease) both" }}>
          <header style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            {icon && <Icon name={icon} size={18} style={{ color: "var(--brand-blue)" }} />}
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.01em" }}>{title}</span>
            <div style={{ flex: 1 }} />
            <IconBtn icon="x" onClick={onClose} label="닫기" size={34} />
          </header>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 18px" }}>{children}</div>
          {footer && <footer style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 18px", borderTop: "1px solid var(--border)" }}>{footer}</footer>}
        </div>
      </div>
    </>
  );
}

/* ---------- 알림센터 모달 (5-tab) ---------- */
function NotifCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState("all");
  const NC = D.NOTIF_CENTER;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
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
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div className="nc-section" style={{ marginBottom: 4 }}>최근 알림 · 3일 이내</div>
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
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,19,16,.5)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 70, animation: "ncFade .18s var(--ease) both" }} />
      <div role="dialog" aria-label="알림센터" style={{ position: "fixed", inset: 0, zIndex: 71, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, pointerEvents: "none" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: 1000, maxWidth: "100%", height: 680, maxHeight: "90vh", background: "var(--card)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden", pointerEvents: "auto", animation: "ncPop .2s var(--ease) both" }}>
          <header style={{ display: "flex", alignItems: "center", gap: 9, padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
            <Icon name="bell" size={18} style={{ color: "var(--brand-blue)" }} />
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.01em" }}>알림센터</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: "var(--danger)", borderRadius: 99, padding: "2px 9px", minWidth: 22, textAlign: "center" }}>{cap(total)}</span>
            <div style={{ flex: 1 }} />
            <button onClick={onClose} style={{ border: "none", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", padding: "6px 8px" }}>모두 읽음</button>
            <IconBtn icon="x" onClick={onClose} label="닫기" size={36} />
          </header>
          <div style={{ display: "flex", gap: 2, padding: "0 14px", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
            {tabs.map((t) => {
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "13px 16px", border: "none", background: "transparent", font: "inherit", cursor: "pointer", whiteSpace: "nowrap", position: "relative", color: on ? "var(--brand-blue)" : "var(--muted-foreground)", fontWeight: on ? 800 : 600, fontSize: 14, borderBottom: on ? "2px solid var(--brand-blue)" : "2px solid transparent", marginBottom: -1 }}>
                  {t.label}
                  {t.count ? <span style={{ fontSize: 11, fontWeight: 800, borderRadius: 99, padding: "1px 7px", background: on ? "var(--brand-blue)" : "var(--muted)", color: on ? "#fff" : "var(--muted-foreground)" }}>{cap(t.count)}</span> : null}
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px 22px" }}><Body /></div>
        </div>
      </div>
    </>
  );
}

/* ---------- 사용자 메뉴 ---------- */
function UserMenu({ onUserModal }: { onUserModal: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const items = [
    { id: "memo", label: "메모", icon: "check-circle", danger: false },
    { id: "schedule", label: "일정", icon: "calendar", danger: false },
    { id: "logout", label: "로그아웃", icon: "external", danger: true },
  ];
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} aria-label="사용자 메뉴" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", border: "none", background: "transparent", font: "inherit", padding: "2px 4px" }}>
        <span style={{ width: 32, height: 32, borderRadius: 99, background: "var(--brand-gray)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="user" size={18} stroke={2.2} />
        </span>
        <span className="gnb-user" style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2, textAlign: "left" }}>
          <div>김정원</div><div className="t-caption" style={{ fontSize: 10.5 }}>투자운용본부</div>
        </span>
        <Icon name="chevron-down" size={14} style={{ opacity: .5, marginLeft: 2 }} />
      </button>
      {open && <>
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 200, zIndex: 41, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 6, animation: "dashFade .16s var(--ease) both" }}>
          {items.map((it) => (
            <React.Fragment key={it.id}>
              {it.id === "logout" && <div style={{ height: 1, background: "var(--border)", margin: "6px 4px" }} />}
              <button onClick={() => { setOpen(false); onUserModal(it.id); }} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", padding: "9px 10px", border: "none", background: "transparent", font: "inherit", cursor: "pointer", borderRadius: 8, color: it.danger ? "var(--danger)" : "var(--foreground)", fontSize: 13.5, fontWeight: 600 }}>
                <Icon name={it.icon} size={16} />{it.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      </>}
    </div>
  );
}

/* ---------- Role switcher ---------- */
function RoleSwitch({ role, onRole }) {
  const [open, setOpen] = useState(false);
  const cur = D.ROLES.find((r) => r.id === role);
  return (
    <div style={{ position: "relative" }}><button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer", font: "inherit",
          border: "1px solid var(--border-strong)", background: "var(--card)", borderRadius: 9, padding: "6px 10px",
        }}><span
          style={{ width: 7, height: 7, borderRadius: 99, background: "var(--success)" }} /><span style={{ fontSize: 12.5, fontWeight: 600 }}>{cur.short}</span><Icon name="chevron-down" size={14} style={{ opacity: .5 }} /></button>{open && <><div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 40 }} /><div
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, width: 240, zIndex: 41,
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 6,
          }}><div className="t-caption" style={{ padding: "6px 10px 4px" }}>역할 전환 (RBAC 데모)</div>{D.ROLES.map((r) => <button
            key={r.id}
            onClick={() => { onRole(r.id); setOpen(false); }}
            style={{
              width: "100%", textAlign: "left", border: "none", cursor: "pointer", font: "inherit", borderRadius: 8, padding: "9px 10px",
              background: r.id === role ? "color-mix(in srgb,var(--primary) 10%,transparent)" : "transparent",
              display: "flex", flexDirection: "column", gap: 1,
            }}><span
              style={{ fontSize: 13, fontWeight: 700, color: r.id === role ? "var(--primary)" : "var(--foreground)" }}>{r.name}</span><span className="t-caption">{r.desc}</span></button>)}</div></>}</div>
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
    <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 60, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
      <MenuPickerModal open={edit} onClose={() => setEdit(false)} initialTab="fav" />
      {open && <>
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: -1 }} />
        <div style={{ width: 244, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "var(--shadow-lg)", padding: 8, animation: "dashFade .16s var(--ease) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px 8px" }}>
            <Icon name="star" size={14} style={{ color: "var(--warning)" }} />
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>즐겨찾기</span>
            <button
              onClick={() => { setOpen(false); setEdit(true); }}
              aria-label="즐겨찾기 설정"
              title="즐겨찾기 설정"
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--foreground)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--caption)"; }}
              style={{ marginLeft: "auto", flex: "0 0 auto", width: 26, height: 26, borderRadius: 7, border: "none", background: "transparent", color: "var(--caption)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s,color .15s" }}>
              <Icon name="settings" size={15} />
            </button>
          </div>
          {favs.length === 0
            ? <div className="t-caption" style={{ padding: "4px 10px 10px" }}>설정(⚙)에서 즐겨찾기를 추가하세요.</div>
            : favs.map((f: any, i: number) => (
              <button
                key={f.key}
                onClick={() => { onNav(f.to); setOpen(false); }}
                title={f.label}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--foreground)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", border: "none", font: "inherit", borderRadius: 9, padding: "9px 10px", background: "transparent", color: "var(--muted-foreground)", fontSize: 12.5, fontWeight: 500, textAlign: "left", transition: "background .15s,color .15s" }}>
                <Icon name={f.icon} size={16} stroke={2} style={{ color: "var(--caption)", flex: "0 0 auto" }} />
                <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.label}</span>
              </button>
            ))}
        </div>
      </>}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="즐겨찾기"
        aria-expanded={open}
        style={{ width: 46, height: 46, borderRadius: 99, cursor: "pointer", border: "none", background: "#23C55E", color: "#fff", boxShadow: "var(--shadow-lg)", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .18s var(--ease)", transform: open ? "rotate(90deg) scale(1.04)" : "none" }}>
        <Icon name={open ? "x" : "star"} size={20} stroke={2.2} />
      </button>
    </div>
  );
}

/* ---------- GNB ---------- */

function Gnb({ theme, onToggleTheme, role, onRole, onToggleLnb, wide, onToggleWide, notifs, onOpenNotif, onNav, onUserModal }) {
  const unread = notifs.filter((n) => !n.read).length;
  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 50, height: 58, flex: "0 0 auto",
        background: "color-mix(in srgb,var(--card) 86%,transparent)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, padding: "0 16px",
      }}><IconBtn icon="menu" onClick={onToggleLnb} label="메뉴 접기/펴기" size={38} /><img
        src={theme === "dark" ? logoWhiteUrl : logoUrl}
        alt="APFS 농업정책보험금융원"
        style={{ height: 24, width: "auto" }} /><div style={{ width: 1, height: 22, background: "var(--border)" }} /><div
        className="gnb-title"
        style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-.01em", whiteSpace: "nowrap" }}>농림수산식품모태펀드 투자자산관리시스템</div><div style={{ flex: 1 }} /><label
        className="gnb-search"
        style={{
          display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 10, padding: "7px 12px",
          width: 260, color: "var(--caption)",
        }}><Icon name="search" size={16} /><input
          placeholder="메뉴·운용사·자펀드 검색"
          style={{
            border: "none", background: "transparent", outline: "none", font: "inherit", fontSize: 12.5,
            color: "var(--foreground)", width: "100%",
          }} /><kbd
          style={{ fontSize: 10, fontWeight: 600, background: "var(--card)", borderRadius: 5, padding: "1px 5px", border: "1px solid var(--border)" }}>/</kbd></label><RoleSwitch role={role} onRole={onRole} /><div style={{ display: "flex", alignItems: "center", gap: 2 }}><IconBtn
          icon={wide ? "collapse-h" : "expand-h"}
          onClick={onToggleWide}
          label={wide ? "고정 너비" : "전체 너비"}
          active={wide}
          size={38} /><IconBtn
          icon={theme === "dark" ? "sun" : "moon"}
          onClick={onToggleTheme}
          label="라이트/다크"
          size={38} /><IconBtn icon="bell" onClick={onOpenNotif} label="알림" badge={unread} size={38} /></div><UserMenu onUserModal={onUserModal} /></header>
  );
}

/* ---------- PageHeader (breadcrumb + title + actions) ---------- */
function PageHeader({ crumbs, title, sub, actions }: { crumbs: string[]; title?: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}><div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}><nav
          aria-label="위치"
          style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>{crumbs.map((c, i) => <React.Fragment key={i}>{i > 0 && <Icon name="chevron-right" size={13} style={{ color: "var(--caption)" }} />}<span
            aria-current={i === crumbs.length - 1 ? "page" : undefined}
            style={{
              fontSize: 12, fontWeight: i === crumbs.length - 1 ? 700 : 500,
              color: i === crumbs.length - 1 ? "var(--foreground)" : "var(--caption)",
            }}>{c}</span></React.Fragment>)}</nav>{actions && <div
          style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>{actions}</div>}</div>{title && <div
        style={{ marginTop: 10 }}><h1 className="t-h1" style={{ margin: 0 }}>{title}</h1>{sub && <p
          className="t-body"
          style={{ margin: "4px 0 0", color: "var(--muted-foreground)", fontSize: 13 }}>{sub}</p>}</div>}</div>
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
      style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}><Gnb
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
        onUserModal={setUserModal} /><div style={{ display: "flex", flex: 1, alignItems: "flex-start" }}>{rail
          ? <RailNav role={role} route={route} onNav={navClose} mobile={mobile} drawerOpen={drawer} />
          : <Lnb open={mobile ? true : lnbOpen} role={role} route={route} onNav={navClose} mobile={mobile} drawerOpen={drawer} />}<main
          className="dash-main"
          style={{ flex: 1, minWidth: 0, padding: "22px 26px 104px" }}>{children}</main></div>{mobile && <div
        className={"lnb-backdrop" + (drawer ? " show" : "")}
        onClick={() => setDrawer(false)} />}<FavoritesFab onNav={navClose} /><NotifCenter open={notifOpen} onClose={() => setNotifOpen(false)} /><CenterModal open={userModal === "memo"} onClose={() => setUserModal(null)} title="메모" icon="check-circle" width={620}>{ncMemoBody(true)}</CenterModal><CenterModal open={userModal === "schedule"} onClose={() => setUserModal(null)} title="일정" icon="calendar" width={880}><NcScheduleBody /></CenterModal><CenterModal open={userModal === "logout"} onClose={() => setUserModal(null)} title="로그아웃" icon="external" width={400} footer={[<button key="c" onClick={() => setUserModal(null)} style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--card)", font: "inherit", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>취소</button>, <button key="o" onClick={() => setUserModal(null)} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "var(--brand-blue)", color: "#fff", font: "inherit", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>로그아웃</button>]}><div style={{ padding: "6px 4px", fontSize: 14, lineHeight: 1.6, color: "var(--foreground)" }}>정말 로그아웃 하시겠습니까?</div></CenterModal></div>
  );
}

export const Shell = { AppShell, PageHeader };
