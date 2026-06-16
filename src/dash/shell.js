/* 전역 셸 — GNB / LNB / 브레드크럼 / 알림센터 / RBAC 게이팅 / 테마 토글 */
(function (w) {
  const React = w.React;
  const { useState, useEffect } = React;
  const Icon = w.Icon;
  const { ColorChip, IconBtn, CountPill, StatusBadge, Button, SegTabs } = w.UI;
  const D = w.APFS_DATA;
  const h = React.createElement;

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

  /* ---------- LNB ---------- */
  function Lnb({ open, role, route, onNav, mobile, drawerOpen }) {
    const [expanded, setExpanded] = useState({ risk: true });
    const menu = D.MENU.filter((m) => m.roles.includes(role));
    const posStyle = mobile
      ? { position: "fixed", top: 58, left: 0, width: 270, height: "calc(100vh - 58px)", zIndex: 45,
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          boxShadow: drawerOpen ? "var(--shadow-lg)" : "none", transition: "transform .24s var(--ease)" }
      : { width: open ? 260 : 66, position: "sticky", top: 58, height: "calc(100vh - 58px)", transition: "width .22s var(--ease)" };
    return h("nav", {
      "aria-label": "주 메뉴", "aria-hidden": mobile && !drawerOpen ? true : undefined,
      style: {
        flex: "0 0 auto", background: "var(--card)", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", overflow: "hidden", ...posStyle,
      },
    },
      h("div", { style: { padding: open ? "14px 14px 8px" : "14px 8px 8px", flex: 1, overflowY: "auto", overflowX: "hidden" } },
        open && h("div", { className: "t-caption", style: { padding: "4px 10px 8px", textTransform: "none", fontWeight: 700, letterSpacing: ".02em" } }, "업무 메뉴"),
        menu.map((m) => {
          const count = rollup(m);
          const isActive = m.path && m.path === route;
          const hasKids = !!m.children;
          const isOpen = expanded[m.id];
          return h("div", { key: m.id, style: { marginBottom: 2 } },
            h("button", {
              onClick: () => { if (m.path) onNav(m.path); if (hasKids && open) setExpanded((e) => ({ ...e, [m.id]: !e[m.id] })); },
              "aria-current": isActive ? "page" : undefined,
              title: !open ? m.label : undefined,
              style: {
                position: "relative", width: "100%", display: "flex", alignItems: "center", gap: 11, cursor: "pointer",
                border: "none", font: "inherit", borderRadius: 9, padding: open ? "9px 10px" : "10px", justifyContent: open ? "flex-start" : "center",
                background: isActive ? "color-mix(in srgb,var(--primary) 12%,transparent)" : "transparent",
                color: isActive ? "var(--primary)" : "var(--foreground)", fontWeight: isActive ? 700 : 500, fontSize: 13.5,
                transition: "background .15s",
              },
            },
              h(Icon, { name: m.icon, size: 20, stroke: isActive ? 2.3 : 2 }),
              open && h("span", { style: { flex: 1, textAlign: "left", whiteSpace: "nowrap" } }, m.label),
              open && m.isNew && h("span", { style: { fontSize: 9.5, fontWeight: 800, color: "var(--accent)" } }, "NEW"),
              count > 0 && (open
                ? h(CountPill, { count, urgent: m.urgent })
                : h("span", { style: { position: "absolute", top: 6, right: 8, width: 7, height: 7, borderRadius: 99, background: m.urgent ? "var(--danger)" : "var(--primary)" } })),
              open && hasKids && h(Icon, { name: "chevron-down", size: 15, style: { transform: isOpen ? "rotate(0)" : "rotate(-90deg)", transition: "transform .18s", opacity: .6 } })),
            open && hasKids && isOpen && h("div", { style: { margin: "2px 0 4px", paddingLeft: 16 } },
              m.children.map((c, i) => {
                if (c.sub && c.children) {
                  const subKey = m.id + ":s" + i;
                  const subOpen = expanded[subKey];
                  const subCount = c.children.reduce((s, x) => s + (x.badge || 0), 0) || (c.badge || 0);
                  return h("div", { key: i, style: { marginBottom: 1 } },
                    h("button", {
                      onClick: () => setExpanded((e) => ({ ...e, [subKey]: !e[subKey] })),
                      style: {
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
                        border: "none", font: "inherit", cursor: "pointer", borderRadius: 6, padding: "4px 10px",
                        background: "transparent", color: "var(--foreground)", fontSize: 11.5, fontWeight: 700,
                      },
                    },
                      h("span", { style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" } }, c.label),
                      h("div", { style: { display: "flex", alignItems: "center", gap: 4, flexShrink: 0 } },
                        subCount > 0 && h(CountPill, { count: subCount, urgent: m.urgent }),
                        h(Icon, { name: "chevron-down", size: 12, style: { transform: subOpen ? "rotate(0)" : "rotate(-90deg)", transition: "transform .15s", opacity: .5 } }))),
                    subOpen && h("div", { style: { paddingLeft: 14, marginBottom: 2 } },
                      c.children.map((leaf, j) => h("button", {
                        key: j,
                        onClick: () => leaf.path ? onNav(leaf.path) : m.path ? onNav(m.path) : undefined,
                        style: {
                          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                          border: "none", font: "inherit", cursor: (leaf.path || m.path) ? "pointer" : "default",
                          borderRadius: 6, padding: "5px 10px",
                          background: "transparent", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 500,
                        },
                      },
                        h("span", { style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" } }, leaf.label),
                        leaf.badge > 0 && h(CountPill, { count: leaf.badge, urgent: m.urgent })))));
                }
                return h("button", {
                  key: i, onClick: () => c.path ? onNav(c.path) : m.path ? onNav(m.path) : undefined,
                  style: {
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                    border: "none", font: "inherit", cursor: "pointer", borderRadius: 7, padding: "6px 10px",
                    background: "transparent", color: "var(--muted-foreground)", fontSize: 12.5, fontWeight: 500,
                  },
                },
                  h("span", { style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" } }, c.label),
                  c.badge > 0 && h(CountPill, { count: c.badge, urgent: m.urgent }));
              })));
        })),
      h("div", { style: { borderTop: "1px solid var(--border)", padding: open ? "8px 10px" : "8px" } },
        h("button", {
          onClick: () => onNav("designsystem"),
          "aria-current": route === "designsystem" ? "page" : undefined,
          title: !open ? "디자인 시스템" : undefined,
          style: {
            position: "relative", width: "100%", display: "flex", alignItems: "center", gap: 11, cursor: "pointer",
            border: "none", font: "inherit", borderRadius: 9, padding: open ? "9px 10px" : "10px", justifyContent: open ? "flex-start" : "center",
            background: route === "designsystem" ? "color-mix(in srgb,var(--primary) 12%,transparent)" : "transparent",
            color: route === "designsystem" ? "var(--primary)" : "var(--muted-foreground)", fontWeight: route === "designsystem" ? 700 : 500, fontSize: 13.5,
          },
        },
          h(Icon, { name: "layers", size: 20 }),
          open && h("span", { style: { whiteSpace: "nowrap" } }, "디자인 시스템"))),
      h("div", { style: { borderTop: "1px solid var(--border)", padding: open ? "10px 14px" : "10px 8px" } },
        open
          ? h("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
              h(ColorChip, { icon: "shield-check", color: "var(--success)", size: 30, iconSize: 16 }),
              h("div", { style: { lineHeight: 1.3 } },
                h("div", { style: { fontSize: 11.5, fontWeight: 700 } }, "보안 접속 정상"),
                h("div", { className: "t-caption", style: { fontSize: 10.5 } }, "내부망 · TLS 1.3")))
          : h("div", { style: { display: "flex", justifyContent: "center" } }, h(Icon, { name: "shield-check", size: 18, style: { color: "var(--success)" } }))));
  }

  /* ---------- Notifications drawer ---------- */
  function NotifDrawer({ open, onClose, notifs, onReadAll }) {
    const { ColorChip } = w.UI;
    const tones = { danger: "danger", warning: "warning", info: "info", success: "success" };
    return h(React.Fragment, null,
      h("div", { onClick: onClose, style: {
        position: "fixed", inset: 0, background: "rgba(0,0,0,.42)", opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none", transition: "opacity .25s", zIndex: 60,
      } }),
      h("aside", { "aria-label": "알림센터", style: {
        position: "fixed", top: 0, right: 0, bottom: 0, width: 380, maxWidth: "92vw", background: "var(--card)",
        boxShadow: "var(--shadow-lg)", borderLeft: "1px solid var(--border)", zIndex: 61,
        transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform .26s var(--ease)",
        display: "flex", flexDirection: "column",
      } },
        h("header", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid var(--border)" } },
          h("div", { style: { display: "flex", alignItems: "center", gap: 9 } },
            h(Icon, { name: "bell", size: 19 }),
            h("span", { style: { fontSize: 15, fontWeight: 700 } }, "알림센터"),
            h("span", { style: { fontSize: 11.5, fontWeight: 700, color: "var(--danger)" } }, notifs.filter((n) => !n.read).length + " 새 알림")),
          h(IconBtn, { icon: "x", onClick: onClose, label: "닫기", size: 34 })),
        h("div", { style: { padding: "10px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" } },
          h("span", { className: "t-caption", style: { fontSize: 14 } }, "최근 7일"),
          h("button", { onClick: onReadAll, style: { border: "none", background: "transparent", color: "var(--accent)", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" } }, "모두 읽음")),
        h("div", { style: { flex: 1, overflowY: "auto", padding: 12 } },
          notifs.map((n) => h("div", { key: n.id, style: {
            display: "flex", gap: 11, padding: "12px 12px", borderRadius: 11, marginBottom: 4,
            background: n.read ? "transparent" : "color-mix(in srgb,var(--primary) 5%,transparent)",
          } },
            h(ColorChip, { icon: n.icon, color: `var(--${tones[n.tone]})`, size: 34, iconSize: 17 }),
            h("div", { style: { flex: 1, minWidth: 0 } },
              h("div", { style: { fontSize: 13, fontWeight: n.read ? 500 : 700, lineHeight: 1.4 } }, n.title),
              h("div", { style: { display: "flex", gap: 8, marginTop: 4, alignItems: "center" } },
                h(StatusBadge, { tone: tones[n.tone], label: n.cat, size: "sm" }),
                h("span", { className: "t-caption" }, n.time))),
            !n.read && h("span", { style: { width: 7, height: 7, borderRadius: 99, background: "var(--danger)", flex: "0 0 auto", marginTop: 6 } }))))));
  }

  /* ---------- Role switcher ---------- */
  function RoleSwitch({ role, onRole }) {
    const [open, setOpen] = useState(false);
    const cur = D.ROLES.find((r) => r.id === role);
    return h("div", { style: { position: "relative" } },
      h("button", { onClick: () => setOpen((o) => !o), style: {
        display: "flex", alignItems: "center", gap: 8, cursor: "pointer", font: "inherit",
        border: "1px solid var(--border-strong)", background: "var(--card)", borderRadius: 9, padding: "6px 10px",
      } },
        h("span", { style: { width: 7, height: 7, borderRadius: 99, background: "var(--success)" } }),
        h("span", { style: { fontSize: 12.5, fontWeight: 600 } }, cur.short),
        h(Icon, { name: "chevron-down", size: 14, style: { opacity: .5 } })),
      open && h(React.Fragment, null,
        h("div", { onClick: () => setOpen(false), style: { position: "fixed", inset: 0, zIndex: 40 } }),
        h("div", { style: {
          position: "absolute", top: "calc(100% + 6px)", right: 0, width: 240, zIndex: 41,
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 6,
        } },
          h("div", { className: "t-caption", style: { padding: "6px 10px 4px" } }, "역할 전환 (RBAC 데모)"),
          D.ROLES.map((r) => h("button", {
            key: r.id, onClick: () => { onRole(r.id); setOpen(false); },
            style: {
              width: "100%", textAlign: "left", border: "none", cursor: "pointer", font: "inherit", borderRadius: 8, padding: "9px 10px",
              background: r.id === role ? "color-mix(in srgb,var(--primary) 10%,transparent)" : "transparent",
              display: "flex", flexDirection: "column", gap: 1,
            },
          },
            h("span", { style: { fontSize: 13, fontWeight: 700, color: r.id === role ? "var(--primary)" : "var(--foreground)" } }, r.name),
            h("span", { className: "t-caption" }, r.desc))))));
  }

  /* ---------- GNB ---------- */
  function Gnb({ theme, onToggleTheme, role, onRole, onToggleLnb, wide, onToggleWide, notifs, onOpenNotif }) {
    const unread = notifs.filter((n) => !n.read).length;
    return h("header", { style: {
      position: "sticky", top: 0, zIndex: 50, height: 58, flex: "0 0 auto",
      background: "color-mix(in srgb,var(--card) 86%,transparent)", backdropFilter: "blur(10px)",
      borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, padding: "0 16px",
    } },
      h(IconBtn, { icon: "menu", onClick: onToggleLnb, label: "메뉴 접기/펴기", size: 38 }),
      h("img", { src: theme === "dark" ? "dash/assets/logo_white.svg" : "dash/assets/logo.svg", alt: "APFS 농업정책보험금융원", style: { height: 24, width: "auto" } }),
      h("div", { style: { width: 1, height: 22, background: "var(--border)" } }),
      h("div", { className: "gnb-title", style: { fontSize: 14.5, fontWeight: 700, letterSpacing: "-.01em", whiteSpace: "nowrap" } }, "농림수산식품모태펀드 투자자산관리시스템"),
      h("div", { style: { flex: 1 } }),
      h("label", { className: "gnb-search", style: {
        display: "flex", alignItems: "center", gap: 8, background: "var(--muted)", borderRadius: 10, padding: "7px 12px",
        width: 260, color: "var(--caption)",
      } },
        h(Icon, { name: "search", size: 16 }),
        h("input", { placeholder: "메뉴·운용사·자펀드 검색", style: {
          border: "none", background: "transparent", outline: "none", font: "inherit", fontSize: 12.5,
          color: "var(--foreground)", width: "100%",
        } }),
        h("kbd", { style: { fontSize: 10, fontWeight: 600, background: "var(--card)", borderRadius: 5, padding: "1px 5px", border: "1px solid var(--border)" } }, "/")),
      h(RoleSwitch, { role, onRole }),
      h("div", { style: { display: "flex", alignItems: "center", gap: 2 } },
        h(IconBtn, { icon: wide ? "collapse-h" : "expand-h", onClick: onToggleWide, label: wide ? "고정 너비" : "전체 너비", active: wide, size: 38 }),
        h(IconBtn, { icon: theme === "dark" ? "sun" : "moon", onClick: onToggleTheme, label: "라이트/다크", size: 38 }),
        h(IconBtn, { icon: "bell", onClick: onOpenNotif, label: "알림", badge: unread, size: 38 })),
      h("button", { style: {
        display: "flex", alignItems: "center", gap: 8, cursor: "pointer", border: "none", background: "transparent", font: "inherit", padding: "2px 4px",
      } },
        h("span", { style: { width: 32, height: 32, borderRadius: 99, background: "var(--brand-gray)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" } }, h(Icon, { name: "user", size: 18, stroke: 2.2 })),
        h("span", { className: "gnb-user", style: { fontSize: 12.5, fontWeight: 600, lineHeight: 1.2, textAlign: "left" } },
          h("div", null, "김정원"), h("div", { className: "t-caption", style: { fontSize: 10.5 } }, "투자운용본부"))));
  }

  /* ---------- PageHeader (breadcrumb + title + actions) ---------- */
  function PageHeader({ crumbs, title, sub, actions }) {
    return h("div", { style: { marginBottom: 18 } },
      h("nav", { "aria-label": "위치", style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" } },
        crumbs.map((c, i) => h(React.Fragment, { key: i },
          i > 0 && h(Icon, { name: "chevron-right", size: 13, style: { color: "var(--caption)" } }),
          h("span", { "aria-current": i === crumbs.length - 1 ? "page" : undefined, style: {
            fontSize: 12, fontWeight: i === crumbs.length - 1 ? 700 : 500,
            color: i === crumbs.length - 1 ? "var(--foreground)" : "var(--caption)",
          } }, c)))),
      h("div", { style: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" } },
        h("div", null,
          h("h1", { className: "t-h1", style: { margin: 0 } }, title),
          sub && h("p", { className: "t-body", style: { margin: "4px 0 0", color: "var(--muted-foreground)", fontSize: 13 } }, sub)),
        actions && h("div", { style: { display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" } }, actions)));
  }

  /* ---------- AppShell ---------- */
  function AppShell(props) {
    const { wide, onToggleWide } = props;
    const { theme, onToggleTheme, role, onRole, route, onNav, lnbOpen, onToggleLnb, notifs, onReadAll, children } = props;
    const [notifOpen, setNotifOpen] = useState(false);
    const mobile = useIsMobile(760);
    const [drawer, setDrawer] = useState(false);
    useEffect(() => { setDrawer(false); }, [route]);
    const handleMenu = () => (mobile ? setDrawer((d) => !d) : onToggleLnb());
    const navClose = (r) => { onNav(r); setDrawer(false); };
    return h("div", { style: { minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" } },
      h(Gnb, { theme, onToggleTheme, role, onRole, onToggleLnb: handleMenu, wide, onToggleWide, notifs, onOpenNotif: () => setNotifOpen(true) }),
      h("div", { style: { display: "flex", flex: 1, alignItems: "flex-start" } },
        h(Lnb, { open: mobile ? true : lnbOpen, role, route, onNav: navClose, mobile, drawerOpen: drawer }),
        h("main", { className: "dash-main", style: { flex: 1, minWidth: 0, padding: "22px 26px 40px" } }, children)),
      mobile && h("div", { className: "lnb-backdrop" + (drawer ? " show" : ""), onClick: () => setDrawer(false) }),
      h(NotifDrawer, { open: notifOpen, onClose: () => setNotifOpen(false), notifs, onReadAll }));
  }

  w.Shell = { AppShell, PageHeader };
})(window);
