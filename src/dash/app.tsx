/* 앱 루트 — 테마/역할/라우트 상태, 서브 대시보드 스텁, 마운트 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { APFS_DATA } from './data';
import { DesignSystem } from './designsystem';
import { Main } from './main';
import { Performance } from './performance';
import { Risk } from './risk';
import { GpHealth } from './gp_health';
import { Accounting } from './accounting';
import { Schedule } from './schedule';
import { SubFund } from './subfund';
import { Report } from './report';

const { useState, useEffect } = React;
const { AppShell, PageHeader } = Shell;
const { Button, ColorChip, StatusBadge } = UI;
const D = APFS_DATA;

const ls = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
};

const STUBS = {
  risk: { title: "조기경보 리스크", crumb: ["홈", "조기경보", "리스크 모니터링"], icon: "shield-alert", accent: "var(--danger)", prd: "PRD 5.6 / 5.7", desc: "운용사 상태·리스크 지수 추이·위반 처리 5단계 스텝퍼·IRR 입체분석" },
  "gp-health": { title: "운용사 건전성", crumb: ["홈", "운용사 보고", "운용사 건전성"], icon: "building", accent: "var(--primary)", prd: "PRD 5.5", desc: "운용사 선택 후 건전성·검증 체크리스트·의무집행 게이지·보수정산 계산기" },
  accounting: { title: "회계·자금 마감", crumb: ["홈", "회계 관리", "자금 마감"], icon: "wallet", accent: "var(--warning)", prd: "PRD 5.10 / 5.11", desc: "캘린더 비주얼 마감·자금원천별 자금수지·BS/PL·전표 승인·감사로그 타임라인" },
  performance: { title: "투자 성과·포트폴리오", crumb: ["홈", "통계조회", "투자 성과"], icon: "trending", accent: "var(--success)", prd: "PRD 5.4 / 5.9", desc: "투자기업 360° 성과·산업/지역 비중·회수 IRR/ROI·의무투자 컴플라이언스" },
  schedule: { title: "일정 · 알림 센터", crumb: ["홈", "일정·알림"], icon: "calendar", accent: "var(--accent)", prd: "부록 A", desc: "마감 임박·보고·실사·가치평가 일정 통합 뷰" },
};

function Stub({ route, onNav }) {
  const s = STUBS[route];
  return (
    <div
      style={{ maxWidth: 1100, margin: "0 auto", animation: "dashFade .35s var(--ease) both" }}><PageHeader
        crumbs={s.crumb}
        title={s.title}
        sub={s.desc}
        actions={<Button
          variant="outline"
          size="sm"
          leadingIcon="chevron-left"
          onClick={() => onNav("main")}>메인으로</Button>} /><div
        style={{
          border: "1px dashed var(--border-strong)", borderRadius: 16, padding: "56px 32px", textAlign: "center",
          background: "color-mix(in srgb,var(--card) 70%,transparent)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        }}><ColorChip icon={s.icon} color={s.accent} size={64} iconSize={32} /><div><div style={{ fontSize: 18, fontWeight: 700 }}>{s.title + " 서브 대시보드"}</div><p
            className="t-body"
            style={{ margin: "8px auto 0", maxWidth: 560, color: "var(--muted-foreground)" }}>이번 시안 범위는 <strong>디자인 시스템 + 메인 종합 대시보드</strong>{" 입니다. "}{s.title}{" 화면은 위 위젯 구성으로 다음 단계에 제작됩니다."}</p></div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><StatusBadge tone="info" icon="layers" label={s.prd} /><StatusBadge tone="warning" icon="clock" label="다음 단계 산출물" /></div><div style={{ display: "flex", gap: 10, marginTop: 4 }}><Button
            variant="primary"
            size="sm"
            leadingIcon="home"
            onClick={() => onNav("main")}>메인 종합 보기</Button><Button
            variant="ghost"
            size="sm"
            leadingIcon="layers"
            onClick={() => onNav("designsystem")}>디자인 시스템</Button></div></div></div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => ls.get("apfs.theme", "light"));
  const [role, setRole] = useState(() => ls.get("apfs.role", "admin"));
  const [route, setRoute] = useState(() => ls.get("apfs.route", "designsystem"));
  const [lnbOpen, setLnbOpen] = useState(() => ls.get("apfs.lnb", "1") === "1");
  const [wide, setWide] = useState(() => ls.get("apfs.width", "fixed") === "full");
  const [notifs, setNotifs] = useState(D.NOTIFS);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.background = "";
    ls.set("apfs.theme", theme);
  }, [theme]);
  useEffect(() => ls.set("apfs.role", role), [role]);
  useEffect(() => ls.set("apfs.route", route), [route]);
  useEffect(() => ls.set("apfs.lnb", lnbOpen ? "1" : "0"), [lnbOpen]);
  useEffect(() => {
    document.documentElement.dataset.width = wide ? "full" : "fixed";
    ls.set("apfs.width", wide ? "full" : "fixed");
  }, [wide]);

  // 역할에 따라 접근 불가 라우트면 메인으로
  useEffect(() => {
    const menu = D.MENU.find((m) => m.path === route);
    if (menu && !menu.roles.includes(role)) setRoute("main");
  }, [role]);

  const onNav = (r) => { setRoute(r); window.scrollTo({ top: 0, behavior: "smooth" }); };

  let page;
  if (route === "designsystem") page = <DesignSystem />;
  else if (route === "main") page = <Main onNav={onNav} />;
  else if (route === "performance") page = <Performance onNav={onNav} />;
  else if (route === "risk") page = <Risk onNav={onNav} />;
  else if (route === "gp-health") page = <GpHealth onNav={onNav} />;
  else if (route === "accounting") page = <Accounting onNav={onNav} />;
  else if (route === "schedule") page = <Schedule onNav={onNav} />;
  else if (route === "subfund") page = <SubFund onNav={onNav} />;
  else if (route === "report") page = <Report onNav={onNav} />;
  else if (STUBS[route]) page = <Stub route={route} onNav={onNav} />;
  else page = <Main onNav={onNav} />;

  return (
    <AppShell
      theme={theme}
      onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      role={role}
      onRole={setRole}
      route={route}
      onNav={onNav}
      lnbOpen={lnbOpen}
      onToggleLnb={() => setLnbOpen((o) => !o)}
      wide={wide}
      onToggleWide={() => setWide((x) => !x)}
      notifs={notifs}
      onReadAll={() => setNotifs((ns) => ns.map((n) => ({ ...n, read: true })))}>{page}</AppShell>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
