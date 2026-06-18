/* 전역 셸 — GNB / LNB / 브레드크럼 / 알림센터 / RBAC 게이팅 / 테마 토글 */
import React from 'react';
import { Icon } from './icons';
import { UI } from './components';
import { APFS_DATA } from './data';
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
          : <div style={{ display: "flex", justifyContent: "center" }}><Icon name="shield-check" size={18} style={{ color: "var(--success)" }} /></div>}</div></nav>
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
        position: "fixed", left: 70, top: hover.top, transform: "translateY(-50%)", zIndex: 70, pointerEvents: "none",
        background: "color-mix(in srgb,var(--foreground) 92%,transparent)", color: "var(--bg)",
        fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap",
        boxShadow: "var(--shadow-lg)", animation: "dashFade .12s var(--ease) both",
      }}>{hover.label}</div>}{activeM && <><div
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
        style={{ borderTop: "1px solid var(--border)", padding: "10px 8px", display: "flex", justifyContent: "center" }}><Icon
          name="shield-check" size={18} style={{ color: "var(--success)" }} /></div></nav></>
  );
}

/* ---------- Notifications drawer ---------- */
function NotifDrawer({ open, onClose, notifs, onReadAll }) {
  const { ColorChip } = UI;
  const tones = { danger: "danger", warning: "warning", info: "info", success: "success" };
  return (
    <><div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.42)", opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none", transition: "opacity .25s", zIndex: 60,
        }} /><aside
        aria-label="알림센터"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 380, maxWidth: "92vw", background: "var(--card)",
          boxShadow: "var(--shadow-lg)", borderLeft: "1px solid var(--border)", zIndex: 61,
          transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform .26s var(--ease)",
          display: "flex", flexDirection: "column",
        }}><header
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid var(--border)" }}><div style={{ display: "flex", alignItems: "center", gap: 9 }}><Icon name="bell" size={19} /><span style={{ fontSize: 15, fontWeight: 700 }}>알림센터</span><span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--danger)" }}>{notifs.filter((n) => !n.read).length + " 새 알림"}</span></div><IconBtn icon="x" onClick={onClose} label="닫기" size={34} /></header><div
          style={{ padding: "10px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="t-caption" style={{ fontSize: 14 }}>최근 7일</span><button
            onClick={onReadAll}
            style={{ border: "none", background: "transparent", color: "var(--accent)", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>모두 읽음</button></div><div style={{ flex: 1, overflowY: "auto", padding: 12 }}>{notifs.map((n) => <div
            key={n.id}
            style={{
              display: "flex", gap: 11, padding: "12px 12px", borderRadius: 11, marginBottom: 4,
              background: n.read ? "transparent" : "color-mix(in srgb,var(--primary) 5%,transparent)",
            }}><ColorChip icon={n.icon} color={`var(--${tones[n.tone]})`} size={34} iconSize={17} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, lineHeight: 1.4 }}>{n.title}</div><div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}><StatusBadge tone={tones[n.tone]} label={n.cat} size="sm" /><span className="t-caption">{n.time}</span></div></div>{!n.read && <span
              style={{ width: 7, height: 7, borderRadius: 99, background: "var(--danger)", flex: "0 0 auto", marginTop: 6 }} />}</div>)}</div></aside></>
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
  return (
    <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 60, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>{open && <><div
        onClick={() => setOpen(false)}
        style={{ position: "fixed", inset: 0, zIndex: -1 }} /><div
        style={{
          width: 244, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14,
          boxShadow: "var(--shadow-lg)", padding: 8, animation: "dashFade .16s var(--ease) both",
        }}><div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px 8px" }}><Icon name="star" size={14} style={{ color: "var(--warning)" }} /><span
            style={{ fontSize: 12.5, fontWeight: 700 }}>즐겨찾기</span></div>{D.FAVORITES.map((f, i) => <button
            key={i}
            onClick={() => { onNav(f.to); setOpen(false); }}
            title={f.label}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--foreground)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", border: "none", font: "inherit",
              borderRadius: 9, padding: "9px 10px", background: "transparent", color: "var(--muted-foreground)",
              fontSize: 12.5, fontWeight: 500, textAlign: "left", transition: "background .15s,color .15s",
            }}><Icon name={f.icon} size={16} stroke={2} style={{ color: "var(--caption)", flex: "0 0 auto" }} /><span
              style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.label}</span></button>)}</div></>}<button
        onClick={() => setOpen((o) => !o)}
        aria-label="즐겨찾기"
        aria-expanded={open}
        style={{
          width: 46, height: 46, borderRadius: 99, cursor: "pointer", border: "none",
          background: "#23C55E", color: "#fff", boxShadow: "var(--shadow-lg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform .18s var(--ease)", transform: open ? "rotate(90deg) scale(1.04)" : "none",
        }}><Icon name={open ? "x" : "star"} size={20} stroke={2.2} /></button></div>
  );
}

/* ---------- GNB ---------- */

function Gnb({ theme, onToggleTheme, role, onRole, onToggleLnb, wide, onToggleWide, notifs, onOpenNotif, onNav }) {
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
          size={38} /><IconBtn icon="bell" onClick={onOpenNotif} label="알림" badge={unread} size={38} /></div><button
        style={{
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer", border: "none", background: "transparent", font: "inherit", padding: "2px 4px",
        }}><span
          style={{ width: 32, height: 32, borderRadius: 99, background: "var(--brand-gray)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="user" size={18} stroke={2.2} /></span><span
          className="gnb-user"
          style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2, textAlign: "left" }}><div>김정원</div><div className="t-caption" style={{ fontSize: 10.5 }}>투자운용본부</div></span></button></header>
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
  const { theme, onToggleTheme, role, onRole, route, onNav, lnbOpen, onToggleLnb, navStyle, notifs, onReadAll, children } = props;
  const [notifOpen, setNotifOpen] = useState(false);
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
        onNav={navClose} /><div style={{ display: "flex", flex: 1, alignItems: "flex-start" }}>{rail
          ? <RailNav role={role} route={route} onNav={navClose} mobile={mobile} drawerOpen={drawer} />
          : <Lnb open={mobile ? true : lnbOpen} role={role} route={route} onNav={navClose} mobile={mobile} drawerOpen={drawer} />}<main
          className="dash-main"
          style={{ flex: 1, minWidth: 0, padding: "22px 26px 104px" }}>{children}</main></div>{mobile && <div
        className={"lnb-backdrop" + (drawer ? " show" : "")}
        onClick={() => setDrawer(false)} />}<FavoritesFab onNav={navClose} /><NotifDrawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifs={notifs}
        onReadAll={onReadAll} /></div>
  );
}

export const Shell = { AppShell, PageHeader };
